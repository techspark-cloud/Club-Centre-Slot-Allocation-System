import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center border border-gray-100 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-red-600 dark:text-red-500 mb-4">Unauthorized</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          You do not have permission to access this page. Please ensure you are logged in with the correct account.
        </p>
        <Link 
          href="/login" 
          className="inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          Return to Login
        </Link>
      </div>
    </div>
  );
}
