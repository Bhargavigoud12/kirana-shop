# Munshi: Offline-First Kirana POS & Inventory (Phase 3: Voice MVP)

A voice-first assistant built for Indian kirana storekeepers using the browser's Web Speech API (`SpeechRecognition` and `SpeechSynthesis`). It enables hands-free billing, stock addition, damage write-offs, physical corrections, inventory queries, sales summaries, and customer udhaar credit queries across Telugu, Hindi, English, and Hinglish.

---

## Critical Invariants & Safety Guardrails for Voice MVP

> [!IMPORTANT]
> **Voice Safety & Auditing Rules**:
> 1. **Structured JSON before execution**: Every spoken utterance is normalized and parsed into a structured JSON payload (`intent`, `entities`, `confidence`, `language`) before any action is scheduled.
> 2. **Double Confirmation**: Every stock-changing, financial, or destructive action requires **both** an on-screen confirmation card and a spoken text-to-speech prompt before committing (e.g. *"Chawal 10 kilo add karna hai. Confirm?"*).
> 3. **Strict Stock Ledger Preservation**: Voice commands never bypass ledger invariants. A voice stock arrival creates a `PURCHASE` ledger entry; a voice damage command creates a `DAMAGE` entry; a voice count fix creates a `MANUAL_FIX` entry; a voice bill creates a `SALE` entry.
> 4. **Negative Stock Defense**: Spoken removals or sales that exceed available stock are rejected with spoken and visual warnings.
> 5. **Multi-Match & Unknown Fallbacks**: If multiple products match an alias (e.g. *oil* when both Sunflower and Mustard exist), the app displays tap options. If no product matches, it offers manual addition.
> 6. **Manual Fallback**: If the browser's microphone is denied, unsupported, or noisy, full counter actions remain 100% accessible via tap/type.

---

## 1. Voice Pipeline Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MUNSHI VOICE PIPELINE                           │
│                                                                        │
│  [1. Audio Input]                                                      │
│    Shopkeeper taps big mic button on Counter/Home                      │
│    Web Speech API (SpeechRecognition / webkitSpeechRecognition)        │
│    Languages: hi-IN, te-IN, en-IN                                      │
│         │                                                              │
│         ▼                                                              │
│  [2. Text Normalization]                                               │
│    - Indic numbers: do (2), teen (3), char (4), paanch (5),            │
│      aadha (0.5), dedh (1.5), dhai (2.5), okati (1), rendu (2)...      │
│    - Kirana units: kg, kilo, g, gram, packet, packet-lu, dabba, litre  │
│    - Noise cleanup and whitespace trimming                             │
│         │                                                              │
│         ▼                                                              │
│  [3. Intent & Entity Extraction (Rule-Based & Regex NLP)]              │
│    - CREATE_BILL: items, quantities, units                             │
│    - ADD_STOCK: product, incoming quantity, unit                       │
│    - REMOVE_STOCK: product, quantity, unit, reason                     │
│    - CHECK_STOCK: target product                                       │
│    - LOW_STOCK / EXPIRY_CHECK: alert filter                            │
│    - CORRECT_STOCK: target product, physical count                     │
│    - SALES_REPORT: sales summary time range                            │
│    - CREDIT_QUERY: customer name                                       │
│    - CANCEL_LAST: last reversible action                               │
│         │                                                              │
│         ▼                                                              │
│  [4. Product Alias & Fuzzy Matcher]                                    │
│    Matches spoken tokens against indexed product aliases:              │
│    - "chawal" / "biyyam" / "rice" ──► Sona Masoori Rice                │
│    - "atta" / "gehu" / "godhuma"  ──► Aashirvaad Atta                  │
│    - "tel" / "nune" / "oil"       ──► Fortune Sunflower Oil            │
│         │                                                              │
│         ▼                                                              │
│  [5. Confirmation & Voice Feedback]                                    │
│    - Stock change: Modal card + Spoken: "Chawal 10 kilo add karna hai?"│
│    - Query: Instant screen card + Spoken: "Rice mein 20 bag bacha hai" │
│         │                                                              │
│         ▼                                                              │
│  [6. Transactional Execution & Spoken Completion]                      │
│    - Writes atomic stock / bill record to IndexedDB                    │
│    - Spoken confirmation: "Chawal 10 kilo add ho gaya."                │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Voice Command Mapping Table

