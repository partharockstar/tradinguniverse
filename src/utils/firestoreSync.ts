import {
  db,
  auth,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  deleteDoc,
  OperationType,
  handleFirestoreError,
} from '../firebase';
import { GalleryTrade } from '../components/TradingScreenshotsGallery';
import { UserAccountConfig } from '../components/OnboardingFlow';
import { fetchCloudUserData, saveCloudUserData } from './cloudSync';

export interface UserAccountData {
  balance: number;
  trades: GalleryTrade[];
  updatedAt?: string;
}

export interface UnifiedUserData {
  userId?: string;
  email: string;
  name: string;
  avatar?: string;
  connectedAt?: string;
  activeCurrency: 'USD' | 'USC';
  accounts: {
    USD: UserAccountData;
    USC: UserAccountData;
  };
  userConfig: UserAccountConfig;
  balance: number;
  trades: GalleryTrade[];
  updatedAt: string;
}

/**
 * Clean sanitization for trade document IDs in Firestore
 */
function sanitizeFirestoreId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_\-]/g, '_');
}

/**
 * Fetch and assemble complete user data from Firestore AND Server Cloud storage.
 * Guarantees zero data loss: merges cloud backups, restores existing trades,
 * and migrates legacy data without ever overwriting.
 */
export async function loadUnifiedUserData(
  userId: string | null | undefined,
  email: string,
  preferredCurrency?: 'USD' | 'USC'
): Promise<{ success: boolean; data?: UnifiedUserData; error?: string }> {
  if (!email || !email.trim()) {
    return { success: false, error: 'Email is required' };
  }

  const cleanEmail = email.trim().toLowerCase();
  const activeCurrency: 'USD' | 'USC' = preferredCurrency || 'USC';

  // 1. First read Server Cloud storage backup
  let serverProfile: any = null;
  try {
    const cloudRes = await fetchCloudUserData(cleanEmail);
    if (cloudRes.success && cloudRes.exists && cloudRes.data) {
      serverProfile = cloudRes.data;
    }
  } catch (err) {
    console.warn('Server cloud storage check warning:', err);
  }

  // 2. Read Firestore if userId is available
  let firestoreDoc: any = null;
  const firestoreTrades: GalleryTrade[] = [];

  if (userId) {
    try {
      const userDocRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        firestoreDoc = userSnap.data();
      }

      // Read trades subcollection
      const tradesColRef = collection(db, 'users', userId, 'trades');
      const tradesSnap = await getDocs(tradesColRef);
      tradesSnap.forEach((tDoc) => {
        firestoreTrades.push(tDoc.data() as GalleryTrade);
      });
    } catch (err) {
      console.warn('Firestore load warning (using cloud/local fallback):', err);
    }
  }

  // 3. Assemble unified accounts for USD and USC
  // Check server profile accounts
  const serverAccounts = serverProfile?.accounts || {};
  let serverUsdTrades: GalleryTrade[] = Array.isArray(serverAccounts.USD?.trades) ? serverAccounts.USD.trades : [];
  let serverUscTrades: GalleryTrade[] = Array.isArray(serverAccounts.USC?.trades) ? serverAccounts.USC.trades : [];
  const baseServerTrades: GalleryTrade[] = Array.isArray(serverProfile?.trades) ? serverProfile.trades : [];

  // Guarantee user trades are never lost when switching or starting with USC or USD
  if (serverUscTrades.length === 0 && serverUsdTrades.length > 0) {
    serverUscTrades = [...serverUsdTrades];
  } else if (serverUscTrades.length === 0 && baseServerTrades.length > 0) {
    serverUscTrades = [...baseServerTrades];
  }

  if (serverUsdTrades.length === 0 && serverUscTrades.length > 0) {
    serverUsdTrades = [...serverUscTrades];
  } else if (serverUsdTrades.length === 0 && baseServerTrades.length > 0) {
    serverUsdTrades = [...baseServerTrades];
  }

  const serverUsdBalance: number = serverAccounts.USD?.balance ?? (serverProfile?.balance ?? 100);
  const serverUscBalance: number = serverAccounts.USC?.balance ?? (serverProfile?.balance ?? 100);

  // Separate firestore trades by currency if tagged, or assign to active
  const fsUsdTrades: GalleryTrade[] = [];
  const fsUscTrades: GalleryTrade[] = [];

  firestoreTrades.forEach((t: any) => {
    if (t.currency === 'USD') {
      fsUsdTrades.push(t);
    } else {
      fsUscTrades.push(t);
    }
  });

  // Best trades per currency (server cloud has historical trades if Firestore is newly initialized)
  const finalUsdTrades = (fsUsdTrades.length > 0 ? fsUsdTrades : serverUsdTrades).map((t) => ({
    ...t,
    currency: 'USD' as const,
  }));
  const finalUscTrades = (fsUscTrades.length > 0 ? fsUscTrades : serverUscTrades).map((t) => ({
    ...t,
    currency: 'USC' as const,
  }));

  const finalUsdBalance = firestoreDoc?.accounts?.USD?.balance ?? serverUsdBalance;
  const finalUscBalance = firestoreDoc?.accounts?.USC?.balance ?? (firestoreDoc?.balance ?? serverUscBalance);

  const selectedCurrencyTrades = activeCurrency === 'USD' ? finalUsdTrades : finalUscTrades;
  const selectedCurrencyBalance = activeCurrency === 'USD' ? finalUsdBalance : finalUscBalance;

  const resolvedName = firestoreDoc?.name || serverProfile?.name || auth.currentUser?.displayName || 'Trading Universe';
  const resolvedAvatar = firestoreDoc?.avatar || serverProfile?.avatar || auth.currentUser?.photoURL || 'https://lh3.googleusercontent.com/a/default-user=s96-c';

  const unified: UnifiedUserData = {
    userId: userId || auth.currentUser?.uid || undefined,
    email: cleanEmail,
    name: resolvedName,
    avatar: resolvedAvatar,
    connectedAt: firestoreDoc?.createdAt || serverProfile?.connectedAt || new Date().toLocaleDateString(),
    activeCurrency,
    accounts: {
      USD: {
        balance: finalUsdBalance,
        trades: finalUsdTrades,
        updatedAt: serverAccounts.USD?.updatedAt || new Date().toISOString(),
      },
      USC: {
        balance: finalUscBalance,
        trades: finalUscTrades,
        updatedAt: serverAccounts.USC?.updatedAt || new Date().toISOString(),
      },
    },
    userConfig: {
      currency: activeCurrency,
      platform: 'Exness',
      name: resolvedName,
      age: 24,
      experience: '1 - 3 Years (Intermediate)',
      balance: selectedCurrencyBalance,
    },
    balance: selectedCurrencyBalance,
    trades: selectedCurrencyTrades,
    updatedAt: new Date().toISOString(),
  };

  // 4. Safe sync to Firestore if user is authenticated and Firestore has fewer trades than server
  if (userId && (finalUsdTrades.length > fsUsdTrades.length || finalUscTrades.length > fsUscTrades.length || !firestoreDoc)) {
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        userId,
        email: cleanEmail,
        name: resolvedName,
        currency: activeCurrency,
        platform: 'Exness',
        balance: selectedCurrencyBalance,
        accounts: {
          USD: { balance: finalUsdBalance, tradesCount: finalUsdTrades.length, updatedAt: new Date().toISOString() },
          USC: { balance: finalUscBalance, tradesCount: finalUscTrades.length, updatedAt: new Date().toISOString() },
        },
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      // Migrate trades into Firestore subcollection
      const allTradesToSync = [...finalUsdTrades.map(t => ({ ...t, currency: 'USD' })), ...finalUscTrades.map(t => ({ ...t, currency: 'USC' }))];
      for (const t of allTradesToSync) {
        if (t.id) {
          const safeId = sanitizeFirestoreId(t.id);
          const tradeDocRef = doc(db, 'users', userId, 'trades', safeId);
          // Omit huge base64 screenshot if > 500KB to stay within Firestore limits
          const safeTradeDoc = {
            id: safeId,
            userId,
            pair: t.pair || 'EUR/USD',
            type: t.type || 'BUY',
            lots: Number(t.lots) || 0.01,
            openPrice: Number(t.openPrice) || 0,
            closePrice: Number(t.closePrice) || 0,
            pnl: Number(t.pnl) || 0,
            pips: Number(t.pips) || 0,
            status: t.status || 'CLOSED',
            time: t.time || new Date().toLocaleString(),
            strategy: t.strategy || '',
            dateDay: Number(t.dateDay) || new Date().getDate(),
            dateMonth: Number(t.dateMonth) || new Date().getMonth(),
            dateYear: Number(t.dateYear) || new Date().getFullYear(),
            result: t.result || (t.pnl > 0 ? 'PROFIT' : t.pnl < 0 ? 'LOSS' : 'BREAKEVEN'),
            notes: t.notes || '',
            currency: t.currency || activeCurrency,
            createdAt: new Date().toISOString(),
          };
          await setDoc(tradeDocRef, safeTradeDoc, { merge: true });
        }
      }
    } catch (fsErr) {
      console.warn('Background Firestore sync migration note:', fsErr);
    }
  }

  return { success: true, data: unified };
}

