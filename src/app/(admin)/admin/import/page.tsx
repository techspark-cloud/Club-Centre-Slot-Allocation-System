'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function AdminDashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [stats, setStats] = useState<{ total: number; inserted: number } | null>(null);

  const supabase = createClient();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const processExcel = async () => {
    if (!file) {
      setMessage({ type: 'error', text: 'Please select an Excel file first.' });
      return;
    }

    setIsProcessing(true);
    setMessage({ type: 'info', text: 'Reading Excel file...' });

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(worksheet) as any[];

      // Normalize headers (trim spaces) and filter out completely empty rows
      const validRows = json
        .map(row => {
          const newRow: any = {};
          for (const key in row) {
            newRow[key.trim()] = typeof row[key] === 'string' ? row[key].trim() : row[key];
          }
          return newRow;
        })
        .filter(row => row['Name'] && row['Register No']);

      if (validRows.length === 0) {
        setMessage({ type: 'error', text: 'No valid student records found. Please check column headers.' });
        setIsProcessing(false);
        return;
      }

      setMessage({ type: 'info', text: `Found ${validRows.length} records. Uploading to database...` });

      // Transform headers to match DB schema
      const formattedStudents = validRows.map((row) => ({
        student_id_code: row['ID']?.toString(),
        name: row['Name'],
        register_no: row['Register No']?.toString(),
        course: row['Course'],
        semester: parseInt(row['Semester']),
        academic_year: row['Academic year']?.toString(),
        section: row['Section'],
        gender: row['Gender'],
        hosteler: row['Hosteler'],
        contact_no: row['Contact No']?.toString(),
        email: `${row['Register No']}@rit.internal`,
      }));

      // In production, we'd batch this. For now, doing it in one go (or chunking if large)
      const chunkSize = 500;
      let totalInserted = 0;

      for (let i = 0; i < formattedStudents.length; i += chunkSize) {
        const chunk = formattedStudents.slice(i, i + chunkSize);
        
        // First create auth accounts (this triggers the profile creation)
        const response = await fetch('/api/admin/seed-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ students: chunk }),
        });

        if (!response.ok) {
          throw new Error('Failed to create auth accounts.');
        }

        const authResults = await response.json();
        
        // Map auth_user_id back to students
        const studentsToInsert = chunk.map(student => {
          const authUser = authResults.data.find((a: any) => a.email === student.email);
          return {
            ...student,
            auth_user_id: authUser?.id || null,
          };
        });

        // Insert into students table
        const { error } = await supabase
          .from('students')
          .upsert(studentsToInsert, { onConflict: 'register_no' });

        if (error) throw error;
        totalInserted += chunk.length;
      }

      setStats({ total: json.length, inserted: totalInserted });
      setMessage({ type: 'success', text: `Successfully processed ${totalInserted} students!` });
    } catch (error: any) {
      console.error(error);
      setMessage({ type: 'error', text: `Error processing file: ${error.message}` });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass rounded-xl p-8">
        <h2 className="text-2xl font-bold mb-6 flex items-center">
          <Users className="mr-3 text-blue-500" />
          Import Student Master Data
        </h2>

        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 mb-6 rounded-r-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Upload the official Excel file containing student data. The system requires exact column headers:
            <br />
            <code className="font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded mt-2 inline-block shadow-sm">
              ID | Name | Register No | Course | Semester | Academic year | Section | Gender | Hosteler | Contact No
            </code>
          </p>
        </div>

        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Excel File (.xlsx, .xls)
            </label>
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 dark:text-gray-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                dark:file:bg-blue-900/30 dark:file:text-blue-400
                border border-gray-300 dark:border-gray-700 rounded-md
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={processExcel}
            disabled={!file || isProcessing}
            className="flex items-center px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-5 h-5 mr-2" />
            {isProcessing ? 'Processing...' : 'Upload & Import'}
          </button>
        </div>

        {message && (
          <div className={`mt-6 p-4 rounded-lg flex items-start ${
            message.type === 'success' ? 'bg-green-50 text-green-800' :
            message.type === 'error' ? 'bg-red-50 text-red-800' :
            'bg-blue-50 text-blue-800'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0" /> :
             message.type === 'error' ? <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" /> :
             <div className="w-5 h-5 mr-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            }
            <div>
              <p className="font-medium">{message.text}</p>
              {stats && message.type === 'success' && (
                <p className="text-sm mt-1">
                  Successfully imported {stats.inserted} out of {stats.total} records.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
