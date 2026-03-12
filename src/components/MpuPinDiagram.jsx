/**
 * MpuPinDiagram — visual SVG-based pin mapper.
 *
 * Displays a Fritzing breadboard SVG with clickable pin labels arranged
 * spatially around the board image, connected to their actual pin locations
 * by small lines.  Works with any MPU that has svg_raw data.
 *
 * Side detection: clusters pins by shared cx/cy to identify horizontal rows
 * (top/bottom) vs vertical columns (left/right), which handles both tall
 * boards (Pico W) and wide boards (Arduino Uno) correctly.
 */
import { useMemo, useEffect, useState, useRef } from 'react';
import DOMPurify from 'dompurify';
import { parseSvgPinPositions } from '../utils/fritzing';
import './MpuPinDiagram.css';

// Board offset — space reserved for side labels around the board image.
const SIDE_LABEL_W = 76;         // width of left/right label boxes
const SIDE_LABEL_H = 5.6;        // height of left/right label boxes
const SIDE_LABEL_HALF_H = SIDE_LABEL_H / 2;
const SIDE_BOARD_GAP = 9;        // gap between board edge and label box

// For top/bottom pins, labels are staggered at two distances from the board.
const TB_LABEL_W = 20;           // narrow label box for horizontal-row pins
const TB_LABEL_H = 5.6;
const TB_NEAR = 10;              // first stagger row distance from board edge
const TB_FAR = TB_NEAR + TB_LABEL_H + 2;  // second stagger row distance

// Padding around the board for the outer SVG canvas.
const PAD_LEFT = SIDE_LABEL_W + SIDE_BOARD_GAP + 2;  // space for left labels (87)
const PAD_RIGHT = SIDE_LABEL_W + SIDE_BOARD_GAP + 2; // space for right labels (87)
const PAD_TOP = TB_FAR + TB_LABEL_H + 3;              // space for top labels (~28)
const PAD_BOTTOM = TB_FAR + TB_LABEL_H + 3;           // space for bottom labels (~28)

// ─── Side assignment ────────────────────────────────────────────────────────

/**
 * Groups pins into sides by clustering: pins that share a similar x (vertical
 * column) form left/right groups; pins that share a similar y (horizontal row)
 * form top/bottom groups.  Falls back to nearest-edge for isolated pins.
 *
 * @returns {Object} map of pinSvgKey → 'left' | 'right' | 'top' | 'bottom'
 */
