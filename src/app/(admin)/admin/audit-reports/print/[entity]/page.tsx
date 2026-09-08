'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';

export default function PrintReportPage({ params }: { params: { entity: string } }) {
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Extract entity name from URL and decode it properly
  const entityName = decodeURIComponent(params.entity);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await fetch('/api/admin/audit-reports');
        const result = await res.json();
        if (result.success) {
          // Filter by entity and sort by date ascending
          const filtered = result.data
            .filter((r: any) => r.entityName === entityName)
            .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
          setReports(filtered);
        } else {
          setError(result.error || 'Failed to load reports.');
        }
      } catch (err: any) {
        setError('Failed to fetch from Google Sheets: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, [entityName]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-slate-500 font-medium">Preparing Visual Report for Print...</p>
      </div>
    );
  }

  if (error) {
    return <div className="p-10 text-red-600 font-bold text-center">Error: {error}</div>;
  }

  if (reports.length === 0) {
    return <div className="p-10 text-slate-500 font-bold text-center">No reports found for {entityName}.</div>;
  }

  const printReport = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Non-printable controls */}
      <div className="print:hidden p-4 bg-slate-900 text-white flex justify-between items-center sticky top-0 z-50">
        <div>
          <h1 className="font-bold">Print Preview: {entityName}</h1>
          <p className="text-xs text-slate-400">Please make sure "Background graphics" is checked in your print settings for best results.</p>
        </div>
        <button 
          onClick={printReport}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold transition-colors"
        >
          Print to PDF
        </button>
      </div>

      {/* Printable Area - Standard A4 styling */}
      <div className="w-full max-w-[210mm] mx-auto bg-white min-h-[297mm] p-8 md:p-12 text-slate-900" style={{ margin: '0 auto' }}>
        
        {/* Header */}
        <div className="flex items-center justify-between border-b-4 border-blue-900 pb-6 mb-8">
          <div className="flex-1">
            <Image src="/rit-logo.png" alt="RIT Logo" width={300} height={80} priority className="object-contain" />
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-black text-blue-900 uppercase tracking-wider">Activity Audit Report</h1>
            <p className="text-slate-500 font-medium mt-1">Generated: {new Date().toLocaleDateString('en-GB')}</p>
          </div>
        </div>

        {/* Entity Title */}
        <div className="bg-slate-100 p-6 rounded-xl border border-slate-200 mb-10 text-center">
          <h2 className="text-3xl font-black text-slate-800">{entityName}</h2>
          <p className="text-slate-500 font-medium mt-2">Comprehensive Summary of All Conducted Activities</p>
        </div>

        {/* Events Loop */}
        <div className="space-y-16">
          {reports.map((report, idx) => (
            <div key={idx} className="page-break-inside-avoid">
              <div className="flex items-center gap-4 mb-4 border-b-2 border-slate-100 pb-2">
                <div className="bg-blue-900 text-white w-10 h-10 rounded-full flex items-center justify-center font-black text-xl shrink-0">
                  {idx + 1}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">
                    Activity on {new Date(report.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </h3>
                  <p className="text-sm font-medium text-slate-500">Coordinator: <span className="font-bold text-slate-700">{report.coordinatorName}</span></p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                {/* Details Column */}
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Session</span>
                      <span className="block text-sm font-bold text-slate-700">{report.session || 'N/A'}</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Venue</span>
                      <span className="block text-sm font-bold text-slate-700">{report.venue || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-100 p-3 rounded-lg border border-slate-300">
                      <span className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Expected</span>
                      <span className="block text-lg font-black text-slate-800">{report.expected}</span>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                      <span className="block text-[10px] font-black text-green-600 uppercase tracking-wider">Present</span>
                      <span className="block text-lg font-black text-green-700">{report.present}</span>
                    </div>
                  </div>

                  <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                    <span className="block text-[10px] font-black text-blue-500 uppercase tracking-wider mb-2">Description</span>
                    <p className="text-sm font-medium text-slate-700 leading-relaxed italic">
                      "{report.description}"
                    </p>
                  </div>
                </div>

                {/* Photo Column */}
                <div>
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Photographic Evidence</span>
                  {report.imageUrl ? (
                    <div className="rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-50 flex items-center justify-center relative w-full h-64 shadow-inner">
                      {(() => {
                        const url = report.imageUrl;
                        const match = url.match(/[-\w]{25,}/);
                        const driveId = match ? match[0] : null;
                        
                        if (driveId) {
                          // Using standard img tag with Google Drive content export URL works perfectly for print!
                          const downloadUrl = `https://drive.google.com/uc?export=view&id=${driveId}`;
                          return (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img 
                              src={downloadUrl}
                              alt="Activity Evidence"
                              className="object-cover w-full h-full"
                              crossOrigin="anonymous"
                            />
                          );
                        } else {
                          return (
                            <div className="p-4 text-center">
                              <p className="text-sm font-bold text-slate-500">External Image URL</p>
                              <a href={url} className="text-xs text-blue-600 break-all">{url}</a>
                            </div>
                          );
                        }
                      })()}
                    </div>
                  ) : (
                    <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center w-full h-64">
                      <p className="text-sm font-bold text-slate-400">No Photo Uploaded</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer with Techspark Logo - Printed at the bottom of the document */}
        <div className="mt-20 pt-8 border-t-2 border-slate-100 flex items-center justify-between text-slate-500 page-break-inside-avoid">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest">Rajalakshmi Institute of Technology</p>
            <p className="text-[10px] font-medium mt-1">Club & Centre Slot Allocation Portal</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold italic text-slate-400">Managed by</span>
            <Image src="/techspark-logo.png" alt="Techspark Logo" width={120} height={40} className="object-contain opacity-80" />
          </div>
        </div>

      </div>
      
      {/* Global Print Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background-color: white !important; }
          .page-break-inside-avoid { page-break-inside: avoid; }
          @page { size: A4; margin: 10mm; }
        }
      `}} />
    </div>
  );
}
