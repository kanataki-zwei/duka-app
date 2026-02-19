'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { getUserCompanies, createCompany } from '@/lib/auth';
import { Building2, ChevronDown, Plus, Check, Pencil } from 'lucide-react';
import { Company } from '@/types';
import { toast } from 'sonner';
import CompanyDetailsModal from '@/components/CompanyDetailsModal';

export default function CompanySwitcher({ collapsed }: { collapsed: boolean }) {
  const { company, setCompany } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getUserCompanies().then(setCompanies).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSwitch = (c: Company) => {
    setCompany(c);
    setOpen(false);
    toast.success(`Switched to ${c.name}`);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      const created = await createCompany(newName.trim());
      setCompanies((prev) => [...prev, created]);
      setCompany(created);
      setNewName('');
      setCreating(false);
      setOpen(false);
      toast.success(`Company "${created.name}" created`);
    } catch {
      toast.error('Failed to create company');
    } finally {
      setLoading(false);
    }
  };

  if (collapsed) {
    return (
      <div className="px-3 py-2">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mx-auto">
          <Building2 className="w-6 h-6 text-white" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div ref={ref} className="relative px-3 py-2">
        <button
          onClick={() => { setOpen(!open); setCreating(false); }}
          className="w-full flex items-center space-x-3 hover:bg-gray-100 rounded-lg p-2 transition-colors"
        >
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
            {company?.logo_url ? (
              <img src={company.logo_url} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Building2 className="w-4 h-4 text-white" />
            )}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-bold text-gray-900 truncate">
              {company?.name || 'No Company'}
            </p>
            <p className="text-xs text-gray-500">ERP System</p>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute left-3 right-3 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
            {/* Company list */}
            {companies.length > 0 && (
              <div className="p-1">
                {companies.map((c) => (
                  <div key={c.id} className="flex items-center group">
                    <button
                      onClick={() => handleSwitch(c)}
                      className="flex-1 flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm text-left transition-colors"
                    >
                      <span className="flex-1 truncate font-medium text-gray-800">{c.name}</span>
                      {c.id === company?.id && <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCompany(c);
                        setOpen(false);
                      }}
                      className="p-1.5 mr-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Divider */}
            {companies.length > 0 && <div className="border-t border-gray-100" />}

            {/* Create new */}
            {!creating ? (
              <button
                onClick={() => setCreating(true)}
                className="w-full flex items-center space-x-2 px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>New Company</span>
              </button>
            ) : (
              <div className="p-3 space-y-2">
                <input
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  placeholder="Company name"
                  className="w-full text-sm text-gray-900 placeholder-gray-400 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex space-x-2">
                  <button
                    onClick={handleCreate}
                    disabled={loading || !newName.trim()}
                    className="flex-1 text-xs font-medium bg-blue-600 text-white rounded-lg py-1.5 hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {loading ? 'Creating...' : 'Create'}
                  </button>
                  <button
                    onClick={() => { setCreating(false); setNewName(''); }}
                    className="flex-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg py-1.5 hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Company Details Modal */}
      {editingCompany && (
        <CompanyDetailsModal
          company={editingCompany}
          onClose={() => setEditingCompany(null)}
          onUpdated={(updated) => {
            setCompanies((prev) => prev.map((c) => c.id === updated.id ? updated : c));
            setEditingCompany(null);
          }}
        />
      )}
    </>
  );
}