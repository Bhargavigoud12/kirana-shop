import React from 'react';
import { BarChart3, Clock, CheckCircle2 } from 'lucide-react';

export const ReportsPlaceholderScreen: React.FC = () => {
  return (
    <div className="py-12 px-4 text-center max-w-md mx-auto space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-xs border border-amber-200">
        <BarChart3 className="w-8 h-8" />
      </div>

      <div>
        <span className="text-xs font-bold tracking-wide uppercase px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
          Phase 2 Feature
        </span>
        <h2 className="text-xl font-bold text-slate-900 mt-2">Reports & Sales Summary</h2>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          Daily closing sales, cash/UPI/credit splits, top-selling items, and profit margins will be enabled in Phase 2 alongside the Voice Billing engine.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 text-left shadow-xs space-y-2.5">
        <h3 className="text-xs font-bold text-slate-700">Upcoming in Phase 2:</h3>
        <div className="space-y-1.5 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Daily cash, UPI & udhaar credit sales breakdown</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Inventory turnover & fast/slow-moving SKU analytics</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Voice sales query: "Aaj kitna bikri hua?"</span>
          </div>
        </div>
      </div>
    </div>
  );
};
