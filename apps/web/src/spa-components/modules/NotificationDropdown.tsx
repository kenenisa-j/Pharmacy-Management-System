import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';
import { Bell, CheckCheck, AlertTriangle, Package, CheckCircle2, DollarSign } from 'lucide-react';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'LOW_STOCK' | 'EXPIRY' | 'PURCHASE' | 'PAYMENT';
    isRead: number;
    createdAt: string;
}

export const NotificationDropdown: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/notifications');
            setNotifications(res.data.data);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = async (id: string) => {
        try {
            await api.patch(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: 1 } : n));
        } catch (error) {
            console.error('Failed to mark notification read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await api.patch('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, isRead: 1 })));
        } catch (error) {
            console.error('Failed to mark all read:', error);
        }
    };

    const unreadCount = notifications.filter(n => n.isRead === 0).length;

    const getIcon = (type: string) => {
        switch (type) {
            case 'LOW_STOCK': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
            case 'EXPIRY': return <Package className="w-4 h-4 text-red-500" />;
            case 'PURCHASE': return <CheckCircle2 className="w-4 h-4 text-indigo-500" />;
            case 'PAYMENT': return <DollarSign className="w-4 h-4 text-emerald-500" />;
            default: return <Bell className="w-4 h-4 text-gray-500" />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white font-bold text-[10px] rounded-full flex items-center justify-center">
                        {unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-gray-200 shadow-xl z-50 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-900 text-sm">Notifications</h3>
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 font-bold text-xs rounded-full">
                                {unreadCount} new
                            </span>
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                            >
                                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                        {notifications.length === 0 ? (
                            <div className="p-6 text-center text-gray-400 text-xs">No notifications right now.</div>
                        ) : (
                            notifications.map(n => (
                                <div
                                    key={n.id}
                                    onClick={() => markAsRead(n.id)}
                                    className={`p-3.5 hover:bg-gray-50 transition cursor-pointer flex gap-3 items-start ${n.isRead === 0 ? 'bg-indigo-50/40' : ''}`}
                                >
                                    <div className="p-2 bg-white border border-gray-200 rounded-xl shadow-xs shrink-0">
                                        {getIcon(n.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-gray-900 text-xs truncate">{n.title}</h4>
                                            <span className="text-[10px] text-gray-400 shrink-0 ml-2">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{n.message}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};