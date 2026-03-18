import { useState } from "react";
import { DraftsTab } from "./DraftsTab";
import { ScheduledTab } from "./ScheduledTab";
import { SentTab } from "./SentTab";

type Tab = "drafts" | "scheduled" | "sent";

interface OutboxViewProps {
  workspaceSlug: string;
  onNavigateToChannel: (channelId: string, messageId?: string) => void;
}

const tabs: { key: Tab; label: string }[] = [
  { key: "drafts", label: "Drafts" },
  { key: "scheduled", label: "Scheduled" },
  { key: "sent", label: "Sent" },
];

export function OutboxView({ workspaceSlug, onNavigateToChannel }: OutboxViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>("drafts");

  return (
    <div className="flex flex-col h-full" data-testid="outbox-view">
      <div className="px-4 pt-4 pb-1 shrink-0">
        <h2 className="text-lg font-bold text-primary">Outbox</h2>
        <p className="text-xs text-secondary mt-0.5">
          Manage your drafts, scheduled messages, and sent items
        </p>
      </div>

      <div className="flex gap-4 px-4 border-b border-border-default shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`relative px-1 py-2.5 text-sm border-none cursor-pointer bg-transparent transition-colors ${
              activeTab === tab.key
                ? "text-primary font-medium"
                : "text-secondary hover:text-primary"
            }`}
            data-testid={`outbox-tab-${tab.key}`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand rounded-full" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === "drafts" && (
          <DraftsTab
            workspaceSlug={workspaceSlug}
            onNavigateToChannel={onNavigateToChannel}
          />
        )}
        {activeTab === "scheduled" && (
          <ScheduledTab workspaceSlug={workspaceSlug} />
        )}
        {activeTab === "sent" && (
          <SentTab
            workspaceSlug={workspaceSlug}
            onNavigateToChannel={onNavigateToChannel}
          />
        )}
      </div>
    </div>
  );
}
