import React, { useState } from 'react';
import {
  DollarSign,
  Coins,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Cloud,
  Sparkles,
} from 'lucide-react';
import { GoogleAccount } from '../App';
import { ShootingStars } from './ShootingStars';
import { auth, googleProvider, signInWithPopup } from '../firebase';

export interface UserAccountConfig {
  currency: 'USD' | 'USC';
  platform: 'Exness';
  name: string;
  age: number;
  experience: string;
  balance: number;
}

interface OnboardingFlowProps {
  onComplete: (config: UserAccountConfig, account?: GoogleAccount) => void;
  onCancel: () => void;
  isDarkMode?: boolean;
  currentUser?: GoogleAccount | null;
  initialCurrency?: 'USD' | 'USC';
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  onComplete,
  onCancel,
  isDarkMode = true,
  currentUser,
  initialCurrency,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(initialCurrency ? 2 : 1);
  const [currency, setCurrency] = useState<'USD' | 'USC'>(initialCurrency || 'USC');
  const [platform, setPlatform] = useState<'Exness'>('Exness');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSelectCurrency = (selected: 'USD' | 'USC') => {
    setCurrency(selected);
    setStep(2);
  };

  const handleSelectPlatform = () => {
    setPlatform('Exness');
    // If user is already signed in, NEVER show the sign-in screen again!
    // Directly complete onboarding and launch dashboard.
    if (currentUser) {
      const savedBal = localStorage.getItem('tu_balance');
      const numBalance = savedBal ? parseFloat(savedBal) : 100;
      const config: UserAccountConfig = {
        currency,
        platform: 'Exness',
        name: currentUser.name || 'Trading Universe',
        age: 24,
        experience: '1 - 3 Years (Intermediate)',
        balance: isNaN(numBalance) ? 100 : numBalance,
      };
      onComplete(config, currentUser);
    } else {
      // Not signed in yet -> show Sign In screen (Step 3)
      setStep(3);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setErrorMsg('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      const acc: GoogleAccount = {
        email: (fbUser.email || 'trader@tradinguniverse.com').toLowerCase(),
        name: fbUser.displayName || 'Trading Universe',
        avatar: fbUser.photoURL || 'https://lh3.googleusercontent.com/a/default-user=s96-c',
        connectedAt: new Date().toLocaleDateString(),
      };
      const savedBal = localStorage.getItem('tu_balance');
      const numBalance = savedBal ? parseFloat(savedBal) : 100;
      const config: UserAccountConfig = {
        currency,
        platform: 'Exness',
        name: acc.name,
        age: 24,
        experience: '1 - 3 Years (Intermediate)',
        balance: isNaN(numBalance) ? 100 : numBalance,
      };
      onComplete(config, acc);
    } catch (err: any) {
      console.warn('Google sign-in error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setErrorMsg('Google Sign In was cancelled or unavailable. Please try again.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const subText = isDarkMode ? 'text-zinc-400' : 'text-slate-600';

  return (
    <div className={`min-h-screen w-full relative overflow-hidden theme-transition flex flex-col justify-center items-center p-4 sm:p-6 font-sans ${
      isDarkMode ? 'bg-[#070709] text-zinc-100' : 'bg-[#f8fafc] text-zinc-900'
    }`}>
      {/* Background Animated Shooting Stars */}
      <ShootingStars isDarkMode={isDarkMode} />

      {/* Top Header / Back Nav */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-6 z-10">
        <button
          onClick={() => {
            if (step > 1) setStep((step - 1) as any);
            else onCancel();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer shadow-xs backdrop-blur-xl ${
            isDarkMode
              ? 'bg-white/5 border-white/10 text-zinc-300 hover:text-white hover:bg-white/10'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{step === 1 ? 'Cancel' : 'Back'}</span>
        </button>

        {/* Step Indicator */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all duration-300 ${
                s === step
                  ? 'w-8 bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)]'
                  : s < step
                  ? 'w-5 bg-emerald-400'
                  : isDarkMode ? 'w-2.5 bg-white/10' : 'w-2.5 bg-slate-300'
              }`}
            />
          ))}
          <span className={`text-xs font-bold ml-1 font-mono ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
            Step {step} of 3
          </span>
        </div>
      </div>

      {/* Main Card Container with Apple Liquid Glass */}
      <div className={`w-full max-w-2xl apple-liquid-card p-6 sm:p-10 relative overflow-hidden z-10 theme-transition ${
        isDarkMode ? 'text-zinc-100' : 'text-zinc-900'
      }`}>
        {/* ================= STEP 1: USD OR USC ================= */}
        {step === 1 && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="text-center space-y-2">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                isDarkMode ? 'bg-blue-950/60 text-blue-400 border border-blue-800/50' : 'bg-blue-50 text-blue-700'
              }`}>
                Account Currency
              </span>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
                Select Your Currency: USD or USC
              </h2>
              <p className={`text-sm max-w-md mx-auto ${subText}`}>
                Choose whether you trade with standard US Dollars (USD) or US Cents (USC) for nano / micro lot sizing.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
              {/* USD CARD */}
              <button
                type="button"
                onClick={() => handleSelectCurrency('USD')}
                className={`group relative p-7 apple-liquid-card text-left flex flex-col justify-between h-56 cursor-pointer ${
                  currency === 'USD'
                    ? 'border-blue-500/80 shadow-[0_0_30px_rgba(59,130,246,0.35),inset_0_1px_0_rgba(255,255,255,0.4)] scale-102'
                    : 'hover:border-white/25'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-2xl shadow-md shadow-blue-600/30 group-hover:scale-105 transition-transform">
                    <DollarSign className="w-8 h-8" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-400 apple-liquid-glass px-2.5 py-1">
                    Standard
                  </span>
                </div>
                <div>
                  <div className="text-3xl font-black tracking-tight">
                    USD
                  </div>
                  <div className={`text-xs font-bold mt-0.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    US Dollar Account
                  </div>
                  <div className={`text-[11px] mt-1 leading-relaxed ${subText}`}>
                    Standard & Pro lots ($100,000 contract per lot). Standard trading balance.
                  </div>
                </div>
              </button>

              {/* USC CARD (US CENT) */}
              <button
                type="button"
                onClick={() => handleSelectCurrency('USC')}
                className={`group relative p-7 apple-liquid-card text-left flex flex-col justify-between h-56 cursor-pointer ${
                  currency === 'USC'
                    ? 'border-amber-500/80 shadow-[0_0_30px_rgba(245,158,11,0.35),inset_0_1px_0_rgba(255,255,255,0.4)] scale-102'
                    : 'hover:border-white/25'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black text-2xl shadow-md shadow-amber-500/30 group-hover:scale-105 transition-transform">
                    <Coins className="w-8 h-8" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400 apple-liquid-glass px-2.5 py-1">
                    Exness Cent
                  </span>
                </div>
                <div>
                  <div className="text-3xl font-black tracking-tight">
                    USC
                  </div>
                  <div className={`text-xs font-bold mt-0.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    US Cent Account
                  </div>
                  <div className={`text-[11px] mt-1 leading-relaxed ${subText}`}>
                    1 USD = 100 USC. Ideal for risk-controlled testing, nano lots, and Exness Cent.
                  </div>
                </div>
              </button>
            </div>

            <div className={`text-center text-xs ${subText}`}>
              Click on <strong>USD</strong> or <strong>USC</strong> to proceed to platform selection.
            </div>
          </div>
        )}

        {/* ================= STEP 2: PLATFORM ================= */}
        {step === 2 && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="text-center space-y-2">
              <span className="apple-liquid-glass inline-block px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-blue-400">
                Trading Platform
              </span>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
                Which Platform Do You Trade On?
              </h2>
              <p className={`text-sm max-w-md mx-auto ${subText}`}>
                Selected currency: <strong className={isDarkMode ? 'text-white' : 'text-slate-800'}>{currency}</strong>. Select your broker below:
              </p>
            </div>

            <div className="max-w-md mx-auto">
              <div
                onClick={handleSelectPlatform}
                className="apple-liquid-card group relative p-6 cursor-pointer border-amber-500/50 hover:border-amber-400/80 shadow-[0_16px_40px_rgba(245,158,11,0.15)] hover:scale-102"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#ffdf00] text-black font-black text-2xl flex items-center justify-center shadow-md border border-amber-300 group-hover:scale-105 transition-transform">
                      <span>ex</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black tracking-tight">
                          Exness
                        </span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-400 text-black">
                          Supported
                        </span>
                      </div>
                      <div className={`text-xs mt-0.5 ${subText}`}>
                        Exness MT4 / MT5 ECN & Cent Platform
                      </div>
                      <div className="text-[11px] text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Instant Raw Spread & Zero Commission Connect</span>
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-6 h-6 text-slate-400 group-hover:text-amber-400 group-hover:translate-x-1.5 transition-all" />
                </div>
              </div>
            </div>

            <div className="text-center pt-2">
              <button
                onClick={handleSelectPlatform}
                className="apple-liquid-primary px-8 py-3.5 font-bold text-sm flex items-center gap-2 mx-auto cursor-pointer"
              >
                <span>Continue with Exness</span>
                <ArrowRight className="w-4 h-4 text-amber-300" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: LOGIN & CLOUD SYNC ================= */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="text-center space-y-1.5">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                isDarkMode ? 'bg-blue-950/60 text-blue-400 border border-blue-800/50' : 'bg-blue-50 text-blue-700'
              }`}>
                Account Login & Sync
              </span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                Log In To Your Trader Account
              </h2>
              <p className={`text-xs ${subText}`}>
                Currency: <strong className={isDarkMode ? 'text-white' : 'text-slate-800'}>{currency}</strong> • Broker: <strong className={isDarkMode ? 'text-white' : 'text-slate-800'}>{platform}</strong>
              </p>
            </div>

            {/* Cloud sync banner explaining cross-device access */}
            <div className={`p-4 rounded-2xl border text-xs leading-relaxed flex items-start gap-3 ${
              isDarkMode ? 'bg-blue-950/30 border-blue-800/50 text-blue-200' : 'bg-blue-50/80 border-blue-200 text-blue-950'
            }`}>
              <Cloud className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Worldwide Cross-Device Memory:</strong> Sign in with your Google account. Any time you open Trading Universe from any mobile, tablet, or PC worldwide, your trades and balance will automatically sync!
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-xs text-rose-300 font-semibold text-center">
                {errorMsg}
              </div>
            )}

            {/* Only Google Sign In Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSigningIn}
                className="w-full py-4 px-5 rounded-2xl apple-liquid-button hover:border-blue-500/60 font-black text-base flex items-center justify-center gap-3 cursor-pointer transition shadow-lg hover:scale-[1.01] active:scale-[0.99] group border border-white/20"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isSigningIn ? 'Connecting Google Account...' : 'Sign In with Google'}</span>
              </button>
            </div>

            <p className={`text-[11px] text-center font-medium ${subText}`}>
              🔒 Sign in once — this sign in screen will not appear again unless you click Log Out.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

