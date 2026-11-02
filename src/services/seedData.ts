import { Product, Category, StockLedgerEntry, AppSettings } from '../types/inventory';

export const DEFAULT_CATEGORIES: Category[] = [
  { category_id: 'cat_staples', name: 'Groceries & Staples' },
  { category_id: 'cat_oils', name: 'Edible Oils & Ghee' },
  { category_id: 'cat_dairy', name: 'Dairy & Perishables' },
  { category_id: 'cat_snacks', name: 'Snacks & Biscuits' },
  { category_id: 'cat_spices', name: 'Spices & Condiments' },
  { category_id: 'cat_cleaning', name: 'Personal Care & Cleaning' },
];

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'app_settings',
  store_name: 'Lakshmi Kirana Store',
  owner_name: 'Ramesh Sharma',
  phone_number: '+91 98765 43210',
  currency: '₹',
  language: 'hinglish',
  expiry_warning_days: 7, // Configurable setting: default 7 days
  updated_at: new Date().toISOString(),
};

/**
 * Returns helper date relative to now in ISO YYYY-MM-DD
 */
function getRelativeDateStr(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
}

export function getInitialDemoCatalog(): { products: Product[]; ledgerEntries: StockLedgerEntry[] } {
  const now = new Date().toISOString();

  // Curated Kirana staple items with rich Telugu / Hindi / Hinglish aliases
  const rawProducts: Array<Omit<Product, 'created_at' | 'updated_at' | 'synced'>> = [
    {
      product_id: 'prod_rice_sona',
      name: 'Sona Masoori Rice (25kg Bag)',
      aliases: ['chawal', 'rice', 'biyyam', 'chaawal', 'sona masoori', 'sona masuri'],
      barcode: '8901234567890',
      category_id: 'cat_staples',
      unit: 'bag',
      purchase_price: 1350,
      selling_price: 1550,
      current_stock: 12,
      low_stock_threshold: 4,
      expiry_date: getRelativeDateStr(240), // Safe
      image_path: null,
      is_active: true,
    },
    {
      product_id: 'prod_atta_aashirvaad',
      name: 'Aashirvaad Shudh Chakki Atta (5kg)',
      aliases: ['atta', 'gehu ka atta', 'godhuma pindi', 'wheat flour', 'aashirvaad atta'],
      barcode: '8901030012345',
      category_id: 'cat_staples',
      unit: 'packet',
      purchase_price: 215,
      selling_price: 245,
      current_stock: 18,
      low_stock_threshold: 5,
      expiry_date: getRelativeDateStr(120),
      image_path: null,
      is_active: true,
    },
    {
      product_id: 'prod_dal_toor',
      name: 'Toor Dal Desi (Loose)',
      aliases: ['toor dal', 'dal', 'kandi pappu', 'arhar dal', 'tuvar dal', 'pappu'],
      barcode: '8901040054321',
      category_id: 'cat_staples',
      unit: 'kg',
      purchase_price: 145,
      selling_price: 165,
      current_stock: 3.5, // LOW STOCK (<= 5)
      low_stock_threshold: 5,
      expiry_date: getRelativeDateStr(180),
      image_path: null,
      is_active: true,
    },
    {
      product_id: 'prod_oil_fortune',
      name: 'Fortune Sunlite Refined Sunflower Oil (1L)',
      aliases: ['tel', 'cooking oil', 'nune', 'sunflower oil', 'fortune tel', 'oil packet'],
      barcode: '8901050098765',
      category_id: 'cat_oils',
      unit: 'packet',
      purchase_price: 118,
      selling_price: 135,
      current_stock: 24,
      low_stock_threshold: 6,
      expiry_date: getRelativeDateStr(150),
      image_path: null,
      is_active: true,
    },
    {
      product_id: 'prod_milk_amul',
      name: 'Amul Taaza Homogenised Toned Milk (500ml)',
      aliases: ['doodh', 'milk', 'paalu', 'amul doodh', 'taaza milk', 'amul'],
      barcode: '8901060011223',
      category_id: 'cat_dairy',
      unit: 'packet',
      purchase_price: 26,
      selling_price: 28,
      current_stock: 15,
      low_stock_threshold: 5,
      expiry_date: getRelativeDateStr(3), // EXPIRING SOON! (within 3 days <= 7 days)
      image_path: null,
      is_active: true,
    },
    {
      product_id: 'prod_curd_milky',
      name: 'Milky Mist Farm Fresh Curd (400g)',
      aliases: ['dahi', 'curd', 'perugu', 'milky mist curd'],
      barcode: '8901060077889',
      category_id: 'cat_dairy',
      unit: 'packet',
      purchase_price: 36,
      selling_price: 40,
      current_stock: 8,
      low_stock_threshold: 4,
      expiry_date: getRelativeDateStr(4), // EXPIRING SOON! (within 4 days)
      image_path: null,
      is_active: true,
    },
    {
      product_id: 'prod_maggi',
      name: 'Maggi 2-Minute Masala Noodles (70g)',
      aliases: ['maggi', 'noodles', 'magi', 'masala noodles'],
      barcode: '8901058852147',
      category_id: 'cat_snacks',
      unit: 'packet',
      purchase_price: 12,
      selling_price: 14,
      current_stock: 45,
      low_stock_threshold: 12,
      expiry_date: getRelativeDateStr(210),
      image_path: null,
      is_active: true,
    },
    {
      product_id: 'prod_parle_g',
      name: 'Parle-G Gold Glucose Biscuits (250g)',
      aliases: ['biscuit', 'parle g', 'parle biscuit', 'chai biscuit'],
      barcode: '8901058863258',
      category_id: 'cat_snacks',
      unit: 'packet',
      purchase_price: 24,
      selling_price: 30,
      current_stock: 30,
      low_stock_threshold: 8,
      expiry_date: getRelativeDateStr(180),
      image_path: null,
      is_active: true,
    },
    {
      product_id: 'prod_tata_salt',
      name: 'Tata Salt Vacuum Evaporated Iodised (1kg)',
      aliases: ['namak', 'salt', 'uppu', 'tata salt'],
      barcode: '8901070044556',
      category_id: 'cat_spices',
      unit: 'packet',
      purchase_price: 23,
      selling_price: 28,
      current_stock: 35,
      low_stock_threshold: 10,
      expiry_date: getRelativeDateStr(365),
      image_path: null,
      is_active: true,
    },
    {
      product_id: 'prod_sugar_loose',
      name: 'Crystal Clean White Sugar (Loose)',
      aliases: ['cheeni', 'sugar', 'panchadara', 'shakkara'],
      barcode: '8901070099881',
      category_id: 'cat_staples',
      unit: 'kg',
      purchase_price: 38,
      selling_price: 44,
      current_stock: 0, // OUT OF STOCK!
      low_stock_threshold: 15,
      expiry_date: getRelativeDateStr(300),
      image_path: null,
      is_active: true,
    },
    {
      product_id: 'prod_surf_excel',
      name: 'Surf Excel Easy Wash Detergent Powder (1kg)',
      aliases: ['surf', 'detergent', 'sabbu podi', 'surf excel', 'washing powder'],
      barcode: '8901030099112',
      category_id: 'cat_cleaning',
      unit: 'packet',
      purchase_price: 125,
      selling_price: 140,
      current_stock: 14,
      low_stock_threshold: 4,
      expiry_date: null,
      image_path: null,
      is_active: true,
    },
  ];

  const products: Product[] = rawProducts.map((p) => ({
    ...p,
    created_at: now,
    updated_at: now,
    synced: false,
  }));

  // Non-negotiable rule: Every product with initial stock > 0 gets an OPENING_STOCK ledger entry
  const ledgerEntries: StockLedgerEntry[] = products
    .filter((p) => p.current_stock > 0)
    .map((p, index) => ({
      entry_id: `ledger_init_${p.product_id}`,
      product_id: p.product_id,
      product_name: p.name,
      movement_type: 'OPENING_STOCK',
      quantity_change: p.current_stock,
      previous_stock: 0,
      new_stock: p.current_stock,
      reason: 'Initial shop opening stock inventory verification',
      bill_id: null,
      supplier_id: null,
      user_id: 'owner_ramesh',
      device_id: 'counter_device_01',
      created_at: new Date(Date.now() - (products.length - index) * 60000).toISOString(),
      synced: false,
    }));

  return { products, ledgerEntries };
}
