import React, { useEffect, useState, useCallback } from 'react';
import ReactFlow, {
  Background, Controls, MiniMap,
  useNodesState, useEdgesState, MarkerType, Panel
} from 'reactflow';
import type { Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import { useStory } from '../context/StoryContext';
import { getGraph } from '../api/client';

const NODE_COLORS: Record<string, string> = {
  character: '#8b5cf6',
  location: '#06b6d4',
  event: '#f59e0b',
};

const NODE_EMOJIS: Record<string, string> = {
  character: '👤',
  location: '📍',
  event: '⚡',
};

const GraphPage: React.FC = () => {
  const { activeStory } = useStory();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [filter, setFilter] = useState<'all' | 'character' | 'location' | 'event'>('all');

  const buildLayout = useCallback((rawNodes: any[], rawEdges: any[]) => {
    // Simple force-inspired layout using concentric circles by type
    const byType: Record<string, any[]> = { character: [], location: [], event: [] };
    rawNodes.forEach(n => {
      const t = n.node_type || 'character';
      (byType[t] || byType['character']).push(n);
    });

    const flowNodes: Node[] = [];
    const radii = { character: 300, location: 550, event: 180 };
    const centers = {
      character: { x: 500, y: 400 },
      location: { x: 500, y: 400 },
      event: { x: 500, y: 400 },
    };

    Object.entries(byType).forEach(([type, items]) => {
      const radius = radii[type as keyof typeof radii] || 300;
      const center = centers[type as keyof typeof centers] || { x: 500, y: 400 };
      items.forEach((item, i) => {
        const angle = (2 * Math.PI * i) / Math.max(items.length, 1);
        const x = center.x + radius * Math.cos(angle);
        const y = center.y + radius * Math.sin(angle);
        const color = NODE_COLORS[type] || '#8b5cf6';

        flowNodes.push({
          id: item.id,
          position: { x, y },
          data: {
            label: (
              <div style={{ textAlign: 'center', padding: '6px 8px' }}>
                <div style={{ fontSize: 16, marginBottom: 2 }}>{NODE_EMOJIS[type] || '◆'}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', maxWidth: 80, wordBreak: 'break-word' }}>
                  {item.label}
                </div>
              </div>
            ),
            rawData: item,
          },
          style: {
            background: `${color}20`,
            border: `2px solid ${color}`,
            borderRadius: 12,
            color: '#fff',
            minWidth: 90,
          },
        });
      });
    });

    const flowEdges: Edge[] = rawEdges.map((e, i) => ({
      id: `e${i}`,
      source: e.source,
      target: e.target,
      label: e.label,
      labelStyle: { fontSize: 10, fill: '#8b8baa' },
      labelBgStyle: { fill: '#12121f', fillOpacity: 0.85 },
      style: { stroke: '#4a4a6a', strokeWidth: 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#4a4a6a', width: 12, height: 12 },
      animated: e.label === 'enemy' || e.label === 'rival',
    }));

    return { flowNodes, flowEdges };
  }, []);

  useEffect(() => {
    if (!activeStory) return;
    setLoading(true);
    getGraph(activeStory.id).then(res => {
      const { flowNodes, flowEdges } = buildLayout(res.data.nodes, res.data.edges);
      setNodes(flowNodes);
      setEdges(flowEdges);
    }).finally(() => setLoading(false));
  }, [activeStory]);

  const filteredNodes = filter === 'all'
    ? nodes
    : nodes.filter(n => n.data.rawData?.node_type === filter);

  const filteredEdges = filter === 'all'
    ? edges
    : edges.filter(e =>
        filteredNodes.some(n => n.id === e.source) &&
        filteredNodes.some(n => n.id === e.target)
      );

  return (
    <div>
      <div className="page-header">
        <h2>Knowledge Graph</h2>
        <p>Interactive visualization of all story entities and their relationships</p>
      </div>

      <div className="page-body" style={{ padding: '24px 40px' }}>
        {!activeStory ? (
          <div className="empty-state">
            <div className="empty-state-icon">🕸️</div>
            <h3>No story selected</h3>
          </div>
        ) : loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
            <div style={{ textAlign: 'center' }}>
              <div className="loading-spinner" style={{ width: 40, height: 40, margin: '0 auto 16px' }} />
              <p style={{ color: 'var(--text-secondary)' }}>Building knowledge graph...</p>
            </div>
          </div>
        ) : nodes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🕸️</div>
            <h3>Graph is empty</h3>
            <p>Upload story chapters to populate the knowledge graph</p>
          </div>
        ) : (
          <>
            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {(['all', 'character', 'location', 'event'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 600, transition: 'all 0.2s',
                    background: filter === f ? 'var(--gradient-purple)' : 'var(--bg-card)',
                    color: filter === f ? 'white' : 'var(--text-secondary)',
                    boxShadow: filter === f ? '0 2px 10px rgba(139,92,246,0.3)' : 'none',
                  }}
                >
                  {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1) + 's'}
                  {f !== 'all' && (
                    <span style={{ marginLeft: 6, opacity: 0.7 }}>
                      {NODE_EMOJIS[f]}
                    </span>
                  )}
                </button>
              ))}

              <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)', alignItems: 'center' }}>
                {Object.entries(NODE_COLORS).map(([type, color]) => (
                  <span key={type} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </span>
                ))}
              </div>
            </div>

            <div className="graph-container">
              <ReactFlow
                nodes={filteredNodes}
                edges={filteredEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={(_, node) => setSelectedNode(node)}
                fitView
                style={{ background: 'var(--bg-secondary)' }}
              >
                <Background color="#1a1a2e" gap={20} />
                <Controls style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} />
                <MiniMap
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                  nodeColor={n => NODE_COLORS[(n.data?.rawData?.node_type as string) || 'character'] || '#8b5cf6'}
                />

                {selectedNode && (
                  <Panel position="top-right">
                    <div style={{
                      background: 'var(--bg-card)', border: '1px solid var(--border-accent)',
                      borderRadius: 'var(--radius-md)', padding: 16, minWidth: 200, maxWidth: 280
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <h4 style={{ fontSize: 14, fontWeight: 700 }}>{selectedNode.data.rawData?.label}</h4>
                        <button
                          onClick={() => setSelectedNode(null)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16 }}
                        >×</button>
                      </div>
                      <span className={`tag ${
                        selectedNode.data.rawData?.node_type === 'character' ? 'tag-purple' :
                        selectedNode.data.rawData?.node_type === 'location' ? 'tag-cyan' : 'tag-amber'
                      }`}>
                        {selectedNode.data.rawData?.node_type}
                      </span>
                      {selectedNode.data.rawData?.data && Object.entries(selectedNode.data.rawData.data).slice(0, 4).map(([k, v]) => (
                        v && String(v).length > 0 && String(v) !== '[]' ? (
                          <div key={k} style={{ marginTop: 8 }}>
                            <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{k}</p>
                            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                              {Array.isArray(v) ? (v as string[]).join(', ') : String(v)}
                            </p>
                          </div>
                        ) : null
                      ))}
                    </div>
                  </Panel>
                )}
              </ReactFlow>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GraphPage;
