/**
 * ComponentPinDiagram — visual SVG-based pin mapper for external components.
 *
 * Mirrors MpuPinDiagram but for the component side: clicking a pin connects
 * it to the currently-active MPU pin.  Shows which MPU pin each component
 * pin is wired to, and highlights pins that are ready to be connected.
 */
import { useMemo, useEffect, useState, useRef } from 'react';
import DOMPurify from 'dompurify';
import { parseSvgPinPositions } from '../utils/fritzing';
import './MpuPinDiagram.css';

// Layout constants (mirrors MpuPinDiagram)
const SIDE_LABEL_W = 76;
const SIDE_LABEL_H = 5.6;
const SIDE_LABEL_HALF_H = SIDE_LABEL_H / 2;
const SIDE_BOARD_GAP = 9;
const TB_LABEL_W = 20;
const TB_LABEL_H = 5.6;
const TB_NEAR = 10;
const TB_FAR = TB_NEAR + TB_LABEL_H + 2;
const PAD_LEFT = SIDE_LABEL_W + SIDE_BOARD_GAP + 2;
const PAD_RIGHT = SIDE_LABEL_W + SIDE_BOARD_GAP + 2;
const PAD_TOP = TB_FAR + TB_LABEL_H + 3;
const PAD_BOTTOM = TB_FAR + TB_LABEL_H + 3;

const ZOOM = 2.5;

function assignSides(positions, boardW, boardH) {
  const CX_TOL = boardW * 0.06;
  const CY_TOL = boardH * 0.06;
  const entries = Object.entries(positions);
  const sides = {};
  entries.forEach(([id, { cx, cy }]) => {
    const sameCol = entries.filter(([, p]) => Math.abs(p.cx - cx) <= CX_TOL);
    const sameRow = entries.filter(([, p]) => Math.abs(p.cy - cy) <= CY_TOL);
    if (sameCol.length >= sameRow.length && sameCol.length >= 3) {
      sides[id] = cx <= boardW / 2 ? 'left' : 'right';
    } else if (sameRow.length >= 3) {
      sides[id] = cy <= boardH / 2 ? 'top' : 'bottom';
    } else {
      const dists = [
        ['left',   cx / boardW],
        ['right',  (boardW - cx) / boardW],
        ['top',    cy / boardH],
        ['bottom', (boardH - cy) / boardH],
      ];
      sides[id] = dists.reduce((a, b) => (a[1] < b[1] ? a : b))[0];
    }
  });
  return sides;
}

function getPrimaryLabel(pin) {
  if (!pin.description) return pin.name;
  const first = pin.description.split('/')[0].trim();
  return first.split(' ')[0];
}

