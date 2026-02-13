'use client';

import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { 
  Package, 
  Warehouse, 
  ShoppingCart, 
  Users, 
  BarChart3,
  LogOut,
  Mail,
  Building2,
  Hash,
  Truck
} from 'lucide-react';

export default function DashboardPage() {
  const { user, company, logout } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  if (!user) {
    return null;
  }

  const upcomingModules = [
    {
      name: 'Product Management',
      description: 'Manage your product catalog and variants',
      icon: Package,
      color: 'bg-blue-500',
      lightColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      href: '/products/list',
      isActive: true,
    },
    {
      name: 'Suppliers',
      description: 'Manage suppliers and payment terms',
      icon: Truck,
      color: 'bg-green-500',
      lightColor: 'bg-green-50',
      textColor: 'text-green-600',
      href: '/suppliers/payment-terms',
      isActive: true,
    },
    {
      name: 'Inventory Tracking',
      description: 'Track stock levels and movements',
      icon: Warehouse,
      color: 'bg-purple-500',
      lightColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      href: '#',
      isActive: false,
    },
    {
      name: 'Sales Records',
      description: 'Record and manage sales transactions',
      icon: ShoppingCart,
      color: 'bg-orange-500',
      lightColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      href: '#',
      isActive: false,
    },
    {
      name: 'Client Management',
      description: 'Manage customer relationships',
      icon: Users,
      color: 'bg-pink-500',
      lightColor: 'bg-pink-50',
      textColor: 'text-pink-600',
      href: '#',
      isActive: false,
    },
    {
      name: 'Reports & Analytics',
      description: 'Generate insights and reports',
      icon: BarChart3,
      color: 'bg-indigo-500',
      lightColor: 'bg-indigo-50',
      textColor: 'text-indigo-600',
      href: '#',
      isActive: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {company?.name || 'Dashboard'}
                </h1>
                <p className="text-xs text-gray-500">ERP System</p>
              </div>
            </div>
            <button
              onClick={() => {
                logout();
                router.push('/login');
              }}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back! 👋
          </h2>
          <p className="text-gray-600">
            Here's what's happening with your business today.
          </p>
        </div>

        {/* User Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Email Card */}
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Email
                </p>
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user.email}
                </p>
              </div>
            </div>
          </div>

          {/* Company Card */}
          {company && (
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Company
                  </p>
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {company.name}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* User ID Card */}
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Hash className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  User ID
                </p>
                <p className="text-xs font-mono font-semibold text-gray-900 truncate">
                  {user.id.split('-')[0]}...
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Coming Soon Modules */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                Modules
              </h3>
              <p className="text-gray-600 mt-1">
                Manage your business operations
              </p>
            </div>
            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
              6 Modules
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingModules.map((module) => {
              const Icon = module.icon;
              const CardContent = (
                <div className={`bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 ${
                  module.isActive ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                } group`}>
                  <div className="flex items-start space-x-4">
                    <div className={`w-12 h-12 ${module.lightColor} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <Icon className={`w-6 h-6 ${module.textColor}`} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-gray-900 mb-1">
                        {module.name}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {module.description}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <span className={`text-xs font-semibold uppercase tracking-wide ${
                      module.isActive ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      {module.isActive ? 'Available' : 'Coming Soon'}
                    </span>
                  </div>
                </div>
              );

              // Wrap active modules with Link
              if (module.isActive) {
                return (
                  <Link key={module.name} href={module.href}>
                    {CardContent}
                  </Link>
                );
              }

              // Return non-active modules without Link
              return <div key={module.name}>{CardContent}</div>;
            })}
          </div>
        </div>

        {/* Stats Preview */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-8 text-white">
          <h3 className="text-2xl font-bold mb-2">
            Ready to get started?
          </h3>
          <p className="text-blue-100 mb-6">
            Your complete ERP solution is being built. Stay tuned for updates!
          </p>
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-3xl font-bold">6</p>
              <p className="text-sm text-blue-100">Modules</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-3xl font-bold">0</p>
              <p className="text-sm text-blue-100">Products</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-3xl font-bold">0</p>
              <p className="text-sm text-blue-100">Sales</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}