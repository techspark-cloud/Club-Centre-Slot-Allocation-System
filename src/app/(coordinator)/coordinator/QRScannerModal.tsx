'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface QRScannerModalProps {
  onClose: () => void;
  onScanSuccess: (studentId: string) => Promise<boolean>;
  slotName: string;
}

export default function QRScannerModal({ onClose, onScanSuccess, slotName }: QRScannerModalProps) {
  const [mounted, setMounted] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  
  // Track recent scans to prevent duplicate spamming
  const lastScanned = useRef<{ id: string, time: number }>({ id: '', time: 0 });
  
  const [scanStatus, setScanStatus] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [scanMessage, setScanMessage] = useState('');

  useEffect(() => {
    setMounted(true);
    
    // Slight delay before initializing camera to ensure DOM is ready
    const timer = setTimeout(() => {
      scannerRef.current = new Html5QrcodeScanner(
        "attendance-reader",
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          rememberLastUsedCamera: true,
        },
        false
      );

      const onScan = async (decodedText: string) => {
        // Expected format: ATTENDANCE:{student_id}
        if (!decodedText.startsWith('ATTENDANCE:')) {
          setScanStatus('ERROR');
          setScanMessage('Invalid QR Code. Please scan a valid Student Digital ID.');
          return;
        }

        const studentId = decodedText.split(':')[1];
        
        // Prevent duplicate scanning within 3 seconds
        const now = Date.now();
        if (lastScanned.current.id === studentId && (now - lastScanned.current.time) < 3000) {
          return; // Ignore duplicate
        }
        
        lastScanned.current = { id: studentId, time: now };
        
        setScanStatus('PROCESSING');
        setScanMessage('Marking attendance...');
        
        try {
          const success = await onScanSuccess(studentId);
          if (success) {
            setScanStatus('SUCCESS');
            setScanMessage('Student marked PRESENT');
          } else {
            setScanStatus('ERROR');
            setScanMessage('Student not found in this slot roster.');
          }
        } catch (e) {
          setScanStatus('ERROR');
          setScanMessage('Network error occurred.');
        }

        // Clear status overlay after 1.5s
        setTimeout(() => {
          setScanStatus('IDLE');
          setScanMessage('');
        }, 1500);
      };

      scannerRef.current.render(onScan, () => {});
    }, 100);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
      }
    };
  }, [onScanSuccess]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h3 className="font-black text-slate-900">QR Attendance Scanner</h3>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{slotName}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 relative">
          
          {/* Status Overlay */}
          {scanStatus !== 'IDLE' && (
            <div className="absolute inset-0 z-10 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
              {scanStatus === 'PROCESSING' && (
                <>
                  <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-3" />
                  <p className="font-bold text-slate-700">{scanMessage}</p>
                </>
              )}
              {scanStatus === 'SUCCESS' && (
                <>
                  <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
                  <p className="font-black text-green-700 text-lg">{scanMessage}</p>
                </>
              )}
              {scanStatus === 'ERROR' && (
                <>
                  <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
                  <p className="font-bold text-red-600">{scanMessage}</p>
                </>
              )}
            </div>
          )}

          <div className="w-full mx-auto overflow-hidden rounded-xl border-2 border-slate-200 bg-slate-50 relative mb-4">
            <div id="attendance-reader" className="w-full"></div>
          </div>

          <div className="text-center">
            <p className="text-sm font-bold text-slate-500">
              Point your camera at the student's Digital ID QR Code to instantly mark them Present.
            </p>
          </div>
        </div>

        {/* Custom CSS overrides for html5-qrcode */}
        <style dangerouslySetInnerHTML={{__html: `
          #attendance-reader { border: none !important; }
          #attendance-reader__dashboard_section_csr span { font-family: inherit !important; font-weight: bold !important; color: #475569 !important; }
          #attendance-reader__dashboard_section_csr button { 
            background-color: #2563eb !important; 
            color: white !important; 
            border: none !important; 
            padding: 8px 16px !important; 
            border-radius: 8px !important; 
            font-weight: bold !important;
            cursor: pointer;
            margin-top: 8px;
          }
          #attendance-reader__camera_selection {
            padding: 8px;
            border-radius: 8px;
            border: 1px solid #cbd5e1;
            margin-bottom: 8px;
            max-width: 100%;
          }
        `}} />
      </div>
    </div>,
    document.body
  );
}
