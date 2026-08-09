import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import { 
    Plus, 
    Search, 
    Eye, 
    Check, 
    X, 
    FileText, 
    ChevronDown, 
    ShoppingCart,
    Clock, 
    CheckCircle, 
    AlertTriangle,
    Trash2
} from 'lucide-react';

interface PurchaseItem {
    id?: string;
    medicineId: string;
    medicineName?: string;
    quantity: number;
    unitCost: number;
    totalCost?: number;
}

interface PurchaseOrder {
    id: string;
    orderNumber: string;
    supplierName: string;
    supplierId: string;
    totalAmount: string;
    status: 'PENDING' | 'APPROVED' | 'CANCELLED' | 'RECEIVED';
    notes: string | null;
    createdAt: string;
    items?: PurchaseItem[];
}

interface Medicine {
    id: string;
    name: string;
    genericName: string;
    costPrice: string;
}

interface Supplier {
    id: string;
    name: string;
}

export const PurchaseOrdersPage: React.FC = () => {
    const { user } = useAuthStore();
    const isOwner = user?.role === 'OWNER';
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);

    // New Order Form state
    const [selectedSupplierId, setSelectedSupplierId] = useState('');
    const [notes, setNotes] = useState('');
    const [formItems, setFormItems] = useState<PurchaseItem[]>([]);
    const [currentMedId, setCurrentMedId] = useState('');
    const [currentQty, setCurrentQty] = useState<number>(1);
    const [currentCost, setCurrentCost] = useState<number>(0);

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchOrders();
        fetchSuppliers();
        fetchMedicines();
    }, []);

    const fetchOrders = async () => {
        try {
            const response = await api.get('/purchase-orders');
            setOrders(response.data.data);
        } catch (err: any) {
            console.error('Error fetching orders:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchSuppliers = async () => {
        try {
            const response = await api.get('/suppliers');
            setSuppliers(response.data.data);
        } catch (err) {
            console.error('Error fetching suppliers:', err);
        }
    };

    const fetchMedicines = async () => {
        try {
            const response = await api.get('/sales/search'); // fetch fast catalog list
            setMedicines(response.data.data);
        } catch (err) {
            console.error('Error fetching medicines:', err);
        }
    };

    const handleSelectMedicine = (medId: string) => {
        setCurrentMedId(medId);
        const med = medicines.find(m => m.id === medId);
        if (med) {
            setCurrentCost(Number(med.costPrice || 0));
        }
    };

    const addPlayItem = () => {
        if (!currentMedId || currentQty <= 0 || currentCost <= 0) return;
        const med = medicines.find(m => m.id === currentMedId);
        if (!med) return;

        // Check if item already exists
        const existsIndex = formItems.findIndex(i => i.medicineId === currentMedId);
        if (existsIndex > -1) {
            const updated = [...formItems];
            updated[existsIndex].quantity += currentQty;
            setFormItems(updated);
        } else {
            setFormItems([
                ...formItems,
                {
                    medicineId: currentMedId,
                    medicineName: med.name,
                    quantity: currentQty,
                    unitCost: currentCost
                }
            ]);
        }

        // Reset inputs
        setCurrentMedId('');
        setCurrentQty(1);
        setCurrentCost(0);
    };

    const removeItem = (index: number) => {
        setFormItems(formItems.filter((_, idx) => idx !== index));
    };

    const handleCreateOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!selectedSupplierId) {
            setError('Please select a supplier');
            return;
        }

        if (formItems.length === 0) {
            setError('Please add at least one item to the order');
            return;
        }

        try {
            await api.post('/purchase-orders', {
                supplierId: selectedSupplierId,
                notes: notes || null,
                items: formItems.map(item => ({
                    medicineId: item.medicineId,
                    quantity: item.quantity,
                    unitCost: item.unitCost
                }))
            });

            setSuccess('Purchase order created successfully!');
            setIsCreateOpen(false);
            // Reset form
            setSelectedSupplierId('');
            setNotes('');
            setFormItems([]);
            fetchOrders();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create purchase order');
        }
    };

    const handleViewOrder = async (order: PurchaseOrder) => {
        try {
            const response = await api.get(`/purchase-orders/${order.id}`);
            setSelectedOrder(response.data.data);
        } catch (err) {
            console.error('Error fetching order details:', err);
        }
    };

    const handleUpdateStatus = async (orderId: string, status: 'APPROVED' | 'CANCELLED') => {
        try {
            await api.patch(`/purchase-orders/${orderId}/status`, { status });
            setSuccess(`Order successfully ${status.toLowerCase()}`);
            fetchOrders();
            if (selectedOrder?.id === orderId) {
                handleViewOrder(selectedOrder);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update order status');
        }
    };

    const handleReceiveOrder = async (orderId: string) => {
        try {
            await api.post(`/purchase-orders/${orderId}/receive`);
            setSuccess('Inventory stock levels successfully updated!');
            fetchOrders();
            if (selectedOrder?.id === orderId) {
                handleViewOrder(selectedOrder);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to receive purchase order');
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'RECEIVED':
                return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
            case 'APPROVED':
                return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
            case 'CANCELLED':
                return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
            default:
                return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'RECEIVED':
                return <CheckCircle className="w-4 h-4 mr-1" />;
            case 'APPROVED':
                return <Check className="w-4 h-4 mr-1" />;
            case 'CANCELLED':
                return <X className="w-4 h-4 mr-1" />;
            default:
                return <Clock className="w-4 h-4 mr-1" />;
        }
    };

    const orderTotalCost = formItems.reduce((acc, item) => acc + (item.quantity * item.unitCost), 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-wide">Purchase Orders</h1>
                    <p className="text-gray-400 text-sm mt-1">Manage restocking, vendor shipments, and supplier invoice intake.</p>
                </div>
                {isOwner && (
                <button
                    onClick={() => setIsCreateOpen(true)}
                    className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-lg font-semibold tracking-wide transition-all shadow-lg shadow-indigo-600/20"
                >
                    <Plus className="w-5 h-5" />
                    <span>Create Order</span>
                </button>
                )}
            </div>

            {/* Notifications */}
            {success && <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-sm">{success}</div>}
            {error && <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-sm">{error}</div>}

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Orders List */}
                <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-800 bg-gray-900/50 flex items-center justify-between">
                        <span className="font-semibold text-white">All Restock Orders</span>
                        <span className="text-xs text-gray-400">{orders.length} orders total</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-800 text-gray-400 text-xs font-semibold uppercase tracking-wider bg-gray-900/20">
                                    <th className="px-6 py-4">Order Details</th>
                                    <th className="px-6 py-4">Supplier</th>
                                    <th className="px-6 py-4">Total Amount</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/60 text-sm">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-8 text-gray-400">Loading purchase orders...</td>
                                    </tr>
                                ) : orders.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-8 text-gray-400">No purchase orders found. Click Create Order to begin.</td>
                                    </tr>
                                ) : (
                                    orders.map(order => (
                                        <tr key={order.id} className="hover:bg-gray-800/20 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-indigo-400">{order.orderNumber}</div>
                                                <div className="text-xs text-gray-500 mt-0.5">{new Date(order.createdAt).toLocaleDateString()}</div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-300">{order.supplierName}</td>
                                            <td className="px-6 py-4 text-gray-300 font-semibold">${Number(order.totalAmount).toFixed(2)}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusStyle(order.status)}`}>
                                                    {getStatusIcon(order.status)}
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleViewOrder(order)}
                                                    className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition-colors inline-flex items-center"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Details Panel */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden p-6 space-y-6">
                    <div className="border-b border-gray-800 pb-4">
                        <h2 className="text-lg font-bold text-white flex items-center">
                            <FileText className="w-5 h-5 mr-2 text-indigo-500" />
                            Order Inspection
                        </h2>
                        <p className="text-xs text-gray-400 mt-1">Select an order on the left to inspect items and change status.</p>
                    </div>

                    {selectedOrder ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4 text-xs bg-gray-950 p-4 rounded-lg border border-gray-800/80">
                                <div>
                                    <span className="text-gray-500 block">Order Number</span>
                                    <span className="text-white font-semibold text-sm">{selectedOrder.orderNumber}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block">Status</span>
                                    <span className={`inline-flex items-center px-2 py-0.5 mt-1 rounded-full text-[10px] font-semibold ${getStatusStyle(selectedOrder.status)}`}>
                                        {selectedOrder.status}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block">Supplier</span>
                                    <span className="text-gray-300 font-semibold">{selectedOrder.supplierName}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block">Total Amount</span>
                                    <span className="text-indigo-400 font-semibold">${Number(selectedOrder.totalAmount).toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Order Items */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ordered Catalog Items</h3>
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {selectedOrder.items?.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-3 bg-gray-800/20 rounded-lg border border-gray-800/40 text-xs">
                                            <div>
                                                <div className="font-semibold text-white">{item.medicineName}</div>
                                                <div className="text-gray-500 mt-0.5">Qty: {item.quantity} × ${Number(item.unitCost).toFixed(2)}</div>
                                            </div>
                                            <div className="text-white font-semibold">${Number(item.totalCost).toFixed(2)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {selectedOrder.notes && (
                                <div className="bg-gray-800/10 p-3 rounded-lg border border-gray-800 text-xs text-gray-400">
                                    <span className="font-semibold text-gray-300 block mb-1">Manager Notes:</span>
                                    {selectedOrder.notes}
                                </div>
                            )}

                            {/* Actions block */}
                            <div className="border-t border-gray-800 pt-4 space-y-3">
                                {isOwner && selectedOrder.status === 'PENDING' && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => handleUpdateStatus(selectedOrder.id, 'APPROVED')}
                                            className="flex items-center justify-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-xs font-semibold transition-colors"
                                        >
                                            <Check className="w-4 h-4" />
                                            <span>Approve PO</span>
                                        </button>
                                        <button
                                            onClick={() => handleUpdateStatus(selectedOrder.id, 'CANCELLED')}
                                            className="flex items-center justify-center space-x-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 py-2 rounded-lg text-xs font-semibold border border-rose-500/20 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                            <span>Cancel PO</span>
                                        </button>
                                    </div>
                                )}

                                {!isOwner && selectedOrder.status === 'PENDING' && (
                                    <div className="text-center p-3 bg-amber-500/5 text-amber-400 rounded-lg text-xs border border-amber-500/10 font-medium">
                                        Awaiting Owner approval before stock can be received.
                                    </div>
                                )}

                                {selectedOrder.status === 'APPROVED' && (
                                    <button
                                        onClick={() => handleReceiveOrder(selectedOrder.id)}
                                        className="flex w-full items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg text-xs font-bold tracking-wide transition-colors shadow-lg shadow-emerald-600/10"
                                    >
                                        <ShoppingCart className="w-4 h-4" />
                                        <span>Receive Inventory & Stock Items</span>
                                    </button>
                                )}

                                {selectedOrder.status === 'RECEIVED' && (
                                    <div className="text-center p-3 bg-emerald-500/5 text-emerald-400 rounded-lg text-xs border border-emerald-500/10 font-medium">
                                        This order has been completed and catalog stock increased.
                                    </div>
                                )}

                                {selectedOrder.status === 'CANCELLED' && (
                                    <div className="text-center p-3 bg-rose-500/5 text-rose-400 rounded-lg text-xs border border-rose-500/10 font-medium">
                                        This order was cancelled.
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-500 text-sm">
                            No order selected. Click the eye icon next to an order.
                        </div>
                    )}
                </div>
            </div>

            {/* Create Modal */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-3xl bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-800 bg-gray-900/80">
                            <h2 className="text-lg font-bold text-white tracking-wide flex items-center">
                                <ShoppingCart className="w-5 h-5 mr-2 text-indigo-500" />
                                Draft New Restock Order
                            </h2>
                            <button onClick={() => setIsCreateOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateOrder} className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* General */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Select Vendor / Supplier</label>
                                    <select
                                        value={selectedSupplierId}
                                        onChange={(e) => setSelectedSupplierId(e.target.value)}
                                        required
                                        className="w-full p-2.5 rounded-lg border border-gray-800 bg-gray-950 text-white focus:border-indigo-500 focus:outline-none text-sm"
                                    >
                                        <option value="">-- Choose Supplier --</option>
                                        {suppliers.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Memo / Internal Notes</label>
                                    <input
                                        type="text"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Optional instructions for receiver"
                                        className="w-full p-2.5 rounded-lg border border-gray-800 bg-gray-950 text-white focus:border-indigo-500 focus:outline-none text-sm"
                                    />
                                </div>
                            </div>

                            {/* Add Item Subsection */}
                            <div className="border border-gray-800 bg-gray-950 p-4 rounded-xl space-y-4">
                                <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Add Products to Shipment</h3>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Select Medicine Catalog Item</label>
                                        <select
                                            value={currentMedId}
                                            onChange={(e) => handleSelectMedicine(e.target.value)}
                                            className="w-full p-2 rounded border border-gray-800 bg-gray-900 text-white focus:outline-none text-xs"
                                        >
                                            <option value="">-- Select Product --</option>
                                            {medicines.map(m => (
                                                <option key={m.id} value={m.id}>{m.name} ({m.genericName})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Quantity</label>
                                        <input
                                            type="number"
                                            value={currentQty}
                                            onChange={(e) => setCurrentQty(Math.max(1, parseInt(e.target.value, 10)))}
                                            min="1"
                                            className="w-full p-2 rounded border border-gray-800 bg-gray-900 text-white focus:outline-none text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Unit Cost Price ($)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={currentCost}
                                            onChange={(e) => setCurrentCost(Math.max(0, parseFloat(e.target.value)))}
                                            className="w-full p-2 rounded border border-gray-800 bg-gray-900 text-white focus:outline-none text-xs"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={addPlayItem}
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded text-xs font-semibold transition-colors"
                                    >
                                        Add to Draft List
                                    </button>
                                </div>
                            </div>

                            {/* Added Items table */}
                            <div className="space-y-2">
                                <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Order Draft Items ({formItems.length})</span>
                                <div className="border border-gray-800 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-950 text-gray-500 text-[10px] font-semibold uppercase tracking-wider border-b border-gray-800">
                                                <th className="px-4 py-2">Product Name</th>
                                                <th className="px-4 py-2 text-center">Qty</th>
                                                <th className="px-4 py-2 text-right">Unit Cost</th>
                                                <th className="px-4 py-2 text-right">Subtotal</th>
                                                <th className="px-4 py-2 text-center">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-800/40 text-xs text-gray-300">
                                            {formItems.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="text-center py-6 text-gray-500">No items added to draft yet.</td>
                                                </tr>
                                            ) : (
                                                formItems.map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-800/10">
                                                        <td className="px-4 py-2 font-semibold text-white">{item.medicineName}</td>
                                                        <td className="px-4 py-2 text-center">{item.quantity}</td>
                                                        <td className="px-4 py-2 text-right">${item.unitCost.toFixed(2)}</td>
                                                        <td className="px-4 py-2 text-right font-semibold text-indigo-400">${(item.quantity * item.unitCost).toFixed(2)}</td>
                                                        <td className="px-4 py-2 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => removeItem(idx)}
                                                                className="text-rose-400 hover:text-rose-300 transition-colors p-1"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Total summary info and submit */}
                            <div className="flex items-center justify-between border-t border-gray-800 pt-4">
                                <div className="text-sm">
                                    <span className="text-gray-400">Total Purchase Value: </span>
                                    <span className="text-lg font-bold text-white">${orderTotalCost.toFixed(2)}</span>
                                </div>
                                <div className="flex space-x-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreateOpen(false)}
                                        className="px-4 py-2 border border-gray-800 bg-gray-950 text-gray-300 hover:text-white rounded-lg text-sm font-semibold transition-colors"
                                    >
                                        Discard
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold tracking-wide transition-all shadow-lg shadow-indigo-600/15"
                                    >
                                        Place Purchase Order
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
