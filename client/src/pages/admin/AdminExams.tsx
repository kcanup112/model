import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, X, Settings } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Topic { id: string; name: string; subjectId: string }
interface Subject { id: string; name: string; topics: Topic[] }
interface Distribution { id: string; topicId: string; oneMarkCount: number; twoMarkCount: number; topic: { id: string; name: string; subject: { name: string } } }
interface Exam {
  id: string; name: string; durationMinutes: number; totalMarks: number;
  negativeMarkingPercent: number; isActive: boolean; createdAt: string;
  topicDistribution: Distribution[];
  _count: { attempts: number };
}

const emptyExam = { name: '', durationMinutes: 120, totalMarks: 140, negativeMarkingPercent: 10, isActive: true };

export default function AdminExams() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Exam modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyExam);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Distribution modal
  const [showDistModal, setShowDistModal] = useState(false);
  const [distExamId, setDistExamId] = useState('');
  const [distRows, setDistRows] = useState<Array<{ topicId: string; oneMarkCount: number; twoMarkCount: number }>>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [examsRes, subjectsRes] = await Promise.all([
      api.get('/admin/exams'),
      api.get('/admin/subjects'),
    ]);
    setExams(examsRes.data);
    setSubjects(subjectsRes.data);
    setLoading(false);
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyExam);
    setError('');
    setShowModal(true);
  }

  function openEdit(e: Exam) {
    setEditingId(e.id);
    setForm({ name: e.name, durationMinutes: e.durationMinutes, totalMarks: e.totalMarks, negativeMarkingPercent: e.negativeMarkingPercent, isActive: e.isActive });
    setError('');
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const body = { ...form, durationMinutes: Number(form.durationMinutes), totalMarks: Number(form.totalMarks), negativeMarkingPercent: Number(form.negativeMarkingPercent) };
      if (editingId) {
        await api.put(`/admin/exams/${editingId}`, body);
      } else {
        await api.post('/admin/exams', body);
      }
      setShowModal(false);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save');
    }
    setSaving(false);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete exam "${name}"? All attempts will be lost.`)) return;
    await api.delete(`/admin/exams/${id}`);
    loadData();
  }

  function openDistribution(exam: Exam) {
    setDistExamId(exam.id);
    // Build rows for all topics across all subjects
    const allTopics = subjects.flatMap(s => s.topics.map(t => ({ ...t, subjectName: s.name })));
    const rows = allTopics.map(t => {
      const existing = exam.topicDistribution.find(d => d.topicId === t.id);
      return { topicId: t.id, oneMarkCount: existing?.oneMarkCount || 0, twoMarkCount: existing?.twoMarkCount || 0 };
    });
    setDistRows(rows);
    setShowDistModal(true);
  }

  async function handleSaveDistribution() {
    setSaving(true);
    try {
      await api.put(`/admin/exams/${distExamId}/distribution`, distRows);
      setShowDistModal(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed');
    }
    setSaving(false);
  }

  function updateDist(idx: number, field: 'oneMarkCount' | 'twoMarkCount', value: number) {
    setDistRows(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      // Rule: each topic can only have one weight type — auto-zero the other
      if (field === 'oneMarkCount' && value > 0) return { ...r, oneMarkCount: value, twoMarkCount: 0 };
      if (field === 'twoMarkCount' && value > 0) return { ...r, twoMarkCount: value, oneMarkCount: 0 };
      return { ...r, [field]: value };
    }));
  }

  const distTotals = distRows.reduce((acc, r) => ({
    oneM: acc.oneM + r.oneMarkCount,
    twoM: acc.twoM + r.twoMarkCount,
    marks: acc.marks + r.oneMarkCount + r.twoMarkCount * 2,
  }), { oneM: 0, twoM: 0, marks: 0 });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-900" /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Exam Management</h1>
        <button onClick={openCreate} className="flex items-center gap-1.5 bg-[#1e3a5f] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-900 transition">
          <Plus className="h-4 w-4" /> Create Exam
        </button>
      </div>

      {exams.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-100">No exams created yet</div>
      ) : (
        <div className="grid gap-4">
          {exams.map(exam => (
            <div key={exam.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start justify-between flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-bold text-gray-900 text-lg">{exam.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${exam.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {exam.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-3">
                    <span>{exam.durationMinutes} minutes</span>
                    <span>{exam.totalMarks} marks</span>
                    <span>{exam.negativeMarkingPercent}% negative marking</span>
                    <span>{exam._count.attempts} attempts</span>
                  </div>
                  {/* Distribution summary */}
                  {exam.topicDistribution.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {/* Group by subject */}
                      {Array.from(new Set(exam.topicDistribution.map(d => d.topic.subject.name))).map(subjectName => {
                        const subDists = exam.topicDistribution.filter(d => d.topic.subject.name === subjectName);
                        const oneM = subDists.reduce((s, d) => s + d.oneMarkCount, 0);
                        const twoM = subDists.reduce((s, d) => s + d.twoMarkCount, 0);
                        return (
                          <span key={subjectName} className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                            {subjectName}: {oneM}×1M + {twoM}×2M
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-xs text-yellow-600">No question distribution set</span>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-4">
                  <button onClick={() => openDistribution(exam)} title="Set distribution" className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition">
                    <Settings className="h-4.5 w-4.5" />
                  </button>
                  <button onClick={() => openEdit(exam)} title="Edit exam" className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition">
                    <Pencil className="h-4.5 w-4.5" />
                  </button>
                  <button onClick={() => handleDelete(exam.id, exam.name)} title="Delete exam" className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition">
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Exam Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Exam' : 'Create Exam'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{error}</div>}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Exam Name *</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. IOE Mock Exam - Set B" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Duration (min)</label>
                  <input type="number" value={form.durationMinutes} onChange={e => setForm({ ...form, durationMinutes: Number(e.target.value) })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Total Marks</label>
                  <input type="number" value={form.totalMarks} onChange={e => setForm({ ...form, totalMarks: Number(e.target.value) })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Negative Marking %</label>
                  <input type="number" value={form.negativeMarkingPercent} onChange={e => setForm({ ...form, negativeMarkingPercent: Number(e.target.value) })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer py-2">
                    <button type="button" onClick={() => setForm({ ...form, isActive: !form.isActive })} className="text-gray-600">
                      {form.isActive ? <ToggleRight className="h-6 w-6 text-green-600" /> : <ToggleLeft className="h-6 w-6 text-gray-400" />}
                    </button>
                    <span className="text-sm text-gray-700">{form.isActive ? 'Active' : 'Inactive'}</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-blue-900 disabled:opacity-50 transition">
                {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Distribution Modal */}
      {showDistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowDistModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg m-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Question Distribution</h2>
              <button onClick={() => setShowDistModal(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6">
              <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-medium text-gray-500">Topic</TableHead>
                    <TableHead className="font-medium text-gray-500 text-center">1-Mark Qs</TableHead>
                    <TableHead className="font-medium text-gray-500 text-center">2-Mark Qs</TableHead>
                    <TableHead className="font-medium text-gray-500 text-center">Marks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100">
                  {subjects.map(subject => {
                    const subjectTopicRows = subject.topics.map(t => {
                      const idx = distRows.findIndex(r => r.topicId === t.id);
                      return { topic: t, idx, row: idx >= 0 ? distRows[idx] : null };
                    });
                    return (
                      <React.Fragment key={subject.id}>
                        <TableRow className="hover:bg-transparent border-0"><TableCell colSpan={4} className="pt-3 pb-1 font-bold text-[#1e3a5f] text-xs uppercase tracking-wide">{subject.name}</TableCell></TableRow>
                        {subjectTopicRows.map(({ topic, idx, row }) => (
                          <TableRow key={topic.id}>
                            <TableCell className="py-1.5 pl-3 text-gray-700 text-xs">{topic.name}</TableCell>
                            <TableCell className="py-1.5">
                              <input type="number" min={0} value={row?.oneMarkCount || 0} onChange={e => idx >= 0 && updateDist(idx, 'oneMarkCount', parseInt(e.target.value) || 0)} className="w-14 mx-auto block text-center border border-gray-200 rounded px-1 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </TableCell>
                            <TableCell className="py-1.5">
                              <input type="number" min={0} value={row?.twoMarkCount || 0} onChange={e => idx >= 0 && updateDist(idx, 'twoMarkCount', parseInt(e.target.value) || 0)} className="w-14 mx-auto block text-center border border-gray-200 rounded px-1 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </TableCell>
                            <TableCell className="py-1.5 text-center text-gray-600 text-xs">{(row?.oneMarkCount || 0) + (row?.twoMarkCount || 0) * 2}</TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow className="font-bold text-gray-900">
                    <TableCell className="pt-2">Total</TableCell>
                    <TableCell className="pt-2 text-center">{distTotals.oneM}</TableCell>
                    <TableCell className="pt-2 text-center">{distTotals.twoM}</TableCell>
                    <TableCell className="pt-2 text-center">{distTotals.marks}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
              </div>
              <div className="text-xs text-gray-500 mb-1">{distTotals.oneM + distTotals.twoM} questions = {distTotals.marks} marks</div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setShowDistModal(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={handleSaveDistribution} disabled={saving} className="px-5 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-blue-900 disabled:opacity-50 transition">
                {saving ? 'Saving...' : 'Save Distribution'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
