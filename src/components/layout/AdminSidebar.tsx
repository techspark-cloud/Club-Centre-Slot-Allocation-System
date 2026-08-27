'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, Upload, Calendar, Building2, Layers, CheckSquare, LayoutDashboard, Menu, X, LogOut, Map, Activity, UserCheck, FileText, Mail, PieChart } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function AdminSidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Close sidebar on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const navItems = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Executive View', href: '/admin/executive', icon: Activity },
    { name: 'Audit Reports', href: '/admin/audit-reports', icon: FileText },
    { name: 'Capacity Analytics', href: '/admin/capacity', icon: PieChart },
    { name: 'Live Attendance', href: '/admin/attendance', icon: UserCheck },
    { name: 'Students', href: '/admin/students', icon: Users },
    { name: 'Clubs', href: '/admin/clubs', icon: Building2 },
    { name: 'Centres', href: '/admin/centres', icon: Layers },
    { name: 'Activity Slots', href: '/admin/slots', icon: Calendar },
    { name: 'Allocations Manager', href: '/admin/allocations', icon: CheckSquare },
    { name: 'Email Config', href: '/admin/emails', icon: Mail },
    { name: 'Campus 3D Map', href: '/admin/map', icon: Map },
    { name: 'Import Master Data', href: '/admin/import', icon: Upload },
  ];

  return (
    <>
      {/* Mobile Hamburger Button (Fixed top right, exactly where the hidden Sign Out button was) */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-5 right-4 z-[60] p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors shadow-sm border border-slate-200"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden animate-in fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 
        transform transition-transform duration-300 ease-in-out
        md:sticky md:top-20 md:translate-x-0 md:w-64 md:h-[calc(100vh-5rem)] 
        flex flex-col flex-shrink-0
        ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
      `}>
        
        {/* Mobile Logo Header (Only visible inside sidebar on mobile) */}
        <div className="md:hidden h-20 border-b border-slate-100 flex items-center px-6">
          <span className="font-black text-slate-800 text-lg">Admin Menu</span>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
          <nav className="space-y-1.5 flex flex-col">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-extrabold rounded-xl transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100'
                      : 'text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-100'
                  }`}
                >
                  <Icon
                    className={`mr-3 h-5 w-5 flex-shrink-0 ${
                      isActive ? 'text-blue-600' : 'text-slate-400'
                    }`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Sign Out */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <form action="/api/auth/signout" method="POST" className="w-full">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 px-4 py-3 rounded-xl font-bold transition-colors text-sm border border-red-100"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
