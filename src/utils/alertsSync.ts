import {
  db,
  auth,
  doc,
  setDoc,
  getDocs,
  collection,
  deleteDoc,
} from '../firebase';
import { TradingAlert, TriggeredAlertEvent } from '../types/alerts';

function sanitizeAlertId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_\-]/g, '_');
}

export async function loadUserAlerts(
  userId: string | undefined | null,
  email: string
): Promise<{ success: boolean; alerts: TradingAlert[]; error?: string }> {
  const cleanEmail = email ? email.trim().toLowerCase() : 'local';
  const firestoreAlerts: TradingAlert[] = [];

  const effectiveUserId = userId || auth.currentUser?.uid;

  if (effectiveUserId) {
    try {
      const colRef = collection(db, 'users', effectiveUserId, 'alerts');
      const snap = await getDocs(colRef);
      snap.forEach((docSnap) => {
        firestoreAlerts.push(docSnap.data() as TradingAlert);
      });
    } catch (err) {
      console.warn('Firestore alerts load warning:', err);
    }
  }

  // Check local cache
  let localAlerts: TradingAlert[] = [];
  try {
    const raw =
      localStorage.getItem(`tu_alerts_${cleanEmail}`) ||
      localStorage.getItem('tu_alerts');
    if (raw) {
      localAlerts = JSON.parse(raw);
    }
  } catch {}

  // If Firestore has alerts, use them and update local cache
  if (firestoreAlerts.length > 0) {
    localStorage.setItem(`tu_alerts_${cleanEmail}`, JSON.stringify(firestoreAlerts));
    localStorage.setItem('tu_alerts', JSON.stringify(firestoreAlerts));
    return { success: true, alerts: firestoreAlerts };
  }

  // If local alerts exist, migrate to Firestore
  if (localAlerts.length > 0) {
    if (effectiveUserId) {
      for (const al of localAlerts) {
        try {
          const safeId = sanitizeAlertId(al.id);
          const docRef = doc(db, 'users', effectiveUserId, 'alerts', safeId);
          await setDoc(docRef, { ...al, userId: effectiveUserId }, { merge: true });
        } catch {}
      }
    }
    return { success: true, alerts: localAlerts };
  }

  return { success: true, alerts: [] };
}

export async function saveUserAlert(
  userId: string | undefined | null,
  email: string,
  alert: TradingAlert
): Promise<void> {
  const cleanEmail = email ? email.trim().toLowerCase() : 'local';
  const effectiveUserId = userId || auth.currentUser?.uid;

  // 1. Update localStorage
  try {
    const raw = localStorage.getItem(`tu_alerts_${cleanEmail}`) || '[]';
    const list: TradingAlert[] = JSON.parse(raw);
    const existingIdx = list.findIndex((a) => a.id === alert.id);
    if (existingIdx >= 0) {
      list[existingIdx] = alert;
    } else {
      list.unshift(alert);
    }
    localStorage.setItem(`tu_alerts_${cleanEmail}`, JSON.stringify(list));
    localStorage.setItem('tu_alerts', JSON.stringify(list));
  } catch (e) {
    console.warn('Local alerts cache save warning:', e);
  }

  // 2. Save to Firestore
  if (effectiveUserId && alert.id) {
    try {
      const safeId = sanitizeAlertId(alert.id);
      const docRef = doc(db, 'users', effectiveUserId, 'alerts', safeId);
      await setDoc(docRef, { ...alert, userId: effectiveUserId }, { merge: true });
    } catch (fsErr) {
      console.warn('Firestore alert save warning:', fsErr);
    }
  }
}

export async function deleteUserAlert(
  userId: string | undefined | null,
  email: string,
  alertId: string
): Promise<void> {
  const cleanEmail = email ? email.trim().toLowerCase() : 'local';
  const effectiveUserId = userId || auth.currentUser?.uid;

  // 1. Update localStorage
  try {
    const raw = localStorage.getItem(`tu_alerts_${cleanEmail}`) || '[]';
    const list: TradingAlert[] = JSON.parse(raw).filter((a: TradingAlert) => a.id !== alertId);
    localStorage.setItem(`tu_alerts_${cleanEmail}`, JSON.stringify(list));
    localStorage.setItem('tu_alerts', JSON.stringify(list));
  } catch {}

  // 2. Delete from Firestore
  if (effectiveUserId && alertId) {
    try {
      const safeId = sanitizeAlertId(alertId);
      const docRef = doc(db, 'users', effectiveUserId, 'alerts', safeId);
      await deleteDoc(docRef);
    } catch (fsErr) {
      console.warn('Firestore alert delete warning:', fsErr);
    }
  }
}

export async function bulkSaveAlerts(
  userId: string | undefined | null,
  email: string,
  alerts: TradingAlert[]
): Promise<void> {
  const cleanEmail = email ? email.trim().toLowerCase() : 'local';
  const effectiveUserId = userId || auth.currentUser?.uid;

  localStorage.setItem(`tu_alerts_${cleanEmail}`, JSON.stringify(alerts));
  localStorage.setItem('tu_alerts', JSON.stringify(alerts));

  if (effectiveUserId) {
    for (const al of alerts) {
      try {
        const safeId = sanitizeAlertId(al.id);
        const docRef = doc(db, 'users', effectiveUserId, 'alerts', safeId);
        await setDoc(docRef, { ...al, userId: effectiveUserId }, { merge: true });
      } catch {}
    }
  }
}
