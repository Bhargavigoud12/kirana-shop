# Munshi: Offline-First Kirana POS & Inventory (Phase 1: Core Inventory Foundation)

An offline-first, touch-friendly POS and inventory web app tailored for Indian kirana storekeepers. Phase 1 establishes the rock-solid offline database, strict transactional stock ledger, rich product catalog with multilingual aliases, inventory adjustments (purchase, damage, expiry, manual correction), and instant low-stock and expiry monitoring.

---

## User Review & Critical Decisions (Incorporated Corrections)

> [!IMPORTANT]
> **Strict Inventory Integrity Rules**:
> 1. When a new product is created with opening stock > 0, an `OPENING_STOCK` `stock_ledger` entry is created atomically with the product.
> 2. Every stock-changing operation creates exactly one `stock_ledger` entry:
>    - New product with opening stock → `OPENING_STOCK`
>    - Purchase stock → `PURCHASE`
>    - Damage stock removal → `DAMAGE`
>    - Expiry stock removal → `EXPIRY`
>    - Manual stock correction → `MANUAL_FIX`
> 3. Manual stock correction shows: current recorded stock, physical counted stock, calculated difference, mandatory reason, and explicit confirmation before saving.
> 4. Expiry warning window is configurable in Settings (Default: 7 days) and drives both the Expiring Soon filter and Home expiry alert banner.
> 5. Reports tab is kept as a clean, disabled "Coming Soon in Phase 2" placeholder.
> 6. Barcode field is a manual text input with a clear "Barcode scanning coming soon" badge (no fake camera scanner).
> 7. All data persists reliably in IndexedDB across browser reloads.

---

## Step 1 Scope (Current)
- App shell with touch-friendly header and fixed bottom navigation: Home/Counter, Products, Inventory, Reports (disabled placeholder), Settings.
- IndexedDB schema (`munshi_db`) with object stores for `products`, `categories`, `stock_ledger`, `settings`, `bills`, `bill_items`, `customers`, `suppliers`, and `sync_queue`.
- Local repository and transactional inventory service.
- Demo/sample data seeding (popular Indian kirana staples with Hindi/Telugu aliases, near-expiry items, and opening stock ledger entries).
- Settings screen with configurable expiry warning days (default 7 days) and database storage inspector.
