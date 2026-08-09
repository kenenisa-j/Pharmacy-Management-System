import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import {
    BarChart3,
    Download,
    FileSpreadsheet,
    FileText,
    DollarSign,
    Package,
    ShoppingCart,
    TrendingUp,
    FileCheck
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
    const { user } = useAuthStore();
    const isOwner = user?.role === 'OWNER';
    const [metrics, setMetrics] = useState({
        revenue: 0,
        salesCount: 0,
        totalStock: 0,
        uniqueItems: 0,
        recentSales: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const res = await api.get('/reports/analytics');
                setMetrics(res.data.data);
            } catch (error) {
                console.error('Failed to load analytics:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    const handleDownload = async (endpoint: string, filename: string) => {
        try {
            const response = await api.get(`/reports/${endpoint}`, {
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            alert('Failed to download report file');
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
                    <p className="text-sm text-gray-500">
                        {isOwner
                            ? 'Business intelligence, performance metrics, and data document exports.'
                            : 'Inventory and operational reports for pharmacy staff.'}
                    </p>
                </div>
            </div>

            {/* Metrics Grid — Owner only sees financial summary */}
            {isOwner && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                        <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Revenue</span>
                        <h3 className="text-xl font-extrabold text-gray-900 mt-0.5">${metrics.revenue.toFixed(2)}</h3>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                        <ShoppingCart className="w-6 h-6" />
                    </div>
                    <div>
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Sales</span>
                        <h3 className="text-xl font-extrabold text-gray-900 mt-0.5">{metrics.salesCount}</h3>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                        <Package className="w-6 h-6" />
                    </div>
                    <div>
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Stock Units</span>
                        <h3 className="text-xl font-extrabold text-gray-900 mt-0.5">{metrics.totalStock}</h3>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Catalog Items</span>
                        <h3 className="text-xl font-extrabold text-gray-900 mt-0.5">{metrics.uniqueItems}</h3>
                    </div>
                </div>
            </div>
            )}

            {/* Export Center Cards */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
                <h2 className="text-base font-bold text-gray-900">Document Export Center</h2>
                <p className="text-xs text-gray-500">Download formatted reports for auditing, accounting, and inventory management.</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">

                    {/* Sales PDF — Owner only */}
                    {isOwner && (
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col justify-between space-y-3">
                        <div>
                            <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm mb-1">
                                <FileText className="w-4 h-4" /> Sales Report (PDF)
                            </div>
                            <p className="text-xs text-gray-500">Formatted summary of recent sales performance transactions.</p>
                        </div>
                        <button
                            onClick={() => handleDownload('export/sales/pdf', `sales-report-${Date.now()}.pdf`)}
                            className="w-full py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-1.5"
                        >
                            <Download className="w-3.5 h-3.5" /> Download PDF
                        </button>
                    </div>
                    )}

                    {/* Inventory Excel — All roles */}
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col justify-between space-y-3">
                        <div>
                            <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm mb-1">
                                <FileSpreadsheet className="w-4 h-4" /> Inventory Report (Excel)
                            </div>
                            <p className="text-xs text-gray-500">Full spreadsheet breakdown of stock levels, cost, and pricing.</p>
                        </div>
                        <button
                            onClick={() => handleDownload('export/inventory/excel', `inventory-report-${Date.now()}.xlsx`)}
                            className="w-full py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition flex items-center justify-center gap-1.5"
                        >
                            <Download className="w-3.5 h-3.5" /> Download Excel
                        </button>
                    </div>

                    {/* Sales CSV — Owner only */}
                    {isOwner && (
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col justify-between space-y-3">
                        <div>
                            <div className="flex items-center gap-2 text-blue-600 font-bold text-sm mb-1">
                                <FileCheck className="w-4 h-4" /> Sales Data (CSV)
                            </div>
                            <p className="text-xs text-gray-500">Raw transaction records exportable to external accounting tools.</p>
                        </div>
                        <button
                            onClick={() => handleDownload('export/sales/csv', `sales-data-${Date.now()}.csv`)}
                            className="w-full py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition flex items-center justify-center gap-1.5"
                        >
                            <Download className="w-3.5 h-3.5" /> Download CSV
                        </button>
                    </div>
                    )}

                </div>
            </div>

        </div>
    );
};