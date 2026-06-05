import React, { useEffect, useState, useCallback } from 'react';
import api from '../../lib/api';
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, X, BookOpen, Upload } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Subject { id: string; name: string; topics: Topic[]; _count: { questions: number; passages: number } }
interface Topic { id: string; name: string; subjectId: string }
interface Passage { id: string; text: string; subjectId: string; subject: { name: string }; _count: { questions: number }; questions?: Question[] }
interface Question {
  id: string; subjectId: string; topicId: string; passageId: string | null; text: string;
  optionA: string; optionB: string; optionC: string; optionD: string;
  correctOption: string; weightage: number; difficulty: string;
  subject: { name: string }; topic?: { id: string; name: string } | null; passage?: { id: string; text: string } | null;
}

const emptyQ = { subjectId: '', topicId: '', passageId: '', text: '', optionA: '', optionB: '', optionC: '', optionD: '', correctOption: 'A', weightage: 1, difficulty: 'MEDIUM' };

export default function AdminQuestions() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [passages, setPassages] = useState<Passage[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [subjectFilter, setSubjectFilter] = useState('');
  const [weightageFilter, setWeightageFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyQ);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Passage modal
  const [showPassageModal, setShowPassageModal] = useState(false);
  const [passageForm, setPassageForm] = useState({ subjectId: '', text: '' });
  const [editingPassageId, setEditingPassageId] = useState<string | null>(null);

  // Import modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importCreateExam, setImportCreateExam] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ message: string; inserted: number; skipped: number; errors: string[]; exam?: { id: string; name: string } | null } | null>(null);

  useEffect(() => {
    api.get('/admin/subjects').then(r => setSubjects(r.data));
    api.get('/admin/passages').then(r => setPassages(r.data));
  }, []);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '15');
    if (subjectFilter) params.set('subjectId', subjectFilter);
    if (weightageFilter) params.set('weightage', weightageFilter);
    const { data } = await api.get(`/admin/questions?${params}`);
    setQuestions(data.questions);
    setTotal(data.total);
    setTotalPages(data.totalPages);
    setLoading(false);
  }, [page, subjectFilter, weightageFilter]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyQ);
    setError('');
    setShowModal(true);
  }

  function openEdit(q: Question) {
    setEditingId(q.id);
    setForm({
      subjectId: q.subjectId, topicId: q.topicId || '', passageId: q.passageId || '', text: q.text,
      optionA: q.optionA, optionB: q.optionB, optionC: q.optionC, optionD: q.optionD,
      correctOption: q.correctOption, weightage: q.weightage, difficulty: q.difficulty,
    });
    setError('');
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const body = { ...form, passageId: form.passageId || null, weightage: Number(form.weightage) };
      if (editingId) {
        await api.put(`/admin/questions/${editingId}`, body);
      } else {
        await api.post('/admin/questions', body);
      }
      setShowModal(false);
      fetchQuestions();
      api.get('/admin/subjects').then(r => setSubjects(r.data));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save');
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this question?')) return;
    await api.delete(`/admin/questions/${id}`);
    fetchQuestions();
    api.get('/admin/subjects').then(r => setSubjects(r.data));
  }

  // Passage CRUD
  async function handleSavePassage() {
    setSaving(true);
    try {
      if (editingPassageId) {
        await api.put(`/admin/passages/${editingPassageId}`, passageForm);
      } else {
        await api.post('/admin/passages', passageForm);
      }
      setShowPassageModal(false);
      const { data } = await api.get('/admin/passages');
      setPassages(data);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed');
    }
    setSaving(false);
  }

  async function handleDeletePassage(id: string) {
    if (!confirm('Delete passage and unlink its questions?')) return;
    await api.delete(`/admin/passages/${id}`);
    const { data } = await api.get('/admin/passages');
    setPassages(data);
  }

  // JSON Import
  async function handleImport() {
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);
    try {
      const text = await importFile.text();
      const json = JSON.parse(text);
      const payload = {
        examTitle: json.examTitle || importFile.name.replace('.json', ''),
        questions: json.questions,
        createExam: importCreateExam,
      };
      const { data } = await api.post('/admin/import', payload);
      setImportResult(data);
      fetchQuestions();
      api.get('/admin/subjects').then(r => setSubjects(r.data));
      api.get('/admin/passages').then(r => setPassages(r.data));
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Import failed. Check JSON format.';
      setImportResult({ message: msg, inserted: 0, skipped: 0, errors: [msg] });
    }
    setImporting(false);
  }

  const filteredPassages = form.subjectId ? passages.filter(p => p.subjectId === form.subjectId) : [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Question Bank</h1>
        <div className="flex gap-2">
          <button onClick={() => { setImportFile(null); setImportResult(null); setImportCreateExam(true); setShowImportModal(true); }} className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-emerald-700 transition">
            <Upload className="h-4 w-4" /> <span className="hidden sm:inline">Import</span> JSON
          </button>
          <button onClick={() => { setEditingPassageId(null); setPassageForm({ subjectId: '', text: '' }); setShowPassageModal(true); }} className="flex items-center gap-1.5 bg-gray-700 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-800 transition">
            <BookOpen className="h-4 w-4" /> <span className="hidden sm:inline">Add</span> Passage
          </button>
          <button onClick={openCreate} className="flex items-center gap-1.5 bg-[#1e3a5f] text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-blue-900 transition">
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Add</span> Question
          </button>
        </div>
      </div>

      {/* Subject summary */}
      <div className="flex flex-wrap gap-2 mb-4">
        {subjects.map(s => (
          <button
            key={s.id}
            onClick={() => { setSubjectFilter(subjectFilter === s.id ? '' : s.id); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
              subjectFilter === s.id ? 'bg-[#1e3a5f] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {s.name} ({s._count.questions})
          </button>
        ))}
        <select
          value={weightageFilter}
          onChange={e => { setWeightageFilter(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-full px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Marks</option>
          <option value="1">1 Mark</option>
          <option value="2">2 Marks</option>
        </select>
      </div>

      {/* Passages list (collapsible) */}
      {passages.length > 0 && (
        <details className="mb-4 bg-white rounded-xl border border-gray-100 shadow-sm">
          <summary className="px-5 py-3 cursor-pointer text-sm font-medium text-gray-700">Passages ({passages.length})</summary>
          <div className="px-5 pb-4 space-y-3">
            {passages.map(p => (
              <div key={p.id} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-blue-600">{p.subject.name}</span>
                    <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">{p.text}</p>
                    <span className="text-xs text-gray-400">{p._count.questions} questions linked</span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => { setEditingPassageId(p.id); setPassageForm({ subjectId: p.subjectId, text: p.text }); setShowPassageModal(true); }} className="p-1 text-gray-400 hover:text-blue-600"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => handleDeletePassage(p.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                {p.questions && p.questions.length > 0 && (
                  <div className="mt-2 space-y-1.5 border-t border-gray-200 pt-2">
                    {p.questions.map((q: Question) => (
                      <div key={q.id} className="flex items-center justify-between gap-2 bg-white rounded-md px-3 py-2 text-xs">
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-800 line-clamp-1">{q.text}</p>
                          <div className="flex gap-3 mt-0.5 text-gray-400">
                            <span>Ans: <span className="font-bold text-green-600">{q.correctOption}</span></span>
                            <span className={q.weightage === 2 ? 'text-orange-600 font-medium' : ''}>{q.weightage}M</span>
                            <span>{q.topic?.name || '—'}</span>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => openEdit(q)} className="p-1 text-gray-400 hover:text-blue-600" title="Edit question"><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={() => handleDelete(q.id)} className="p-1 text-gray-400 hover:text-red-500" title="Delete question"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Questions table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900" /></div>
        ) : questions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No questions found. Click "Add Question" to create one.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="font-medium text-gray-500 w-[40%]">Question</TableHead>
                  <TableHead className="font-medium text-gray-500">Subject</TableHead>
                  <TableHead className="font-medium text-gray-500">Topic</TableHead>
                  <TableHead className="font-medium text-gray-500">Marks</TableHead>
                  <TableHead className="font-medium text-gray-500">Answer</TableHead>
                  <TableHead className="font-medium text-gray-500">Difficulty</TableHead>
                  <TableHead className="font-medium text-gray-500 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100">
                {questions.map(q => (
                  <TableRow key={q.id}>
                    <TableCell>
                      <p className="text-gray-900 line-clamp-2">{q.text}</p>
                      {q.passage && <span className="text-xs text-blue-500 mt-0.5 inline-block">Has passage</span>}
                    </TableCell>
                    <TableCell className="text-gray-600">{q.subject.name}</TableCell>
                    <TableCell className="text-gray-500 text-xs">{q.topic?.name || '—'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${q.weightage === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                        {q.weightage}M
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-bold">{q.correctOption}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium ${q.difficulty === 'HARD' ? 'text-red-600' : q.difficulty === 'EASY' ? 'text-green-600' : 'text-yellow-600'}`}>{q.difficulty}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(q)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(q.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">Showing {questions.length} of {total}</span>
            <div className="flex gap-1">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
              <span className="px-2 py-1 text-xs text-gray-600">{page}/{totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Question Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Question' : 'Add Question'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{error}</div>}

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Subject *</label>
                  <select value={form.subjectId} onChange={e => setForm({ ...form, subjectId: e.target.value, topicId: '', passageId: '' })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select subject</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Topic *</label>
                  <select value={form.topicId} onChange={e => setForm({ ...form, topicId: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select topic</option>
                    {(subjects.find(s => s.id === form.subjectId)?.topics || []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Passage (optional)</label>
                  <select value={form.passageId} onChange={e => setForm({ ...form, passageId: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">No passage (standalone)</option>
                    {filteredPassages.map(p => <option key={p.id} value={p.id}>{p.text.substring(0, 60)}...</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Question Text *</label>
                <textarea rows={3} value={form.text} onChange={e => setForm({ ...form, text: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter question text..." />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {(['A', 'B', 'C', 'D'] as const).map(opt => (
                  <div key={opt}>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Option {opt} *</label>
                    <input type="text" value={(form as any)[`option${opt}`]} onChange={e => setForm({ ...form, [`option${opt}`]: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                ))}
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Correct Answer *</label>
                  <select value={form.correctOption} onChange={e => setForm({ ...form, correctOption: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Weightage (marks)</label>
                  <select value={form.weightage} onChange={e => setForm({ ...form, weightage: Number(e.target.value) })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value={1}>1 Mark</option><option value={2}>2 Marks</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Difficulty</label>
                  <select value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-blue-900 disabled:opacity-50 transition">
                {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Passage Modal */}
      {showPassageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowPassageModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg m-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editingPassageId ? 'Edit Passage' : 'Add Passage'}</h2>
              <button onClick={() => setShowPassageModal(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Subject *</label>
                <select value={passageForm.subjectId} onChange={e => setPassageForm({ ...passageForm, subjectId: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select subject</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Passage Text *</label>
                <textarea rows={6} value={passageForm.text} onChange={e => setPassageForm({ ...passageForm, text: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter the reading comprehension passage..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setShowPassageModal(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={handleSavePassage} disabled={saving} className="px-5 py-2 bg-gray-700 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition">
                {saving ? 'Saving...' : editingPassageId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import JSON Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowImportModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg m-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Import Questions from JSON</h2>
              <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">JSON File *</label>
                <input
                  type="file"
                  accept=".json"
                  onChange={e => { setImportFile(e.target.files?.[0] || null); setImportResult(null); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-3 file:px-3 file:py-1 file:rounded-md file:border-0 file:bg-emerald-50 file:text-emerald-700 file:text-xs file:font-medium"
                />
              </div>
              <p className="text-xs text-gray-400">JSON must have a <code className="bg-gray-100 px-1 rounded">questions</code> array. Each question needs: subject, topic, text, optionA–D, correctOption (A/B/C/D), weightage (1 or 2).</p>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={importCreateExam} onChange={e => setImportCreateExam(e.target.checked)} className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                <span className="text-sm text-gray-700">Also create an exam with auto-calculated topic distribution</span>
              </label>

              {importResult && (
                <div className={`rounded-lg p-4 text-sm ${importResult.inserted > 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
                  <p className="font-medium">{importResult.message}</p>
                  {importResult.exam && <p className="mt-1 text-xs">Exam created: {importResult.exam.name}</p>}
                  {importResult.errors.length > 0 && (
                    <ul className="mt-2 space-y-0.5 text-xs opacity-80">
                      {importResult.errors.slice(0, 10).map((e, i) => <li key={i}>• {e}</li>)}
                      {importResult.errors.length > 10 && <li>...and {importResult.errors.length - 10} more</li>}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setShowImportModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition">Close</button>
              {!importResult?.inserted && (
                <button onClick={handleImport} disabled={importing || !importFile} className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition">
                  {importing ? 'Importing...' : 'Import'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
