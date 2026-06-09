import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  BookOpen, Users, Map, GitBranch, AlertTriangle,
  MessageSquare, Upload, Home, Plus, Clock, Sparkles
} from 'lucide-react';
import { useStory } from '../context/StoryContext';
import CreateStoryModal from './CreateStoryModal';

const navItems = [
  { to: '/', icon: Home, label: 'Dashboard' },
  { to: '/upload', icon: Upload, label: 'Upload Chapters' },
  { to: '/bible', icon: BookOpen, label: 'Story Bible' },
  { to: '/graph', icon: GitBranch, label: 'Knowledge Graph' },
  { to: '/timeline', icon: Clock, label: 'Timeline' },
  { to: '/continuity', icon: AlertTriangle, label: 'Continuity Check' },
  { to: '/creative', icon: Sparkles, label: 'Creative Guidance' },
  { to: '/chat', icon: MessageSquare, label: 'AI Story Chat' },
];

const Sidebar: React.FC = () => {
  const { stories, activeStory, setActiveStory } = useStory();
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>✦ Story-Weaver AI</h1>
          <p>Knowledge Graph Copilot</p>
        </div>

        <div className="sidebar-story-selector">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
              Active Story
            </span>
            <button
              onClick={() => setShowModal(true)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 12, fontWeight: 600
              }}
            >
              <Plus size={12} /> New
            </button>
          </div>
          <select
            value={activeStory?.id || ''}
            onChange={e => {
              const s = stories.find(s => s.id === e.target.value);
              if (s) setActiveStory(s);
            }}
          >
            {stories.length === 0 ? (
              <option value="">No stories yet...</option>
            ) : (
              stories.map(s => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))
            )}
          </select>
        </div>

        <div className="nav-section-label">Navigation</div>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}

        {activeStory && (
          <div style={{
            margin: '24px 16px 0',
            padding: '16px',
            background: 'var(--bg-glass)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
          }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              Current Story
            </p>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{activeStory.title}</p>
            <p style={{ fontSize: 11, color: 'var(--accent-primary)', marginTop: 4 }}>
              {activeStory.genre} · {activeStory.total_chapters} chapters
            </p>
          </div>
        )}
      </aside>

      {showModal && <CreateStoryModal onClose={() => setShowModal(false)} />}
    </>
  );
};

export default Sidebar;
