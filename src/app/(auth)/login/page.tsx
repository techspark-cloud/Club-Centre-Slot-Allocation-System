'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, ShieldAlert, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formattedEmail = identifier.includes('@') ? identifier : `${identifier}@rit.internal`;

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: formattedEmail,
      password: password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, must_change_password')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile) {
        setError('Account profile not configured. Please contact the administrator.');
        setLoading(false);
        return;
      }

      if (data.user.email === 'clubs@rit.edu') {
        router.push('/overall-clubs');
      } else if (data.user.email === 'centres@rit.edu') {
        router.push('/overall-centres');
      } else if (profile.role === 'SUPER_ADMIN' || profile.role === 'ALLOCATION_ADMIN') {
        router.push('/admin');
      } else if (profile.role === 'CLUB_COORDINATOR' || profile.role === 'CENTRE_COORDINATOR') {
        router.push('/coordinator');
      } else {
        router.push('/student');
      }
    }
  };

  return (
    <div className="h-screen w-full flex bg-white overflow-hidden selection:bg-blue-200 selection:text-blue-900">
      
      {/* Full-Screen Preloader (Clean White Theme) */}
      {loading && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/95 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="flex flex-col items-center justify-center max-w-sm w-full transform transition-all">
            
            {/* Logo */}
            <div className="relative mb-10">
              <div className="absolute -inset-6 bg-blue-100 rounded-full blur-2xl animate-pulse duration-1000"></div>
              <div className="bg-white p-6 rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] border border-slate-100 relative z-10">
                <img src="/rit-logo.png" alt="RIT Logo" className="h-14 w-auto object-contain" />
              </div>
            </div>

            {/* Smooth 3-Dot Loader */}
            <div className="flex space-x-3 mb-8">
              <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-3 h-3 bg-violet-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            
            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Authenticating
            </h3>
            <p className="mt-2 text-slate-500 text-sm font-semibold">
              Securely establishing your session...
            </p>
          </div>
        </div>
      )}

      {/* LEFT PANE: 2024 Trending Aurora & Glassmorphism */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#030712] items-center justify-center overflow-hidden h-full">
        
        {/* Massive Animated Glowing Orbs (Aurora Effect) */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600 rounded-full mix-blend-screen filter blur-[120px] opacity-40 animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-600 rounded-full mix-blend-screen filter blur-[120px] opacity-40 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[20%] left-[20%] w-80 h-80 bg-violet-600 rounded-full mix-blend-screen filter blur-[120px] opacity-30 animate-pulse" style={{ animationDelay: '4s' }}></div>
        
        {/* Subtle Grid overlay for texture */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]"></div>

        {/* Central Card */}
        <div className="relative z-10 flex flex-col items-center text-center p-8 max-w-lg">
          <div className="bg-white p-4 rounded-2xl mb-8 shadow-[0_0_40px_rgba(0,0,0,0.3)] transform transition-transform hover:scale-105 duration-500">
            <img src="/rit-logo.png" alt="RIT Logo" className="h-12 w-auto object-contain" />
          </div>
          
          <h1 className="text-4xl xl:text-5xl font-extrabold text-white tracking-tight mb-5 leading-tight">
            Club & Centre <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">
              Allocation Portal
            </span>
          </h1>
          
          <p className="text-slate-300/90 text-base xl:text-lg font-medium leading-relaxed max-w-md">
            The intelligent, centralized platform for seamless institutional activity management.
          </p>
        </div>

        {/* Modern Pill-Shaped Footer */}
        <div className="absolute bottom-10 w-full flex justify-center z-10">
          <div className="flex items-center gap-5 bg-white/5 backdrop-blur-md px-8 py-4 rounded-full border border-white/10 shadow-xl">
            <img src="/techspark-logo.png" alt="TechSpark" className="h-7 w-auto object-contain" />
            <div className="h-6 w-px bg-white/20"></div>
            <span className="text-white/90 text-sm font-bold uppercase tracking-widest">Built by TechSpark</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANE: Ultra-Premium Form */}
      <div className="w-full lg:w-1/2 h-full flex flex-col justify-center items-center p-4 sm:p-8 relative bg-[#f8fafc] overflow-hidden">
        
        {/* Subtle ambient glow for the right pane */}
        <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-blue-400/10 rounded-full mix-blend-multiply filter blur-[80px]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-indigo-400/10 rounded-full mix-blend-multiply filter blur-[80px]"></div>
        </div>

        <div className="w-full max-w-[420px] relative z-10 bg-white p-8 sm:p-10 rounded-[1.5rem] shadow-[0_8px_40px_-12px_rgba(0,0,0,0.08)] border border-slate-200/60">
          
          {/* Mobile Logo (Hidden on Desktop) */}
          <div className="lg:hidden flex justify-center mb-6">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <img src="/rit-logo.png" alt="RIT Logo" className="h-9 w-auto object-contain" />
            </div>
          </div>

          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Welcome Back</h2>
            <p className="text-slate-500 text-sm font-semibold">Please enter your credentials to sign in.</p>
          </div>

          {error && (
            <div className="mb-6 p-3.5 bg-red-50/80 border border-red-100 rounded-lg flex items-start animate-in fade-in slide-in-from-top-2 duration-300">
              <ShieldAlert className="w-5 h-5 text-red-600 mr-2.5 shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm font-bold">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">
                Register Number / Staff ID
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900 text-sm font-semibold placeholder-slate-400 transition-all"
                placeholder="e.g. 2117240030025 or admin"
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-4 pr-12 py-3 bg-slate-50/50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900 text-sm font-semibold placeholder-slate-400 transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 px-4 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 flex justify-center items-center py-3.5 px-4 rounded-lg text-sm font-extrabold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] hover:-translate-y-[1px] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 disabled:opacity-70 disabled:pointer-events-none disabled:transform-none transition-all duration-200 active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Authenticating...
                </>
              ) : (
                'Sign In securely'
              )}
            </button>
          </form>

        </div>

        {/* Mobile Footer */}
        <div className="mt-8 flex lg:hidden flex-col items-center justify-center gap-2 relative z-10">
          <img src="/techspark-logo.png" alt="TechSpark" className="h-6 w-auto grayscale opacity-60" />
          <p className="text-slate-400 text-[10px] uppercase tracking-widest font-bold">
            Built by TechSpark Club
          </p>
        </div>
          
      </div>
    </div>
  );
}
