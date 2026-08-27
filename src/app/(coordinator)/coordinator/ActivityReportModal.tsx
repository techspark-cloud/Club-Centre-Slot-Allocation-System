import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface ActivityReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  slot: any;
  entityName: string;
  coordinatorName: string;
  date: string;
  expected: number;
  present: number;
  gasUrl: string;
}

export default function ActivityReportModal({ isOpen, onClose, slot, entityName, coordinatorName, date, expected, present, gasUrl }: ActivityReportModalProps) {
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const getBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:image/jpeg;base64, part
        resolve(result.split(',')[1]);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Please provide a description of the activity.');
      return;
    }
    
    setIsSubmitting(true);
    setError('');

    try {
      let imageBase64 = '';
      let imageMimeType = '';
      
      if (file) {
        imageBase64 = await getBase64(file);
        imageMimeType = file.type;
      }

      const payload = {
        slotId: slot.id,
        date: date,
        session: slot.session,
        venue: slot.venue,
        entityName: entityName,
        entityType: slot.club_id ? 'CLUB' : 'CENTRE',
        coordinatorName: coordinatorName,
        expected: expected,
        present: present,
        description: description,
        imageBase64: imageBase64,
        imageMimeType: imageMimeType
      };

      // Send to local Next.js proxy to bypass CORS
      const res = await fetch('/api/coordinator/activity-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const result = await res.json();
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || 'Failed to submit report.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Submit Activity Report
            </h2>
            <p className="text-xs font-bold text-slate-500 mt-1">For {entityName} on {date}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 text-slate-500 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-800 mb-2">Report Submitted!</h3>
            <p className="text-sm text-slate-500 font-medium mb-6">
              Your activity report has been successfully securely saved to the audit log.
            </p>
            <button
              onClick={() => {
                onClose();
                setSuccess(false);
                setDescription('');
                setFile(null);
              }}
              className="px-6 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-sm font-bold rounded-xl flex items-start gap-2 border border-red-100">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="break-all">{error}</p>
              </div>
            )}
            
            <div className="flex gap-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
              <div className="flex-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Expected Students</p>
                <p className="text-lg font-black text-slate-700">{expected}</p>
              </div>
              <div className="w-px bg-blue-100"></div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Present Students</p>
                <p className="text-lg font-black text-green-600">{present}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                Activity Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What activities were conducted today? E.g., 'Discussed upcoming event plans and assigned roles...'"
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:border-blue-500 transition-colors resize-none h-28"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                Photo Evidence (Optional)
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="evidence-upload"
                />
                <label 
                  htmlFor="evidence-upload"
                  className="flex flex-col items-center justify-center w-full h-24 px-4 py-2 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-100 hover:border-blue-400 transition-colors"
                >
                  {file ? (
                    <div className="text-center">
                      <CheckCircle2 className="w-6 h-6 text-green-500 mx-auto mb-1" />
                      <span className="text-xs font-bold text-slate-600">{file.name}</span>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                      <span className="text-xs font-bold text-slate-500">Click to upload photo</span>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold text-sm py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting Report...
                </>
              ) : (
                'Submit Report'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
