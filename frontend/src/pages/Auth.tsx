import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import type { UserRole } from '../store/useAuthStore';
import { Mail, Key, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';

export const Auth: React.FC = () => {
  const navigate = useNavigate();
  const { session, profile, loading, error, signInWithOtp, signInWithPassword, verifyOtp, initialize, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('retailer');
  const [authMethod, setAuthMethod] = useState<'otp' | 'password'>('password');
  const [password, setPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState<string[]>(Array(6).fill(''));
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // If already authenticated and profile exists, redirect to correct dashboard
  useEffect(() => {
    if (session && profile) {
      if (profile.role === 'supplier') {
        navigate('/dashboard/supplier', { replace: true });
      } else {
        navigate('/marketplace', { replace: true });
      }
    }
  }, [session, profile, navigate]);

  // Clean error on unmount
  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    clearError();
    await signInWithPassword(email, password, role);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setRequestingOtp(true);
    clearError();
    const result = await signInWithOtp(email);
    setRequestingOtp(false);

    if (result.success) {
      setOtpSent(true);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const codeStr = otpCode.join('');
    if (codeStr.length < 6) return;

    setVerifyingOtp(true);
    clearError();
    const result = await verifyOtp(email, codeStr, role);
    setVerifyingOtp(false);

    if (result.success) {
      // Navigation is handled by the useEffect watching session/profile
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return; // Allow only numbers

    const newOtp = [...otpCode];
    // Take only the last character entered
    newOtp[index] = value.substring(value.length - 1);
    setOtpCode(newOtp);

    // Shift focus forward if entered a number
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      // Focus previous input on backspace if current is empty
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (pastedData.length !== 6 || isNaN(Number(pastedData))) return;

    const newOtp = pastedData.split('');
    setOtpCode(newOtp);
    otpRefs.current[5]?.focus();
  };

  const isRetailer = role === 'retailer';
  const roleColorClass = isRetailer 
    ? 'from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 focus:ring-indigo-500' 
    : 'from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 focus:ring-violet-500';
  const borderRingClass = isRetailer ? 'focus:border-indigo-500 focus:ring-indigo-500/20' : 'focus:border-violet-500 focus:ring-violet-500/20';
  const textAccentClass = isRetailer ? 'text-indigo-400' : 'text-violet-400';

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-zinc-950 px-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className={`absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-3xl opacity-20 transition-colors duration-500 ${isRetailer ? 'bg-indigo-500' : 'bg-violet-500'}`}></div>
      <div className={`absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-80 h-80 rounded-full blur-3xl opacity-20 transition-colors duration-500 ${isRetailer ? 'bg-blue-500' : 'bg-purple-500'}`}></div>

      <div className="w-full max-w-md z-10">
        {/* App Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/60 mb-3">
            <ShieldCheck className={`h-4 w-4 ${textAccentClass}`} />
            <span className="text-xs font-medium tracking-wide text-zinc-300">Secure OTP Endpoint</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-100 bg-gradient-to-r from-zinc-50 to-zinc-400 bg-clip-text text-transparent">
            IMS Supply Intelligence
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Predictive demand forecasting & real-time inventory
          </p>
        </div>

        {/* Auth Card */}
        <div className={`rounded-2xl p-8 border transition-all duration-500 ${
          isRetailer ? 'glass-panel-retailer shadow-indigo-950/20' : 'glass-panel-supplier shadow-violet-950/20'
        } shadow-2xl`}>
          
          {/* Role Toggle Slider */}
          {!otpSent && (
            <div className="relative flex p-1 rounded-xl bg-zinc-900/80 border border-zinc-800 mb-8">
              <div 
                className={`absolute top-1 bottom-1 rounded-lg transition-all duration-500 ease-out ${
                  isRetailer 
                    ? 'left-1 w-[calc(50%-4px)] bg-indigo-600/20 border border-indigo-500/30' 
                    : 'left-[calc(50%+2px)] w-[calc(50%-4px)] bg-violet-600/20 border border-violet-500/30'
                }`}
              />
              <button
                type="button"
                onClick={() => { setRole('retailer'); clearError(); }}
                className={`w-1/2 py-2 text-center text-xs font-semibold rounded-lg z-10 transition-colors duration-500 ${
                  isRetailer ? 'text-indigo-200' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Retailer Access
              </button>
              <button
                type="button"
                onClick={() => { setRole('supplier'); clearError(); }}
                className={`w-1/2 py-2 text-center text-xs font-semibold rounded-lg z-10 transition-colors duration-500 ${
                  !isRetailer ? 'text-violet-200' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Wholesale Supplier
              </button>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 rounded-xl border border-rose-900/30 bg-rose-950/10 text-rose-400 text-xs font-medium leading-relaxed">
              {error}
            </div>
          )}

          {/* Form Content */}
          {!otpSent ? (
            authMethod === 'password' ? (
              <form onSubmit={handlePasswordSignIn} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                    Business Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className={`w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-100 text-sm placeholder-zinc-600 transition-all focus:outline-none focus:ring-2`}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-100 text-sm placeholder-zinc-600 transition-all focus:outline-none focus:ring-2`}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3 rounded-xl bg-gradient-to-r text-zinc-100 font-semibold text-sm transition-all duration-300 shadow-lg shadow-black/40 flex items-center justify-center gap-2 ${roleColorClass}`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    <>
                      Access Dashboard
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => { setAuthMethod('otp'); clearError(); }}
                    className="text-xs text-zinc-400 hover:text-zinc-200 underline font-medium"
                  >
                    Use Email One-Time Passcode (OTP) instead
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSendOtp} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                    Business Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className={`w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-100 text-sm placeholder-zinc-600 transition-all focus:outline-none focus:ring-2`}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={requestingOtp}
                  className={`w-full py-3 rounded-xl bg-gradient-to-r text-zinc-100 font-semibold text-sm transition-all duration-300 shadow-lg shadow-black/40 flex items-center justify-center gap-2 ${roleColorClass}`}
                >
                  {requestingOtp ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending Magic Code...
                    </>
                  ) : (
                    <>
                      Request Authentication OTP
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => { setAuthMethod('password'); clearError(); }}
                    className="text-xs text-zinc-400 hover:text-zinc-200 underline font-medium"
                  >
                    Use Password Sign In instead
                  </button>
                </div>
              </form>
            )
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="text-center mb-2">
                <p className="text-sm text-zinc-400">
                  We sent a 6-digit code to <span className="font-semibold text-zinc-200">{email}</span>
                </p>
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className={`text-xs font-semibold underline mt-2 hover:opacity-80 transition-opacity ${textAccentClass}`}
                >
                  Change Email Address
                </button>
              </div>

              <div>
                <label className="block text-center text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-4">
                  Enter 6-Digit Passcode
                </label>
                <div className="flex justify-between gap-2 max-w-sm mx-auto">
                  {otpCode.map((digit, index) => (
                    <input
                      key={index}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      ref={(el) => { otpRefs.current[index] = el; }}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      onPaste={index === 0 ? handleOtpPaste : undefined}
                      className={`w-12 h-14 text-center rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-100 text-lg font-bold transition-all focus:outline-none focus:ring-2 ${borderRingClass}`}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={verifyingOtp || otpCode.join('').length < 6}
                className={`w-full py-3 rounded-xl bg-gradient-to-r text-zinc-100 font-semibold text-sm transition-all duration-300 shadow-lg shadow-black/40 flex items-center justify-center gap-2 ${roleColorClass} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {verifyingOtp ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying Passcode...
                  </>
                ) : (
                  <>
                    Verify & Access Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center mt-6">
          <p className="text-[10px] tracking-wider text-zinc-600 font-mono">
            SECURE ACCESS NODE | END-TO-END SUPPLY CHAIN SYNC
          </p>
        </div>
      </div>
    </div>
  );
};
