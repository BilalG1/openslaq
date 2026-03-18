import { useState, useRef, useEffect, useCallback } from "react";
import { LayoutGrid, Sun, Moon } from "lucide-react";
import type { Scenario } from "./scenarios";
import { useTheme } from "../theme/ThemeProvider";

type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

const MARGIN = 16;
const BUTTON_SIZE = 48;
const STORAGE_KEY = "gallery-overlay-corner";

function getCornerPosition(corner: Corner) {
  switch (corner) {
    case "top-left":
      return { top: MARGIN, left: MARGIN };
    case "top-right":
      return { top: MARGIN, right: MARGIN };
    case "bottom-left":
      return { bottom: MARGIN, left: MARGIN };
    case "bottom-right":
      return { bottom: MARGIN, right: MARGIN };
  }
}

function nearestCorner(x: number, y: number): Corner {
  const midX = window.innerWidth / 2;
  const midY = window.innerHeight / 2;
  if (x < midX) return y < midY ? "top-left" : "bottom-left";
  return y < midY ? "top-right" : "bottom-right";
}

function loadCorner(): Corner {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val === "top-left" || val === "top-right" || val === "bottom-left" || val === "bottom-right") return val;
  } catch {}
  return "bottom-right";
}

interface GalleryOverlayProps {
  scenarios: Scenario[];
  activeId: string;
  onSelect: (id: string) => void;
}

export function GalleryOverlay({ scenarios, activeId, onSelect }: GalleryOverlayProps) {
  const { mode, cycle: cycleTheme } = useTheme();
  const [corner, setCorner] = useState<Corner>(loadCorner);
  const [expanded, setExpanded] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);

  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const didDrag = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Persist corner
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, corner);
    } catch {}
  }, [corner]);

  // Keyboard navigation (Escape to close, arrow keys to navigate)
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setExpanded(false);
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const currentIndex = scenarios.findIndex((s) => s.id === activeId);
        let nextIndex: number;
        if (e.key === "ArrowDown") {
          nextIndex = currentIndex + 1 >= scenarios.length ? 0 : currentIndex + 1;
        } else {
          nextIndex = currentIndex - 1 < 0 ? scenarios.length - 1 : currentIndex - 1;
        }
        const nextId = scenarios[nextIndex]!.id;
        onSelect(nextId);
        const el = panelRef.current?.querySelector(`[data-scenario-id="${nextId}"]`);
        el?.scrollIntoView({ block: "nearest" });
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [expanded, scenarios, activeId, onSelect]);

  // Close on click outside
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [expanded]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    pointerStart.current = { x: e.clientX, y: e.clientY };
    didDrag.current = false;
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!pointerStart.current) return;
    const dx = e.clientX - pointerStart.current.x;
    const dy = e.clientY - pointerStart.current.y;
    if (!didDrag.current && Math.abs(dx) + Math.abs(dy) < 5) return;
    didDrag.current = true;
    setDragging(true);
    setExpanded(false);
    setDragPos({ x: e.clientX - BUTTON_SIZE / 2, y: e.clientY - BUTTON_SIZE / 2 });
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!pointerStart.current) return;
    pointerStart.current = null;
    if (didDrag.current) {
      const newCorner = nearestCorner(e.clientX, e.clientY);
      setCorner(newCorner);
      setDragPos(null);
      setDragging(false);
    } else {
      setExpanded((prev) => !prev);
    }
  }, []);

  const activeScenario = scenarios.find((s) => s.id === activeId);
  const cornerPos = getCornerPosition(corner);
  const isRight = corner.includes("right");
  const isBottom = corner.includes("bottom");

  const buttonStyle: React.CSSProperties = dragging && dragPos
    ? { position: "fixed", left: dragPos.x, top: dragPos.y, transition: "none" }
    : {
        position: "fixed",
        ...cornerPos,
        transition: "all 200ms ease-out",
      };

  return (
    <div ref={containerRef}>
      {/* Floating button */}
      <div
        style={buttonStyle}
        className="z-[9999] select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <button
          type="button"
          className="w-12 h-12 rounded-full bg-gray-900/70 hover:bg-gray-900/90 text-white flex items-center justify-center shadow-lg backdrop-blur-sm cursor-grab active:cursor-grabbing transition-colors border border-white/30"
          title={activeScenario?.label ?? "Gallery"}
        >
          <LayoutGrid className="w-5 h-5" />
        </button>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div
          ref={panelRef}
          style={{
            position: "fixed",
            ...(isRight ? { right: MARGIN } : { left: MARGIN }),
            ...(isBottom
              ? { bottom: MARGIN + BUTTON_SIZE + 8 }
              : { top: MARGIN + BUTTON_SIZE + 8 }),
          }}
          className="z-[9999] w-[280px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Scenarios</div>
            <button
              type="button"
              onClick={cycleTheme}
              className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors border-none cursor-pointer"
              title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {mode === "dark" ? (
                <Sun size={14} />
              ) : (
                <Moon size={14} />
              )}
            </button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-1.5">
            {scenarios.map((scenario) => (
              <button
                key={scenario.id}
                type="button"
                onClick={() => {
                  onSelect(scenario.id);
                }}
                data-scenario-id={scenario.id}
                className={`w-full text-left px-3 py-1.5 rounded-lg mb-0.5 border-none cursor-pointer transition-colors ${
                  activeId === scenario.id
                    ? "bg-indigo-50 text-indigo-700"
                    : "bg-transparent text-gray-700 hover:bg-gray-50"
                }`}
              >
                <div className="font-medium text-sm">{scenario.label}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
