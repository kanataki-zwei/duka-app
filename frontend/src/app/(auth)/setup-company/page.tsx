'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authAPI } from '@/lib/auth';
import { useAuthStore } from '@/store/authStore';
import { CompanyCreateRequest } from '@/types';

export default function SetupCompanyPage() {
  const router = useRouter();
  const { setCompany } = useAuthStore();
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompanyCreateRequest>();

  const onSubmit = async (data: CompanyCreateRequest) => {
    setIsLoading(true);
    setError('');

    try {
      const company = await authAPI.createCompany(data);
      setCompany(company);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create company');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Set Up Your Company</h2>
          <p className="mt-2 text-sm text-gray-700 font-medium">
            Create your company profile to get started
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
          {error && (
            <div className="bg-red-50 border-2 border-red-300 text-red-800 px-4 py-3 rounded-md text-sm font-medium">
              {error}
            </div>
          )}

          <Input
            label="Company Name"
            type="text"
            placeholder="Enter your company name"
            error={errors.name?.message}
            {...register('name', {
              required: 'Company name is required',
              minLength: {
                value: 2,
                message: 'Company name must be at least 2 characters',
              },
            })}
          />

          <Button
            type="submit"
            className="w-full"
            isLoading={isLoading}
          >
            Create Company
          </Button>
        </form>
      </div>
    </div>
  );
}