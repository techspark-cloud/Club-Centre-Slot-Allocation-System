import { HOD_EMAILS, FIRST_YEAR_HOD_EMAIL, VICE_PRINCIPAL_EMAIL } from '@/config/hod-emails';
import { Mail, GraduationCap, School } from 'lucide-react';

export default function EmailConfigPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto animate-in fade-in zoom-in-95 duration-300">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
          <Mail className="w-8 h-8 text-blue-500" />
          Email Routing Configuration
        </h1>
        <p className="text-slate-500 text-lg">
          Current active email mappings for HOD reports. The system uses these exact email addresses when sending automated attendance reports via Google Apps Script.
        </p>
      </div>

      <div className="space-y-6">
        
        {/* Department HODs */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <School className="w-5 h-5 text-slate-500" />
            <h2 className="font-bold text-slate-800 text-lg">Department HODs</h2>
          </div>
          <div className="p-0">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3">Course / Department Name (Exact DB Match)</th>
                  <th className="px-6 py-3">Configured Email Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.entries(HOD_EMAILS).map(([course, email]) => (
                  <tr key={course} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-700">{course}</td>
                    <td className="px-6 py-4 text-blue-600 font-medium">
                      <a href={`mailto:${email}`} className="hover:underline">{email}</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Global/Special Emails */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-purple-500" />
              <h2 className="font-bold text-slate-800 text-lg">First Year HOD</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-500 mb-2">Used for all 1st Year student reports.</p>
              <a href={`mailto:${FIRST_YEAR_HOD_EMAIL}`} className="text-lg font-bold text-purple-600 hover:underline">
                {FIRST_YEAR_HOD_EMAIL}
              </a>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <Mail className="w-5 h-5 text-orange-500" />
              <h2 className="font-bold text-slate-800 text-lg">Vice Principal (CC)</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-500 mb-2">Automatically CC'd on all automated reports.</p>
              <a href={`mailto:${VICE_PRINCIPAL_EMAIL}`} className="text-lg font-bold text-orange-600 hover:underline">
                {VICE_PRINCIPAL_EMAIL}
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
