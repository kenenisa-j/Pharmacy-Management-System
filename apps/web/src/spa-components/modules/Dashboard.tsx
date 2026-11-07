import React, { useEffect, useState } from 'react';
import { TrendingUp, ShoppingBag, Pill, AlertTriangle, RotateCw } from 'lucide-react';
import { api } from '../../lib/api';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
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
    lowStockItems: Array<{ id: string; name: string; stock: number; minStockLevel: number }>;
    categoryDistribution: Array<{ name: string; value: number }>;
    revenueTrends: Array<{ date: string; revenue: number }>;
    recentSales: Array<{
        id: string;
        invoiceNumber: string;
        totalAmount: string;
        paymentMethod: string;
        createdAt: string;
    }>;
}

/* ── tiny helpers ─────────────────────────────────────────────────────────── */
const fmt = (n: number) =>
    Number(n || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

const initials = (email: string) =>
    email ? email.slice(0, 2).toUpperCase() : '??';

const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
};

const shortDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/* ── custom tooltip ───────────────────────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: '#161b2e', border: '1px solid rgba(255,255,255,.10)',
            borderRadius: 10, padding: '10px 14px',
        }}>
            <p style={{ color: 'rgba(255,255,255,.45)', fontSize: 11, marginBottom: 4 }}>{label}</p>
            <p style={{ color: '#34d399', fontWeight: 700, fontSize: 14 }}>
                Birr {Number(payload[0].value).toFixed(2)}
            </p>
        </div>
    );
};

/* ══════════════════════════════════════════════════════════════════════════ */
export const Dashboard: React.FC = () => {
    const { user } = useAuthStore();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('7d');
    const [error, setError] = useState('');

    const fetch$ = async (selectedPeriod = period) => {
        setIsRefreshing(true);
        setError('');
        try {
            const res = await api.get('/analytics/dashboard', {
                params: { period: selectedPeriod }
            });
            setData(res.data.data);
        } catch (e: any) {
            if (e.code === 'ECONNABORTED' || !e.response) {
                setError('Network connection was interrupted. Please check your network and retry.');
            } else {
                setError(e.response?.data?.message || 'Failed to load dashboard.');
            }
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    const handlePeriodChange = (newPeriod: '7d' | '30d' | '90d') => {
        setPeriod(newPeriod);
        fetch$(newPeriod);
    };

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }
        if (user.role === 'PHARMACIST' || user.role === 'CASHIER') {
            setLoading(false);
            return;
        }
        fetch$();
    }, [user]);

    /* ── role gates ─────────────────────────────────────────────────────── */
    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: 280, alignItems: 'center', justifyContent: 'center', gap: 12, color: 'rgba(255,255,255,.6)', fontSize: 14 }}>
                <div style={{
                    width: 32,
                    height: 32,
                    border: '3px solid rgba(255,255,255,0.1)',
                    borderTopColor: '#6366f1',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                }} />
                <span>Loading dashboard data...</span>
            </div>
        );
    }

    if (user?.role === 'PHARMACIST') return <InventoryDashboard />;

    if (user?.role === 'CASHIER') {
        return (
            <div style={{ maxWidth: 520, margin: '60px auto', textAlign: 'center', padding: 24 }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(99,102,241,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                    <ShoppingBag size={28} color="#818cf8" />
                </div>
                <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
                    Welcome back, {user.email}!
                </h1>
                <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 14, marginBottom: 24 }}>
                    You're logged in as Cashier. Head to the POS terminal to process sales.
                </p>
                <Link to="/pos" style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '12px 24px', borderRadius: 12,
                    background: 'linear-gradient(135deg,#6366f1,#4f46e5)',
                    color: '#fff', fontWeight: 600, fontSize: 14, textDecoration: 'none',
                    boxShadow: '0 6px 20px rgba(99,102,241,.35)',
                }}>
                    Open POS Terminal
                </Link>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                background: 'rgba(239,68,68,.08)',
                border: '1px solid rgba(239,68,68,.25)',
                borderRadius: 14,
                padding: '28px 24px',
                color: '#fca5a5',
                fontSize: 14,
                maxWidth: 480,
                margin: '40px auto',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12
            }}>
                <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: 'rgba(239,68,68,.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ef4444'
                }}>
                    <AlertTriangle size={24} />
                </div>
                <div style={{ fontWeight: 600, color: '#fff', fontSize: 16 }}>Unable to Load Dashboard</div>
                <div style={{ color: '#9ca3af', fontSize: 13, lineHeight: 1.5 }}>{error}</div>
                <button
                    onClick={() => fetch$()}
                    style={{
                        marginTop: 6,
                        padding: '10px 22px',
                        borderRadius: 10,
                        background: '#4f46e5',
                        color: '#fff',
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 13,
                        transition: 'background 0.2s',
                    }}
                >
                    Retry Connection
                </button>
            </div>
        );
    }

    const m = data?.metrics ?? { totalRevenue: 0, totalSales: 0, totalMedicines: 0, lowStockCount: 0 };
    const name = user?.email?.split('@')[0] ?? 'there';

    /* ── secondary metric cards (right column) ──────────────────────────── */
    const secondaryCards = [
        {
            label: 'Completed Sales',
            value: m.totalSales.toString(),
            sub: 'transactions',
            icon: <ShoppingBag size={14} />,
            color: '#60a5fa',
            bg: 'rgba(96,165,250,.12)',
        },
        {
            label: 'Total Medicines',
            value: m.totalMedicines.toString(),
            sub: 'products',
            icon: <Pill size={14} />,
            color: '#a78bfa',
            bg: 'rgba(167,139,250,.12)',
        },
        {
            label: 'Low Stock Alerts',
            value: m.lowStockCount.toString(),
            sub: m.lowStockCount === 0 ? 'all good' : 'need reorder',
            icon: <AlertTriangle size={14} />,
            color: m.lowStockCount > 0 ? '#fbbf24' : '#34d399',
            bg: m.lowStockCount > 0 ? 'rgba(251,191,36,.12)' : 'rgba(52,211,153,.12)',
        },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* ── greeting + refresh ─────────────────────────────────── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-.4px' }}>
                        {greeting()}, {name} 👋
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,.38)', fontSize: 13, marginTop: 4 }}>
                        Here's what's happening at your pharmacy today.
                    </p>
                </div>
                <button
                    onClick={() => fetch$()}
                    disabled={isRefreshing}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 7,
                        padding: '8px 16px',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 12,
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: isRefreshing ? 'wait' : 'pointer',
                        transition: 'all 0.2s',
                    }}
                    title="Refresh Dashboard metrics"
                >
                    <RotateCw size={13} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
                    {isRefreshing ? 'Syncing...' : 'Refresh'}
                </button>
            </div>

            {/* ── primary row: big revenue card + 3 small cards ────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

                {/* BIG revenue card */}
                <div style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1.5px solid rgba(255,255,255,0.08)',
                    borderRadius: 18, padding: '28px 26px',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                    minHeight: 188,
                }}>
                    <div>
                        <p style={{ color: 'rgba(255,255,255,.45)', fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.6px', margin: 0 }}>
                            Total Revenue
                        </p>
                        <p style={{ color: '#fff', fontSize: 36, fontWeight: 800, letterSpacing: '-1px', margin: '8px 0 0', lineHeight: 1 }}>
                            Birr {fmt(m.totalRevenue)}
                        </p>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 18 }}>
                        {data?.categoryDistribution
                            ?.filter(c => c.value > 0)
                            ?.slice(0, 3)
                            ?.map(c => (
                                <div key={c.name}>
                                    <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 11, margin: '0 0 2px' }}>{c.name}</p>
                                    <p style={{ color: '#fff', fontWeight: 600, fontSize: 13, margin: 0 }}>{c.value} {c.value === 1 ? 'item' : 'items'}</p>
                                </div>
                            ))}
                    </div>
                </div>

                {/* 3 stacked small cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {secondaryCards.map(c => (
                        <div key={c.label} style={{
                            flex: 1,
                            background: 'rgba(255,255,255,0.04)',
                            border: '1.5px solid rgba(255,255,255,0.08)',
                            borderRadius: 14, padding: '12px 16px',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                            <div>
                                <p style={{ color: 'rgba(255,255,255,.38)', fontSize: 11, margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '.5px' }}>{c.label}</p>
                                <p style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0, lineHeight: 1 }}>{c.value}</p>
                            </div>
                            <div style={{
                                width: 34, height: 34, borderRadius: 10,
                                background: c.bg, color: c.color,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                {c.icon}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── quick link to periodic breakdown ───────────────────────── */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(79,70,229,0.06))',
                border: '1px solid rgba(99,102,241,0.25)',
                borderRadius: 14,
                padding: '14px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: 'rgba(99,102,241,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#818cf8',
                    }}>
                        <ShoppingBag size={18} />
                    </div>
                    <div>
                        <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: 0 }}>
                            Daily & Periodic Sales Breakdown
                        </p>
                        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, margin: '2px 0 0' }}>
                            Inspect what was sold today, this week, or this month, exact quantities, total Birr, and sold-out medicines.
                        </p>
                    </div>
                </div>
                <Link
                    to="/reports"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 16px',
                        background: '#4f46e5',
                        color: '#fff',
                        borderRadius: 10,
                        fontSize: 12,
                        fontWeight: 600,
                        textDecoration: 'none',
                        boxShadow: '0 4px 12px rgba(79,70,229,0.3)',
                    }}
                >
                    View Detailed Breakdown →
                </Link>
            </div>

            {/* ── revenue chart ─────────────────────────────────────────── */}
            <div style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1.5px solid rgba(255,255,255,0.08)',
                borderRadius: 18, padding: '22px 24px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <TrendingUp size={16} color="#34d399" />
                        <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>Revenue Trend</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                        {(['7d', '30d', '90d'] as const).map(t => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => handlePeriodChange(t)}
                                style={{
                                    fontSize: 11, padding: '3px 10px', borderRadius: 99,
                                    background: period === t ? 'rgba(52,211,153,.15)' : 'transparent',
                                    color: period === t ? '#34d399' : 'rgba(255,255,255,.3)',
                                    border: period === t ? '1px solid rgba(52,211,153,.3)' : '1px solid transparent',
                                    cursor: 'pointer', fontWeight: 500,
                                    transition: 'all 0.2s',
                                }}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>
                <div style={{ height: 180 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data?.revenueTrends || []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" vertical={false} />
                            <XAxis dataKey="date" stroke="rgba(255,255,255,.2)" fontSize={11} tickLine={false} axisLine={false} />
                            <YAxis stroke="rgba(255,255,255,.2)" fontSize={11} tickLine={false} axisLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="revenue" stroke="#34d399" strokeWidth={2} fillOpacity={1} fill="url(#gRev)" dot={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* ── recent transactions ───────────────────────────────────── */}
            <div style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1.5px solid rgba(255,255,255,0.08)',
                borderRadius: 18, padding: '22px 24px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>Recent Transactions</span>
                    <span style={{ color: 'rgba(255,255,255,.3)', fontSize: 12 }}>···</span>
                </div>

                {/* header row */}
                <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 80px 80px 70px', gap: 12, padding: '0 0 10px', borderBottom: '1px solid rgba(255,255,255,.06)', marginBottom: 4 }}>
                    {['', 'Invoice', 'Date', 'Amount', 'Status'].map(h => (
                        <span key={h} style={{ color: 'rgba(255,255,255,.28)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 500 }}>{h}</span>
                    ))}
                </div>

                {data?.recentSales && data.recentSales.length > 0 ? (
                    data.recentSales.map((s) => {
                        const abbr = s.invoiceNumber?.slice(0, 2).toUpperCase() || 'TX';
                        return (
                            <div key={s.id} style={{
                                display: 'grid', gridTemplateColumns: '36px 1fr 80px 80px 70px',
                                gap: 12, padding: '10px 0',
                                borderBottom: '1px solid rgba(255,255,255,.04)',
                                alignItems: 'center',
                            }}>
                                {/* avatar */}
                                <div style={{
                                    width: 32, height: 32, borderRadius: 10,
                                    background: 'rgba(99,102,241,.18)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 10, fontWeight: 700, color: '#a5b4fc',
                                }}>
                                    {abbr}
                                </div>
                                <span style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>{s.invoiceNumber}</span>
                                <span style={{ color: 'rgba(255,255,255,.4)', fontSize: 12 }}>{shortDate(s.createdAt)}</span>
                                <span style={{ color: '#34d399', fontSize: 13, fontWeight: 600 }}>
                                    Birr {Number(s.totalAmount).toFixed(2)}
                                </span>
                                <span style={{
                                    display: 'inline-block', padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                                    background: 'rgba(52,211,153,.12)', color: '#34d399',
                                }}>
                                    Paid
                                </span>
                            </div>
                        );
                    })
                ) : (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(255,255,255,.28)', fontSize: 13 }}>
                        No recent transactions recorded.
                    </div>
                )}
            </div>
        </div>
    );
};