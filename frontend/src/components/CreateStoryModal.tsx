import React, { useState } from 'react';
import { X, BookOpen } from 'lucide-react';
import { createStory } from '../api/client';
import { useStory } from '../context/StoryContext';

const GENRES = ['Fantasy', 'Sci-Fi', 'Thriller', 'Romance', 'Mystery', 'Horror', 'Historical Fiction', 'Adventure', 'Literary Fiction'];

interface Props { onClose: () => void; }

const CreateStoryModal: React.FC<Props> = ({ onClose }) => {
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('Fantasy');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { refreshStories, setActiveStory } = useStory();

  const handleCreate = async () => {
    if (!title.trim()) { setError('Please enter a story title'); return; }
    setLoading(true);
    try {
      const res = await createStory(title.trim(), genre);
      await refreshStories();
      setActiveStory(res.data);
      onClose();
    } catch {
      setError('Failed to create story. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, backdropFilter: 'blur(4px)'
    }}>
      <div className="card fade-in" style={{ width: 440, maxWidth: '90vw' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'var(--gradient-purple)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <BookOpen size={18} color="white" />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>New Story</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Create a new story project</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        <div className="form-group">
          <label className="form-label">Story Title</label>
          <input
            className="form-input"
            placeholder="e.g. The Chronicles of Aryan"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label">Genre</label>
          <select className="form-select" value={genre} onChange={e => setGenre(e.target.value)}>
            {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>
            {loading ? <><span className="loading-spinner" style={{ width: 14, height: 14 }} /> Creating...</> : '✦ Create Story'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateStoryModal;
