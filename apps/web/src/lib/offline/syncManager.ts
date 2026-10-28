import { offlineDB, SyncQueueItem, LocalPatient, LocalAppointment, getDeviceId } from './db';
import { api } from '../api';

export type NetworkState = 'online' | 'offline';
export type SyncState = 'idle' | 'syncing' | 'pending' | 'error' | 'conflict' | 'auth_expired';

export interface SyncStatusSnapshot {
    networkState: NetworkState;
    syncState: SyncState;
    pendingCount: number;
    conflictCount: number;
    errorCount: number;
    lastSyncedAt: string | null;
    lastError: string | null;
}

type SyncListener = (status: SyncStatusSnapshot) => void;

class SyncManager {
    private isSyncing = false;
    private listeners: Set<SyncListener> = new Set();
    private retryTimeouts: Map<string, number> = new Map();
    private lastSyncedAt: string | null = null;
    private lastError: string | null = null;
    private networkState: NetworkState = 'online';
    private syncState: SyncState = 'idle';

    constructor() {
        if (typeof window !== 'undefined') {
            this.networkState = navigator.onLine ? 'online' : 'offline';

            window.addEventListener('online', () => {
                this.checkTrueConnectivity().then((online) => {
                    this.networkState = online ? 'online' : 'offline';
                    this.notify();
                    if (online) {
                        this.triggerSync();
                    }
                });
            });

            window.addEventListener('offline', () => {
                this.networkState = 'offline';
                this.notify();
            });

            // Periodic heartbeat every 30 seconds to test real connectivity and sync
            setInterval(() => {
                this.checkTrueConnectivity().then((online) => {
                    if (this.networkState !== (online ? 'online' : 'offline')) {
                        this.networkState = online ? 'online' : 'offline';
                        this.notify();
                    }
                    if (online && !this.isSyncing) {
                        this.triggerSync();
                    }
                });
            }, 30000);

            // Initial check
            setTimeout(() => {
                this.updateQueueStatus();
                this.checkTrueConnectivity().then((online) => {
                    if (online) this.triggerSync();
                });
            }, 1000);
        }
    }

    public subscribe(listener: SyncListener): () => void {
        this.listeners.add(listener);
        this.getSnapshot().then(listener);
        return () => this.listeners.delete(listener);
    }

    private async notify() {
        const snapshot = await this.getSnapshot();
        this.listeners.forEach((cb) => cb(snapshot));
    }

    public async getSnapshot(): Promise<SyncStatusSnapshot> {
        let pendingCount = 0;
        let conflictCount = 0;
        let errorCount = 0;

        if (offlineDB) {
            try {
                const items: SyncQueueItem[] = await offlineDB.syncQueue.getAll();
                pendingCount = items.filter((i: SyncQueueItem) => i.status === 'PENDING' || i.status === 'SYNCING').length;
                conflictCount = items.filter((i: SyncQueueItem) => i.status === 'CONFLICT').length;
                errorCount = items.filter((i: SyncQueueItem) => i.status === 'FAILED').length;
            } catch (e) {
                console.error('Error fetching sync queue count:', e);
            }
        }

        let currentSyncState: SyncState = 'idle';
        if (this.isSyncing) {
            currentSyncState = 'syncing';
        } else if (this.syncState === 'auth_expired') {
            currentSyncState = 'auth_expired';
        } else if (conflictCount > 0) {
            currentSyncState = 'conflict';
        } else if (errorCount > 0) {
            currentSyncState = 'error';
        } else if (pendingCount > 0) {
            currentSyncState = 'pending';
        }

        return {
            networkState: this.networkState,
            syncState: currentSyncState,
            pendingCount,
            conflictCount,
            errorCount,
            lastSyncedAt: this.lastSyncedAt,
            lastError: this.lastError
        };
    }

    public async checkTrueConnectivity(): Promise<boolean> {
        if (typeof window === 'undefined') return false;
        if (!navigator.onLine) return false;
        try {
            const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
            const healthURL = baseURL.replace(/\/api$/, '') + '/health';
            const res = await fetch(healthURL, {
                method: 'GET',
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache' }
            });
            return res.ok;
        } catch {
            return false;
        }
    }

    public async queueOperation(
        entityType: 'patient' | 'appointment',
        entityId: string,
        action: 'CREATE' | 'UPDATE',
        payload: any
    ): Promise<SyncQueueItem> {
        if (!offlineDB) throw new Error('Offline database not initialized');

        const idempotencyKey = crypto.randomUUID();
        const queueItem: SyncQueueItem = {
            id: crypto.randomUUID(),
            entityType,
            entityId,
            action,
            payload,
            idempotencyKey,
            deviceId: getDeviceId(),
            createdAt: new Date().toISOString(),
            status: 'PENDING',
            retryCount: 0,
            lastError: null
        };

        await offlineDB.syncQueue.add(queueItem);
        await this.notify();

        // Attempt immediate synchronization if online
        this.triggerSync();
        return queueItem;
    }

