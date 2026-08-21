import { ReactNode } from 'react';
import Link from 'next/link';
import { Building2, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import OverallClubsNavigation from './OverallClubsNavigation';

export default async function OverallClubsLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== 'clubs@rit.edu') {
    redirect('/login');
  }

  return (
    <div className="h-screen overflow-hidden bg-[#f8fafc] flex flex-col text-slate-900">
      <header className="bg-white border-b border-slate-200 z-50 shadow-sm shrink-0">
        <div className="w-full px-4 sm:px-6 lg:px-6">
          <div className="flex justify-between h-16 items-center relative">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Overall Clubs Portal</h1>
            </div>
            
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </header>
      
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden max-w-full">
        <OverallClubsNavigation />
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
