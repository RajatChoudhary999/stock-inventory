import bcrypt from 'bcryptjs';
import { PrismaClient, OrderStatus, OrderType, MovementReason } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Generates an ISO Date offset by days from now with deterministic hours/minutes.
 */
function daysAgo(days: number, hour = 10, minute = 30): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  console.log('--- Starting StockFlow Seed ---');

  // ==========================================
  // 1. DEMO USERS
  // ==========================================
  const passwordHash = await bcrypt.hash('Password123!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@stockflow.dev' },
    update: { passwordHash, isActive: true },
    create: { name: 'Admin User', email: 'admin@stockflow.dev', passwordHash, role: 'ADMIN' },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@stockflow.dev' },
    update: { passwordHash, isActive: true },
    create: { name: 'Manager User', email: 'manager@stockflow.dev', passwordHash, role: 'MANAGER' },
  });

  const staff = await prisma.user.upsert({
    where: { email: 'staff@stockflow.dev' },
    update: { passwordHash, isActive: true },
    create: { name: 'Staff User', email: 'staff@stockflow.dev', passwordHash, role: 'STAFF' },
  });

  console.log('✓ Users seeded (admin, manager, staff)');

  // ==========================================
  // 2. CATEGORIES
  // ==========================================
  const categoriesData = [
    { name: 'Electronics', description: 'Gadgets, peripherals, and power accessories' },
    { name: 'Stationery', description: 'Paper, notebooks, pens, and writing essentials' },
    { name: 'Office Supplies', description: 'Desk organizers, staplers, paperclips, and tools' },
    { name: 'Accessories', description: 'Ergonomic stands, desk pads, and cable management' },
  ];

  const categories: Record<string, number> = {};
  for (const c of categoriesData) {
    const record = await prisma.category.upsert({
      where: { name: c.name },
      update: { description: c.description },
      create: c,
    });
    categories[c.name] = record.id;
  }
  console.log(`✓ Categories seeded (${Object.keys(categories).length} categories)`);

  // ==========================================
  // 3. SUPPLIERS
  // ==========================================
  const suppliersData = [
    { name: 'Acme Distributors', email: 'sales@acme.example', phone: '+91 90000 00001', address: 'Plot 42, Okhla Phase III, New Delhi' },
    { name: 'Global Stationery Ltd', email: 'orders@globalstat.example', phone: '+91 90000 00002', address: '12 Sector 18, Gurugram' },
    { name: 'Apex Office Solutions', email: 'contact@apexoffice.example', phone: '+91 90000 00003', address: 'Industrial Area Phase 1, Chandigarh' },
    { name: 'Nexus Tech Importers', email: 'import@nexustech.example', phone: '+91 90000 00004', address: 'Electronic City, Bengaluru' },
  ];

  const suppliers: Record<string, number> = {};
  for (const s of suppliersData) {
    let supplier = await prisma.supplier.findFirst({ where: { name: s.name } });
    if (!supplier) {
      supplier = await prisma.supplier.create({ data: s });
    }
    suppliers[s.name] = supplier.id;
  }
  console.log(`✓ Suppliers seeded (${Object.keys(suppliers).length} suppliers)`);

  // ==========================================
  // 4. PRODUCTS (32 items across 4 categories)
  // Healthy, Low-stock, and Out-of-stock variations
  // ==========================================
  const rawProducts = [
    // Electronics (8)
    { sku: 'ELEC-001', name: 'Wireless Ergonomic Mouse', category: 'Electronics', supplier: 'Nexus Tech Importers', unitPrice: 799, costPrice: 450, quantityInStock: 40, reorderLevel: 10, description: '2.4GHz wireless optical mouse with quiet click buttons' },
    { sku: 'ELEC-002', name: 'USB-C Fast Charger 65W', category: 'Electronics', supplier: 'Nexus Tech Importers', unitPrice: 1899, costPrice: 1100, quantityInStock: 6, reorderLevel: 10, description: 'GaN wall charger compatible with laptops and smartphones' },
    { sku: 'ELEC-003', name: 'Noise-Cancelling Wireless Earbuds', category: 'Electronics', supplier: 'Nexus Tech Importers', unitPrice: 3499, costPrice: 1900, quantityInStock: 28, reorderLevel: 10, description: 'Active noise cancellation with 30-hour battery life' },
    { sku: 'ELEC-004', name: 'Mechanical Keyboard RGB (Blue Switch)', category: 'Electronics', supplier: 'Acme Distributors', unitPrice: 4599, costPrice: 2600, quantityInStock: 0, reorderLevel: 8, description: 'Tactile mechanical keys with customizable RGB backlighting' },
    { sku: 'ELEC-005', name: 'HD Webcam 1080p with Dual Mic', category: 'Electronics', supplier: 'Acme Distributors', unitPrice: 2499, costPrice: 1400, quantityInStock: 4, reorderLevel: 10, description: 'Auto-focus widescreen video conferencing camera' },
    { sku: 'ELEC-006', name: '7-in-1 USB-C Multiport Hub', category: 'Electronics', supplier: 'Nexus Tech Importers', unitPrice: 2999, costPrice: 1650, quantityInStock: 35, reorderLevel: 12, description: 'HDMI 4K, SD reader, USB 3.0, and 100W PD pass-through' },
    { sku: 'ELEC-007', name: 'Braided HDMI 2.1 Cable 2m', category: 'Electronics', supplier: 'Acme Distributors', unitPrice: 699, costPrice: 320, quantityInStock: 65, reorderLevel: 15, description: 'Supports 8K@60Hz and 4K@120Hz with gold plated connectors' },
    { sku: 'ELEC-008', name: 'Portable Power Bank 20000mAh', category: 'Electronics', supplier: 'Nexus Tech Importers', unitPrice: 2199, costPrice: 1200, quantityInStock: 0, reorderLevel: 10, description: 'Dual USB-A & Type-C 22.5W fast charging battery pack' },

    // Stationery (8)
    { sku: 'STAT-001', name: 'A4 Hardcover Notebook (Pack of 5)', category: 'Stationery', supplier: 'Global Stationery Ltd', unitPrice: 299, costPrice: 160, quantityInStock: 120, reorderLevel: 25, description: 'Rule-lined 80 GSM paper with water-resistant hardcover' },
    { sku: 'STAT-002', name: 'Gel Pens 0.5mm (Box of 20)', category: 'Stationery', supplier: 'Global Stationery Ltd', unitPrice: 349, costPrice: 190, quantityInStock: 45, reorderLevel: 20, description: 'Smooth flow quick-drying blue ink pens' },
    { sku: 'STAT-003', name: 'Pastel Sticky Notes 3x3 (12 Pads)', category: 'Stationery', supplier: 'Global Stationery Ltd', unitPrice: 399, costPrice: 180, quantityInStock: 85, reorderLevel: 20, description: 'Super sticky removable notes in assorted pastel shades' },
    { sku: 'STAT-004', name: 'Chisel Tip Highlighters (Pack of 6)', category: 'Stationery', supplier: 'Global Stationery Ltd', unitPrice: 249, costPrice: 110, quantityInStock: 8, reorderLevel: 15, description: 'Fluorescent non-toxic markers for text highlighting' },
    { sku: 'STAT-005', name: 'Permanent Marker Set (8 Colors)', category: 'Stationery', supplier: 'Global Stationery Ltd', unitPrice: 429, costPrice: 210, quantityInStock: 50, reorderLevel: 15, description: 'Waterproof fade-resistant bullet tip markers' },
    { sku: 'STAT-006', name: 'Premium Sketch Pad A3 (50 Sheets)', category: 'Stationery', supplier: 'Global Stationery Ltd', unitPrice: 499, costPrice: 240, quantityInStock: 3, reorderLevel: 10, description: 'Heavyweight cartridge paper suitable for graphite and ink' },
    { sku: 'STAT-007', name: 'Retractable Ballpoint Pens (Pack of 50)', category: 'Stationery', supplier: 'Global Stationery Ltd', unitPrice: 599, costPrice: 280, quantityInStock: 0, reorderLevel: 20, description: 'Bulk office pack with comfortable rubberized grip' },
    { sku: 'STAT-008', name: 'Correction Tape 5mm x 6m (Pack of 4)', category: 'Stationery', supplier: 'Global Stationery Ltd', unitPrice: 219, costPrice: 95, quantityInStock: 60, reorderLevel: 15, description: 'Instant dry tape dispenser for tidy mistake correction' },

    // Office Supplies (8)
    { sku: 'OFFC-001', name: 'Heavy Duty Desktop Stapler', category: 'Office Supplies', supplier: 'Apex Office Solutions', unitPrice: 649, costPrice: 340, quantityInStock: 30, reorderLevel: 8, description: 'Metal body stapler with capacity of up to 40 sheets' },
    { sku: 'OFFC-002', name: '3-Tier Metal Mesh Document Tray', category: 'Office Supplies', supplier: 'Apex Office Solutions', unitPrice: 899, costPrice: 480, quantityInStock: 22, reorderLevel: 6, description: 'Sliding tiered desk file organizer for letters and folders' },
    { sku: 'OFFC-003', name: 'Desktop Acrylic Tape Dispenser', category: 'Office Supplies', supplier: 'Apex Office Solutions', unitPrice: 329, costPrice: 150, quantityInStock: 5, reorderLevel: 10, description: 'Weighted non-skid base with serrated stainless steel blade' },
    { sku: 'OFFC-004', name: 'Steel Vinyl Paper Clips (Box of 500)', category: 'Office Supplies', supplier: 'Apex Office Solutions', unitPrice: 189, costPrice: 80, quantityInStock: 110, reorderLevel: 25, description: 'Rust-resistant vinyl coated colorful paper fasteners' },
    { sku: 'OFFC-005', name: 'Magnetic Whiteboard Eraser & Cleaner', category: 'Office Supplies', supplier: 'Apex Office Solutions', unitPrice: 279, costPrice: 120, quantityInStock: 40, reorderLevel: 10, description: 'Felt cleaning pad with 100ml streak-free surface spray' },
    { sku: 'OFFC-006', name: 'Heavy Duty 2-Hole Puncher', category: 'Office Supplies', supplier: 'Apex Office Solutions', unitPrice: 549, costPrice: 270, quantityInStock: 0, reorderLevel: 5, description: '30-sheet punch capacity with calibrated alignment guide' },
    { sku: 'OFFC-007', name: 'Thermal Laminating Machine A4', category: 'Office Supplies', supplier: 'Apex Office Solutions', unitPrice: 2499, costPrice: 1350, quantityInStock: 2, reorderLevel: 5, description: 'Hot and cold laminator with fast 2-minute warmup' },
    { sku: 'OFFC-008', name: 'Metal Mesh Wastebasket 18L', category: 'Office Supplies', supplier: 'Apex Office Solutions', unitPrice: 499, costPrice: 230, quantityInStock: 35, reorderLevel: 10, description: 'Reinforced rim circular trash bin for workplace desks' },

    // Accessories (8)
    { sku: 'ACCS-001', name: 'Aluminum Laptop Cooling Stand', category: 'Accessories', supplier: 'Apex Office Solutions', unitPrice: 1499, costPrice: 780, quantityInStock: 42, reorderLevel: 10, description: 'Foldable 6-angle ergonomic riser for MacBook and laptops' },
    { sku: 'ACCS-002', name: 'PU Leather Desk Mat 90x40cm', category: 'Accessories', supplier: 'Apex Office Solutions', unitPrice: 799, costPrice: 380, quantityInStock: 55, reorderLevel: 15, description: 'Waterproof dual-sided oversized mousepad and desk blotter' },
    { sku: 'ACCS-003', name: 'Silicone Cable Clips (Pack of 20)', category: 'Accessories', supplier: 'Nexus Tech Importers', unitPrice: 299, costPrice: 120, quantityInStock: 95, reorderLevel: 20, description: 'Self-adhesive wire drop holders for power and charging cords' },
    { sku: 'ACCS-004', name: 'Screen Cleaning Spray & Microfiber Kit', category: 'Accessories', supplier: 'Nexus Tech Importers', unitPrice: 349, costPrice: 140, quantityInStock: 7, reorderLevel: 15, description: 'Alcohol-free anti-static formula safe for all screens' },
    { sku: 'ACCS-005', name: 'Wooden Monitor Riser with Shelf', category: 'Accessories', supplier: 'Apex Office Solutions', unitPrice: 1899, costPrice: 950, quantityInStock: 4, reorderLevel: 8, description: 'Solid wood dual monitor shelf with keyboard storage' },
    { sku: 'ACCS-006', name: 'Ergonomic Vertical Wireless Mouse', category: 'Accessories', supplier: 'Nexus Tech Importers', unitPrice: 1699, costPrice: 880, quantityInStock: 0, reorderLevel: 8, description: 'Natural handshake position mouse reducing wrist fatigue' },
    { sku: 'ACCS-007', name: 'Under-Desk Dual Headphone Hanger', category: 'Accessories', supplier: 'Apex Office Solutions', unitPrice: 599, costPrice: 260, quantityInStock: 38, reorderLevel: 10, description: 'Rotating adhesive clamp mount with cable organizer' },
    { sku: 'ACCS-008', name: 'Memory Foam Keyboard Wrist Rest', category: 'Accessories', supplier: 'Apex Office Solutions', unitPrice: 699, costPrice: 310, quantityInStock: 50, reorderLevel: 12, description: 'Breathable ergonomic cushion support for mechanical keyboards' },
  ];

  const productBySku: Record<string, any> = {};
  for (const p of rawProducts) {
    const record = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {
        name: p.name,
        categoryId: categories[p.category],
        supplierId: suppliers[p.supplier],
        unitPrice: p.unitPrice,
        costPrice: p.costPrice,
        quantityInStock: p.quantityInStock,
        reorderLevel: p.reorderLevel,
        description: p.description,
        isActive: true,
      },
      create: {
        sku: p.sku,
        name: p.name,
        categoryId: categories[p.category],
        supplierId: suppliers[p.supplier],
        unitPrice: p.unitPrice,
        costPrice: p.costPrice,
        quantityInStock: p.quantityInStock,
        reorderLevel: p.reorderLevel,
        description: p.description,
        isActive: true,
      },
    });
    productBySku[p.sku] = record;
  }
  console.log(`✓ Products seeded (${Object.keys(productBySku).length} products total)`);

  // ==========================================
  // 5. SALES & PURCHASE ORDERS (20 orders across the last 14 days)
  // Ensures sales trend, KPIs, and top products render accurately.
  // ==========================================
  const demoOrdersData = [
    {
      orderNumber: 'DEMO-SO-1001',
      type: 'SALE' as OrderType,
      status: 'CONFIRMED' as OrderStatus,
      customerName: 'TechNova Labs',
      createdById: admin.id,
      daysAgo: 13,
      items: [
        { sku: 'ELEC-001', quantity: 5 },
        { sku: 'ACCS-001', quantity: 2 },
      ],
    },
    {
      orderNumber: 'DEMO-SO-1002',
      type: 'SALE' as OrderType,
      status: 'FULFILLED' as OrderStatus,
      customerName: 'Acme Corp',
      createdById: manager.id,
      daysAgo: 12,
      items: [
        { sku: 'STAT-001', quantity: 15 },
        { sku: 'STAT-002', quantity: 8 },
        { sku: 'STAT-003', quantity: 6 },
      ],
    },
    {
      orderNumber: 'DEMO-PO-2001',
      type: 'PURCHASE' as OrderType,
      status: 'FULFILLED' as OrderStatus,
      supplierName: 'Nexus Tech Importers',
      createdById: manager.id,
      daysAgo: 11,
      items: [
        { sku: 'ELEC-001', quantity: 30 },
        { sku: 'ELEC-006', quantity: 20 },
      ],
    },
    {
      orderNumber: 'DEMO-SO-1003',
      type: 'SALE' as OrderType,
      status: 'FULFILLED' as OrderStatus,
      customerName: 'Metro Logistics',
      createdById: staff.id,
      daysAgo: 10,
      items: [
        { sku: 'OFFC-001', quantity: 4 },
        { sku: 'OFFC-004', quantity: 12 },
      ],
    },
    {
      orderNumber: 'DEMO-SO-1004',
      type: 'SALE' as OrderType,
      status: 'CONFIRMED' as OrderStatus,
      customerName: 'GreenLeaf Retail',
      createdById: admin.id,
      daysAgo: 9,
      items: [
        { sku: 'ELEC-003', quantity: 4 },
        { sku: 'ACCS-002', quantity: 6 },
      ],
    },
    {
      orderNumber: 'DEMO-PO-2002',
      type: 'PURCHASE' as OrderType,
      status: 'FULFILLED' as OrderStatus,
      supplierName: 'Global Stationery Ltd',
      createdById: manager.id,
      daysAgo: 8,
      items: [
        { sku: 'STAT-001', quantity: 50 },
        { sku: 'STAT-003', quantity: 40 },
      ],
    },
    {
      orderNumber: 'DEMO-SO-1005',
      type: 'SALE' as OrderType,
      status: 'CANCELLED' as OrderStatus,
      customerName: 'BlueSky Design',
      createdById: staff.id,
      daysAgo: 8,
      items: [
        { sku: 'ELEC-004', quantity: 2 },
      ],
    },
    {
      orderNumber: 'DEMO-SO-1006',
      type: 'SALE' as OrderType,
      status: 'FULFILLED' as OrderStatus,
      customerName: 'Pinnacle Media',
      createdById: admin.id,
      daysAgo: 7,
      items: [
        { sku: 'ELEC-005', quantity: 3 },
        { sku: 'ELEC-006', quantity: 5 },
      ],
    },
    {
      orderNumber: 'DEMO-SO-1007',
      type: 'SALE' as OrderType,
      status: 'CONFIRMED' as OrderStatus,
      customerName: 'Sunrise Cafe',
      createdById: manager.id,
      daysAgo: 6,
      items: [
        { sku: 'STAT-005', quantity: 6 },
        { sku: 'OFFC-005', quantity: 4 },
      ],
    },
    {
      orderNumber: 'DEMO-PO-2003',
      type: 'PURCHASE' as OrderType,
      status: 'FULFILLED' as OrderStatus,
      supplierName: 'Apex Office Solutions',
      createdById: admin.id,
      daysAgo: 5,
      items: [
        { sku: 'OFFC-002', quantity: 15 },
        { sku: 'OFFC-008', quantity: 25 },
      ],
    },
    {
      orderNumber: 'DEMO-SO-1008',
      type: 'SALE' as OrderType,
      status: 'FULFILLED' as OrderStatus,
      customerName: 'Orbit Software Inc',
      createdById: staff.id,
      daysAgo: 5,
      items: [
        { sku: 'ACCS-001', quantity: 6 },
        { sku: 'ACCS-008', quantity: 8 },
      ],
    },
    {
      orderNumber: 'DEMO-SO-1009',
      type: 'SALE' as OrderType,
      status: 'CONFIRMED' as OrderStatus,
      customerName: 'Nexus Ventures',
      createdById: admin.id,
      daysAgo: 4,
      items: [
        { sku: 'ELEC-007', quantity: 10 },
        { sku: 'ELEC-002', quantity: 4 },
      ],
    },
    {
      orderNumber: 'DEMO-SO-1010',
      type: 'SALE' as OrderType,
      status: 'FULFILLED' as OrderStatus,
      customerName: 'Zenith Architecture',
      createdById: manager.id,
      daysAgo: 3,
      items: [
        { sku: 'STAT-006', quantity: 4 },
        { sku: 'STAT-001', quantity: 12 },
      ],
    },
    {
      orderNumber: 'DEMO-PO-2004',
      type: 'PURCHASE' as OrderType,
      status: 'CONFIRMED' as OrderStatus,
      supplierName: 'Apex Office Solutions',
      createdById: manager.id,
      daysAgo: 3,
      items: [
        { sku: 'ACCS-001', quantity: 25 },
        { sku: 'ACCS-003', quantity: 50 },
      ],
    },
    {
      orderNumber: 'DEMO-SO-1011',
      type: 'SALE' as OrderType,
      status: 'CONFIRMED' as OrderStatus,
      customerName: 'Evergreen Media',
      createdById: staff.id,
      daysAgo: 2,
      items: [
        { sku: 'ELEC-001', quantity: 8 },
        { sku: 'ACCS-002', quantity: 5 },
      ],
    },
    {
      orderNumber: 'DEMO-SO-1012',
      type: 'SALE' as OrderType,
      status: 'PENDING' as OrderStatus,
      customerName: 'Silverline Logistics',
      createdById: admin.id,
      daysAgo: 2,
      items: [
        { sku: 'OFFC-002', quantity: 3 },
        { sku: 'OFFC-007', quantity: 1 },
      ],
    },
    {
      orderNumber: 'DEMO-PO-2005',
      type: 'PURCHASE' as OrderType,
      status: 'CONFIRMED' as OrderStatus,
      supplierName: 'Nexus Tech Importers',
      createdById: manager.id,
      daysAgo: 1,
      items: [
        { sku: 'ELEC-003', quantity: 20 },
        { sku: 'ELEC-007', quantity: 30 },
      ],
    },
    {
      orderNumber: 'DEMO-SO-1013',
      type: 'SALE' as OrderType,
      status: 'CONFIRMED' as OrderStatus,
      customerName: 'Apex Analytics',
      createdById: manager.id,
      daysAgo: 1,
      items: [
        { sku: 'ELEC-006', quantity: 4 },
        { sku: 'ACCS-007', quantity: 6 },
      ],
    },
    {
      orderNumber: 'DEMO-SO-1014',
      type: 'SALE' as OrderType,
      status: 'CONFIRMED' as OrderStatus,
      customerName: 'Vanguard Design Studio',
      createdById: admin.id,
      daysAgo: 0,
      items: [
        { sku: 'STAT-003', quantity: 10 },
        { sku: 'OFFC-004', quantity: 8 },
      ],
    },
    {
      orderNumber: 'DEMO-SO-1015',
      type: 'SALE' as OrderType,
      status: 'PENDING' as OrderStatus,
      customerName: 'CloudScale Systems',
      createdById: staff.id,
      daysAgo: 0,
      items: [
        { sku: 'ELEC-002', quantity: 2 },
        { sku: 'ACCS-005', quantity: 1 },
      ],
    },
  ];

  const orderMap: Record<string, any> = {};

  for (const o of demoOrdersData) {
    const createdAt = daysAgo(o.daysAgo, 11, 15);
    const supplierId = o.supplierName ? suppliers[o.supplierName] : null;

    // Calculate totalAmount accurately from line items
    let calculatedTotal = 0;
    const lineItemsData = o.items.map((i) => {
      const prod = productBySku[i.sku];
      const price = o.type === 'SALE' ? Number(prod.unitPrice) : Number(prod.costPrice);
      const lineTotal = price * i.quantity;
      calculatedTotal += lineTotal;
      return {
        productId: prod.id,
        quantity: i.quantity,
        unitPrice: price,
        lineTotal,
      };
    });

    const orderRecord = await prisma.order.upsert({
      where: { orderNumber: o.orderNumber },
      update: {
        type: o.type,
        status: o.status,
        customerName: o.customerName ?? null,
        supplierId,
        totalAmount: calculatedTotal,
        createdAt,
      },
      create: {
        orderNumber: o.orderNumber,
        type: o.type,
        status: o.status,
        customerName: o.customerName ?? null,
        supplierId,
        totalAmount: calculatedTotal,
        createdById: o.createdById,
        createdAt,
      },
    });

    orderMap[o.orderNumber] = orderRecord;

    // Maintain consistent order_items
    await prisma.orderItem.deleteMany({ where: { orderId: orderRecord.id } });
    await prisma.orderItem.createMany({
      data: lineItemsData.map((li) => ({
        orderId: orderRecord.id,
        productId: li.productId,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        lineTotal: li.lineTotal,
      })),
    });
  }

  console.log(`✓ Orders seeded (${demoOrdersData.length} orders: 15 SALE, 5 PURCHASE)`);

  // ==========================================
  // 6. STOCK MOVEMENTS (40 realistic ledger entries)
  // Demonstrates SALE, PURCHASE, ADJUSTMENT, RETURN, and DAMAGE with rich audit notes
  // ==========================================
  const movementsData = [
    { tag: 'DEMO-MOV-01', sku: 'ELEC-001', delta: 50, reason: 'PURCHASE' as MovementReason, user: manager.id, days: 14, order: 'DEMO-PO-2001', note: 'Vendor intake batch verification for ELEC-001' },
    { tag: 'DEMO-MOV-02', sku: 'ELEC-001', delta: -5, reason: 'SALE' as MovementReason, user: admin.id, days: 13, order: 'DEMO-SO-1001', note: 'Customer order DEMO-SO-1001 fulfillment' },
    { tag: 'DEMO-MOV-03', sku: 'STAT-001', delta: 100, reason: 'PURCHASE' as MovementReason, user: manager.id, days: 13, order: 'DEMO-PO-2002', note: 'Initial stock intake from Global Stationery' },
    { tag: 'DEMO-MOV-04', sku: 'STAT-001', delta: -15, reason: 'SALE' as MovementReason, user: manager.id, days: 12, order: 'DEMO-SO-1002', note: 'Corporate bulk stationery order fulfillment' },
    { tag: 'DEMO-MOV-05', sku: 'STAT-002', delta: -8, reason: 'SALE' as MovementReason, user: manager.id, days: 12, order: 'DEMO-SO-1002', note: 'Bulk pen order dispatched to Acme Corp' },
    { tag: 'DEMO-MOV-06', sku: 'ELEC-006', delta: 30, reason: 'PURCHASE' as MovementReason, user: manager.id, days: 11, order: 'DEMO-PO-2001', note: 'Stock replenishment from Nexus Tech' },
    { tag: 'DEMO-MOV-07', sku: 'OFFC-001', delta: -4, reason: 'SALE' as MovementReason, user: staff.id, days: 10, order: 'DEMO-SO-1003', note: 'Office supplies dispatch to Metro Logistics' },
    { tag: 'DEMO-MOV-08', sku: 'OFFC-004', delta: -12, reason: 'SALE' as MovementReason, user: staff.id, days: 10, order: 'DEMO-SO-1003', note: 'Order DEMO-SO-1003 paper clip dispatch' },
    { tag: 'DEMO-MOV-09', sku: 'ELEC-003', delta: -4, reason: 'SALE' as MovementReason, user: admin.id, days: 9, order: 'DEMO-SO-1004', note: 'Dispatched to GreenLeaf Retail' },
    { tag: 'DEMO-MOV-10', sku: 'ACCS-002', delta: -6, reason: 'SALE' as MovementReason, user: admin.id, days: 9, order: 'DEMO-SO-1004', note: 'Desk blotter order fulfillment' },
    { tag: 'DEMO-MOV-11', sku: 'STAT-003', delta: 60, reason: 'PURCHASE' as MovementReason, user: manager.id, days: 8, order: 'DEMO-PO-2002', note: 'Sticky note restock from distributor' },
    { tag: 'DEMO-MOV-12', sku: 'ELEC-004', delta: -3, reason: 'DAMAGE' as MovementReason, user: manager.id, days: 8, note: 'Outer carton crushed during forklift transit; keys broken' },
    { tag: 'DEMO-MOV-13', sku: 'ELEC-002', delta: 25, reason: 'PURCHASE' as MovementReason, user: manager.id, days: 8, note: 'Direct warehouse stock replenishment receipt' },
    { tag: 'DEMO-MOV-14', sku: 'ELEC-005', delta: -3, reason: 'SALE' as MovementReason, user: admin.id, days: 7, order: 'DEMO-SO-1006', note: 'Webcam order dispatched to Pinnacle Media' },
    { tag: 'DEMO-MOV-15', sku: 'ELEC-006', delta: -5, reason: 'SALE' as MovementReason, user: admin.id, days: 7, order: 'DEMO-SO-1006', note: 'USB-C hub shipment dispatch' },
    { tag: 'DEMO-MOV-16', sku: 'STAT-005', delta: -6, reason: 'SALE' as MovementReason, user: manager.id, days: 6, order: 'DEMO-SO-1007', note: 'Permanent marker packs for Sunrise Cafe' },
    { tag: 'DEMO-MOV-17', sku: 'OFFC-005', delta: -4, reason: 'SALE' as MovementReason, user: manager.id, days: 6, order: 'DEMO-SO-1007', note: 'Whiteboard accessories order fulfillment' },
    { tag: 'DEMO-MOV-18', sku: 'OFFC-002', delta: 20, reason: 'PURCHASE' as MovementReason, user: admin.id, days: 5, order: 'DEMO-PO-2003', note: 'Document tray inventory stock arrival' },
    { tag: 'DEMO-MOV-19', sku: 'OFFC-008', delta: 30, reason: 'PURCHASE' as MovementReason, user: admin.id, days: 5, order: 'DEMO-PO-2003', note: 'Metal wastebasket pallet delivery' },
    { tag: 'DEMO-MOV-20', sku: 'ACCS-001', delta: -6, reason: 'SALE' as MovementReason, user: staff.id, days: 5, order: 'DEMO-SO-1008', note: 'Aluminum laptop stands for Orbit Software' },
    { tag: 'DEMO-MOV-21', sku: 'ACCS-008', delta: -8, reason: 'SALE' as MovementReason, user: staff.id, days: 5, order: 'DEMO-SO-1008', note: 'Wrist rest bundle dispatched' },
    { tag: 'DEMO-MOV-22', sku: 'ELEC-007', delta: 40, reason: 'PURCHASE' as MovementReason, user: manager.id, days: 4, note: 'Stock intake of 2m HDMI cables' },
    { tag: 'DEMO-MOV-23', sku: 'ELEC-007', delta: -10, reason: 'SALE' as MovementReason, user: admin.id, days: 4, order: 'DEMO-SO-1009', note: 'HDMI cable order fulfillment for Nexus Ventures' },
    { tag: 'DEMO-MOV-24', sku: 'ELEC-002', delta: -4, reason: 'SALE' as MovementReason, user: admin.id, days: 4, order: 'DEMO-SO-1009', note: '65W Fast charger dispatch' },
    { tag: 'DEMO-MOV-25', sku: 'STAT-006', delta: -4, reason: 'SALE' as MovementReason, user: manager.id, days: 3, order: 'DEMO-SO-1010', note: 'Sketch pads dispatched to Zenith Architecture' },
    { tag: 'DEMO-MOV-26', sku: 'STAT-001', delta: -12, reason: 'SALE' as MovementReason, user: manager.id, days: 3, order: 'DEMO-SO-1010', note: 'Hardcover notebooks dispatched' },
    { tag: 'DEMO-MOV-27', sku: 'STAT-004', delta: -5, reason: 'DAMAGE' as MovementReason, user: staff.id, days: 3, note: 'Highlighters dried out due to uncapped packaging flaw' },
    { tag: 'DEMO-MOV-28', sku: 'ACCS-001', delta: 15, reason: 'PURCHASE' as MovementReason, user: manager.id, days: 3, order: 'DEMO-PO-2004', note: 'Cooling stand replenishment received' },
    { tag: 'DEMO-MOV-29', sku: 'ACCS-003', delta: 40, reason: 'PURCHASE' as MovementReason, user: manager.id, days: 3, order: 'DEMO-PO-2004', note: 'Cable management clips stock intake' },
    { tag: 'DEMO-MOV-30', sku: 'ELEC-001', delta: -8, reason: 'SALE' as MovementReason, user: staff.id, days: 2, order: 'DEMO-SO-1011', note: 'Wireless mice for Evergreen Media' },
    { tag: 'DEMO-MOV-31', sku: 'ACCS-002', delta: -5, reason: 'SALE' as MovementReason, user: staff.id, days: 2, order: 'DEMO-SO-1011', note: 'Desk pads dispatched' },
    { tag: 'DEMO-MOV-32', sku: 'ELEC-001', delta: 2, reason: 'RETURN' as MovementReason, user: manager.id, days: 2, note: 'Customer returned unopened surplus units from project' },
    { tag: 'DEMO-MOV-33', sku: 'ELEC-003', delta: 15, reason: 'PURCHASE' as MovementReason, user: manager.id, days: 1, order: 'DEMO-PO-2005', note: 'Bluetooth earbuds arrival inspection passed' },
    { tag: 'DEMO-MOV-34', sku: 'ELEC-006', delta: -4, reason: 'SALE' as MovementReason, user: manager.id, days: 1, order: 'DEMO-SO-1013', note: 'Dispatched to Apex Analytics' },
    { tag: 'DEMO-MOV-35', sku: 'ACCS-007', delta: -6, reason: 'SALE' as MovementReason, user: manager.id, days: 1, order: 'DEMO-SO-1013', note: 'Headphone hangers dispatched' },
    { tag: 'DEMO-MOV-36', sku: 'STAT-002', delta: 10, reason: 'ADJUSTMENT' as MovementReason, user: admin.id, days: 1, note: 'Found unopened inner carton during aisle reorganization' },
    { tag: 'DEMO-MOV-37', sku: 'STAT-003', delta: -10, reason: 'SALE' as MovementReason, user: admin.id, days: 0, order: 'DEMO-SO-1014', note: 'Sticky notes dispatched to Vanguard Studio' },
    { tag: 'DEMO-MOV-38', sku: 'OFFC-004', delta: -8, reason: 'SALE' as MovementReason, user: admin.id, days: 0, order: 'DEMO-SO-1014', note: 'Paper clips dispatched' },
    { tag: 'DEMO-MOV-39', sku: 'ELEC-002', delta: -2, reason: 'ADJUSTMENT' as MovementReason, user: manager.id, days: 0, note: 'Assigned for in-house developer testing station' },
    { tag: 'DEMO-MOV-40', sku: 'ACCS-004', delta: -3, reason: 'DAMAGE' as MovementReason, user: staff.id, days: 0, note: 'Leaking spray nozzle bottle discarded during safety sweep' },
  ];

  let createdMovementsCount = 0;
  for (const m of movementsData) {
    const prod = productBySku[m.sku];
    const orderId = m.order ? orderMap[m.order]?.id : null;
    const createdAt = daysAgo(m.days, 14, 20);
    const noteText = `[${m.tag}] ${m.note}`;

    const existing = await prisma.stockMovement.findFirst({
      where: { notes: { contains: `[${m.tag}]` } },
    });

    if (!existing) {
      await prisma.stockMovement.create({
        data: {
          productId: prod.id,
          changeQty: m.delta,
          reason: m.reason,
          notes: noteText,
          referenceOrderId: orderId,
          createdById: m.user,
          createdAt,
        },
      });
      createdMovementsCount++;
    }
  }

  console.log(`✓ Stock movements seeded (${createdMovementsCount} new movements created, 40 total tracked)`);

  // ==========================================
  // 7. SYSTEM NOTIFICATIONS (Low stock alerts)
  // ==========================================
  const lowStockProducts = Object.values(productBySku).filter(
    (p: any) => p.quantityInStock <= p.reorderLevel,
  );

  for (const p of lowStockProducts) {
    const msg = `"${p.name}" is low on stock (${p.quantityInStock} left, reorder level is ${p.reorderLevel})`;
    const existingNotif = await prisma.notification.findFirst({
      where: { message: msg },
    });

    if (!existingNotif) {
      await prisma.notification.create({
        data: {
          type: 'LOW_STOCK',
          message: msg,
          isRead: false,
        },
      });
    }
  }
  console.log(`✓ Low-stock notifications seeded (${lowStockProducts.length} alerts)`);

  console.log('\n======================================================');
  console.log('StockFlow Seed completed successfully!');
  console.log('Demo Credentials (all roles):');
  console.log('  - Admin:   admin@stockflow.dev   / Password123!');
  console.log('  - Manager: manager@stockflow.dev / Password123!');
  console.log('  - Staff:   staff@stockflow.dev   / Password123!');
  console.log('======================================================\n');
}

main()
  .catch((e) => {
    console.error('Seed script error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
