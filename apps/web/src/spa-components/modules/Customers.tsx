import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import {
    Users,
    Search,
    UserPlus,
    Phone,
    Mail,
    MapPin,
    FileText,
    DollarSign,
    Plus,
    X,
    ChevronRight,
    ShieldCheck
} from 'lucide-react';

interface Prescription {
    id: string;
    doctorName?: string;
    prescriptionNumber?: string;
    notes?: string;
    imageUrl?: string;
    createdAt: string;
}

interface Customer {
    id: string;
    name: string;
    phone: string;
    email?: string;
    address?: string;
    outstandingBalance: string;
    loyaltyPoints: number;
    createdAt: string;
    purchaseHistory?: any[];
    prescriptions?: Prescription[];
}

export const CustomersPage: React.FC = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [search, setSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

    // Modals state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);

    // New Customer Form
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newAddress, setNewAddress] = useState('');

    // New Prescription Form
    const [doctorName, setDoctorName] = useState('');
    const [prescriptionNumber, setPrescriptionNumber] = useState('');
    const [prescriptionNotes, setPrescriptionNotes] = useState('');
    const [prescriptionImage, setPrescriptionImage] = useState('');

    const fetchCustomers = async (searchQuery = '') => {
        try {
            const res = await api.get('/customers', {
                params: { search: searchQuery }
            });
            setCustomers(res.data.data);
        } catch (error) {
            console.error('Failed to fetch customers:', error);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    useEffect(() => {
        const delay = setTimeout(() => {
            fetchCustomers(search);
        }, 300);
        return () => clearTimeout(delay);
    }, [search]);

    // Fetch full details of selected customer (including history & prescriptions)
    const fetchCustomerDetails = async (id: string) => {
        try {
            const res = await api.get(`/customers/${id}`);
            setSelectedCustomer(res.data.data);
        } catch (error) {
            console.error('Failed to fetch customer profile:', error);
        }
    };

    const handleCreateCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName || !newPhone) return alert('Name and phone number are required.');

        try {
            await api.post('/customers', {
                name: newName,
                phone: newPhone,
                email: newEmail || undefined,
                address: newAddress || undefined
            });

            setShowCreateModal(false);
            setNewName('');
            setNewPhone('');
            setNewEmail('');
            setNewAddress('');
            fetchCustomers(search);
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to register customer');
        }
    };

    const handleAddPrescription = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCustomer) return;

        try {
            await api.post(`/customers/${selectedCustomer.id}/prescriptions`, {
                doctorName: doctorName || undefined,
                prescriptionNumber: prescriptionNumber || undefined,
                notes: prescriptionNotes || undefined,
                imageUrl: prescriptionImage || undefined
            });

            setShowPrescriptionModal(false);
            setDoctorName('');
            setPrescriptionNumber('');
            setPrescriptionNotes('');
            setPrescriptionImage('');
            fetchCustomerDetails(selectedCustomer.id);
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to link prescription');
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto h-[calc(100vh-2rem)] flex flex-col">

            {/* Top Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
                    <p className="text-sm text-gray-500">Track regular buyers, store credit balances, and verified prescriptions.</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-indigo-700 transition"
                >
                    <UserPlus className="w-4 h-4" /> Register Customer
                </button>
            </div>

            {/* Main Split Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">

                {/* Left Column: Customer Search & List */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col h-full overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50">
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name, phone, email..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                        {customers.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-sm">No customers found.</div>
                        ) : (
                            customers.map(c => (
                                <div
                                    key={c.id}
                                    onClick={() => fetchCustomerDetails(c.id)}
                                    className={`p-4 hover:bg-gray-50 transition cursor-pointer flex items-center justify-between ${selectedCustomer?.id === c.id ? 'bg-indigo-50/60 border-l-4 border-indigo-600' : ''}`}
                                >
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-gray-900 text-sm truncate">{c.name}</h3>
                                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                            <Phone className="w-3 h-3" /> {c.phone}
                                        </p>
                                    </div>
                                    <div className="text-right flex items-center gap-2">
                                        <div>
                                            <p className="text-xs font-bold text-indigo-600">ETB {Number(c.outstandingBalance).toFixed(2)}</p>
                                            <span className="text-[10px] text-gray-400">Balance</span>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-400" />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right 2 Columns: Detailed Customer View */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col h-full overflow-hidden">
                    {selectedCustomer ? (
                        <div className="flex flex-col h-full overflow-y-auto p-6 space-y-6">

                            {/* Profile Header Card */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-gray-100 gap-4">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">{selectedCustomer.name}</h2>
                                    <div className="flex flex-wrap gap-4 text-xs text-gray-500 mt-2">
                                        <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-indigo-500" /> {selectedCustomer.phone}</span>
                                        {selectedCustomer.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-indigo-500" /> {selectedCustomer.email}</span>}
                                        {selectedCustomer.address && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-indigo-500" /> {selectedCustomer.address}</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 bg-indigo-50 px-4 py-3 rounded-xl border border-indigo-100">
                                    <DollarSign className="w-6 h-6 text-indigo-600" />
                                    <div>
                                        <span className="text-[10px] uppercase font-bold text-indigo-500 block">Outstanding Credit</span>
                                        <span className="text-base font-extrabold text-indigo-900">ETB {Number(selectedCustomer.outstandingBalance).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Prescriptions Section */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-indigo-600" /> Linked Prescriptions
                                    </h3>
                                    <button
                                        onClick={() => setShowPrescriptionModal(true)}
                                        className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-600 hover:text-white transition"
                                    >
                                        + Add Prescription
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {selectedCustomer.prescriptions?.length === 0 ? (
                                        <p className="text-xs text-gray-400 italic">No prescriptions on file for this customer.</p>
                                    ) : (
                                        selectedCustomer.prescriptions?.map(p => (
                                            <div key={p.id} className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-1">
                                                <div className="flex justify-between font-bold text-gray-900">
                                                    <span>Dr. {p.doctorName || 'General'}</span>
                                                    <span className="text-emerald-600 flex items-center gap-0.5"><ShieldCheck className="w-3 h-3" /> Verified</span>
                                                </div>
                                                <p className="text-gray-500">Rx#: {p.prescriptionNumber || 'N/A'}</p>
                                                {p.notes && <p className="text-gray-600 italic">"{p.notes}"</p>}
                                                <span className="text-[10px] text-gray-400 block pt-1">{new Date(p.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Purchase History Section */}
                            <div className="space-y-3 pt-4 border-t border-gray-100 flex-1">
                                <h3 className="font-bold text-gray-900 text-sm">Purchase History</h3>
                                <div className="space-y-2">
                                    {selectedCustomer.purchaseHistory?.length === 0 ? (
                                        <p className="text-xs text-gray-400 italic">No previous retail purchases recorded.</p>
                                    ) : (
                                        selectedCustomer.purchaseHistory?.map(sale => (
                                            <div key={sale.id} className="p-3 bg-white border border-gray-200 rounded-xl flex items-center justify-between text-xs">
                                                <div>
                                                    <span className="font-bold text-gray-900">Receipt #{sale.receiptNumber}</span>
                                                    <p className="text-gray-500 mt-0.5">{new Date(sale.createdAt).toLocaleString()} • {sale.paymentMethod}</p>
                                                </div>
                                                <span className="font-extrabold text-indigo-600">ETB {Number(sale.totalAmount).toFixed(2)}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2 p-8">
                            <Users className="w-12 h-12 stroke-1 text-gray-300" />
                            <p className="text-sm">Select a customer from the left list to view complete profile and history.</p>
                        </div>
                    )}
                </div>

            </div>

            {/* Register Customer Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <form onSubmit={handleCreateCustomer} className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="font-bold text-gray-900">Register New Customer</h3>
                            <button type="button" onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">Customer Full Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    className="w-full border rounded-xl px-3 py-2 text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    placeholder="e.g. Samuel Bekele"
                                />
                            </div>
                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">Phone Number *</label>
                                <input
                                    type="text"
                                    required
                                    value={newPhone}
                                    onChange={e => setNewPhone(e.target.value)}
                                    className="w-full border rounded-xl px-3 py-2 text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    placeholder="e.g. +251911223344"
                                />
                            </div>
                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    value={newEmail}
                                    onChange={e => setNewEmail(e.target.value)}
                                    className="w-full border rounded-xl px-3 py-2 text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    placeholder="samuel@example.com"
                                />
                            </div>
                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">Physical Address</label>
                                <input
                                    type="text"
                                    value={newAddress}
                                    onChange={e => setNewAddress(e.target.value)}
                                    className="w-full border rounded-xl px-3 py-2 text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    placeholder="Bole Sub-City, Addis Ababa"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(false)}
                                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-200 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-indigo-700 transition"
                            >
                                Save Customer
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Add Prescription Modal */}
            {showPrescriptionModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <form onSubmit={handleAddPrescription} className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="font-bold text-gray-900">Link Prescription</h3>
                            <button type="button" onClick={() => setShowPrescriptionModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">Doctor's Name</label>
                                <input
                                    type="text"
                                    value={doctorName}
                                    onChange={e => setDoctorName(e.target.value)}
                                    className="w-full border rounded-xl px-3 py-2 bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    placeholder="Dr. Almaz Tadesse"
                                />
                            </div>
                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">Prescription Number</label>
                                <input
                                    type="text"
                                    value={prescriptionNumber}
                                    onChange={e => setPrescriptionNumber(e.target.value)}
                                    className="w-full border rounded-xl px-3 py-2 bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    placeholder="RX-998234"
                                />
                            </div>
                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">Dosage / Notes</label>
                                <textarea
                                    value={prescriptionNotes}
                                    onChange={e => setPrescriptionNotes(e.target.value)}
                                    rows={2}
                                    className="w-full border rounded-xl px-3 py-2 bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    placeholder="Amoxicillin 500mg 3x daily for 7 days"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowPrescriptionModal(false)}
                                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-200 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-indigo-700 transition"
                            >
                                Link Prescription
                            </button>
                        </div>
                    </form>
                </div>
            )}

        </div>
    );
};