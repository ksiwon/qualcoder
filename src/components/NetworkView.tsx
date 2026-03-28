import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { useStore } from '../store/useStore';

interface NodeData {
  id: string;
  label: string;
  type: 'category' | 'code' | 'group';
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  parentId?: string;
}

interface EdgeData {
  id: string;
  source: string;
  target: string;
}

const Wrap = styled.div`
  flex: 1; display: flex; flex-direction: column; overflow: hidden; background: #F7F6F3;
  position: relative;
`;

const Toolbar = styled.div`
  position: absolute; top: 14px; left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: 6px;
  background: white; border: 1px solid var(--border);
  border-radius: 10px; padding: 6px 10px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.1);
  z-index: 10;
`;

const TBtn = styled.button<{ active?: boolean }>`
  font-size: 11px; font-weight: 600; padding: 4px 10px;
  border-radius: 6px;
  background: ${p => p.active ? 'var(--text)' : 'transparent'};
  color: ${p => p.active ? 'white' : 'var(--text-secondary)'};
  &:hover { background: var(--surface2); color: var(--text); }
`;

const TDivider = styled.div`width: 1px; height: 18px; background: var(--border);`;

const Canvas = styled.svg`
  width: 100%; height: 100%;
  cursor: default;
  user-select: none;
`;


const CATEGORY_COLORS: Record<string, string> = {
  '사용자 경험': '#4A6FA5',
  '의료 및 돌봄': '#E07B54',
  '기술적 상호작용': '#61A87B',
  '기타': '#9B9793',
};

function buildNodes(codes: ReturnType<typeof useStore.getState>['codes'], groups: ReturnType<typeof useStore.getState>['codeGroups']): { nodes: NodeData[]; edges: EdgeData[] } {
  const nodes: NodeData[] = [];
  const edges: EdgeData[] = [];
  const categoryPositions: Record<string, { x: number; y: number }> = {};

  // Unique categories
  const categories = Array.from(new Set(codes.map(c => c.category || '기타')));
  categories.forEach((cat, ci) => {
    const cx = 120 + ci * 340;
    const cy = 80;
    categoryPositions[cat] = { x: cx, y: cy };
    nodes.push({
      id: `cat_${cat}`, label: cat, type: 'category',
      color: CATEGORY_COLORS[cat] || '#888',
      x: cx, y: cy, width: 160, height: 46,
    });
  });

  // Code nodes
  const codesByCategory: Record<string, typeof codes> = {};
  for (const c of codes) {
    const cat = c.category || '기타';
    if (!codesByCategory[cat]) codesByCategory[cat] = [];
    codesByCategory[cat].push(c);
  }

  let codeNodeMap: Record<string, { x: number; y: number }> = {};
  for (const [cat, catCodes] of Object.entries(codesByCategory)) {
    const base = categoryPositions[cat] || { x: 100, y: 80 };
    catCodes.forEach((code, ci) => {
      const row = Math.floor(ci / 2);
      const col = ci % 2;
      const cx = base.x - 80 + col * 190;
      const cy = base.y + 100 + row * 100;
      codeNodeMap[code.id] = { x: cx, y: cy };
      nodes.push({
        id: code.id, label: code.name, type: 'code',
        color: code.color, x: cx, y: cy, width: 160, height: 44,
        parentId: `cat_${cat}`,
      });
      edges.push({ id: `e_cat_${code.id}`, source: `cat_${cat}`, target: code.id });

      // Group nodes
      const codeGroups = groups.filter(g => g.codeId === code.id);
      codeGroups.forEach((g, gi) => {
        const gx = cx - 60 + gi * 130;
        const gy = cy + 110;
        nodes.push({
          id: `grp_${g.id}`, label: g.name, type: 'group',
          color: code.color, x: gx, y: gy, width: 140, height: 38,
          parentId: code.id,
        });
        edges.push({ id: `e_grp_${g.id}`, source: code.id, target: `grp_${g.id}` });
      });
    });
  }

  return { nodes, edges };
}

