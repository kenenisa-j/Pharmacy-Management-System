import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import {
    Building2,
    Plus,
    Search,
    Phone,
    Mail,
    MapPin,
    FileText,
    DollarSign,
    X
} from 'lucide-react';

interface Supplier {
    id: string;
    name: string;
    contactPerson: string;
    email: string;
    phone: string;
    address: string;
    paymentTerms: string;
    medicinesCount?: number;
}

export const SuppliersPage: React.FC = () => {
    const { user } = useAuthStore();
    const isOwner = user?.role === 'OWNER';
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [financials, setFinancials] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form state for new supplier
    const [formData, setFormData] = useState({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        paymentTerms: 'NET_30'
    });

    const fetchSuppliers = async () => {
        try {
            setLoading(true);
            const response = await api.get('/suppliers', {
                params: { search }
            });
            setSuppliers(response.data.data);
        } catch (error) {
            console.error('Failed to fetch suppliers:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSuppliers();
    }, [search]);

    const handleSelectSupplier = async (supplier: Supplier) => {
        setSelectedSupplier(supplier);
        if (isOwner) {
            try {
                const res = await api.get(`/suppliers/${supplier.id}/financials`);
                setFinancials(res.data.data);
            } catch (error) {
                console.error('Failed to fetch supplier financials:', error);
            }
        } else {
            setFinancials(null);
        }
    };

    const handleCreateSupplier = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/suppliers', formData);
            setIsModalOpen(false);
            setFormData({ name: '', contactPerson: '', email: '', phone: '', address: '', paymentTerms: 'NET_30' });
            fetchSuppliers();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to create supplier');
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Supplier & Vendor Management</h1>
                    <p className="text-sm text-gray-500">Track vendor contacts, payment agreements, and fulfillment history.</p>
                </div>
                {isOwner && (
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 shadow-sm transition"
                >
                    <Plus className="w-4 h-4 mr-2" /> Add New Supplier
                </button>
                )}
            </div>

            {/* Search Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search suppliers by name, contact person, or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                </div>
            </div>

            {/* Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Suppliers Cards List */}
                <div className="lg:col-span-2 space-y-4">
                    {loading ? (
                        <div className="bg-white p-12 text-center rounded-xl border border-gray-200 text-gray-500">Loading suppliers...</div>
                    ) : suppliers.length === 0 ? (
                        <div className="bg-white p-12 text-center rounded-xl border border-gray-200 text-gray-500">No suppliers found.</div>
                    ) : (
                        suppliers.map((sup) => (
                            <div
                                key={sup.id}
                                onClick={() => handleSelectSupplier(sup)}
                                className={`bg-white p-5 rounded-xl border transition cursor-pointer shadow-sm hover:shadow-md ${selectedSupplier?.id === sup.id ? 'border-indigo-600 ring-1 ring-indigo-600' : 'border-gray-200'}`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                                            <Building2 className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">{sup.name}</h3>
                                            <p className="text-xs text-gray-500">Contact: {sup.contactPerson || 'Not specified'}</p>
                                        </div>
                                    </div>
                                    <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg">
                                        {sup.paymentTerms}
                                    </span>
                                </div>

                                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600">
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-3.5 h-3.5 text-gray-400" /> {sup.phone || 'N/A'}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Mail className="w-3.5 h-3.5 text-gray-400" /> {sup.email || 'N/A'}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Supplier Financial & Purchase History Panel */}
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4 h-fit">
                    <h2 className="font-bold text-gray-900 border-b pb-3">
                        {isOwner ? 'Vendor Financial Overview' : 'Vendor Details'}
                    </h2>
                    {selectedSupplier ? (
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-medium">Selected Vendor</p>
                                <p className="text-lg font-bold text-indigo-600">{selectedSupplier.name}</p>
                                <p className="text-xs text-gray-600 mt-1"><MapPin className="w-3 h-3 inline mr-1" /> {selectedSupplier.address || 'No address provided'}</p>
                            </div>

                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">Payment Terms:</span>
                                    <span className="font-semibold text-gray-900">{selectedSupplier.paymentTerms}</span>
                                </div>
                                {isOwner && (
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">Logged Shipments:</span>
                                    <span className="font-semibold text-gray-900">{financials?.purchaseHistory?.length || 0}</span>
                                </div>
                                )}
                            </div>

                            {isOwner && (
                            <div>
                                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Recent Purchase Deliveries</h3>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {financials?.purchaseHistory?.length === 0 ? (
                                        <p className="text-xs text-gray-400 italic">No purchase receipts recorded for this vendor.</p>
                                    ) : (
                                        financials?.purchaseHistory?.map((tx: any, idx: number) => (
                                            <div key={idx} className="p-2.5 bg-gray-50 rounded-lg text-xs space-y-1 border border-gray-100">
                                                <div className="flex justify-between font-medium text-gray-900">
                                                    <span>{tx.medicineName}</span>
                                                    <span className="text-emerald-600">+{tx.quantityReceived} units</span>
                                                </div>
                                                <div className="flex justify-between text-gray-400 text-[10px]">
                                                    <span>Ref: {tx.referenceNumber}</span>
                                                    <span>{new Date(tx.date).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                            )}

                            {!isOwner && (
                            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-600">
                                Contact the Owner to view purchase financial history and balances.
                            </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 text-center py-12">Select a supplier card from the left to view details.</p>
                    )}
                </div>
            </div>

            {/* Add Supplier Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
                        <div className="flex items-center justify-between border-b pb-3">
                            <h3 className="text-lg font-bold text-gray-900">Add New Supplier</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateSupplier} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Company Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Contact Person</label>
                                    <input
                                        type="text"
                                        value={formData.contactPerson}
                                        onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                                    <input
                                        type="text"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Payment Terms</label>
                                <select
                                    value={formData.paymentTerms}
                                    onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                >
                                    <option value="NET_15">Net 15 Days</option>
                                    <option value="NET_30">Net 30 Days</option>
                                    <option value="NET_60">Net 60 Days</option>
                                    <option value="COD">Cash on Delivery (COD)</option>
                                </select>
                            </div>
                            <div className="flex justify-end space-x-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                                >
                                    Save Supplier
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};