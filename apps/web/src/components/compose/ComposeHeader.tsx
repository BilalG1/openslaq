import { useState, useRef, useEffect, useCallback } from "react";
import { X, Hash } from "lucide-react";
import type { Channel } from "@openslaq/shared";
import type { PresenceEntry } from "../../state/chat-store";

export interface ComposeRecipient {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

interface ComposeHeaderProps {
  selectedUsers: ComposeRecipient[];
  onAddUser: (user: ComposeRecipient) => void;
  onRemoveUser: (userId: string) => void;
  onSelectChannel: (channelId: string) => void;
  members: Array<{ id: string; displayName: string; email: string; avatarUrl: string | null }>;
  channels: Channel[];
  currentUserId: string;
  presence: Record<string, PresenceEntry>;
}

export function ComposeHeader({
  selectedUsers,
  onAddUser,
  onRemoveUser,
  onSelectChannel,
  members,
  channels,
  currentUserId,
  presence,
}: ComposeHeaderProps) {
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedIds = new Set(selectedUsers.map((u) => u.id));
  const query = search.toLowerCase().trim();

  const filteredChannels = query
    ? channels
        .filter((ch) => !ch.isArchived && ch.name.toLowerCase().includes(query))
        .slice(0, 5)
    : [];

  const filteredMembers = query
    ? members
        .filter(
          (m) =>
            m.id !== currentUserId &&
            !selectedIds.has(m.id) &&
            (m.displayName.toLowerCase().includes(query) ||
              m.email.toLowerCase().includes(query)),
        )
        .slice(0, 10)
    : [];

  const hasResults = filteredChannels.length > 0 || filteredMembers.length > 0;

  const handleSelect = useCallback(
    (type: "channel" | "person", item: { id: string; displayName: string; avatarUrl?: string | null }) => {
      if (type === "channel") {
        onSelectChannel(item.id);
      } else {
        onAddUser({ id: item.id, displayName: item.displayName, avatarUrl: item.avatarUrl ?? null });
      }
      setSearch("");
      setDropdownOpen(false);
      inputRef.current?.focus();
    },
    [onAddUser, onSelectChannel],
  );

  return (
    <div
      ref={containerRef}
      className="relative flex items-center gap-2 px-4 py-3 border-b border-border-default bg-surface"
      data-testid="compose-header"
    >
      <span className="text-sm font-medium text-secondary shrink-0">To:</span>

      <div className="flex flex-wrap items-center gap-1 flex-1 min-w-0">
        {selectedUsers.map((user) => (
          <span
            key={user.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slaq-blue/20 text-slaq-blue text-xs"
            data-testid={`compose-chip-${user.id}`}
          >
            {user.displayName}
            <button
              type="button"
              onClick={() => onRemoveUser(user.id)}
              className="text-slaq-blue hover:text-white bg-transparent border-none cursor-pointer text-xs leading-none p-0"
              data-testid={`compose-chip-remove-${user.id}`}
            >
              <X size={12} />
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setDropdownOpen(true);
          }}
          onFocus={() => { if (search.trim()) setDropdownOpen(true); }}
          placeholder={selectedUsers.length === 0 ? "#channel or @someone" : "Add another person..."}
          className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm text-primary placeholder:text-faint"
          data-testid="compose-to-input"
        />
      </div>

      {dropdownOpen && hasResults && (
        <div
          className="absolute left-0 right-0 top-full z-10 mt-1 mx-4 rounded-lg border border-border-default bg-surface shadow-lg max-h-[300px] overflow-y-auto"
          data-testid="compose-dropdown"
        >
          {filteredChannels.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-xs font-semibold text-faint uppercase">Channels</div>
              {filteredChannels.map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => handleSelect("channel", { id: ch.id, displayName: ch.name })}
                  className="w-full px-3 py-2 text-left text-sm text-primary hover:bg-surface-hover bg-transparent border-none cursor-pointer flex items-center gap-2"
                  data-testid={`compose-option-channel-${ch.id}`}
                >
                  <Hash className="w-3.5 h-3.5 text-secondary shrink-0" />
                  {ch.name}
                </button>
              ))}
            </div>
          )}
          {filteredMembers.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-xs font-semibold text-faint uppercase">People</div>
              {filteredMembers.map((m) => {
                const online = presence[m.id]?.online ?? false;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelect("person", m)}
                    className="w-full px-3 py-2 text-left text-sm text-primary hover:bg-surface-hover bg-transparent border-none cursor-pointer flex items-center gap-2"
                    data-testid={`compose-option-person-${m.id}`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${online ? "bg-green-500" : "bg-gray-500"}`}
                    />
                    <span>{m.displayName}</span>
                    <span className="text-xs text-faint">{m.email}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
