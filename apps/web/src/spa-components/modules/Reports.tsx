import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import {
    BarChart3,
    Download,
    FileSpreadsheet,
    FileText,
    Banknote,
    Package,
    ShoppingCart,
    TrendingUp,
    FileCheck,
    Calendar,
    Clock,
    AlertOctagon,
    RotateCw,
    CheckCircle2,
    Layers,
    Search
} from 'lucide-react';

interface PeriodReport {
    period: string;
    summary: {
        totalRevenue: number;
        totalQuantity: number;
        totalSalesCount: number;
        averageOrderValue: number;
        soldOutMedicinesCount: number;
    };
    itemsSold: Array<{
        medicineId: string;
        medicineName: string;
        genericName: string | null;
        categoryName: string;
        unitPrice: string;
        minStockLevel: number;
        currentStock: number;
        quantitySold: number;
        totalRevenue: number;
        isSoldOut: boolean;
        isLowStock: boolean;
    }>;
    soldOutCatalog: Array<{
        id: string;
        name: string;
        categoryName: string | null;
        stockQuantity: number | null;
    }>;
    salesList: Array<{
        id: string;
        receiptNumber: string;
        customerName: string | null;
        paymentMethod: string;
        totalAmount: string;
        cashierEmail: string | null;
        itemsSummary: string;
        createdAt: string;
    }>;
}

