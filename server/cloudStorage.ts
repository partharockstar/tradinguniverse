import fs from 'fs';
import path from 'path';

export interface CurrencyAccountData {
  balance: number;
  trades: any[];
  updatedAt?: string;
}

export interface UserCloudProfile {
  email: string;
  name: string;
  avatar?: string;
  connectedAt?: string;
  activeCurrency?: 'USD' | 'USC';
  accounts?: {
    USD?: CurrencyAccountData;
    USC?: CurrencyAccountData;
  };
  userConfig: {
    currency?: 'USD' | 'USC';
    platform?: string;
    name?: string;
    age?: number;
    experience?: string;
    balance?: number;
  };
  balance: number;
  trades: any[];
  updatedAt: string;
}

const DATA_DIR = path.resolve(process.cwd(), 'data', 'cloud_users');

// Ensure data directory exists on load
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  console.error('Failed to create cloud_users directory:', e);
}

export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase().replace(/[^a-z0-9@._-]/g, '_');
}

export async function getUserCloudData(email: string): Promise<UserCloudProfile | null> {
  if (!email || typeof email !== 'string') return null;
  const safe = sanitizeEmail(email);
  const filePath = path.join(DATA_DIR, `${safe}.json`);

  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const raw = await fs.promises.readFile(filePath, 'utf-8');
    const profile = JSON.parse(raw) as UserCloudProfile;

    // Migrate/populate accounts object if missing
    if (!profile.accounts) {
      profile.accounts = {};
    }
    const curr = (profile.userConfig?.currency as 'USD' | 'USC') || 'USC';
    if (!profile.accounts[curr] && Array.isArray(profile.trades)) {
      profile.accounts[curr] = {
        balance: profile.balance ?? 100,
        trades: profile.trades,
        updatedAt: profile.updatedAt,
      };
    }
    return profile;
  } catch (err) {
    console.error(`Error reading cloud data for ${email}:`, err);
    return null;
  }
}

export async function saveUserCloudData(payload: Partial<UserCloudProfile> & {
  email: string;
  currency?: 'USD' | 'USC';
}): Promise<UserCloudProfile> {
  if (!payload.email || typeof payload.email !== 'string') {
    throw new Error('Valid email is required');
  }

  const safe = sanitizeEmail(payload.email);
  const filePath = path.join(DATA_DIR, `${safe}.json`);

  let existing: UserCloudProfile | null = null;
  try {
    if (fs.existsSync(filePath)) {
      const raw = await fs.promises.readFile(filePath, 'utf-8');
      existing = JSON.parse(raw);
    }
  } catch {
    existing = null;
  }

  const currentCurrency: 'USD' | 'USC' =
    (payload.currency as 'USD' | 'USC') ||
    (payload.userConfig?.currency as 'USD' | 'USC') ||
    (existing?.userConfig?.currency as 'USD' | 'USC') ||
    'USC';

  // Ensure accounts record is initialized
  const existingAccounts: { USD?: CurrencyAccountData; USC?: CurrencyAccountData } = existing?.accounts || {};
  const prevCurrency = (existing?.userConfig?.currency as 'USD' | 'USC') || 'USC';
  if (!existingAccounts[prevCurrency] && existing && Array.isArray(existing.trades)) {
    existingAccounts[prevCurrency] = {
      balance: existing.balance ?? 100,
      trades: existing.trades,
      updatedAt: existing.updatedAt,
    };
  }

  // Cross-preserve trades if one currency account is empty but the other has user trades
  if ((!existingAccounts.USC || !existingAccounts.USC.trades || existingAccounts.USC.trades.length === 0) && existingAccounts.USD?.trades && existingAccounts.USD.trades.length > 0) {
    existingAccounts.USC = {
      balance: existingAccounts.USD.balance,
      trades: existingAccounts.USD.trades,
      updatedAt: existingAccounts.USD.updatedAt || new Date().toISOString(),
    };
  }
  if ((!existingAccounts.USD || !existingAccounts.USD.trades || existingAccounts.USD.trades.length === 0) && existingAccounts.USC?.trades && existingAccounts.USC.trades.length > 0) {
    existingAccounts.USD = {
      balance: existingAccounts.USC.balance,
      trades: existingAccounts.USC.trades,
      updatedAt: existingAccounts.USC.updatedAt || new Date().toISOString(),
    };
  }

  const targetBalance = payload.balance !== undefined
    ? Number(payload.balance)
    : existingAccounts[currentCurrency]?.balance ?? (existing?.balance ?? 100);

  let targetTrades = Array.isArray(payload.trades) && payload.trades.length > 0
    ? payload.trades
    : existingAccounts[currentCurrency]?.trades ?? (existing?.trades ?? []);

  if ((!targetTrades || targetTrades.length === 0) && existing?.trades && existing.trades.length > 0) {
    targetTrades = existing.trades;
  }

  // Update specific currency account
  existingAccounts[currentCurrency] = {
    balance: targetBalance,
    trades: targetTrades,
    updatedAt: new Date().toISOString(),
  };

  const updatedProfile: UserCloudProfile = {
    email: payload.email.trim().toLowerCase(),
    name: payload.name || existing?.name || 'Trader',
    avatar: payload.avatar || existing?.avatar || 'https://lh3.googleusercontent.com/a/default-user=s96-c',
    connectedAt: existing?.connectedAt || new Date().toLocaleDateString(),
    activeCurrency: currentCurrency,
    accounts: existingAccounts,
    userConfig: {
      ...(existing?.userConfig || {}),
      ...(payload.userConfig || {}),
      currency: currentCurrency,
      name: payload.name || payload.userConfig?.name || existing?.userConfig?.name || 'Trader',
      balance: targetBalance,
    },
    balance: targetBalance,
    trades: targetTrades,
    updatedAt: new Date().toISOString(),
  };

  await fs.promises.writeFile(filePath, JSON.stringify(updatedProfile, null, 2), 'utf-8');
  return updatedProfile;
}

export async function deleteUserCloudData(email: string): Promise<boolean> {
  if (!email) return false;
  const safe = sanitizeEmail(email);
  const filePath = path.join(DATA_DIR, `${safe}.json`);
  try {
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      return true;
    }
    return false;
  } catch (err) {
    console.error(`Error deleting cloud data for ${email}:`, err);
    return false;
  }
}
