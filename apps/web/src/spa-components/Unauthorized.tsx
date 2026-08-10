import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export const Unauthorized: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-gray-100">
            <div className="max-w-md w-full text-center space-y-6 bg-gray-900 border border-gray-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-red-500 via-rose-500 to-amber-500" />
                
                <div className="inline-flex p-4 bg-rose-500/10 text-rose-500 rounded-2xl border border-rose-500/20">
                    <ShieldAlert className="w-12 h-12 stroke-[1.5]" />
                </div>
                
                <div className="space-y-2">
                    <h1 className="text-2xl font-extrabold tracking-tight text-white">Access Denied</h1>
                    <p className="text-sm text-gray-400 leading-relaxed">
                        You do not have the required role or permissions to view this system module. If you believe this is an error, please contact your store Owner.
                    </p>
                </div>

                <div className="pt-4 border-t border-gray-800 flex justify-center">
                    <Link
                        to="/dashboard"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-800 text-white rounded-xl text-sm font-semibold hover:bg-gray-700 transition"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Return to Dashboard</span>
                    </Link>
                </div>
            </div>
        </div>
    );
};
