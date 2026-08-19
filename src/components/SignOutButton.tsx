'use client';

import { useState } from 'react';
import { LogOut } from 'lucide-react';

export default function SignOutButton() {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    
    try {
      // Call the signout API
      await fetch('/api/auth/signout', { method: 'POST' });
      
      // Add an artificial delay so they can enjoy the gorgeous animation
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    } catch (error) {
      console.error("Sign out failed", error);
      setIsSigningOut(false);
    }
  };

  return (
    <>
      <button 
        onClick={handleSignOut}
        disabled={isSigningOut}
        className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 text-sm font-bold rounded-xl transition-colors border border-slate-200 hover:border-red-100 shadow-sm"
      >
        <LogOut className="w-4 h-4" />
        <span className="hidden sm:inline">Sign Out</span>
      </button>

      {isSigningOut && (
        <div className="fixed inset-0 z-[9999] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="relative">
            {/* Glowing orb effect */}
            <div className="absolute inset-0 bg-orange-400 rounded-full blur-2xl opacity-40 animate-pulse"></div>
            
            {/* Logo */}
            <img 
              src="/techspark-logo.png" 
              alt="TechSpark" 
              className="relative h-24 w-auto object-contain animate-bounce" 
              style={{ animationDuration: '2s' }}
            />
          </div>
          
          <h2 className="mt-8 text-2xl font-extrabold text-slate-800 tracking-tight animate-pulse">
            Signing Out...
          </h2>
          <p className="mt-2 text-slate-500 font-medium">Securing your session</p>
        </div>
      )}
    </>
  );
}