function trunc(str, maxLen) {
  if (!str || str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}

// ─── Component ──────────────────────────────────────────────────────────────

const ComponentPinDiagram = ({
  svgRaw,
  svgUrl,
  pins,
  instanceId,
  mappings,
  activeMpuPinId,
  hoveredMpuPinId,
  mpuPins,
  onPinClick,
  onPinHover,
}) => {
  const [resolvedSvgRaw, setResolvedSvgRaw] = useState(svgRaw || null);
  useEffect(() => {
    if (svgRaw) { setResolvedSvgRaw(svgRaw); return; }
    if (!svgUrl) return;
    let cancelled = false;
    fetch(svgUrl)
      .then((r) => r.text())
      .then((text) => { if (!cancelled) setResolvedSvgRaw(text); })
      .catch((err) => console.error('Failed to fetch component SVG:', err));
    return () => { cancelled = true; };
  }, [svgRaw, svgUrl]);

  const [boardUrl, setBoardUrl] = useState(null);
  useEffect(() => {
    if (!resolvedSvgRaw) return;
    const sanitized = DOMPurify.sanitize(resolvedSvgRaw, { USE_PROFILES: { svg: true, svgFilters: true } });
    const blob = new Blob([sanitized], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    setBoardUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [resolvedSvgRaw]);

  const svgIds = useMemo(
    () => (pins || []).map((p) => p.svgId).filter(Boolean),
    [pins],
  );

  const { positions, boardW, boardH } = useMemo(
    () => parseSvgPinPositions(resolvedSvgRaw || '', svgIds),
    [resolvedSvgRaw, svgIds],
  );

  const sides = useMemo(() => {
    if (!boardW || !boardH || !Object.keys(positions).length) return {};
    return assignSides(positions, boardW, boardH);
  }, [positions, boardW, boardH]);

  const tbStagger = useMemo(() => {
    const stagger = {};
    ['top', 'bottom'].forEach((side) => {
      const pinsOnSide = (pins || [])
        .filter((p) => p.svgId && sides[p.svgId] === side)
        .map((p) => ({ id: p.id, svgId: p.svgId, cx: positions[p.svgId]?.cx ?? 0 }))
        .sort((a, b) => a.cx - b.cx);
      pinsOnSide.forEach((p, i) => { stagger[p.id] = i % 2; });
    });
    return stagger;
  }, [pins, sides, positions]);

  const pinLayout = useMemo(() => {
    if (!boardW || !boardH) return {};
    const layout = {};
    (pins || []).forEach((pin) => {
      if (!pin.svgId) return;
      const pos = positions[pin.svgId];
      if (!pos) return;
      const side = sides[pin.svgId];
      if (!side) return;
      layout[pin.id] = { cx: PAD_LEFT + pos.cx, cy: PAD_TOP + pos.cy, side };
    });
    return layout;
  }, [pins, positions, sides, boardW, boardH]);

  // Reverse mapping: componentPinId → mpuPinId (for this instance)
  const reverseMapping = useMemo(() => {
    const map = {};
    Object.entries(mappings || {}).forEach(([mpuPinId, m]) => {
      if (m.instanceId === instanceId) {
        map[m.componentPinId] = mpuPinId;
      }
    });
    return map;
  }, [mappings, instanceId]);

  const getMpuPinName = (mpuPinId) =>
    (mpuPins || []).find((p) => p.id === mpuPinId)?.name || mpuPinId;

  // Magnifier
  const svgRef = useRef(null);
  const [lens, setLens] = useState(null);
  const lensClipId = useMemo(() => `clens-${Math.random().toString(36).slice(2, 8)}`, []);
  const lensR = boardW && boardH ? Math.min(boardW, boardH) * 0.28 : 15;

  const handleMouseMove = (e) => {
    const svg = svgRef.current;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const sp = pt.matrixTransform(svg.getScreenCTM().inverse());
    setLens({ x: sp.x, y: sp.y });
  };

  const svgW = PAD_LEFT + boardW + PAD_RIGHT;
  const svgH = PAD_TOP + boardH + PAD_BOTTOM;
  const boardX = PAD_LEFT;
  const boardY = PAD_TOP;
  const leftLabelRight = boardX - SIDE_BOARD_GAP;
  const leftLabelX = leftLabelRight - SIDE_LABEL_W;
  const rightLabelLeft = boardX + boardW + SIDE_BOARD_GAP;

  if (!resolvedSvgRaw) {
    return <p className="mpu-diagram-placeholder">Loading component diagram…</p>;
  }
  if (!boardW || !boardH) {
    return <p className="mpu-diagram-placeholder">No SVG data available for this component.</p>;
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${svgW} ${svgH}`}
      className="mpu-pin-diagram"
      xmlns="http://www.w3.org/2000/svg"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setLens(null)}
    >
      {boardUrl && (
        <image
          href={boardUrl}
          x={boardX}
          y={boardY}
          width={boardW}
          height={boardH}
          preserveAspectRatio="xMidYMid meet"
        />
      )}

      {(pins || []).map((pin) => {
        const layout = pinLayout[pin.id];
        if (!layout) return null;

        const { cx: pinX, cy: pinY, side } = layout;

        const mappedMpuPinId = reverseMapping[pin.id];
        const isMapped = Boolean(mappedMpuPinId);
        const isCurrentTarget =
          activeMpuPinId &&
          mappings?.[activeMpuPinId]?.instanceId === instanceId &&
          mappings?.[activeMpuPinId]?.componentPinId === pin.id;
        const isHoveredTarget =
          hoveredMpuPinId &&
          mappings?.[hoveredMpuPinId]?.instanceId === instanceId &&
          mappings?.[hoveredMpuPinId]?.componentPinId === pin.id;
        const isReady = Boolean(activeMpuPinId) && !isMapped && !isCurrentTarget;

        let fillColor, strokeColor, textColor, lineColor, lineW, dotFill;
        if (isCurrentTarget) {
          fillColor = '#dbeafe'; strokeColor = '#3b82f6'; textColor = '#1d4ed8';
          lineColor = '#93c5fd'; lineW = 0.65; dotFill = '#3b82f6';
        } else if (isHoveredTarget) {
          fillColor = '#fef3c7'; strokeColor = '#f59e0b'; textColor = '#92400e';
          lineColor = '#fde68a'; lineW = 0.65; dotFill = '#f59e0b';
        } else if (isMapped) {
          fillColor = '#dcfce7'; strokeColor = '#16a34a'; textColor = '#15803d';
          lineColor = '#86efac'; lineW = 0.65; dotFill = '#16a34a';
        } else if (isReady) {
          fillColor = '#f0f9ff'; strokeColor = '#7dd3fc'; textColor = '#374151';
          lineColor = '#e0f2fe'; lineW = 0.45; dotFill = '#38bdf8';
        } else {
          fillColor = '#f8fafc'; strokeColor = '#cbd5e1'; textColor = '#374151';
          lineColor = '#e2e8f0'; lineW = 0.45; dotFill = '#94a3b8';
        }

        const primary = getPrimaryLabel(pin);
        const handlers = {
          style: { cursor: activeMpuPinId ? 'pointer' : 'default' },
          onClick: () => activeMpuPinId && onPinClick?.(pin.id),
          onMouseEnter: () => onPinHover?.(pin.id),
          onMouseLeave: () => onPinHover?.(null),
        };

        // ── Left ─────────────────────────────────────────────────────────────
        if (side === 'left') {
          const labelY = pinY - SIDE_LABEL_HALF_H;
          const pinNameX = leftLabelX + SIDE_LABEL_W - 2;
          const mappingX = leftLabelX + 2;

          return (
            <g key={pin.id} {...handlers}>
              <line x1={leftLabelRight} y1={pinY} x2={pinX} y2={pinY} stroke={lineColor} strokeWidth={lineW} />
              <rect x={leftLabelX} y={labelY} width={SIDE_LABEL_W} height={SIDE_LABEL_H} rx="1.3" fill={fillColor} stroke={strokeColor} strokeWidth="0.5" />
              <text x={pinNameX} y={pinY + 0.3} fontSize="2.9" fontWeight="600" fill={textColor} textAnchor="end" dominantBaseline="middle" fontFamily="ui-monospace,monospace">{primary}</text>
              {isCurrentTarget ? (
                <text x={mappingX} y={pinY + 0.3} fontSize="2.5" fill="#1d4ed8" textAnchor="start" dominantBaseline="middle">● {trunc(getMpuPinName(activeMpuPinId), 9)}</text>
              ) : isMapped ? (
                <text x={mappingX} y={pinY + 0.3} fontSize="2.6" fill={textColor} textAnchor="start" dominantBaseline="middle">{trunc(getMpuPinName(mappedMpuPinId), 10)}</text>
              ) : null}
              <circle cx={pinX} cy={pinY} r={1.3} fill={dotFill} stroke="white" strokeWidth="0.4" />
            </g>
          );
        }

        // ── Right ─────────────────────────────────────────────────────────────
        if (side === 'right') {
          const labelY = pinY - SIDE_LABEL_HALF_H;
          const pinNameX = rightLabelLeft + 2;
          const mappingX = rightLabelLeft + SIDE_LABEL_W - 2;

          return (
            <g key={pin.id} {...handlers}>
              <line x1={pinX} y1={pinY} x2={rightLabelLeft} y2={pinY} stroke={lineColor} strokeWidth={lineW} />
              <rect x={rightLabelLeft} y={labelY} width={SIDE_LABEL_W} height={SIDE_LABEL_H} rx="1.3" fill={fillColor} stroke={strokeColor} strokeWidth="0.5" />
              <text x={pinNameX} y={pinY + 0.3} fontSize="2.9" fontWeight="600" fill={textColor} textAnchor="start" dominantBaseline="middle" fontFamily="ui-monospace,monospace">{primary}</text>
              {isCurrentTarget ? (
                <text x={mappingX} y={pinY + 0.3} fontSize="2.5" fill="#1d4ed8" textAnchor="end" dominantBaseline="middle">{trunc(getMpuPinName(activeMpuPinId), 9)} ●</text>
              ) : isMapped ? (
                <text x={mappingX} y={pinY + 0.3} fontSize="2.6" fill={textColor} textAnchor="end" dominantBaseline="middle">{trunc(getMpuPinName(mappedMpuPinId), 10)}</text>
              ) : null}
              <circle cx={pinX} cy={pinY} r={1.3} fill={dotFill} stroke="white" strokeWidth="0.4" />
            </g>
          );
        }

        // ── Top / Bottom ───────────────────────────────────────────────────────
        if (side === 'top' || side === 'bottom') {
          const staggerIdx = tbStagger[pin.id] ?? 0;
          const dist = staggerIdx === 0 ? TB_NEAR : TB_FAR;
          const labelX = pinX - TB_LABEL_W / 2;
          let labelY, lineY1, lineY2;
          if (side === 'top') {
            labelY = boardY - dist - TB_LABEL_H;
            lineY1 = labelY + TB_LABEL_H;
            lineY2 = pinY;
          } else {
            labelY = boardY + boardH + dist;
            lineY1 = pinY;
            lineY2 = labelY;
          }
          const labelCY = labelY + TB_LABEL_H / 2;

          return (
            <g key={pin.id} {...handlers}>
              <line x1={pinX} y1={lineY1} x2={pinX} y2={lineY2} stroke={lineColor} strokeWidth={lineW} />
              <rect x={labelX} y={labelY} width={TB_LABEL_W} height={TB_LABEL_H} rx="1.2" fill={fillColor} stroke={strokeColor} strokeWidth="0.5" />
              <text x={pinX} y={labelCY + 0.3} fontSize="2.6" fontWeight="600" fill={textColor} textAnchor="middle" dominantBaseline="middle" fontFamily="ui-monospace,monospace">
                {trunc(primary, 7)}
              </text>
              <circle cx={pinX} cy={pinY} r={1.3} fill={dotFill} stroke="white" strokeWidth="0.4" />
            </g>
          );
        }

        return null;
      })}

      {/* Magnifier lens */}
      {lens && boardUrl && (
        <g style={{ pointerEvents: 'none' }}>
          <defs>
            <clipPath id={lensClipId}>
              <circle cx={lens.x} cy={lens.y} r={lensR} />
            </clipPath>
          </defs>
          <image
            href={boardUrl}
            x={lens.x + (boardX - lens.x) * ZOOM}
            y={lens.y + (boardY - lens.y) * ZOOM}
            width={boardW * ZOOM}
            height={boardH * ZOOM}
            clipPath={`url(#${lensClipId})`}
            preserveAspectRatio="xMidYMid meet"
          />
          <circle cx={lens.x} cy={lens.y} r={lensR} fill="none" stroke="#475569" strokeWidth="1.2" opacity="0.8" />
        </g>
      )}
    </svg>
  );
};

export default ComponentPinDiagram;