| Intent | Sample Utterance (Hinglish / Telugu / Hindi) | Extracted Entities | Confirmation Speech Prompt | Action & Ledger Record | Completion Speech |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`CREATE_BILL`** | *"Do kilo chawal, ek atta packet, teen Maggi"* / *"Rendu kg biyyam, okka atta"* | `items: [{product, qty, unit}, ...]` | *"2 kg rice ₹120, 1 atta ₹240, 3 Maggi ₹42. Total ₹402. Confirm?"* | Creates `Bill` + `BillItems`, reduces stock with `SALE` ledger entries | *"Bill confirm ho gaya. Total ₹402."* |
| **`ADD_STOCK`** | *"Aaj 10 kilo chawal aaya"* / *"Padi kilo biyyam vachindi"* | `product: "rice", qty: 10, unit: "kg"` | *"Chawal 10 kilo add karna hai. Confirm?"* | Increments stock with `PURCHASE` ledger entry | *"Chawal 10 kilo add ho gaya. Total stock 22 kg."* |
| **`REMOVE_STOCK`** | *"Chawal 2 kilo kharab ho gaya"* / *"Rendu kilo biyyam padipoindi"* | `product: "rice", qty: 2, unit: "kg", reason: "damage"` | *"Chawal 2 kilo kharab mark karna hai. Confirm?"* | Decrements stock with `DAMAGE` ledger entry (guards negative stock) | *"Chawal 2 kilo damage record ho gaya."* |
| **`CHECK_STOCK`** | *"Chawal kitna hai?"* / *"Biyyam entha undi?"* / *"Rice stock check"* | `product: "rice"` | None (Instant query) | Displays product stock card | *"Rice mein 20 bag bacha hai. Selling price ₹1550."* |
| **`LOW_STOCK`** | *"Kya khatam hone wala hai?"* / *"Emi aipoindi?"* / *"Low stock items"* | None | None (Instant query) | Opens low-stock list & highlights counts | *"3 items low stock mein hain: Toor Dal, Sugar, aur Fortune Oil."* |
| **`EXPIRY_CHECK`** | *"Kya expire hone wala hai?"* / *"Expiry items chupinchu"* | None | None (Instant query) | Opens expiring soon list | *"2 items expire hone wale hain: Amul Milk 3 din mein, Curd 4 din mein."* |
| **`CORRECT_STOCK`** | *"Chawal 8 kilo karo"* / *"Atta 15 packet cheyyi"* | `product: "rice", count: 8, unit: "kg"` | *"Chawal ka stock 8 kilo set karna hai. Confirm?"* | Sets stock to 8 kg, writes `MANUAL_FIX` ledger entry with reason *"Voice correction"* | *"Chawal stock 8 kilo set ho gaya."* |
| **`CANCEL_LAST`** | *"Last entry cancel karo"* / *"Aakari entry cancel cheyyi"* | None | *"Last reversible action cancel karna hai. Confirm?"* | Reverses last safe draft bill or navigates to ledger | *"Last bill cancel ho gaya aur stock restore ho gaya."* |
| **`SALES_REPORT`** | *"Aaj kitna bikri hua?"* / *"Eroju entha sale aindi?"* | `range: "today"` | None (Instant query) | Displays daily closing summary (bills count, total revenue) | *"Aaj kul 4 bills bane, kul bikri ₹1,850 hui."* |
| **`CREDIT_QUERY`** | *"Ramesh ka udhaar kitna hai?"* / *"Ramesh ki entha appu undi?"* | `customer: "Ramesh"` | None (Instant query) | Displays customer credit card with outstanding balance | *"Ramesh ka kul udhaar ₹850 bacha hai."* |

---

## 3. Indic Normalizer & Entity Parser Specification

### Spoken Numbers
- **Hindi/Hinglish**: `ek` (1), `do` (2), `teen` (3), `chaar` (4), `paanch` (5), `chhe` (6), `saat` (7), `aath` (8), `nau` (9), `das` (10), `gyarah` (11), `barah` (12), `pandrah` (15), `bees` (20), `pachees` (25), `pachaas` (50), `aadha` (0.5), `dedh` (1.5), `dhai` (2.5), `sawa` (+0.25).
- **Telugu**: `okati`/`okka` (1), `rendu` (2), `moodu` (3), `nalugu` (4), `aidu` (5), `aaru` (6), `yedu` (7), `enimidhi` (8), `thommidhi` (9), `padi` (10), `iravai` (20), `ara` (0.5).
- **English**: `half` (0.5), `quarter` (0.25), `one` (1), `two` (2), `three` (3)...

### Units
- `kg`, `kilo`, `kilos`, `gram`, `gm`, `g`, `litre`, `litru`, `liters`, `ml`, `packet`, `packets`, `packet-lu`, `piece`, `pieces`, `dabba`, `tin`, `bag`, `bags`, `basta`, `katta`, `dozen`, `darjan`.

---

## 4. Components & Services to Create

1. **`/src/services/speechService.ts`**: Web Speech API wrapper for `SpeechRecognition` (cross-browser with `webkitSpeechRecognition`), auto-reconnect, language switching (`hi-IN`, `te-IN`, `en-IN`), and Web Speech `speechSynthesis` for clear Indic TTS responses.
2. **`/src/services/voiceParser.ts`**: Offline NLP normalizer, Indic word-to-number converter, unit mapper, intent classification engine, and fuzzy alias resolver.
3. **`/src/components/VoiceAssistantModal.tsx`**: High-presence counter voice overlay with listening visualizer, real-time live transcript display, structured parsed JSON badge, on-screen confirmation card, manual text fallback input, and disambiguation picker for multi-matches.
4. **`/src/components/VoiceMicButton.tsx`**: Prominent 64px+ tactile microphone trigger for the Counter/Home screen with listening pulse animation.
5. **`/src/screens/HomeScreen.tsx` & `/src/screens/CounterScreen.tsx`**: Interactive integration of the voice assistant with instant spoken and visual reactions.
6. **`/src/services/billingService.ts`**: Offline bill creation, daily sales summary calculator, and customer udhaar ledger to back `CREATE_BILL`, `SALES_REPORT`, and `CREDIT_QUERY`.
