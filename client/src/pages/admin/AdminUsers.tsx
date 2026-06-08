import React, { useEffect, useState, useCallback } from 'react';
import api from '../../lib/api';
import {
  Search, Shield, ShieldOff, UserCheck, UserX, Trash2,
  ChevronLeft, ChevronRight, Download, X, Phone, MapPin, Mail, User,
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Profile {
  fullName: string;
  mobilePhone: string;
  parentsMobilePhone: string;
  priority1: string;
  priority2: string | null;
  addressStreet: string;
  addressCity: string;
  addressDistrict: string;
  addressProvince: string;
}

interface UserItem {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  isProfileComplete: boolean;
  createdAt: string;
  profile?: Profile;
}

function InfoRow({ icon, label, value, mono }: { icon?: React.ReactNode; label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <span className="w-4 shrink-0 mt-0.5" style={{ color: 'var(--warm-muted)' }}>{icon}</span>
      <span className="text-xs w-32 shrink-0 font-medium" style={{ color: 'var(--warm-muted)' }}>{label}</span>
      <span className={`text-xs flex-1 ${mono ? 'font-mono break-all' : ''}`} style={{ color: value ? 'var(--warm-text)' : 'var(--warm-muted)' }}>
        {value || '—'}
      </span>
    </div>
  );
}

function UserDrawer({ user, onClose, onToggleActive, onChangeRole, onDelete, loading }: {
  user: UserItem;
  onClose: () => void;
  onToggleActive: (id: string) => Promise<void>;
  onChangeRole: (id: string, role: string) => Promise<void>;
  onDelete: (id: string, email: string) => Promise<void>;
  loading: boolean;
}) {
  const p = user.profile;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md h-full overflow-y-auto shadow-2xl flex flex-col"
        style={{ background: 'var(--warm-cream)', borderLeft: '1px solid var(--warm-border)' }}>

        <div className="sticky top-0 z-10 px-6 py-4 flex items-start justify-between gap-3"
          style={{ background: 'var(--warm-cream)', borderBottom: '1px solid var(--warm-border)' }}>
          <div>
            <div className="font-bold text-base" style={{ color: 'var(--warm-text)' }}>{p?.fullName || 'No name set'}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--warm-muted)' }}>{user.email}</div>
          </div>
          <button onClick={onClose} className="shrink-0 p-1.5 rounded-lg hover:bg-amber-50 transition" style={{ color: 'var(--warm-muted)' }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 px-6 py-5 space-y-6">
          <div className="flex flex-wrap gap-2">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
              user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-blue-700'
            }`}>
              {user.role === 'ADMIN' && <Shield className="h-3 w-3" />} {user.role}
            </span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
              user.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
            }`}>
              {user.isActive ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
              {user.isActive ? 'Active' : 'Inactive'}
            </span>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              user.isProfileComplete ? 'bg-emerald-50 text-emerald-700' : 'bg-yellow-50 text-yellow-700'
            }`}>
              Profile: {user.isProfileComplete ? 'Complete' : 'Incomplete'}
            </span>
          </div>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--warm-muted)' }}>Contact</h3>
            <div className="warm-card p-3">
              <InfoRow icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={user.email} />
              <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="Phone" value={p?.mobilePhone} />
              <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="Parents' Phone" value={p?.parentsMobilePhone} />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--warm-muted)' }}>Address</h3>
            <div className="warm-card p-3">
              <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} label="Street" value={p?.addressStreet} />
              <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} label="City" value={p?.addressCity} />
              <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} label="District" value={p?.addressDistrict} />
              <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} label="Province" value={p?.addressProvince} />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--warm-muted)' }}>Program Priority</h3>
            <div className="warm-card p-3">
              <InfoRow icon={<User className="h-3.5 w-3.5" />} label="1st Priority" value={p?.priority1} />
              <InfoRow icon={<User className="h-3.5 w-3.5" />} label="2nd Priority" value={p?.priority2} />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--warm-muted)' }}>Account</h3>
            <div className="warm-card p-3">
              <InfoRow label="Joined" value={new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} />
              <InfoRow label="User ID" value={user.id} mono />
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 px-6 py-4 flex flex-wrap gap-2"
          style={{ borderTop: '1px solid var(--warm-border)', background: 'var(--warm-cream)' }}>
          <button disabled={loading} onClick={() => onToggleActive(user.id)}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition ${
              user.isActive ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' : 'bg-green-50 text-green-700 hover:bg-green-100'
            }`}>
            {user.isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
            {user.isActive ? 'Deactivate' : 'Activate'}
          </button>
          <button disabled={loading} onClick={() => onChangeRole(user.id, user.role === 'ADMIN' ? 'STUDENT' : 'ADMIN')}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition">
            {user.role === 'ADMIN' ? <ShieldOff className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
            {user.role === 'ADMIN' ? 'Demote to Student' : 'Make Admin'}
          </button>
          <button disabled={loading} onClick={() => onDelete(user.id, user.email)}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition ml-auto">
            <Trash2 className="h-3.5 w-3.5" /> Delete User
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selected, setSelected] = useState<UserItem | null>(null);
  const [exporting, setExporting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '15');
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      if (statusFilter) params.set('status', statusFilter);

      const { data } = await api.get(`/admin/users?${params}`);
      setUsers(data.users);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function toggleActive(userId: string) {
    setActionLoading(userId);
    try {
      await api.patch(`/admin/users/${userId}/toggle-active`);
      await fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed');
    }
    setActionLoading(null);
  }

  async function changeRole(userId: string, newRole: string) {
    setActionLoading(userId);
    try {
      await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      await fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed');
    }
    setActionLoading(null);
  }

  async function deleteUser(userId: string, email: string) {
    if (!confirm(`Permanently delete user ${email}? This cannot be undone.`)) return;
    setActionLoading(userId);
    try {
      await api.delete(`/admin/users/${userId}`);
      setSelected(null);
      await fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed');
    }
    setActionLoading(null);
  }

  async function exportCSV() {
    setExporting(true);
    try {
      const { data } = await api.get('/admin/users/export', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Export failed'); }
    setExporting(false);
  }

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--warm-text)' }}>User Management</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--warm-muted)' }}>{total} total users</p>
        </div>
        <button onClick={exportCSV} disabled={exporting} className="warm-btn flex items-center gap-2 disabled:opacity-60">
          <Download className="h-4 w-4" />
          {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-0 sm:min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--warm-muted)' }} />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="warm-input w-full pl-9"
          />
        </div>
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }} className="warm-input">
          <option value="">All Roles</option>
          <option value="STUDENT">Students</option>
          <option value="ADMIN">Admins</option>
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="warm-input">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="warm-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--kec-blue)' }} />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-sm" style={{ color: 'var(--warm-muted)' }}>No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow style={{ background: 'var(--warm-bg)' }}>
                  <TableHead style={{ color: 'var(--warm-muted)' }}>Name / Email</TableHead>
                  <TableHead style={{ color: 'var(--warm-muted)' }}>Phone</TableHead>
                  <TableHead className="hidden md:table-cell" style={{ color: 'var(--warm-muted)' }}>Address</TableHead>
                  <TableHead className="hidden lg:table-cell" style={{ color: 'var(--warm-muted)' }}>Priority</TableHead>
                  <TableHead style={{ color: 'var(--warm-muted)' }}>Role</TableHead>
                  <TableHead style={{ color: 'var(--warm-muted)' }}>Status</TableHead>
                  <TableHead className="hidden sm:table-cell" style={{ color: 'var(--warm-muted)' }}>Joined</TableHead>
                  <TableHead className="text-right" style={{ color: 'var(--warm-muted)' }}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(u => (
                  <tr
                    key={u.id}
                    onClick={() => setSelected(u)}
                    className="border-b cursor-pointer transition-colors hover:bg-amber-50/50"
                    style={{ borderColor: 'var(--warm-border)', opacity: u.isActive ? 1 : 0.65 }}
                  >
                    <TableCell>
                      <div className="font-medium text-sm" style={{ color: 'var(--warm-text)' }}>{u.profile?.fullName || '—'}</div>
                      <div className="text-xs" style={{ color: 'var(--warm-muted)' }}>{u.email}</div>
                    </TableCell>
                    <TableCell className="text-xs" style={{ color: 'var(--warm-text)' }}>
                      <div>{u.profile?.mobilePhone || '—'}</div>
                      {u.profile?.parentsMobilePhone && (
                        <div style={{ color: 'var(--warm-muted)' }}>{u.profile.parentsMobilePhone}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs hidden md:table-cell" style={{ color: 'var(--warm-text)' }}>
                      {u.profile ? `${u.profile.addressCity}, ${u.profile.addressDistrict}` : '—'}
                    </TableCell>
                    <TableCell className="text-xs hidden lg:table-cell" style={{ color: 'var(--warm-text)' }}>
                      <div>{u.profile?.priority1 || '—'}</div>
                      {u.profile?.priority2 && <div style={{ color: 'var(--warm-muted)' }}>{u.profile.priority2}</div>}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-blue-700'
                      }`}>
                        {u.role === 'ADMIN' && <Shield className="h-3 w-3" />} {u.role}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                      }`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs hidden sm:table-cell" style={{ color: 'var(--warm-muted)' }}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => toggleActive(u.id)} disabled={actionLoading === u.id}
                          title={u.isActive ? 'Deactivate' : 'Activate'}
                          className={`p-1.5 rounded-lg transition ${u.isActive ? 'text-yellow-600 hover:bg-yellow-50' : 'text-green-600 hover:bg-green-50'}`}>
                          {u.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </button>
                        <button onClick={() => changeRole(u.id, u.role === 'ADMIN' ? 'STUDENT' : 'ADMIN')} disabled={actionLoading === u.id}
                          title={u.role === 'ADMIN' ? 'Demote to Student' : 'Promote to Admin'}
                          className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 transition">
                          {u.role === 'ADMIN' ? <ShieldOff className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                        </button>
                        <button onClick={() => deleteUser(u.id, u.email)} disabled={actionLoading === u.id}
                          title="Delete user" className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </tr>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid var(--warm-border)' }}>
            <span className="text-xs" style={{ color: 'var(--warm-muted)' }}>Page {page} of {totalPages}</span>
            <div className="flex gap-1">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded-lg hover:bg-amber-50 disabled:opacity-30 transition">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded-lg hover:bg-amber-50 disabled:opacity-30 transition">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <UserDrawer
          user={selected}
          onClose={() => setSelected(null)}
          onToggleActive={toggleActive}
          onChangeRole={changeRole}
          onDelete={deleteUser}
          loading={!!actionLoading}
        />
      )}
    </div>
  );
}
