import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, X, ChevronUp, ChevronDown } from 'lucide-react';

interface LevelConfig {
  id: number;
  levelNumber: number;
  subLevelCount: number;
  questionsPerSublevel: number;
  easyWeight: number;
  mediumWeight: number;
  hardWeight: number;
  isActive: boolean;
  createdAt: string;
}

const DIFFICULTY_PRESETS = [
  { label: 'Beginner (100% Easy)',           easy: 100, medium: 0,   hard: 0   },
  { label: 'Easy Mix (60E/40M)',              easy: 60,  medium: 40,  hard: 0   },
  { label: 'Intermediate (20E/80M)',          easy: 20,  medium: 80,  hard: 0   },
  { label: 'Medium-Hard Mix (60M/40H)',       easy: 0,   medium: 60,  hard: 40  },
  { label: 'Hard Mix (20M/80H)',              easy: 0,   medium: 20,  hard: 80  },
  { label: 'Expert (100% Hard)',              easy: 0,   medium: 0,   hard: 100 },
];

function difficultyBadge(easy: number, medium: number, hard: number) {
  if (easy >= 80) return { label: 'Beginner', color: '#22c55e' };
  if (easy >= 40) return { label: 'Easy',     color: '#84cc16' };
  if (medium >= 80) return { label: 'Medium', color: '#f59e0b' };
  if (medium >= 40) return { label: 'Intermediate', color: '#f97316' };
  if (hard >= 80) return { label: 'Hard',     color: '#ef4444' };
  return              { label: 'Expert',     color: '#7c3aed' };
}

const emptyForm = {
  levelNumber: 51,
  subLevelCount: 6,
  questionsPerSublevel: 20,
  easyWeight: 0,
  mediumWeight: 0,
  hardWeight: 100,
  isActive: true,
};

