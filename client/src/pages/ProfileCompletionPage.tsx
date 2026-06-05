import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { UserCircle, MapPin, Phone, GraduationCap } from 'lucide-react';

const PROGRAMS = [
  { value: 'COMPUTER', label: 'Computer Engineering' },
  { value: 'CIVIL', label: 'Civil Engineering' },
  { value: 'ECIC', label: 'Electronics, Communication and Information Engineering' },
];

const PROVINCES = [
  'Koshi Province', 'Madhesh Province', 'Bagmati Province',
  'Gandaki Province', 'Lumbini Province', 'Karnali Province', 'Sudurpashchim Province',
];

const DISTRICTS = [
  'Achham', 'Arghakhanchi', 'Baglung', 'Baitadi', 'Bajhang', 'Bajura', 'Banke', 'Bara',
  'Bardiya', 'Bhaktapur', 'Bhojpur', 'Chitwan', 'Dadeldhura', 'Dailekh', 'Dang', 'Darchula',
  'Dhading', 'Dhankuta', 'Dhanusa', 'Dolakha', 'Dolpa', 'Doti', 'Gorkha', 'Gulmi',
  'Humla', 'Ilam', 'Jhapa', 'Jumla', 'Kailali', 'Kalikot', 'Kanchanpur', 'Kapilvastu',
  'Kaski', 'Kathmandu', 'Kavrepalanchok', 'Khotang', 'Lalitpur', 'Lamjung', 'Mahottari',
  'Makwanpur', 'Manang', 'Morang', 'Mugu', 'Mustang', 'Myagdi', 'Nawalparasi East',
  'Nawalparasi West', 'Nuwakot', 'Okhaldhunga', 'Palpa', 'Panchthar', 'Parbat', 'Parsa',
  'Pyuthan', 'Ramechhap', 'Rasuwa', 'Rautahat', 'Rolpa', 'Rukum East', 'Rukum West',
  'Rupandehi', 'Salyan', 'Sankhuwasabha', 'Saptari', 'Sarlahi', 'Sindhuli', 'Sindhupalchok',
  'Siraha', 'Solukhumbu', 'Sunsari', 'Surkhet', 'Syangja', 'Tanahun', 'Taplejung',
  'Terhathum', 'Udayapur',
];

export default function ProfileCompletionPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    fullName: '', addressStreet: '', addressCity: '', addressDistrict: '', addressProvince: '',
    mobilePhone: '', parentsMobilePhone: '',
    priority1: '', priority2: '', priority3: '',
  });

  if (user?.isProfileComplete) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  function updateField(field: string, value: string) {
    setForm(prev => {
      const updated = { ...prev, [field]: value };
      // Clear dependent priorities when parent changes
      if (field === 'priority1') { updated.priority2 = ''; updated.priority3 = ''; }
      if (field === 'priority2') { updated.priority3 = ''; }
      return updated;
    });
  }

  function getAvailablePrograms(exclude: string[]) {
    return PROGRAMS.filter(p => !exclude.includes(p.value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Validate Nepal phone format
    const phoneRegex = /^(98|97|96)\d{8}$/;
    if (!phoneRegex.test(form.mobilePhone)) {
      setError('Invalid mobile number. Use Nepal format: 98XXXXXXXX');
      return;
    }
    if (!phoneRegex.test(form.parentsMobilePhone)) {
      setError("Invalid parent's mobile number. Use Nepal format: 98XXXXXXXX");
      return;
    }

    setLoading(true);
    try {
      await api.post('/users/profile', {
        ...form,
        priority2: form.priority2 || null,
        priority3: form.priority3 || null,
      });
      await refreshUser();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Complete Your Profile</h1>
          <p className="text-gray-500 mt-1">We need a few details before you can start the mock exam</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-8">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-100">{error}</div>
          )}

          {/* Personal Info */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <UserCircle className="h-5 w-5 text-[#1e3a5f]" />
              <h2 className="font-semibold text-gray-900">Personal Information</h2>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input
                type="text" required value={form.fullName} onChange={e => updateField('fullName', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent outline-none transition"
                placeholder="Enter your full name"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-[#1e3a5f]" />
              <h2 className="font-semibold text-gray-900">Address</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Street / Tole *</label>
                <input
                  type="text" required value={form.addressStreet} onChange={e => updateField('addressStreet', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent outline-none transition"
                  placeholder="Street or Tole name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City / Municipality *</label>
                <input
                  type="text" required value={form.addressCity} onChange={e => updateField('addressCity', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent outline-none transition"
                  placeholder="City or Municipality"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">District *</label>
                <select
                  required value={form.addressDistrict} onChange={e => updateField('addressDistrict', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent outline-none transition bg-white"
                >
                  <option value="">Select District</option>
                  {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Province *</label>
                <select
                  required value={form.addressProvince} onChange={e => updateField('addressProvince', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent outline-none transition bg-white"
                >
                  <option value="">Select Province</option>
                  {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Phone className="h-5 w-5 text-[#1e3a5f]" />
              <h2 className="font-semibold text-gray-900">Contact Numbers</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Mobile Number *</label>
                <input
                  type="tel" required value={form.mobilePhone} onChange={e => updateField('mobilePhone', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent outline-none transition"
                  placeholder="98XXXXXXXX"
                  maxLength={10}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parent's Mobile Number *</label>
                <input
                  type="tel" required value={form.parentsMobilePhone} onChange={e => updateField('parentsMobilePhone', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent outline-none transition"
                  placeholder="98XXXXXXXX"
                  maxLength={10}
                />
              </div>
            </div>
          </div>

          {/* Program Priorities */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap className="h-5 w-5 text-[#1e3a5f]" />
              <h2 className="font-semibold text-gray-900">Engineering Program Priorities</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">Select the programs you're interested in, in order of preference.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority 1 (Required) *</label>
                <select
                  required value={form.priority1} onChange={e => updateField('priority1', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent outline-none transition bg-white"
                >
                  <option value="">Select your first choice</option>
                  {PROGRAMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority 2 (Optional)</label>
                <select
                  value={form.priority2} onChange={e => updateField('priority2', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent outline-none transition bg-white"
                  disabled={!form.priority1}
                >
                  <option value="">Select your second choice</option>
                  {getAvailablePrograms([form.priority1]).map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority 3 (Optional)</label>
                <select
                  value={form.priority3} onChange={e => updateField('priority3', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent outline-none transition bg-white"
                  disabled={!form.priority2}
                >
                  <option value="">Select your third choice</option>
                  {getAvailablePrograms([form.priority1, form.priority2].filter(Boolean)).map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full bg-[#1e3a5f] hover:bg-blue-900 text-white py-4 rounded-xl font-semibold text-lg transition disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Complete Profile & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
