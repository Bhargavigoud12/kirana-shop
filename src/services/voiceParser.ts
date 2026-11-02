import { Product, ProductUnit } from '../types/inventory';

export type VoiceIntentType =
  | 'CREATE_BILL'
  | 'ADD_STOCK'
  | 'REMOVE_STOCK'
  | 'CHECK_STOCK'
  | 'LOW_STOCK'
  | 'EXPIRY_CHECK'
  | 'CORRECT_STOCK'
  | 'CANCEL_LAST'
  | 'SALES_REPORT'
  | 'CREDIT_QUERY'
  | 'UNKNOWN';

export interface BillItemEntity {
  product: Product;
  quantity: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
}

export interface ParsedVoiceCommand {
  intent: VoiceIntentType;
  raw_text: string;
  normalized_text: string;
  language: 'hinglish' | 'hindi' | 'telugu' | 'english';
  confidence: number;
  requires_confirmation: boolean;
  confirmation_prompt: string;
  completion_speech: string;
  // Specific entity fields
  product?: Product;
  candidate_products?: Product[];
  quantity?: number;
  unit?: string;
  bill_items?: BillItemEntity[];
  bill_total?: number;
  customer_name?: string;
  removal_reason?: string;
  period?: 'today' | 'week' | 'month';
  error_message?: string;
}

// Indic Word-to-Number Dictionary (Hindi, Telugu, English)
const NUMBER_WORDS: Record<string, number> = {
  // Hindi / Hinglish
  aadha: 0.5,
  adha: 0.5,
  dedh: 1.5,
  dhai: 2.5,
  ek: 1,
  do: 2,
  teen: 3,
  chaar: 4,
  char: 4,
  paanch: 5,
  panch: 5,
  che: 6,
  chhe: 6,
  saat: 7,
  aath: 8,
  ath: 8,
  nau: 9,
  das: 10,
  gyarah: 11,
  barah: 12,
  terah: 13,
  chaudah: 14,
  pandrah: 15,
  solah: 16,
  satrah: 17,
  atharah: 18,
  unnees: 19,
  bees: 20,
  pachees: 25,
  tees: 30,
  chaalees: 40,
  pachaas: 50,
  sau: 100,

  // Telugu
  ara: 0.5,
  okka: 1,
  okati: 1,
  rendu: 2,
  moodu: 3,
  nalugu: 4,
  aidu: 5,
  aaru: 6,
  yedu: 7,
  elu: 7,
  enimidhi: 8,
  thommidhi: 9,
  padi: 10,
  iravai: 20,
  muppai: 30,

  // English
  half: 0.5,
  quarter: 0.25,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  twenty: 20,
  fifty: 50,
};

// Canonical Unit Dictionary
const UNIT_SYNONYMS: Record<string, string> = {
  kg: 'kg',
  kilo: 'kg',
  kilos: 'kg',
  kilogram: 'kg',
  gram: 'g',
  grams: 'g',
  gm: 'g',
  g: 'g',
  litre: 'litre',
  litru: 'litre',
  litres: 'litre',
  liter: 'litre',
  liters: 'litre',
  l: 'litre',
  ml: 'ml',
  packet: 'packet',
  packets: 'packet',
  packetlu: 'packet',
  pkt: 'packet',
  pack: 'packet',
  piece: 'piece',
  pieces: 'piece',
  pc: 'piece',
  pcs: 'piece',
  dozen: 'dozen',
  darjan: 'dozen',
  bag: 'bag',
  bags: 'bag',
  basta: 'bag',
  katta: 'bag',
  bori: 'bag',
  carton: 'carton',
  dabba: 'carton',
  box: 'carton',
  tin: 'carton',
};

export class VoiceParser {
  /**
   * Normalizes words, turns Indic number words into digits, cleans noise
   */
  public normalizeText(text: string): string {
    let lower = text.toLowerCase().trim();

    // Remove punctuation except commas
    lower = lower.replace(/[!?.()]/g, '');

    const tokens = lower.split(/\s+/);
    const convertedTokens = tokens.map((token) => {
      // Check if it's a known number word
      if (NUMBER_WORDS[token] !== undefined) {
        return NUMBER_WORDS[token].toString();
      }
      return token;
    });

    return convertedTokens.join(' ');
  }

