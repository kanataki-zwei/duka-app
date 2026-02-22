'use client';

import { useAuthStore } from '@/store/authStore';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import CompanySwitcher from '@/components/CompanySwitcher';
import { teamAPI } from '@/lib/team';
import {
  Package,
  Warehouse,
  ShoppingCart,
  Users,
  BarChart3,
  Truck,
  LayoutDashboard,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Receipt,
} from 'lucide-react';

const allNavItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, adminOnly: false },
  { name: 'Products', href: '/products/list', icon: Package, adminOnly: false },
  { name: 'Suppliers', href: '/suppliers/payment-terms', icon: Truck, adminOnly: false },
  { name: 'Inventory', href: '/inventory/locations', icon: Warehouse, adminOnly: false },
  { name: 'Customers', href: '/customers/list', icon: Users, adminOnly: false },
  { name: 'Sales', href: '/sales', icon: ShoppingCart, adminOnly: false },
  { name: 'Expenses', href: '/expenses', icon: Receipt, adminOnly: false },
  { name: 'Analytics', href: '/analytics', icon: BarChart3, adminOnly: true },
];

// Routes that require admin — redirect shop_attendants away
const adminOnlyPaths = ['/analytics'];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { logout, role, setRole, isAdmin } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [roleLoaded, setRoleLoaded] = useState(false);

  // Load role on mount if not already set
  useEffect(() => {
    const loadRole = async () => {
      if (!role) {
        try {
          const me = await teamAPI.getMe();
          setRole(me.role);
        } catch (error) {
          console.error('Failed to load role:', error);
        }
      }
      setRoleLoaded(true);
    };
    loadRole();
  }, [role, setRole]);

  // Redirect shop_attendants away from admin-only pages
  useEffect(() => {
    if (!roleLoaded) return;
    if (role === 'shop_attendant') {
      const isRestricted = adminOnlyPaths.some(path => pathname.startsWith(path));
      if (isRestricted) {
        router.replace('/');
      }
    }
  }, [role, pathname, roleLoaded, router]);

  // Filter nav items based on role
  const navItems = allNavItems.filter(item => {
    if (item.adminOnly && role !== 'admin') return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">
      {/* Sidebar */}
      <aside
        className={`${
          collapsed ? 'w-16' : 'w-64'
        } bg-white border-r border-gray-200 shadow-sm flex flex-col fixed h-full z-20 transition-all duration-300`}
      >
        {/* Company Switcher */}
        <div className="border-b border-gray-200">
          <CompanySwitcher collapsed={collapsed} />
        </div>

        {/* Collapse / Expand Toggle */}
        <div className="border-b border-gray-200 flex items-center justify-end px-3 py-1.5">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                title={collapsed ? item.name : undefined}
                className={`flex items-center ${
                  collapsed ? 'justify-center' : 'space-x-3'
                } px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Role Badge + Logout */}
        <div className="p-3 border-t border-gray-200 space-y-2">
          {!collapsed && role && (
            <div className="px-3 py-1.5 rounded-lg bg-gray-50 text-center">
              <span className={`text-xs font-semibold ${
                role === 'admin' ? 'text-blue-600' : 'text-gray-500'
              }`}>
                {role === 'admin' ? '★ Admin' : 'Shop Attendant'}
              </span>
            </div>
          )}
          <button
            onClick={() => { logout(); router.push('/login'); }}
            title={collapsed ? 'Logout' : undefined}
            className={`flex items-center ${
              collapsed ? 'justify-center' : 'space-x-2'
            } w-full px-3 py-2.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors`}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className={`flex-1 ${collapsed ? 'ml-16' : 'ml-64'} transition-all duration-300`}>
        {children}
      </div>
    </div>
  );
}
