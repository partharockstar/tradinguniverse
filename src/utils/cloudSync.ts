import { UserAccountConfig } from '../components/OnboardingFlow';
import { GalleryTrade } from '../components/TradingScreenshotsGallery';
import { GoogleAccount } from '../App';

export interface CloudCurrencyAccount {
  balance: number;
  trades: GalleryTrade[];
  updatedAt?: string;
}

export interface CloudSyncResponse {
  success: boolean;
  exists?: boolean;
  savedAt?: string;
  tradesCount?: number;
  message?: string;
  error?: string;
  data?: {
    email: string;
    name: string;
    avatar?: string;
    connectedAt?: string;
    activeCurrency?: 'USD' | 'USC';
    accounts?: {
      USD?: CloudCurrencyAccount;
      USC?: CloudCurrencyAccount;
    };
    userConfig: UserAccountConfig;
    balance: number;
    trades: GalleryTrade[];
    updatedAt: string;
  };
}

/**
 * Fetch cloud account data for a specific user email
 */
export async function fetchCloudUserData(email: string): Promise<CloudSyncResponse> {
  if (!email || !email.trim()) {
    return { success: false, error: 'Email is required' };
  }

  try {
    const res = await fetch(`/api/cloud-sync/load?email=${encodeURIComponent(email.trim().toLowerCase())}`, {
      headers: { 'Cache-Control': 'no-cache' },
    });
    const json = await res.json();
    return json;
  } catch (err: any) {
    console.warn('Failed to load cloud user data:', err);
    return { success: false, error: err?.message || 'Network error connecting to cloud server' };
  }
}

/**
 * Save user profile, config, balance, and trades to cloud storage
 */
export async function saveCloudUserData(payload: {
  email: string;
  name?: string;
  avatar?: string;
  userConfig?: UserAccountConfig;
  balance?: number;
  trades?: GalleryTrade[];
  currency?: 'USD' | 'USC';
}): Promise<CloudSyncResponse> {
  if (!payload.email || !payload.email.trim()) {
    return { success: false, error: 'Email is required' };
  }

  try {
    const targetCurrency = payload.currency || payload.userConfig?.currency || 'USC';
    const res = await fetch('/api/cloud-sync/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: payload.email.trim().toLowerCase(),
        name: payload.name,
        avatar: payload.avatar,
        userConfig: payload.userConfig,
        balance: payload.balance,
        trades: payload.trades || [],
        currency: targetCurrency,
      }),
    });
    const json = await res.json();
    return json;
  } catch (err: any) {
    console.warn('Failed to save to cloud server:', err);
    return { success: false, error: err?.message || 'Network error saving to cloud' };
  }
}

/**
 * Delete user cloud data (if user explicitly chooses to reset server records)
 */
export async function deleteCloudUserData(email: string): Promise<boolean> {
  try {
    const res = await fetch('/api/cloud-sync/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    const json = await res.json();
    return !!json.success;
  } catch {
    return false;
  }
}
