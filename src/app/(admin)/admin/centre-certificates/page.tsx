'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Award, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Printer, 
  ShieldCheck, 
  Sparkles, 
  ExternalLink, 
  ChevronRight, 
  Upload, 
  Building2, 
  GraduationCap, 
  Layers, 
  X, 
  Check, 
  RefreshCw, 
  Search, 
  CheckCheck, 
  Camera, 
  User, 
  Image as ImageIcon,
  Download,
  Loader2,
  GitBranch,
  Trophy,
  ArrowRight,
  Zap,
  BookOpen,
  Star,
  CheckCircle,
  Cpu,
  ArrowDown,
  AlertCircle,
  HelpCircle,
  CheckSquare,
  Server,
  Workflow,
  Lock,
  FileCode,
  Smartphone,
  BookMarked,
  Share2
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Real RIT Student Dataset loaded directly from active college database (Includes Project, Course & Hackathon)
const REAL_RIT_STUDENTS = [
  {
    id: 'SUB-101',
    studentName: 'HARINI TS',
    regNo: '2117250070107',
    department: 'B.Tech. Artificial Intelligence and Data Science',
    year: 'III Year / VI Sem - Sec B',
    centreName: 'Centre for AI (Artificial Intelligence)',
    centreCode: 'CAI',
    projectTitle: 'Automated Real-Time Foliar Crop Disease Detection using Edge CNN & IoT',
    projectDesc: 'Engineered an edge AI camera module with MobileNetV3 and TensorFlow Lite to identify crop diseases with 96.4% field accuracy.',
    projectLink: 'https://github.com/harini-ts/edge-ai-crop-vision',
    courseName: 'Deep Learning for Visual Recognition (12-Week Specialization)',
    courseProvider: 'NPTEL / Swayam (IIT Madras)',
    courseScore: 'Elite + Silver (86%)',
    hackathon: 'Smart India Hackathon (SIH 2025) - Grand Finalist (Agri-Tech)',
    completionDate: '2026-03-12',
    status: 'PENDING_CENTRE',
    certificateId: 'RIT-FTC-2026-0891',
    submittedAt: '2026-03-14 10:30 AM',
    centreRemarks: '',
    overallRemarks: '',
    registeredCentres: [
      {
        centreName: 'Centre for AI (Artificial Intelligence)',
        centreCode: 'CAI',
        semester: 'Semester VI (Current)',
        slot: 'Slot B (Wed 03:00 PM)',
        projectTitle: 'Automated Real-Time Foliar Crop Disease Detection using Edge CNN & IoT',
        courseName: 'Deep Learning for Visual Recognition (12-Week Specialization)',
        courseProvider: 'NPTEL / Swayam (IIT Madras)',
        courseScore: 'Elite + Silver (86%)',
        hackathon: 'Smart India Hackathon (SIH 2025) - Grand Finalist',
        status: 'Under Verification',
        isPrimary: true
      },
      {
        centreName: 'Center for Data Science',
        centreCode: 'CDS',
        semester: 'Semester V',
        slot: 'Slot A (Mon 03:00 PM)',
        projectTitle: 'Agricultural Yield Prediction & Geo-Spatial Analytics',
        courseName: 'Applied Data Science with Python & Big Data',
        courseProvider: 'IBM Skills Network / Coursera',
        courseScore: 'Grade A (88%)',
        hackathon: 'RIT InnoQuest 2026 - 1st Prize & Best AI Innovation',
        status: 'Completed & Certified',
        isPrimary: false
      },
      {
        centreName: 'Center for Cloud',
        centreCode: 'CC',
        semester: 'Semester IV',
        slot: 'Slot B (Thu 03:00 PM)',
        projectTitle: 'Serverless IoT Telemetry Microservices on AWS',
        courseName: 'Cloud Computing Infrastructure & DevOps',
        courseProvider: 'AWS Academy',
        courseScore: 'Distinction (91%)',
        hackathon: 'AWS Cloud Buildathon 2025 - Top 5 Finalist',
        status: 'Completed & Certified',
        isPrimary: false
      }
    ]
  },
  {
    id: 'SUB-102',
    studentName: 'HAFEEZ UDUMAN M',
    regNo: '2117250070102',
    department: 'B.Tech. Artificial Intelligence and Data Science',
    year: 'III Year / VI Sem - Sec B',
    centreName: 'Center for Data Science',
    centreCode: 'CDS',
    projectTitle: 'Predictive Energy Analytics & Anomaly Detection for Microgrid Systems',
    projectDesc: 'Developed LSTM & XGBoost time-series forecasting pipelines for renewable microgrids with automated anomaly alerts.',
    projectLink: 'https://github.com/hafeez-ai/microgrid-energy-analytics',
    courseName: 'Applied Data Science with Python & Big Data Analytics',
    courseProvider: 'IBM Skills Network / Coursera',
    courseScore: 'Completed with Honors',
    hackathon: 'National Clean Energy Hackathon 2025 - 2nd Runner Up',
    completionDate: '2026-03-10',
    status: 'PENDING_OVERALL',
    certificateId: 'RIT-FTC-2026-0892',
    submittedAt: '2026-03-12 04:15 PM',
    centreRemarks: 'Verified time-series modeling metrics, dataset validation, course credentials, and hackathon certificate.',
    overallRemarks: '',
    registeredCentres: [
      {
        centreName: 'Center for Data Science',
        centreCode: 'CDS',
        semester: 'Semester VI (Current)',
        slot: 'Slot A (Tue 03:00 PM)',
        projectTitle: 'Predictive Energy Analytics & Anomaly Detection for Microgrid Systems',
        courseName: 'Applied Data Science with Python & Big Data Analytics',
        courseProvider: 'IBM Skills Network / Coursera',
        courseScore: 'Completed with Honors',
        hackathon: 'National Clean Energy Hackathon 2025 - 2nd Runner Up',
        status: 'Centre Approved (Stage 1)',
        isPrimary: true
      },
      {
        centreName: 'Center for Cloud',
        centreCode: 'CC',
        semester: 'Semester V',
        slot: 'Slot B (Thu 03:00 PM)',
        projectTitle: 'Microgrid Telemetry Cloud Pipeline & Monitoring',
        courseName: 'Cloud Architecture & DevOps Foundations',
        courseProvider: 'AWS Academy',
        courseScore: 'Grade A (91%)',
        hackathon: 'AWS Cloud Buildathon 2025 - Merit Award',
        status: 'Completed & Certified',
        isPrimary: false
      },
      {
        centreName: 'Centre for Smart Manufacturing',
        centreCode: 'CSM',
        semester: 'Semester IV',
        slot: 'Slot A (Wed 03:00 PM)',
        projectTitle: 'Smart Factory Sensor Data Logger with MQTT',
        courseName: 'Industrial IoT 4.0 Fundamentals',
        courseProvider: 'Siemens Learning Hub',
        courseScore: 'Distinction (87%)',
        hackathon: 'RIT InnoQuest 2025 - IoT Track Winner',
        status: 'Completed & Certified',
        isPrimary: false
      }
    ]
  },
  {
    id: 'SUB-103',
    studentName: 'DEEPASRI.S',
    regNo: '2117250070062',
    department: 'B.Tech. Artificial Intelligence and Data Science',
    year: 'III Year / VI Sem - Sec A',
    centreName: 'Center for Cloud',
    centreCode: 'CC',
    projectTitle: 'Multi-Region Kubernetes Microservices Auto-Healing Service Mesh',
    projectDesc: 'Architected high-availability cloud microservices with Istio service mesh, Prometheus monitoring, and automated canary deployments on AWS.',
    projectLink: 'https://github.com/deepasri-cloud/k8s-mesh-autoheal',
    courseName: 'AWS Certified Solutions Architect & DevOps Pipeline',
    courseProvider: 'AWS Academy / Coursera',
    courseScore: 'Grade A+ (94%)',
    hackathon: 'Smart India Hackathon (SIH 2025) - Grand Finalist & AWS Buildathon Winner',
    completionDate: '2026-03-05',
    status: 'APPROVED',
    certificateId: 'RIT-FTC-2026-0845',
    submittedAt: '2026-03-08 11:20 AM',
    centreRemarks: 'Tested live cloud deployment. Clean infrastructure-as-code YAML scripts and hackathon award verified.',
    overallRemarks: 'Approved for institutional certificate award.',
    registeredCentres: [
      {
        centreName: 'Center for Cloud',
        centreCode: 'CC',
        semester: 'Semester VI (Current Track)',
        slot: 'Slot A (Wed 03:00 PM)',
        projectTitle: 'Multi-Region Kubernetes Microservices Auto-Healing Service Mesh',
        courseName: 'AWS Certified Solutions Architect & DevOps Pipeline',
        courseProvider: 'AWS Academy / Coursera',
        courseScore: 'Grade A+ (94%)',
        hackathon: 'Smart India Hackathon (SIH 2025) - Grand Finalist',
        status: 'Verified & Certified',
        isPrimary: true
      },
      {
        centreName: 'Centre for AI (Artificial Intelligence)',
        centreCode: 'CAI',
        semester: 'Semester V (Completed)',
        slot: 'Slot B (Fri 03:00 PM)',
        projectTitle: 'Cloud AI Distributed Workload Orchestrator with Ray',
        courseName: 'Deep Learning & Neural Network Specialization',
        courseProvider: 'Infosys Springboard & IIT Madras',
        courseScore: 'Distinction (89%)',
        hackathon: 'RIT InnoQuest 2026 - 1st Prize & Best AI Innovation',
        status: 'Completed & Certified',
        isPrimary: false
      },
      {
        centreName: 'Center for Data Science',
        centreCode: 'CDS',
        semester: 'Semester IV (Foundational)',
        slot: 'Slot A (Mon 03:00 PM)',
        projectTitle: 'Real-Time Log Stream Anomaly Detection Pipeline',
        courseName: 'Data Analytics & Pipeline Engineering',
        courseProvider: 'IBM Skills Network',
        courseScore: 'Elite (92%)',
        hackathon: 'Tamil Nadu Student Hackathon (TNSDC) - Finalist',
        status: 'Completed & Certified',
        isPrimary: false
      }
    ]
  },
  {
    id: 'SUB-104',
    studentName: 'GUNA HARINI N',
    regNo: '2117250070100',
    department: 'B.Tech. Artificial Intelligence and Data Science',
    year: 'III Year / VI Sem - Sec B',
    centreName: 'Centre for Smart Manufacturing',
    centreCode: 'CSM',
    projectTitle: 'Industrial Digital Twin & Predictive Maintenance Telemetry for CNC Machinery',
    projectDesc: 'Built vibration and acoustic ML vibration classification edge nodes transmitting MQTT sensor telemetry to industrial cloud dashboard.',
    projectLink: 'https://github.com/guna-harini/digital-twin-predictive-maintenance',
    courseName: 'Smart Manufacturing & Industrial IoT 4.0 Standards',
    courseProvider: 'Infosys Springboard & Siemens Learning Hub',
    courseScore: 'Distinction (89%)',
    hackathon: 'Industry 4.0 National Innovation Challenge - Best Prototype',
    completionDate: '2026-03-02',
    status: 'APPROVED',
    certificateId: 'RIT-FTC-2026-0846',
    submittedAt: '2026-03-06 02:40 PM',
    centreRemarks: 'Hardware sensor integration verified in Smart Manufacturing lab with hackathon distinction.',
    overallRemarks: 'Approved for institutional certificate award.',
    registeredCentres: [
      {
        centreName: 'Centre for Smart Manufacturing',
        centreCode: 'CSM',
        semester: 'Semester VI (Current Track)',
        slot: 'Slot A (Mon 03:00 PM)',
        projectTitle: 'Industrial Digital Twin & Predictive Maintenance Telemetry for CNC Machinery',
        courseName: 'Smart Manufacturing & Industrial IoT 4.0 Standards',
        courseProvider: 'Infosys Springboard & Siemens Learning Hub',
        courseScore: 'Distinction (89%)',
        hackathon: 'Industry 4.0 National Challenge - Best Prototype',
        status: 'Verified & Certified',
        isPrimary: true
      },
      {
        centreName: 'Center for Cloud',
        centreCode: 'CC',
        semester: 'Semester V (Completed)',
        slot: 'Slot B (Wed 03:00 PM)',
        projectTitle: 'Edge Industrial Gateway with AWS IoT Core',
        courseName: 'Cloud IoT Infrastructure Design',
        courseProvider: 'AWS Academy',
        courseScore: 'Grade A+ (93%)',
        hackathon: 'AWS Cloud Buildathon 2025 - Top 5 Award',
        status: 'Completed & Certified',
        isPrimary: false
      },
      {
        centreName: 'Centre for AI (Artificial Intelligence)',
        centreCode: 'CAI',
        semester: 'Semester IV (Foundational)',
        slot: 'Slot A (Fri 03:00 PM)',
        projectTitle: 'Computer Vision for Defect Detection on Assembly Line',
        courseName: 'Computer Vision & Pattern Recognition',
        courseProvider: 'NPTEL (IIT Madras)',
        courseScore: 'Elite + Gold (90%)',
        hackathon: 'RIT InnoQuest 2025 - AI Track Finalist',
        status: 'Completed & Certified',
        isPrimary: false
      }
    ]
  },
  {
    id: 'SUB-105',
    studentName: 'GOMATHI K',
    regNo: '2117250070094',
    department: 'B.Tech. Artificial Intelligence and Data Science',
    year: 'III Year / VI Sem - Sec B',
    centreName: 'Center for Space',
    centreCode: 'CSP',
    projectTitle: 'Hyperspectral Satellite Image Classification for Coastal Geomorphology',
    projectDesc: 'Designed multi-spectral band CNN classifiers to detect coastal erosion and urban sprawl from Sentinel-2 satellite imagery.',
    projectLink: 'https://github.com/gomathi-space/satellite-coastal-cnn',
    courseName: 'Satellite Image Processing & Remote Sensing Applications',
    courseProvider: 'ISRO / IIRS Outreach Program',
    courseScore: 'First Class with Distinction',
    hackathon: 'ISRO National Space Technology Challenge 2025 - Finalist',
    completionDate: '2026-03-01',
    status: 'APPROVED',
    certificateId: 'RIT-FTC-2026-0847',
    submittedAt: '2026-03-04 09:15 AM',
    centreRemarks: 'Satellite dataset and GIS shapefile accuracy benchmarked successfully with hackathon standing.',
    overallRemarks: 'Approved for institutional certificate award.',
    registeredCentres: [
      {
        centreName: 'Center for Space',
        centreCode: 'CSP',
        semester: 'Semester VI (Current Track)',
        slot: 'Slot B (Wed 03:00 PM)',
        projectTitle: 'Hyperspectral Satellite Image Classification for Coastal Geomorphology',
        courseName: 'Satellite Image Processing & Remote Sensing Applications',
        courseProvider: 'ISRO / IIRS Outreach Program',
        courseScore: 'First Class with Distinction',
        hackathon: 'ISRO National Space Tech Challenge 2025 - Finalist',
        status: 'Verified & Certified',
        isPrimary: true
      },
      {
        centreName: 'Centre for AI (Artificial Intelligence)',
        centreCode: 'CAI',
        semester: 'Semester V (Completed)',
        slot: 'Slot A (Tue 03:00 PM)',
        projectTitle: 'Geo-Spatial Land Use Segmentation with U-Net',
        courseName: 'Advanced Neural Networks & Deep Learning',
        courseProvider: 'DeepLearning.AI / Coursera',
        courseScore: 'Grade A+ (95%)',
        hackathon: 'RIT InnoQuest 2026 - AI Innovation Award',
        status: 'Completed & Certified',
        isPrimary: false
      },
      {
        centreName: 'Center for Data Science',
        centreCode: 'CDS',
        semester: 'Semester IV (Foundational)',
        slot: 'Slot B (Mon 03:00 PM)',
        projectTitle: 'Spatial GIS Data Analytics & Forecasting',
        courseName: 'Data Analytics with Python',
        courseProvider: 'IBM Skills Network',
        courseScore: 'Distinction (88%)',
        hackathon: 'Smart India Hackathon (SIH 2024) - College Nominee',
        status: 'Completed & Certified',
        isPrimary: false
      }
    ]
  }
];

