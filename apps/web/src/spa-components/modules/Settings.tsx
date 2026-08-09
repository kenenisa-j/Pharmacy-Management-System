import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Settings, Store, Receipt, Percent, Save, CheckCircle2 } from 'lucide-react';

export const SettingsPage: React.FC = () => {
    const [storeName, setStoreName] = useState('');
    const [storePhone, setStorePhone] = useState('');
    const [storeAddress, setStoreAddress] = useState('');
    const [currency, setCurrency] = useState('ETB');
    const [taxRate, setTaxRate] = useState('0');
    const [receiptFooter, setReceiptFooter] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await api.get('/settings');
                const data = res.data.data;
                if (data.STORE_NAME) setStoreName(data.STORE_NAME);
                if (data.STORE_PHONE) setStorePhone(data.STORE_PHONE);
                if (data.STORE_ADDRESS) setStoreAddress(data.STORE_ADDRESS);
                if (data.CURRENCY) setCurrency(data.CURRENCY);
                if (data.TAX_RATE) setTaxRate(data.TAX_RATE);
                if (data.RECEIPT_FOOTER) setReceiptFooter(data.RECEIPT_FOOTER);
            } catch (error) {
                console.error('Failed to load store settings:', error);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            await api.put('/settings', {
                STORE_NAME: storeName,
                STORE_PHONE: storePhone,
                STORE_ADDRESS: storeAddress,
                CURRENCY: currency,
                TAX_RATE: taxRate,
                RECEIPT_FOOTER: receiptFooter
            });

            setSuccessMessage(true);
            setTimeout(() => setSuccessMessage(false), 3000);
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to update settings');
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition";
    const labelClass = "block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5";
    const cardClass = "bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4";

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-wide">Store Settings</h1>
                    <p className="text-sm text-gray-400 mt-1">Customize pharmacy particulars, receipt footers, taxes, and system currency.</p>
                </div>
                {successMessage && (
                    <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-xl text-xs font-bold border border-emerald-500/20">
                        <CheckCircle2 className="w-4 h-4" /> Settings Saved!
                    </div>
                )}
            </div>

            <form onSubmit={handleSave} className="space-y-6">

                {/* General Store Particulars */}
                <div className={cardClass}>
                    <div className="flex items-center gap-2 border-b border-gray-800 pb-3 text-white font-bold text-sm">
                        <Store className="w-4 h-4 text-indigo-400" /> General Particulars
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Pharmacy / Store Name</label>
                            <input
                                type="text"
                                value={storeName}
                                onChange={e => setStoreName(e.target.value)}
                                className={inputClass}
                                placeholder="Denkinesh Pharmacy"
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Contact Phone Number</label>
                            <input
                                type="text"
                                value={storePhone}
                                onChange={e => setStorePhone(e.target.value)}
                                className={inputClass}
                                placeholder="+251911223344"
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className={labelClass}>Physical Address</label>
                            <input
                                type="text"
                                value={storeAddress}
                                onChange={e => setStoreAddress(e.target.value)}
                                className={inputClass}
                                placeholder="Bole Sub-City, Addis Ababa, Ethiopia"
                            />
                        </div>
                    </div>
                </div>

                {/* Financial & Tax Parameters */}
                <div className={cardClass}>
                    <div className="flex items-center gap-2 border-b border-gray-800 pb-3 text-white font-bold text-sm">
                        <Percent className="w-4 h-4 text-indigo-400" /> Financial &amp; Tax Parameters
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Currency</label>
                            <select
                                value={currency}
                                onChange={e => setCurrency(e.target.value)}
                                className={inputClass}
                            >
                                <option value="ETB">ETB — Ethiopian Birr (Br)</option>
                                <option value="USD">USD — US Dollar ($)</option>
                                <option value="EUR">EUR — Euro (€)</option>
                                <option value="GBP">GBP — British Pound (£)</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Sales Tax Rate (%)</label>
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                value={taxRate}
                                onChange={e => setTaxRate(e.target.value)}
                                className={inputClass}
                                placeholder="15"
                            />
                        </div>
                    </div>
                </div>

                {/* Receipt Customization */}
                <div className={cardClass}>
                    <div className="flex items-center gap-2 border-b border-gray-800 pb-3 text-white font-bold text-sm">
                        <Receipt className="w-4 h-4 text-indigo-400" /> Receipt Customization
                    </div>

                    <div>
                        <label className={labelClass}>Receipt Footer Message</label>
                        <textarea
                            rows={2}
                            value={receiptFooter}
                            onChange={e => setReceiptFooter(e.target.value)}
                            className={inputClass}
                            placeholder="Thank you for choosing our pharmacy! Prescriptions cannot be returned once dispensed."
                        />
                    </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" /> {loading ? 'Saving Changes...' : 'Save Configuration'}
                    </button>
                </div>

            </form>
        </div>
    );
};