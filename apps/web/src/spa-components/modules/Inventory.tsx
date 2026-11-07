import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import {
    Search,
    Plus,
    Filter,
    Barcode,
    AlertTriangle,
    Edit,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Package,
    X
} from 'lucide-react';

interface Medicine {
    id: string;
    name: string;
    genericName: string;
    brandName: string;
    barcode: string;
    batchNumber: string;
    unitPrice: string;
    sellingPrice: string;
    stock: number;
    minStockLevel: number;
    expiryDate: string;
    category?: string;
    supplier?: string;
}

export const InventoryPage: React.FC = () => {
    const { user } = useAuthStore();
    // Cashiers are read-only; Owners and Pharmacists can manage stock
    const canManage = user?.role === 'OWNER' || user?.role === 'PHARMACIST';
    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedBarcode, setSelectedBarcode] = useState<string | null>(null);
    const [debouncedSearch, setDebouncedSearch] = useState('');

    const [categoriesList, setCategoriesList] = useState<any[]>([]);
    const [manufacturersList, setManufacturersList] = useState<any[]>([]);
    const [suppliersList, setSuppliersList] = useState<any[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // New Category on-the-fly creation state
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategoryNameInput, setNewCategoryNameInput] = useState('');
    const [isSavingCategory, setIsSavingCategory] = useState(false);

    // New Manufacturer on-the-fly creation state
    const [isAddingManufacturer, setIsAddingManufacturer] = useState(false);
    const [newManufacturerNameInput, setNewManufacturerNameInput] = useState('');
    const [isSavingManufacturer, setIsSavingManufacturer] = useState(false);

    // New Supplier on-the-fly creation state
    const [isAddingSupplier, setIsAddingSupplier] = useState(false);
    const [newSupplierNameInput, setNewSupplierNameInput] = useState('');
    const [newSupplierPhoneInput, setNewSupplierPhoneInput] = useState('');
    const [isSavingSupplier, setIsSavingSupplier] = useState(false);

    // Form fields state
    const [newName, setNewName] = useState('');
    const [newGenericName, setNewGenericName] = useState('');
    const [newBrandName, setNewBrandName] = useState('');
    const [newBarcode, setNewBarcode] = useState('');
    const [newBatchNumber, setNewBatchNumber] = useState('');
    const [newCategoryId, setNewCategoryId] = useState('');
    const [newManufacturer, setNewManufacturer] = useState('');
    const [newSupplierId, setNewSupplierId] = useState('');
    const [newUnitPrice, setNewUnitPrice] = useState('');
    const [newSellingPrice, setNewSellingPrice] = useState('');
    const [newStock, setNewStock] = useState('0');
    const [newMinStockLevel, setNewMinStockLevel] = useState('10');
    const [newExpiryDate, setNewExpiryDate] = useState('');

    const fetchDropdowns = useCallback(async () => {
        try {
            const [catsRes, mfgsRes, supsRes] = await Promise.allSettled([
                api.get('/medicines/categories/all'),
                api.get('/medicines/manufacturers/all'),
                api.get('/suppliers')
            ]);
            if (catsRes.status === 'fulfilled') {
                setCategoriesList(catsRes.value.data?.data || []);
            }
            if (mfgsRes.status === 'fulfilled') {
                setManufacturersList(mfgsRes.value.data?.data || []);
            }
            if (supsRes.status === 'fulfilled') {
                setSuppliersList(supsRes.value.data?.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch dropdown dependencies:', error);
        }
    }, []);

    useEffect(() => {
        if (canManage) {
            fetchDropdowns();
        }
    }, [canManage, fetchDropdowns]);

    const handleAddCategory = async (e?: React.MouseEvent) => {
        if (e) e.preventDefault();
        const trimmed = newCategoryNameInput.trim();
        if (!trimmed) return;
        setIsSavingCategory(true);
        try {
            const res = await api.post('/medicines/categories', { name: trimmed });
            const created = res.data.data;
            setCategoriesList(prev => {
                if (prev.some(c => c.id === created.id)) return prev;
                return [...prev, created].sort((a, b) => a.name.localeCompare(b.name));
            });
            setNewCategoryId(created.id);
            setNewCategoryNameInput('');
            setIsAddingCategory(false);
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to create category');
        } finally {
            setIsSavingCategory(false);
        }
    };

    const handleAddManufacturer = async (e?: React.MouseEvent) => {
        if (e) e.preventDefault();
        const trimmed = newManufacturerNameInput.trim();
        if (!trimmed) return;
        setIsSavingManufacturer(true);
        try {
            const res = await api.post('/medicines/manufacturers', { name: trimmed });
            const created = res.data.data;
            setManufacturersList(prev => {
                if (prev.some(m => m.id === created.id)) return prev;
                return [...prev, created].sort((a, b) => a.name.localeCompare(b.name));
            });
            setNewManufacturer(created.id);
            setNewManufacturerNameInput('');
            setIsAddingManufacturer(false);
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to create manufacturer');
        } finally {
            setIsSavingManufacturer(false);
        }
    };

    const handleAddSupplier = async (e?: React.MouseEvent) => {
        if (e) e.preventDefault();
        const trimmed = newSupplierNameInput.trim();
        if (!trimmed) return;
        setIsSavingSupplier(true);
        try {
            const res = await api.post('/suppliers', {
                name: trimmed,
                phone: newSupplierPhoneInput.trim() || 'N/A',
                paymentTerms: 'NET_30'
            });
            const created = res.data.data;
            setSuppliersList(prev => {
                if (prev.some(s => s.id === created.id)) return prev;
                return [...prev, created].sort((a, b) => a.name.localeCompare(b.name));
            });
            setNewSupplierId(created.id);
            setNewSupplierNameInput('');
            setNewSupplierPhoneInput('');
            setIsAddingSupplier(false);
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to create supplier');
        } finally {
            setIsSavingSupplier(false);
        }
    };

    const handleCreateMedicine = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName || !newGenericName || !newBatchNumber || !newCategoryId || !newManufacturer || !newSupplierId || !newUnitPrice || !newSellingPrice || !newExpiryDate) {
            alert('Please fill in all required fields.');
            return;
        }

        try {
            await api.post('/medicines', {
                name: newName,
                genericName: newGenericName,
                brandName: newBrandName || undefined,
                barcode: newBarcode || undefined,
                batchNumber: newBatchNumber,
                categoryId: newCategoryId,
                manufacturer: newManufacturer,
                supplierId: newSupplierId,
                unitPrice: Number(newUnitPrice),
                sellingPrice: Number(newSellingPrice),
                stock: Number(newStock),
                minStockLevel: Number(newMinStockLevel),
                expiryDate: newExpiryDate
            });

            setIsCreateModalOpen(false);
            // Clear fields
            setNewName('');
            setNewGenericName('');
            setNewBrandName('');
            setNewBarcode('');
            setNewBatchNumber('');
            setNewCategoryId('');
            setNewManufacturer('');
            setNewSupplierId('');
            setNewUnitPrice('');
            setNewSellingPrice('');
            setNewStock('0');
            setNewMinStockLevel('10');
            setNewExpiryDate('');
            
            fetchMedicines();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to add medicine');
        }
    };

    const abortControllerRef = useRef<AbortController | null>(null);

    const fetchMedicines = useCallback(async () => {
        // Cancel previous pending search/page request to avoid race conditions
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            setLoading(true);
            setFetchError(null);
            const params: Record<string, any> = { page, limit: 10 };
            if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
            if (filter) params.filter = filter;

            const response = await api.get('/medicines', { params, signal: controller.signal });
            setMedicines(response.data.data);
            setTotalPages(response.data.meta.totalPages);
        } catch (error: any) {
            // Silently ignore normal navigation/search cancellations
            if (axios.isCancel(error) || error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
                return;
            }

            if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                setFetchError('Request timed out while waiting for server response. Please click Retry.');
            } else {
                const msg = error.response?.data?.message || '';
                if (msg.includes('Failed query:') || msg.includes('Database connection') || error.response?.status === 500) {
                    setFetchError('Database connection temporarily interrupted. Please ensure your internet connection is active and click Retry.');
                } else {
                    setFetchError(msg || 'Failed to load inventory. Check your connection.');
                }
            }
            setMedicines([]);
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, filter, page]);

    // Debounce: wait 300ms after user stops typing before searching
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        fetchMedicines();
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [fetchMedicines]);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header & Actions */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Medicine Catalog & Inventory</h1>
                    <p className="text-sm text-gray-500">Manage master product listings, pricing, and stock levels.</p>
                </div>
                {canManage && (
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 shadow-sm transition"
                >
                    <Plus className="w-4 h-4 mr-2" /> Add New Medicine
                </button>
                )}
            </div>

            {/* Search & Filters Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name, generic name, brand, or barcode..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <select
                        value={filter}
                        onChange={(e) => { setFilter(e.target.value); setPage(1); }}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-800 text-white w-full md:w-48"
                    >
                        <option value="" className="bg-gray-800">All Inventory</option>
                        <option value="low-stock" className="bg-gray-800">Low Stock Alerts</option>
                        <option value="expired" className="bg-gray-800">Expired Products</option>
                    </select>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                <th className="py-3 px-4">Medicine Details</th>
                                <th className="py-3 px-4">Category</th>
                                <th className="py-3 px-4">Batch & Barcode</th>
                                <th className="py-3 px-4">Pricing (Birr)</th>
                                <th className="py-3 px-4">Stock Status</th>
                                {canManage && <th className="py-3 px-4 text-right">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 text-sm">
                            {loading ? (
                                <tr>
                                    <td colSpan={canManage ? 6 : 5} className="text-center py-12 text-gray-500">Loading catalog items...</td>
                                </tr>
                            ) : fetchError ? (
                                <tr>
                                    <td colSpan={canManage ? 6 : 5} className="text-center py-12">
                                        <div className="flex flex-col items-center gap-2 text-red-500">
                                            <span className="font-semibold">⚠ Could not load inventory</span>
                                            <span className="text-sm text-gray-500">{fetchError}</span>
                                            <button onClick={fetchMedicines} className="mt-2 px-4 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition">Retry</button>
                                        </div>
                                    </td>
                                </tr>
                            ) : medicines.length === 0 ? (
                                <tr>
                                    <td colSpan={canManage ? 6 : 5} className="text-center py-12 text-gray-500">
                                        {debouncedSearch || filter ? 'No medicines found matching your search.' : 'No medicines in inventory yet.'}
                                    </td>
                                </tr>
                            ) : (
                                medicines.map((med) => {
                                    const isLowStock = med.stock <= med.minStockLevel;
                                    const isExpired = new Date(med.expiryDate) < new Date();

                                    return (
                                        <tr key={med.id} className="hover:bg-gray-50/50 transition">
                                            <td className="py-3 px-4">
                                                <div className="font-medium text-gray-900">{med.name}</div>
                                                <div className="text-xs text-gray-500">{med.genericName} • {med.brandName}</div>
                                            </td>
                                            <td className="py-3 px-4 text-gray-600">{med.category || 'Uncategorized'}</td>
                                            <td className="py-3 px-4">
                                                <div className="font-mono text-xs text-gray-700">{med.batchNumber}</div>
                                                <button
                                                    onClick={() => setSelectedBarcode(med.barcode)}
                                                    className="text-xs text-indigo-600 hover:underline inline-flex items-center mt-0.5"
                                                >
                                                    <Barcode className="w-3.5 h-3.5 mr-1" /> {med.barcode}
                                                </button>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="font-medium text-gray-900">Birr {med.sellingPrice}</div>
                                                <div className="text-xs text-gray-400">Cost: Birr {med.unitPrice}</div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-semibold ${isLowStock ? 'text-amber-600' : 'text-gray-900'}`}>
                                                        {med.stock} units
                                                    </span>
                                                    {isLowStock && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                                            <AlertTriangle className="w-3 h-3 mr-1" /> Low
                                                        </span>
                                                    )}
                                                    {isExpired && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                                            Expired
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            {canManage && (
                                            <td className="py-3 px-4 text-right space-x-2">
                                                <button className="p-1 text-gray-400 hover:text-indigo-600 transition">
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button className="p-1 text-gray-400 hover:text-red-600 transition">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                            )}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                    <span className="text-xs text-gray-500">Page {page} of {totalPages || 1}</span>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setPage(p => Math.max(p - 1, 1))}
                            disabled={page === 1}
                            className="p-1.5 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                            disabled={page === totalPages || totalPages === 0}
                            className="p-1.5 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Barcode Modal Preview */}
            {selectedBarcode && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl">
                        <h3 className="text-lg font-bold text-gray-900 text-center">Product Barcode</h3>
                        <div className="flex justify-center bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <img
                                src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/medicines/barcode/${selectedBarcode}`}
                                alt="Barcode"
                                className="h-20 object-contain"
                            />
                        </div>
                        <p className="text-center font-mono text-sm text-gray-600">{selectedBarcode}</p>
                        <button
                            onClick={() => setSelectedBarcode(null)}
                            className="w-full py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Create Medicine Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
                    <div className="bg-white rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl my-8">
                        <div className="flex items-center justify-between border-b pb-3">
                            <h3 className="text-lg font-bold text-gray-900">Add New Medicine to Catalog</h3>
                            <button type="button" onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateMedicine} className="space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-medium text-gray-700 mb-1 font-semibold">Medicine Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Commercial medicine name..."
                                    />
                                </div>
                                <div>
                                    <label className="block font-medium text-gray-700 mb-1 font-semibold">Generic Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={newGenericName}
                                        onChange={e => setNewGenericName(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Active generic ingredient..."
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-medium text-gray-700 mb-1 font-semibold">Brand / Manufacturer Name</label>
                                    <input
                                        type="text"
                                        value={newBrandName}
                                        onChange={e => setNewBrandName(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Brand / manufacturer name..."
                                    />
                                </div>
                                <div>
                                    <label className="block font-medium text-gray-700 mb-1 font-semibold">Barcode (Optional)</label>
                                    <input
                                        type="text"
                                        value={newBarcode}
                                        onChange={e => setNewBarcode(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Scan or enter barcode..."
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-medium text-gray-700 mb-1 font-semibold">Batch Number *</label>
                                    <input
                                        type="text"
                                        required
                                        value={newBatchNumber}
                                        onChange={e => setNewBatchNumber(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Batch / lot number..."
                                    />
                                </div>
                                <div>
                                    <label className="block font-medium text-gray-700 mb-1 font-semibold">Expiry Date *</label>
                                    <input
                                        type="date"
                                        required
                                        value={newExpiryDate}
                                        onChange={e => setNewExpiryDate(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block font-medium text-gray-700 font-semibold text-xs">Category *</label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsAddingCategory(!isAddingCategory);
                                                setNewCategoryNameInput('');
                                            }}
                                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-0.5"
                                        >
                                            <Plus className="w-3 h-3" /> {isAddingCategory ? 'Cancel' : 'New'}
                                        </button>
                                    </div>

                                    {isAddingCategory ? (
                                        <div className="flex gap-1">
                                            <input
                                                type="text"
                                                value={newCategoryNameInput}
                                                onChange={e => setNewCategoryNameInput(e.target.value)}
                                                placeholder="New category..."
                                                className="w-full border border-indigo-400 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 bg-white focus:outline-none"
                                                autoFocus
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleAddCategory();
                                                    }
                                                }}
                                            />
                                            <button
                                                type="button"
                                                disabled={isSavingCategory || !newCategoryNameInput.trim()}
                                                onClick={() => handleAddCategory()}
                                                className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 whitespace-nowrap"
                                            >
                                                {isSavingCategory ? '...' : 'Add'}
                                            </button>
                                        </div>
                                    ) : (
                                        <select
                                            required
                                            value={newCategoryId}
                                            onChange={e => {
                                                if (e.target.value === '__NEW__') {
                                                    setIsAddingCategory(true);
                                                } else {
                                                    setNewCategoryId(e.target.value);
                                                }
                                            }}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="">Select Category</option>
                                            {categoriesList.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                            <option value="__NEW__" className="text-indigo-600 font-semibold">+ Add New Category...</option>
                                        </select>
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block font-medium text-gray-700 font-semibold text-xs">Manufacturer *</label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsAddingManufacturer(!isAddingManufacturer);
                                                setNewManufacturerNameInput('');
                                            }}
                                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-0.5"
                                        >
                                            <Plus className="w-3 h-3" /> {isAddingManufacturer ? 'Cancel' : 'New'}
                                        </button>
                                    </div>

                                    {isAddingManufacturer ? (
                                        <div className="flex gap-1">
                                            <input
                                                type="text"
                                                value={newManufacturerNameInput}
                                                onChange={e => setNewManufacturerNameInput(e.target.value)}
                                                placeholder="New manufacturer..."
                                                className="w-full border border-indigo-400 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 bg-white focus:outline-none"
                                                autoFocus
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleAddManufacturer();
                                                    }
                                                }}
                                            />
                                            <button
                                                type="button"
                                                disabled={isSavingManufacturer || !newManufacturerNameInput.trim()}
                                                onClick={() => handleAddManufacturer()}
                                                className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 whitespace-nowrap"
                                            >
                                                {isSavingManufacturer ? '...' : 'Add'}
                                            </button>
                                        </div>
                                    ) : (
                                        <select
                                            required
                                            value={newManufacturer}
                                            onChange={e => {
                                                if (e.target.value === '__NEW__') {
                                                    setIsAddingManufacturer(true);
                                                } else {
                                                    setNewManufacturer(e.target.value);
                                                }
                                            }}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="">Select Manufacturer</option>
                                            {manufacturersList.map(mfg => (
                                                <option key={mfg.id} value={mfg.id}>{mfg.name}{mfg.country ? ` (${mfg.country})` : ''}</option>
                                            ))}
                                            <option value="__NEW__" className="text-indigo-600 font-semibold">+ Add New Manufacturer...</option>
                                        </select>
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block font-medium text-gray-700 font-semibold text-xs">Supplier *</label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsAddingSupplier(!isAddingSupplier);
                                                setNewSupplierNameInput('');
                                                setNewSupplierPhoneInput('');
                                            }}
                                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-0.5"
                                        >
                                            <Plus className="w-3 h-3" /> {isAddingSupplier ? 'Cancel' : 'New'}
                                        </button>
                                    </div>

                                    {isAddingSupplier ? (
                                        <div className="space-y-1">
                                            <input
                                                type="text"
                                                value={newSupplierNameInput}
                                                onChange={e => setNewSupplierNameInput(e.target.value)}
                                                placeholder="Supplier company name..."
                                                className="w-full border border-indigo-400 rounded-lg px-2.5 py-1 text-xs text-gray-900 bg-white focus:outline-none"
                                                autoFocus
                                            />
                                            <div className="flex gap-1">
                                                <input
                                                    type="text"
                                                    value={newSupplierPhoneInput}
                                                    onChange={e => setNewSupplierPhoneInput(e.target.value)}
                                                    placeholder="Phone number..."
                                                    className="w-full border border-gray-300 rounded-lg px-2.5 py-1 text-xs text-gray-900 bg-white focus:outline-none"
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handleAddSupplier();
                                                        }
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    disabled={isSavingSupplier || !newSupplierNameInput.trim()}
                                                    onClick={() => handleAddSupplier()}
                                                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 whitespace-nowrap"
                                                >
                                                    {isSavingSupplier ? '...' : 'Add'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <select
                                            required
                                            value={newSupplierId}
                                            onChange={e => {
                                                if (e.target.value === '__NEW__') {
                                                    setIsAddingSupplier(true);
                                                } else {
                                                    setNewSupplierId(e.target.value);
                                                }
                                            }}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="">Select Supplier</option>
                                            {suppliersList.map(sup => (
                                                <option key={sup.id} value={sup.id}>{sup.name}</option>
                                            ))}
                                            <option value="__NEW__" className="text-indigo-600 font-semibold">+ Add New Supplier...</option>
                                        </select>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-medium text-gray-700 mb-1 font-semibold">Purchase Price (Cost in Birr) *</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.01"
                                        value={newUnitPrice}
                                        onChange={e => setNewUnitPrice(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="e.g. 55.00"
                                    />
                                </div>
                                <div>
                                    <label className="block font-medium text-gray-700 mb-1 font-semibold">Selling Price (in Birr) *</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.01"
                                        value={newSellingPrice}
                                        onChange={e => setNewSellingPrice(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="e.g. 80.00"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-medium text-gray-700 mb-1 font-semibold">Initial Stock Qty</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={newStock}
                                        onChange={e => setNewStock(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="e.g. 100"
                                    />
                                </div>
                                <div>
                                    <label className="block font-medium text-gray-700 mb-1 font-semibold">Min Stock Alert Level</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={newMinStockLevel}
                                        onChange={e => setNewMinStockLevel(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="e.g. 10"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end space-x-2 pt-2 border-t">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-4 py-2 border rounded-lg text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 transition font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm transition"
                                >
                                    Save Medicine
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};