import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { offlineDB, LocalPatient, LocalAppointment, getDeviceId } from '../../lib/offline/db';
import { syncManager } from '../../lib/offline/syncManager';
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
    ShieldCheck,
    Calendar,
    Clock,
    AlertTriangle,
    CheckCircle2,
    RefreshCw
} from 'lucide-react';

interface Prescription {
    id: string;
    doctorName?: string;
    prescriptionNumber?: string;
    notes?: string;
    imageUrl?: string;
    createdAt: string;
}

interface CustomerView extends LocalPatient {
    purchaseHistory?: any[];
    prescriptions?: Prescription[];
    appointments?: LocalAppointment[];
}

export const CustomersPage: React.FC = () => {
    const [customers, setCustomers] = useState<CustomerView[]>([]);
    const [search, setSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerView | null>(null);

    // Modals state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
    const [showAppointmentModal, setShowAppointmentModal] = useState(false);

    // New Customer Form
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newAddress, setNewAddress] = useState('');
    const [formMessage, setFormMessage] = useState<{ type: 'success' | 'warning' | 'error'; text: string } | null>(null);

    // New Prescription Form
    const [doctorName, setDoctorName] = useState('');
    const [prescriptionNumber, setPrescriptionNumber] = useState('');
    const [prescriptionNotes, setPrescriptionNotes] = useState('');
    const [prescriptionImage, setPrescriptionImage] = useState('');

    // New Appointment Form
    const [apptDoctor, setApptDoctor] = useState('Dr. Almaz Tadesse');
    const [apptDate, setApptDate] = useState(() => {
        const d = new Date(Date.now() + 86400000);
        d.setMinutes(0);
        d.setSeconds(0);
        return d.toISOString().slice(0, 16);
    });
    const [apptReason, setApptReason] = useState('General Consultation & Prescription Review');
    const [apptNotes, setApptNotes] = useState('');
    const [customerAppointments, setCustomerAppointments] = useState<LocalAppointment[]>([]);

    // Active Tab in Detail View: 'prescriptions' | 'appointments' | 'history'
    const [activeTab, setActiveTab] = useState<'prescriptions' | 'appointments' | 'history'>('prescriptions');

    const loadLocalPatients = async (): Promise<CustomerView[]> => {
        if (!offlineDB) return [];
        try {
            const localPatients = await offlineDB.patients.getAll();
            return localPatients as CustomerView[];
        } catch (e) {
            console.error('Failed to load local patients:', e);
            return [];
        }
    };

    const fetchCustomers = async (searchQuery = '') => {
        // 1. Immediately load local IndexedDB patients so UI is responsive offline
        const localList = await loadLocalPatients();

        try {
            // 2. Fetch fresh list from server if reachable
            const res = await api.get('/customers', {
                params: { search: searchQuery }
            });

            const serverCustomers: LocalPatient[] = (res.data.data || []).map((c: any) => ({
                id: c.id,
                name: c.name,
                phone: c.phone,
                email: c.email,
                address: c.address,
                outstandingBalance: c.outstandingBalance || '0',
                loyaltyPoints: c.loyaltyPoints || 0,
                syncStatus: 'synced',
                createdAt: c.createdAt,
                updatedAt: c.updatedAt
            }));

            // Save server customers to local IndexedDB cache
            if (offlineDB) {
                for (const sc of serverCustomers) {
                    await offlineDB.patients.put(sc);
                }
            }

            // Keep any local records that are still 'pending' or 'conflict'
            const pendingOrConflict = localList.filter(
                (lp) => lp.syncStatus === 'pending' || lp.syncStatus === 'conflict'
            );

            // Merge server list with pending items (avoiding duplicates)
            const serverIds = new Set(serverCustomers.map((s) => s.id));
            const merged = [
                ...pendingOrConflict.filter((p) => !serverIds.has(p.id)),
                ...serverCustomers
            ];

            // Apply client-side search filtering if search is active
            const filtered = searchQuery
                ? merged.filter((c) =>
                      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      c.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
                  )
                : merged;

            setCustomers(filtered);
        } catch (error) {
            // Offline or server unreachable: show local records
            console.warn('Network request failed, presenting IndexedDB local patient records:', error);
            const filtered = searchQuery
                ? localList.filter((c) =>
                      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      c.phone.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                : localList;
            setCustomers(filtered);
        }
    };

    useEffect(() => {
        fetchCustomers();

        // Listen for sync updates to refresh list when items are confirmed
        if (syncManager) {
            const unsubscribe = syncManager.subscribe(() => {
                fetchCustomers(search);
            });
            return () => unsubscribe();
        }
    }, []);

    useEffect(() => {
        const delay = setTimeout(() => {
            fetchCustomers(search);
        }, 300);
        return () => clearTimeout(delay);
    }, [search]);

    // Fetch full details of selected customer
    const fetchCustomerDetails = async (id: string) => {
        // 1. Check local IndexedDB first
        let currentCust = customers.find((c) => c.id === id) || null;
        if (!currentCust && offlineDB) {
            currentCust = (await offlineDB.patients.get(id)) as CustomerView || null;
        }
        setSelectedCustomer(currentCust);

        // Fetch local appointments for this customer
        if (offlineDB) {
            const allLocalAppts: LocalAppointment[] = await offlineDB.appointments.getAll();
            const custAppts = allLocalAppts.filter((a: LocalAppointment) => a.customerId === id);
            setCustomerAppointments(custAppts);
        }

        // 2. Fetch from server if connected
        try {
            const res = await api.get(`/customers/${id}`);
            const serverData = res.data.data;

            // Also fetch appointments for this customer
            let appts: LocalAppointment[] = [];
            try {
                const apptRes = await api.get('/appointments', { params: { search: serverData.name } });
                appts = apptRes.data.data || [];
            } catch {
                // If offline, keep local appointments
            }

            setSelectedCustomer((prev) => ({
                ...(prev || {}),
                ...serverData,
                syncStatus: prev?.syncStatus || 'synced'
            }));

            // Merge local unsynced appointments
            if (offlineDB) {
                const allLocalAppts: LocalAppointment[] = await offlineDB.appointments.getAll();
                const pendingCustAppts = allLocalAppts.filter(
                    (a: LocalAppointment) => a.customerId === id && (a.syncStatus === 'pending' || a.syncStatus === 'conflict')
                );
                const apptIds = new Set(appts.map((a: LocalAppointment) => a.id));
                setCustomerAppointments([...pendingCustAppts.filter((a: LocalAppointment) => !apptIds.has(a.id)), ...appts]);
            } else {
                setCustomerAppointments(appts);
            }
        } catch (error) {
            console.warn('Could not fetch online customer details, using local cache:', error);
        }
    };

    const handleCreateCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormMessage(null);

        if (!newName.trim() || !newPhone.trim()) {
            setFormMessage({ type: 'error', text: 'Patient full name and phone number are required.' });
            return;
        }

        const patientId = crypto.randomUUID();
        const nowIso = new Date().toISOString();

        // 1. Create local record
        const newPatient: LocalPatient = {
            id: patientId,
            name: newName.trim(),
            phone: newPhone.trim(),
            email: newEmail.trim() || null,
            address: newAddress.trim() || null,
            outstandingBalance: '0',
            loyaltyPoints: 0,
            syncStatus: 'pending',
            createdAt: nowIso,
            updatedAt: nowIso,
            localCreatedAt: nowIso,
            deviceId: getDeviceId(),
        };

        // 2. Save into IndexedDB immediately
        if (offlineDB) {
            await offlineDB.patients.put(newPatient);
        }

        // Optimistically add to UI list
        setCustomers((prev) => [newPatient as CustomerView, ...prev]);

        // 3. Try to synchronize immediately with server
        let isOnline = false;
        try {
            if (syncManager) {
                isOnline = await syncManager.checkTrueConnectivity();
            } else {
                isOnline = navigator.onLine;
            }
        } catch {
            isOnline = false;
        }

        if (isOnline) {
            try {
                const res = await api.post('/customers', {
                    id: newPatient.id,
                    name: newPatient.name,
                    phone: newPatient.phone,
                    email: newPatient.email || undefined,
                    address: newPatient.address || undefined
                });

                // Server confirmed!
                newPatient.syncStatus = 'synced';
                if (offlineDB) {
                    await offlineDB.patients.put(newPatient);
                }
                setShowCreateModal(false);
                resetCreateForm();
                fetchCustomers(search);
                return;
            } catch (err: any) {
                // If conflict (409)
                if (err.response?.status === 409) {
                    newPatient.syncStatus = 'conflict';
                    newPatient.syncError = err.response?.data?.message || 'Conflict: Phone number already exists.';
                    if (offlineDB) await offlineDB.patients.put(newPatient);
                    setFormMessage({ type: 'error', text: newPatient.syncError || 'Conflict detected on server.' });
                    return;
                }
                // Other network or server failure: queue it
            }
        }

        // Offline / Network Fallback: Queue for persistent background sync
        if (syncManager) {
            await syncManager.queueOperation('patient', newPatient.id, 'CREATE', {
                name: newPatient.name,
                phone: newPatient.phone,
                email: newPatient.email,
                address: newPatient.address
            });
        }

        setShowCreateModal(false);
        resetCreateForm();
        fetchCustomers(search);
    };

    const resetCreateForm = () => {
        setNewName('');
        setNewPhone('');
        setNewEmail('');
        setNewAddress('');
        setFormMessage(null);
    };

    const handleCreateAppointment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCustomer) return;

        const apptId = crypto.randomUUID();
        const nowIso = new Date().toISOString();

        const newAppt: LocalAppointment = {
            id: apptId,
            customerId: selectedCustomer.id,
            patientName: selectedCustomer.name,
            patientPhone: selectedCustomer.phone,
            doctorName: apptDoctor,
            appointmentDate: new Date(apptDate).toISOString(),
            reason: apptReason,
            notes: apptNotes || undefined,
            status: 'SCHEDULED',
            syncStatus: 'pending',
            createdAt: nowIso,
            localCreatedAt: nowIso,
            deviceId: getDeviceId(),
            idempotencyKey: crypto.randomUUID()
        };

        // 1. Save to IndexedDB
        if (offlineDB) {
            await offlineDB.appointments.put(newAppt);
        }

        setCustomerAppointments((prev) => [newAppt, ...prev]);

        // 2. Try online sync
        let isOnline = false;
        try {
            isOnline = syncManager ? await syncManager.checkTrueConnectivity() : navigator.onLine;
        } catch {
            isOnline = false;
        }

        if (isOnline) {
            try {
                await api.post('/appointments', {
                    id: newAppt.id,
                    customerId: newAppt.customerId,
                    patientName: newAppt.patientName,
                    patientPhone: newAppt.patientPhone,
                    doctorName: newAppt.doctorName,
                    appointmentDate: newAppt.appointmentDate,
                    reason: newAppt.reason,
                    notes: newAppt.notes,
                    idempotencyKey: newAppt.idempotencyKey,
                    deviceId: newAppt.deviceId
                });

                newAppt.syncStatus = 'synced';
                if (offlineDB) await offlineDB.appointments.put(newAppt);
                setShowAppointmentModal(false);
                fetchCustomerDetails(selectedCustomer.id);
                return;
            } catch (err: any) {
                if (err.response?.status === 409) {
                    newAppt.syncStatus = 'conflict';
                    newAppt.syncError = err.response?.data?.message || 'Doctor scheduling conflict';
                    if (offlineDB) await offlineDB.appointments.put(newAppt);
                    alert(newAppt.syncError);
                    return;
                }
            }
        }

        // Offline: queue in sync manager
        if (syncManager) {
            await syncManager.queueOperation('appointment', newAppt.id, 'CREATE', {
                customerId: newAppt.customerId,
                patientName: newAppt.patientName,
                patientPhone: newAppt.patientPhone,
                doctorName: newAppt.doctorName,
                appointmentDate: newAppt.appointmentDate,
                reason: newAppt.reason,
                notes: newAppt.notes
            });
        }

        setShowAppointmentModal(false);
        setApptNotes('');
        fetchCustomerDetails(selectedCustomer.id);
    };

    const handleAddPrescription = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCustomer) return;

        // Security rule: prescriptions are strictly verified online
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
            alert(error.response?.data?.message || 'Failed to link prescription (Online verification required)');
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto h-[calc(100vh-2rem)] flex flex-col">

            {/* Top Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        Patient & Customer Management
                        <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 font-medium">
                            Offline Capable
                        </span>
                    </h1>
                    <p className="text-sm text-gray-500">
                        Register patients and schedule clinical appointments locally with automatic background synchronization.
                    </p>
                </div>
                <button
                    onClick={() => { resetCreateForm(); setShowCreateModal(true); }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-indigo-700 transition"
                >
                    <UserPlus className="w-4 h-4" /> Register Patient
                </button>
            </div>

            {/* Main Split Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">

                {/* Left Column: Patient Search & List */}
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
                            <div className="p-8 text-center text-gray-400 text-sm">No patients found.</div>
                        ) : (
                            customers.map(c => (
                                <div
                                    key={c.id}
                                    onClick={() => fetchCustomerDetails(c.id)}
                                    className={`p-4 hover:bg-gray-50 transition cursor-pointer flex items-center justify-between ${
                                        selectedCustomer?.id === c.id ? 'bg-indigo-50/60 border-l-4 border-indigo-600' : ''
                                    }`}
                                >
                                    <div className="min-w-0 pr-2">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-gray-900 text-sm truncate">{c.name}</h3>
                                            {/* Sync Status Badge */}
                                            {c.syncStatus === 'pending' && (
                                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                                    <Clock className="w-2.5 h-2.5" /> Pending Sync
                                                </span>
                                            )}
                                            {c.syncStatus === 'conflict' && (
                                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                                    <AlertTriangle className="w-2.5 h-2.5" /> Conflict
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                            <Phone className="w-3 h-3" /> {c.phone}
                                        </p>
                                    </div>
                                    <div className="text-right flex items-center gap-2">
                                        <div>
                                            <p className="text-xs font-bold text-indigo-600">ETB {Number(c.outstandingBalance || 0).toFixed(2)}</p>
                                            <span className="text-[10px] text-gray-400">Balance</span>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-400" />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right 2 Columns: Detailed Patient View */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col h-full overflow-hidden">
                    {selectedCustomer ? (
                        <div className="flex flex-col h-full overflow-y-auto p-6 space-y-6">

                            {/* Profile Header Card */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-gray-100 gap-4">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-xl font-bold text-gray-900">{selectedCustomer.name}</h2>
                                        {selectedCustomer.syncStatus === 'pending' && (
                                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5" /> Pending Server Sync
                                            </span>
                                        )}
                                        {selectedCustomer.syncStatus === 'conflict' && (
                                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                                                <AlertTriangle className="w-3.5 h-3.5" /> Conflict Detected
                                            </span>
                                        )}
                                        {selectedCustomer.syncStatus === 'synced' && (
                                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                                <CheckCircle2 className="w-3.5 h-3.5" /> Synced to Server
                                            </span>
                                        )}
                                    </div>

                                    {selectedCustomer.syncError && (
                                        <p className="text-xs text-rose-600 font-medium mt-1">
                                            Conflict Note: {selectedCustomer.syncError}
                                        </p>
                                    )}

                                    <div className="flex flex-wrap gap-4 text-xs text-gray-500 mt-2">
                                        <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-indigo-500" /> {selectedCustomer.phone}</span>
                                        {selectedCustomer.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-indigo-500" /> {selectedCustomer.email}</span>}
                                        {selectedCustomer.address && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-indigo-500" /> {selectedCustomer.address}</span>}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 bg-indigo-50 px-4 py-3 rounded-xl border border-indigo-100">
                                    <DollarSign className="w-6 h-6 text-indigo-600" />
                                    <div>
                                        <span className="text-[10px] uppercase font-bold text-indigo-500 block">Credit Balance</span>
                                        <span className="text-base font-extrabold text-indigo-900">ETB {Number(selectedCustomer.outstandingBalance || 0).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Navigation Tabs */}
                            <div className="flex border-b border-gray-200">
                                <button
                                    onClick={() => setActiveTab('prescriptions')}
                                    className={`px-4 py-2 text-xs font-bold border-b-2 transition ${
                                        activeTab === 'prescriptions'
                                            ? 'border-indigo-600 text-indigo-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    Linked Prescriptions
                                </button>
                                <button
                                    onClick={() => setActiveTab('appointments')}
                                    className={`px-4 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                                        activeTab === 'appointments'
                                            ? 'border-indigo-600 text-indigo-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    <Calendar className="w-3.5 h-3.5" />
                                    Appointments
                                    {customerAppointments.length > 0 && (
                                        <span className="ml-1 px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded-full text-[10px]">
                                            {customerAppointments.length}
                                        </span>
                                    )}
                                </button>
                                <button
                                    onClick={() => setActiveTab('history')}
                                    className={`px-4 py-2 text-xs font-bold border-b-2 transition ${
                                        activeTab === 'history'
                                            ? 'border-indigo-600 text-indigo-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    Purchase History
                                </button>
                            </div>

                            {/* Tab 1: Prescriptions */}
                            {activeTab === 'prescriptions' && (
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-indigo-600" /> Prescriptions on File
                                        </h3>
                                        <button
                                            onClick={() => setShowPrescriptionModal(true)}
                                            className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-600 hover:text-white transition"
                                        >
                                            + Add Prescription
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {(!selectedCustomer.prescriptions || selectedCustomer.prescriptions.length === 0) ? (
                                            <p className="text-xs text-gray-400 italic">No prescriptions recorded for this patient.</p>
                                        ) : (
                                            selectedCustomer.prescriptions.map(p => (
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
                            )}

                            {/* Tab 2: Appointments */}
                            {activeTab === 'appointments' && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-indigo-600" /> Scheduled Appointments
                                            </h3>
                                            <p className="text-xs text-gray-500">Appointments can be scheduled offline and will synchronize when online.</p>
                                        </div>
                                        <button
                                            onClick={() => setShowAppointmentModal(true)}
                                            className="text-xs bg-indigo-600 text-white px-3.5 py-2 rounded-xl font-bold hover:bg-indigo-700 transition flex items-center gap-1.5 shadow"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Schedule Appointment
                                        </button>
                                    </div>

                                    <div className="space-y-2.5">
                                        {customerAppointments.length === 0 ? (
                                            <div className="p-8 text-center text-gray-400 text-xs bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                                No appointments scheduled for this patient. Click "Schedule Appointment" to book a visit.
                                            </div>
                                        ) : (
                                            customerAppointments.map((appt) => (
                                                <div key={appt.id} className="p-4 bg-white border border-gray-200 rounded-xl flex items-center justify-between text-xs shadow-sm">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-gray-900 text-sm">{appt.doctorName || 'Attending Physician'}</span>
                                                            {appt.syncStatus === 'pending' && (
                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                                                                    <Clock className="w-2.5 h-2.5" /> Pending Sync
                                                                </span>
                                                            )}
                                                            {appt.syncStatus === 'conflict' && (
                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                                                                    <AlertTriangle className="w-2.5 h-2.5" /> Schedule Conflict
                                                                </span>
                                                            )}
                                                            {appt.syncStatus === 'synced' && (
                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                                                    <CheckCircle2 className="w-2.5 h-2.5" /> Confirmed
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-gray-600">{appt.reason || 'Routine Checkup'}</p>
                                                        {appt.notes && <p className="text-gray-400 italic">Notes: {appt.notes}</p>}
                                                        {appt.syncError && <p className="text-rose-600 text-[11px] font-medium">{appt.syncError}</p>}
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="font-bold text-indigo-700 block text-xs">
                                                            {new Date(appt.appointmentDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </span>
                                                        <span className="text-gray-500 text-[11px]">
                                                            {new Date(appt.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Tab 3: Purchase History */}
                            {activeTab === 'history' && (
                                <div className="space-y-3">
                                    <h3 className="font-bold text-gray-900 text-sm">Retail Pharmacy Purchases</h3>
                                    <div className="space-y-2">
                                        {(!selectedCustomer.purchaseHistory || selectedCustomer.purchaseHistory.length === 0) ? (
                                            <p className="text-xs text-gray-400 italic">No previous retail purchases recorded.</p>
                                        ) : (
                                            selectedCustomer.purchaseHistory.map(sale => (
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
                            )}

                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2 p-8">
                            <Users className="w-12 h-12 stroke-1 text-gray-300" />
                            <p className="text-sm">Select a patient from the list to view profile, prescriptions, and schedule appointments.</p>
                        </div>
                    )}
                </div>

            </div>

            {/* Register Patient Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <form onSubmit={handleCreateCustomer} className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
                        <div className="flex justify-between items-center border-b pb-3">
                            <div>
                                <h3 className="font-bold text-gray-900">Register New Patient</h3>
                                <p className="text-xs text-gray-500">Works seamlessly online or offline.</p>
                            </div>
                            <button type="button" onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {formMessage && (
                            <div className={`p-3 rounded-xl text-xs font-medium border ${
                                formMessage.type === 'error'
                                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                                    : formMessage.type === 'warning'
                                    ? 'bg-amber-50 border-amber-200 text-amber-700'
                                    : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            }`}>
                                {formMessage.text}
                            </div>
                        )}

                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">Patient Full Name *</label>
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
                                Save Patient
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Schedule Appointment Modal */}
            {showAppointmentModal && selectedCustomer && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <form onSubmit={handleCreateAppointment} className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
                        <div className="flex justify-between items-center border-b pb-3">
                            <div>
                                <h3 className="font-bold text-gray-900">Schedule Clinical Appointment</h3>
                                <p className="text-xs text-gray-500">For patient: <span className="font-semibold text-indigo-600">{selectedCustomer.name}</span></p>
                            </div>
                            <button type="button" onClick={() => setShowAppointmentModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">Attending Doctor / Specialist</label>
                                <select
                                    value={apptDoctor}
                                    onChange={e => setApptDoctor(e.target.value)}
                                    className="w-full border rounded-xl px-3 py-2 bg-gray-50 text-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                >
                                    <option value="Dr. Almaz Tadesse">Dr. Almaz Tadesse (Internal Medicine)</option>
                                    <option value="Dr. Dawit Haile">Dr. Dawit Haile (Cardiology)</option>
                                    <option value="Dr. Helen Mengistu">Dr. Helen Mengistu (Pediatrics)</option>
                                    <option value="Dr. Elias Worku">Dr. Elias Worku (General Practice)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">Appointment Date & Time *</label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={apptDate}
                                    onChange={e => setApptDate(e.target.value)}
                                    className="w-full border rounded-xl px-3 py-2 bg-gray-50 text-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">Reason for Visit</label>
                                <input
                                    type="text"
                                    value={apptReason}
                                    onChange={e => setApptReason(e.target.value)}
                                    className="w-full border rounded-xl px-3 py-2 bg-gray-50 text-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    placeholder="e.g. Hypertension follow-up, Prescription renewal"
                                />
                            </div>
                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">Clinical Notes</label>
                                <textarea
                                    value={apptNotes}
                                    onChange={e => setApptNotes(e.target.value)}
                                    rows={2}
                                    className="w-full border rounded-xl px-3 py-2 bg-gray-50 text-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    placeholder="Any patient symptoms, allergy notes, or prior tests..."
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowAppointmentModal(false)}
                                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-200 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-indigo-700 transition"
                            >
                                Book Appointment
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
                            <h3 className="font-bold text-gray-900">Link Prescription (Online Only)</h3>
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
                                    className="w-full border rounded-xl px-3 py-2 bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900"
                                    placeholder="Dr. Almaz Tadesse"
                                />
                            </div>
                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">Prescription Number</label>
                                <input
                                    type="text"
                                    value={prescriptionNumber}
                                    onChange={e => setPrescriptionNumber(e.target.value)}
                                    className="w-full border rounded-xl px-3 py-2 bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900"
                                    placeholder="RX-998234"
                                />
                            </div>
                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">Dosage / Notes</label>
                                <textarea
                                    value={prescriptionNotes}
                                    onChange={e => setPrescriptionNotes(e.target.value)}
                                    rows={2}
                                    className="w-full border rounded-xl px-3 py-2 bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900"
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