import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { Header } from './Header'; // <--- Import modular header
import {
    LayoutDashboard,
    Pill,
    ShoppingCart,
    PackagePlus,
    Users,
    Settings,
    LogOut,
    X,
    ChevronRight,
    Globe,
    UserCheck,
    BarChart2,
    Terminal
} from 'lucide-react';

export const AppLayout: React.FC = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { user, logout } = useAuthStore();
    const location = useLocation();

    const handleLogout = async () => {
        await logout();
    };
    const navItems = [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { label: 'Inventory & Stock', path: '/inventory', icon: Pill, roles: ['OWNER', 'PHARMACIST', 'CASHIER'] },
        { label: 'POS Checkout', path: '/pos', icon: ShoppingCart, roles: ['OWNER', 'PHARMACIST', 'CASHIER'] },
        { label: 'Purchase Orders', path: '/purchases', icon: PackagePlus, roles: ['OWNER', 'PHARMACIST'] },
        { label: 'Suppliers', path: '/suppliers', icon: Globe, roles: ['OWNER', 'PHARMACIST'] },
        { label: 'Customers', path: '/customers', icon: UserCheck, roles: ['OWNER', 'PHARMACIST', 'CASHIER'] },
        { label: 'Analytics & Reports', path: '/reports', icon: BarChart2, roles: ['OWNER', 'PHARMACIST'] },
        { label: 'Audit Trail', path: '/audit', icon: Terminal, roles: ['OWNER'] },
        { label: 'Staff & Users', path: '/users', icon: Users, roles: ['OWNER'] },
        { label: 'Settings', path: '/settings', icon: Settings, roles: ['OWNER'] },
    ];

    const filteredNavItems = navItems.filter(item => {
        if (!item.roles) return true;
        return user && item.roles.includes(user.role);
    });

    const pathSegments = location.pathname.split('/').filter(Boolean);

    return (
        <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden">
            {sidebarOpen && (
                <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 bg-black/50 lg:hidden" />
            )}

            {/* Sidebar Navigation */}
            <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 border-r border-gray-800 flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
                <div className="flex h-16 items-center justify-between px-6 border-b border-gray-800">
                    <div className="flex items-center space-x-3">
                        <img src="/favicon.svg" alt="PharmaFlow Logo" className="h-7 w-7" />
                        <span className="text-lg font-bold tracking-wide text-white">PharmaFlow ERP</span>
                    </div>
                    <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                    {filteredNavItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setSidebarOpen(false)}
                                className={`
                  flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                  ${isActive
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'}
                `}
                            >
                                <Icon className="h-5 w-5" />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-800">
                    <button
                        onClick={handleLogout}
                        className="flex w-full items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                    >
                        <LogOut className="h-5 w-5" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex flex-1 flex-col overflow-hidden">
                {/* Modular Header Component */}
                <Header onToggleSidebar={() => setSidebarOpen(true)} />

                {/* Dynamic Page View Area */}
                <main className="flex-1 overflow-y-auto p-6 bg-gray-950">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};