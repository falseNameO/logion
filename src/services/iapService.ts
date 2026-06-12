/**
 * In-app purchase service backed by react-native-iap v15.
 *
 * Purchase records are persisted to a JSON file via expo-file-system so they
 * survive app restarts without a network round-trip.
 *
 * isUnlocked() is synchronous — it reads the module-level `_purchased` Set
 * that is populated by initializeIAP() and after each successful purchase or
 * restore. The Set must be populated before any screen calls isUnlocked().
 */

import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  getAvailablePurchases,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  type Product,
  type Purchase,
} from 'react-native-iap';
import * as FileSystem from 'expo-file-system/legacy';
import { IAP_PRODUCT_IDS, ALL_IAP_PRODUCT_IDS } from '../constants';

// ─── Types ────────────────────────────────────────────────────────────────────

export type { Product };

export interface IAPProduct {
  productId: string;
  title: string;
  description: string;
  localizedPrice: string;
}

export interface PurchaseResult {
  productId: string;
  status: 'purchased' | 'restored' | 'not_purchased' | 'error';
}

// ─── Persistence ──────────────────────────────────────────────────────────────

const PURCHASE_FILE = `${FileSystem.documentDirectory}store/iap_purchases.json`;

async function loadPersistedPurchases(): Promise<Set<string>> {
  try {
    const info = await FileSystem.getInfoAsync(PURCHASE_FILE);
    if (!info.exists) return new Set();
    const raw = await FileSystem.readAsStringAsync(PURCHASE_FILE);
    const ids: string[] = JSON.parse(raw);
    return new Set(ids);
  } catch {
    return new Set();
  }
}

async function persistPurchases(ids: Set<string>): Promise<void> {
  try {
    const dir = `${FileSystem.documentDirectory}store/`;
    const dirInfo = await FileSystem.getInfoAsync(dir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
    await FileSystem.writeAsStringAsync(PURCHASE_FILE, JSON.stringify([...ids]));
  } catch {
    // Non-fatal — the in-memory Set is still correct for this session.
  }
}

// ─── Module-level state ───────────────────────────────────────────────────────

// Synchronous unlock check reads from this Set. Populated on init and after
// each successful purchase/restore.
let _purchased: Set<string> = new Set();
let _initialized = false;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Call once on app startup (e.g. in App.tsx useEffect).
 * Loads persisted purchases and opens the store connection.
 */
export async function initializeIAP(): Promise<void> {
  if (_initialized) return;

  // Hydrate the in-memory Set before any screen renders.
  _purchased = await loadPersistedPurchases();

  try {
    await initConnection();
    _initialized = true;

    // Register listeners to handle OS-initiated purchase completions
    // (e.g. promoted purchases on iOS, pending transactions on Android).
    purchaseUpdatedListener(async (purchase: Purchase) => {
      if (purchase.productId) {
        await _recordPurchase(purchase.productId);
        await finishTransaction({ purchase, isConsumable: false });
      }
    });

    purchaseErrorListener(() => {
      // Errors are surfaced to callers via thrown exceptions; no global handling needed.
    });
  } catch {
    // Store unavailable (simulator, no network) — not fatal.
    _initialized = true;
  }
}

/**
 * Tears down the store connection. Call in your root component cleanup.
 */
export async function teardownIAP(): Promise<void> {
  if (!_initialized) return;
  await endConnection();
  _initialized = false;
}

/**
 * Fetches localised product metadata from the store for all IAP IDs.
 */
export async function getProducts(): Promise<IAPProduct[]> {
  try {
    const products = await fetchProducts({
      skus: ALL_IAP_PRODUCT_IDS,
      type: 'inapp',
    });
    return (products as Product[]).map(p => ({
      productId: p.productId ?? '',
      title: p.title ?? p.productId ?? '',
      description: p.description ?? '',
      localizedPrice:
        // ProductIOS has localizedPrice; ProductAndroid has localizedPrice too
        // accessed as a string field. Fall back gracefully.
        (p as unknown as { localizedPrice?: string }).localizedPrice ?? '',
    }));
  } catch {
    return [];
  }
}

/**
 * Initiates a purchase for a specific textbook slug.
 * Throws on user cancellation or store error.
 */
export async function purchaseTextbook(slug: string): Promise<void> {
  const productId =
    IAP_PRODUCT_IDS.TEXTBOOKS[slug as keyof typeof IAP_PRODUCT_IDS.TEXTBOOKS];
  if (!productId) throw new Error(`Unknown textbook slug: ${slug}`);
  await _purchase(productId);
}

/**
 * Initiates a purchase of the full PRO_UNLOCK product.
 * Throws on user cancellation or store error.
 */
export async function purchasePro(): Promise<void> {
  await _purchase(IAP_PRODUCT_IDS.PRO_UNLOCK);
}

/**
 * Restores previous purchases for this App Store / Google Play account.
 * Updates the in-memory Set and persists the results.
 */
export async function restorePurchases(): Promise<PurchaseResult[]> {
  const available = await getAvailablePurchases();
  const results: PurchaseResult[] = [];

  for (const purchase of available) {
    if (!purchase.productId) continue;
    await _recordPurchase(purchase.productId);
    results.push({ productId: purchase.productId, status: 'restored' });
  }

  // Report products with no record as not_purchased.
  for (const id of ALL_IAP_PRODUCT_IDS) {
    if (!_purchased.has(id)) {
      results.push({ productId: id, status: 'not_purchased' });
    }
  }

  return results;
}

/**
 * Synchronous unlock check. Returns true if:
 *   - PRO_UNLOCK has been purchased (unlocks everything), OR
 *   - the specific product ID for `feature` has been purchased.
 *
 * `feature` may be a textbook slug (e.g. `'mounce'`) or the literal string
 * `'pro'`. All other strings return false.
 */
export function isUnlocked(feature: string): boolean {
  if (_purchased.has(IAP_PRODUCT_IDS.PRO_UNLOCK)) return true;

  if (feature === 'pro') return false;

  const productId =
    IAP_PRODUCT_IDS.TEXTBOOKS[feature as keyof typeof IAP_PRODUCT_IDS.TEXTBOOKS];
  return productId ? _purchased.has(productId) : false;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function _purchase(productId: string): Promise<void> {
  const purchase = await requestPurchase({ sku: productId });
  const p = Array.isArray(purchase) ? purchase[0] : purchase;
  if (p?.productId) {
    await _recordPurchase(p.productId);
    await finishTransaction({ purchase: p, isConsumable: false });
  }
}

async function _recordPurchase(productId: string): Promise<void> {
  _purchased.add(productId);
  await persistPurchases(_purchased);
}
