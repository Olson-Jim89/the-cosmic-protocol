"use client";

/**
 * BattleMap — two-layer canvas battle map editor.
 *
 * Architecture:
 *   - Floor layer  : uploaded image (base)
 *   - Wall layer   : uploaded image drawn on top
 *   - Canvas paints floor, then draws wall with globalCompositeOperation='destination-out'
 *     cut through by polygon "rooms" so the floor shows through
 *
 * Tools:
 *   room  — click to place polygon vertices; double-click or press Enter to close
 *   wall  — click start → click end to place a wall segment
 *   door  — click near a wall to place a door midpoint on it
 *   select — click room/wall/door to select & delete
 */

import {
  useRef,
  useEffect,
  useState,
  useCallback,
  MouseEvent as RMouseEvent,
  KeyboardEvent as RKeyboardEvent,
} from "react";
import type { BattleMapData, BattleMapRoom, BattleMapWall, BattleMapDoor } from "@/lib/types";

type Tool = "room" | "wall" | "door" | "select";

interface Props {
  floorUrl: string | null;
  wallUrl: string | null;
  mapData: BattleMapData;
  onChange: (data: BattleMapData) => void;
  readOnly?: boolean;
}

const GRID = 40; // px per cell
const SNAP = true;

function snap(v: number, g: number) { return SNAP ? Math.round(v / g) * g : v; }

function ptNear(ax: number, ay: number, bx: number, by: number, thresh = 12) {
  return Math.hypot(ax - bx, ay - by) < thresh;
}

/** Returns t in [0,1] for projection of P onto segment AB, and distance */
function projectOntoSegment(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number
): { t: number; dist: number } {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return { t: 0, dist: Math.hypot(px - ax, py - ay) };
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  const qx = ax + t * dx, qy = ay + t * dy;
  return { t, dist: Math.hypot(px - qx, py - qy) };
}

function uid() { return Math.random().toString(36).slice(2, 10); }