export const NetworkView = () => {
  const { codes, codeGroups } = useStore();
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showEdges, setShowEdges] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragging = useRef<{ id: string; ox: number; oy: number; startPan?: { x: number; y: number } } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const panDrag = useRef<{ startX: number; startY: number; pan: { x: number; y: number } } | null>(null);

  const { nodes: baseNodes, edges } = useMemo(
    () => buildNodes(codes, codeGroups),
    [codes, codeGroups]
  );

  const nodes: NodeData[] = baseNodes.map(n => ({
    ...n,
    x: nodePositions[n.id]?.x ?? n.x,
    y: nodePositions[n.id]?.y ?? n.y,
  }));

  const getNodeById = (id: string) => nodes.find(n => n.id === id);

  const svgPt = (e: React.MouseEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top - pan.y) / zoom,
    };
  };

  const handleNodeMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const pt = svgPt(e);
    const node = getNodeById(id)!;
    dragging.current = { id, ox: pt.x - node.x, oy: pt.y - node.y };
    setSelectedId(id);
  };

  const handleSvgMouseDown = (e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as Element).tagName === 'rect' && !(e.target as Element).getAttribute('data-node')) {
      const rect = svgRef.current!.getBoundingClientRect();
      panDrag.current = { startX: e.clientX - rect.left, startY: e.clientY - rect.top, pan: { ...pan } };
      setSelectedId(null);
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (dragging.current && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - pan.x) / zoom - dragging.current.ox;
      const y = (e.clientY - rect.top - pan.y) / zoom - dragging.current.oy;
      setNodePositions(prev => ({ ...prev, [dragging.current!.id]: { x, y } }));
    }
    if (panDrag.current && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const dx = (e.clientX - rect.left) - panDrag.current.startX;
      const dy = (e.clientY - rect.top) - panDrag.current.startY;
      setPan({ x: panDrag.current.pan.x + dx, y: panDrag.current.pan.y + dy });
    }
  }, [pan, zoom]);

  const handleMouseUp = useCallback(() => {
    dragging.current = null;
    panDrag.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.min(2.5, Math.max(0.3, z * delta)));
  };

  const handleAutoLayout = () => {
    setNodePositions({});
    setPan({ x: 40, y: 40 });
    setZoom(0.85);
  };

  const edgePath = (e: EdgeData) => {
    const s = getNodeById(e.source);
    const t = getNodeById(e.target);
    if (!s || !t) return '';
    const sx = s.x + s.width / 2;
    const sy = s.y + s.height;
    const tx = t.x + t.width / 2;
    const ty = t.y;
    const mid = (sy + ty) / 2;
    return `M ${sx} ${sy} C ${sx} ${mid}, ${tx} ${mid}, ${tx} ${ty}`;
  };

  const typeLabel = (t: NodeData['type']) =>
    t === 'category' ? '분류' : t === 'code' ? '코드' : '그룹';

  return (
    <Wrap>
      <Toolbar>
        <TBtn onClick={handleAutoLayout}>🔄 자동 배치</TBtn>
        <TDivider />
        <TBtn active={showEdges} onClick={() => setShowEdges(v => !v)}>연결선</TBtn>
        <TDivider />
        <TBtn onClick={() => setZoom(z => Math.min(2.5, z * 1.2))}>+</TBtn>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 36, textAlign: 'center' }}>
          {Math.round(zoom * 100)}%
        </span>
        <TBtn onClick={() => setZoom(z => Math.max(0.3, z * 0.8))}>−</TBtn>
        <TDivider />
        <TBtn onClick={() => { setPan({ x: 0, y: 0 }); setZoom(1); }}>리셋</TBtn>
      </Toolbar>

      <Canvas
        ref={svgRef}
        onMouseDown={handleSvgMouseDown}
        onWheel={handleWheel}
      >
        <defs>
          <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#D0CEC9" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)" />

        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
          {/* Edges */}
          {showEdges && edges.map(e => (
            <path
              key={e.id}
              d={edgePath(e)}
              fill="none"
              stroke="#C5C3BF"
              strokeWidth={1.5}
              strokeDasharray="5,3"
              markerEnd="url(#arrow)"
            />
          ))}
          <defs>
            <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="#C5C3BF" />
            </marker>
          </defs>

          {/* Nodes */}
          {nodes.map(node => {
            const isSelected = node.id === selectedId;
            const rx = node.type === 'category' ? 22 : node.type === 'code' ? 9 : 5;
            const fontSize = node.type === 'category' ? 13 : 12;
            const fontWeight = node.type === 'category' ? 800 : node.type === 'code' ? 700 : 500;

            return (
              <g
                key={node.id}
                transform={`translate(${node.x},${node.y})`}
                onMouseDown={e => handleNodeMouseDown(e, node.id)}
                style={{ cursor: 'grab' }}
              >
                <rect
                  width={node.width}
                  height={node.height}
                  rx={rx}
                  fill={node.type === 'category' ? node.color : `${node.color}${node.type === 'code' ? '22' : '15'}`}
                  stroke={isSelected ? '#333' : node.color}
                  strokeWidth={isSelected ? 2.5 : node.type === 'category' ? 0 : 1.5}
                  filter={isSelected ? 'drop-shadow(0 0 6px rgba(0,0,0,0.25))' : 'drop-shadow(0 1px 4px rgba(0,0,0,0.1))'}
                />
                <text
                  x={node.width / 2}
                  y={node.height / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={fontSize}
                  fontWeight={fontWeight}
                  fill={node.type === 'category' ? 'white' : node.color}
                  style={{ pointerEvents: 'none' }}
                >
                  {node.label.length > 16 ? node.label.slice(0, 15) + '…' : node.label}
                </text>
                {node.type !== 'category' && (
                  <text
                    x={node.width - 6}
                    y={8}
                    textAnchor="end"
                    fontSize={8}
                    fill={node.color}
                    opacity={0.6}
                    style={{ pointerEvents: 'none' }}
                  >
                    {typeLabel(node.type)}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </Canvas>

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: 16, right: 16,
        background: 'white', border: '1px solid var(--border)', borderRadius: 10,
        padding: '10px 14px', fontSize: 11, display: 'flex', flexDirection: 'column', gap: 6,
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
      }}>
        <div style={{ fontWeight: 700, fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>범례</div>
        {[
          { color: '#4A6FA5', label: '분류 (Category)', shape: 'pill' },
          { color: '#E07B54', label: '코드 (Code)', shape: 'rect' },
          { color: '#61D9A5', label: '그룹 (Group)', shape: 'rect' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: l.shape === 'pill' ? 28 : 20, height: 14,
              background: l.color + (l.shape === 'pill' ? '' : '22'),
              border: l.shape === 'pill' ? 'none' : `1.5px solid ${l.color}`,
              borderRadius: l.shape === 'pill' ? 99 : 4,
            }} />
            <span style={{ color: 'var(--text-secondary)' }}>{l.label}</span>
          </div>
        ))}
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, borderTop: '1px solid var(--border)', paddingTop: 5 }}>
          노드 드래그로 위치 변경 가능
        </div>
      </div>
    </Wrap>
  );
};
