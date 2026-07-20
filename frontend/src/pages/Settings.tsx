import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useToastStore } from '../store/useToastStore';
import { User, Building, Phone, MapPin, Mail, Shield, Save, Loader2 } from 'lucide-react';

export const Settings: React.FC = () => {
  const { session, profile, updateProfile, loading, error, clearError } = useAuthStore();
  const { addToast } = useToastStore();

  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setCompanyName(profile.company_name || '');
      setPhone(profile.phone || '');
      setAddress(profile.address || '');
    }
  }, [profile]);

  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    clearError();

    const result = await updateProfile({
      full_name: fullName.trim() || null,
      company_name: companyName.trim() || null,
      phone: phone.trim() || null,
      address: address.trim() || null,
    });

    setSaving(false);

    if (result.success) {
      addToast('Profile settings updated successfully.', 'success');
    } else {
      addToast(result.error || 'Failed to save settings.', 'error');
    }
  };

  const isSupplier = profile?.role === 'supplier';
  const accentClass = isSupplier ? 'text-violet-400 focus:border-violet-500 focus:ring-violet-500/20' : 'text-indigo-400 focus:border-indigo-500 focus:ring-indigo-500/20';
  const btnColorClass = isSupplier 
    ? 'from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 focus:ring-violet-500 shadow-violet-950/30' 
    : 'from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 focus:ring-indigo-500 shadow-indigo-950/30';

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className={`p-6 rounded-2xl border bg-zinc-900/40 border-zinc-900 flex items-center justify-between gap-6`}>
        <div className="space-y-1">
          <h2 className="text-xl font-bold">Business & Profile Settings</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Update your business contact details, address, and profile settings below. These details are used for orders and shipping receipts.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-rose-900/30 bg-rose-950/15 text-rose-455 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 bg-zinc-900/25 border border-zinc-850 rounded-2xl p-6 shadow-xl">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Read Only Account Type */}
          <div className="space-y-2">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Account Type</span>
            <div className="relative flex items-center bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-3 text-zinc-400 text-sm">
              <Shield className={`h-4 w-4 mr-3 ${isSupplier ? 'text-violet-400' : 'text-indigo-400'}`} />
              <span className="capitalize font-semibold">{profile?.role || 'User Node'}</span>
            </div>
          </div>

          {/* Read Only Email */}
          <div className="space-y-2">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Business Email</span>
            <div className="relative flex items-center bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-3 text-zinc-400 text-sm overflow-hidden">
              <Mail className="h-4 w-4 mr-3 text-zinc-550" />
              <span className="truncate">{session?.user?.email}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-zinc-850">
          <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Contact Information</h3>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Full Name */}
            <div className="space-y-2">
              <label htmlFor="fullName" className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Contact Person Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className={`w-full pl-11 pr-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm placeholder-zinc-650 focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all ${accentClass}`}
                />
              </div>
            </div>

            {/* Company Name */}
            <div className="space-y-2">
              <label htmlFor="companyName" className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Company Name
              </label>
              <div className="relative">
                <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  id="companyName"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Apple Farms Inc."
                  className={`w-full pl-11 pr-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm placeholder-zinc-650 focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all ${accentClass}`}
                />
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Phone */}
            <div className="space-y-2">
              <label htmlFor="phone" className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +1 (555) 123-4567"
                  className={`w-full pl-11 pr-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm placeholder-zinc-650 focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all ${accentClass}`}
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <label htmlFor="address" className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Physical / Shipping Address
              </label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  id="address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 123 Industrial Parkway, Suite 4B"
                  className={`w-full pl-11 pr-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm placeholder-zinc-650 focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all ${accentClass}`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-4 border-t border-zinc-850">
          <button
            type="submit"
            disabled={saving || loading}
            className={`w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r text-zinc-100 font-bold text-sm transition-all duration-300 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 ${btnColorClass}`}
          >
            {saving || loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Profile settings
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
