'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, X, RefreshCw, MapPin, AlertCircle, Check } from 'lucide-react';

interface GPSCameraProps {
  onCapture: (file: File) => void;
  onCancel: () => void;
}

export default function GPSCamera({ onCapture, onCancel }: GPSCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceIndex, setCurrentDeviceIndex] = useState(0);

  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  }, [stream]);

  const startCamera = useCallback(async () => {
    stopStream();
    setIsLoading(true);
    setError(null);
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Camera access is blocked by your browser. This usually happens when the site is not accessed over HTTPS or localhost.");
      setIsLoading(false);
      return;
    }

    try {
      // First get available devices if we haven't already
      let videoDevices = devices;
      if (videoDevices.length === 0) {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        videoDevices = allDevices.filter(d => d.kind === 'videoinput');
        setDevices(videoDevices);
      }

      let constraints: MediaStreamConstraints = { video: { facingMode: 'environment' } }; // Default mobile preferred

      // If we have specific devices and have cycled, use deviceId
      if (videoDevices.length > 0) {
        const selectedDevice = videoDevices[currentDeviceIndex % videoDevices.length];
        if (selectedDevice && selectedDevice.deviceId) {
           constraints = { video: { deviceId: { exact: selectedDevice.deviceId } } };
        }
      }

      let mediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (fallbackErr) {
        // Ultimate fallback
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => console.error("Video play error:", e));
        };
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      setError("Could not access camera. Please check permissions or hardware switch.");
    } finally {
      setIsLoading(false);
    }
  }, [devices, currentDeviceIndex, stopStream]);

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (err) => {
        console.warn("High accuracy failed, trying low accuracy...", err);
        // Fallback: Try without high accuracy (helps on desktops without GPS)
        navigator.geolocation.getCurrentPosition(
          (fallbackPos) => {
            setLocation({
              lat: fallbackPos.coords.latitude,
              lng: fallbackPos.coords.longitude,
              accuracy: fallbackPos.coords.accuracy,
            });
          },
          (fallbackErr) => {
            console.error("Geolocation error:", fallbackErr);
            // Allow testing the camera even if the PC has no GPS
            setLocation({ lat: 0, lng: 0, accuracy: -1 });
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
        );
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => {
    startCamera();
    getLocation();

    return () => {
      stopStream();
    };
  }, [startCamera, getLocation, stopStream]);

  const switchCamera = () => {
    if (devices.length > 1) {
      setCurrentDeviceIndex(prev => prev + 1);
    }
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current || !location) return;
    
    setIsCapturing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    // Set canvas dimensions to match video intrinsic size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the image from video
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Prepare Watermark Data
    const dateStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    let latStr = "Unavailable";
    let lngStr = "Unavailable";
    let accuracyStr = "Unknown";
    
    if (location.accuracy !== -1) {
      latStr = location.lat.toFixed(6);
      lngStr = location.lng.toFixed(6);
      accuracyStr = `±${Math.round(location.accuracy)}m`;
    }
    
    const watermarkText = [
      `RIT Club & Centre Activity`,
      `Date & Time: ${dateStr}`,
      `Lat: ${latStr}, Long: ${lngStr}`,
      `Accuracy: ${accuracyStr}`
    ];

    // Add Watermark overlay block at the bottom
    const padding = 20;
    const fontSize = Math.max(16, Math.floor(canvas.height * 0.025));
    const lineHeight = fontSize * 1.4;
    const boxHeight = (watermarkText.length * lineHeight) + (padding * 2);
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; // Semi-transparent black background
    ctx.fillRect(0, canvas.height - boxHeight, canvas.width, boxHeight);

    // Draw Text
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = '#ffffff'; // White text
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    watermarkText.forEach((text, index) => {
      ctx.fillText(text, padding, canvas.height - boxHeight + padding + (index * lineHeight));
    });

    // Convert to file
    canvas.toBlob((blob) => {
      if (blob) {
        const fileName = `gps_evidence_${new Date().getTime()}.jpg`;
        const file = new File([blob], fileName, { type: 'image/jpeg' });
        stopStream();
        onCapture(file);
      }
      setIsCapturing(false);
    }, 'image/jpeg', 0.85);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center justify-between text-white bg-black/50 absolute top-0 left-0 right-0 z-10">
        <button onClick={() => { stopStream(); onCancel(); }} className="p-2 hover:bg-white/20 rounded-full transition-colors">
          <X className="w-6 h-6" />
        </button>
        <div className="text-center">
          <h3 className="font-bold text-sm">Live GPS Camera</h3>
          {location ? (
            location.accuracy === -1 ? (
              <p className="text-[10px] text-red-400 flex items-center justify-center gap-1">
                <AlertCircle className="w-3 h-3" /> Location Unavailable
              </p>
            ) : (
              <p className="text-[10px] text-green-400 flex items-center justify-center gap-1">
                <MapPin className="w-3 h-3" /> Location Acquired
              </p>
            )
          ) : (
            <p className="text-[10px] text-yellow-400 flex items-center justify-center gap-1 animate-pulse">
              <MapPin className="w-3 h-3" /> Acquiring Location...
            </p>
          )}
        </div>
        <button onClick={switchCamera} className="p-2 hover:bg-white/20 rounded-full transition-colors">
          <RefreshCw className="w-6 h-6" />
        </button>
      </div>

      {/* Video Feed */}
      <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
        {error ? (
          <div className="text-center p-6 bg-slate-900 rounded-2xl mx-4 max-w-sm border border-slate-700">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <p className="text-white font-bold mb-2">{error}</p>
            <p className="text-slate-400 text-xs mb-4">Please ensure you have granted Camera and Location permissions in your browser settings.</p>
            <button onClick={startCamera} className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700">
              Try Again
            </button>
          </div>
        ) : (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-contain"
            />
            {/* Hidden canvas for processing */}
            <canvas ref={canvasRef} className="hidden" />
          </>
        )}
      </div>

      {/* Footer Controls */}
      {!error && (
        <div className="p-8 pb-12 flex items-center justify-center bg-black/80 absolute bottom-0 left-0 right-0 z-10">
          <button 
            onClick={handleCapture}
            disabled={!location || isCapturing}
            className="relative flex items-center justify-center disabled:opacity-50 transition-transform active:scale-95"
          >
            {/* Camera Shutter Button Styling */}
            <div className="w-20 h-20 border-4 border-white rounded-full flex items-center justify-center">
              <div className={`w-16 h-16 rounded-full ${(!location || isCapturing) ? 'bg-slate-400' : 'bg-white'} transition-colors`}></div>
            </div>
            {isCapturing && (
              <div className="absolute inset-0 flex items-center justify-center text-black">
                <Check className="w-8 h-8 animate-pulse" />
              </div>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
