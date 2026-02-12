'use client';

import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { user, company, logout } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  if (!user) {
    return null; // or loading spinner
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {company?.name || 'Dashboard'}
          </h1>
          <button
            onClick={() => {
              logout();
              router.push('/login');
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Welcome to Your Dashboard</h2>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="text-lg font-medium">{user.email}</p>
            </div>

            {company && (
              <div>
                <p className="text-sm text-gray-600">Company</p>
                <p className="text-lg font-medium">{company.name}</p>
              </div>
            )}

            <div>
              <p className="text-sm text-gray-600">User ID</p>
              <p className="text-sm font-mono text-gray-800">{user.id}</p>
            </div>

            <div className="pt-4 border-t">
              <h3 className="font-medium mb-2">Coming Soon:</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Product Management</li>
                <li>Inventory Tracking</li>
                <li>Sales Records</li>
                <li>Client Management</li>
                <li>Reports & Analytics</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}