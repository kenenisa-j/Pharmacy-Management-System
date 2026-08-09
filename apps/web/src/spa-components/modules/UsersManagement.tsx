import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { 
    UserPlus, 
    UserMinus, 
    Shield, 
    Check, 
    X, 
    Mail, 
    Phone, 
    Calendar,
    ToggleLeft,
    ToggleRight,
    Search,
    UserCheck,
    AlertCircle
} from 'lucide-react';

interface Employee {
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
    phone: string;
}

interface User {
    id: string;
    email: string;
    isActive: boolean;
    createdAt: string;
    role: 'OWNER' | 'PHARMACIST' | 'CASHIER';
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
}

export const UsersManagementPage: React.FC = () => {
    const [usersList, setUsersList] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    
    // Form fields
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [roleName, setRoleName] = useState('CASHIER');

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Auto-dismiss messages after 5 seconds
    useEffect(() => {
        if (success) { const t = setTimeout(() => setSuccess(''), 5000); return () => clearTimeout(t); }
    }, [success]);
    useEffect(() => {
        if (error) { const t = setTimeout(() => setError(''), 8000); return () => clearTimeout(t); }
    }, [error]);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await api.get('/auth/users');
            setUsersList(response.data.data);
        } catch (err: any) {
            console.error('Error fetching users:', err);
            setError('Failed to fetch users list');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return; // prevent double-submit
        setError('');
        setSuccess('');
        setIsSubmitting(true);

        try {
            await api.post('/auth/register', {
                email,
                password,
                firstName,
                lastName,
                phone,
                roleName
            });

            setSuccess('Staff user registered successfully!');
            setIsCreateOpen(false);
            
            // Clear fields
            setEmail('');
            setPassword('');
            setFirstName('');
            setLastName('');
            setPhone('');
            setRoleName('CASHIER');
            
            fetchUsers();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to register new staff user');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleActive = async (user: User) => {
        setError('');
        setSuccess('');
        try {
            const targetStatus = !user.isActive;
            await api.put(`/auth/users/${user.id}/status`, { isActive: targetStatus });
            
            setSuccess(`User accounts successfully ${targetStatus ? 'activated' : 'deactivated'}`);
            fetchUsers();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update user status');
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!window.confirm('Are you absolutely sure you want to remove this staff account? All employee history will be preserved but login access is revoked.')) {
            return;
        }

        setError('');
        setSuccess('');
        try {
            await api.delete(`/auth/users/${userId}`);
            setSuccess('Staff account removed successfully');
            fetchUsers();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to delete user');
        }
    };

    const getRoleBadgeStyle = (role: string) => {
        switch (role) {
            case 'OWNER':
                return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
            case 'PHARMACIST':
                return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
            case 'CASHIER':
                return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
            default:
                return 'bg-gray-500/10 text-gray-400 border border-gray-500/20';
        }
    };

    const filteredUsers = usersList.filter(user => {
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
        const emailLower = user.email.toLowerCase();
        const searchLower = searchTerm.toLowerCase();
        return fullName.includes(searchLower) || emailLower.includes(searchLower) || user.role.toLowerCase().includes(searchLower);
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-wide">Staff & User Directory</h1>
                    <p className="text-gray-400 text-sm mt-1">Manage pharmacy cashier terminals, pharmacist approvals, and admin credentials.</p>
                </div>
                <button
                    onClick={() => setIsCreateOpen(true)}
                    className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-lg font-semibold tracking-wide transition-all shadow-lg shadow-indigo-600/20"
                >
                    <UserPlus className="w-5 h-5" />
                    <span>Add Staff Member</span>
                </button>
            </div>

            {/* Notifications */}
            {success && <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-sm">{success}</div>}
            {error && <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-sm">{error}</div>}

            {/* Search Bar */}
            <div className="relative max-w-md">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search staff by name, email, or role..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-800 bg-gray-900 text-white focus:border-indigo-500 focus:outline-none text-sm transition-all"
                />
            </div>

            {/* Grid of cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full text-center py-12 text-gray-400">Loading directory...</div>
                ) : filteredUsers.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-400">No staff members found matching search query.</div>
                ) : (
                    filteredUsers.map(user => {
                        const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || 'U'}`.toUpperCase();
                        return (
                            <div key={user.id} className={`bg-gray-900 border ${user.isActive ? 'border-gray-800' : 'border-rose-950/40 bg-gray-900/40'} rounded-xl p-6 relative flex flex-col justify-between space-y-4 hover:shadow-lg transition-shadow`}>
                                {/* Upper Profile */}
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center space-x-3.5">
                                        <div className={`w-12 h-12 rounded-full ${user.isActive ? 'bg-indigo-600/10 text-indigo-400' : 'bg-rose-500/10 text-rose-400'} flex items-center justify-center font-bold text-lg border border-gray-800`}>
                                            {initials}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-white text-base">
                                                {user.firstName ? `${user.firstName} ${user.lastName || ''}` : 'System User'}
                                            </h3>
                                            <span className={`inline-flex px-2 py-0.5 mt-1 rounded text-[10px] font-semibold tracking-wider ${getRoleBadgeStyle(user.role)}`}>
                                                {user.role}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleToggleActive(user)}
                                        className={`transition-colors p-1 rounded ${user.isActive ? 'text-indigo-400 hover:text-indigo-300' : 'text-gray-500 hover:text-gray-400'}`}
                                        title={user.isActive ? 'Suspend User Access' : 'Restore User Access'}
                                    >
                                        {user.isActive ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                                    </button>
                                </div>

                                {/* Contact Details */}
                                <div className="space-y-2 text-xs text-gray-400 border-t border-gray-800/60 pt-3">
                                    <div className="flex items-center space-x-2">
                                        <Mail className="w-4 h-4 text-gray-500" />
                                        <span>{user.email}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Phone className="w-4 h-4 text-gray-500" />
                                        <span>{user.phone || 'No phone recorded'}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Calendar className="w-4 h-4 text-gray-500" />
                                        <span>Joined: {new Date(user.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                {/* Danger action bar */}
                                <div className="flex justify-between items-center border-t border-gray-800/60 pt-3 text-xs">
                                    <div className="flex items-center space-x-1.5">
                                        <span className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                        <span className={user.isActive ? 'text-emerald-400' : 'text-rose-400'}>{user.isActive ? 'Active Access' : 'Deactivated'}</span>
                                    </div>
                                    {user.role !== 'OWNER' && (
                                        <button
                                            onClick={() => handleDeleteUser(user.id)}
                                            className="flex items-center text-rose-400 hover:text-rose-300 transition-colors py-1 px-2 hover:bg-rose-500/10 rounded"
                                        >
                                            <UserMinus className="w-4 h-4 mr-1" />
                                            <span>Remove</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Create User Modal */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-800 bg-gray-900/80">
                            <h2 className="text-lg font-bold text-white tracking-wide flex items-center">
                                <UserCheck className="w-5 h-5 mr-2 text-indigo-500" />
                                Add New Staff Credentials
                            </h2>
                            <button onClick={() => setIsCreateOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">First Name</label>
                                    <input
                                        type="text"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        required
                                        placeholder="Jane"
                                        className="w-full p-2.5 rounded-lg border border-gray-800 bg-gray-950 text-white focus:border-indigo-500 focus:outline-none text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Last Name</label>
                                    <input
                                        type="text"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        required
                                        placeholder="Doe"
                                        className="w-full p-2.5 rounded-lg border border-gray-800 bg-gray-950 text-white focus:border-indigo-500 focus:outline-none text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Contact Phone</label>
                                <input
                                    type="text"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    required
                                    placeholder="+1 (555) 019-2834"
                                    className="w-full p-2.5 rounded-lg border border-gray-800 bg-gray-950 text-white focus:border-indigo-500 focus:outline-none text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Email Address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder="jane.doe@pharmacy.com"
                                    className="w-full p-2.5 rounded-lg border border-gray-800 bg-gray-950 text-white focus:border-indigo-500 focus:outline-none text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Initial Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                    className="w-full p-2.5 rounded-lg border border-gray-800 bg-gray-950 text-white focus:border-indigo-500 focus:outline-none text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Security Role</label>
                                <select
                                    value={roleName}
                                    onChange={(e) => setRoleName(e.target.value)}
                                    required
                                    className="w-full p-2.5 rounded-lg border border-gray-800 bg-gray-950 text-white focus:border-indigo-500 focus:outline-none text-sm"
                                >
                                    <option value="PHARMACIST">PHARMACIST — Medicines, Inventory, Prescriptions &amp; POS</option>
                                    <option value="CASHIER">CASHIER — POS sales &amp; payment processing only</option>
                                </select>
                            </div>

                            <div className="flex space-x-3 pt-4 border-t border-gray-800">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateOpen(false)}
                                    className="flex-1 py-2.5 border border-gray-800 bg-gray-950 text-gray-300 hover:text-white rounded-lg text-sm font-semibold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold tracking-wide transition-all shadow-lg shadow-indigo-600/15"
                                >
                                    {isSubmitting ? 'Registering...' : 'Register User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
