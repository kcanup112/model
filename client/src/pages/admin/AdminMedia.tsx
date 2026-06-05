import React, { useEffect, useState, useRef } from 'react';
import api from '../../lib/api';
import { Upload, Trash2, Image as ImageIcon, Video, X } from 'lucide-react';

interface MediaItem {
  id: string; title: string; type: string; url: string;
  thumbnailUrl: string | null; caption: string | null;
  album: string | null; displayOrder: number; isPublished: boolean;
  createdAt: string;
}

export default function AdminMedia() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Upload modal
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: '', type: 'PHOTO', caption: '', album: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => { loadMedia(); }, [typeFilter]);

  async function loadMedia() {
    setLoading(true);
    const params = typeFilter ? `?type=${typeFilter}` : '';
    const { data } = await api.get(`/cms/media${params}`);
    setMedia(data);
    setLoading(false);
  }

  async function handleUpload() {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', uploadForm.title || selectedFile.name);
      formData.append('type', uploadForm.type);
      if (uploadForm.caption) formData.append('caption', uploadForm.caption);
      if (uploadForm.album) formData.append('album', uploadForm.album);

      await api.post('/cms/media', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowUpload(false);
      setSelectedFile(null);
      setUploadForm({ title: '', type: 'PHOTO', caption: '', album: '' });
      loadMedia();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Upload failed');
    }
    setUploading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this media?')) return;
    await api.delete(`/cms/media/${id}`);
    loadMedia();
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Media Library</h1>
        <button onClick={() => setShowUpload(true)} className="flex items-center gap-1.5 bg-[#1e3a5f] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-900 transition">
          <Upload className="h-4 w-4" /> Upload Media
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-5">
        {['', 'PHOTO', 'VIDEO'].map(t => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
              typeFilter === t ? 'bg-[#1e3a5f] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t || 'All'} {t === 'PHOTO' && <ImageIcon className="h-3 w-3 inline ml-0.5" />} {t === 'VIDEO' && <Video className="h-3 w-3 inline ml-0.5" />}
          </button>
        ))}
      </div>

      {/* Media grid */}
      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900" /></div>
      ) : media.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-100">No media found. Upload photos or videos.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {media.map(m => (
            <div key={m.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group">
              <div className="aspect-video bg-gray-100 relative">
                {m.type === 'PHOTO' ? (
                  <img src={m.url} alt={m.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Video className="h-10 w-10 text-gray-300" />
                  </div>
                )}
                <button
                  onClick={() => handleDelete(m.id)}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <span className={`absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-medium ${m.type === 'PHOTO' ? 'bg-blue-500 text-white' : 'bg-purple-500 text-white'}`}>
                  {m.type}
                </span>
              </div>
              <div className="p-3">
                <div className="text-sm font-medium text-gray-900 truncate">{m.title}</div>
                {m.caption && <div className="text-xs text-gray-500 truncate mt-0.5">{m.caption}</div>}
                {m.album && <div className="text-xs text-blue-500 mt-0.5">Album: {m.album}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowUpload(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Upload Media</h2>
              <button onClick={() => setShowUpload(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition"
              >
                {selectedFile ? (
                  <div>
                    <ImageIcon className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-xs text-gray-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Click to select a file</p>
                    <p className="text-xs text-gray-400 mt-1">Images or videos up to 50MB</p>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Title</label>
                <input type="text" value={uploadForm.title} onChange={e => setUploadForm({ ...uploadForm, title: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Optional title" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Type</label>
                  <select value={uploadForm.type} onChange={e => setUploadForm({ ...uploadForm, type: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="PHOTO">Photo</option><option value="VIDEO">Video</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Album</label>
                  <input type="text" value={uploadForm.album} onChange={e => setUploadForm({ ...uploadForm, album: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Campus Life" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Caption</label>
                <input type="text" value={uploadForm.caption} onChange={e => setUploadForm({ ...uploadForm, caption: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setShowUpload(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={handleUpload} disabled={!selectedFile || uploading} className="px-5 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-blue-900 disabled:opacity-50 transition">
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
