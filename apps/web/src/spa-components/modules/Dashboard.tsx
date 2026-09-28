import React, { useEffect, useState } from 'react';
import { TrendingUp, ShoppingBag, Pill, AlertTriangle } from 'lucide-react';
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
    n >= 1_000_000
        ? `${(n / 1_000_000).toFixed(1)}M`
        : n >= 1_000
        ? `${(n / 1_000).toFixed(1)}K`
        : n.toFixed(2);

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
                ETB {Number(payload[0].value).toFixed(2)}
            </p>
        </div>
    );
};

/* ══════════════════════════════════════════════════════════════════════════ */
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
        const fetch$ = async () => {
            try {
                const res = await api.get('/analytics/dashboard');
                setData(res.data.data);
            } catch (e: any) {
                setError(e.response?.data?.message || 'Failed to load dashboard.');
            } finally {
                setLoading(false);
            }
        };
        fetch$();
    }, [user]);

    /* ── role gates ─────────────────────────────────────────────────────── */
    if (loading) {
        return (
            <div style={{ display: 'flex', height: 240, alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.4)', fontSize: 14 }}>
                Loading dashboard…
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
            <div style={{ background: 'rgba(239,68,68,.10)', border: '1px solid rgba(239,68,68,.25)', borderRadius: 12, padding: '14px 18px', color: '#fca5a5', fontSize: 14 }}>
                {error}
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

            {/* ── greeting ─────────────────────────────────────────────── */}
            <div>
                <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-.4px' }}>
                    {greeting()}, {name} 👋
                </h1>
                <p style={{ color: 'rgba(255,255,255,.38)', fontSize: 13, marginTop: 4 }}>
                    Here's what's happening at your pharmacy today.
                </p>
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
                        <p style={{ color: '#fff', fontSize: 38, fontWeight: 800, letterSpacing: '-1px', margin: '8px 0 0', lineHeight: 1 }}>
                            ETB {fmt(m.totalRevenue)}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 20, marginTop: 18 }}>
                        {data?.categoryDistribution?.slice(0, 2).map(c => (
                            <div key={c.name}>
                                <p style={{ color: 'rgba(255,255,255,.32)', fontSize: 11, margin: '0 0 2px' }}>{c.name}</p>
                                <p style={{ color: '#fff', fontWeight: 600, fontSize: 14, margin: 0 }}>{c.value} units</p>
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
                        {['7d', '30d', '90d'].map((t, i) => (
                            <span key={t} style={{
                                fontSize: 11, padding: '3px 10px', borderRadius: 99,
                                background: i === 0 ? 'rgba(52,211,153,.15)' : 'transparent',
                                color: i === 0 ? '#34d399' : 'rgba(255,255,255,.3)',
                                border: i === 0 ? '1px solid rgba(52,211,153,.3)' : '1px solid transparent',
                                cursor: 'pointer', fontWeight: 500,
                            }}>{t}</span>
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
                                    ETB {Number(s.totalAmount).toFixed(2)}
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