export const ReportsPage: React.FC = () => {
    const { user } = useAuthStore();
    const isOwner = user?.role === 'OWNER';

    // Global analytics summary
    const [metrics, setMetrics] = useState({
        revenue: 0,
        salesCount: 0,
        totalStock: 0,
        uniqueItems: 0,
        recentSales: []
    });

    // Periodic Sales Report State (Today / This Week / This Month)
    const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
    const [customDate, setCustomDate] = useState<string>('');
    const [periodData, setPeriodData] = useState<PeriodReport | null>(null);
    const [loadingPeriod, setLoadingPeriod] = useState(true);
    const [periodError, setPeriodError] = useState('');
    const [itemSearch, setItemSearch] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchAnalytics = async () => {
        try {
            const res = await api.get('/reports/analytics');
            setMetrics(res.data.data);
        } catch (error) {
            console.warn('Analytics summary note:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPeriodReport = async (p: 'today' | 'week' | 'month' | 'custom' = period, dateStr = customDate) => {
        setLoadingPeriod(true);
        setPeriodError('');
        try {
            const params: Record<string, string> = { period: p };
            if (dateStr) params.date = dateStr;
            const res = await api.get('/reports/sales-period', { params });
            setPeriodData(res.data.data);
        } catch (error: any) {
            console.error('Failed to load period sales report:', error);
            setPeriodError(error?.response?.data?.message || 'Database query timed out. Tap retry to reload.');
        } finally {
            setLoadingPeriod(false);
        }
    };

    useEffect(() => {
        // Run period report first, then analytics
        fetchPeriodReport().then(() => fetchAnalytics());
    }, []);

    const handlePeriodChange = (newPeriod: 'today' | 'week' | 'month') => {
        setPeriod(newPeriod);
        setCustomDate('');
        fetchPeriodReport(newPeriod, '');
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setCustomDate(val);
        if (val) {
            fetchPeriodReport('custom', val);
        } else {
            fetchPeriodReport(period, '');
        }
    };

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

    // Filter items sold
    const filteredItemsSold = (periodData?.itemsSold || []).filter(item => {
        const q = itemSearch.toLowerCase();
        return (
            item.medicineName.toLowerCase().includes(q) ||
            (item.genericName && item.genericName.toLowerCase().includes(q)) ||
            item.categoryName.toLowerCase().includes(q)
        );
    });

    const periodTitle = customDate
        ? `Sales on ${customDate}`
        : period === 'today'
        ? "Today's Sales Breakdown"
        : period === 'week'
        ? 'This Week (Last 7 Days)'
        : 'This Month (Last 30 Days)';

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Sales & Operations Reports</h1>
                    <p className="text-sm text-gray-500">
                        {isOwner
                            ? 'Monitor daily and periodic sales, what medicines were sold, quantities, and current stock status.'
                            : 'Inventory stock reports and operational tracking for pharmacy staff.'}
                    </p>
                </div>

                {isOwner && (
                    <button
                        onClick={() => { fetchAnalytics(); fetchPeriodReport(); }}
                        className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition"
                        title="Refresh data"
                    >
                        <RotateCw className={`w-3.5 h-3.5 ${loadingPeriod ? 'animate-spin text-indigo-600' : ''}`} />
                        Refresh Data
                    </button>
                )}
            </div>

            {/* Period Sales Section — Highlights Today, This Week, This Month */}
            {isOwner && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">

                    {/* Controls Bar: Timeframe Buttons + Date Picker */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
                        <div>
                            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Owner Overview</span>
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mt-0.5">
                                <Calendar className="w-5 h-5 text-indigo-600" />
                                {periodTitle}
                            </h2>
                        </div>

                        {/* Period Switcher Pills + Date Picker */}
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="inline-flex bg-gray-100 p-1 rounded-xl">
                                {(['today', 'week', 'month'] as const).map(p => {
                                    const active = !customDate && period === p;
                                    const labels = { today: 'Today', week: 'This Week', month: 'This Month' };
                                    return (
                                        <button
                                            key={p}
                                            onClick={() => handlePeriodChange(p)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                                active
                                                    ? 'bg-indigo-600 text-white shadow-sm'
                                                    : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                        >
                                            {labels[p]}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Specific date selector */}
                            <div className="flex items-center gap-1.5 pl-2 border-l border-gray-200">
                                <span className="text-xs text-gray-400 font-medium">Or Date:</span>
                                <input
                                    type="date"
                                    value={customDate}
                                    onChange={handleDateChange}
                                    className="border border-gray-300 rounded-lg px-2.5 py-1 text-xs text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Summary Metric Cards for Selected Period */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Revenue in Birr */}
                        <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center gap-3.5">
                            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-lg">
                                <Banknote className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">Period Revenue</p>
                                <p className="text-xl font-extrabold text-emerald-950 mt-0.5">
                                    Birr {Number(periodData?.summary.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>

                        {/* Quantity Sold */}
                        <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center gap-3.5">
                            <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-lg">
                                <Package className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-indigo-800 uppercase tracking-wide">Total Units Sold</p>
                                <p className="text-xl font-extrabold text-indigo-950 mt-0.5">
                                    {Number(periodData?.summary.totalQuantity || 0)} units
                                </p>
                            </div>
                        </div>

                        {/* Completed Sales / Orders Count */}
                        <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center gap-3.5">
                            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-lg">
                                <ShoppingCart className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-blue-800 uppercase tracking-wide">Total Orders</p>
                                <p className="text-xl font-extrabold text-blue-950 mt-0.5">
                                    {Number(periodData?.summary.totalSalesCount || 0)} sales
                                </p>
                            </div>
                        </div>

                        {/* Sold Out Catalog Items */}
                        <div className="p-4 bg-rose-50/60 rounded-xl border border-rose-100 flex items-center gap-3.5">
                            <div className="p-2.5 bg-rose-100 text-rose-700 rounded-lg">
                                <AlertOctagon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-rose-800 uppercase tracking-wide">Sold Out Medicines</p>
                                <p className="text-xl font-extrabold text-rose-950 mt-0.5">
                                    {Number(periodData?.summary.soldOutMedicinesCount || 0)} items
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* What Was Sold Table — Item by Item Breakdown */}
                    <div className="space-y-3 pt-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="font-bold text-gray-900 text-base">What Was Sold in This Period</h3>
                                <p className="text-xs text-gray-500">Every medicine sold, quantities deducted, total Birr, and remaining stock status.</p>
                            </div>

                            <div className="relative max-w-xs">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Filter sold medicines..."
                                    value={itemSearch}
                                    onChange={e => setItemSearch(e.target.value)}
                                    className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-gray-200">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider font-semibold">
                                        <th className="py-2.5 px-4">Medicine Name</th>
                                        <th className="py-2.5 px-4">Category</th>
                                        <th className="py-2.5 px-4 text-center">Quantity Sold</th>
                                        <th className="py-2.5 px-4 text-right">Total Birr</th>
                                        <th className="py-2.5 px-4 text-center">Current Stock</th>
                                        <th className="py-2.5 px-4 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loadingPeriod ? (
                                        <tr>
                                            <td colSpan={6} className="py-8 text-center text-gray-400 italic">Loading sales report data...</td>
                                        </tr>
                                    ) : periodError ? (
                                        <tr>
                                            <td colSpan={6} className="py-6 text-center text-rose-500 text-xs">
                                                <div>{periodError}</div>
                                                <button
                                                    type="button"
                                                    onClick={() => fetchPeriodReport()}
                                                    className="mt-2 px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700"
                                                >
                                                    Retry
                                                </button>
                                            </td>
                                        </tr>
                                    ) : filteredItemsSold.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-8 text-center text-gray-400 italic">
                                                No medicines recorded as sold for this period.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredItemsSold.map((item, idx) => (
                                            <tr key={item.medicineId || idx} className="hover:bg-gray-50/60 transition">
                                                <td className="py-3 px-4 font-semibold text-gray-900">
                                                    <div>{item.medicineName}</div>
                                                    {item.genericName && (
                                                        <div className="text-[11px] text-gray-400 font-normal">{item.genericName}</div>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-gray-600">
                                                    <span className="px-2 py-0.5 bg-gray-100 rounded text-[11px] font-medium">
                                                        {item.categoryName}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-center font-bold text-indigo-700">
                                                    {item.quantitySold} units
                                                </td>
                                                <td className="py-3 px-4 text-right font-extrabold text-emerald-600">
                                                    Birr {Number(item.totalRevenue).toFixed(2)}
                                                </td>
                                                <td className="py-3 px-4 text-center font-mono font-medium">
                                                    {item.currentStock} units
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    {item.isSoldOut ? (
                                                        <span className="px-2 py-0.5 bg-rose-50 text-rose-700 font-bold rounded border border-rose-200 text-[10px] uppercase">
                                                            Sold Out
                                                        </span>
                                                    ) : item.isLowStock ? (
                                                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-bold rounded border border-amber-200 text-[10px] uppercase">
                                                            Low Stock
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded border border-emerald-200 text-[10px] uppercase">
                                                            In Stock
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Transactions Log For This Period */}
                    <div className="space-y-3 pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-gray-900 text-base">Transactions Recorded in This Period</h3>
                                <p className="text-xs text-gray-500">Every receipt, timestamp, cashier terminal, and items sold.</p>
                            </div>
                            <span className="text-xs text-gray-400 font-medium">
                                {periodData?.salesList.length || 0} transaction{periodData?.salesList.length === 1 ? '' : 's'}
                            </span>
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-gray-200">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider font-semibold">
                                        <th className="py-2.5 px-4">Time</th>
                                        <th className="py-2.5 px-4">Receipt #</th>
                                        <th className="py-2.5 px-4">Sold Items Summary</th>
                                        <th className="py-2.5 px-4">Payment</th>
                                        <th className="py-2.5 px-4 text-right">Total Birr</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loadingPeriod ? (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-gray-400 italic">Loading transactions...</td>
                                        </tr>
                                    ) : !periodData?.salesList || periodData.salesList.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-gray-400 italic">No transactions recorded for this period.</td>
                                        </tr>
                                    ) : (
                                        periodData.salesList.map(s => (
                                            <tr key={s.id} className="hover:bg-gray-50/60 transition">
                                                <td className="py-2.5 px-4 text-gray-500 whitespace-nowrap flex items-center gap-1.5">
                                                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                                                    {new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="py-2.5 px-4 font-mono font-bold text-indigo-700 whitespace-nowrap">
                                                    #{s.receiptNumber}
                                                </td>
                                                <td className="py-2.5 px-4 text-gray-800 font-medium max-w-md">
                                                    {s.itemsSummary}
                                                </td>
                                                <td className="py-2.5 px-4 whitespace-nowrap">
                                                    <span className="px-2 py-0.5 rounded font-semibold text-[10px] bg-gray-100 text-gray-700">
                                                        {s.paymentMethod}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-4 text-right font-extrabold text-emerald-600 whitespace-nowrap">
                                                    Birr {Number(s.totalAmount).toFixed(2)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            )}

            {/* Document Export Center Cards */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
                <h2 className="text-base font-bold text-gray-900">Document Export Center</h2>
                <p className="text-xs text-gray-500">Download formatted reports for auditing, tax filing, accounting, and inventory management.</p>

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
