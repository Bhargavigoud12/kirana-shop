import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { X, QrCode, Copy, Check, Download, Share2, Receipt, Smartphone } from 'lucide-react';
import { Bill, BillItem } from '../types/inventory';
import { useInventory } from '../context/InventoryContext';

interface BillQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: Bill | null;
  items: BillItem[];
}

export const BillQrModal: React.FC<BillQrModalProps> = ({
  isOpen,
  onClose,
  bill,
  items,
}) => {
  const { settings } = useInventory();
  const [qrMode, setQrMode] = useState<'RECEIPT' | 'UPI'>('RECEIPT');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(true);

  // Generate formatted plain-text bill summary for customer scanning
  const formattedSummaryText = React.useMemo(() => {
    if (!bill) return '';

    const dateFormatted = new Date(bill.created_at).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const lines: string[] = [
      `=== ${settings.store_name.toUpperCase()} ===`,
      `Owner: ${settings.owner_name} | Phone: ${settings.phone_number}`,
      `Bill #: ${bill.bill_number}`,
      `Date: ${dateFormatted}`,
      `Payment: ${bill.payment_mode.toUpperCase()}`,
      `--------------------------------`,
      `ITEMS:`,
    ];

    items.forEach((item, index) => {
      lines.push(
        `${index + 1}. ${item.product_name} - ${item.quantity} ${item.unit} x Rs.${item.unit_price} = Rs.${item.line_total}`
      );
    });

    lines.push(`--------------------------------`);
    lines.push(`Subtotal: Rs. ${bill.subtotal}`);
    if (bill.discount > 0) {
      lines.push(`Discount: -Rs. ${bill.discount}`);
    }
    lines.push(`TOTAL AMOUNT: Rs. ${bill.total}`);
    lines.push(`Status: ${bill.status}`);
    lines.push(`================================`);
    lines.push(`Thank you for shopping with us!`);

    return lines.join('\n');
  }, [bill, items, settings]);

  // UPI Dynamic payment payload
  const upiPayload = React.useMemo(() => {
    if (!bill) return '';
    const pa = 'lakshmi.kirana@upi';
    const pn = encodeURIComponent(settings.store_name);
    const tn = encodeURIComponent(`Bill_${bill.bill_number}`);
    const am = bill.total.toFixed(2);
    return `upi://pay?pa=${pa}&pn=${pn}&am=${am}&tn=${tn}&cu=INR`;
  }, [bill, settings]);

  // Generate QR code data URL whenever mode or bill changes
  useEffect(() => {
    if (!bill || !isOpen) return;

    setIsGenerating(true);
    const payload = qrMode === 'RECEIPT' ? formattedSummaryText : upiPayload;

    QRCode.toDataURL(payload, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => {
        setQrDataUrl(url);
        setIsGenerating(false);
      })
      .catch((err) => {
        console.error('Failed to generate QR code:', err);
        setIsGenerating(false);
      });
  }, [bill, items, qrMode, isOpen, formattedSummaryText, upiPayload]);

  if (!isOpen || !bill) return null;

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(formattedSummaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      // Fallback
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `bill_qr_${bill.bill_number}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Customer Bill QR Code
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Scan with any smartphone camera for digital receipt
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Format Mode Tabs: Digital Receipt vs UPI QR */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setQrMode('RECEIPT')}
              className={`py-2 px-3 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 ${
                qrMode === 'RECEIPT'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Receipt className="w-4 h-4 text-amber-600" />
              <span>Digital Receipt QR</span>
            </button>

            <button
              type="button"
              onClick={() => setQrMode('UPI')}
              className={`py-2 px-3 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 ${
                qrMode === 'UPI'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-4 h-4 text-emerald-600" />
              <span>UPI Pay & Bill QR</span>
            </button>
          </div>

          {/* QR Code Presentation Canvas */}
          <div className="text-center py-2 space-y-2">
            <div className="bg-white p-4 rounded-3xl inline-block border-2 border-amber-300 dark:border-amber-500 shadow-lg mx-auto">
              {isGenerating ? (
                <div className="w-56 h-56 flex items-center justify-center text-xs text-slate-400">
                  Generating QR code...
                </div>
              ) : qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code for Bill ${bill.bill_number}`}
                  className="w-56 h-56 mx-auto rounded-xl object-contain"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-xs text-rose-500">
                  Failed to generate QR code
                </div>
              )}
            </div>

            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {qrMode === 'RECEIPT'
                ? 'Scan with phone camera to view full itemized bill summary'
                : `Scan with Google Pay, PhonePe, or Paytm to pay ${settings.currency} ${bill.total}`}
            </p>
          </div>

          {/* Quick Bill Details Preview */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
            <div className="flex justify-between items-center font-bold">
              <span className="text-slate-500 dark:text-slate-400">Bill Number:</span>
              <span className="font-mono text-slate-900 dark:text-white">{bill.bill_number}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">Items Count:</span>
              <span className="text-slate-800 dark:text-slate-200 font-semibold">{items.length} items</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">Payment Mode:</span>
              <span className="uppercase font-semibold text-slate-800 dark:text-slate-200">
                {bill.payment_mode}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-200 dark:border-slate-800 text-sm font-extrabold text-slate-900 dark:text-white">
              <span>Total Amount:</span>
              <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">
                {settings.currency} {bill.total}
              </span>
            </div>
          </div>

          {/* Action Buttons: Copy Text & Download QR */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={handleCopyText}
              className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Bill Text'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadQr}
              className="py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition-colors flex items-center justify-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Download QR</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