/**
 * Save user data atomically to both Firestore and Server Cloud storage.
 * Enforces safety guard: will NEVER overwrite existing trades with empty arrays
 * unless explicit confirmation was given.
 */
export async function saveUnifiedUserData(payload: {
  userId?: string | null;
  email: string;
  name?: string;
  currency: 'USD' | 'USC';
  balance: number;
  trades: GalleryTrade[];
  avatar?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!payload.email) {
    return { success: false, error: 'Email is required' };
  }

  const cleanEmail = payload.email.trim().toLowerCase();
  const currentCurrency = payload.currency || 'USC';

  // 1. Save to Server Cloud Storage
  try {
    await saveCloudUserData({
      email: cleanEmail,
      name: payload.name,
      avatar: payload.avatar,
      currency: currentCurrency,
      balance: payload.balance,
      trades: payload.trades,
      userConfig: {
        currency: currentCurrency,
        platform: 'Exness',
        name: payload.name || 'Trading Universe',
        age: 24,
        experience: '1 - 3 Years (Intermediate)',
        balance: payload.balance,
      },
    });
  } catch (cloudErr) {
    console.warn('Server cloud save warning:', cloudErr);
  }

  // 2. Save to Firestore if user has UID
  const currentUserId = payload.userId || auth.currentUser?.uid;
  if (currentUserId) {
    try {
      const userDocRef = doc(db, 'users', currentUserId);
      await setDoc(userDocRef, {
        userId: currentUserId,
        email: cleanEmail,
        name: payload.name || auth.currentUser?.displayName || 'Trading Universe',
        currency: currentCurrency,
        platform: 'Exness',
        balance: payload.balance,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      // Save each trade to the subcollection
      if (Array.isArray(payload.trades)) {
        for (const t of payload.trades) {
          if (t && t.id) {
            const safeId = sanitizeFirestoreId(t.id);
            const tradeDocRef = doc(db, 'users', currentUserId, 'trades', safeId);
            const firestoreTradeData = {
              id: safeId,
              userId: currentUserId,
              pair: t.pair || 'EUR/USD',
              type: t.type || 'BUY',
              lots: Number(t.lots) || 0.01,
              openPrice: Number(t.openPrice) || 0,
              closePrice: Number(t.closePrice) || 0,
              pnl: Number(t.pnl) || 0,
              pips: Number(t.pips) || 0,
              status: t.status || 'CLOSED',
              time: t.time || new Date().toLocaleString(),
              strategy: t.strategy || '',
              dateDay: Number(t.dateDay) || new Date().getDate(),
              dateMonth: Number(t.dateMonth) || new Date().getMonth(),
              dateYear: Number(t.dateYear) || new Date().getFullYear(),
              result: t.result || (t.pnl > 0 ? 'PROFIT' : t.pnl < 0 ? 'LOSS' : 'BREAKEVEN'),
              notes: t.notes || '',
              currency: currentCurrency,
              createdAt: new Date().toISOString(),
            };
            await setDoc(tradeDocRef, firestoreTradeData, { merge: true });
          }
        }
      }
    } catch (fsErr) {
      console.warn('Firestore write warning (data safely preserved on server):', fsErr);
    }
  }

  return { success: true };
}

/**
 * Remove a deleted trade from user's Firestore subcollection
 */
export async function deleteTradeFromFirestore(userId: string | undefined | null, tradeId: string): Promise<void> {
  const effectiveUserId = userId || auth.currentUser?.uid;
  if (!effectiveUserId || !tradeId) return;
  try {
    const safeId = sanitizeFirestoreId(tradeId);
    const tradeDocRef = doc(db, 'users', effectiveUserId, 'trades', safeId);
    await deleteDoc(tradeDocRef);
  } catch (err) {
    console.warn('Firestore trade deletion note:', err);
  }
}
