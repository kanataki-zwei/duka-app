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
  Truck
} from 'lucide-react';

export default function DashboardPage() {
  const { user, company } = useAuthStore();
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
      lightColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      href: '/products/list',
      isActive: true,
    },
    {
      name: 'Suppliers',
      description: 'Manage suppliers and payment terms',
      icon: Truck,
      lightColor: 'bg-green-50',
      textColor: 'text-green-600',
      href: '/suppliers/payment-terms',
      isActive: true,
    },
    {
      name: 'Inventory Tracking',
      description: 'Track stock levels and movements',
      icon: Warehouse,
      lightColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      href: '/inventory/locations',
      isActive: true,
    },
    {
      name: 'Client Management',
      description: 'Manage customer relationships',
      icon: Users,
      lightColor: 'bg-pink-50',
      textColor: 'text-pink-600',
      href: '/customers/list',
      isActive: true,
    },
    {
      name: 'Sales Records',
      description: 'Record and manage sales transactions',
      icon: ShoppingCart,
      lightColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      href: '/sales',
      isActive: true,
    },
    {
      name: 'Business Expenses',
      description: 'Manage business expenses',
      icon: Users,
      lightColor: 'bg-pink-50',
      textColor: 'text-pink-600',
      href: '/expenses',
      isActive: true,
    },
    {
      name: 'Reports & Analytics',
      description: 'Generate insights and reports',
      icon: BarChart3,
      lightColor: 'bg-indigo-50',
      textColor: 'text-indigo-600',
      href: '/analytics',
      isActive: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8 flex items-center space-x-4">
          {company?.logo_url && (
            <div className="w-14 h-14 rounded-xl overflow-hidden border border-gray-200 shadow-sm flex-shrink-0 bg-white">
              <img
                src={company.logo_url}
                alt={company.name}
                className="w-full h-full object-contain p-1"
              />
            </div>
          )}
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-1">
              Welcome back! 👋
            </h2>
            <p className="text-gray-600">
              Here's what's happening with {company?.name || 'your business'} today.
            </p>
          </div>
        </div>

        {/* Modules */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Modules</h3>
              <p className="text-gray-600 mt-1">Manage your business operations</p>
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
                      <h4 className="text-lg font-bold text-gray-900 mb-1">{module.name}</h4>
                      <p className="text-sm text-gray-600">{module.description}</p>
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

              if (module.isActive) {
                return <Link key={module.name} href={module.href}>{CardContent}</Link>;
              }
              return <div key={module.name}>{CardContent}</div>;
            })}
          </div>
        </div>

        {/* Stats Preview */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-8 text-white">
          <h3 className="text-2xl font-bold mb-2">Ready to get started?</h3>
          <p className="text-blue-100 mb-6">Your complete ERP solution is live and ready to use.</p>
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