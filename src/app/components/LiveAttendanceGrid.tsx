'use client';

import { useState, useEffect } from 'react';
import { Users, UserCheck, UserX, AlertCircle, RefreshCw, Download, MapPin, Clock, Send } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getPDFReportData } from '@/app/actions/attendance';

interface LiveAttendanceGridProps {
  type: 'CLUB' | 'CENTRE' | 'ALL';
}

export default function LiveAttendanceGrid({ type }: LiveAttendanceGridProps) {
  const [stats, setStats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingSlotId, setDownloadingSlotId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [activeSession, setActiveSession] = useState<'FORENOON' | 'AFTERNOON'>('FORENOON');
  const [isSendingEmails, setIsSendingEmails] = useState(false);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/live-attendance?date=${selectedDate}`);
      const json = await res.json();
      
      if (json.error) {
        console.error("API Error:", json.error);
        setStats([]);
        return;
      }
      
      const { data } = json;
      
      // Filter by type
      const filtered = data.filter((stat: any) => {
        if (type === 'CLUB') return stat.slot.club_id !== null;
        if (type === 'CENTRE') return stat.slot.centre_id !== null;
        return true;
      });
      
      // Sort by Time -> Venue
      filtered.sort((a: any, b: any) => {
        if (a.slot.start_time !== b.slot.start_time) {
          return (a.slot.start_time || '').localeCompare(b.slot.start_time || '');
        }
        return (a.slot.venue || '').localeCompare(b.slot.venue || '');
      });
      
      setStats(filtered);
      setLastUpdated(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Poll every 15 seconds for LIVE updates
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, [selectedDate, type]);

  const activeStats = stats.filter(s => s.slot.session === activeSession);

  const totalExpected = activeStats.reduce((acc, stat) => acc + stat.totalExpected, 0);
  const totalPresent = activeStats.reduce((acc, stat) => acc + stat.present, 0);
  const totalAbsent = activeStats.reduce((acc, stat) => acc + stat.absent, 0);
  const totalPending = activeStats.reduce((acc, stat) => acc + stat.pending, 0);

  const overallPercentage = totalExpected > 0 ? Math.round((totalPresent / totalExpected) * 100) : 0;

  const downloadPDF = async (slotId: string, entityName: string, day: string) => {
    setDownloadingSlotId(slotId);
    try {
      const { students, attendance } = await getPDFReportData(slotId, selectedDate);
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;

      try {
        const logoRes = await fetch('/rit-logo.png');
        const logoBlob = await logoRes.blob();
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(logoBlob);
        });

        // Use dimensions that fit the header well
        const img = new Image();
        img.src = dataUrl;
        await new Promise((resolve, reject) => { 
          img.onload = resolve; 
          img.onerror = reject;
        });
        
        const width = img.width;
        const height = img.height;
        
        const targetHeight = 18;
        const targetWidth = (width / height) * targetHeight;
        const xPos = (pageWidth - targetWidth) / 2;

        doc.addImage(dataUrl, 'PNG', xPos, 10, targetWidth, targetHeight);
      } catch (error) {
        console.error("Could not load logo for PDF", error);
        doc.setFontSize(20);
        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "bold");
        doc.text("RAJALAKSHMI INSTITUTE OF TECHNOLOGY", pageWidth / 2, 22, { align: "center" });
      }
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text("Club & Centre Slot Allocation Portal", pageWidth / 2, 36, { align: "center" });

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("OFFICIAL ATTENDANCE REPORT", pageWidth / 2, 45, { align: "center" });

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(14, 52, pageWidth - 14, 52);
      
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      
      doc.setFont("helvetica", "bold");
      doc.text("Entity Name :", 14, 62);
      doc.setFont("helvetica", "normal");
      doc.text(entityName, 37, 62);

      doc.setFont("helvetica", "bold");
      doc.text("Date :", 14, 69);
      doc.setFont("helvetica", "normal");
      doc.text(selectedDate, 25, 69);

      doc.setFont("helvetica", "bold");
      doc.text("Day :", 130, 69);
      doc.setFont("helvetica", "normal");
      doc.text(day, 140, 69);

      const totalRegistered = students.length;
      const totalPresent = attendance.filter((a: any) => a.status === 'PRESENT').length;
      const totalAbsent = attendance.filter((a: any) => a.status === 'ABSENT').length;

      doc.setFont("helvetica", "bold");
      doc.setTextColor(51, 65, 85);
      doc.text("Total Enrolled :", 14, 76);
      doc.setFont("helvetica", "normal");
      doc.text(totalRegistered.toString(), 40, 76);
      
      doc.setFont("helvetica", "bold");
      doc.setTextColor(22, 163, 74); // Green
      doc.text("Present :", 75, 76);
      doc.setFont("helvetica", "normal");
      doc.text(totalPresent.toString(), 92, 76);
      
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38); // Red
      doc.text("Absent :", 130, 76);
      doc.setFont("helvetica", "normal");
      doc.text(totalAbsent.toString(), 145, 76);

      const tableColumn = ["S.No", "Register No", "Student Name", "Course & Sec", "Status"];
      const tableRows = students.map((m: any, i: number) => {
        const studentAttendance = attendance.find((a: any) => a.student_id === m.id);
        const status = studentAttendance?.status === 'PRESENT' ? 'Present' : (studentAttendance?.status === 'ABSENT' ? 'Absent' : 'Unmarked');
        
        return [
          i + 1,
          m.register_no || '',
          m.name || '',
          `${m.course || ''} - ${m.section || ''}`,
          status
        ];
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 82,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          4: { fontStyle: 'bold' }
        },
        didParseCell: function (data: any) {
          if (data.section === 'body' && data.column.index === 4) {
            if (data.cell.raw === 'Present') {
              data.cell.styles.textColor = [22, 163, 74];
            } else if (data.cell.raw === 'Absent') {
              data.cell.styles.textColor = [220, 38, 38];
            } else {
              data.cell.styles.textColor = [148, 163, 184];
            }
          }
        }
      });

      doc.save(`${entityName.replace(/\s+/g, '_')}_Attendance_${selectedDate}.pdf`);
    } catch (e) {
      console.error(e);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setDownloadingSlotId(null);
    }
  };

  const downloadOverallReport = async () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;

      try {
        const logoRes = await fetch('/rit-logo.png');
        const logoBlob = await logoRes.blob();
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(logoBlob);
        });

        const img = new Image();
        img.src = dataUrl;
        await new Promise((resolve, reject) => { 
          img.onload = resolve; 
          img.onerror = reject;
        });
        
        const width = img.width;
        const height = img.height;
        
        const targetHeight = 18;
        const targetWidth = (width / height) * targetHeight;
        const xPos = (pageWidth - targetWidth) / 2;

        doc.addImage(dataUrl, 'PNG', xPos, 10, targetWidth, targetHeight);
      } catch (error) {
        console.error("Could not load logo for PDF", error);
        doc.setFontSize(20);
        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "bold");
        doc.text("RAJALAKSHMI INSTITUTE OF TECHNOLOGY", pageWidth / 2, 22, { align: "center" });
      }
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text("Club & Centre Slot Allocation Portal", pageWidth / 2, 36, { align: "center" });

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("OVERALL ATTENDANCE SUMMARY", pageWidth / 2, 45, { align: "center" });

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(14, 52, pageWidth - 14, 52);
      
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);

      doc.setFont("helvetica", "bold");
      doc.text("Date :", 14, 62);
      doc.setFont("helvetica", "normal");
      doc.text(selectedDate, 25, 62);

      const tableColumn = ["S.No", "Club / Centre", "Venue", "Session", "Time", "Enrolled", "Present", "Absent", "Rate"];
      const tableRows = stats.map((stat: any, i: number) => {
        const entityName = stat.slot.club_id !== null ? stat.slot.clubs?.name : stat.slot.centres?.name;
        const percentage = stat.totalExpected > 0 ? Math.round((stat.present / stat.totalExpected) * 100) : 0;
        
        return [
          i + 1,
          entityName || '',
          stat.slot.venue || '',
          stat.slot.session || '',
          `${stat.slot.start_time?.slice(0,5)} - ${stat.slot.end_time?.slice(0,5)}`,
          stat.totalExpected.toString(),
          stat.present.toString(),
          stat.absent.toString(),
          `${percentage}%`
        ];
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 70,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          6: { fontStyle: 'bold', textColor: [22, 163, 74] }, // Present
          7: { fontStyle: 'bold', textColor: [220, 38, 38] }, // Absent
          8: { fontStyle: 'bold' } // Rate
        }
      });

      doc.save(`Overall_Attendance_Summary_${selectedDate}.pdf`);
    } catch (e) {
      console.error(e);
      alert('Failed to generate Overall PDF Report. Please try again.');
    }
  };

  const sendHODReports = async () => {
    setIsSendingEmails(true);
    try {
      const res = await fetch('/api/admin/send-hod-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, session: activeSession })
      });
      const data = await res.json();
      
      if (data.success) {
        alert(`Successfully sent ${data.emailsSent} emails across ${data.totalDepartments} departments!`);
      } else {
        alert(`Error: ${data.error || 'Failed to send emails.'}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsSendingEmails(false);
    }
  };

  const renderStatCard = (stat: any) => {
    const percentage = stat.totalExpected > 0 ? Math.round((stat.present / stat.totalExpected) * 100) : 0;
    const entityName = stat.slot.club_id !== null ? stat.slot.clubs?.name : stat.slot.centres?.name;
    
    return (
      <div key={stat.slot.id} className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm p-5 hover:border-blue-200 transition-colors">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg leading-tight mb-1">{entityName}</h3>
            <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500">
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {stat.slot.start_time.slice(0,5)} - {stat.slot.end_time.slice(0,5)}</span>
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {stat.slot.venue}</span>
            </div>
          </div>
          <div className="text-right shrink-0 flex items-center gap-4">
            <button
              onClick={() => downloadPDF(stat.slot.id, entityName || '', stat.slot.day)}
              disabled={downloadingSlotId === stat.slot.id}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                downloadingSlotId === stat.slot.id
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200'
              }`}
            >
              {downloadingSlotId === stat.slot.id ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              PDF
            </button>
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full border-4 border-slate-50 relative">
              <svg className="w-12 h-12 absolute transform -rotate-90">
                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-100" />
                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray="125.6" strokeDashoffset={125.6 - (125.6 * percentage) / 100} className={percentage >= 75 ? 'text-emerald-500' : percentage >= 40 ? 'text-amber-500' : 'text-red-500'} strokeLinecap="round" />
              </svg>
              <span className="text-[10px] font-black text-slate-700 absolute">{percentage}%</span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="bg-slate-50 rounded-xl p-2 text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase">Enrolled</p>
            <p className="font-bold text-slate-700">{stat.totalExpected}</p>
          </div>
          <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-2 text-center">
            <p className="text-[10px] font-black text-emerald-600 uppercase">Present</p>
            <p className="font-bold text-emerald-700">{stat.present}</p>
          </div>
          <div className="bg-red-50/50 border border-red-100 rounded-xl p-2 text-center">
            <p className="text-[10px] font-black text-red-600 uppercase">Absent</p>
            <p className="font-bold text-red-700">{stat.absent}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Live Attendance Monitor</h2>
          <p className="text-slate-500 font-medium flex items-center gap-2 mt-1">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            Real-time updates from {type === 'CLUB' ? 'Clubs' : type === 'CENTRE' ? 'Centres' : 'All Clubs & Centres'}
          </p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex bg-slate-100 p-1.5 rounded-xl border-2 border-slate-200">
            <button
              onClick={() => setActiveSession('FORENOON')}
              className={`px-4 py-1.5 rounded-lg text-sm font-black uppercase tracking-widest transition-all ${
                activeSession === 'FORENOON' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Morning
            </button>
            <button
              onClick={() => setActiveSession('AFTERNOON')}
              className={`px-4 py-1.5 rounded-lg text-sm font-black uppercase tracking-widest transition-all ${
                activeSession === 'AFTERNOON' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Evening
            </button>
          </div>

          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 rounded-xl border-2 border-slate-200 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 shadow-sm"
          />
          <button 
            onClick={fetchStats}
            className="p-2.5 bg-white border-2 border-slate-200 rounded-xl text-slate-500 hover:text-blue-600 hover:border-blue-300 transition-colors shadow-sm"
            title="Refresh manually"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin text-blue-500' : ''}`} />
          </button>
          <button 
            onClick={downloadOverallReport}
            className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl shadow-sm hover:bg-slate-800 transition-colors flex items-center gap-2 text-sm"
            title="Download Overall Summary PDF"
          >
            <Download className="w-4 h-4" />
            PDF
          </button>
          
          <button 
            onClick={sendHODReports}
            disabled={isSendingEmails}
            className={`px-4 py-2 ${activeSession === 'FORENOON' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
            title={`Send ${activeSession} Report to HODs`}
          >
            {isSendingEmails ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Email HODs
          </button>
        </div>
      </div>

      {/* Aggregate Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full pointer-events-none"></div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 relative z-10">Total Enrolled</p>
          <div className="flex items-baseline gap-2 relative z-10">
            <span className="text-3xl font-black text-slate-900">{totalExpected}</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-bl-full pointer-events-none"></div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 relative z-10">Present (Live)</p>
          <div className="flex items-baseline gap-2 relative z-10">
            <span className="text-3xl font-black text-emerald-600">{totalPresent}</span>
            <UserCheck className="w-4 h-4 text-emerald-500" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-red-50 rounded-bl-full pointer-events-none"></div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 relative z-10">Absent</p>
          <div className="flex items-baseline gap-2 relative z-10">
            <span className="text-3xl font-black text-red-600">{totalAbsent}</span>
            <UserX className="w-4 h-4 text-red-500" />
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl p-5 shadow-lg relative overflow-hidden text-white">
          <div className="absolute inset-0 opacity-10 bg-[url('/noise.png')] mix-blend-overlay pointer-events-none"></div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 relative z-10">Overall Rate</p>
          <div className="flex items-baseline gap-2 relative z-10">
            <span className="text-3xl font-black">{overallPercentage}%</span>
          </div>
          
          <div className="h-1.5 w-full bg-slate-800 rounded-full mt-3 overflow-hidden relative z-10">
            <div 
              className="h-full bg-emerald-400 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${overallPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Venues Grid */}
      <div className="space-y-8 mt-8">
        {activeStats.length === 0 && !isLoading ? (
          <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl">
            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-black text-slate-700">No Attendance Data Found</h3>
            <p className="text-slate-500 font-medium">There are no slots or attendance logs for {activeSession === 'FORENOON' ? 'the Morning' : 'the Evening'} session on this date.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeStats.map(renderStatCard)}
          </div>
        )}
      </div>
    </div>
  );
}