function assignSides(positions, boardW, boardH) {
  const CX_TOL = boardW * 0.06;
  const CY_TOL = boardH * 0.06;

  const entries = Object.entries(positions);
  const sides = {};

  entries.forEach(([id, { cx, cy }]) => {
    const sameCol = entries.filter(([, p]) => Math.abs(p.cx - cx) <= CX_TOL);
    const sameRow = entries.filter(([, p]) => Math.abs(p.cy - cy) <= CY_TOL);

    // Prefer the larger cluster — ties go to column (left/right)
    if (sameCol.length >= sameRow.length && sameCol.length >= 3) {
      sides[id] = cx <= boardW / 2 ? 'left' : 'right';
    } else if (sameRow.length >= 3) {
      sides[id] = cy <= boardH / 2 ? 'top' : 'bottom';
    } else {
      // Isolated pin — nearest edge wins
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

// ─── Helpers ────────────────────────────────────────────────────────────────

function getPrimaryLabel(pin) {
  if (!pin.description) return pin.name;
  const first = pin.description.split('/')[0].trim();
  return first.split(' ')[0];
}

function trunc(str, maxLen) {
  if (!str || str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}

const ZOOM = 2.5;

// ─── Component ──────────────────────────────────────────────────────────────

const MpuPinDiagram = ({
  svgRaw,
  svgUrl,
  pins,
  mappings,
  activePinId,
  hoveredPinId,
  onPinClick,
  onPinHover,
  onClearMapping,
}) => {
  // Resolved SVG text — may come from prop directly or fetched from svgUrl
  const [resolvedSvgRaw, setResolvedSvgRaw] = useState(svgRaw || null);
  useEffect(() => {
    if (svgRaw) {
      setResolvedSvgRaw(svgRaw);
      return;
    }
    if (!svgUrl) return;
    let cancelled = false;
    fetch(svgUrl)
      .then((r) => r.text())
      .then((text) => { if (!cancelled) setResolvedSvgRaw(text); })
      .catch((err) => console.error('Failed to fetch MPU SVG:', err));
    return () => { cancelled = true; };
  }, [svgRaw, svgUrl]);

  // Blob URL for the board image element
  const [boardUrl, setBoardUrl] = useState(null);
  useEffect(() => {
    if (!resolvedSvgRaw) return;
    const sanitized = DOMPurify.sanitize(resolvedSvgRaw, { USE_PROFILES: { svg: true, svgFilters: true } });
    const blob = new Blob([sanitized], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    setBoardUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [resolvedSvgRaw]);

  // Magnifier
  const svgRef = useRef(null);
  const [lens, setLens] = useState(null);
  const lensClipId = useMemo(() => `mlens-${Math.random().toString(36).slice(2, 8)}`, []);

  const handleMouseMove = (e) => {
    const svg = svgRef.current;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const sp = pt.matrixTransform(svg.getScreenCTM().inverse());
    setLens({ x: sp.x, y: sp.y });
  };

  // Collect the svgIds from the FZP so parseSvgPinPositions can look each one
  // up by its exact element ID rather than by pattern.
  const svgIds = useMemo(
    () => (pins || []).map((p) => p.svgId).filter(Boolean),
    [pins],
  );

  const { positions, boardW, boardH } = useMemo(
    () => parseSvgPinPositions(resolvedSvgRaw || '', svgIds),
    [resolvedSvgRaw, svgIds],
  );

  // Assign each pin's svgId to a side using cluster detection
  const sides = useMemo(() => {
    if (!boardW || !boardH || !Object.keys(positions).length) return {};
    return assignSides(positions, boardW, boardH);
  }, [positions, boardW, boardH]);

  // Compute stagger index for top/bottom pins (sort by cx to avoid overlap)
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

  // Build pin layout in canvas coordinates
  const pinLayout = useMemo(() => {
    if (!boardW || !boardH) return {};
    const layout = {};
    (pins || []).forEach((pin) => {
      if (!pin.svgId) return;
      const pos = positions[pin.svgId];
      if (!pos) return;
      const side = sides[pin.svgId];
      if (!side) return;
      layout[pin.id] = {
        cx: PAD_LEFT + pos.cx,
        cy: PAD_TOP + pos.cy,
        side,
      };
    });
    return layout;
  }, [pins, positions, sides, boardW, boardH]);

  // Canvas dimensions
  const svgW = PAD_LEFT + boardW + PAD_RIGHT;
  const svgH = PAD_TOP + boardH + PAD_BOTTOM;

  // Board position in canvas
  const boardX = PAD_LEFT;
  const boardY = PAD_TOP;

  const leftLabelRight  = boardX - SIDE_BOARD_GAP;
  const leftLabelX      = leftLabelRight - SIDE_LABEL_W;
  const rightLabelLeft  = boardX + boardW + SIDE_BOARD_GAP;

  const lensR = boardW && boardH ? Math.min(boardW, boardH) * 0.28 : 15;

  if (!resolvedSvgRaw) {
    return <p className="mpu-diagram-placeholder">Loading board diagram…</p>;
  }
  if (!boardW || !boardH) {
    return <p className="mpu-diagram-placeholder">No SVG data available for this MPU.</p>;
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
        const isActive   = activePinId === pin.id;
        const isHovered  = hoveredPinId === pin.id;
        const mapping    = mappings?.[pin.id];
        const isMapped   = Boolean(mapping);

        const fillColor   = isActive ? '#dbeafe' : isMapped ? '#dcfce7' : isHovered ? '#f1f5f9' : '#f8fafc';
        const strokeColor = isActive ? '#3b82f6' : isMapped ? '#16a34a' : '#cbd5e1';
        const textColor   = isActive ? '#1d4ed8' : isMapped ? '#15803d' : '#374151';
        const lineColor   = isActive ? '#93c5fd' : isMapped ? '#86efac' : '#e2e8f0';
        const lineW       = isActive || isMapped ? 0.65 : 0.45;
        const dotFill     = isActive ? '#3b82f6' : isMapped ? '#16a34a' : '#94a3b8';
        const primary     = getPrimaryLabel(pin);

        const handlers = {
          style: { cursor: 'pointer' },
          onClick: () => onPinClick(pin.id),
          onMouseEnter: () => onPinHover?.(pin.id),
          onMouseLeave: () => onPinHover?.(null),
        };

        // ── Left ─────────────────────────────────────────────────────────
        if (side === 'left') {
          const labelY    = pinY - SIDE_LABEL_HALF_H;
          const pinNameX  = leftLabelX + SIDE_LABEL_W - 2;
          const mappingX  = leftLabelX + 2;
          const clearCx   = leftLabelX + 3.6;

          return (
            <g key={pin.id} {...handlers}>
              <line x1={leftLabelRight} y1={pinY} x2={pinX} y2={pinY} stroke={lineColor} strokeWidth={lineW} />
              <rect x={leftLabelX} y={labelY} width={SIDE_LABEL_W} height={SIDE_LABEL_H} rx="1.3" fill={fillColor} stroke={strokeColor} strokeWidth="0.5" />
              <text x={pinNameX} y={pinY + 0.3} fontSize="2.9" fontWeight="600" fill={textColor} textAnchor="end" dominantBaseline="middle" fontFamily="ui-monospace,monospace">{primary}</text>
              {isActive ? (
                <text x={mappingX} y={pinY + 0.3} fontSize="2.5" fill="#2563eb" textAnchor="start" dominantBaseline="middle">← select component pin</text>
              ) : isMapped ? (
                <text x={mappingX + 6} y={pinY + 0.3} fontSize="2.6" fill={textColor} textAnchor="start" dominantBaseline="middle">{trunc(mapping.label, 18)}</text>
              ) : null}
              {isMapped && !isActive && (
                <g onClick={(e) => { e.stopPropagation(); onClearMapping?.(pin.id); }} style={{ cursor: 'pointer' }}>
                  <circle cx={clearCx} cy={pinY} r={2.3} fill="#fee2e2" stroke="#fca5a5" strokeWidth="0.4" />
                  <text x={clearCx} y={pinY + 0.4} fontSize="3.8" fill="#dc2626" textAnchor="middle" dominantBaseline="middle" fontWeight="bold">×</text>
                </g>
              )}
              <circle cx={pinX} cy={pinY} r={1.3} fill={dotFill} stroke="white" strokeWidth="0.4" />
            </g>
          );
        }

        // ── Right ─────────────────────────────────────────────────────────
        if (side === 'right') {
          const labelY    = pinY - SIDE_LABEL_HALF_H;
          const pinNameX  = rightLabelLeft + 2;
          const mappingX  = rightLabelLeft + SIDE_LABEL_W - 2;
          const clearCx   = rightLabelLeft + SIDE_LABEL_W - 3.6;

          return (
            <g key={pin.id} {...handlers}>
              <line x1={pinX} y1={pinY} x2={rightLabelLeft} y2={pinY} stroke={lineColor} strokeWidth={lineW} />
              <rect x={rightLabelLeft} y={labelY} width={SIDE_LABEL_W} height={SIDE_LABEL_H} rx="1.3" fill={fillColor} stroke={strokeColor} strokeWidth="0.5" />
              <text x={pinNameX} y={pinY + 0.3} fontSize="2.9" fontWeight="600" fill={textColor} textAnchor="start" dominantBaseline="middle" fontFamily="ui-monospace,monospace">{primary}</text>
              {isActive ? (
                <text x={mappingX} y={pinY + 0.3} fontSize="2.5" fill="#2563eb" textAnchor="end" dominantBaseline="middle">select component pin →</text>
              ) : isMapped ? (
                <text x={mappingX - 6} y={pinY + 0.3} fontSize="2.6" fill={textColor} textAnchor="end" dominantBaseline="middle">{trunc(mapping.label, 18)}</text>
              ) : null}
              {isMapped && !isActive && (
                <g onClick={(e) => { e.stopPropagation(); onClearMapping?.(pin.id); }} style={{ cursor: 'pointer' }}>
                  <circle cx={clearCx} cy={pinY} r={2.3} fill="#fee2e2" stroke="#fca5a5" strokeWidth="0.4" />
                  <text x={clearCx} y={pinY + 0.4} fontSize="3.8" fill="#dc2626" textAnchor="middle" dominantBaseline="middle" fontWeight="bold">×</text>
                </g>
              )}
              <circle cx={pinX} cy={pinY} r={1.3} fill={dotFill} stroke="white" strokeWidth="0.4" />
            </g>
          );
        }

        // ── Top / Bottom ──────────────────────────────────────────────────
        if (side === 'top' || side === 'bottom') {
          const staggerIdx = tbStagger[pin.id] ?? 0;
          const dist = staggerIdx === 0 ? TB_NEAR : TB_FAR;

          // Label centred on the pin's x position
          const labelX = pinX - TB_LABEL_W / 2;
          let labelY, lineY1, lineY2;

          if (side === 'top') {
            labelY = boardY - dist - TB_LABEL_H;  // above board
            lineY1 = labelY + TB_LABEL_H;          // bottom of label
            lineY2 = pinY;                          // pin dot
          } else {
            labelY = boardY + boardH + dist;        // below board
            lineY1 = pinY;                          // pin dot
            lineY2 = labelY;                        // top of label
          }

          const labelCY = labelY + TB_LABEL_H / 2;

          return (
            <g key={pin.id} {...handlers}>
              <line x1={pinX} y1={lineY1} x2={pinX} y2={lineY2} stroke={lineColor} strokeWidth={lineW} />
              <rect x={labelX} y={labelY} width={TB_LABEL_W} height={TB_LABEL_H} rx="1.2" fill={fillColor} stroke={strokeColor} strokeWidth="0.5" />
              <text x={pinX} y={labelCY + 0.3} fontSize="2.6" fontWeight="600" fill={textColor} textAnchor="middle" dominantBaseline="middle" fontFamily="ui-monospace,monospace">
                {trunc(primary, 7)}
              </text>
              {isMapped && !isActive && (
                <g onClick={(e) => { e.stopPropagation(); onClearMapping?.(pin.id); }} style={{ cursor: 'pointer' }}>
                  <circle cx={pinX + TB_LABEL_W / 2 - 2} cy={labelCY} r={2} fill="#fee2e2" stroke="#fca5a5" strokeWidth="0.35" />
                  <text x={pinX + TB_LABEL_W / 2 - 2} y={labelCY + 0.3} fontSize="3.2" fill="#dc2626" textAnchor="middle" dominantBaseline="middle" fontWeight="bold">×</text>
                </g>
              )}
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

export default MpuPinDiagram;
