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

export function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />

                {/* Protected Layout Wrapper */}
                <Route element={<ProtectedRoute />}>
                    <Route element={<AppLayout />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/inventory" element={<InventoryPage />} />
                        <Route path="/pos" element={<POSPage />} />
                        <Route path="/purchases" element={<PurchaseOrdersPage />} />
                        <Route path="/suppliers" element={<SuppliersPage />} />
                        <Route path="/customers" element={<CustomersPage />} />
                        <Route path="/reports" element={<ReportsPage />} />
                        <Route path="/audit" element={<AuditLogsPage />} />
                        <Route path="/users" element={<UsersManagementPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                    </Route>
                </Route>

                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;