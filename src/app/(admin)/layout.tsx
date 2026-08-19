import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

import AdminSidebar from '@/components/layout/AdminSidebar';

export default async function AdminLayout({
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
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['SUPER_ADMIN', 'ALLOCATION_ADMIN'].includes(profile.role)) {
    redirect('/unauthorized');
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col text-slate-900">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-6">
          <div className="flex justify-between h-20 items-center relative">
            
            {/* Logo Section (Left) */}
            <div className="flex items-center gap-3 sm:gap-5">
              <img src="/rit-logo.png" alt="RIT Logo" className="h-7 sm:h-10 w-auto object-contain" />
              <div className="h-6 sm:h-8 w-px bg-slate-200 hidden sm:block"></div>
              <img src="/techspark-logo.png" alt="TechSpark Logo" className="h-7 sm:h-10 w-auto object-contain hidden sm:block" />
            </div>

            {/* User Section (Right) */}
            <div className="flex items-center gap-2 sm:gap-5">
              <span className="text-sm font-bold text-slate-600 hidden md:block">
                {user.email}
              </span>
              <form action="/api/auth/signout" method="POST" className="hidden md:block">
                <button
                  type="submit"
                  className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 px-4 py-2 rounded-xl font-bold transition-colors text-sm"
                >
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden max-w-full">
        <AdminSidebar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
