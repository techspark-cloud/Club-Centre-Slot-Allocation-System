'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CalendarClock, Users } from 'lucide-react';

export default function OverallCentresNavigation() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', href: '/overall-centres', icon: LayoutDashboard },
    { name: 'Timetable', href: '/overall-centres/timetable', icon: CalendarClock },
    { name: 'Students', href: '/overall-centres/students', icon: Users },
  ];

  return (
    <div className="w-64 bg-white border-r border-slate-200 h-[calc(100vh-4rem)] sticky top-16 flex-shrink-0 hidden md:block">
      <nav className="p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-colors ${
                isActive 
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' 
                  : 'text-slate-600 hover:bg-slate-50 border border-transparent'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