  /**
   * Matches candidate products against query string using names and multilingual aliases
   */
  public findMatchingProducts(query: string, products: Product[]): Product[] {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const matches: Array<{ product: Product; score: number }> = [];

    for (const p of products) {
      if (!p.is_active) continue;
      let score = 0;

      // Exact name match
      if (p.name.toLowerCase() === q) {
        score += 100;
      } else if (p.name.toLowerCase().includes(q)) {
        score += 50;
      }

      // Alias matches (e.g. "chawal", "biyyam", "atta", "tel")
      for (const alias of p.aliases || []) {
        const al = alias.toLowerCase().trim();
        if (al === q) {
          score += 80;
        } else if (q.includes(al) || al.includes(q)) {
          score += 40;
        }
      }

      // Barcode exact match
      if (p.barcode && p.barcode === q) {
        score += 90;
      }

      if (score > 0) {
        matches.push({ product: p, score });
      }
    }

    // Sort descending by score
    matches.sort((a, b) => b.score - a.score);
    return matches.map((m) => m.product);
  }

  /**
   * Extract quantity and unit from text snippet (e.g. "2 kilo", "5 packet", "10")
   */
  public extractQuantityAndUnit(text: string): { quantity: number; unit?: string } {
    // Matches patterns like "2.5 kg", "10 packet", "5 litre", "2"
    const match = text.match(/(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?/);
    if (!match) {
      return { quantity: 1 };
    }

    const qty = parseFloat(match[1]);
    const rawUnit = match[2]?.toLowerCase();
    const normalizedUnit = rawUnit && UNIT_SYNONYMS[rawUnit] ? UNIT_SYNONYMS[rawUnit] : rawUnit;

    return {
      quantity: isNaN(qty) ? 1 : qty,
      unit: normalizedUnit,
    };
  }

  /**
   * Main parsing pipeline: converts spoken input into structured JSON
   */
  public parseCommand(rawSpeech: string, products: Product[]): ParsedVoiceCommand {
    const normalized = this.normalizeText(rawSpeech);

    // Default baseline result
    let intent: VoiceIntentType = 'UNKNOWN';
    let confidence = 0.88;
    let confirmation_prompt = '';
    let completion_speech = '';
    let requires_confirmation = false;

    // Detect language preference
    let language: 'hinglish' | 'hindi' | 'telugu' | 'english' = 'hinglish';
    if (
      normalized.includes('entha') ||
      normalized.includes('vachindi') ||
      normalized.includes('padipoindi') ||
      normalized.includes('cheyyi') ||
      normalized.includes('aipoindi')
    ) {
      language = 'telugu';
    } else if (
      normalized.includes('kya') ||
      normalized.includes('kitna') ||
      normalized.includes('aaya') ||
      normalized.includes('karo')
    ) {
      language = 'hinglish';
    }

    // 1. SALES_REPORT: "Aaj ka report sunao" vs "Aaj kitna bikri hua?"
    if (
      normalized.includes('report sunao') ||
      normalized.includes('ka report') ||
      normalized.includes('pura report') ||
      normalized.includes('bikri') ||
      normalized.includes('sales report') ||
      normalized.includes('sale aindi') ||
      (normalized.includes('aaj') && normalized.includes('sale')) ||
      normalized.includes('today sale')
    ) {
      const isFullReport =
        normalized.includes('report sunao') ||
        normalized.includes('ka report') ||
        normalized.includes('pura report') ||
        normalized.includes('sales report');

      return {
        intent: 'SALES_REPORT',
        raw_text: rawSpeech,
        normalized_text: normalized,
        language,
        confidence: 0.96,
        requires_confirmation: false,
        confirmation_prompt: '',
        completion_speech: isFullReport ? 'full_report_speech' : 'brief_sales_speech',
        period: 'today',
        removal_reason: isFullReport ? 'full_report' : 'brief_sales',
      };
    }

    // 2. CREDIT_QUERY: "Ramesh ka udhaar kitna hai?" / "udhar kitna hai"
    if (
      normalized.includes('udhaar') ||
      normalized.includes('udhar') ||
      normalized.includes('appu') ||
      normalized.includes('baaki') ||
      normalized.includes('credit')
    ) {
      // Extract person name (e.g., words before "ka udhaar" or after "udhaar")
      let customerName = 'Ramesh';
      const nameMatch =
        rawSpeech.match(/([A-Za-z]+)\s*(?:ka|ki|yokka)?\s*(?:udhaar|udhar|appu)/i) ||
        rawSpeech.match(/(?:udhaar|udhar|appu)\s*([A-Za-z]+)/i);
      if (nameMatch && nameMatch[1]) {
        customerName = nameMatch[1].trim();
      }

      return {
        intent: 'CREDIT_QUERY',
        raw_text: rawSpeech,
        normalized_text: normalized,
        language,
        confidence: 0.94,
        requires_confirmation: false,
        confirmation_prompt: '',
        completion_speech: `${customerName} ka udhaar balance screen par hai.`,
        customer_name: customerName,
      };
    }

    // 3. LOW_STOCK: "Kya khatam hone wala hai?" / "low stock"
    if (
      normalized.includes('khatam hone') ||
      normalized.includes('khatam') ||
      normalized.includes('aipoindi') ||
      normalized.includes('low stock') ||
      normalized.includes('reorder')
    ) {
      return {
        intent: 'LOW_STOCK',
        raw_text: rawSpeech,
        normalized_text: normalized,
        language,
        confidence: 0.95,
        requires_confirmation: false,
        confirmation_prompt: '',
        completion_speech: 'Low stock items screen par highlight kar diye hain.',
      };
    }

    // 4. EXPIRY_CHECK: "Kya expire hone wala hai?" / "expiry items"
    if (
      normalized.includes('expire') ||
      normalized.includes('expiry') ||
      normalized.includes('date khatam')
    ) {
      return {
        intent: 'EXPIRY_CHECK',
        raw_text: rawSpeech,
        normalized_text: normalized,
        language,
        confidence: 0.95,
        requires_confirmation: false,
        confirmation_prompt: '',
        completion_speech: 'Expiring aur expired items screen par hain.',
      };
    }

    // 5. CANCEL_LAST: "Last entry cancel karo" / "undo"
    if (
      normalized.includes('cancel') ||
      normalized.includes('radd') ||
      normalized.includes('undo') ||
      normalized.includes('wapas lo')
    ) {
      return {
        intent: 'CANCEL_LAST',
        raw_text: rawSpeech,
        normalized_text: normalized,
        language,
        confidence: 0.92,
        requires_confirmation: true,
        confirmation_prompt: 'Last action cancel karna hai. Confirm karein?',
        completion_speech: 'Last bill cancel ho gaya aur stock restore ho gaya.',
      };
    }

    // 6. ADD_STOCK: "Aaj 10 kilo chawal aaya" / "10 packet atta add karo"
    if (
      normalized.includes('aaya') ||
      normalized.includes('aayi') ||
      normalized.includes('vachindi') ||
      normalized.includes('add stock') ||
      normalized.includes('purchase') ||
      normalized.includes('delivery') ||
      (normalized.includes('add') && (normalized.includes('kilo') || normalized.includes('packet') || normalized.includes('kg')))
    ) {
      intent = 'ADD_STOCK';
      const { quantity, unit } = this.extractQuantityAndUnit(normalized);

      // Find matching product
      const candidates = this.findMatchingProducts(normalized, products);
      const matched = candidates[0] || null;

      const pName = matched ? matched.name : 'product';
      const pUnit = unit || matched?.unit || 'unit';

      return {
        intent,
        raw_text: rawSpeech,
        normalized_text: normalized,
        language,
        confidence: matched ? 0.94 : 0.72,
        requires_confirmation: true,
        product: matched,
        candidate_products: candidates.length > 1 ? candidates.slice(0, 3) : undefined,
        quantity,
        unit: pUnit,
        confirmation_prompt: `${pName} ${quantity} ${pUnit} add karna hai. Confirm?`,
        completion_speech: `${pName} ${quantity} ${pUnit} add ho gaya.`,
      };
    }

    // 7. REMOVE_STOCK: "Chawal 2 kilo kharab ho gaya" / "2 packet kharab"
    if (
      normalized.includes('kharab') ||
      normalized.includes('damage') ||
      normalized.includes('padipoindi') ||
      normalized.includes('phat gaya') ||
      normalized.includes('leak') ||
      normalized.includes('waste') ||
      normalized.includes('sadh')
    ) {
      intent = 'REMOVE_STOCK';
      const { quantity, unit } = this.extractQuantityAndUnit(normalized);
      const candidates = this.findMatchingProducts(normalized, products);
      const matched = candidates[0] || null;

      const pName = matched ? matched.name : 'product';
      const pUnit = unit || matched?.unit || 'unit';

      return {
        intent,
        raw_text: rawSpeech,
        normalized_text: normalized,
        language,
        confidence: matched ? 0.93 : 0.7,
        requires_confirmation: true,
        product: matched,
        candidate_products: candidates.length > 1 ? candidates.slice(0, 3) : undefined,
        quantity,
        unit: pUnit,
        removal_reason: 'Voice: Damaged / spoiled goods recorded at counter',
        confirmation_prompt: `${pName} ${quantity} ${pUnit} damage mark karna hai. Confirm?`,
        completion_speech: `${pName} ${quantity} ${pUnit} damage ledger mein record ho gaya.`,
      };
    }

    // 8. CORRECT_STOCK: "Chawal 8 kilo karo" / "Atta 10 karo"
    if (
      (normalized.includes('karo') || normalized.includes('cheyyi') || normalized.includes('set')) &&
      !normalized.includes('cancel')
    ) {
      const { quantity, unit } = this.extractQuantityAndUnit(normalized);
      const candidates = this.findMatchingProducts(normalized, products);
      const matched = candidates[0] || null;

      if (matched && quantity !== undefined) {
        return {
          intent: 'CORRECT_STOCK',
          raw_text: rawSpeech,
          normalized_text: normalized,
          language,
          confidence: 0.92,
          requires_confirmation: true,
          product: matched,
          quantity,
          unit: unit || matched.unit,
          confirmation_prompt: `${matched.name} ka stock ${quantity} ${matched.unit} set karna hai. Confirm?`,
          completion_speech: `${matched.name} ka stock ${quantity} ${matched.unit} set ho gaya.`,
        };
      }
    }

    // 9. CHECK_STOCK: "Chawal kitna hai?" / "Biyyam entha undi?"
    if (
      normalized.includes('kitna') ||
      normalized.includes('entha') ||
      normalized.includes('check') ||
      normalized.includes('hai kya')
    ) {
      const candidates = this.findMatchingProducts(normalized, products);
      const matched = candidates[0] || null;

      if (matched) {
        return {
          intent: 'CHECK_STOCK',
          raw_text: rawSpeech,
          normalized_text: normalized,
          language,
          confidence: 0.95,
          requires_confirmation: false,
          product: matched,
          confirmation_prompt: '',
          completion_speech: `${matched.name} mein ${matched.current_stock} ${matched.unit} bacha hai. Selling price ₹${matched.selling_price} hai.`,
        };
      }
    }

    // 10. CREATE_BILL: "Do kilo chawal, ek atta packet, teen Maggi"
    // Split on commas or 'aur' / 'and' / 'mariyu'
    const segments = normalized
      .split(/,|(?:\s+aur\s+)|\s+and\s+|\s+mariyu\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const extractedBillItems: BillItemEntity[] = [];
    let billSubtotal = 0;

    for (const segment of segments) {
      const { quantity, unit } = this.extractQuantityAndUnit(segment);
      const matches = this.findMatchingProducts(segment, products);
      if (matches.length > 0) {
        const prod = matches[0];
        const lineTotal = Math.round(quantity * prod.selling_price * 100) / 100;
        extractedBillItems.push({
          product: prod,
          quantity,
          unit: unit || prod.unit,
          unitPrice: prod.selling_price,
          lineTotal,
        });
        billSubtotal += lineTotal;
      }
    }

    if (extractedBillItems.length > 0) {
      const itemsSummary = extractedBillItems
        .map((bi) => `${bi.quantity} ${bi.unit} ${bi.product.name} (₹${bi.lineTotal})`)
        .join(', ');

      return {
        intent: 'CREATE_BILL',
        raw_text: rawSpeech,
        normalized_text: normalized,
        language,
        confidence: 0.93,
        requires_confirmation: true,
        bill_items: extractedBillItems,
        bill_total: billSubtotal,
        confirmation_prompt: `${extractedBillItems.map((bi) => `${bi.quantity} ${bi.unit} ${bi.product.name} ₹${bi.lineTotal}`).join(', ')}. Total ₹${billSubtotal}. Confirm bill?`,
        completion_speech: `Bill confirm ho gaya. Total ₹${billSubtotal}. Stock ledger update ho gaya.`,
      };
    }

    // UNKNOWN / Fallback
    return {
      intent: 'UNKNOWN',
      raw_text: rawSpeech,
      normalized_text: normalized,
      language,
      confidence: 0.45,
      requires_confirmation: false,
      confirmation_prompt: '',
      completion_speech: 'Command samajh nahi aaya. Kripya dobara bolein.',
      error_message: 'Could not detect kirana command. Try "Do kilo chawal", "10 kg chawal aaya", or "Chawal kitna hai?"',
    };
  }
}

export const voiceParser = new VoiceParser();
