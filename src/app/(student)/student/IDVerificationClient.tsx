'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, ScanLine, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';

interface IDVerificationClientProps {
  studentId: string;
}

export default function IDVerificationClient({ studentId }: IDVerificationClientProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [scanAttempt, setScanAttempt] = useState(0);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // Only initialize if we are not verifying and not successful yet
    if (isVerifying || success) return;

    scannerRef.current = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        rememberLastUsedCamera: true,
      },
      false
    );

    const onScanSuccess = async (decodedText: string) => {
      // Force kill the camera hardware immediately by finding the video element!
      try {
        const video = document.querySelector('#reader video') as HTMLVideoElement;
        if (video && video.srcObject) {
          const stream = video.srcObject as MediaStream;
          stream.getTracks().forEach(t => t.stop());
        }
      } catch (e) {}

      if (scannerRef.current) {
        try {
          await scannerRef.current.clear();
        } catch (e) {}
      }
      
      setError(null);
      setIsVerifying(true);

      try {
        const response = await fetch('/api/verify-id-card', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: decodedText, studentId })
        });

        const data = await response.json();

        if (data.success) {
          setSuccess(true);
          // Wait 2 seconds so they can see the success message, then hard reload
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else {
          setError(data.message || 'Verification failed.');
          setIsVerifying(false);
          // Re-initialize camera after failure delay
          setTimeout(() => setScanAttempt(prev => prev + 1), 3000);
        }
      } catch (err: any) {
        setError('Network error during verification. Please try again.');
        setIsVerifying(false);
        // Re-initialize camera after failure delay
        setTimeout(() => setScanAttempt(prev => prev + 1), 3000);
      }
    };

    const onScanFailure = (error: any) => {
      // Silently ignore scan failures
    };

    scannerRef.current.render(onScanSuccess, onScanFailure);

    // Cleanup when component unmounts
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
      }
    };
  }, [studentId, router, scanAttempt]);

  if (success) {
    return (
      <div className="bg-white rounded-[2rem] p-8 sm:p-12 border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center flex-1 max-w-2xl mx-auto w-full animate-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 animate-in bounce-in" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">ID Verified!</h2>
        <p className="text-slate-500 font-medium text-lg">
          Your physical ID card has been successfully verified. Unlocking the portal...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2rem] p-6 sm:p-10 border border-slate-200 shadow-sm flex flex-col items-center text-center flex-1 max-w-2xl mx-auto w-full">
      <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-blue-100">
        <ShieldCheck className="w-8 h-8" />
      </div>
      
      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-3">
        Verify Your ID Card
      </h2>
      <p className="text-slate-500 font-medium mb-8 max-w-md">
        For security purposes, you must scan the QR code located on your physical RIT college ID card before you can book any slots.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-3 w-full mb-6 animate-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm font-bold text-left">{error}</div>
        </div>
      )}

      {/* QR Scanner Container */}
      <div className="w-full max-w-sm mx-auto overflow-hidden rounded-2xl border-2 border-slate-200 bg-slate-50 relative mb-6">
        {isVerifying && (
          <div className="absolute inset-0 z-10 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-3" />
            <p className="font-bold text-slate-700 animate-pulse">Verifying ID with IMS...</p>
          </div>
        )}
        <div id="reader" className="w-full"></div>
      </div>

      <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-4 py-2 rounded-lg">
        <ScanLine className="w-4 h-4" />
        Point your camera at the QR code
      </div>

      {/* Custom CSS to override the ugly default styles of html5-qrcode */}
      <style dangerouslySetInnerHTML={{__html: `
        #reader { border: none !important; }
        #reader__dashboard_section_csr span { font-family: inherit !important; font-weight: bold !important; color: #475569 !important; }
        #reader__dashboard_section_csr button { 
          background-color: #2563eb !important; 
          color: white !important; 
          border: none !important; 
          padding: 8px 16px !important; 
          border-radius: 8px !important; 
          font-weight: bold !important;
          cursor: pointer;
          margin-top: 8px;
        }
        #reader__camera_selection {
          padding: 8px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          margin-bottom: 8px;
          max-width: 100%;
        }
      `}} />
    </div>
  );
}