export default function BattleMap({ floorUrl, wallUrl, mapData, onChange, readOnly = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const floorImgRef = useRef<HTMLImageElement | null>(null);
  const wallImgRef = useRef<HTMLImageElement | null>(null);

  const [tool, setTool] = useState<Tool>("room");
  const [polyPts, setPolyPts] = useState<[number, number][]>([]); // in-progress room
  const [wallStart, setWallStart] = useState<[number, number] | null>(null);
  const [cursor, setCursor] = useState<[number, number]>([0, 0]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rooms = mapData.rooms ?? [];
  const walls = mapData.walls ?? [];
  const doors = mapData.doors ?? [];

  // ── load images ──────────────────────────────────────────
  useEffect(() => {
    if (!floorUrl) { floorImgRef.current = null; return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { floorImgRef.current = img; redraw(); };
    img.src = floorUrl;
  }, [floorUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!wallUrl) { wallImgRef.current = null; return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { wallImgRef.current = img; redraw(); };
    img.src = wallUrl;
  }, [wallUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── canvas size ──────────────────────────────────────────
  const COLS = 20, ROWS = 14;
  const W = COLS * GRID, H = ROWS * GRID;

  // ── redraw ────────────────────────────────────────────────
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, W, H);

    // 1 — floor
    if (floorImgRef.current) {
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(floorImgRef.current, 0, 0, W, H);
    } else {
      ctx.fillStyle = "#0d1520";
      ctx.fillRect(0, 0, W, H);
    }

    // 2 — wall layer (drawn into offscreen, then composite)
    if (wallImgRef.current && rooms.length > 0) {
      const off = document.createElement("canvas");
      off.width = W; off.height = H;
      const octx = off.getContext("2d")!;
      // draw the wall image
      octx.drawImage(wallImgRef.current, 0, 0, W, H);
      // punch rooms out
      octx.globalCompositeOperation = "destination-out";
      rooms.forEach((room) => {
        if (room.points.length < 2) return;
        octx.beginPath();
        octx.moveTo(room.points[0][0], room.points[0][1]);
        room.points.slice(1).forEach(([x, y]) => octx.lineTo(x, y));
        octx.closePath();
        octx.fill();
      });
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(off, 0, 0);
    } else if (wallImgRef.current) {
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(wallImgRef.current, 0, 0, W, H);
    }

    // 3 — grid overlay
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= W; x += GRID) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += GRID) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // 4 — rooms (outline)
    rooms.forEach((room) => {
      if (room.points.length < 2) return;
      const isSel = selectedId === room.id;
      ctx.beginPath();
      ctx.moveTo(room.points[0][0], room.points[0][1]);
      room.points.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.closePath();
      ctx.strokeStyle = isSel ? "#47BEFF" : "rgba(71,190,255,0.45)";
      ctx.lineWidth = isSel ? 2 : 1.5;
      ctx.stroke();
      if (!wallImgRef.current) {
        ctx.fillStyle = "rgba(71,190,255,0.07)";
        ctx.fill();
      }
      // label
      if (room.label) {
        const cx = room.points.reduce((s, p) => s + p[0], 0) / room.points.length;
        const cy = room.points.reduce((s, p) => s + p[1], 0) / room.points.length;
        ctx.fillStyle = "rgba(71,190,255,0.7)";
        ctx.font = "10px var(--font-orbitron, sans-serif)";
        ctx.textAlign = "center";
        ctx.fillText(room.label, cx, cy);
      }
    });

    // 5 — walls
    walls.forEach((wall) => {
      const [[ax, ay], [bx, by]] = wall.points;
      const isSel = selectedId === wall.id;
      ctx.beginPath();
      ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
      ctx.strokeStyle = isSel ? "#FFCC33" : wall.color;
      ctx.lineWidth = isSel ? wall.thickness + 1 : wall.thickness;
      ctx.lineCap = "round";
      ctx.stroke();
    });

    // 6 — doors
    doors.forEach((door) => {
      const wall = walls.find((w) => w.id === door.wallId);
      if (!wall) return;
      const [[ax, ay], [bx, by]] = wall.points;
      const mx = ax + door.t * (bx - ax);
      const my = ay + door.t * (by - ay);
      const isSel = selectedId === door.id;
      const hw = door.width / 2;
      const angle = Math.atan2(by - ay, bx - ax);
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(angle);
      ctx.strokeStyle = isSel ? "#59DD9D" : "#59DD9D";
      ctx.lineWidth = 3;
      ctx.strokeRect(-hw, -6, door.width, 12);
      ctx.fillStyle = "rgba(89,221,157,0.15)";
      ctx.fillRect(-hw, -6, door.width, 12);
      ctx.restore();
    });

    // 7 — in-progress room polygon
    if (tool === "room" && polyPts.length > 0) {
      ctx.beginPath();
      ctx.moveTo(polyPts[0][0], polyPts[0][1]);
      polyPts.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.lineTo(cursor[0], cursor[1]);
      ctx.strokeStyle = "rgba(71,190,255,0.6)";
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);
      // first-point close indicator
      if (polyPts.length >= 3 && ptNear(cursor[0], cursor[1], polyPts[0][0], polyPts[0][1])) {
        ctx.beginPath();
        ctx.arc(polyPts[0][0], polyPts[0][1], 8, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(71,190,255,0.4)";
        ctx.fill();
      }
      // vertices
      polyPts.forEach(([x, y]) => {
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#47BEFF"; ctx.fill();
      });
    }

    // 8 — in-progress wall line
    if (tool === "wall" && wallStart) {
      ctx.beginPath();
      ctx.moveTo(wallStart[0], wallStart[1]);
      ctx.lineTo(cursor[0], cursor[1]);
      ctx.strokeStyle = "rgba(255,204,51,0.7)";
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
    }

  }, [rooms, walls, doors, polyPts, wallStart, cursor, tool, selectedId, W, H]);

  useEffect(() => { redraw(); }, [redraw]);

  // ── pointer helpers ───────────────────────────────────────
  function canvasPt(e: RMouseEvent<HTMLCanvasElement>): [number, number] {
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = W / rect.width, sy = H / rect.height;
    return [
      snap((e.clientX - rect.left) * sx, GRID),
      snap((e.clientY - rect.top) * sy, GRID),
    ];
  }

  function handleMouseMove(e: RMouseEvent<HTMLCanvasElement>) {
    const [x, y] = canvasPt(e);
    setCursor([x, y]);
  }

  function handleClick(e: RMouseEvent<HTMLCanvasElement>) {
    if (readOnly) return;
    const [x, y] = canvasPt(e);

    if (tool === "select") {
      // find what was clicked
      let hit: string | null = null;
      // doors first
      for (const door of doors) {
        const wall = walls.find((w) => w.id === door.wallId);
        if (!wall) continue;
        const [[ax, ay], [bx, by]] = wall.points;
        const mx = ax + door.t * (bx - ax);
        const my = ay + door.t * (by - ay);
        if (ptNear(x, y, mx, my, 16)) { hit = door.id; break; }
      }
      // walls
      if (!hit) {
        for (const wall of walls) {
          const { dist } = projectOntoSegment(x, y, wall.points[0][0], wall.points[0][1], wall.points[1][0], wall.points[1][1]);
          if (dist < 8) { hit = wall.id; break; }
        }
      }
      // rooms
      if (!hit) {
        for (const room of rooms) {
          if (pointInPolygon(x, y, room.points)) { hit = room.id; break; }
        }
      }
      setSelectedId(hit);
      return;
    }

    if (tool === "room") {
      if (polyPts.length >= 3 && ptNear(x, y, polyPts[0][0], polyPts[0][1])) {
        closeRoom();
        return;
      }
      setPolyPts((prev) => [...prev, [x, y]]);
      return;
    }

    if (tool === "wall") {
      if (!wallStart) {
        setWallStart([x, y]);
        return;
      }
      const newWall: BattleMapWall = {
        id: uid(),
        points: [wallStart, [x, y]],
        thickness: 4,
        color: "#8B9EAA",
      };
      onChange({ ...mapData, walls: [...walls, newWall] });
      setWallStart(null);
      return;
    }

    if (tool === "door") {
      // Find nearest wall
      let bestWall: BattleMapWall | null = null, bestT = 0, bestDist = Infinity;
      for (const wall of walls) {
        const { t, dist } = projectOntoSegment(x, y, wall.points[0][0], wall.points[0][1], wall.points[1][0], wall.points[1][1]);
        if (dist < bestDist) { bestDist = dist; bestWall = wall; bestT = t; }
      }
      if (!bestWall || bestDist > 24) return;
      const door: BattleMapDoor = { id: uid(), wallId: bestWall.id, t: bestT, width: 40 };
      onChange({ ...mapData, doors: [...doors, door] });
      return;
    }
  }

  function handleDblClick(e: RMouseEvent<HTMLCanvasElement>) {
    if (tool === "room" && polyPts.length >= 3) {
      e.preventDefault();
      closeRoom();
    }
  }

  function closeRoom() {
    const room: BattleMapRoom = { id: uid(), points: polyPts };
    onChange({ ...mapData, rooms: [...rooms, room] });
    setPolyPts([]);
  }

  function handleKeyDown(e: RKeyboardEvent<HTMLCanvasElement>) {
    if (e.key === "Enter" && tool === "room" && polyPts.length >= 3) { closeRoom(); return; }
    if (e.key === "Escape") {
      setPolyPts([]);
      setWallStart(null);
      setSelectedId(null);
      return;
    }
    if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
      deleteSelected();
      return;
    }
  }

  function deleteSelected() {
    if (!selectedId) return;
    onChange({
      ...mapData,
      rooms: rooms.filter((r) => r.id !== selectedId),
      walls: walls.filter((w) => w.id !== selectedId),
      doors: doors.filter((d) => d.id !== selectedId),
    });
    setSelectedId(null);
  }

  const toolDefs: { id: Tool; label: string; color: string; hint: string }[] = [
    { id: "room",   label: "Room",   color: "var(--blue)",   hint: "Click to place vertices · dbl-click or Enter to close" },
    { id: "wall",   label: "Wall",   color: "var(--yellow)", hint: "Click start, click end" },
    { id: "door",   label: "Door",   color: "var(--green)",  hint: "Click near a wall to place a door" },
    { id: "select", label: "Select", color: "var(--muted)",  hint: "Click room/wall/door · Delete to remove" },
  ];

  const curTool = toolDefs.find((t) => t.id === tool)!;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* toolbar */}
      {!readOnly && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {toolDefs.map((td) => (
            <button
              key={td.id}
              onClick={() => { setTool(td.id); setPolyPts([]); setWallStart(null); }}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                border: tool === td.id ? `2px solid ${td.color}` : "1px solid var(--line)",
                background: tool === td.id ? `${td.color}22` : "rgba(255,255,255,0.04)",
                color: tool === td.id ? td.color : "var(--muted)",
                fontFamily: "var(--font-orbitron, sans-serif)",
                textTransform: "uppercase",
                fontSize: "0.65rem",
                letterSpacing: "0.08em",
                cursor: "pointer",
              }}
            >
              {td.label}
            </button>
          ))}
          {selectedId && (
            <button
              onClick={deleteSelected}
              style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(255,80,80,0.4)", background: "rgba(255,60,60,0.12)", color: "#ff9999", fontSize: "0.65rem", fontFamily: "var(--font-orbitron, sans-serif)", textTransform: "uppercase", letterSpacing: "0.08em", cursor: "pointer" }}
            >
              Delete Selected
            </button>
          )}
          <span style={{ fontSize: "0.68rem", color: "var(--muted)", marginLeft: 6 }}>{curTool.hint}</span>
        </div>
      )}

      {/* canvas */}
      <div style={{ border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden", lineHeight: 0 }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          style={{ width: "100%", display: "block", cursor: readOnly ? "default" : tool === "select" ? "pointer" : "crosshair" }}
          onMouseMove={handleMouseMove}
          onClick={handleClick}
          onDoubleClick={handleDblClick}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        />
      </div>

      {/* legend */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {[
          { color: "rgba(71,190,255,0.45)", label: "Room boundary" },
          { color: "#8B9EAA", label: "Wall" },
          { color: "#59DD9D", label: "Door" },
        ].map(({ color, label }) => (
          <span key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.7rem", color: "var(--muted)" }}>
            <span style={{ width: 20, height: 3, background: color, borderRadius: 2, display: "inline-block" }} />
            {label}
          </span>
        ))}
        <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>Rooms: {rooms.length} · Walls: {walls.length} · Doors: {doors.length}</span>
      </div>
    </div>
  );
}

/** Point-in-polygon (ray-cast) */
function pointInPolygon(x: number, y: number, pts: [number, number][]) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
