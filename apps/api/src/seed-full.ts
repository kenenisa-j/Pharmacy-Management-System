import dotenv from 'dotenv';
dotenv.config();

import {
    db,
    users,
    roles,
    employees,
    settings,
    categories,
    manufacturers,
    suppliers,
    medicines,
    inventory,
    sales,
    saleItems,
} from 'database';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

async function seed() {
    console.log('🌱 Starting full database seed...\n');

    // 1. Roles
    console.log('📋 Creating roles...');
    const roleRecords = [
        { name: 'OWNER', description: 'Full access to all system features' },
        { name: 'ADMIN', description: 'Administrative access' },
        { name: 'PHARMACIST', description: 'Medicines and prescription management' },
        { name: 'CASHIER', description: 'POS and sales operations' },
        { name: 'INVENTORY_MANAGER', description: 'Stock control and purchase orders' },
    ];
    const roleMap: Record<string, string> = {};
    for (const r of roleRecords) {
        const [created] = await db.insert(roles).values(r).returning();
        roleMap[r.name] = created.id;
    }
    console.log('   ✓ Roles created');

    // 2. Users & Employees
    console.log('👥 Creating users and employees...');
    const demoUsers = [
        {
            email: 'owner@pharmacy.com',
            password: 'Owner@1234',
            roleName: 'OWNER',
            firstName: 'Samuel',
            lastName: 'Tesfaye',
            phone: '+251911000001',
        },
        {
            email: 'admin@pharmacy.com',
            password: 'Admin@1234',
            roleName: 'ADMIN',
            firstName: 'Hana',
            lastName: 'Girma',
            phone: '+251911000002',
        },
        {
            email: 'pharmacist@pharmacy.com',
            password: 'Pharma@1234',
            roleName: 'PHARMACIST',
            firstName: 'Dawit',
            lastName: 'Bekele',
            phone: '+251911000003',
        },
        {
            email: 'cashier@pharmacy.com',
            password: 'Cashier@1234',
            roleName: 'CASHIER',
            firstName: 'Tigist',
            lastName: 'Alemu',
            phone: '+251911000004',
        },
        {
            email: 'inventory@pharmacy.com',
            password: 'Inventory@1234',
            roleName: 'INVENTORY_MANAGER',
            firstName: 'Yonas',
            lastName: 'Haile',
            phone: '+251911000005',
        },
    ];

    const userMap: Record<string, string> = {};
    for (const u of demoUsers) {
        const passwordHash = await bcrypt.hash(u.password, SALT_ROUNDS);
        const [newUser] = await db.insert(users).values({
            email: u.email,
            passwordHash,
            roleId: roleMap[u.roleName],
        }).returning();

        await db.insert(employees).values({
            userId: newUser.id,
            firstName: u.firstName,
            lastName: u.lastName,
            phone: u.phone,
            address: 'Addis Ababa, Ethiopia',
        });

        userMap[u.roleName] = newUser.id;
    }
    console.log('   ✓ Users and employees created');

    // 3. Settings
    console.log('⚙️ Seeding settings...');
    await db.insert(settings).values({
        storeName: 'Amanuel Pharmacy ERP',
        phone: '+251911000000',
        email: 'info@amanuelpharmacy.com',
        address: 'Bole Road, Addis Ababa, Ethiopia',
        currency: 'ETB',
        taxRate: 15,
        receiptFooter: 'Thank you for choosing Amanuel Pharmacy. Get well soon!',
    });
    console.log('   ✓ Settings created');

    // 4. Categories
    console.log('📦 Seeding categories...');
    const catList = [
        { name: 'Antibiotics', description: 'Medicines that inhibit growth of or destroy microorganisms' },
        { name: 'Analgesics', description: 'Medicines used to achieve relief from pain' },
        { name: 'Cardiovascular', description: 'Medicines for heart and circulatory conditions' },
        { name: 'Vitamins', description: 'Organic compounds essential for normal growth and nutrition' },
        { name: 'Dermatology', description: 'Creams, ointments and medicines for skin conditions' },
    ];
    const catMap: Record<string, string> = {};
    for (const c of catList) {
        const [created] = await db.insert(categories).values(c).returning();
        catMap[c.name] = created.id;
    }
    console.log('   ✓ Categories created');

    // 5. Manufacturers
    console.log('🏭 Seeding manufacturers...');
    const mfgList = [
        { name: 'Pfizer Inc.', country: 'USA', contactEmail: 'info@pfizer.com' },
        { name: 'Novartis AG', country: 'Switzerland', contactEmail: 'info@novartis.com' },
        { name: 'GlaxoSmithKline plc', country: 'UK', contactEmail: 'info@gsk.com' },
        { name: 'Sanofi S.A.', country: 'France', contactEmail: 'info@sanofi.com' },
    ];
    const mfgMap: Record<string, string> = {};
    for (const m of mfgList) {
        const [created] = await db.insert(manufacturers).values(m).returning();
        mfgMap[m.name] = created.id;
    }
    console.log('   ✓ Manufacturers created');

    // 6. Suppliers
    console.log('🚚 Seeding suppliers...');
    const supList = [
        { name: 'Medilink Distributors', contactPerson: 'Abebe Kebede', phone: '+251911223344', email: 'sales@medilink.com', address: 'Bole, Addis Ababa' },
        { name: 'Global Pharma Suppliers', contactPerson: 'Aster Tolosa', phone: '+251911556677', email: 'info@globalpharma.com', address: 'Merkato, Addis Ababa' },
        { name: 'East Africa Pharmaceuticals', contactPerson: 'Dr. John Doe', phone: '+251911998877', email: 'contact@eap.com', address: 'Akaki Kality, Addis Ababa' },
    ];
    const supMap: Record<string, string> = {};
    for (const s of supList) {
        const [created] = await db.insert(suppliers).values(s).returning();
        supMap[s.name] = created.id;
    }
    console.log('   ✓ Suppliers created');

    // 7. Medicines & Inventory
    console.log('💊 Seeding medicines and inventory...');
    const medList = [
        {
            name: 'Amoxicillin 500mg',
            genericName: 'Amoxicillin',
            brand: 'Amoxil',
            barcode: '6001234567890',
            batchNumber: 'AMX-2026-01',
            categoryName: 'Antibiotics',
            manufacturerName: 'Pfizer Inc.',
            supplierName: 'East Africa Pharmaceuticals',
            unitPrice: '12.50',
            costPrice: '8.00',
            expiryOffsetDays: 365,
            minStockLevel: 20,
            stockQuantity: 150,
            locationInStore: 'Shelf A1, Row 1',
        },
        {
            name: 'Paracetamol 500mg',
            genericName: 'Paracetamol',
            brand: 'Panadol',
            barcode: '6001234567891',
            batchNumber: 'PAR-2026-05',
            categoryName: 'Analgesics',
            manufacturerName: 'Novartis AG',
            supplierName: 'Medilink Distributors',
            unitPrice: '3.00',
            costPrice: '1.50',
            expiryOffsetDays: 180,
            minStockLevel: 15,
            stockQuantity: 5, // LOW STOCK
            locationInStore: 'Shelf B2, Row 3',
        },
        {
            name: 'Ibuprofen 400mg',
            genericName: 'Ibuprofen',
            brand: 'Advil',
            barcode: '6001234567892',
            batchNumber: 'IBU-2026-08',
            categoryName: 'Analgesics',
            manufacturerName: 'GlaxoSmithKline plc',
            supplierName: 'Medilink Distributors',
            unitPrice: '6.00',
            costPrice: '3.50',
            expiryOffsetDays: 240,
            minStockLevel: 10,
            stockQuantity: 8, // LOW STOCK
            locationInStore: 'Shelf B2, Row 4',
        },
        {
            name: 'Lipitor 20mg',
            genericName: 'Atorvastatin',
            brand: 'Lipitor',
            barcode: '6001234567893',
            batchNumber: 'LIP-2026-11',
            categoryName: 'Cardiovascular',
            manufacturerName: 'Pfizer Inc.',
            supplierName: 'Global Pharma Suppliers',
            unitPrice: '45.00',
            costPrice: '30.00',
            expiryOffsetDays: 30, // EXPIRING SOON!
            minStockLevel: 10,
            stockQuantity: 45,
            locationInStore: 'Shelf C1, Row 2',
        },
        {
            name: 'Vitamin C 500mg chewable',
            genericName: 'Ascorbic Acid',
            brand: 'C-Vit',
            barcode: '6001234567894',
            batchNumber: 'VIT-2026-02',
            categoryName: 'Vitamins',
            manufacturerName: 'Sanofi S.A.',
            supplierName: 'East Africa Pharmaceuticals',
            unitPrice: '8.00',
            costPrice: '4.00',
            expiryOffsetDays: 450,
            minStockLevel: 30,
            stockQuantity: 200,
            locationInStore: 'Shelf D3, Row 1',
        },
    ];

    const medMap: Record<string, string> = {};
    for (const m of medList) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + m.expiryOffsetDays);
        const expiryStr = expiryDate.toISOString().split('T')[0];

        const [createdMed] = await db.insert(medicines).values({
            name: m.name,
            genericName: m.genericName,
            brand: m.brand,
            barcode: m.barcode,
            batchNumber: m.batchNumber,
            categoryId: catMap[m.categoryName],
            manufacturerId: mfgMap[m.manufacturerName],
            supplierId: supMap[m.supplierName],
            unitPrice: m.unitPrice,
            costPrice: m.costPrice,
            expiryDate: expiryStr,
            minStockLevel: m.minStockLevel,
        }).returning();

        await db.insert(inventory).values({
            medicineId: createdMed.id,
            stockQuantity: m.stockQuantity,
            locationInStore: m.locationInStore,
            lastRestockedDate: new Date(),
        });

        medMap[m.name] = createdMed.id;
    }
    console.log('   ✓ Medicines and Inventory records created');

    // 8. Sales & Sale Items
    console.log('📈 Seeding recent sales...');
    const salesData = [
        {
            offsetDays: 3,
            receipt: 'REC-1001',
            invoice: 'INV-1001',
            custName: 'Aster Girma',
            custPhone: '+251911111111',
            paymentMethod: 'CASH',
            items: [
                { medName: 'Amoxicillin 500mg', qty: 2, price: '12.50' },
                { medName: 'Paracetamol 500mg', qty: 1, price: '3.00' },
            ]
        },
        {
            offsetDays: 2,
            receipt: 'REC-1002',
            invoice: 'INV-1002',
            custName: 'Walk-in Customer',
            custPhone: '',
            paymentMethod: 'MOBILE_MONEY',
            items: [
                { medName: 'Lipitor 20mg', qty: 1, price: '45.00' },
                { medName: 'Vitamin C 500mg chewable', qty: 5, price: '8.00' },
            ]
        },
        {
            offsetDays: 1,
            receipt: 'REC-1003',
            invoice: 'INV-1003',
            custName: 'Bekele Shiferaw',
            custPhone: '+251911222222',
            paymentMethod: 'CARD',
            items: [
                { medName: 'Ibuprofen 400mg', qty: 3, price: '6.00' },
                { medName: 'Amoxicillin 500mg', qty: 1, price: '12.50' },
            ]
        },
        {
            offsetDays: 0,
            receipt: 'REC-1004',
            invoice: 'INV-1004',
            custName: 'Walk-in Customer',
            custPhone: '',
            paymentMethod: 'CASH',
            items: [
                { medName: 'Vitamin C 500mg chewable', qty: 2, price: '8.00' },
            ]
        }
    ];

    for (const s of salesData) {
        const saleDate = new Date();
        saleDate.setDate(saleDate.getDate() - s.offsetDays);

        let subtotal = 0;
        for (const item of s.items) {
            subtotal += Number(item.price) * item.qty;
        }
        const totalAmount = subtotal; // No discount/tax to keep it simple

        const [createdSale] = await db.insert(sales).values({
            receiptNumber: s.receipt,
            invoiceNumber: s.invoice,
            cashierId: userMap['CASHIER'],
            customerName: s.custName,
            customerPhone: s.custPhone,
            subtotal: subtotal.toString(),
            discountAmount: '0.00',
            totalAmount: totalAmount.toString(),
            paymentMethod: s.paymentMethod,
            paymentStatus: 'PAID',
            createdAt: saleDate,
        }).returning();

        for (const item of s.items) {
            const totalPrice = Number(item.price) * item.qty;
            await db.insert(saleItems).values({
                saleId: createdSale.id,
                medicineId: medMap[item.medName],
                quantity: item.qty,
                unitPrice: item.price,
                totalPrice: totalPrice.toString(),
            });
        }
    }
    console.log('   ✓ Sales trends and line items created');

    console.log('\n✅ Full database seeding completed successfully!');
    console.log('='.repeat(60));
    console.log('🔑 DEMO LOGIN CREDENTIALS');
    console.log('='.repeat(60));
    for (const u of demoUsers) {
        console.log(`  Role: ${u.roleName.padEnd(18)} | Email: ${u.email.padEnd(30)} | Password: ${u.password}`);
    }
    console.log('='.repeat(60));
    process.exit(0);
}

seed().catch((err) => {
    console.error('❌ Full seeding failed:', err);
    process.exit(1);
});
