import type { ComponentStory } from "../showcase-registry";

/* ------------------------------------------------------------------ */
/* HashTilted — Official OpenSlaq Icon                                */
/* ------------------------------------------------------------------ */

const BLUE = "#1264a3";

export function HashTilted({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <rect width="80" height="80" rx="18" fill={BLUE} />
      <g transform="rotate(-12 40 40)">
        <path
          d="M26 32h28M26 48h28M34 20v40M46 20v40"
          stroke="white"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Story export — reference sheet at multiple sizes                    */
/* ------------------------------------------------------------------ */

export const appIconStory: ComponentStory = {
  id: "app-icon",
  name: "App Icon",
  source: "showcase/stories/app-icon.stories.tsx",
  render: () => (
    <>
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-secondary mb-3">
          App Icon — Hash Tilted
        </h3>
        <div className="flex items-end gap-6">
          {[128, 80, 64, 48, 32, 16].map((s) => (
            <div key={s} className="flex flex-col items-center gap-2">
              <HashTilted size={s} />
              <span className="text-[10px] font-mono text-tertiary">
                {s}px
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Dark background test */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-secondary mb-3">
          On Dark Background
        </h3>
        <div className="flex items-end gap-6 bg-[#1a1d21] p-6 rounded-lg">
          {[128, 80, 48, 32, 16].map((s) => (
            <div key={s} className="flex flex-col items-center gap-2">
              <HashTilted size={s} />
              <span className="text-[9px] font-mono text-white/50">
                {s}px
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  ),
};
