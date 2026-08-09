import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { ShieldAlert, Search, Terminal, User, Clock, CreditCard, Smartphone, Banknote } from 'lucide-react';

interface AuditLog {
    id: string;
    userId?: string;
    userName?: string;
    action: string;
    details?: string;
    ipAddress?: string;
    userAgent?: string;
    createdAt: string;
}

export const AuditLogsPage: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchLogs = async (searchQuery = '') => {
        try {
            const res = await api.get('/audit-logs', {
                params: { search: searchQuery }
            });
            setLogs(res.data.data);
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    useEffect(() => {
        const delay = setTimeout(() => {
            fetchLogs(search);
        }, 300);
        return () => clearTimeout(delay);
    }, [search]);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">System Audit Trail</h1>
                    <p className="text-sm text-gray-500">Unalterable history log tracking critical staff actions, payment methods, and timestamps.</p>
                </div>
            </div>

            {/* Main Container */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

                {/* Search Bar */}
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by action, actor name, or details..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                {/* Logs Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-gray-50/75 border-b border-gray-200 text-gray-500 uppercase tracking-wider font-semibold">
                                <th className="py-3 px-4">Timestamp</th>
                                <th className="py-3 px-4">Actor</th>
                                <th className="py-3 px-4">Action</th>
                                <th className="py-3 px-4">Details</th>
                                <th className="py-3 px-4">Payment Method</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-gray-400 italic">No audit records found.</td>
                                </tr>
                            ) : (
                                logs.map(log => {
                                    // Extract payment method from details string (e.g. "via CASH", "via CARD", "via MOBILE_MONEY")
                                    const paymentMatch = log.details?.match(/\bvia\s+(CASH|CARD|MOBILE_MONEY)\b/i);
                                    const paymentMethod = paymentMatch ? paymentMatch[1].toUpperCase() : null;

                                    const paymentBadge = (method: string | null) => {
                                        if (!method) return <span className="text-gray-400 italic">—</span>;
                                        const styles: Record<string, string> = {
                                            CASH: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                                            CARD: 'bg-blue-50 text-blue-700 border-blue-200',
                                            MOBILE_MONEY: 'bg-amber-50 text-amber-700 border-amber-200',
                                        };
                                        const icons: Record<string, React.ReactNode> = {
                                            CASH: <Banknote className="w-3 h-3 mr-1" />,
                                            CARD: <CreditCard className="w-3 h-3 mr-1" />,
                                            MOBILE_MONEY: <Smartphone className="w-3 h-3 mr-1" />,
                                        };
                                        const label: Record<string, string> = {
                                            CASH: 'Cash',
                                            CARD: 'Card',
                                            MOBILE_MONEY: 'Mobile',
                                        };
                                        return (
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded border font-semibold text-[11px] ${styles[method] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                                {icons[method]}{label[method] || method}
                                            </span>
                                        );
                                    };

                                    return (
                                        <tr key={log.id} className="hover:bg-gray-50/50 transition">
                                            <td className="py-3 px-4 text-gray-500 whitespace-nowrap flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                                {new Date(log.createdAt).toLocaleString()}
                                            </td>
                                            <td className="py-3 px-4 font-bold text-gray-900 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                    <User className="w-3.5 h-3.5 text-indigo-500" />
                                                    {log.userName || 'System'}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 whitespace-nowrap">
                                                <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold rounded-lg border border-indigo-100 font-mono text-[11px]">
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-gray-700 max-w-xs truncate" title={log.details}>
                                                {log.details || 'N/A'}
                                            </td>
                                            <td className="py-3 px-4">
                                                {paymentBadge(paymentMethod)}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

            </div>

        </div>
    );
};