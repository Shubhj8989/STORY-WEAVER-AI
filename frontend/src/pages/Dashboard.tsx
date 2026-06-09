import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Users, Map, GitBranch, AlertTriangle, MessageSquare, Upload, Zap, Star, TrendingUp, Sparkles, ScrollText } from 'lucide-react';
import { useStory } from '../context/StoryContext';
import { getStorySummary } from '../api/client';
import type { StorySummary } from '../api/client';

const Dashboard: React.FC = () => {
  const { activeStory } = useStory();
  const [summary, setSummary] = useState<StorySummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeStory) return;
    setLoading(true);
    getStorySummary(activeStory.id)
      .then(r => setSummary(r.data))
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, [activeStory]);

  if (!activeStory) {
    return (
      <div>
        <div className="page-header">
          <h2>Dashboard</h2>
          <p>Your AI-powered story management center</p>
        </div>
        <div className="page-body">
          <div style={{
            textAlign: 'center', padding: '80px 32px',
            background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border)',
          }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'var(--gradient-hero)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px', fontSize: 36,
              boxShadow: 'var(--shadow-glow)'
            }}>✦</div>
            <h3 style={{ fontFamily: 'Space Grotesk', fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
              Welcome to Story-Weaver AI
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
              Create your first story project to get started. Upload chapters and watch your story universe come to life.
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Click <strong style={{ color: 'var(--accent-primary)' }}>+ New</strong> in the sidebar to create a story
            </p>
          </div>
        </div>
      </div>
    );
  }

  const stats = summary ? [
    { label: 'Chapters', value: summary.total_chapters, color: 'purple', icon: BookOpen },
    { label: 'Characters', value: summary.characters, color: 'pink', icon: Users },
    { label: 'Locations', value: summary.locations, color: 'cyan', icon: Map },
    { label: 'Events', value: summary.events, color: 'emerald', icon: Zap },
    { label: 'Relationships', value: summary.relationships, color: 'amber', icon: GitBranch },
    { label: 'Rules', value: summary.universe_rules || 0, color: 'cyan', icon: ScrollText },
  ] : [];

  const quickActions = [
    { to: '/upload', icon: Upload, label: 'Upload Chapter', desc: 'Add and process new chapters', color: 'var(--accent-primary)' },
    { to: '/bible', icon: BookOpen, label: 'Story Bible', desc: 'View extracted characters & events', color: 'var(--accent-pink)' },
    { to: '/graph', icon: GitBranch, label: 'Knowledge Graph', desc: 'Explore relationship network', color: 'var(--accent-cyan)' },
    { to: '/continuity', icon: AlertTriangle, label: 'Continuity Check', desc: 'Detect story contradictions', color: 'var(--accent-amber)' },
    { to: '/creative', icon: Sparkles, label: 'Creative Guidance', desc: 'Get arcs, style, and scene suggestions', color: 'var(--accent-pink)' },
    { to: '/chat', icon: MessageSquare, label: 'AI Chat', desc: 'Ask questions about your story', color: 'var(--accent-emerald)' },
    { to: '/timeline', icon: TrendingUp, label: 'Timeline', desc: 'View story events chronologically', color: '#a855f7' },
  ];

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Star size={22} style={{ color: 'var(--accent-primary)' }} />
              {activeStory.title}
            </h2>
            <p>{activeStory.genre} · Story Universe Dashboard</p>
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Stats */}
        {loading ? (
          <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{
                flex: 1, height: 100, background: 'var(--bg-card)',
                borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
                animation: 'pulse 1.5s ease-in-out infinite'
              }} />
            ))}
          </div>
        ) : (
          <div className="stats-grid" style={{ marginBottom: 32 }}>
            {stats.map(s => (
              <div key={s.label} className={`stat-card ${s.color} fade-in`}>
                <div style={{ color: `var(--accent-${s.color})`, marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
                  <s.icon size={20} />
                </div>
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <h3 className="section-title">Quick Actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {quickActions.map(action => (
            <Link
              key={action.to}
              to={action.to}
              style={{ textDecoration: 'none' }}
            >
              <div className="card" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 'var(--radius-md)',
                  background: `${action.color}20`,
                  border: `1px solid ${action.color}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'transform var(--transition)'
                }}>
                  <action.icon size={22} style={{ color: action.color }} />
                </div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>
                    {action.label}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{action.desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* How It Works */}
        <h3 className="section-title" style={{ marginTop: 40 }}>How Story-Weaver AI Works</h3>
        <div style={{ display: 'flex', gap: 0, overflow: 'hidden', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          {[
            { step: '01', title: 'Upload', desc: 'Add chapters as text or PDF files', icon: '📤' },
            { step: '02', title: 'Extract', desc: 'Gemini AI extracts characters, events & relationships', icon: '🤖' },
            { step: '03', title: 'Graph', desc: 'Story becomes a living knowledge graph', icon: '🕸️' },
            { step: '04', title: 'Validate', desc: 'Continuity engine checks every new chapter', icon: '✅' },
            { step: '05', title: 'Chat', desc: 'RAG-powered assistant answers questions', icon: '💬' },
          ].map((s, i) => (
            <div key={s.step} style={{
              flex: 1, padding: '24px 16px', background: 'var(--bg-card)',
              borderRight: i < 4 ? '1px solid var(--border)' : 'none',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 24, marginBottom: 10 }}>{s.icon}</div>
              <div style={{ fontSize: 11, color: 'var(--accent-primary)', fontWeight: 700, marginBottom: 6, letterSpacing: '0.08em' }}>
                STEP {s.step}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>{s.title}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
