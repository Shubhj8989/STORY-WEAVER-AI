import React, { useEffect, useState } from 'react';
import { Users, Map, Zap, GitBranch, ChevronDown, ChevronUp, ScrollText } from 'lucide-react';
import { useStory } from '../context/StoryContext';
import { getCharacters, getLocations, getEvents, getRelationships, getUniverseRules } from '../api/client';
import type { Character, Location, StoryEvent, Relationship, UniverseRule } from '../api/client';

type Tab = 'characters' | 'locations' | 'events' | 'relationships' | 'rules';

const BiblePage: React.FC = () => {
  const { activeStory } = useStory();
  const [tab, setTab] = useState<Tab>('characters');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [events, setEvents] = useState<StoryEvent[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [rules, setRules] = useState<UniverseRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!activeStory) return;
    setLoading(true);
    Promise.all([
      getCharacters(activeStory.id),
      getLocations(activeStory.id),
      getEvents(activeStory.id),
      getRelationships(activeStory.id),
      getUniverseRules(activeStory.id),
    ]).then(([c, l, e, r, rulesRes]) => {
      setCharacters(c.data);
      setLocations(l.data);
      setEvents(e.data);
      setRelationships(r.data);
      setRules(rulesRes.data);
    }).finally(() => setLoading(false));
  }, [activeStory]);

  const tabs = [
    { id: 'characters', label: 'Characters', count: characters.length, icon: Users },
    { id: 'locations', label: 'Locations', count: locations.length, icon: Map },
    { id: 'events', label: 'Events', count: events.length, icon: Zap },
    { id: 'relationships', label: 'Relationships', count: relationships.length, icon: GitBranch },
    { id: 'rules', label: 'Rules', count: rules.length, icon: ScrollText },
  ];

  const RelTypeColor: Record<string, string> = {
    friend: 'emerald', ally: 'emerald', mentor: 'cyan',
    enemy: 'red', rival: 'red',
    lover: 'pink', family: 'purple',
  };

  const EventTypeColor: Record<string, string> = {
    battle: 'red', death: 'red', discovery: 'cyan',
    revelation: 'pink', meeting: 'emerald', other: 'purple',
  };

  return (
    <div>
      <div className="page-header">
        <h2>Story Bible</h2>
        <p>Auto-generated structured knowledge extracted from your chapters</p>
      </div>

      <div className="page-body">
        {!activeStory ? (
          <div className="empty-state">
            <div className="empty-state-icon">📖</div>
            <h3>No story selected</h3>
            <p>Create or select a story to view the Story Bible</p>
          </div>
        ) : (
          <>
            <div className="tab-bar">
              {tabs.map(t => (
                <button
                  key={t.id}
                  className={`tab-btn ${tab === t.id ? 'active' : ''}`}
                  onClick={() => setTab(t.id as Tab)}
                >
                  <t.icon size={13} style={{ display: 'inline', marginRight: 6 }} />
                  {t.label}
                  <span style={{
                    marginLeft: 6, fontSize: 11, fontWeight: 700,
                    background: tab === t.id ? 'rgba(255,255,255,0.2)' : 'var(--bg-glass)',
                    padding: '1px 6px', borderRadius: 10
                  }}>
                    {t.count}
                  </span>
                </button>
              ))}
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
                <div className="loading-spinner" style={{ width: 32, height: 32 }} />
              </div>
            ) : (
              <>
                {/* Characters */}
                {tab === 'characters' && (
                  characters.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon">👤</div>
                      <h3>No characters extracted yet</h3>
                      <p>Upload story chapters to automatically extract characters</p>
                    </div>
                  ) : (
                    <div className="characters-grid">
                      {characters.map(c => (
                        <div key={c.id} className="character-card fade-in">
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                            <div className="character-avatar">
                              {c.name.charAt(0).toUpperCase()}
                            </div>
                            <span className={`tag ${c.status === 'dead' ? 'tag-red' : 'tag-emerald'}`}>
                              {c.status}
                            </span>
                          </div>
                          <div className="character-name">{c.name}</div>
                          <div className="character-meta">
                            {c.gender !== 'Unknown' ? c.gender : ''}{c.age !== 'Unknown' ? ` · Age ${c.age}` : ''}
                            {c.first_appearance && ` · First in ${c.first_appearance}`}
                          </div>

                          {c.backstory && (
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 10 }}>
                              {c.backstory.slice(0, 120)}{c.backstory.length > 120 ? '...' : ''}
                            </p>
                          )}

                          {c.personality.length > 0 && (
                            <div className="tag-list">
                              {c.personality.slice(0, 3).map(t => (
                                <span key={t} className="tag tag-purple">{t}</span>
                              ))}
                            </div>
                          )}

                          {/* Expandable Details */}
                          <button
                            onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              color: 'var(--accent-primary)', fontSize: 12, fontWeight: 600,
                              marginTop: 12, display: 'flex', alignItems: 'center', gap: 4
                            }}
                          >
                            {expanded === c.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            {expanded === c.id ? 'Show less' : 'Show more'}
                          </button>

                          {expanded === c.id && (
                            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }} className="fade-in">
                              {c.goals.length > 0 && (
                                <div style={{ marginBottom: 10 }}>
                                  <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>Goals</p>
                                  {c.goals.map(g => <p key={g} style={{ fontSize: 12, color: 'var(--text-secondary)' }}>• {g}</p>)}
                                </div>
                              )}
                              {Object.keys(c.physical_traits).length > 0 && (
                                <div style={{ marginBottom: 10 }}>
                                  <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>Physical Traits</p>
                                  {Object.entries(c.physical_traits).map(([k, v]) => (
                                    <p key={k} style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                      <strong style={{ color: 'var(--text-primary)' }}>{k}:</strong>{' '}
                                      {Array.isArray(v) ? v.join(', ') : String(v)}
                                    </p>
                                  ))}
                                </div>
                              )}
                              {c.chapters_appeared.length > 0 && (
                                <div>
                                  <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>Appears In</p>
                                  <div className="tag-list">
                                    {c.chapters_appeared.map(ch => (
                                      <span key={ch} className="tag tag-cyan">{ch}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* Locations */}
                {tab === 'locations' && (
                  locations.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon">🗺️</div>
                      <h3>No locations extracted yet</h3>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                      {locations.map(l => (
                        <div key={l.id} className="card fade-in">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: 8,
                              background: 'rgba(6, 182, 212, 0.15)',
                              border: '1px solid rgba(6, 182, 212, 0.3)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
                            }}>🏛️</div>
                            <div>
                              <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{l.name}</h4>
                              {l.first_mentioned && (
                                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>First in {l.first_mentioned}</p>
                              )}
                            </div>
                          </div>
                          {l.description && <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 8 }}>{l.description}</p>}
                          {l.significance && (
                            <p style={{ fontSize: 12, color: 'var(--accent-cyan)', fontStyle: 'italic' }}>✦ {l.significance}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* Events */}
                {tab === 'events' && (
                  events.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon">⚡</div>
                      <h3>No events extracted yet</h3>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {events.map(e => (
                        <div key={e.id} className="card fade-in" style={{ display: 'flex', gap: 16 }}>
                          <div style={{
                            width: 40, flexShrink: 0, display: 'flex', flexDirection: 'column',
                            alignItems: 'center', gap: 4
                          }}>
                            <div style={{ fontSize: 20 }}>
                              {e.event_type === 'battle' ? '⚔️' : e.event_type === 'death' ? '💀' :
                               e.event_type === 'discovery' ? '🔍' : e.event_type === 'revelation' ? '💡' :
                               e.event_type === 'meeting' ? '🤝' : '📍'}
                            </div>
                            <span className={`tag tag-${EventTypeColor[e.event_type] || 'purple'}`} style={{ fontSize: 9, padding: '2px 6px' }}>
                              {e.event_type}
                            </span>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                              <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{e.name}</h4>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.chapter}</span>
                            </div>
                            {e.description && <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 8 }}>{e.description}</p>}
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              {e.characters_involved.map(c => (
                                <span key={c} className="tag tag-purple">{c}</span>
                              ))}
                              {e.location && <span className="tag tag-cyan">📍 {e.location}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* Relationships */}
                {tab === 'relationships' && (
                  relationships.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon">🔗</div>
                      <h3>No relationships extracted yet</h3>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
                      {relationships.map(r => (
                        <div key={r.id} className="card fade-in" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            flex: 1, textAlign: 'center',
                            padding: '8px 12px', background: 'var(--bg-secondary)',
                            borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600
                          }}>{r.entity_a}</div>
                          <div style={{ flexShrink: 0, textAlign: 'center' }}>
                            <span className={`tag tag-${RelTypeColor[r.relationship_type] || 'purple'}`}>
                              {r.relationship_type}
                            </span>
                            {r.established_in_chapter && (
                              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                                {r.established_in_chapter}
                              </div>
                            )}
                          </div>
                          <div style={{
                            flex: 1, textAlign: 'center',
                            padding: '8px 12px', background: 'var(--bg-secondary)',
                            borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600
                          }}>{r.entity_b}</div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {tab === 'rules' && (
                  rules.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon"><ScrollText size={46} /></div>
                      <h3>No universe rules extracted yet</h3>
                      <p>Upload chapters with worldbuilding, magic systems, lore, or social rules</p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
                      {rules.map(rule => (
                        <div key={rule.id} className="rule-row fade-in">
                          <p>{rule.rule}</p>
                          {rule.source_chapter && <span>{rule.source_chapter}</span>}
                        </div>
                      ))}
                    </div>
                  )
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BiblePage;
