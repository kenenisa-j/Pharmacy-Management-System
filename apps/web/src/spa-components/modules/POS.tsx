import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';
import {
    Search,
    ShoppingCart,
    Trash2,
    Plus,
    Minus,
    CreditCard,
    Banknote,
    Smartphone,
    Printer,
    CheckCircle2,
    Barcode,
    PackageX
} from 'lucide-react';

interface Medicine {
    id: string;
    name: string;
    category: string;
    sellingPrice?: number;
    price?: number;
    stock: number;
    barcode?: string;
}

interface CartItem extends Medicine {
    quantity: number;
}

export const POSPage: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'MOBILE_MONEY'>('CASH');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [discount, setDiscount] = useState<number>(0);
    const [loading, setLoading] = useState(false);
    const [completedReceipt, setCompletedReceipt] = useState<any>(null);

    const searchInputRef = useRef<HTMLInputElement>(null);

    // Fetch product catalog for search & barcode lookup
    const fetchMedicines = async (query = '') => {
        try {
            const res = await api.get('/sales/search', {
                params: { query }
            });
            setMedicines(res.data.data);
        } catch (error) {
            console.error('Failed to search items:', error);
        }
    };

    useEffect(() => {
        fetchMedicines();
        // Auto-focus search input for cashier barcode scanners
        searchInputRef.current?.focus();
    }, []);

    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            fetchMedicines(searchQuery);
        }, 200);
        return () => clearTimeout(delayDebounce);
    }, [searchQuery]);

    // Add item to cart or increment quantity safely
    const addToCart = (med: Medicine) => {
        const price = med.sellingPrice || med.price || 0;
        setCart(prev => {
            const existing = prev.find(item => item.id === med.id);
            if (existing) {
                if (existing.quantity >= med.stock) {
                    alert(`Cannot add more. Stock limit reached (${med.stock} available).`);
                    return prev;
                }
                return prev.map(item =>
                    item.id === med.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            if (med.stock <= 0) {
                alert('This item is currently out of stock.');
                return prev;
            }
            return [...prev, { ...med, quantity: 1, sellingPrice: price }];
        });
    };

    const updateQuantity = (id: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const newQty = item.quantity + delta;
                if (newQty > item.stock) {
                    alert('Exceeds available inventory stock.');
                    return item;
                }
                return newQty > 0 ? { ...item, quantity: newQty } : null;
            }
            return item;
        }).filter(Boolean) as CartItem[]);
    };

    const removeFromCart = (id: string) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    // Financial Calculations
    const subtotal = cart.reduce((sum, item) => sum + (item.sellingPrice || 0) * item.quantity, 0);
    const grandTotal = Math.max(0, subtotal - (isNaN(discount) ? 0 : discount));

    // Handle Checkout & Receipt Generation
    const handleCheckout = async () => {
        if (cart.length === 0) return;

        try {
            setLoading(true);
            const payload = {
                items: cart.map(item => ({ medicineId: item.id, quantity: item.quantity })),
                paymentMethod,
                customerName: customerName.trim() || 'Walk-in Customer',
                customerPhone: customerPhone.trim() || null,
                discountAmount: isNaN(discount) ? 0 : discount
            };

            const res = await api.post('/sales', payload);

            setCompletedReceipt({
                ...res.data.data,
                items: [...cart],
                subtotal,
                discount: isNaN(discount) ? 0 : discount,
                grandTotal,
                paymentMethod,
                customerName: customerName.trim() || 'Walk-in Customer'
            });

            // Clear cart & state
            setCart([]);
            setCustomerName('');
            setCustomerPhone('');
            setDiscount(0);
            fetchMedicines(); // Refresh stock counts
            searchInputRef.current?.focus();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Checkout failed');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="p-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-2rem)]">

            {/* Left 2 Columns: Catalog, Barcode Input & Item Cards Grid */}
            <div className="lg:col-span-2 flex flex-col space-y-4 h-full overflow-hidden">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Point of Sale (POS) Terminal</h1>
                    <p className="text-sm text-gray-500">Scan barcodes or select medicines from catalog to build fast retail orders.</p>
                </div>

                {/* Search & Barcode Scanner Input */}
                <div className="relative">
                    <Barcode className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500" />
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Scan barcode or type medicine name/category..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                {/* Medicines Catalog Grid */}
                <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pr-1">
                    {medicines.length === 0 ? (
                        <div className="col-span-full h-64 flex flex-col items-center justify-center text-gray-400 bg-white rounded-2xl border border-gray-200">
                            <PackageX className="w-10 h-10 stroke-1 mb-2" />
                            <p className="text-sm">No inventory products found matching your search.</p>
                        </div>
                    ) : (
                        medicines.map(med => {
                            const price = med.sellingPrice || med.price || 0;
                            return (
                                <div
                                    key={med.id}
                                    onClick={() => addToCart(med)}
                                    className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:border-indigo-500 hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
                                >
                                    <div>
                                        <div className="flex justify-between items-start">
                                            <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md uppercase tracking-wide">
                                                {med.category || 'General'}
                                            </span>
                                            <span className={`text-xs font-bold ${med.stock > 10 ? 'text-emerald-600' : med.stock > 0 ? 'text-amber-600' : 'text-red-600'}`}>
                                                Stock: {med.stock}
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-gray-900 mt-2 line-clamp-1 group-hover:text-indigo-600 transition">{med.name}</h3>
                                    </div>
                                    <div className="flex items-center justify-between mt-4 pt-2 border-t border-gray-100">
                                        <span className="text-sm font-extrabold text-indigo-600">ETB {price.toFixed(2)}</span>
                                        <button className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition">
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Right Column: Active Cart & Checkout Terminal Panel */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col h-full overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <div className="flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-indigo-600" />
                        <h2 className="font-bold text-gray-900">Current Order</h2>
                    </div>
                    <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-700 font-bold text-xs rounded-full">
                        {cart.reduce((acc, item) => acc + item.quantity, 0)} items
                    </span>
                </div>

                {/* Cart Items List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-gray-50">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 space-y-2 py-16">
                            <ShoppingCart className="w-10 h-10 stroke-1 text-gray-300" />
                            <p className="text-sm">Cart is empty. Scan items to begin checkout.</p>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.id} className="pt-3 first:pt-0 flex items-center justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-gray-900 text-xs truncate">{item.name}</h4>
                                    <p className="text-xs text-indigo-600 font-bold mt-0.5">ETB {(item.sellingPrice || 0).toFixed(2)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center border rounded-lg overflow-hidden bg-gray-50">
                                        <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-gray-200 text-gray-600 transition">
                                            <Minus className="w-3 h-3" />
                                        </button>
                                        <span className="px-2.5 text-xs font-bold text-gray-900">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-gray-200 text-gray-600 transition">
                                            <Plus className="w-3 h-3" />
                                        </button>
                                    </div>
                                    <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 p-1 transition">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Customer Information & Payment Controls */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        <input
                            type="text"
                            placeholder="Customer Name"
                            value={customerName}
                            onChange={e => setCustomerName(e.target.value)}
                            className="w-full text-xs border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <input
                            type="text"
                            placeholder="Phone Number"
                            value={customerPhone}
                            onChange={e => setCustomerPhone(e.target.value)}
                            className="w-full text-xs border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>

                    {/* Payment Method Selector Buttons */}
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { id: 'CASH', label: 'Cash', icon: Banknote },
                            { id: 'CARD', label: 'Card', icon: CreditCard },
                            { id: 'MOBILE_MONEY', label: 'Mobile', icon: Smartphone }
                        ].map(m => {
                            const Icon = m.icon;
                            return (
                                <button
                                    key={m.id}
                                    onClick={() => setPaymentMethod(m.id as any)}
                                    className={`flex flex-col items-center justify-center py-2 rounded-xl border text-xs font-semibold transition ${paymentMethod === m.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'}`}
                                >
                                    <Icon className="w-4 h-4 mb-1" />
                                    {m.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Cost Summary Breakdown */}
                    <div className="space-y-1 pt-2 text-xs">
                        <div className="flex justify-between text-gray-500">
                            <span>Subtotal</span>
                            <span>ETB {subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-500 items-center">
                            <span>Discount</span>
                            <input
                                type="number"
                                min="0"
                                value={discount}
                                onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                                className="w-20 text-right border rounded px-1 py-0.5 text-xs bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>
                        <div className="flex justify-between text-sm font-extrabold text-gray-900 pt-2 border-t border-gray-200">
                            <span>Total Payable</span>
                            <span className="text-indigo-600">ETB {grandTotal.toFixed(2)}</span>
                        </div>
                    </div>

                    <button
                        onClick={handleCheckout}
                        disabled={cart.length === 0 || loading}
                        className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Processing Payment...' : `Complete Payment (ETB ${grandTotal.toFixed(2)})`}
                    </button>
                </div>
            </div>

            {/* Completed Receipt Modal & Print View */}
            {completedReceipt && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
                        <div className="text-center space-y-1 border-b pb-4">
                            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                            <h3 className="text-lg font-bold text-gray-900">Payment Successful</h3>
                            <p className="text-xs text-gray-500">Receipt #{completedReceipt.receiptNumber}</p>
                        </div>

                        <div className="space-y-2 text-xs text-gray-600">
                            <div className="flex justify-between">
                                <span>Customer:</span>
                                <span className="font-semibold text-gray-900">{completedReceipt.customerName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Payment Method:</span>
                                <span className="font-semibold text-gray-900">{completedReceipt.paymentMethod}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Date:</span>
                                <span className="font-semibold text-gray-900">{new Date(completedReceipt.createdAt || Date.now()).toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="border-t border-b py-3 space-y-2 max-h-40 overflow-y-auto">
                            {completedReceipt.items.map((it: any, i: number) => (
                                <div key={i} className="flex justify-between text-xs">
                                    <span>{it.name} x{it.quantity}</span>
                                    <span className="font-semibold">ETB {((it.sellingPrice || 0) * it.quantity).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-1 text-xs pt-1">
                            <div className="flex justify-between text-gray-500">
                                <span>Subtotal</span>
                                <span>ETB {completedReceipt.subtotal.toFixed(2)}</span>
                            </div>
                            {completedReceipt.discount > 0 && (
                                <div className="flex justify-between text-emerald-600">
                                    <span>Discount</span>
                                    <span>-ETB {completedReceipt.discount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-sm font-extrabold text-gray-900 pt-2 border-t">
                                <span>Total Paid</span>
                                <span className="text-indigo-600">ETB {completedReceipt.grandTotal.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={handlePrint}
                                className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-200 flex items-center justify-center gap-1.5 transition"
                            >
                                <Printer className="w-4 h-4" /> Print Receipt
                            </button>
                            <button
                                onClick={() => {
                                    setCompletedReceipt(null);
                                    searchInputRef.current?.focus();
                                }}
                                className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition"
                            >
                                New Sale
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};