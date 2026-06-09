import React, { useEffect, useState } from 'react';
import { useStory } from '../context/StoryContext';
import { getEvents } from '../api/client';
import type { StoryEvent } from '../api/client';

const EVENT_CONFIG: Record<string, { emoji: string; color: string }> = {
  battle: { emoji: '⚔️', color: 'var(--accent-red)' },
  death: { emoji: '💀', color: '#6b21a8' },
  discovery: { emoji: '🔍', color: 'var(--accent-cyan)' },
  revelation: { emoji: '💡', color: 'var(--accent-pink)' },
  meeting: { emoji: '🤝', color: 'var(--accent-emerald)' },
  other: { emoji: '📍', color: 'var(--accent-primary)' },
  general: { emoji: '📝', color: 'var(--accent-primary)' },
};

const TimelinePage: React.FC = () => {
  const { activeStory } = useStory();
  const [events, setEvents] = useState<StoryEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!activeStory) return;
    setLoading(true);
    getEvents(activeStory.id)
      .then(r => setEvents(r.data))
      .finally(() => setLoading(false));
  }, [activeStory]);

  // Group events by chapter
  const byChapter: Record<string, StoryEvent[]> = {};
  events.forEach(e => {
    const ch = e.chapter || 'Unknown';
    if (!byChapter[ch]) byChapter[ch] = [];
    byChapter[ch].push(e);
  });

  const chapters = Object.keys(byChapter).sort((a, b) => {
    const na = parseInt(a.replace(/\D/g, '')) || 0;
    const nb = parseInt(b.replace(/\D/g, '')) || 0;
    return na - nb;
  });

  const eventTypes = ['all', ...new Set(events.map(e => e.event_type))];

  const filteredByChapter: Record<string, StoryEvent[]> = {};
  chapters.forEach(ch => {
    const filtered = filter === 'all' ? byChapter[ch] : byChapter[ch].filter(e => e.event_type === filter);
    if (filtered.length > 0) filteredByChapter[ch] = filtered;
  });

  return (
    <div>
      <div className="page-header">
        <h2>Story Timeline</h2>
        <p>Chronological view of all events across chapters</p>
      </div>

      <div className="page-body">
        {!activeStory ? (
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <h3>No story selected</h3>
          </div>
        ) : loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
            <div className="loading-spinner" style={{ width: 32, height: 32 }} />
          </div>
        ) : events.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <h3>No events yet</h3>
            <p>Upload chapters to build the story timeline</p>
          </div>
        ) : (
          <>
            {/* Filter */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 32, flexWrap: 'wrap' }}>
              {eventTypes.map(t => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  style={{
                    padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 600, transition: 'all 0.2s',
                    background: filter === t ? 'var(--gradient-purple)' : 'var(--bg-card)',
                    color: filter === t ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  {t === 'all' ? '🔄 All Events' : `${EVENT_CONFIG[t]?.emoji || '📍'} ${t}`}
                </button>
              ))}
            </div>

            {/* Timeline */}
            {Object.entries(filteredByChapter).map(([chapter, chEvents]) => (
              <div key={chapter} style={{ marginBottom: 40 }}>
                {/* Chapter Header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20
                }}>
                  <div style={{
                    padding: '6px 18px',
                    background: 'var(--gradient-purple)',
                    borderRadius: 20, fontSize: 12, fontWeight: 700, color: 'white',
                    boxShadow: '0 2px 10px rgba(139,92,246,0.3)', flexShrink: 0
                  }}>
                    {chapter}
                  </div>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
                    {chEvents.length} event{chEvents.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="timeline">
                  {chEvents.map(evt => {
                    const cfg = EVENT_CONFIG[evt.event_type] || EVENT_CONFIG.general;
                    return (
                      <div key={evt.id} className={`timeline-item ${evt.event_type} fade-in`}>
                        <div className={`timeline-dot ${evt.event_type}`} />
                        <div className="card" style={{ marginBottom: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                            <span style={{ fontSize: 22, flexShrink: 0 }}>{cfg.emoji}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                                <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                                  {evt.name}
                                </h4>
                                <span style={{
                                  fontSize: 10, padding: '2px 8px', borderRadius: 10,
                                  background: `${cfg.color}20`, color: cfg.color,
                                  border: `1px solid ${cfg.color}40`, fontWeight: 600, textTransform: 'uppercase'
                                }}>
                                  {evt.event_type}
                                </span>
                              </div>
                              {evt.description && (
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 8 }}>
                                  {evt.description}
                                </p>
                              )}
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {evt.characters_involved.map(c => (
                                  <span key={c} className="tag tag-purple">{c}</span>
                                ))}
                                {evt.location && <span className="tag tag-cyan">📍 {evt.location}</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default TimelinePage;
