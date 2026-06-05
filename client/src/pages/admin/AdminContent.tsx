import React, { useEffect, useState, useCallback } from 'react';
import api from '../../lib/api';
import { Plus, Pencil, Trash2, Eye, EyeOff, X, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Article {
  id: string; title: string; slug: string; body: string;
  coverImageUrl: string | null; category: string;
  isPublished: boolean; publishedAt: string | null; createdAt: string;
}

const emptyArticle = { title: '', body: '', coverImageUrl: '', category: 'NEWS', isPublished: false };

export default function AdminContent() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyArticle);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Hero slides
  const [slides, setSlides] = useState<any[]>([]);
  const [showSlideModal, setShowSlideModal] = useState(false);
  const [slideForm, setSlideForm] = useState({ imageUrl: '', title: '', subtitle: '', ctaText: '', ctaLink: '', displayOrder: 0 });
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    const { data } = await api.get(`/cms/articles?page=${page}&limit=10`);
    setArticles(data.articles);
    setTotal(data.total);
    setTotalPages(data.totalPages);
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);
  useEffect(() => { api.get('/cms/hero-slides').then(r => setSlides(r.data)); }, []);

  function openCreate() { setEditingId(null); setForm(emptyArticle); setError(''); setShowModal(true); }

  async function openEdit(id: string) {
    const { data } = await api.get(`/cms/articles/${articles.find(a => a.id === id)?.slug}`);
    setEditingId(id);
    setForm({ title: data.title, body: data.body, coverImageUrl: data.coverImageUrl || '', category: data.category, isPublished: data.isPublished });
    setError('');
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const body = { ...form, coverImageUrl: form.coverImageUrl || undefined };
      if (editingId) {
        await api.put(`/cms/articles/${editingId}`, body);
      } else {
        await api.post('/cms/articles', body);
      }
      setShowModal(false);
      fetchArticles();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save');
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this article?')) return;
    await api.delete(`/cms/articles/${id}`);
    fetchArticles();
  }

  // Hero slides
  async function handleSaveSlide() {
    setSaving(true);
    try {
      if (editingSlideId) {
        await api.put(`/cms/hero-slides/${editingSlideId}`, slideForm);
      } else {
        await api.post('/cms/hero-slides', slideForm);
      }
      setShowSlideModal(false);
      const { data } = await api.get('/cms/hero-slides');
      setSlides(data);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed');
    }
    setSaving(false);
  }

  async function handleDeleteSlide(id: string) {
    if (!confirm('Delete this hero slide?')) return;
    await api.delete(`/cms/hero-slides/${id}`);
    const { data } = await api.get('/cms/hero-slides');
    setSlides(data);
  }

  const categoryColors: Record<string, string> = {
    NEWS: 'bg-blue-100 text-blue-700',
    NOTICE: 'bg-yellow-100 text-yellow-700',
    BLOG: 'bg-green-100 text-green-700',
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">CMS Content</h1>
        <button onClick={openCreate} className="flex items-center gap-1.5 bg-[#1e3a5f] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-900 transition">
          <Plus className="h-4 w-4" /> New Article
        </button>
      </div>

      {/* Hero Slides section */}
      <details className="mb-6 bg-white rounded-xl border border-gray-100 shadow-sm">
        <summary className="px-5 py-3 cursor-pointer text-sm font-semibold text-gray-700">Hero Slides ({slides.length})</summary>
        <div className="px-5 pb-4">
          <div className="space-y-2 mb-3">
            {slides.map(s => (
              <div key={s.id} className="flex items-center justify-between gap-3 bg-gray-50 rounded-lg p-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900">{s.title || '(No title)'}</div>
                  <div className="text-xs text-gray-500">{s.subtitle || '—'} | Order: {s.displayOrder}</div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => { setEditingSlideId(s.id); setSlideForm({ imageUrl: s.imageUrl, title: s.title || '', subtitle: s.subtitle || '', ctaText: s.ctaText || '', ctaLink: s.ctaLink || '', displayOrder: s.displayOrder }); setShowSlideModal(true); }} className="p-1 text-gray-400 hover:text-blue-600"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => handleDeleteSlide(s.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => { setEditingSlideId(null); setSlideForm({ imageUrl: '', title: '', subtitle: '', ctaText: '', ctaLink: '', displayOrder: slides.length }); setShowSlideModal(true); }} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            + Add Hero Slide
          </button>
        </div>
      </details>

      {/* Articles table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900" /></div>
        ) : articles.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No articles yet</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="font-medium text-gray-500">Title</TableHead>
                  <TableHead className="font-medium text-gray-500">Category</TableHead>
                  <TableHead className="font-medium text-gray-500">Status</TableHead>
                  <TableHead className="font-medium text-gray-500">Date</TableHead>
                  <TableHead className="font-medium text-gray-500 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100">
                {articles.map(a => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="font-medium text-gray-900">{a.title}</div>
                      <div className="text-xs text-gray-400">/{a.slug}</div>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[a.category] || ''}`}>{a.category}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`flex items-center gap-1 text-xs font-medium ${a.isPublished ? 'text-green-600' : 'text-gray-400'}`}>
                        {a.isPublished ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                        {a.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">{new Date(a.publishedAt || a.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(a.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
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
            <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
            <div className="flex gap-1">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Article Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Article' : 'New Article'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{error}</div>}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Title *</label>
                <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="NEWS">News</option><option value="NOTICE">Notice</option><option value="BLOG">Blog</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Cover Image URL</label>
                  <input type="text" value={form.coverImageUrl} onChange={e => setForm({ ...form, coverImageUrl: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://..." />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Body *</label>
                <textarea rows={10} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isPublished} onChange={e => setForm({ ...form, isPublished: e.target.checked })} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm text-gray-700">Publish immediately</span>
              </label>
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

      {/* Hero Slide Modal */}
      {showSlideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowSlideModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editingSlideId ? 'Edit Slide' : 'Add Slide'}</h2>
              <button onClick={() => setShowSlideModal(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Image URL *</label>
                <input type="text" value={slideForm.imageUrl} onChange={e => setSlideForm({ ...slideForm, imageUrl: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Title</label>
                <input type="text" value={slideForm.title} onChange={e => setSlideForm({ ...slideForm, title: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Subtitle</label>
                <input type="text" value={slideForm.subtitle} onChange={e => setSlideForm({ ...slideForm, subtitle: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">CTA Text</label>
                  <input type="text" value={slideForm.ctaText} onChange={e => setSlideForm({ ...slideForm, ctaText: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">CTA Link</label>
                  <input type="text" value={slideForm.ctaLink} onChange={e => setSlideForm({ ...slideForm, ctaLink: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Display Order</label>
                <input type="number" value={slideForm.displayOrder} onChange={e => setSlideForm({ ...slideForm, displayOrder: Number(e.target.value) })} className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setShowSlideModal(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={handleSaveSlide} disabled={saving} className="px-5 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-blue-900 disabled:opacity-50 transition">
                {saving ? 'Saving...' : editingSlideId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
