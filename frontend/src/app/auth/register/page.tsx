'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import { Loader2, Zap } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ name: '', email: '', password: '', tenantName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/register', form);
      const { user, accessToken } = res.data;
      // Fetch tenant info
      const meRes = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const tenant = meRes.data.tenants?.[0];
      setAuth(user, accessToken, tenant?.tenantId, tenant?.role);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-base px-4">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(124,106,247,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(124,106,247,0.03)_1px,transparent_1px)] bg-[size:32px_32px]" />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-lg bg-brand flex items-center justify-center shadow-glow">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-text-primary">TaskFlow</span>
          </div>
          <h1 className="text-2xl font-semibold text-text-primary">Create your workspace</h1>
          <p className="text-text-secondary mt-1 text-sm">Start managing tasks with your team</p>
        </div>

        <div className="bg-bg-subtle border border-border rounded-xl p-8 shadow-modal">
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { key: 'name', label: 'Your name', type: 'text', placeholder: 'Jane Smith' },
              { key: 'tenantName', label: 'Workspace name', type: 'text', placeholder: 'Acme Corp' },
              { key: 'email', label: 'Email address', type: 'email', placeholder: 'you@company.com' },
              { key: 'password', label: 'Password', type: 'password', placeholder: '8+ characters' },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label className="label">{label}</label>
                <input
                  type={type}
                  value={form[key as keyof typeof form]}
                  onChange={update(key as keyof typeof form)}
                  className="input"
                  placeholder={placeholder}
                  required
                  minLength={key === 'password' ? 8 : 2}
                />
              </div>
            ))}

            {error && (
              <div className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={cn('btn-primary w-full h-10', loading && 'opacity-70')}
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : 'Create workspace'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-border text-center">
            <p className="text-sm text-text-secondary">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-brand hover:text-brand-light transition-colors font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
