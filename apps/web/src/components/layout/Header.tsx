import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import {
    Search,
    User,
    Settings,
    LogOut,
    Menu,
    X
} from 'lucide-react';
import { NetworkSyncIndicator } from '../common/NetworkSyncIndicator';
import { NotificationDropdown } from '../../spa-components/modules/NotificationDropdown';

interface HeaderProps {
    onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    // Dropdown states
    const [profileOpen, setProfileOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Refs for clicking outside to close dropdowns
    const profileRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <header className="flex h-16 items-center justify-between border-b border-gray-800 bg-gray-900/50 backdrop-blur px-6 z-30">
            {/* Left: Mobile Toggle & Global Search Bar */}
            <div className="flex items-center space-x-4 flex-1 max-w-xl">
                <button
                    onClick={onToggleSidebar}
                    className="lg:hidden text-gray-400 hover:text-white focus:outline-none"
                >
                    <Menu className="h-6 w-6" />
                </button>

                {/* Global Search Bar */}
                <div className="relative w-full max-w-md hidden sm:block">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
                        <Search className="h-4 w-4" />
                    </span>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search medicines, barcodes, suppliers, or sales..."
                        className="w-full rounded-lg bg-gray-950/60 border border-gray-800 pl-10 pr-4 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-white"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Right: Notifications & User Profile Menu */}
            <div className="flex items-center space-x-4">

                {/* Network & Synchronization Status Indicator */}
                <NetworkSyncIndicator />

                {/* Live Real-Time Notifications Dropdown */}
                <NotificationDropdown />

                <div className="h-6 w-px bg-gray-800" />

                {/* User Profile Dropdown Trigger */}
                <div className="relative" ref={profileRef}>
                    <button
                        onClick={() => setProfileOpen(!profileOpen)}
                        className="flex items-center space-x-3 focus:outline-none group p-1.5 rounded-lg hover:bg-gray-800/80 transition"
                    >
                        <div className="h-9 w-9 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold text-sm">
                            {user?.email?.charAt(0).toUpperCase()}
                        </div>
                        <div className="hidden md:block text-left">
                            <p className="text-xs font-medium text-white truncate max-w-[120px]">{user?.email}</p>
                            <p className="text-[10px] text-indigo-400 font-semibold">{user?.role}</p>
                        </div>
                    </button>

                    {/* Profile Dropdown Menu */}
                    {profileOpen && (
                        <div className="absolute right-0 mt-2 w-56 rounded-xl bg-gray-900 border border-gray-800 shadow-2xl py-1 z-50">
                            <div className="px-4 py-3 border-b border-gray-800">
                                <p className="text-xs text-gray-400">Signed in as</p>
                                <p className="text-sm font-medium text-white truncate">{user?.email}</p>
                            </div>

                            <div className="py-1">
                                <button
                                    onClick={() => { setProfileOpen(false); navigate('/settings'); }}
                                    className="flex w-full items-center space-x-2 px-4 py-2 text-xs text-gray-300 hover:bg-gray-800 hover:text-white"
                                >
                                    <User className="h-4 w-4 text-gray-400" />
                                    <span>Profile Settings</span>
                                </button>
                                <button
                                    onClick={() => { setProfileOpen(false); navigate('/settings'); }}
                                    className="flex w-full items-center space-x-2 px-4 py-2 text-xs text-gray-300 hover:bg-gray-800 hover:text-white"
                                >
                                    <Settings className="h-4 w-4 text-gray-400" />
                                    <span>System Config</span>
                                </button>
                            </div>

                            <div className="border-t border-gray-800 py-1">
                                <button
                                    onClick={handleLogout}
                                    className="flex w-full items-center space-x-2 px-4 py-2 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300"
                                >
                                    <LogOut className="h-4 w-4" />
                                    <span>Sign Out</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </header>
    );
};