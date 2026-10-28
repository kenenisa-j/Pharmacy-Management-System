import React, { useEffect, useState } from 'react';
import { syncManager, SyncStatusSnapshot } from '../../lib/offline/syncManager';
import { Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

export const NetworkSyncIndicator: React.FC = () => {
    const [status, setStatus] = useState<SyncStatusSnapshot>({
        networkState: typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline',
        syncState: 'idle',
        pendingCount: 0,
        conflictCount: 0,
        errorCount: 0,
        lastSyncedAt: null,
        lastError: null,
    });

    const [isRetrying, setIsRetrying] = useState(false);

    useEffect(() => {
        if (!syncManager) return;
        const unsubscribe = syncManager.subscribe((snapshot: SyncStatusSnapshot) => {
            setStatus(snapshot);
        });
        return () => unsubscribe();
    }, []);

    const handleManualSync = async () => {
        if (!syncManager || isRetrying) return;
        setIsRetrying(true);
        try {
            await syncManager.triggerSync();
        } finally {
            setTimeout(() => setIsRetrying(false), 500);
        }
    };

    const isOffline = status.networkState === 'offline';
    const isSyncing = status.syncState === 'syncing' || isRetrying;
    const hasConflicts = status.conflictCount > 0;
    const hasErrors = status.errorCount > 0 || status.syncState === 'error';
    const isAuthExpired = status.syncState === 'auth_expired';
    const hasPending = status.pendingCount > 0;

    return (
        <div className="flex items-center gap-2">
            {/* Network & Sync Status Pill */}
            <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    isOffline
                        ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                        : isSyncing
                        ? 'bg-indigo-950/40 border-indigo-800/60 text-indigo-300'
                        : hasConflicts
                        ? 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                        : isAuthExpired
                        ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                        : hasPending
                        ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                        : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                }`}
                title={
                    status.lastError
                        ? `Last sync message: ${status.lastError}`
                        : status.lastSyncedAt
                        ? `Last synced at ${status.lastSyncedAt}`
                        : 'System is connected and synchronized'
                }
            >
                {/* Status Icon */}
                {isOffline ? (
                    <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                ) : isSyncing ? (
                    <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                ) : hasConflicts ? (
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                ) : isAuthExpired ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                ) : hasPending ? (
                    <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                    <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                )}

                {/* Status Label */}
                <span>
                    {isOffline
                        ? 'Offline Mode'
                        : isSyncing
                        ? 'Syncing...'
                        : isAuthExpired
                        ? 'Auth Expired'
                        : hasConflicts
                        ? `${status.conflictCount} Conflict${status.conflictCount > 1 ? 's' : ''}`
                        : hasPending
                        ? `${status.pendingCount} Pending Sync`
                        : 'Online & Synced'}
                </span>

                {/* Pending count badge */}
                {hasPending && !isSyncing && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {status.pendingCount}
                    </span>
                )}
            </div>

            {/* Manual Retry Sync Action */}
            {(hasPending || hasErrors || hasConflicts || isOffline) && (
                <button
                    onClick={handleManualSync}
                    disabled={isSyncing}
                    className="p-1.5 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white transition text-xs flex items-center gap-1 border border-gray-700 disabled:opacity-50"
                    title="Attempt manual synchronization now"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Retry Sync</span>
                </button>
            )}
        </div>
    );
};
