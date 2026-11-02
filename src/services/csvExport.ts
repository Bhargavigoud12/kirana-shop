/**
 * Offline CSV Generator and Downloader for Munshi Kirana POS
 */

function downloadCsvFile(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsvCell(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportSalesReportCsv(
  bills: Array<{
    bill_number: string;
    created_at: string;
    subtotal: number;
    discount: number;
    total: number;
    payment_mode: string;
    status: string;
  }>
): void {
  const headers = ['Bill Number', 'Date (ISO 8601)', 'Subtotal (INR)', 'Discount (INR)', 'Total (INR)', 'Payment Mode', 'Status'];
  const rows = bills.map((b) => [
    escapeCsvCell(b.bill_number),
    escapeCsvCell(b.created_at),
    escapeCsvCell(b.subtotal),
    escapeCsvCell(b.discount),
    escapeCsvCell(b.total),
    escapeCsvCell(b.payment_mode),
    escapeCsvCell(b.status),
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadCsvFile(`munshi_sales_report_${dateStr}.csv`, csv);
}

export function exportProductsReportCsv(
  products: Array<{
    name: string;
    barcode: string;
    unit: string;
    purchase_price: number;
    selling_price: number;
    current_stock: number;
    low_stock_threshold: number;
    expiry_date: string | null;
    is_active: boolean;
  }>
): void {
  const headers = [
    'Product Name',
    'Barcode',
    'Unit',
    'Purchase Cost (INR)',
    'Selling Price (INR)',
    'Current Stock',
    'Low Stock Threshold',
    'Stock Value Cost (INR)',
    'Stock Value Retail (INR)',
    'Expiry Date',
    'Status',
  ];

  const rows = products.map((p) => [
    escapeCsvCell(p.name),
    escapeCsvCell(p.barcode || ''),
    escapeCsvCell(p.unit),
    escapeCsvCell(p.purchase_price),
    escapeCsvCell(p.selling_price),
    escapeCsvCell(p.current_stock),
    escapeCsvCell(p.low_stock_threshold),
    escapeCsvCell((p.current_stock * p.purchase_price).toFixed(2)),
    escapeCsvCell((p.current_stock * p.selling_price).toFixed(2)),
    escapeCsvCell(p.expiry_date || ''),
    escapeCsvCell(p.is_active ? 'ACTIVE' : 'ARCHIVED'),
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadCsvFile(`munshi_stock_catalog_${dateStr}.csv`, csv);
}

export function exportStockLedgerCsv(
  ledger: Array<{
    created_at: string;
    product_name: string;
    movement_type: string;
    quantity_change: number;
    previous_stock: number;
    new_stock: number;
    reason: string;
    user_id: string;
  }>
): void {
  const headers = [
    'Timestamp (ISO 8601)',
    'Product Name',
    'Movement Type',
    'Quantity Delta',
    'Previous Stock',
    'New Stock',
    'Reason / Audit Notes',
    'User ID',
  ];

  const rows = ledger.map((entry) => [
    escapeCsvCell(entry.created_at),
    escapeCsvCell(entry.product_name),
    escapeCsvCell(entry.movement_type),
    escapeCsvCell(entry.quantity_change),
    escapeCsvCell(entry.previous_stock),
    escapeCsvCell(entry.new_stock),
    escapeCsvCell(entry.reason),
    escapeCsvCell(entry.user_id),
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadCsvFile(`munshi_stock_ledger_${dateStr}.csv`, csv);
}

export function exportCustomerUdhaarCsv(
  customers: Array<{
    name: string;
    phone: string;
    address: string;
    credit_balance: number;
    credit_limit: number;
    created_at: string;
  }>
): void {
  const headers = [
    'Customer Name',
    'Phone',
    'Address',
    'Outstanding Udhaar (INR)',
    'Credit Limit (INR)',
    'Registered Date',
  ];

  const rows = customers.map((c) => [
    escapeCsvCell(c.name),
    escapeCsvCell(c.phone),
    escapeCsvCell(c.address),
    escapeCsvCell(c.credit_balance),
    escapeCsvCell(c.credit_limit),
    escapeCsvCell(c.created_at),
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadCsvFile(`munshi_customer_udhaar_${dateStr}.csv`, csv);
}

export function exportExpiryReportCsv(
  items: Array<{
    name: string;
    current_stock: number;
    unit: string;
    expiry_date: string | null;
    daysRemaining: number;
    isExpired: boolean;
  }>
): void {
  const headers = [
    'Product Name',
    'Stock on Hand',
    'Unit',
    'Expiry Date',
    'Days Remaining',
    'Status',
  ];

  const rows = items.map((i) => [
    escapeCsvCell(i.name),
    escapeCsvCell(i.current_stock),
    escapeCsvCell(i.unit),
    escapeCsvCell(i.expiry_date || ''),
    escapeCsvCell(i.daysRemaining),
    escapeCsvCell(i.isExpired ? 'EXPIRED' : 'EXPIRING SOON'),
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadCsvFile(`munshi_expiry_report_${dateStr}.csv`, csv);
}
