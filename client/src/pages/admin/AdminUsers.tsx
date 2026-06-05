import React, { useEffect, useState, useCallback } from 'react';
import api from '../../lib/api';
import { Search, Shield, ShieldOff, UserCheck, UserX, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface UserItem {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  isProfileComplete: boolean;
  createdAt: string;
  profile?: { fullName: string; mobilePhone: string; priority1: string };
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
      await fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed');
    }
    setActionLoading(null);
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">User Management</h1>
        <span className="text-sm text-gray-500">{total} total users</span>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Roles</option>
          <option value="STUDENT">Students</option>
          <option value="ADMIN">Admins</option>
        </select>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900" /></div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="font-medium text-gray-500">User</TableHead>
                  <TableHead className="font-medium text-gray-500">Role</TableHead>
                  <TableHead className="font-medium text-gray-500">Status</TableHead>
                  <TableHead className="font-medium text-gray-500">Profile</TableHead>
                  <TableHead className="font-medium text-gray-500">Joined</TableHead>
                  <TableHead className="font-medium text-gray-500 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100">
                {users.map(u => (
                  <tr key={u.id} className={`border-b border-border transition-colors hover:bg-muted/50 ${!u.isActive ? 'opacity-60' : ''}`}>
                    <TableCell>
                      <div className="font-medium text-gray-900">{u.profile?.fullName || '—'}</div>
                      <div className="text-xs text-gray-400">{u.email}</div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-blue-700'
                      }`}>
                        {u.role === 'ADMIN' ? <Shield className="h-3 w-3" /> : null}
                        {u.role}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        u.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                      }`}>
                        {u.isActive ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs ${u.isProfileComplete ? 'text-green-600' : 'text-yellow-600'}`}>
                        {u.isProfileComplete ? 'Complete' : 'Incomplete'}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-500 text-xs">{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => toggleActive(u.id)}
                          disabled={actionLoading === u.id}
                          title={u.isActive ? 'Deactivate' : 'Activate'}
                          className={`p-1.5 rounded-lg transition ${
                            u.isActive
                              ? 'text-yellow-600 hover:bg-yellow-50'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                        >
                          {u.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => changeRole(u.id, u.role === 'ADMIN' ? 'STUDENT' : 'ADMIN')}
                          disabled={actionLoading === u.id}
                          title={u.role === 'ADMIN' ? 'Demote to Student' : 'Promote to Admin'}
                          className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 transition"
                        >
                          {u.role === 'ADMIN' ? <ShieldOff className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => deleteUser(u.id, u.email)}
                          disabled={actionLoading === u.id}
                          title="Delete user"
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition"
                        >
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
