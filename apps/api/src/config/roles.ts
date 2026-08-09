export const SYSTEM_ROLES = {
    OWNER: 'OWNER',
    PHARMACIST: 'PHARMACIST',
    CASHIER: 'CASHIER',
} as const;

export const PERMISSIONS = {
    // Inventory
    VIEW_INVENTORY: 'inventory:view',
    MANAGE_INVENTORY: 'inventory:manage',

    // Sales / POS
    PROCESS_SALE: 'sales:process',
    VIEW_SALES: 'sales:view',

    // Purchase Orders
    MANAGE_PURCHASE_ORDERS: 'po:manage',       // create, approve, cancel — Owner only
    RECEIVE_PURCHASE_ORDERS: 'po:receive',     // receive delivered goods — Owner + Pharmacist

    // Suppliers
    VIEW_SUPPLIERS: 'suppliers:view',          // view list & details — Owner + Pharmacist
    MANAGE_SUPPLIERS: 'suppliers:manage',      // create, edit, delete, financials — Owner only

    // Users & Employees
    MANAGE_USERS: 'users:manage',

    // Settings
    MANAGE_SETTINGS: 'settings:manage',

    // Reports
    VIEW_REPORTS: 'reports:view',

    // Audit Logs
    VIEW_AUDIT_LOGS: 'audit:view',
} as const;

// Role-to-Permission mapping matrix
export const ROLE_PERMISSIONS: Record<string, string[]> = {
    [SYSTEM_ROLES.OWNER]: Object.values(PERMISSIONS), // Owner has all permissions

    [SYSTEM_ROLES.PHARMACIST]: [
        PERMISSIONS.VIEW_INVENTORY,
        PERMISSIONS.MANAGE_INVENTORY,
        PERMISSIONS.PROCESS_SALE,
        PERMISSIONS.VIEW_SALES,
        PERMISSIONS.RECEIVE_PURCHASE_ORDERS,
        PERMISSIONS.VIEW_SUPPLIERS,
        PERMISSIONS.VIEW_REPORTS,
    ],

    [SYSTEM_ROLES.CASHIER]: [
        PERMISSIONS.VIEW_INVENTORY,
        PERMISSIONS.PROCESS_SALE,
        PERMISSIONS.VIEW_SALES,
    ],
};