import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader, ChevronRight, Clock } from 'lucide-react';
import { useStory } from '../context/StoryContext';
import { uploadChapter } from '../api/client';
import axios from 'axios';

interface ProcessResult {
  chapter_id: string;
  chapter_number: number;
  status: string;
  message?: string;
  extracted?: { characters: number; locations: number; events: number; relationships: number };
}

const UploadPage: React.FC = () => {
  const { activeStory, refreshStories } = useStory();
  const [chapterNumber, setChapterNumber] = useState(1);
  const [chapterTitle, setChapterTitle] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [bgStatus, setBgStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [uploadedChapters, setUploadedChapters] = useState<{ num: number; status: string; extracted?: any }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleFile = (f: File) => {
    setFile(f);
    if (f.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = e => setContent(e.target?.result as string || '');
      reader.readAsText(f);
    }
  };

  const pollStatus = (chapterId: string, chapterNum: number) => {
    setBgStatus('processing');
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/upload/chapter/${chapterId}/status`);
        const data = res.data;
        if (data.status === 'done') {
          clearInterval(pollRef.current!);
          setBgStatus('done');
          setUploadedChapters(prev => prev.map(c =>
            c.num === chapterNum ? { ...c, status: 'done', extracted: data.extracted } : c
          ));
          await refreshStories();
        } else if (data.status === 'error') {
          clearInterval(pollRef.current!);
          setBgStatus('error');
        } else if (attempts > 60) {
          // 2 min timeout
          clearInterval(pollRef.current!);
          setBgStatus('done'); // treat as done anyway
        }
      } catch {
        // keep polling
      }
    }, 2000); // poll every 2 seconds
  };

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const handleSubmit = async () => {
    if (!activeStory) { setError('Please select a story first.'); return; }
    if (!content.trim() && !file) { setError('Please provide chapter content or upload a file.'); return; }

    setLoading(true);
    setError('');
    setResult(null);

    const formData = new FormData();
    formData.append('story_id', activeStory.id);
    formData.append('chapter_number', chapterNumber.toString());
    formData.append('chapter_title', chapterTitle);
    if (file && file.type === 'application/pdf') {
      formData.append('file', file);
    } else {
      formData.append('content', content);
    }

    try {
      const res = await uploadChapter(formData);
      setResult(res.data);

      // Track this chapter
      setUploadedChapters(prev => [...prev, {
        num: chapterNumber,
        status: 'processing'
      }]);

      // Start background polling
      pollStatus(res.data.chapter_id, chapterNumber);

      // Auto-advance
      setChapterNumber(n => n + 1);
      setChapterTitle('');
      setContent('');
      setFile(null);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Upload failed. Check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Upload Chapters</h2>
        <p>Add story chapters — AI extracts characters, events, relationships in the background</p>
      </div>

      <div className="page-body" style={{ maxWidth: 800 }}>
        {!activeStory && (
          <div className="alert alert-info" style={{ marginBottom: 24 }}>
            Create a story first using the "+ New" button in the sidebar.
          </div>
        )}

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 24 }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Instant success banner */}
        {result && (
          <div className="alert alert-success fade-in" style={{ marginBottom: 16 }}>
            <CheckCircle size={16} />
            <div>
              <strong>Chapter {result.chapter_number} saved!</strong>
              <p style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>
                {result.message} You can upload the next chapter now.
              </p>
            </div>
          </div>
        )}

        {/* Background processing banner */}
        {bgStatus === 'processing' && (
          <div className="alert alert-info fade-in" style={{ marginBottom: 16 }}>
            <Loader size={15} style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
            <div>
              <strong>Gemini is analyzing in the background</strong>
              <p style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>
                Characters, events, and relationships are being extracted. Keep uploading chapters!
              </p>
            </div>
          </div>
        )}

        {/* Uploaded chapter tracker */}
        {uploadedChapters.length > 0 && (
          <div className="card" style={{ marginBottom: 20, padding: '12px 16px' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10 }}>
              UPLOAD PROGRESS
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {uploadedChapters.map(c => (
                <div key={c.num} style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  background: c.status === 'done' ? 'rgba(16,185,129,0.1)' : 'rgba(139,92,246,0.1)',
                  border: `1px solid ${c.status === 'done' ? 'rgba(16,185,129,0.3)' : 'rgba(139,92,246,0.3)'}`,
                  color: c.status === 'done' ? 'var(--accent-emerald)' : 'var(--accent-primary)',
                }}>
                  {c.status === 'done'
                    ? <CheckCircle size={11} />
                    : <Loader size={11} style={{ animation: 'spin 1s linear infinite' }} />
                  }
                  Ch.{c.num}
                  {c.extracted && (
                    <span style={{ opacity: 0.7 }}>
                      · {c.extracted.characters}👤 {c.extracted.events}⚡
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Chapter Number</label>
              <input
                type="number"
                className="form-input"
                value={chapterNumber}
                min={1}
                onChange={e => setChapterNumber(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Chapter Title (Optional)</label>
              <input
                className="form-input"
                placeholder="e.g. The First Battle"
                value={chapterTitle}
                onChange={e => setChapterTitle(e.target.value)}
              />
            </div>
          </div>

          {/* Upload Zone */}
          <div
            className={`upload-zone ${dragging ? 'dragging' : ''}`}
            style={{ marginBottom: 16 }}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.pdf"
              style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <div className="upload-zone-icon">
              <Upload size={24} color="white" />
            </div>
            {file ? (
              <>
                <h3 style={{ color: 'var(--accent-primary)' }}>
                  <FileText size={14} style={{ display: 'inline', marginRight: 6 }} />
                  {file.name}
                </h3>
                <p>File selected · Click to change</p>
              </>
            ) : (
              <>
                <h3>Drop a .txt or .pdf file here</h3>
                <p>or click to browse · Supports text and PDF files</p>
              </>
            )}
          </div>

          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>
            — or paste chapter text directly —
          </div>

          <div className="form-group">
            <label className="form-label">Chapter Content</label>
            <textarea
              className="form-textarea"
              rows={12}
              placeholder="Paste your chapter text here..."
              value={content}
              onChange={e => setContent(e.target.value)}
              style={{ minHeight: 200 }}
            />
            {content && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                ~{Math.ceil(content.split(/\s+/).length)} words
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Clock size={12} />
              Saves instantly · AI runs in background
            </div>
            <button
              className="btn btn-primary btn-lg"
              onClick={handleSubmit}
              disabled={loading || !activeStory}
            >
              {loading ? (
                <><Loader size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Saving...</>
              ) : (
                <>Upload Chapter <ChevronRight size={16} /></>
              )}
            </button>
          </div>
        </div>

        <div className="card" style={{ marginTop: 20, background: 'var(--gradient-card)' }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-primary)', marginBottom: 10 }}>💡 Tips</h4>
          <ul style={{ paddingLeft: 16, color: 'var(--text-secondary)', fontSize: 13, lineHeight: 2 }}>
            <li>Upload chapters in order — each builds on the previous Story Bible</li>
            <li><strong>Don't wait</strong> for AI to finish — upload all 10 chapters back-to-back</li>
            <li>Use the Story Bible page after all chapters are processed</li>
            <li>Then run Continuity Check on Chapter 11 to see the demo errors caught</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;
