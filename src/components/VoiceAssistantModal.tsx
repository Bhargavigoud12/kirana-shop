import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Mic,
  MicOff,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Volume2,
  VolumeX,
  Code,
  Layers,
  HelpCircle,
  FileText,
  User,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { speechService } from '../services/speechService';
import { voiceParser, ParsedVoiceCommand } from '../services/voiceParser';
import { billingService } from '../services/billingService';
import { Product } from '../types/inventory';
import { InventoryTab } from '../screens/InventoryScreen';
import { NavTab } from './Navbar';

type VoiceState =
  | 'IDLE'
  | 'LISTENING'
  | 'PROCESSING'
  | 'CONFIRMING'
  | 'EXECUTING'
  | 'SUCCESS'
  | 'ERROR';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: NavTab, subTab?: InventoryTab) => void;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  const {
    activeProducts,
    lowStockProducts,
    addStock,
    removeStock,
    correctStock,
    refreshData,
    settings,
  } = useInventory();

  // Voice States
  const [state, setState] = useState<VoiceState>('IDLE');
  const [transcript, setTranscript] = useState<string>('');
  const [parsedCommand, setParsedCommand] = useState<ParsedVoiceCommand | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manualText, setManualText] = useState<string>('');
  const [showJsonInspector, setShowJsonInspector] = useState<boolean>(false);
  const [selectedLanguage, setSelectedLanguage] = useState<'hi-IN' | 'te-IN' | 'en-IN'>('hi-IN');
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(true);

  // Instant query results
  const [salesSummary, setSalesSummary] = useState<any | null>(null);
  const [customerResult, setCustomerResult] = useState<any | null>(null);

  const isSupported = speechService.isRecognitionSupported();

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setState('IDLE');
      setTranscript('');
      setParsedCommand(null);
      setErrorMessage(null);
      setSalesSummary(null);
      setCustomerResult(null);
      speechService.setLanguage(selectedLanguage);
    } else {
      speechService.stopListening();
      speechService.cancelSpeech();
    }
  }, [isOpen, selectedLanguage]);

  if (!isOpen) return null;

  // Speak helper
  const speakText = async (text: string) => {
    if (!ttsEnabled || !text) return;
    await speechService.speak(text, selectedLanguage);
  };

  // Start speech recognition
  const handleStartListening = () => {
    setErrorMessage(null);
    setTranscript('');
    setParsedCommand(null);
    setSalesSummary(null);
    setCustomerResult(null);

    const started = speechService.startListening({
      onStart: () => {
        setState('LISTENING');
      },
      onResult: (text, isFinal) => {
        setTranscript(text);
        if (isFinal) {
          processTranscript(text);
        }
      },
      onError: (err) => {
        setState('ERROR');
        setErrorMessage(err);
      },
      onEnd: () => {
        if (state === 'LISTENING') {
          setState('IDLE');
        }
      },
    });

    if (!started) {
      setState('ERROR');
      setErrorMessage('Speech recognition could not be started. Use the text fallback below.');
    }
  };

  const handleStopListening = () => {
    speechService.stopListening();
    if (transcript) {
      processTranscript(transcript);
    } else {
      setState('IDLE');
    }
  };

  // Process text into intent & structured JSON
  const processTranscript = async (textToParse: string) => {
    setState('PROCESSING');
    speechService.stopListening();

    const parsed = voiceParser.parseCommand(textToParse, activeProducts);
    setParsedCommand(parsed);

    if (parsed.intent === 'UNKNOWN') {
      setState('ERROR');
      setErrorMessage(parsed.error_message || 'Could not understand command. Try again.');
      speakText('Command samajh nahi aaya. Kripya dobara bolein.');
      return;
    }

    // Handle Instant Queries (no confirmation needed)
    if (parsed.intent === 'CHECK_STOCK') {
      setState('SUCCESS');
      if (parsed.completion_speech) speakText(parsed.completion_speech);
      return;
    }

    if (parsed.intent === 'LOW_STOCK') {
      setState('SUCCESS');
      speakText(parsed.completion_speech);
      setTimeout(() => {
        onNavigateTab('inventory', 'low_stock');
        onClose();
      }, 1800);
      return;
    }

    if (parsed.intent === 'EXPIRY_CHECK') {
      setState('SUCCESS');
      speakText(parsed.completion_speech);
      setTimeout(() => {
        onNavigateTab('inventory', 'expiry');
        onClose();
      }, 1800);
      return;
    }

    if (parsed.intent === 'SALES_REPORT') {
      const summary = await billingService.getTodaySalesSummary();
      setSalesSummary(summary);
      setState('SUCCESS');
      if (parsed.removal_reason === 'full_report') {
        const speech = `Aaj kul ${summary.totalBills} bills bane, kul bikri ${summary.totalSales} rupaye hui. Cash ${summary.cashTotal}, UPI ${summary.upiTotal}, Credit ${summary.creditTotal}. Aur ${lowStockProducts.length} items low stock mein hain.`;
        speakText(speech);
      } else {
        const speech = `Aaj kul ${summary.totalBills} bills bane, kul bikri ${summary.totalSales} rupaye hui.`;
        speakText(speech);
      }
      return;
    }

    if (parsed.intent === 'CREDIT_QUERY') {
      const cust = await billingService.findCustomerByName(parsed.customer_name || 'Ramesh');
      setCustomerResult(cust);
      setState('SUCCESS');
      if (cust) {
        speakText(`${cust.name} ka kul udhaar ${cust.credit_balance} rupaye bacha hai.`);
      } else {
        speakText(`Customer ${parsed.customer_name} nahi mila.`);
      }
      return;
    }

    // Needs Confirmation (ADD_STOCK, REMOVE_STOCK, CORRECT_STOCK, CREATE_BILL, CANCEL_LAST)
    if (parsed.requires_confirmation) {
      setState('CONFIRMING');
      if (parsed.confirmation_prompt) {
        speakText(parsed.confirmation_prompt);
      }
    }
  };

  // Execute confirmed action
  const handleExecuteAction = async () => {
    if (!parsedCommand) return;
    setState('EXECUTING');
    setErrorMessage(null);

    try {
      if (parsedCommand.intent === 'ADD_STOCK') {
        if (!parsedCommand.product) throw new Error('Product not selected');
        await addStock(parsedCommand.product.product_id, parsedCommand.quantity || 1, {
          reason: 'Voice: Stock purchase arrival',
        });
        setState('SUCCESS');
        speakText(parsedCommand.completion_speech);
        await refreshData();
      } else if (parsedCommand.intent === 'REMOVE_STOCK') {
        if (!parsedCommand.product) throw new Error('Product not selected');
        await removeStock(
          parsedCommand.product.product_id,
          parsedCommand.quantity || 1,
          'DAMAGE',
          parsedCommand.removal_reason || 'Voice: Damaged stock'
        );
        setState('SUCCESS');
        speakText(parsedCommand.completion_speech);
        await refreshData();
      } else if (parsedCommand.intent === 'CORRECT_STOCK') {
        if (!parsedCommand.product) throw new Error('Product not selected');
        await correctStock(
          parsedCommand.product.product_id,
          parsedCommand.quantity || 0,
          'Voice correction'
        );
        setState('SUCCESS');
        speakText(parsedCommand.completion_speech);
        await refreshData();
      } else if (parsedCommand.intent === 'CREATE_BILL') {
        if (!parsedCommand.bill_items || parsedCommand.bill_items.length === 0) {
          throw new Error('No items in bill');
        }
        await billingService.createBillWithStockDeduction(
          parsedCommand.bill_items.map((bi) => ({
            product: bi.product,
            quantity: bi.quantity,
            unitPrice: bi.unitPrice,
          })),
          { paymentMode: 'cash' }
        );
        setState('SUCCESS');
        speakText(parsedCommand.completion_speech);
        await refreshData();
      } else if (parsedCommand.intent === 'CANCEL_LAST') {
        const res = await billingService.cancelLastBill();
        if (!res) {
          throw new Error('No completed bill found to cancel. Check inventory ledger.');
        }
        setState('SUCCESS');
        speakText('Last bill cancel ho gaya aur stock restore ho gaya.');
        await refreshData();
      }

      setTimeout(() => {
        // Auto close after 2.5s on success
        onClose();
      }, 2500);
    } catch (err: any) {
      console.error(err);
      setState('ERROR');
      setErrorMessage(err.message || 'Action failed to execute');
      speakText('Action fail ho gaya. Kripya check karein.');
    }
  };

  // Handle manual fallback submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim()) return;
    setTranscript(manualText);
    processTranscript(manualText);
    setManualText('');
  };

  // Quick prompt chips
  const QUICK_PROMPTS = [
    { label: 'Create Bill', text: 'Do kilo chawal, ek atta packet, teen Maggi' },
    { label: 'Add Stock', text: 'Aaj 10 kilo chawal aaya' },
    { label: 'Damage', text: 'Chawal 2 kilo kharab ho gaya' },
    { label: 'Check Stock', text: 'Chawal kitna hai?' },
    { label: 'Low Stock', text: 'Kya khatam hone wala hai?' },
    { label: 'Expiry Check', text: 'Kya expire hone wala hai?' },
    { label: 'Correct Stock', text: 'Chawal 8 kilo karo' },
    { label: 'Sales Report', text: 'Aaj kitna bikri hua?' },
    { label: 'Udhaar Query', text: 'Ramesh ka udhaar kitna hai?' },
    { label: 'Cancel Last', text: 'Last entry cancel karo' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl my-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-amber-600 to-amber-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-bold text-white shadow-xs">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold leading-tight">Munshi Voice Assistant</h3>
                <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-white/20 uppercase tracking-wider">
                  Web Speech
                </span>
              </div>
              <p className="text-xs text-amber-100">
                Telugu · Hindi · English · Hinglish Counter POS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTtsEnabled(!ttsEnabled)}
              title={ttsEnabled ? 'Mute Speech Response' : 'Enable Speech Response'}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 opacity-60" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Language Selector Bar */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-600">Language:</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedLanguage('hi-IN')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                selectedLanguage === 'hi-IN'
                  ? 'bg-amber-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              Hindi / Hinglish
            </button>
            <button
              type="button"
              onClick={() => setSelectedLanguage('te-IN')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                selectedLanguage === 'te-IN'
                  ? 'bg-amber-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              Telugu (తెలుగు)
            </button>
            <button
              type="button"
              onClick={() => setSelectedLanguage('en-IN')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                selectedLanguage === 'en-IN'
                  ? 'bg-amber-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              English
            </button>
          </div>
        </div>

        {/* Main Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Big Mic Button Area */}
          <div className="text-center py-2 space-y-2">
            <div className="relative inline-block">
              {state === 'LISTENING' && (
                <div className="absolute inset-0 rounded-full bg-amber-400 animate-ping opacity-60 scale-125" />
              )}
              <button
                type="button"
                onClick={state === 'LISTENING' ? handleStopListening : handleStartListening}
                className={`w-24 h-24 rounded-full flex flex-col items-center justify-center text-white shadow-xl transition-all active:scale-95 relative z-10 ${
                  state === 'LISTENING'
                    ? 'bg-rose-600 hover:bg-rose-700 ring-8 ring-rose-100'
                    : state === 'PROCESSING'
                    ? 'bg-indigo-600 animate-pulse'
                    : 'bg-amber-600 hover:bg-amber-700 ring-8 ring-amber-50'
                }`}
              >
                <Mic className={`w-10 h-10 ${state === 'LISTENING' ? 'animate-bounce' : ''}`} />
                <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">
                  {state === 'LISTENING' ? 'Tap to Stop' : 'Tap to Speak'}
                </span>
              </button>
            </div>

            {/* Current State Label */}
            <div>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                  state === 'LISTENING'
                    ? 'bg-rose-100 text-rose-800 animate-pulse'
                    : state === 'PROCESSING'
                    ? 'bg-indigo-100 text-indigo-800'
                    : state === 'CONFIRMING'
                    ? 'bg-amber-100 text-amber-900'
                    : state === 'SUCCESS'
                    ? 'bg-emerald-100 text-emerald-800'
                    : state === 'ERROR'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {state === 'LISTENING' && '🎙️ Listening... speak now'}
                {state === 'PROCESSING' && '⚙️ Processing NLP intent...'}
                {state === 'CONFIRMING' && '⚠️ Awaiting Spoken / Screen Confirmation'}
                {state === 'EXECUTING' && '💾 Executing atomic ledger transaction...'}
                {state === 'SUCCESS' && '✅ Voice Action Completed!'}
                {state === 'ERROR' && '❌ Error / Low Confidence'}
                {state === 'IDLE' && 'Ready · Tap mic to speak or use text below'}
              </span>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Live Transcript Display Box */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Spoken Transcript:
            </span>
            <p className="text-sm font-semibold text-slate-900 min-h-[24px] italic">
              {transcript ? `"${transcript}"` : '(Waiting for voice input...)'}
            </p>
          </div>

          {/* Instant Query 1: Product Stock Check Result */}
          {parsedCommand?.intent === 'CHECK_STOCK' && parsedCommand.product && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900">Current Stock Result:</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                  Query Answer
                </span>
              </div>
              <div className="bg-white rounded-xl p-3 border border-emerald-200 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{parsedCommand.product.name}</h4>
                  <p className="text-xs text-slate-500">
                    Selling Price: <strong>{settings.currency} {parsedCommand.product.selling_price}</strong> · Cost: {settings.currency} {parsedCommand.product.purchase_price}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-base font-extrabold text-emerald-700 tabular-nums">
                    {parsedCommand.product.current_stock} {parsedCommand.product.unit}
                  </span>
                  <span className="text-[10px] text-slate-400 block">Available</span>
                </div>
              </div>
            </div>
          )}

          {/* Instant Query 2: Daily Sales Report Result */}
          {salesSummary && (
            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-300 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900">Today's Sales Summary:</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
                  {salesSummary.dateStr}
                </span>
              </div>
              <div className="bg-white rounded-xl p-3 border border-indigo-200 grid grid-cols-2 gap-3 text-center">
                <div>
                  <span className="text-xs text-slate-500 block">Bills Created</span>
                  <span className="text-xl font-bold text-slate-900 tabular-nums">{salesSummary.totalBills}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Total Revenue</span>
                  <span className="text-xl font-bold text-emerald-600 tabular-nums">
                    {settings.currency} {salesSummary.totalSales}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Instant Query 3: Customer Udhaar Result */}
          {customerResult && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900">Customer Udhaar Balance:</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                  Khata
                </span>
              </div>
              <div className="bg-white rounded-xl p-3 border border-amber-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{customerResult.name}</h4>
                    <p className="text-xs text-slate-500">{customerResult.phone}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-extrabold text-amber-900 tabular-nums">
                    {settings.currency} {customerResult.credit_balance}
                  </span>
                  <span className="text-[10px] text-slate-400 block">Outstanding</span>
                </div>
              </div>
            </div>
          )}

          {/* CONFIRMATION CARD (Double Confirmation on Screen & Voice) */}
          {state === 'CONFIRMING' && parsedCommand && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  <span>Voice Command Confirmation:</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-950 uppercase">
                  {parsedCommand.intent}
                </span>
              </div>

              {/* Action Details */}
              <div className="bg-white rounded-xl p-3 border border-amber-200 text-xs space-y-2">
                {parsedCommand.intent === 'CREATE_BILL' && (
                  <div className="space-y-1.5">
                    <span className="font-bold text-slate-700 block">Items in Spoken Bill:</span>
                    {parsedCommand.bill_items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center py-0.5 border-b border-slate-100">
                        <span>{item.quantity} {item.unit} {item.product.name}</span>
                        <span className="font-bold tabular-nums">{settings.currency} {item.lineTotal}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-1 text-sm font-extrabold text-slate-900">
                      <span>Total Bill Amount:</span>
                      <span>{settings.currency} {parsedCommand.bill_total}</span>
                    </div>
                  </div>
                )}

                {(parsedCommand.intent === 'ADD_STOCK' ||
                  parsedCommand.intent === 'REMOVE_STOCK' ||
                  parsedCommand.intent === 'CORRECT_STOCK') &&
                  parsedCommand.product && (
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Product:</span>
                        <span className="font-bold text-slate-900">{parsedCommand.product.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Current Stock:</span>
                        <span className="tabular-nums font-medium text-slate-700">
                          {parsedCommand.product.current_stock} {parsedCommand.product.unit}
                        </span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span className="text-slate-800">
                          {parsedCommand.intent === 'ADD_STOCK' && 'Stock to Add (+):'}
                          {parsedCommand.intent === 'REMOVE_STOCK' && 'Damage Deduction (-):'}
                          {parsedCommand.intent === 'CORRECT_STOCK' && 'Set Physical Stock to:'}
                        </span>
                        <span
                          className={`tabular-nums ${
                            parsedCommand.intent === 'ADD_STOCK'
                              ? 'text-emerald-600'
                              : parsedCommand.intent === 'REMOVE_STOCK'
                              ? 'text-rose-600'
                              : 'text-indigo-600'
                          }`}
                        >
                          {parsedCommand.quantity} {parsedCommand.unit || parsedCommand.product.unit}
                        </span>
                      </div>
                    </div>
                  )}

                {parsedCommand.intent === 'CANCEL_LAST' && (
                  <p className="text-xs text-slate-700 font-medium">
                    Cancel last completed sale bill and restore product quantities back to stock?
                  </p>
                )}

                <div className="p-2 rounded-lg bg-amber-100/70 text-amber-900 text-xs italic font-medium">
                  Spoken Prompt: "{parsedCommand.confirmation_prompt}"
                </div>
              </div>

              {/* Confirm / Cancel Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setState('IDLE');
                    setParsedCommand(null);
                    speakText('Command cancel kar diya gaya.');
                  }}
                  className="py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteAction}
                  className="py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm & Execute</span>
                </button>
              </div>
            </div>
          )}

          {/* Structured JSON Inspector (Mandatory PDF Rule) */}
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setShowJsonInspector(!showJsonInspector)}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold"
            >
              <Code className="w-3.5 h-3.5 text-slate-400" />
              <span>{showJsonInspector ? 'Hide' : 'Show'} Structured JSON Payload</span>
            </button>

            {showJsonInspector && (
              <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl text-[10px] font-mono overflow-x-auto max-h-40">
                {parsedCommand
                  ? JSON.stringify(
                      {
                        intent: parsedCommand.intent,
                        product: parsedCommand.product?.name || parsedCommand.customer_name,
                        quantity: parsedCommand.quantity,
                        unit: parsedCommand.unit,
                        bill_items: parsedCommand.bill_items?.map((b) => ({
                          product: b.product.name,
                          qty: b.quantity,
                          price: b.unitPrice,
                        })),
                        language: parsedCommand.language,
                        confidence: parsedCommand.confidence,
                        raw_text: parsedCommand.raw_text,
                        requires_confirmation: parsedCommand.requires_confirmation,
                      },
                      null,
                      2
                    )
                  : '{\n  "status": "No voice command parsed yet"\n}'}
              </pre>
            )}
          </div>

          {/* Manual Fallback Input (For noisy environments or denied mic) */}
          <div className="pt-2 border-t border-slate-200 space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              Manual Counter Fallback (Type or tap samples):
            </label>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Type command e.g. Do kilo chawal, ek atta packet..."
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              />
              <button
                type="submit"
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors shrink-0"
              >
                Send
              </button>
            </form>

            {/* Quick Demo Voice Command Chips */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-semibold text-slate-400 block">
                Tap to simulate spoken command:
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {QUICK_PROMPTS.map((qp, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setTranscript(qp.text);
                      processTranscript(qp.text);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 text-[11px] font-medium transition-colors text-left"
                  >
                    <span className="font-bold text-amber-800 mr-1">{qp.label}:</span>
                    <span>"{qp.text}"</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
