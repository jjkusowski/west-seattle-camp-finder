'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Sparkles, Lock, LogOut } from 'lucide-react';

interface NavbarProps {
  user: { email?: string; id: string } | null;
  hasPass: boolean;
}

export default function Navbar({ user, hasPass }: NavbarProps) {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);
    if (error) {
      alert(error.message);
    } else {
      setMagicLinkSent(true);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.reload();
  }

  async function handleCheckout() {
    if (!user) {
      setIsModalOpen(true);
      return;
    }

    setLoading(true);
    const res = await fetch('/api/checkout', { method: 'POST' });
    const data = await res.json();
    setLoading(false);

    if (data.url) {
      window.location.href = data.url;
    } else {
      alert(data.error || 'Failed to start checkout');
    }
  }

  return (
    <>
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="font-extrabold text-lg text-slate-900 tracking-tight">
            West Seattle <span className="text-indigo-600">Camp Finder</span>
          </div>

          <div className="flex items-center gap-3">
            {hasPass ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                2026 Season Pass Active
              </span>
            ) : (
              <button
                onClick={handleCheckout}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition"
              >
                <Lock className="w-3.5 h-3.5" />
                Unlock 2026 Pass ($20)
              </button>
            )}

            {user ? (
                <div className="flex items-center gap-2">
                    <span className="hidden sm:inline text-xs text-slate-500 max-w-[150px] truncate">
                        {user.email}
                    </span>
                    <button
                        onClick={handleSignOut}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition cursor-pointer"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="text-xs font-semibold text-slate-700 hover:text-indigo-600 px-3 py-2 cursor-pointer"
                >
                    Sign In
                </button>
            )}
          </div>
        </div>
      </nav>

      {/* Login Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl relative">
            <button
              onClick={() => {
                setIsModalOpen(false);
                setMagicLinkSent(false);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-sm"
            >
              ✕
            </button>

            {magicLinkSent ? (
              <div className="text-center py-4">
                <h3 className="text-lg font-bold text-slate-900">Check your email</h3>
                <p className="text-xs text-slate-600 mt-2">
                  We sent a login link to <strong>{email}</strong>. Click the link to log in instantly.
                </p>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold text-slate-900">Sign in with Email</h3>
                <p className="text-xs text-slate-500 mt-1">
                  We'll email you a passwordless magic login link.
                </p>

                <form onSubmit={handleLogin} className="mt-4 space-y-3">
                  <input
                    type="email"
                    required
                    placeholder="parent@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
/>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition"
                  >
                    {loading ? 'Sending link...' : 'Send Magic Link'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}