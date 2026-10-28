// Typed IndexedDB Offline Database for PharmaFlow ERP
// Implements Dexie-compatible persistent local storage for Patients, Appointments, and Sync Queue

export interface LocalPatient {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
    address?: string | null;
    outstandingBalance: string;
    loyaltyPoints: number;
    syncStatus: 'synced' | 'pending' | 'conflict' | 'error';
    createdAt: string;
    updatedAt: string;
    localCreatedAt?: string;
    deviceId?: string;
    syncError?: string;
}

export interface LocalAppointment {
    id: string;
    customerId?: string | null;
    patientName: string;
    patientPhone?: string;
    doctorName?: string;
    appointmentDate: string;
    reason?: string;
    notes?: string;
    status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
    syncStatus: 'synced' | 'pending' | 'conflict' | 'error';
    createdAt: string;
    localCreatedAt?: string;
    deviceId?: string;
    idempotencyKey: string;
    syncError?: string;
}

export interface SyncQueueItem {
    id: string;
    entityType: 'patient' | 'appointment';
    entityId: string;
    action: 'CREATE' | 'UPDATE';
    payload: any;
    idempotencyKey: string;
    deviceId: string;
    createdAt: string;
    status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED' | 'CONFLICT';
    retryCount: number;
    lastError: string | null;
    conflictDetails?: any;
}

const DB_NAME = 'pharmaflow_offline_db';
const DB_VERSION = 1;

export function getDeviceId(): string {
    if (typeof window === 'undefined') return 'server';
    let deviceId = localStorage.getItem('pharmaflow_device_id');
    if (!deviceId) {
        deviceId = 'dev_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
        localStorage.setItem('pharmaflow_device_id', deviceId);
    }
    return deviceId;
}

class OfflineStore<T extends { id: string }> {
    private dbPromise: Promise<IDBDatabase>;
    private storeName: string;

    constructor(dbPromise: Promise<IDBDatabase>, storeName: string) {
        this.dbPromise = dbPromise;
        this.storeName = storeName;
    }

    private getStore(mode: IDBTransactionMode): Promise<{ store: IDBObjectStore; tx: IDBTransaction }> {
        return this.dbPromise.then((db) => {
            const tx = db.transaction(this.storeName, mode);
            const store = tx.objectStore(this.storeName);
            return { store, tx };
        });
    }

    async get(id: string): Promise<T | undefined> {
        const { store } = await this.getStore('readonly');
        return new Promise((resolve, reject) => {
            const req = store.get(id);
            req.onsuccess = () => resolve(req.result as T | undefined);
            req.onerror = () => reject(req.error);
        });
    }

    async getAll(): Promise<T[]> {
        const { store } = await this.getStore('readonly');
        return new Promise((resolve, reject) => {
            const req = store.getAll();
            req.onsuccess = () => resolve((req.result || []) as T[]);
            req.onerror = () => reject(req.error);
        });
    }

    async put(item: T): Promise<string> {
        const { store } = await this.getStore('readwrite');
        return new Promise((resolve, reject) => {
            const req = store.put(item);
            req.onsuccess = () => resolve(req.result as string);
            req.onerror = () => reject(req.error);
        });
    }

    async add(item: T): Promise<string> {
        const { store } = await this.getStore('readwrite');
        return new Promise((resolve, reject) => {
            const req = store.add(item);
            req.onsuccess = () => resolve(req.result as string);
            req.onerror = () => reject(req.error);
        });
    }

    async delete(id: string): Promise<void> {
        const { store } = await this.getStore('readwrite');
        return new Promise((resolve, reject) => {
            const req = store.delete(id);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    async clear(): Promise<void> {
        const { store } = await this.getStore('readwrite');
        return new Promise((resolve, reject) => {
            const req = store.clear();
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    async count(): Promise<number> {
        const { store } = await this.getStore('readonly');
        return new Promise((resolve, reject) => {
            const req = store.count();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }
}

class PharmaFlowOfflineDB {
    private dbPromise: Promise<IDBDatabase>;
    public patients: OfflineStore<LocalPatient>;
    public appointments: OfflineStore<LocalAppointment>;
    public syncQueue: OfflineStore<SyncQueueItem>;

    constructor() {
        this.dbPromise = this.initDB();
        this.patients = new OfflineStore<LocalPatient>(this.dbPromise, 'patients');
        this.appointments = new OfflineStore<LocalAppointment>(this.dbPromise, 'appointments');
        this.syncQueue = new OfflineStore<SyncQueueItem>(this.dbPromise, 'syncQueue');
    }

    private initDB(): Promise<IDBDatabase> {
        if (typeof window === 'undefined') {
            return Promise.reject(new Error('IndexedDB is not available on server-side'));
        }

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
                const db = (event.target as IDBOpenDBRequest).result;

                if (!db.objectStoreNames.contains('patients')) {
                    const patientStore = db.createObjectStore('patients', { keyPath: 'id' });
                    patientStore.createIndex('phone', 'phone', { unique: false });
                    patientStore.createIndex('syncStatus', 'syncStatus', { unique: false });
                }

                if (!db.objectStoreNames.contains('appointments')) {
                    const appointmentStore = db.createObjectStore('appointments', { keyPath: 'id' });
                    appointmentStore.createIndex('customerId', 'customerId', { unique: false });
                    appointmentStore.createIndex('syncStatus', 'syncStatus', { unique: false });
                    appointmentStore.createIndex('appointmentDate', 'appointmentDate', { unique: false });
                }

                if (!db.objectStoreNames.contains('syncQueue')) {
                    const queueStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
                    queueStore.createIndex('status', 'status', { unique: false });
                    queueStore.createIndex('createdAt', 'createdAt', { unique: false });
                    queueStore.createIndex('entityType', 'entityType', { unique: false });
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}

export const offlineDB = typeof window !== 'undefined' ? new PharmaFlowOfflineDB() : (null as any);
