'use client';

import { useState } from 'react';
import { X, Navigation } from 'lucide-react';
import CampusMap from './CampusMap';

interface CampusMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  destinationNodeId: string;
  venueName: string;
}

export default function CampusMapModal({ isOpen, onClose, destinationNodeId, venueName }: CampusMapModalProps) {
  const [hasStarted, setHasStarted] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 sm:p-6">
      <div className="bg-white w-full max-w-6xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Route to {venueName}</h2>
            <p className="text-sm text-slate-500 font-medium">Navigation Instructions</p>
          </div>
          <button 
            onClick={() => {
              setHasStarted(false);
              onClose();
            }}
            className="p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-xl transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 3D Map Container */}
        <div className="flex-1 relative bg-slate-50">
          
          {/* Instruction Overlay */}
          {!hasStarted && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-sm p-6 text-center">
              <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full animate-in slide-in-from-bottom-8 duration-500">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Navigation className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-4">Step 1: Go to B-Block</h3>
                <p className="text-slate-600 font-medium mb-8 leading-relaxed">
                  Wherever you are on campus, please proceed to the <strong className="text-slate-900">Ground Floor entrance of B-Block</strong> first. All club and centre rooms are located here.
                </p>
                <button
                  onClick={() => setHasStarted(true)}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-500/30"
                >
                  I am at B-Block, Show Route!
                </button>
              </div>
            </div>
          )}

          <CampusMap 
            autoStartNode={hasStarted ? "MAIN_ROAD_B" : ""} 
            autoEndNode={hasStarted ? (destinationNodeId as any) : ""} 
            hideControls={true}
            highlightVenue={venueName}
          />
        </div>

      </div>
    </div>
  );
}