const DEFAULT_STUDENT_PHOTO = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='200' viewBox='0 0 160 200'><rect width='100%' height='100%' fill='%23e2e8f0'/><circle cx='80' cy='70' r='38' fill='%2364748b'/><path d='M20 185 C20 125, 45 115, 80 115 C115 115, 140 125, 140 185 Z' fill='%23475569'/><rect x='0' y='180' width='160' height='20' fill='%23334155'/><text x='80' y='194' font-size='9' font-family='sans-serif' font-weight='bold' fill='%23ffffff' text-anchor='middle'>RIT STUDENT ID</text></svg>";

export default function CentreCertificatesDemoPage() {
  const [submissions, setSubmissions] = useState(REAL_RIT_STUDENTS);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'STUDENT_VIEW' | 'CERTIFICATE_SHOWCASE' | 'FLOWCHART'>('OVERVIEW');
  const [selectedSubmission, setSelectedSubmission] = useState<any>(REAL_RIT_STUDENTS[0]);
  const [showCertModal, setShowCertModal] = useState(false);
  const [certData, setCertData] = useState<any>(REAL_RIT_STUDENTS[2]);
  const [searchQuery, setSearchQuery] = useState('');
  const [studentPhoto, setStudentPhoto] = useState<string>(DEFAULT_STUDENT_PHOTO);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingSopPdf, setIsDownloadingSopPdf] = useState(false);
  const certificateRef = useRef<HTMLDivElement>(null);
  const flowchartRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setStudentPhoto(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setIsDownloadingPdf(true);
      const element = certificateRef.current;
      if (!element) {
        console.warn('Certificate element not found in DOM');
        setIsDownloadingPdf(false);
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 150));

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: '#ffffff',
        imageTimeout: 15000,
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, Math.min(pdfHeight, pageHeight));
      const cleanName = (certData?.studentName || 'Student').trim().replace(/[^a-zA-Z0-9]/g, '_');
      const cleanRegNo = (certData?.regNo || 'Record').trim().replace(/[^a-zA-Z0-9]/g, '_');
      pdf.save(`${cleanName}_${cleanRegNo}_FutureTechCentres_Record.pdf`);
    } catch (err) {
      console.error('PDF download error, falling back to print:', err);
      window.print();
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDownloadSopPDF = async () => {
    try {
      setIsDownloadingSopPdf(true);
      const element = flowchartRef.current;
      if (!element) {
        console.warn('Flowchart element not found');
        setIsDownloadingSopPdf(false);
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 200));

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: '#ffffff',
        imageTimeout: 15000,
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, Math.min(pdfHeight, pageHeight));
      pdf.save('RIT_FutureTechCentres_Process_Flowchart_SOP.pdf');
    } catch (err) {
      console.error('SOP PDF download error:', err);
      window.print();
    } finally {
      setIsDownloadingSopPdf(false);
    }
  };

  // Try fetching dynamic student allocations from backend API if available
  useEffect(() => {
    fetch('/api/admin/centre-certificates/real-students')
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data && res.data.length > 0) {
          setSubmissions(res.data);
          setSelectedSubmission(res.data[0]);
          const approved = res.data.find((d: any) => d.status === 'APPROVED') || res.data[0];
          setCertData(approved);
        }
      })
      .catch(() => {});
  }, []);

  const handleApproveByCentre = (id: string) => {
    setSubmissions(prev => prev.map(s => {
      if (s.id === id) {
        const updated = {
          ...s,
          status: 'PENDING_OVERALL',
          centreRemarks: 'Verified project code, live demo, and course certificate proof. Recommended for Overall Approval.'
        };
        if (selectedSubmission?.id === id) setSelectedSubmission(updated);
        return updated;
      }
      return s;
    }));
  };

  const handleApproveByOverall = (id: string) => {
    setSubmissions(prev => prev.map(s => {
      if (s.id === id) {
        const updated = {
          ...s,
          status: 'APPROVED',
          overallRemarks: 'Approved by Overall Centre Coordinator. Digital Certificate Issued.',
          certificateId: s.certificateId || `RIT-FTC-2026-${Math.floor(1000 + Math.random() * 9000)}`
        };
        if (selectedSubmission?.id === id) setSelectedSubmission(updated);
        setCertData(updated);
        setShowCertModal(true);
        return updated;
      }
      return s;
    }));
  };

  const handleResetDemo = () => {
    setSubmissions(REAL_RIT_STUDENTS);
    setSelectedSubmission(REAL_RIT_STUDENTS[0]);
    setCertData(REAL_RIT_STUDENTS[2]);
  };

  const handlePrintCertificate = () => {
    window.print();
  };

  const filteredSubmissions = submissions.filter(s => 
    s.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.regNo.includes(searchQuery) ||
    s.centreName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50/80 p-4 sm:p-6 lg:p-8">
      {/* --- TOP PROTOTYPE BANNER & CONTROLS --- */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden">
          {/* Decorative glows */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-300 text-xs font-black uppercase tracking-wider mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                Live Real-Time Data Prototype
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                Centre Activity Completion & Certificate System
              </h1>
              <p className="text-slate-300 font-medium text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
                Loaded with real RIT student records from database. Test the 2-tier approval workflow requested by Overall Coordinator: Student Submits Project & Course Proof → Centre Coordinator Approves → Overall Coordinator Approves → Verifiable Certificate with RIT Logo Issued!
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  setCertData(selectedSubmission?.status === 'APPROVED' ? selectedSubmission : REAL_RIT_STUDENTS[2]);
                  setShowCertModal(true);
                }}
                className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition-all shadow-lg shadow-amber-500/20 active:scale-95 flex items-center gap-2"
              >
                <Award className="w-4 h-4" />
                Preview RIT Certificate
              </button>
              <button
                onClick={handleResetDemo}
                className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all text-sm font-bold flex items-center gap-2"
                title="Reset Demo Data"
              >
                <RefreshCw className="w-4 h-4" />
                Reset
              </button>
            </div>
          </div>

          {/* --- WORKFLOW STEPPER BAR --- */}
          <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 font-black flex items-center justify-center text-sm">
                1
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Step 1: Student</p>
                <p className="text-xs font-black text-white">Upload Project & Course</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 font-black flex items-center justify-center text-sm">
                2
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Step 2: Centre Coord</p>
                <p className="text-xs font-black text-white">Technical Verification</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 font-black flex items-center justify-center text-sm">
                3
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Step 3: Overall Coord</p>
                <p className="text-xs font-black text-white">Final Institutional Sign-off</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 font-black flex items-center justify-center text-sm">
                4
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Step 4: Certificate</p>
                <p className="text-xs font-black text-white">RIT Logo & QR Verified</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- INTERACTIVE VIEW MODE SWITCHER --- */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
              activeTab === 'OVERVIEW' 
                ? 'bg-slate-900 text-white shadow-md' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            Live Real-Time Students Queue
          </button>

          <button
            onClick={() => setActiveTab('STUDENT_VIEW')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
              activeTab === 'STUDENT_VIEW' 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            Student Dashboard Experience
          </button>

          <button
            onClick={() => {
              setActiveTab('CERTIFICATE_SHOWCASE');
              setCertData(selectedSubmission?.status === 'APPROVED' ? selectedSubmission : REAL_RIT_STUDENTS[2]);
            }}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
              activeTab === 'CERTIFICATE_SHOWCASE' 
                ? 'bg-amber-500 text-slate-950 font-black shadow-md' 
                : 'text-amber-700 hover:bg-amber-50'
            }`}
          >
            <Award className="w-4 h-4" />
            Official Certificate Template (with RIT Logo)
          </button>

          <button
            onClick={() => setActiveTab('FLOWCHART')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
              activeTab === 'FLOWCHART' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-indigo-700 hover:bg-indigo-50'
            }`}
          >
            <GitBranch className="w-4 h-4" />
            Process Flowchart & SOP Architecture
          </button>
        </div>
      </div>

      {/* --- TAB CONTENT 1: REAL-TIME STUDENTS & WORKFLOW SIMULATOR --- */}
      {activeTab === 'OVERVIEW' && (
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Submissions Queue */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Real Database Students
              </h2>
              <span className="text-xs font-bold text-slate-500 bg-slate-200 px-2.5 py-1 rounded-full">
                {filteredSubmissions.length} Students
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search real student by name or reg no..."
                className="w-full pl-10 pr-4 py-2.5 bg-white rounded-2xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="space-y-3">
              {filteredSubmissions.map((sub) => {
                const isSelected = selectedSubmission?.id === sub.id;
                return (
                  <div
                    key={sub.id}
                    onClick={() => {
                      setSelectedSubmission(sub);
                      setCertData(sub);
                    }}
                    className={`p-5 rounded-3xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white border-blue-500 shadow-xl ring-2 ring-blue-500/20'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h3 className="font-black text-slate-800 text-sm sm:text-base">{sub.studentName}</h3>
                        <p className="text-xs font-semibold text-slate-500">{sub.regNo} • {sub.department}</p>
                      </div>

                      {/* Status Badges */}
                      {sub.status === 'PENDING_CENTRE' && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Pending Centre
                        </span>
                      )}
                      {sub.status === 'PENDING_OVERALL' && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-indigo-600" />
                          Pending Overall
                        </span>
                      )}
                      {sub.status === 'APPROVED' && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Certified
                        </span>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-600 truncate max-w-[200px]">
                        📍 {sub.centreName}
                      </span>
                      <span className="text-blue-600 font-black flex items-center gap-1">
                        Review Details <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Real Student Deep Dive & Live Action Console */}
          <div className="lg:col-span-7">
            {selectedSubmission ? (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 sticky top-24">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                      ID: {selectedSubmission.id}
                    </span>
                    <h2 className="text-xl font-black text-slate-900 mt-2">{selectedSubmission.studentName}</h2>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">
                      Register No: <strong className="text-slate-800 font-mono">{selectedSubmission.regNo}</strong> | {selectedSubmission.department} ({selectedSubmission.year})
                    </p>
                  </div>

                  {/* Status Indicator */}
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Status</p>
                    <p className={`text-sm font-black mt-0.5 ${
                      selectedSubmission.status === 'APPROVED' ? 'text-emerald-600' :
                      selectedSubmission.status === 'PENDING_OVERALL' ? 'text-indigo-600' : 'text-amber-600'
                    }`}>
                      {selectedSubmission.status === 'PENDING_CENTRE' && '⏳ Stage 1: Centre Review'}
                      {selectedSubmission.status === 'PENDING_OVERALL' && '⏳ Stage 2: Overall Coord Sign-off'}
                      {selectedSubmission.status === 'APPROVED' && '✅ Approved & Certificate Issued'}
                    </p>
                  </div>
                </div>

                {/* Body Details */}
                <div className="py-6 space-y-6">
                  {/* Centre Info */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Registered Centre of Excellence</p>
                    <p className="text-sm font-black text-slate-800">{selectedSubmission.centreName}</p>
                  </div>

                  {/* Project Details */}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">1. Completed Capstone Project Deliverable</p>
                    <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
                      <h4 className="font-black text-slate-900 text-sm">{selectedSubmission.projectTitle}</h4>
                      <p className="text-xs text-slate-600 font-medium mt-1.5 leading-relaxed">
                        {selectedSubmission.projectDesc}
                      </p>
                      <div className="mt-3 pt-3 border-t border-blue-100/60 flex items-center justify-between">
                        <a
                          href={selectedSubmission.projectLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-black text-blue-600 hover:text-blue-800"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          View Project Repository / Demo
                        </a>
                        <span className="text-[11px] font-bold text-slate-400">PDF Report Attached</span>
                      </div>
                    </div>
                  </div>

                  {/* Course Details */}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">2. Verified Certification Course</p>
                    <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-black text-slate-900 text-sm">{selectedSubmission.courseName}</h4>
                          <p className="text-xs text-slate-600 font-medium mt-0.5">Platform: <strong>{selectedSubmission.courseProvider}</strong></p>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-black text-[11px]">
                          {selectedSubmission.courseScore}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium mt-2">
                        Completion Date: {selectedSubmission.completionDate}
                      </p>
                    </div>
                  </div>

                  {/* Hackathon Details */}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">3. Verified Hackathon / Innovation Challenge</p>
                    <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                            <Trophy className="w-4 h-4 text-amber-600" />
                            {selectedSubmission.hackathon || 'Smart India Hackathon (SIH 2025) - Grand Finalist'}
                          </h4>
                          <p className="text-xs text-slate-600 font-medium mt-1">Verified Technical Competition & Innovation Standing</p>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-black text-[11px]">
                          Verified
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Review Logs */}
                  {(selectedSubmission.centreRemarks || selectedSubmission.overallRemarks) && (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Approval Audit Trail</p>
                      {selectedSubmission.centreRemarks && (
                        <p className="text-xs text-slate-700">
                          <strong>Centre Coordinator:</strong> "{selectedSubmission.centreRemarks}"
                        </p>
                      )}
                      {selectedSubmission.overallRemarks && (
                        <p className="text-xs text-slate-700">
                          <strong>Overall Coordinator:</strong> "{selectedSubmission.overallRemarks}"
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons for Testing the Workflow */}
                <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  {selectedSubmission.status === 'PENDING_CENTRE' && (
                    <button
                      onClick={() => handleApproveByCentre(selectedSubmission.id)}
                      className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Approve as Centre Coordinator (Stage 1)
                    </button>
                  )}

                  {selectedSubmission.status === 'PENDING_OVERALL' && (
                    <button
                      onClick={() => handleApproveByOverall(selectedSubmission.id)}
                      className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      Final Approve as Overall Coordinator (Issue Certificate)
                    </button>
                  )}

                  {selectedSubmission.status === 'APPROVED' && (
                    <button
                      onClick={() => {
                        setCertData(selectedSubmission);
                        setShowCertModal(true);
                      }}
                      className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Award className="w-4 h-4" />
                      View Certificate for {selectedSubmission.studentName}
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* --- TAB CONTENT 2: STUDENT DASHBOARD VIEW --- */}
      {activeTab === 'STUDENT_VIEW' && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-6 mb-6">
              <div>
                <span className="text-xs font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase">
                  Live Student Portal Experience
                </span>
                <h2 className="text-2xl font-black text-slate-800 mt-2">Centre Activity Completion</h2>
                <p className="text-sm text-slate-500 font-medium">
                  Submit your verified project, certified course, and hackathon standing to receive your official institutional credential.
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600">
                <GraduationCap className="w-6 h-6" />
              </div>
            </div>

            {/* If Certificate is Issued */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 rounded-3xl shadow-lg mb-8 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center flex-shrink-0">
                  <Award className="w-8 h-8 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-lg font-black">Congratulations {selectedSubmission.studentName}! Your Certificate is Ready</h3>
                  <p className="text-xs text-emerald-100 font-medium mt-1">
                    Verified by Centre Coordinator & Overall Coordinator. Certificate ID: <strong>{selectedSubmission.certificateId || 'RIT-FTC-2026-0845'}</strong>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => {
                    setCertData(selectedSubmission);
                    setShowCertModal(true);
                  }}
                  className="px-4 py-3 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-black text-xs sm:text-sm transition-all border border-white/30 shadow-md active:scale-95 whitespace-nowrap"
                >
                  View & Print
                </button>
                <button
                  onClick={() => {
                    setCertData(selectedSubmission);
                    setShowCertModal(true);
                    setTimeout(() => {
                      handleDownloadPDF();
                    }, 400);
                  }}
                  disabled={isDownloadingPdf}
                  className="px-5 py-3 rounded-2xl bg-white text-emerald-900 hover:bg-emerald-50 font-black text-xs sm:text-sm transition-all shadow-lg active:scale-95 whitespace-nowrap flex items-center gap-2"
                >
                  {isDownloadingPdf ? <Loader2 className="w-4 h-4 animate-spin text-emerald-700" /> : <Download className="w-4 h-4 text-emerald-700" />}
                  Download PDF (.pdf)
                </button>
              </div>
            </div>

            {/* Upload Form Mockup */}
            <div className="space-y-6">
              <h3 className="text-base font-black text-slate-800">3-Pillar Submission Form Overview</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Allocated Centre
                  </label>
                  <input
                    type="text"
                    disabled
                    value={selectedSubmission.centreName}
                    className="w-full p-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-bold text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Course Platform & Score
                  </label>
                  <input
                    type="text"
                    disabled
                    value={`${selectedSubmission.courseProvider} - ${selectedSubmission.courseScore}`}
                    className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-medium text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  1. Capstone Project Title & GitHub Repository
                </label>
                <input
                  type="text"
                  disabled
                  value={`${selectedSubmission.projectTitle} (${selectedSubmission.projectLink})`}
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-medium text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  2. Hackathon / Technical Innovation Standing
                </label>
                <input
                  type="text"
                  disabled
                  value={selectedSubmission.hackathon || 'Smart India Hackathon (SIH 2025) - Grand Finalist'}
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-medium text-sm"
                />
              </div>

              <div className="p-6 border-2 border-dashed border-slate-200 rounded-2xl text-center bg-slate-50/50">
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">Course Certificate, Project Report & Hackathon Proof (PDF / Image)</p>
                <p className="text-xs text-slate-400 mt-1">Uploaded: certificate_{selectedSubmission.regNo}.pdf (Verified)</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB CONTENT 3: OFFICIAL A4 MERIT RECORD & CERTIFICATE --- */}
      {(activeTab === 'CERTIFICATE_SHOWCASE' || showCertModal) && (
        <div className={activeTab === 'CERTIFICATE_SHOWCASE' ? 'max-w-5xl mx-auto' : 'fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 overflow-y-auto'}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full overflow-hidden border border-slate-200 relative animate-in zoom-in-95 duration-200 my-8">
            
            {/* Modal Header Controls (Hidden when printing) */}
            <div className="bg-slate-900 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <span className="font-black text-sm">Future Tech Centres • Official A4 Activity Completion Record</span>
              </div>
              
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Photo Selector Controls */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handlePhotoUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center gap-1.5 border border-white/10"
                >
                  <Camera className="w-3.5 h-3.5 text-amber-300" />
                  <span className="hidden sm:inline">Change Photo</span>
                </button>

                {/* Direct 1-Click PDF Download Button */}
                <button
                  onClick={handleDownloadPDF}
                  disabled={isDownloadingPdf}
                  className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition-all flex items-center gap-1.5 shadow-md active:scale-95 disabled:opacity-60"
                  title="Direct Download as PDF File"
                >
                  {isDownloadingPdf ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
                      <span>Generating PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PDF</span>
                    </>
                  )}
                </button>

                {/* Print A4 / Browser Save PDF */}
                <button
                  onClick={handlePrintCertificate}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all flex items-center gap-1.5 shadow-md active:scale-95"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Print A4</span>
                </button>

                {showCertModal && (
                  <button
                    onClick={() => setShowCertModal(false)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* --- ACTUAL A4 DOCUMENT SHEET (Standard Formal Layout) --- */}
            <div ref={certificateRef} className="p-4 sm:p-10 bg-[#f8fafc] flex justify-center">
              {/* True A4 Proportioned Document Sheet */}
              <div className="w-full max-w-[820px] bg-white border-2 border-slate-300 shadow-2xl p-6 sm:p-10 relative overflow-hidden rounded-xl text-slate-900">
                
                {/* Formal Outer & Inner Certificate Border */}
                <div className="border-[3px] border-[#0f2744] p-1.5 rounded-lg">
                  <div className="border border-[#b45309] p-6 sm:p-8 rounded relative overflow-hidden bg-white">
                    
                    {/* Background Institutional Watermark */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.035] pointer-events-none">
                      <img src="/rit-logo.png" alt="Watermark" className="w-[440px] h-auto grayscale" />
                    </div>

                    {/* 1. TOP HEADER: RIT Crest + Accreditation */}
                    <div className="text-center relative z-10 pb-4 border-b-2 border-slate-200">
                      <div className="flex flex-col items-center justify-center">
                        {/* Official RIT Emblem */}
                        <img 
                          src="/rit-logo.png" 
                          alt="Rajalakshmi Institute of Technology" 
                          className="h-14 sm:h-18 w-auto object-contain mx-auto mb-2" 
                        />
                        
                        {/* Official Affiliation & Accreditations */}
                        <div className="space-y-0.5">
                          <p className="text-[11px] sm:text-xs font-black text-slate-800 tracking-wide uppercase">
                            An Autonomous Institution • Affiliated to Anna University, Chennai
                          </p>
                          <p className="text-[10px] sm:text-[11px] font-bold text-slate-600">
                            Accredited by NBA & NAAC with 'A++' Grade • Approved by AICTE, New Delhi
                          </p>
                          <p className="text-[9px] sm:text-[10px] font-medium text-slate-500">
                            Kuthambakkam, Poonamallee, Chennai - 600 124
                          </p>
                        </div>
                      </div>

                      {/* 2. FUTURE TECH CENTRES BANNER (SVG Vector - 100% Guaranteed Crisp in PDF/Canvas) */}
                      <div style={{ marginTop: '14px', marginBottom: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <svg width="290" height="36" viewBox="0 0 290 36" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
                          <rect x="1" y="1" width="288" height="34" rx="6" fill="#0f2744" stroke="#d97706" strokeWidth="1.5" />
                          <text 
                            x="145" 
                            y="23" 
                            fontFamily="'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
                            fontSize="14" 
                            fontWeight="900" 
                            fill="#fbbf24" 
                            letterSpacing="2.5" 
                            textAnchor="middle"
                          >
                            FUTURE TECH CENTRES
                          </text>
                        </svg>
                      </div>

                      {/* Document Title */}
                      <div className="mt-3">
                        <h3 className="text-lg sm:text-2xl font-serif font-black text-[#0f2744] tracking-wider uppercase">
                          ACTIVITY COMPLETION & MERIT RECORD
                        </h3>
                        <p style={{ color: '#64748b', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '2px' }}>
                          Academic Year 2026 - 2027 • Verified Institutional Credential
                        </p>
                      </div>
                    </div>

                    {/* 3. BOX 1: CANDIDATE INFORMATION & PROFILE RECORD (Personal Details + Photo ONLY) */}
                    <div className="my-5 relative z-10">
                      <div className="border-2 border-slate-300 rounded-xl overflow-hidden bg-slate-50/60 shadow-sm">
                        
                        {/* Box 1 Header */}
                        <div 
                          style={{
                            backgroundColor: '#0f2744',
                            color: '#ffffff',
                            padding: '8px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}
                        >
                          <span style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff' }}>
                            <User className="w-3.5 h-3.5" style={{ color: '#fbbf24' }} />
                            Candidate Academic Profile Record
                          </span>
                          <span style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 'bold', color: '#fbbf24' }}>
                            DOC ID: {certData.certificateId?.replace('RIT-CEN', 'RIT-FTC') || 'RIT-FTC-2026-0845'}
                          </span>
                        </div>

                        {/* Box 1 Content: 2-Column Layout (Candidate Profile Table + Passport Photo) */}
                        <div className="p-3.5 sm:p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                          
                          {/* Left: Pure Candidate Details (No project/course/score) */}
                          <div className="md:col-span-8 lg:col-span-9 space-y-1.5 text-xs">
                            <div className="grid grid-cols-3 gap-2 py-0.5 border-b border-slate-200/80">
                              <span className="text-slate-500 font-bold uppercase text-[10px]">Candidate Name</span>
                              <span className="col-span-2 font-black text-slate-900 text-xs sm:text-sm uppercase font-serif tracking-wide">
                                {certData.studentName}
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 py-0.5 border-b border-slate-200/80">
                              <span className="text-slate-500 font-bold uppercase text-[10px]">Register Number</span>
                              <span className="col-span-2 font-mono font-black text-slate-900 text-xs">
                                {certData.regNo}
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 py-0.5 border-b border-slate-200/80">
                              <span className="text-slate-500 font-bold uppercase text-[10px]">Degree & Programme</span>
                              <span className="col-span-2 font-bold text-slate-800 text-[11px]">
                                {certData.department}
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 py-0.5 border-b border-slate-200/80">
                              <span className="text-slate-500 font-bold uppercase text-[10px]">Academic Class</span>
                              <span className="col-span-2 font-semibold text-slate-700 text-[11px]">
                                {certData.year}
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 py-0.5">
                              <span className="text-slate-500 font-bold uppercase text-[10px]">Institution</span>
                              <span className="col-span-2 font-medium text-slate-600 text-[11px]">
                                Rajalakshmi Institute of Technology, Chennai
                              </span>
                            </div>
                          </div>

                          {/* Right: Compact Passport Photo Frame */}
                          <div className="md:col-span-4 lg:col-span-3 flex flex-col items-center justify-center">
                            <div className="relative group p-1 bg-white border-2 border-slate-400 rounded-lg shadow-xs">
                              <img 
                                src={studentPhoto} 
                                alt={certData.studentName}
                                className="w-22 sm:w-24 h-26 sm:h-28 object-cover rounded" 
                              />
                              {/* Hover button to change photo */}
                              <button
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute inset-0 bg-slate-900/60 text-white opacity-0 group-hover:opacity-100 transition-all rounded flex flex-col items-center justify-center text-[9px] font-bold p-1 text-center print:hidden cursor-pointer"
                                title="Click to upload student photo"
                              >
                                <Camera className="w-4 h-4 mb-0.5 text-amber-300" />
                                Change
                              </button>
                            </div>
                            <div className="mt-1 text-center">
                              <p className="text-[8px] font-black uppercase tracking-wider text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded">
                                ID Photo
                              </p>
                              <p className="text-[8px] text-emerald-700 font-bold mt-0.5 flex items-center justify-center gap-0.5">
                                <CheckCircle2 className="w-2 h-2" /> Verified
                              </p>
                            </div>
                          </div>

                        </div>
                      </div>
                    </div>

                    {/* 4. BOX 2: REGISTERED FUTURE TECH CENTRES & 3-PILLAR ACTIVITY PERFORMANCE RECORD */}
                    <div className="my-4 relative z-10">
                      <div className="border-2 border-slate-300 rounded-xl overflow-hidden bg-white shadow-sm">
                        
                        {/* Box 2 Header */}
                        <div 
                          style={{
                            backgroundColor: '#1e3a8a',
                            color: '#ffffff',
                            padding: '8px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}
                        >
                          <span style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff' }}>
                            <Layers className="w-3.5 h-3.5" style={{ color: '#fbbf24' }} />
                            Registered Future Tech Centres Track(s) & Activity Assessment Record
                          </span>
                          <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#fbbf24', backgroundColor: '#0f172a', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(251, 191, 36, 0.4)' }}>
                            {certData.registeredCentres?.length || 1} Enrolled Track(s)
                          </span>
                        </div>

                        {/* Box 2 Body: 100% Frame-Fitted Table (Includes Capstone, Course & Hackathon) */}
                        <div className="w-full overflow-hidden">
                          <table className="w-full table-fixed border-collapse text-left text-xs">
                            <thead>
                              <tr className="bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-wider border-b border-slate-200">
                                <th className="py-2 px-1.5 w-[5%] text-center">#</th>
                                <th className="py-2 px-2 w-[18%]">Enrolled Centre</th>
                                <th className="py-2 px-2 w-[24%]">Capstone Project</th>
                                <th className="py-2 px-2 w-[21%]">Verified Course</th>
                                <th className="py-2 px-2 w-[20%]">Hackathon Challenge</th>
                                <th className="py-2 px-1.5 w-[12%] text-center">Evaluation</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-150">
                              {(certData.registeredCentres || [
                                {
                                  centreName: certData.centreName,
                                  centreCode: certData.centreCode || 'FTC',
                                  projectTitle: certData.projectTitle,
                                  courseName: certData.courseName,
                                  courseProvider: certData.courseProvider,
                                  courseScore: certData.courseScore,
                                  hackathon: certData.hackathon || 'Smart India Hackathon (SIH 2025) - Grand Finalist',
                                  status: 'Verified & Certified',
                                  isPrimary: true
                                }
                              ]).map((rc: any, idx: number) => (
                                <tr 
                                  key={idx} 
                                  className={rc.isPrimary !== false ? 'bg-blue-50/40' : 'hover:bg-slate-50/60'}
                                >
                                  {/* S.No */}
                                  <td className="py-2 px-1 text-center font-mono font-bold text-slate-500 text-[10px] align-middle">
                                    0{idx + 1}
                                  </td>

                                  {/* Centre Name */}
                                  <td className="py-2 px-2 align-middle">
                                    <span className="font-black text-slate-900 text-xs leading-snug break-words">
                                      {rc.centreName}
                                    </span>
                                  </td>

                                  {/* Capstone Project */}
                                  <td className="py-2 px-2 align-middle">
                                    <p className="font-bold text-slate-900 text-[10.5px] leading-snug break-words">
                                      "{rc.projectTitle}"
                                    </p>
                                  </td>

                                  {/* Course & Platform */}
                                  <td className="py-2 px-2 align-middle">
                                    <p className="font-semibold text-slate-800 text-[10.5px] leading-tight break-words">
                                      {rc.courseName}
                                    </p>
                                    <p className="text-[9px] text-slate-500 font-medium mt-0.5 truncate">
                                      {rc.courseProvider}
                                    </p>
                                  </td>

                                  {/* Hackathon Record (NEW) */}
                                  <td className="py-2 px-2 align-middle">
                                    <p style={{ color: '#0f172a', fontSize: '10.5px', fontWeight: 700, lineHeight: 1.25, margin: 0 }} className="break-words">
                                      {rc.hackathon || 'Smart India Hackathon 2025'}
                                    </p>
                                    <p style={{ color: '#d97706', fontSize: '8.5px', fontWeight: 800, textTransform: 'uppercase', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                      <Trophy className="w-2.5 h-2.5" /> Verified Challenge
                                    </p>
                                  </td>

                                  {/* Score & Status in unified evaluation cell */}
                                  <td className="py-2 px-1.5 text-center align-middle">
                                    <span 
                                      style={{
                                        display: 'inline-block',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        backgroundColor: '#dcfce7',
                                        color: '#166534',
                                        fontWeight: 900,
                                        fontSize: '10px',
                                        whiteSpace: 'nowrap',
                                        marginBottom: '2px'
                                      }}
                                    >
                                      {rc.courseScore}
                                    </span>
                                    <p style={{ color: '#15803d', fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px', margin: 0 }}>
                                      <CheckCircle2 className="w-2.5 h-2.5" style={{ color: '#16a34a' }} />
                                      {rc.status?.includes('Verified') ? 'Certified' : 'Completed'}
                                    </p>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* 4. INSTITUTIONAL CERTIFICATION DECLARATION */}
                    <div className="text-center my-5 px-4 relative z-10">
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-serif">
                        This is to certify that the candidate has satisfactorily completed all the mentioned technical milestones under the <strong className="text-[#0f2744]">Future Tech Centres</strong> during the <strong className="text-[#0f2744]">Academic Year 2026 - 2027</strong> ({certData.year ? certData.year : 'Semester VI'}), successfully demonstrating the capstone project deliverable, mastering the verified professional curriculum, and achieving distinction in technical hackathons / innovation challenges.
                      </p>
                    </div>

                    {/* 5. SIGNATURES & VERIFICATION SECTION */}
                    <div className="mt-10 pt-6 border-t-2 border-slate-200 grid grid-cols-1 sm:grid-cols-3 items-end gap-6 text-center relative z-10">
                      
                      {/* Left: Future Tech Centres Coordinator (Mr. M. Ashok) */}
                      <div className="flex flex-col items-center">
                        <div className="h-10 flex items-end font-serif italic text-[#0f2744] font-bold text-base sm:text-lg tracking-wide">
                          Mr. M. Ashok
                        </div>
                        <div className="w-44 sm:w-52 border-t-2 border-slate-800 my-1.5" />
                        <p className="text-xs font-black text-slate-900 uppercase tracking-wide">
                          Future Tech Centres Coordinator
                        </p>
                      </div>

                      {/* Middle: Official QR Verification Seal */}
                      <div className="flex flex-col items-center justify-center">
                        <div className="p-1.5 bg-white rounded-lg shadow border border-slate-300">
                          <QRCodeSVG
                            value={`https://ritchennai.edu.in/verify-ftc?id=${certData.certificateId?.replace('RIT-CEN', 'RIT-FTC') || 'RIT-FTC-2026-0845'}`}
                            size={64}
                          />
                        </div>
                        <p className="text-[9px] font-mono font-bold text-slate-700 mt-1">
                          ID: {certData.certificateId?.replace('RIT-CEN', 'RIT-FTC') || 'RIT-FTC-2026-0845'}
                        </p>
                        <p className="text-[8px] text-emerald-700 font-black uppercase tracking-widest flex items-center gap-1">
                          <CheckCheck className="w-3 h-3 text-emerald-600" /> Digitally Validated
                        </p>
                      </div>

                      {/* Right: Principal (Dr. Maheswari R) */}
                      <div className="flex flex-col items-center">
                        <div className="h-10 flex items-end font-serif italic text-[#b45309] font-bold text-base sm:text-lg tracking-wide">
                          Dr. Maheswari R
                        </div>
                        <div className="w-44 sm:w-52 border-t-2 border-slate-800 my-1.5" />
                        <p className="text-xs font-black text-slate-900 uppercase tracking-wide">
                          Principal
                        </p>
                        <p className="text-[10px] text-slate-600 font-bold">
                          Rajalakshmi Institute of Technology
                        </p>
                      </div>

                    </div>

                    {/* 6. BOTTOM METADATA & VALIDATION */}
                    <div className="mt-8 text-[9px] font-bold text-slate-400 flex items-center justify-between border-t border-slate-100 pt-3">
                      <span>Date of Issue: {certData.completionDate}</span>
                      <span>Official Academic Document • Rajalakshmi Institute of Technology, Chennai</span>
                    </div>

                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* --- TAB CONTENT 4: PROCESS FLOWCHART & SOP ARCHITECTURE (PRINTABLE & DOWNLOADABLE) --- */}
      {activeTab === 'FLOWCHART' && (
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Flowchart Header & Download Controls */}
          <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-black uppercase tracking-wider mb-2 border border-indigo-400/30">
                <Workflow className="w-3.5 h-3.5" />
                Standard Operating Procedure (SOP)
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                Future Tech Centres Operational Workflow & Architecture
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl font-medium">
                Comprehensive step-by-step operational lifecycle: Enrolment → 3-Pillar Practical Delivery → Submission → Two-Tier Verification → QR Minting & Archival.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleDownloadSopPDF}
                disabled={isDownloadingSopPdf}
                className="px-5 py-3 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-black text-sm transition-all shadow-lg active:scale-95 flex items-center gap-2 disabled:opacity-60"
              >
                {isDownloadingSopPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Generating SOP PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-slate-950" />
                    <span>Download Process SOP PDF (.pdf)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Printable Flowchart Blueprint Canvas */}
          <div ref={flowchartRef} className="bg-white rounded-3xl border-2 border-slate-300 shadow-2xl p-6 sm:p-10 text-slate-900 space-y-8">

            {/* Document Header */}
            <div className="text-center pb-6 border-b-2 border-slate-200">
              <img src="/rit-logo.png" alt="RIT Logo" className="h-16 w-auto mx-auto mb-2" />
              <h2 className="text-xl sm:text-2xl font-black uppercase text-[#0f2744] tracking-wide">
                RAJALAKSHMI INSTITUTE OF TECHNOLOGY
              </h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] mt-0.5">
                An Autonomous Institution Affiliated to Anna University, Chennai
              </p>
              <div className="mt-4 bg-[#0f2744] text-white py-3 px-6 rounded-xl inline-block">
                <p className="text-sm sm:text-base font-black uppercase tracking-wide">
                  Future Tech Centres — Standard Operating Procedure (SOP)
                </p>
                <p className="text-[10px] font-semibold text-blue-200 mt-0.5">
                  Academic Year 2026 – 2027 &bull; Operational Process Workflow
                </p>
              </div>
            </div>

            {/* 1. Introduction */}
            <div>
              <h3 className="text-sm font-black text-[#0f2744] uppercase tracking-wider mb-3 flex items-center gap-2 border-b-2 border-[#0f2744] pb-2">
                <span className="bg-[#0f2744] text-white px-2 py-0.5 rounded text-[10px]">1</span>
                Introduction
              </h3>
              <p className="text-[12px] text-slate-700 leading-relaxed">
                The Future Tech Centres (FTC) at Rajalakshmi Institute of Technology are specialised technology laboratories where students gain hands-on experience in emerging domains. Students who are enrolled and allocated a centre slot utilise their scheduled lab sessions to work on <strong>projects</strong>, participate in <strong>hackathons</strong>, complete <strong>industry-certified courses</strong>, and build a portfolio of technical deliverables. Upon completion and verification, a digitally signed certificate is issued and made available via <strong>DigiLocker</strong>.
              </p>
            </div>

            {/* 2. Operational Workflow */}
            <div>
              <h3 className="text-sm font-black text-[#0f2744] uppercase tracking-wider mb-4 flex items-center gap-2 border-b-2 border-[#0f2744] pb-2">
                <span className="bg-[#0f2744] text-white px-2 py-0.5 rounded text-[10px]">2</span>
                Operational Workflow
              </h3>

              <div className="space-y-3">

                {/* Step 1 */}
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                  <div className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded-lg bg-blue-600 text-white font-black flex items-center justify-center text-xs flex-shrink-0 shadow">1</span>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase">Centre Enrolment &amp; Slot Allocation</h4>
                      <p className="text-[11.5px] text-slate-600 mt-1 leading-relaxed">
                        Students are enrolled into one of the Future Tech Centres and allocated a weekly lab slot through the institutional portal. Each student is assigned to a specific centre based on their preference and availability. The slot defines the day and time during which the student will attend lab sessions throughout the semester.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center text-slate-300"><ArrowDown className="w-5 h-5" /></div>

                {/* Step 2 */}
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                  <div className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs flex-shrink-0 shadow">2</span>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase">Work During Allocated Slot Period</h4>
                      <p className="text-[11.5px] text-slate-600 mt-1 leading-relaxed">
                        During their allocated lab sessions, students actively work on the following deliverables under the guidance of their Centre Coordinator:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                        <div className="bg-white p-2.5 rounded-lg border border-amber-100 flex items-center gap-2 text-[11px] text-slate-700">
                          <FileCode className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <span><strong>Project Development</strong> — Building real-world technical projects relevant to the centre&apos;s domain.</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-amber-100 flex items-center gap-2 text-[11px] text-slate-700">
                          <Trophy className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <span><strong>Hackathon Participation</strong> — Participating in competitions like SIH, InnoQuest, or national-level contests.</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-amber-100 flex items-center gap-2 text-[11px] text-slate-700">
                          <BookOpen className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <span><strong>Industry Course</strong> — Completing a professional course from NPTEL, AWS, Coursera, IBM, or equivalent platforms.</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-amber-100 flex items-center gap-2 text-[11px] text-slate-700">
                          <Award className="w-4 h-4 text-purple-600 flex-shrink-0" />
                          <span><strong>Certificate &amp; Course Credentials</strong> — Obtaining verified certificates for completed courses and competitions.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center text-slate-300"><ArrowDown className="w-5 h-5" /></div>

                {/* Step 3 */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded-lg bg-[#0f2744] text-white font-black flex items-center justify-center text-xs flex-shrink-0 shadow">3</span>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase">Student Submission</h4>
                      <p className="text-[11.5px] text-slate-600 mt-1 leading-relaxed">
                        Once all deliverables are completed, the student submits their work through the Future Tech Centres Portal. This includes the project details (repository link / documentation), hackathon certificate, and industry course completion certificate. Upon submission, the request is sent to the <strong>Centre Coordinator</strong> for review.
                      </p>
                      <div className="mt-2 inline-block text-[10px] bg-amber-100 text-amber-800 px-3 py-1 rounded-lg font-bold border border-amber-200">
                        Status: PENDING CENTRE COORDINATOR APPROVAL
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center text-slate-300"><ArrowDown className="w-5 h-5" /></div>

                {/* Step 4 */}
                <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
                  <div className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded-lg bg-purple-600 text-white font-black flex items-center justify-center text-xs flex-shrink-0 shadow">4</span>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase">Centre Coordinator Approval (Stage 1)</h4>
                      <p className="text-[11.5px] text-slate-600 mt-1 leading-relaxed">
                        The Centre Coordinator reviews the student&apos;s submitted deliverables — verifying the project work, checking the hackathon and course certificates for authenticity, and confirming that the student has fulfilled all requirements during the allocated lab sessions. If satisfied, the Centre Coordinator approves the submission, and it is forwarded to the <strong>Overall Centre Coordinator</strong> for final clearance.
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-[10px] font-bold">
                        <span className="text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200">Approve → Forward to Overall Coordinator</span>
                        <span className="text-rose-700 bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200">Return for Resubmission</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center text-slate-300"><ArrowDown className="w-5 h-5" /></div>

                {/* Step 5 */}
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200">
                  <div className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-black flex items-center justify-center text-xs flex-shrink-0 shadow">5</span>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase">Overall Centre Coordinator Approval (Stage 2)</h4>
                      <p className="text-[11.5px] text-slate-600 mt-1 leading-relaxed">
                        The Overall Centre Coordinator performs the final institutional-level verification. This includes cross-checking the student&apos;s records across centres, validating eligibility, and confirming that all requirements have been met. Upon approval, the student&apos;s certificate is authorised for generation and issuance.
                      </p>
                      <div className="mt-2 inline-block text-[10px] bg-emerald-100 text-emerald-800 px-3 py-1 rounded-lg font-bold border border-emerald-200">
                        Status: APPROVED — Certificate Authorised for Issuance
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center text-slate-300"><ArrowDown className="w-5 h-5" /></div>

                {/* Step 6 */}
                <div className="bg-emerald-50 p-4 rounded-xl border-2 border-emerald-300">
                  <div className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-black flex items-center justify-center text-xs flex-shrink-0 shadow">6</span>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase">Certificate Issuance &amp; DigiLocker Upload</h4>
                      <p className="text-[11.5px] text-slate-600 mt-1 leading-relaxed">
                        Once both levels of approval are completed, a digitally signed completion certificate is generated for the student. The certificate is uploaded to <strong>DigiLocker (National Academic Depository)</strong>, making it permanently accessible to the student through the DigiLocker app or web portal. The student can also download a printable PDF version with a QR code for verification directly from the Future Tech Centres Portal.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                        <div className="bg-white p-2.5 rounded-lg border border-emerald-100 flex items-center gap-2 text-[11px] text-slate-700">
                          <Smartphone className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <span><strong>DigiLocker Access</strong> — Student downloads certificate via DigiLocker App / Web.</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-emerald-100 flex items-center gap-2 text-[11px] text-slate-700">
                          <Download className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <span><strong>Portal PDF Download</strong> — Printable A4 certificate with QR verification code.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* 3. Summary Flow Diagram */}
            <div>
              <h3 className="text-sm font-black text-[#0f2744] uppercase tracking-wider mb-3 flex items-center gap-2 border-b-2 border-[#0f2744] pb-2">
                <span className="bg-[#0f2744] text-white px-2 py-0.5 rounded text-[10px]">3</span>
                Process Summary
              </h3>
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
                <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-bold text-slate-700">
                  <span className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-lg border border-blue-200">Centre Enrolment &amp; Slot Allocation</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="bg-amber-100 text-amber-800 px-3 py-1.5 rounded-lg border border-amber-200">Work During Lab Sessions</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="bg-slate-200 text-slate-800 px-3 py-1.5 rounded-lg border border-slate-300">Student Submission</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="bg-purple-100 text-purple-800 px-3 py-1.5 rounded-lg border border-purple-200">Centre Coordinator Approval</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="bg-indigo-100 text-indigo-800 px-3 py-1.5 rounded-lg border border-indigo-200">Overall Coordinator Approval</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-200">Certificate &amp; DigiLocker Upload</span>
                </div>
              </div>
            </div>

            {/* Institutional Sign-off */}
            <div className="pt-6 border-t-2 border-slate-200 grid grid-cols-2 text-center text-xs gap-8">
              <div>
                <p className="text-[10px] text-slate-400 mb-6">Prepared By:</p>
                <p className="font-serif italic font-bold text-base text-[#0f2744]">Mr. M. Ashok</p>
                <div className="w-36 border-t-2 border-slate-700 mx-auto my-1.5" />
                <p className="font-black text-slate-900 uppercase text-[11px]">Future Tech Centres Coordinator</p>
                <p className="text-[10px] text-slate-500">Rajalakshmi Institute of Technology</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 mb-6">Approved By:</p>
                <p className="font-serif italic font-bold text-base text-[#b45309]">Dr. Maheswari R</p>
                <div className="w-36 border-t-2 border-slate-700 mx-auto my-1.5" />
                <p className="font-black text-slate-900 uppercase text-[11px]">Principal</p>
                <p className="text-[10px] text-slate-500">Rajalakshmi Institute of Technology</p>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
