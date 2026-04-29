'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, user, init, loading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { init(); }, [init]);
  useEffect(() => { if (user) router.replace('/dashboard'); }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('All fields are required'); return; }
    setSubmitting(true);
    const result = await signIn(email, password);
    setSubmitting(false);
    if (result.error) setError(result.error);
    else router.replace('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <span className="text-sm font-black uppercase tracking-widest text-black animate-pulse">LOADING...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex font-[family-name:var(--font-body)]">
      {/* Left — Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-black text-white flex-col justify-between p-12 border-r-[3px] border-black">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white flex items-center justify-center">
            <Box size={22} className="text-black" />
          </div>
          <span className="text-2xl font-black tracking-tighter uppercase" style={{ fontFamily: 'var(--font-heading)' }}>
            HARNESS
          </span>
        </div>
        <div>
          <h2 className="text-5xl font-black leading-[0.9] tracking-tighter uppercase mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
            SIMULATE.<br />TEST.<br />DEPLOY.
          </h2>
          <p className="text-sm font-bold uppercase tracking-widest text-gray-400 max-w-sm">
            BUILD AND TEST EMBEDDED SYSTEMS ENTIRELY IN YOUR BROWSER. NO HARDWARE REQUIRED.
          </p>
        </div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-600">
          V1.0.0 — VIRTUAL EMBEDDED SYSTEMS PLATFORM
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-12">
            <div className="w-8 h-8 bg-black flex items-center justify-center">
              <Box size={16} className="text-white" />
            </div>
            <span className="text-xl font-black tracking-tighter uppercase" style={{ fontFamily: 'var(--font-heading)' }}>HARNESS</span>
          </div>

          <h1 className="text-3xl font-black uppercase tracking-tighter mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
            LOG IN
          </h1>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-10">
            WELCOME BACK. ENTER YOUR CREDENTIALS.
          </p>

          {error && (
            <div className="mb-6 px-4 py-3 border-[3px] border-red-500 bg-red-50 text-xs font-bold uppercase tracking-widest text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-black mb-2 block">EMAIL</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3.5 text-sm font-bold bg-white border-[3px] border-black text-black outline-none placeholder:text-gray-400 focus:ring-4 focus:ring-gray-200 transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-black mb-2 block">PASSWORD</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3.5 pr-12 text-sm font-bold bg-white border-[3px] border-black text-black outline-none placeholder:text-gray-400 focus:ring-4 focus:ring-gray-200 transition-all"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black">
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 text-sm font-black uppercase tracking-widest text-white bg-black border-[3px] border-black hover:bg-white hover:text-black transition-colors disabled:opacity-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
            >
              {submitting ? 'SIGNING IN...' : 'LOG IN'} <ArrowRight size={16} />
            </button>
          </form>

          <p className="mt-8 text-xs font-bold uppercase tracking-widest text-gray-500 text-center">
            DON&apos;T HAVE AN ACCOUNT?{' '}
            <button onClick={() => router.push('/auth/signup')} className="text-black underline hover:no-underline font-black">
              SIGN UP
            </button>
          </p>
          <p className="mt-4 text-center">
            <button onClick={() => router.push('/')} className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black">
              ← BACK TO HOME
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
