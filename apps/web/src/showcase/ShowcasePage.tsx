import { useEffect, useState } from "react";
import { useTheme } from "../theme/ThemeProvider";
import { categories, type ComponentStory } from "./showcase-registry";

const STORAGE_KEY = "showcase-collapsed";

function getInitialCollapsed(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch { /* ignore */ }
  return new Set();
}

function getInitialStoryId(): string {
  const hash = window.location.hash.slice(1);
  if (hash) {
    const found = categories
      .flatMap((c) => c.stories)
      .find((s) => s.id === hash);
    if (found) return found.id;
  }
  return categories[0]!.stories[0]!.id;
}

export function ShowcasePage() {
  const [activeId, setActiveId] = useState(getInitialStoryId);
  const [collapsed, setCollapsed] = useState(getInitialCollapsed);
  const { cycle, mode } = useTheme();

  const allStories = categories.flatMap((c) => c.stories);
  // Always has at least one story (registry is statically defined)
  const activeStory = (allStories.find((s) => s.id === activeId) ?? allStories[0])!;

  function selectStory(story: ComponentStory) {
    setActiveId(story.id);
    window.location.hash = story.id;
  }

  function toggleCategory(catId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  useEffect(() => {
    function onHashChange() {
      const hash = window.location.hash.slice(1);
      const found = allStories.find((s) => s.id === hash);
      if (found) setActiveId(found.id);
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  });

  return (
    <div className="flex flex-col h-screen bg-surface text-primary">
      {/* Header */}
      <header className="flex items-center justify-between px-4 h-12 border-b border-primary shrink-0">
        <span className="text-sm font-semibold">Components</span>
        <div className="flex items-center gap-3">
          <a
            href="/dev/gallery"
            className="text-xs text-link hover:underline"
          >
            /dev/gallery
          </a>
          <button
            onClick={cycle}
            className="text-xs px-2 py-1 rounded bg-surface-secondary hover:bg-surface-tertiary text-secondary"
          >
            {mode === "dark" ? "Light" : "Dark"}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav className="w-56 shrink-0 border-r border-primary overflow-y-auto p-3">
          {categories.map((cat) => {
            const isCollapsed = collapsed.has(cat.id);
            return (
              <div key={cat.id} className="mb-4">
                <button
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className="flex items-center gap-1 w-full text-left text-[11px] font-semibold uppercase text-tertiary mb-1.5 px-2 bg-transparent border-none cursor-pointer hover:text-secondary"
                >
                  <svg
                    className={`w-3 h-3 transition-transform ${isCollapsed ? "" : "rotate-90"}`}
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <path d="M6 3l5 5-5 5V3z" />
                  </svg>
                  {cat.label}
                </button>
                {!isCollapsed &&
                  cat.stories.map((story) => (
                    <button
                      key={story.id}
                      onClick={() => selectStory(story)}
                      className={`block w-full text-left text-sm px-2 py-1 rounded ${
                        story.id === activeId
                          ? "bg-surface-tertiary text-primary font-medium"
                          : "text-secondary hover:bg-surface-secondary"
                      }`}
                    >
                      {story.name}
                    </button>
                  ))}
              </div>
            );
          })}
        </nav>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-primary">
              {activeStory.name}
            </h2>
            <p className="text-xs text-tertiary font-mono mt-1">
              {activeStory.source}
            </p>
          </div>
          {activeStory.render()}
        </main>
      </div>
    </div>
  );
}