    public async triggerSync(): Promise<void> {
        if (this.isSyncing || !offlineDB) return;

        // Check auth status: token must exist
        const token = localStorage.getItem('accessToken');
        if (!token) {
            this.syncState = 'auth_expired';
            this.lastError = 'Authentication required. Please sign in to sync pending operations.';
            await this.notify();
            return;
        }

        const isOnline = await this.checkTrueConnectivity();
        if (!isOnline) {
            this.networkState = 'offline';
            await this.notify();
            return;
        }

        this.isSyncing = true;
        this.syncState = 'syncing';
        await this.notify();

        try {
            const queue: SyncQueueItem[] = await offlineDB.syncQueue.getAll();
            const pendingItems = queue
                .filter((item: SyncQueueItem) => item.status === 'PENDING' || item.status === 'FAILED')
                .sort((a: SyncQueueItem, b: SyncQueueItem) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

            for (const item of pendingItems) {
                // Check if item reached max retries
                if (item.retryCount >= 5) {
                    item.status = 'FAILED';
                    await offlineDB.syncQueue.put(item);
                    continue;
                }

                item.status = 'SYNCING';
                await offlineDB.syncQueue.put(item);
                await this.notify();

                try {
                    await this.processQueueItem(item);
                    item.status = 'SYNCED';
                    await offlineDB.syncQueue.delete(item.id);
                    this.lastSyncedAt = new Date().toLocaleTimeString();
                    this.lastError = null;
                } catch (err: any) {
                    console.error(`Sync error for item ${item.id}:`, err);

                    // Check for Auth Expired (401)
                    if (err.response?.status === 401) {
                        this.syncState = 'auth_expired';
                        this.lastError = 'Session expired. Please sign in to synchronize changes.';
                        item.status = 'PENDING';
                        await offlineDB.syncQueue.put(item);
                        break; // Stop further syncing until authenticated
                    }

                    // Check for Conflict (409 Conflict)
                    if (err.response?.status === 409) {
                        item.status = 'CONFLICT';
                        item.conflictDetails = err.response?.data?.message || 'Conflict detected on server.';
                        item.lastError = item.conflictDetails;
                        await offlineDB.syncQueue.put(item);

                        // Also flag the local record as 'conflict'
                        if (item.entityType === 'patient') {
                            const localPatient = await offlineDB.patients.get(item.entityId);
                            if (localPatient) {
                                localPatient.syncStatus = 'conflict';
                                localPatient.syncError = item.conflictDetails;
                                await offlineDB.patients.put(localPatient);
                            }
                        } else if (item.entityType === 'appointment') {
                            const localAppt = await offlineDB.appointments.get(item.entityId);
                            if (localAppt) {
                                localAppt.syncStatus = 'conflict';
                                localAppt.syncError = item.conflictDetails;
                                await offlineDB.appointments.put(localAppt);
                            }
                        }
                        continue;
                    }

                    // Network or server error (500, timeout, 400 validation error)
                    item.retryCount += 1;
                    item.lastError = err.response?.data?.message || err.message || 'Synchronization request failed';
                    item.status = item.retryCount >= 5 ? 'FAILED' : 'PENDING';
                    await offlineDB.syncQueue.put(item);

                    // Exponential backoff delay
                    const delayMs = Math.min(1000 * Math.pow(2, item.retryCount), 30000);
                    await new Promise((r) => setTimeout(r, delayMs));
                }
            }
        } finally {
            this.isSyncing = false;
            await this.notify();
        }
    }

    private async processQueueItem(item: SyncQueueItem): Promise<void> {
        if (item.entityType === 'patient') {
            if (item.action === 'CREATE') {
                const res = await api.post('/customers', {
                    ...item.payload,
                    id: item.entityId, // Send stable UUID
                    idempotencyKey: item.idempotencyKey,
                    deviceId: item.deviceId
                });

                // Server confirmation: update local patient record to 'synced'
                if (res.data?.data && offlineDB) {
                    const serverRecord = res.data.data;
                    const localPatient = await offlineDB.patients.get(item.entityId);
                    if (localPatient) {
                        localPatient.syncStatus = 'synced';
                        localPatient.syncError = undefined;
                        localPatient.updatedAt = serverRecord.updatedAt || new Date().toISOString();
                        await offlineDB.patients.put(localPatient);
                    }
                }
            }
        } else if (item.entityType === 'appointment') {
            if (item.action === 'CREATE') {
                const res = await api.post('/appointments', {
                    ...item.payload,
                    id: item.entityId, // Send stable UUID
                    idempotencyKey: item.idempotencyKey,
                    deviceId: item.deviceId
                });

                // Server confirmation: update local appointment record to 'synced'
                if (res.data?.data && offlineDB) {
                    const serverRecord = res.data.data;
                    const localAppt = await offlineDB.appointments.get(item.entityId);
                    if (localAppt) {
                        localAppt.syncStatus = 'synced';
                        localAppt.syncError = undefined;
                        await offlineDB.appointments.put(localAppt);
                    }
                }
            }
        }
    }

    private async updateQueueStatus() {
        await this.notify();
    }
}

export const syncManager = typeof window !== 'undefined' ? new SyncManager() : (null as any);
