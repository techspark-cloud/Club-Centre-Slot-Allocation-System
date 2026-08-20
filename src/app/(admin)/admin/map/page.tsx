'use client';

import dynamic from 'next/dynamic';
import { Map, Loader2 } from 'lucide-react';

// Dynamic import for the Canvas component to prevent SSR issues with Three.js
const CampusMap3D = dynamic(() => import('@/components/3d/CampusMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 rounded-3xl border-2 border-slate-200">
      <Loader2 className="w-12 h-12 animate-spin text-purple-500 mb-4" />
      <h2 className="text-xl font-black text-slate-800">Loading 3D Campus...</h2>
      <p className="text-slate-500 font-medium">Initializing graphics engine</p>
    </div>
  ),
});

export default function AdminMapPage() {
  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header */}
      <div className="shrink-0 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center">
            <div className="bg-purple-100 p-2.5 rounded-xl mr-3">
              <Map className="text-purple-600 w-6 h-6" />
            </div>
            3D Campus Explorer
          </h1>
          <p className="text-slate-500 font-medium mt-2">
            Interactive visualization of venues, clubs, and centres across the campus.
          </p>
        </div>
      </div>

      {/* 3D Viewer Container */}
      <div className="flex-1 min-h-[600px] w-full rounded-3xl overflow-hidden border-2 border-slate-200 shadow-sm relative">
        <CampusMap3D />
      </div>
    </div>
  );
}
