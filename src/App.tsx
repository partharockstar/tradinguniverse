/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { HomePage } from './components/HomePage';
import { OnboardingFlow, UserAccountConfig } from './components/OnboardingFlow';
import { DashboardView } from './components/DashboardView';
import { INITIAL_PAIRS } from './data/mockData';
import { CurrencyPair } from './types/forex';

import { fetchCloudUserData, saveCloudUserData } from './utils/cloudSync';
import { loadUnifiedUserData } from './utils/firestoreSync';
import { auth, onAuthStateChanged, firebaseSignOut } from './firebase';

export interface GoogleAccount {
  email: string;
  name: string;
  avatar?: string;
  connectedAt: string;
}

export const DEFAULT_USER_CONFIG: UserAccountConfig = {
  currency: 'USC',
  platform: 'Exness',
  name: 'Trading Universe',
  age: 24,
  experience: '1 - 3 Years (Intermediate)',
  balance: 100,
};

export default function App() {
  const [pairs] = useState<CurrencyPair[]>(INITIAL_PAIRS);

  // Theme state with persistence (defaults to dark mode)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('tu_theme');
    return saved !== null ? saved === 'dark' : true;
  });

  // Google account sync state with persistence
  const [googleUser, setGoogleUser] = useState<GoogleAccount | null>(() => {
    try {
      const saved = localStorage.getItem('tu_google_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // User configuration with persistence and fallback (data is never lost)
  const [userConfig, setUserConfig] = useState<UserAccountConfig>(() => {
    try {
      const saved = localStorage.getItem('tu_user_config');
      return saved ? JSON.parse(saved) : DEFAULT_USER_CONFIG;
    } catch {
      return DEFAULT_USER_CONFIG;
    }
  });

  // Cloud sync trigger to notify children components
  const [cloudSyncTimestamp, setCloudSyncTimestamp] = useState<number>(Date.now());

  // App starts from HomePage on fresh load/republish so anyone can experience the landing page,
  // without losing any user data. Once user logs in & launches dashboard, tu_session_active is true,
  // keeping them on dashboard on re-entry.
  const [currentView, setCurrentView] = useState<'home' | 'onboarding' | 'dashboard'>(() => {
    const sessionActive = localStorage.getItem('tu_session_active');
    if (sessionActive === 'true') {
      return 'dashboard';
    }
    return 'home';
  });

  // Background cross-device sync check on mount if already logged in
  useEffect(() => {
    if (!googleUser?.email) return;

    fetchCloudUserData(googleUser.email)
      .then((res) => {
        if (res.success && res.exists && res.data) {
          const cloud = res.data;
          if (cloud.userConfig) {
            setUserConfig((prev) => {
              const activeCurr = prev.currency || pendingCurrency || cloud.userConfig?.currency || 'USC';
              return {
                ...prev,
                ...cloud.userConfig,
                currency: activeCurr,
                name: cloud.name || prev.name,
              };
            });
            localStorage.setItem('tu_user_config', JSON.stringify({
              ...userConfig,
              ...cloud.userConfig,
              currency: userConfig.currency || pendingCurrency || 'USC',
            }));
          }
          if (Array.isArray(cloud.trades) && cloud.trades.length > 0) {
            const currentTradesStr = localStorage.getItem('tu_trades');
            const currentTrades = currentTradesStr ? JSON.parse(currentTradesStr) : [];
            if (currentTrades.length === 0) {
              localStorage.setItem('tu_trades', JSON.stringify(cloud.trades));
            }
          }
          if (cloud.balance !== undefined) {
            const currentBalStr = localStorage.getItem('tu_balance');
            if (currentBalStr === null) {
              localStorage.setItem('tu_balance', String(cloud.balance));
            }
          }
          setCloudSyncTimestamp(Date.now());
        }
      })
      .catch((err) => {
        console.warn('Background cloud sync check failed:', err);
      });
  }, [googleUser?.email]);

  useEffect(() => {
    localStorage.setItem('tu_current_view', currentView);
  }, [currentView]);

  // Lock dark mode permanently
  useEffect(() => {
    document.documentElement.classList.add('dark');
    localStorage.setItem('tu_theme', 'dark');
  }, []);

  // Listen to Firebase Auth state & restore user's verified cloud data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const acc: GoogleAccount = {
          email: (fbUser.email || '').toLowerCase(),
          name: fbUser.displayName || 'Trading Universe',
          avatar: fbUser.photoURL || 'https://lh3.googleusercontent.com/a/default-user=s96-c',
          connectedAt: new Date().toLocaleDateString(),
        };
        setGoogleUser(acc);
        localStorage.setItem('tu_google_user', JSON.stringify(acc));
        localStorage.setItem('tu_session_active', 'true');

        const activeCurr: 'USD' | 'USC' =
          (localStorage.getItem('tu_active_currency') as any) || userConfig.currency || 'USC';

        try {
          const res = await loadUnifiedUserData(fbUser.uid, acc.email, activeCurr);
          if (res.success && res.data) {
            const accData = res.data.accounts?.[activeCurr];
            const loadedTrades = accData?.trades || res.data.trades || [];
            const loadedBal = accData?.balance ?? res.data.balance ?? 100;

            setUserConfig((prev) => ({
              ...prev,
              currency: activeCurr,
              name: res.data!.name || acc.name,
              balance: loadedBal,
            }));
            localStorage.setItem('tu_trades', JSON.stringify(loadedTrades));
            localStorage.setItem('tu_balance', String(loadedBal));
            setCloudSyncTimestamp(Date.now());
          }
        } catch (e) {
          console.warn('Auto cloud restore note:', e);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const [pendingCurrency, setPendingCurrency] = useState<'USD' | 'USC'>('USC');

  const handleStartOnboarding = (currency?: 'USD' | 'USC') => {
    const targetCurrency = currency || userConfig.currency || 'USC';
    setPendingCurrency(targetCurrency);
    setUserConfig((prev) => ({ ...prev, currency: targetCurrency }));
    localStorage.setItem('tu_user_config', JSON.stringify({ ...userConfig, currency: targetCurrency }));

    if (googleUser?.email) {
      handleSwitchCurrencyAccount(targetCurrency);
      localStorage.setItem('tu_session_active', 'true');
      setCurrentView('dashboard');
    } else {
      setCurrentView('onboarding');
    }
  };

  const handleSwitchCurrencyAccount = async (newCurrency: 'USD' | 'USC') => {
    const email = googleUser?.email?.toLowerCase() || 'local';
    const oldCurrency = userConfig.currency;

    // 1. Flush & save current currency state
    const currentTradesStr = localStorage.getItem('tu_trades');
    const currentTrades = currentTradesStr ? JSON.parse(currentTradesStr) : [];
    const currentBalanceStr = localStorage.getItem('tu_balance');
    const currentBalance = currentBalanceStr !== null ? Number(currentBalanceStr) : (userConfig.balance || 100);

    localStorage.setItem(`tu_trades_${email}_${oldCurrency}`, JSON.stringify(currentTrades));
    localStorage.setItem(`tu_balance_${email}_${oldCurrency}`, String(currentBalance));

    if (googleUser?.email) {
      saveCloudUserData({
        email: googleUser.email,
        name: googleUser.name,
        currency: oldCurrency,
        balance: currentBalance,
        trades: currentTrades,
      }).catch(console.warn);
    }

    // 2. Load target currency state from local cache
    let targetTrades: any[] = [];
    let targetBalance: number = 100;

    const savedTargetTrades = localStorage.getItem(`tu_trades_${email}_${newCurrency}`);
    if (savedTargetTrades) {
      try {
        targetTrades = JSON.parse(savedTargetTrades);
      } catch {
        targetTrades = [];
      }
    }
    // If target trades empty, fall back to current trades so trades are never dropped
    if (targetTrades.length === 0 && currentTrades.length > 0) {
      targetTrades = currentTrades;
    }

    const savedTargetBal = localStorage.getItem(`tu_balance_${email}_${newCurrency}`);
    if (savedTargetBal !== null) {
      targetBalance = Number(savedTargetBal);
    } else if (currentBalance) {
      targetBalance = currentBalance;
    }

    // 3. Update active state
    const nextConfig: UserAccountConfig = {
      ...userConfig,
      currency: newCurrency,
      balance: targetBalance,
    };
    setUserConfig(nextConfig);
    localStorage.setItem('tu_user_config', JSON.stringify(nextConfig));
    if (googleUser?.email) {
      localStorage.setItem(`tu_user_config_${email}`, JSON.stringify(nextConfig));
    }

    localStorage.setItem('tu_trades', JSON.stringify(targetTrades));
    localStorage.setItem('tu_balance', String(targetBalance));
    setCloudSyncTimestamp(Date.now());

    // 4. If logged in, fetch freshest target currency data from cloud server
    if (googleUser?.email) {
      try {
        const res = await fetchCloudUserData(googleUser.email);
        if (res.success && res.exists && res.data) {
          const acc = res.data.accounts?.[newCurrency];
          if (acc) {
            const cloudTrades = Array.isArray(acc.trades) && acc.trades.length > 0 ? acc.trades : targetTrades;
            const cloudBal = acc.balance !== undefined ? acc.balance : targetBalance;

            localStorage.setItem(`tu_trades_${email}_${newCurrency}`, JSON.stringify(cloudTrades));
            localStorage.setItem(`tu_balance_${email}_${newCurrency}`, String(cloudBal));

            localStorage.setItem('tu_trades', JSON.stringify(cloudTrades));
            localStorage.setItem('tu_balance', String(cloudBal));

            setUserConfig((prev) => ({ ...prev, balance: cloudBal }));
            setCloudSyncTimestamp(Date.now());
          }
        }
      } catch (err) {
        console.warn('Error fetching currency data from cloud on switch:', err);
      }
    }
  };

  const handleCompleteOnboarding = (config: UserAccountConfig, account?: GoogleAccount) => {
    setUserConfig(config);
    localStorage.setItem('tu_user_config', JSON.stringify(config));
    localStorage.setItem('tu_session_active', 'true');
    if (account) {
      handleGoogleLogin(account, config.currency);
    } else {
      if (googleUser?.email) {
        saveCloudUserData({
          email: googleUser.email,
          name: googleUser.name,
          userConfig: config,
          balance: config.balance,
          currency: config.currency,
        }).catch(console.warn);
      }
      setCurrentView('dashboard');
    }
  };

  const handleGoToHome = () => {
    localStorage.removeItem('tu_session_active');
    setCurrentView('home');
    localStorage.setItem('tu_current_view', 'home');
  };

  const handleGoogleLogin = async (account: GoogleAccount, preferredCurrency?: 'USD' | 'USC') => {
    setGoogleUser(account);
    localStorage.setItem('tu_google_user', JSON.stringify(account));
    localStorage.setItem('tu_session_active', 'true');

    const email = account.email.toLowerCase();
    const targetCurr: 'USD' | 'USC' = preferredCurrency || pendingCurrency || userConfig.currency || 'USC';
    localStorage.setItem('tu_active_currency', targetCurr);

    try {
      const unifiedRes = await loadUnifiedUserData(auth.currentUser?.uid, email, targetCurr);
      if (unifiedRes.success && unifiedRes.data) {
        const uData = unifiedRes.data;
        const targetAcc = uData.accounts?.[targetCurr];
        const loadedTrades = (targetAcc?.trades && targetAcc.trades.length > 0)
          ? targetAcc.trades
          : (uData.trades && uData.trades.length > 0 ? uData.trades : []);
        const loadedBal = targetAcc?.balance !== undefined ? targetAcc.balance : (uData.balance ?? 100);

        const mergedConfig: UserAccountConfig = {
          ...DEFAULT_USER_CONFIG,
          currency: targetCurr,
          name: uData.name || account.name,
          balance: loadedBal,
        };

        setUserConfig(mergedConfig);
        localStorage.setItem('tu_user_config', JSON.stringify(mergedConfig));
        localStorage.setItem(`tu_user_config_${email}`, JSON.stringify(mergedConfig));

        localStorage.setItem(`tu_trades_${email}_${targetCurr}`, JSON.stringify(loadedTrades));
        localStorage.setItem(`tu_balance_${email}_${targetCurr}`, String(loadedBal));

        localStorage.setItem('tu_trades', JSON.stringify(loadedTrades));
        localStorage.setItem('tu_balance', String(loadedBal));

        setCloudSyncTimestamp(Date.now());
      } else {
        // Fallback: check existing local cache first, NEVER overwrite with empty
        const cachedTrades = localStorage.getItem(`tu_trades_${email}_${targetCurr}`) || localStorage.getItem('tu_trades');
        const userTrades = cachedTrades ? JSON.parse(cachedTrades) : [];
        const cachedBal = localStorage.getItem(`tu_balance_${email}_${targetCurr}`) || localStorage.getItem('tu_balance');
        const userBal = cachedBal !== null ? Number(cachedBal) : (userConfig.balance || 100);

        const mergedConfig: UserAccountConfig = {
          ...userConfig,
          currency: targetCurr,
          name: account.name,
          balance: userBal,
        };

        setUserConfig(mergedConfig);
        localStorage.setItem('tu_user_config', JSON.stringify(mergedConfig));
        localStorage.setItem(`tu_user_config_${email}`, JSON.stringify(mergedConfig));

        localStorage.setItem(`tu_trades_${email}_${targetCurr}`, JSON.stringify(userTrades));
        localStorage.setItem(`tu_balance_${email}_${targetCurr}`, String(userBal));

        localStorage.setItem('tu_trades', JSON.stringify(userTrades));
        localStorage.setItem('tu_balance', String(userBal));

        setCloudSyncTimestamp(Date.now());
      }
    } catch (err) {
      console.warn('Login cloud sync error:', err);
    }

    setCurrentView('dashboard');
  };

  const handleGoogleLogout = async () => {
    // 1. Immediately ensure current user's data is backed up to server before logging out
    if (googleUser?.email) {
      try {
        const curTradesStr = localStorage.getItem('tu_trades');
        const curTrades = curTradesStr ? JSON.parse(curTradesStr) : [];
        const curBalanceStr = localStorage.getItem('tu_balance');
        const curBalance = curBalanceStr ? Number(curBalanceStr) : (userConfig.balance || 100);

        await saveCloudUserData({
          email: googleUser.email,
          name: googleUser.name,
          userConfig,
          balance: curBalance,
          trades: curTrades,
          currency: userConfig.currency,
          avatar: googleUser.avatar,
        });
      } catch (saveErr) {
        console.warn('Backup on logout error:', saveErr);
      }
    }

    // 2. Firebase sign out
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.warn('Firebase signout error:', err);
    }

    // 3. Reset active session storage so next user sees their own clean data
    setGoogleUser(null);
    localStorage.removeItem('tu_google_user');
    localStorage.removeItem('tu_session_active');
    localStorage.removeItem('tu_trades');
    localStorage.removeItem('tu_balance');
    setUserConfig(DEFAULT_USER_CONFIG);

    setCurrentView('home');
    localStorage.setItem('tu_current_view', 'home');
  };

  return (
    <div className={`min-h-screen w-full flex-1 theme-transition flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white ${
      isDarkMode ? 'bg-[#070709] text-zinc-100' : 'bg-[#f8fafc] text-zinc-900'
    }`}>
      {currentView === 'home' && (
        <HomePage
          onStartJournal={handleStartOnboarding}
          isDarkMode={true}
          onGoogleLogin={(acc) => handleGoogleLogin(acc, pendingCurrency)}
          googleUser={googleUser}
        />
      )}
      {currentView === 'onboarding' && (
        <OnboardingFlow
          onComplete={handleCompleteOnboarding}
          onCancel={handleGoToHome}
          isDarkMode={true}
          currentUser={googleUser}
          initialCurrency={pendingCurrency}
        />
      )}
      {currentView === 'dashboard' && (
        <DashboardView
          currencyPairs={pairs}
          onBackToHome={handleGoToHome}
          userConfig={userConfig}
          isDarkMode={true}
          googleUser={googleUser}
          onGoogleLogin={handleGoogleLogin}
          onGoogleLogout={handleGoogleLogout}
          onSwitchCurrency={handleSwitchCurrencyAccount}
          cloudSyncTimestamp={cloudSyncTimestamp}
        />
      )}
    </div>
  );
}
