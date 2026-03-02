import { VariantGrid, VariantItem } from "../ShowcaseSection";
import type { ComponentStory } from "../showcase-registry";

function roleBadgeClass(role: string): string {
  switch (role) {
    case "owner":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
    case "admin":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    default:
      return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300";
  }
}

interface MockWorkspace {
  name: string;
  slug: string;
  role: string;
  memberCount: number;
}

function WorkspaceCard({ ws }: { ws: MockWorkspace }) {
  return (
    <div className="text-left p-5 bg-surface rounded-xl border border-border-default hover:border-slaq-blue hover:shadow-md transition-all cursor-pointer">
      <div className="flex items-start justify-between mb-1">
        <h2 className="font-semibold text-primary text-lg">{ws.name}</h2>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ml-2 ${roleBadgeClass(ws.role)}`}
        >
          {ws.role}
        </span>
      </div>
      <p className="text-sm text-muted mb-2">/{ws.slug}</p>
      <p className="text-xs text-faint">
        {ws.memberCount} {ws.memberCount === 1 ? "member" : "members"}
      </p>
    </div>
  );
}

const workspaces: MockWorkspace[] = [
  { name: "Acme Corp", slug: "acme", role: "owner", memberCount: 42 },
  { name: "Design Team", slug: "design-team", role: "admin", memberCount: 8 },
  { name: "Open Source Project", slug: "oss-project", role: "member", memberCount: 156 },
  {
    name: "A Very Long Workspace Name That Should Be Truncated Somehow",
    slug: "long-workspace-name",
    role: "member",
    memberCount: 3,
  },
];

export const workspaceCardStory: ComponentStory = {
  id: "workspace-card",
  name: "WorkspaceCard",
  source: "pages/WorkspaceList.tsx",
  render: () => (
    <>
      <VariantGrid title="Roles">
        {workspaces.slice(0, 3).map((ws) => (
          <VariantItem key={ws.slug} label={ws.role}>
            <div className="w-[280px]">
              <WorkspaceCard ws={ws} />
            </div>
          </VariantItem>
        ))}
      </VariantGrid>

      <VariantGrid title="Long Name">
        <VariantItem label="overflow">
          <div className="w-[280px]">
            <WorkspaceCard ws={workspaces[3]!} />
          </div>
        </VariantItem>
      </VariantGrid>
    </>
  ),
};