export default function AdminLevels() {
  const [levels, setLevels] = useState<LevelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    const r = await api.get('/admin/levels');
    setLevels(r.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    const maxLevel = levels.reduce((m, l) => Math.max(m, l.levelNumber), 0);
    setForm({ ...emptyForm, levelNumber: maxLevel + 1 });
    setEditingId(null);
    setError('');
    setShowModal(true);
  }

  function openEdit(l: LevelConfig) {
    setForm({
      levelNumber: l.levelNumber,
      subLevelCount: l.subLevelCount,
      questionsPerSublevel: l.questionsPerSublevel,
      easyWeight: l.easyWeight,
      mediumWeight: l.mediumWeight,
      hardWeight: l.hardWeight,
      isActive: l.isActive,
    });
    setEditingId(l.id);
    setError('');
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    const totalWeight = form.easyWeight + form.mediumWeight + form.hardWeight;
    if (totalWeight === 0) { setError('Difficulty weights must sum to more than 0'); setSaving(false); return; }
    try {
      const body = {
        ...form,
        levelNumber: Number(form.levelNumber),
        subLevelCount: Number(form.subLevelCount),
        questionsPerSublevel: Number(form.questionsPerSublevel),
        easyWeight: Number(form.easyWeight),
        mediumWeight: Number(form.mediumWeight),
        hardWeight: Number(form.hardWeight),
      };
      if (editingId) {
        await api.put(`/admin/levels/${editingId}`, body);
      } else {
        await api.post('/admin/levels', body);
      }
      setShowModal(false);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this level? This will remove all student progress for this level.')) return;
    await api.delete(`/admin/levels/${id}`);
    await load();
  }

  async function toggleActive(l: LevelConfig) {
    await api.put(`/admin/levels/${l.id}`, { isActive: !l.isActive });
    await load();
  }

  if (loading) return <div className="p-8 text-center" style={{ color: 'var(--warm-muted)' }}>Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-extrabold" style={{ color: 'var(--warm-text)' }}>Level Management</h2>
          <p className="text-sm" style={{ color: 'var(--warm-muted)' }}>
            {levels.filter(l => l.isActive).length} active levels &bull; {levels.length} total
          </p>
        </div>
        <button onClick={openCreate} className="warm-btn flex items-center gap-2 text-sm">
          <Plus className="h-4 w-4" /> Add Level
        </button>
      </div>

      {/* Table */}
      <div className="warm-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--warm-border)' }}>
              {['Level', 'Sub-levels', 'Qs/Sub', 'Difficulty', 'Easy%', 'Med%', 'Hard%', 'Status', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--warm-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {levels.map(l => {
              const badge = difficultyBadge(l.easyWeight, l.mediumWeight, l.hardWeight);
              return (
                <tr key={l.id} className="border-t hover:bg-amber-50/40 transition-colors"
                  style={{ borderColor: 'var(--warm-border)', opacity: l.isActive ? 1 : 0.55 }}>
                  <td className="px-4 py-3 font-bold" style={{ color: 'var(--warm-text)' }}>{l.levelNumber}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--warm-muted)' }}>{l.subLevelCount}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--warm-muted)' }}>{l.questionsPerSublevel}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                      style={{ background: badge.color + '20', color: badge.color }}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#22c55e' }}>{l.easyWeight}%</td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#f59e0b' }}>{l.mediumWeight}%</td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#ef4444' }}>{l.hardWeight}%</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(l)} title={l.isActive ? 'Deactivate' : 'Activate'}>
                      {l.isActive
                        ? <ToggleRight className="h-5 w-5" style={{ color: '#22c55e' }} />
                        : <ToggleLeft className="h-5 w-5" style={{ color: 'var(--warm-muted)' }} />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(l)} className="p-1.5 rounded-lg hover:bg-amber-100">
                        <Pencil className="h-3.5 w-3.5" style={{ color: 'var(--warm-muted)' }} />
                      </button>
                      <button onClick={() => handleDelete(l.id)} className="p-1.5 rounded-lg hover:bg-red-50">
                        <Trash2 className="h-3.5 w-3.5 text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40">
          <div className="warm-card p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base" style={{ color: 'var(--warm-text)' }}>
                {editingId ? `Edit Level ${form.levelNumber}` : 'Add New Level'}
              </h3>
              <button onClick={() => setShowModal(false)}><X className="h-5 w-5" style={{ color: 'var(--warm-muted)' }} /></button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--warm-muted)' }}>Level Number</label>
                  <input type="number" min="1" value={form.levelNumber}
                    onChange={e => setForm(f => ({ ...f, levelNumber: parseInt(e.target.value) }))}
                    className="warm-input w-full" disabled={!!editingId} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--warm-muted)' }}>Sub-levels</label>
                  <input type="number" min="1" max="12" value={form.subLevelCount}
                    onChange={e => setForm(f => ({ ...f, subLevelCount: parseInt(e.target.value) }))}
                    className="warm-input w-full" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--warm-muted)' }}>Questions per Sub-level</label>
                <input type="number" min="5" max="50" value={form.questionsPerSublevel}
                  onChange={e => setForm(f => ({ ...f, questionsPerSublevel: parseInt(e.target.value) }))}
                  className="warm-input w-full" />
              </div>

              {/* Difficulty preset */}
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--warm-muted)' }}>Difficulty Preset</label>
                <div className="grid grid-cols-2 gap-2">
                  {DIFFICULTY_PRESETS.map(p => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, easyWeight: p.easy, mediumWeight: p.medium, hardWeight: p.hard }))}
                      className="text-left px-3 py-2 rounded-xl text-xs font-medium border transition-all"
                      style={{
                        borderColor: (form.easyWeight === p.easy && form.mediumWeight === p.medium && form.hardWeight === p.hard)
                          ? 'var(--kec-blue, #1e40af)' : 'var(--warm-border)',
                        background: (form.easyWeight === p.easy && form.mediumWeight === p.medium && form.hardWeight === p.hard)
                          ? 'rgba(30,64,175,0.06)' : 'transparent',
                        color: 'var(--warm-text)',
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom weights */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: 'easyWeight' as const, label: 'Easy %', color: '#22c55e' },
                  { key: 'mediumWeight' as const, label: 'Medium %', color: '#f59e0b' },
                  { key: 'hardWeight' as const, label: 'Hard %', color: '#ef4444' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-medium mb-1" style={{ color: f.color }}>{f.label}</label>
                    <input type="number" min="0" max="100" value={form[f.key]}
                      onChange={e => setForm(prev => ({ ...prev, [f.key]: parseInt(e.target.value) || 0 }))}
                      className="warm-input w-full text-center font-bold" style={{ color: f.color }} />
                  </div>
                ))}
              </div>

              {/* Weight preview bar */}
              <div className="h-3 rounded-full overflow-hidden flex" style={{ background: 'var(--warm-border)' }}>
                {form.easyWeight > 0 && <div style={{ width: `${form.easyWeight}%`, background: '#22c55e', transition: 'width 0.2s' }} />}
                {form.mediumWeight > 0 && <div style={{ width: `${form.mediumWeight}%`, background: '#f59e0b', transition: 'width 0.2s' }} />}
                {form.hardWeight > 0 && <div style={{ width: `${form.hardWeight}%`, background: '#ef4444', transition: 'width 0.2s' }} />}
              </div>
              <p className="text-xs text-center" style={{ color: 'var(--warm-muted)' }}>
                Weights: E={form.easyWeight} + M={form.mediumWeight} + H={form.hardWeight} = {form.easyWeight + form.mediumWeight + form.hardWeight}
              </p>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
                <span className="text-sm" style={{ color: 'var(--warm-text)' }}>Active (visible to students)</span>
              </label>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 py-2 rounded-xl border text-sm"
                  style={{ borderColor: 'var(--warm-border)', color: 'var(--warm-text)' }}>
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving} className="flex-1 warm-btn text-sm">
                  {saving ? 'Saving...' : 'Save Level'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
