import React, { useEffect, useState } from 'react';
import { DollarSign, Pill, ShoppingBag, AlertTriangle, TrendingUp, BarChart2 } from 'lucide-react';
import { api } from '../../lib/api';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid } from 'recharts';
import { useAuthStore } from '../../store/useAuthStore';
import { InventoryDashboard } from './InventoryDashboard';
import { Link } from 'react-router-dom';

interface DashboardData {
    metrics: {
        totalRevenue: number;
        totalSales: number;
        totalMedicines: number;
        lowStockCount: number;
    };
    lowStockItems: Array<{
        id: string;
        name: string;
        stock: number;
        minStockLevel: number;
    }>;
    categoryDistribution: Array<{
        name: string;
        value: number;
    }>;
    revenueTrends: Array<{
        date: string;
        revenue: number;
    }>;
    recentSales: Array<{
        id: string;
        invoiceNumber: string;
        totalAmount: string;
        paymentMethod: string;
        createdAt: string;
    }>;
}

export const Dashboard: React.FC = () => {
    const { user } = useAuthStore();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (user && (user.role === 'PHARMACIST' || user.role === 'CASHIER')) {
            setLoading(false);
            return;
        }

        const fetchAnalytics = async () => {
            try {
                const response = await api.get('/analytics/dashboard');
                setData(response.data.data);
            } catch (err: any) {
                setError(err.response?.data?.message || 'Failed to load dashboard metrics');
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, [user]);

    if (loading) {
        return <div className="flex h-64 items-center justify-center text-gray-400">Loading dashboard analytics...</div>;
    }

    if (user?.role === 'PHARMACIST') {
        return <InventoryDashboard />;
    }

    if (user?.role === 'CASHIER') {
        return (
            <div className="space-y-6 max-w-4xl mx-auto">
                <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-xl text-center space-y-6">
                    <div className="inline-flex h-16 w-16 rounded-full bg-indigo-500/10 text-indigo-400 items-center justify-center">
                        <ShoppingBag className="h-8 w-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Welcome back, {user.email}!</h1>
                        <p className="text-gray-400 mt-2 text-sm">You are logged in as a Cashier. Access the POS terminal to process sales and manage transactions.</p>
                    </div>
                    <div>
                        <Link
                            to="/pos"
                            className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
                        >
                            Open POS Checkout Terminal
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-red-400">{error}</div>;
    }

    const metrics = data?.metrics || { totalRevenue: 0, totalSales: 0, totalMedicines: 0, lowStockCount: 0 };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
                <p className="text-sm text-gray-400">Real-time operational summary and performance analytics.</p>
            </div>

            {/* Summary Cards Grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl bg-gray-900 border border-gray-800 p-6 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-gray-400">Total Revenue</p>
                        <p className="text-2xl font-bold text-white mt-1">${metrics.totalRevenue.toFixed(2)}</p>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                        <DollarSign className="h-6 w-6" />
                    </div>
                </div>

                <div className="rounded-xl bg-gray-900 border border-gray-800 p-6 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-gray-400">Completed Sales</p>
                        <p className="text-2xl font-bold text-white mt-1">{metrics.totalSales}</p>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                        <ShoppingBag className="h-6 w-6" />
                    </div>
                </div>

                <div className="rounded-xl bg-gray-900 border border-gray-800 p-6 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-gray-400">Total Medicines</p>
                        <p className="text-2xl font-bold text-white mt-1">{metrics.totalMedicines}</p>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                        <Pill className="h-6 w-6" />
                    </div>
                </div>

                <div className="rounded-xl bg-gray-900 border border-gray-800 p-6 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-gray-400">Low Stock Alerts</p>
                        <p className="text-2xl font-bold text-amber-400 mt-1">{metrics.lowStockCount} Items</p>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                        <AlertTriangle className="h-6 w-6" />
                    </div>
                </div>
            </div>

            {/* Analytics Charts Section */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Revenue Trend Area Chart */}
                <div className="rounded-xl bg-gray-900 border border-gray-800 p-6 lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-semibold text-white flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-indigo-400" />
                            Revenue Trends
                        </h2>
                        <span className="text-xs text-gray-400">Last 7 active days</span>
                    </div>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data?.revenueTrends || []}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                                <YAxis stroke="#9ca3af" fontSize={12} />
                                <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '0.5rem', color: '#fff' }} />
                                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Category Distribution Bar Chart */}
                <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-semibold text-white flex items-center gap-2">
                            <BarChart2 className="h-5 w-5 text-emerald-400" />
                            Category Breakdown
                        </h2>
                    </div>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data?.categoryDistribution || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} interval={0} />
                                <YAxis stroke="#9ca3af" fontSize={12} />
                                <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '0.5rem', color: '#fff' }} />
                                <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Tables Grid: Low Stock & Recent Sales */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Low Stock Table */}
                <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-semibold text-white flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-400" />
                            Low Stock Warnings
                        </h2>
                        <span className="text-xs text-gray-400">Requires attention</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-300">
                            <thead className="border-b border-gray-800 text-xs uppercase text-gray-500">
                                <tr>
                                    <th className="pb-3 font-medium">Medicine Name</th>
                                    <th className="pb-3 font-medium">Current Stock</th>
                                    <th className="pb-3 font-medium">Min Level</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/50">
                                {data?.lowStockItems && data.lowStockItems.length > 0 ? (
                                    data.lowStockItems.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-800/30">
                                            <td className="py-3 font-medium text-white">{item.name}</td>
                                            <td className="py-3 text-red-400 font-semibold">{item.stock}</td>
                                            <td className="py-3 text-gray-400">{item.minStockLevel}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={3} className="py-4 text-center text-gray-500">No low stock items found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Sales Table */}
                <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-semibold text-white flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-emerald-400" />
                            Recent Transactions
                        </h2>
                        <span className="text-xs text-gray-400">Latest sales history</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-300">
                            <thead className="border-b border-gray-800 text-xs uppercase text-gray-500">
                                <tr>
                                    <th className="pb-3 font-medium">Invoice #</th>
                                    <th className="pb-3 font-medium">Method</th>
                                    <th className="pb-3 font-medium text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/50">
                                {data?.recentSales && data.recentSales.length > 0 ? (
                                    data.recentSales.map((sale) => (
                                        <tr key={sale.id} className="hover:bg-gray-800/30">
                                            <td className="py-3 font-medium text-white">{sale.invoiceNumber}</td>
                                            <td className="py-3 text-gray-400 uppercase text-xs">{sale.paymentMethod}</td>
                                            <td className="py-3 text-right font-semibold text-emerald-400">${Number(sale.totalAmount).toFixed(2)}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={3} className="py-4 text-center text-gray-500">No recent transactions recorded.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};