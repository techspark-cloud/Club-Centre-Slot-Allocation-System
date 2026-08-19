'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Bookmark, User, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function StudentNav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const links = [
    { name: 'Dashboard', href: '/student', icon: LayoutDashboard },
    { name: 'Profile', href: '/student/profile', icon: User },
  ];

  return (
    <>
      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center space-x-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200 mx-6">
        {links.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                isActive 
                  ? 'bg-white text-blue-700 shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              {link.name}
            </Link>
          );
        })}
      </div>

      {/* Mobile Hamburger Button */}
      <button 
        className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="absolute top-20 left-0 right-0 bg-white border-b border-slate-200 shadow-lg md:hidden flex flex-col p-4 space-y-2 z-50">
          {links.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                {link.name}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
