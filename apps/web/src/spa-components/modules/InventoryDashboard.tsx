import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import {
    AlertTriangle,
    Clock,
    Package,
    TrendingDown,
    ShieldAlert,
    ArrowRightLeft,
    PlusCircle,
    RefreshCw
} from 'lucide-react';

interface AlertItem {
    id: string;
    name: string;
    genericName: string;
    stock: number;
    minStockLevel?: number;
    expiryDate?: string;
    batchNumber?: string;
    category?: string;
    supplier?: string;
}

export const InventoryDashboard: React.FC = () => {
    const [lowStockItems, setLowStockItems] = useState<AlertItem[]>([]);
    const [expiringItems, setExpiringItems] = useState<AlertItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAlerts = async () => {
        try {
            setLoading(true);
            const [lowStockRes, expiryRes] = await Promise.all([
                api.get('/inventory/alerts/low-stock'),
                api.get('/inventory/alerts/expiry?days=60'),
            ]);

            setLowStockItems(lowStockRes.data.data);
            setExpiringItems(expiryRes.data.data);
        } catch (error) {
            console.error('Failed to load inventory alerts:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlerts();
    }, []);

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Inventory Control & Stock Tracking</h1>
                    <p className="text-sm text-gray-400">Monitor real-time alerts, stock movements, and product lifecycles.</p>
                </div>
                <button
                    onClick={fetchAlerts}
                    className="inline-flex items-center justify-center px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 shadow-sm transition"
                >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh Metrics
                </button>
            </div>

            {/* Overview Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-900 p-5 rounded-xl border border-gray-800 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-gray-400 uppercase">Low Stock Warnings</p>
                        <p className="text-2xl font-bold text-amber-500 mt-1">{lowStockItems.length}</p>
                    </div>
                    <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-gray-900 p-5 rounded-xl border border-gray-800 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-gray-400 uppercase">Expiring in 60 Days</p>
                        <p className="text-2xl font-bold text-red-500 mt-1">{expiringItems.length}</p>
                    </div>
                    <div className="p-3 bg-red-500/10 text-red-400 rounded-xl">
                        <Clock className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-gray-900 p-5 rounded-xl border border-gray-800 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-gray-400 uppercase">Active Stock Transfers</p>
                        <p className="text-2xl font-bold text-indigo-500 mt-1">0</p>
                    </div>
                    <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
                        <ArrowRightLeft className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-gray-900 p-5 rounded-xl border border-gray-800 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-gray-400 uppercase">Audit Compliance</p>
                        <p className="text-2xl font-bold text-emerald-500 mt-1">100%</p>
                    </div>
                    <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
                        <ShieldAlert className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Two-Column Alert Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Low Stock Panel */}
                <div className="bg-gray-900 rounded-xl border border-gray-800 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-800 bg-amber-500/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-400" />
                            <h2 className="font-semibold text-white">Critical Low Stock Items</h2>
                        </div>
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-xs font-medium rounded-full">
                            {lowStockItems.length} items
                        </span>
                    </div>
                    <div className="divide-y divide-gray-800 max-h-96 overflow-y-auto">
                        {lowStockItems.length === 0 ? (
                            <p className="text-center py-8 text-sm text-gray-500">No stock level warnings at this time.</p>
                        ) : (
                            lowStockItems.map(item => (
                                <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-800/30 transition">
                                    <div>
                                        <p className="font-medium text-white">{item.name}</p>
                                        <p className="text-xs text-gray-400">{item.genericName} • Supplier: {item.supplier || 'N/A'}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300">
                                            {item.stock} left (Min: {item.minStockLevel})
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Near Expiry Panel */}
                <div className="bg-gray-900 rounded-xl border border-gray-800 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-800 bg-red-500/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-red-400" />
                            <h2 className="font-semibold text-white">Near-Expiry Warning Tracker</h2>
                        </div>
                        <span className="px-2 py-0.5 bg-red-500/20 text-red-300 text-xs font-medium rounded-full">
                            {expiringItems.length} items
                        </span>
                    </div>
                    <div className="divide-y divide-gray-800 max-h-96 overflow-y-auto">
                        {expiringItems.length === 0 ? (
                            <p className="text-center py-8 text-sm text-gray-500">No upcoming expirations in the next 60 days.</p>
                        ) : (
                            expiringItems.map(item => (
                                <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-800/30 transition">
                                    <div>
                                        <p className="font-medium text-white">{item.name}</p>
                                        <p className="text-xs text-gray-400">Batch: {item.batchNumber} • Stock: {item.stock} units</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-300">
                                            Exp: {new Date(item.expiryDate!).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};