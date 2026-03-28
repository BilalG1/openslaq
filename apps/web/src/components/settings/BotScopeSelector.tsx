import type { BotScope, BotEventType } from "@openslaq/shared";
import { clsx } from "clsx";
import { Switch } from "../ui";

const SCOPE_GROUPS: {
  label: string;
  readScope: BotScope;
  readLabel: string;
  writeScope?: BotScope;
  writeLabel?: string;
}[] = [
  { label: "Messages", readScope: "chat:read", readLabel: "Read messages", writeScope: "chat:write", writeLabel: "Send messages" },
  { label: "Channels", readScope: "channels:read", readLabel: "List channels", writeScope: "channels:write", writeLabel: "Manage channels" },
  { label: "Join", readScope: "channels:join", readLabel: "Join public channels" },
  { label: "Members", readScope: "channels:members:read", readLabel: "View members", writeScope: "channels:members:write", writeLabel: "Manage members" },
  { label: "Reactions", readScope: "reactions:read", readLabel: "Read reactions", writeScope: "reactions:write", writeLabel: "Add reactions" },
  { label: "Users & Presence", readScope: "users:read", readLabel: "View users" },
  { label: "Presence", readScope: "presence:read", readLabel: "View presence" },
];

const EVENT_OPTIONS: { value: BotEventType; label: string }[] = [
  { value: "message:new", label: "New messages" },
  { value: "message:updated", label: "Message edits" },
  { value: "message:deleted", label: "Message deletions" },
  { value: "reaction:updated", label: "Reaction changes" },
  { value: "channel:member-added", label: "Member added" },
  { value: "channel:member-removed", label: "Member removed" },
  { value: "presence:updated", label: "Presence changes" },
];

interface BotScopeSelectorProps {
  selectedScopes: string[];
  onScopesChange: (scopes: string[]) => void;
  selectedEvents: string[];
  onEventsChange: (events: string[]) => void;
}

export function BotScopeSelector({ selectedScopes, onScopesChange, selectedEvents, onEventsChange }: BotScopeSelectorProps) {
  const scopeSet = new Set(selectedScopes);

  const toggleScope = (scope: string, checked: boolean) => {
    if (checked) {
      onScopesChange([...selectedScopes, scope]);
    } else {
      onScopesChange(selectedScopes.filter((s) => s !== scope));
    }
  };

  const toggleEvent = (event: string, checked: boolean) => {
    if (checked) {
      onEventsChange([...selectedEvents, event]);
    } else {
      onEventsChange(selectedEvents.filter((e) => e !== event));
    }
  };

  const allScopes = SCOPE_GROUPS.flatMap((g) => [g.readScope, ...(g.writeScope ? [g.writeScope] : [])]);

  const selectAllRead = () => {
    const readScopes = SCOPE_GROUPS.map((g) => g.readScope);
    const merged = new Set([...selectedScopes, ...readScopes]);
    onScopesChange([...merged]);
  };

  const selectAllWrite = () => {
    const writeScopes = SCOPE_GROUPS.flatMap((g) => (g.writeScope ? [g.writeScope] : []));
    const merged = new Set([...selectedScopes, ...writeScopes]);
    onScopesChange([...merged]);
  };

  const selectAll = () => {
    const merged = new Set([...selectedScopes, ...allScopes]);
    onScopesChange([...merged]);
  };

  const hasAnyScope = (group: (typeof SCOPE_GROUPS)[number]) =>
    scopeSet.has(group.readScope) || (group.writeScope !== undefined && scopeSet.has(group.writeScope));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-muted uppercase tracking-wider">Permissions</h4>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAllRead}
              className="text-[10px] text-slaq-blue hover:underline cursor-pointer bg-transparent border-none p-0"
            >
              All read
            </button>
            <button
              type="button"
              onClick={selectAllWrite}
              className="text-[10px] text-slaq-blue hover:underline cursor-pointer bg-transparent border-none p-0"
            >
              All write
            </button>
            <button
              type="button"
              onClick={selectAll}
              className="text-[10px] text-slaq-blue hover:underline cursor-pointer bg-transparent border-none p-0"
            >
              Select all
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {SCOPE_GROUPS.map((group) => (
            <div
              key={group.label}
              className={clsx(
                "rounded-lg border-2 p-3 transition-colors bg-surface",
                hasAnyScope(group) ? "border-slaq-blue/40" : "border-border-default",
              )}
            >
              <div className="text-xs font-medium text-primary mb-2">{group.label}</div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted">{group.readLabel}</span>
                  <Switch
                    checked={scopeSet.has(group.readScope)}
                    onCheckedChange={(checked) => toggleScope(group.readScope, !!checked)}
                    data-testid={`scope-${group.readScope}`}
                  />
                </div>
                {group.writeScope && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted">{group.writeLabel}</span>
                    <Switch
                      checked={scopeSet.has(group.writeScope)}
                      onCheckedChange={(checked) => toggleScope(group.writeScope!, !!checked)}
                      data-testid={`scope-${group.writeScope}`}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="text-[11px] text-muted mt-2">
          {selectedScopes.length} scope{selectedScopes.length !== 1 ? "s" : ""} selected
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Event Subscriptions</h4>
        <div className="grid grid-cols-2 gap-2">
          {EVENT_OPTIONS.map((event) => (
            <div
              key={event.value}
              className={clsx(
                "rounded-lg border-2 p-3 transition-colors bg-surface flex items-center justify-between",
                selectedEvents.includes(event.value) ? "border-slaq-blue/40" : "border-border-default",
              )}
            >
              <span className="text-[11px] text-muted">{event.label}</span>
              <Switch
                checked={selectedEvents.includes(event.value)}
                onCheckedChange={(checked) => toggleEvent(event.value, !!checked)}
                data-testid={`event-${event.value}`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
