import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SignOutButton from '@/components/SignOutButton';
import { LayoutDashboard } from 'lucide-react';

export default async function CoordinatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'CLUB_COORDINATOR' && profile.role !== 'CENTRE_COORDINATOR')) {
    redirect('/unauthorized');
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col overflow-x-hidden w-full max-w-[100vw]">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-6">
          <div className="flex justify-between h-20 items-center relative">
            
            {/* Logo Section (Left) */}
            <div className="flex items-center gap-3 sm:gap-5">
              <img src="/rit-logo.png" alt="RIT Logo" className="h-7 sm:h-10 w-auto object-contain" />
              <div className="h-6 sm:h-8 w-px bg-slate-200 hidden sm:block"></div>
              <img src="/techspark-logo.png" alt="TechSpark Logo" className="h-7 sm:h-10 w-auto object-contain hidden sm:block" />
            </div>

            {/* Navigation Menu (Absolute Center on Desktop) */}
            <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-slate-700 font-bold text-sm">
              <LayoutDashboard className="w-4 h-4" />
              <span>Coordinator Dashboard</span>
            </div>
            
            {/* User Section (Right) */}
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="text-sm font-bold text-slate-600 hidden md:block">
                {profile.full_name || user.email}
              </span>
              <SignOutButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="w-full max-w-[1600px] mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8 flex-grow flex flex-col">
        {children}
      </main>

      <footer className="bg-white border-t border-slate-200 py-8 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-slate-500 text-sm font-semibold">
            © {new Date().getFullYear()} Rajalakshmi Institute of Technology. All rights reserved.
          </p>
          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Built by</span>
            <img 
              src="/techspark-logo.png" 
              alt="TechSpark Club" 
              className="h-8 w-auto object-contain transition-transform duration-300 hover:scale-105" 
            />
          </div>
        </div>
      </footer>
    </div>
  );
}
