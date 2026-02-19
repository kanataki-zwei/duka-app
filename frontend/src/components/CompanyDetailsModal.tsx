'use client';

import { useState, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { updateCompany, uploadCompanyLogo } from '@/lib/auth';
import { Company } from '@/types';
import { X, Upload, Building2, Globe, MapPin, FileText, Hash } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  company: Company;
  onClose: () => void;
  onUpdated: (company: Company) => void;
}

export default function CompanyDetailsModal({ company, onClose, onUpdated }: Props) {
  const { setCompany, company: activeCompany } = useAuthStore();
  const [form, setForm] = useState({
    name: company.name || '',
    website: company.website || '',
    address: company.address || '',
    kra_number: company.kra_number || '',
    description: company.description || '',
  });
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(company.logo_url || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateCompany(company.id, form);
      // If editing the active company, update the store
      if (activeCompany?.id === company.id) {
        setCompany(updated);
      }
      onUpdated(updated);
      toast.success('Company details saved');
      onClose();
    } catch {
      toast.error('Failed to save company details');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);

    setUploadingLogo(true);
    try {
      const updated = await uploadCompanyLogo(company.id, file);
      if (activeCompany?.id === company.id) {
        setCompany(updated);
      }
      onUpdated(updated);
      toast.success('Logo uploaded successfully');
    } catch {
      toast.error('Failed to upload logo');
      setLogoPreview(company.logo_url || null);
    } finally {
      setUploadingLogo(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Company Details</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 flex-shrink-0">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1" />
              ) : (
                <Building2 className="w-7 h-7 text-gray-400" />
              )}
            </div>
            <div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingLogo}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                <span>{uploadingLogo ? 'Uploading...' : 'Upload Logo'}</span>
              </button>
              <p className="text-xs text-gray-400 mt-1">JPEG, PNG or WebP</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleLogoChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Company Name
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
          </div>

          {/* Website */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Website
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                name="website"
                value={form.website}
                onChange={handleChange}
                placeholder="https://example.com"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Address
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="123 Street, Nairobi"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
              />
            </div>
          </div>

          {/* KRA Number */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              KRA PIN
            </label>
            <div className="relative">
              <Hash className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                name="kra_number"
                value={form.kra_number}
                onChange={handleChange}
                placeholder="A123456789B"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Description
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                placeholder="Brief description of your business"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}