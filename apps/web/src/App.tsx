import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './spa-components/Login';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';

// Module Page Components
import { Dashboard } from './spa-components/modules/Dashboard';
import { InventoryPage } from './spa-components/modules/Inventory';
import { POSPage } from './spa-components/modules/POS';
import { PurchaseOrdersPage } from './spa-components/modules/PurchaseOrders';
import { UsersManagementPage } from './spa-components/modules/UsersManagement';
import { SettingsPage } from './spa-components/modules/Settings';
import { SuppliersPage } from './spa-components/modules/Suppliers';
import { CustomersPage } from './spa-components/modules/Customers';
import { ReportsPage } from './spa-components/modules/Reports';
import { AuditLogsPage } from './spa-components/modules/AuditLogs';

import { Unauthorized } from './spa-components/Unauthorized';

export function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/unauthorized" element={<Unauthorized />} />

                {/* Protected Layout Wrapper */}
                <Route element={<ProtectedRoute />}>
                    <Route element={<AppLayout />}>
                        {/* Common Routes accessible to all authenticated roles */}
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/inventory" element={<InventoryPage />} />
                        <Route path="/pos" element={<POSPage />} />
                        <Route path="/customers" element={<CustomersPage />} />

                        {/* Restricted to Owner and Pharmacist */}
                        <Route element={<ProtectedRoute allowedRoles={['OWNER', 'PHARMACIST']} />}>
                            <Route path="/purchases" element={<PurchaseOrdersPage />} />
                            <Route path="/suppliers" element={<SuppliersPage />} />
                            <Route path="/reports" element={<ReportsPage />} />
                        </Route>

                        {/* Restricted to Owner Only */}
                        <Route element={<ProtectedRoute allowedRoles={['OWNER']} />}>
                            <Route path="/audit" element={<AuditLogsPage />} />
                            <Route path="/users" element={<UsersManagementPage />} />
                            <Route path="/settings" element={<SettingsPage />} />
                        </Route>
                    </Route>
                </Route>

                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;