import React, { useState, useEffect, useCallback } from 'react';
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

    useEffect(() => {
        if (canManage) {
            const fetchDropdowns = async () => {
                try {
                    const [catsRes, mfgsRes, supsRes] = await Promise.all([
                        api.get('/medicines/categories/all'),
                        api.get('/medicines/manufacturers/all'),
                        api.get('/suppliers')
                    ]);
                    setCategoriesList(catsRes.data.data);
                    setManufacturersList(mfgsRes.data.data);
                    setSuppliersList(supsRes.data.data);
                } catch (error) {
                    console.error('Failed to fetch dropdown dependencies:', error);
                }
            };
            fetchDropdowns();
        }
    }, [canManage]);

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

    const fetchMedicines = useCallback(async () => {
        try {
            setLoading(true);
            const params: Record<string, any> = { page, limit: 10 };
            if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
            if (filter) params.filter = filter;

            const response = await api.get('/medicines', { params });
            setMedicines(response.data.data);
            setTotalPages(response.data.meta.totalPages);
        } catch (error) {
            console.error('Failed to fetch inventory:', error);
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
                                <th className="py-3 px-4">Pricing</th>
                                <th className="py-3 px-4">Stock Status</th>
                                {canManage && <th className="py-3 px-4 text-right">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 text-sm">
                            {loading ? (
                                <tr>
                                    <td colSpan={canManage ? 6 : 5} className="text-center py-12 text-gray-500">Loading catalog items...</td>
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
                                                <div className="font-medium text-gray-900">ETB {med.sellingPrice}</div>
                                                <div className="text-xs text-gray-400">Cost: ETB {med.unitPrice}</div>
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
                                        placeholder="e.g. Amoxicillin 500mg"
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
                                        placeholder="e.g. Amoxicillin Trihydrate"
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
                                        placeholder="e.g. Pfizer"
                                    />
                                </div>
                                <div>
                                    <label className="block font-medium text-gray-700 mb-1 font-semibold">Barcode (Optional)</label>
                                    <input
                                        type="text"
                                        value={newBarcode}
                                        onChange={e => setNewBarcode(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="e.g. 6291072200122"
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
                                        placeholder="e.g. B-9942"
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
                                    <label className="block font-medium text-gray-700 mb-1 font-semibold">Category *</label>
                                    <select
                                        required
                                        value={newCategoryId}
                                        onChange={e => setNewCategoryId(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="">Select Category</option>
                                        {categoriesList.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-medium text-gray-700 mb-1 font-semibold">Manufacturer *</label>
                                    <select
                                        required
                                        value={newManufacturer}
                                        onChange={e => setNewManufacturer(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="">Select Manufacturer</option>
                                        {manufacturersList.map(mfg => (
                                            <option key={mfg.id} value={mfg.id}>{mfg.name} ({mfg.country})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-medium text-gray-700 mb-1 font-semibold">Supplier *</label>
                                    <select
                                        required
                                        value={newSupplierId}
                                        onChange={e => setNewSupplierId(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="">Select Supplier</option>
                                        {suppliersList.map(sup => (
                                            <option key={sup.id} value={sup.id}>{sup.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-medium text-gray-700 mb-1 font-semibold">Purchase Price (Cost) *</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.01"
                                        value={newUnitPrice}
                                        onChange={e => setNewUnitPrice(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="e.g. 5.50"
                                    />
                                </div>
                                <div>
                                    <label className="block font-medium text-gray-700 mb-1 font-semibold">Selling Price *</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.01"
                                        value={newSellingPrice}
                                        onChange={e => setNewSellingPrice(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="e.g. 8.00"
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