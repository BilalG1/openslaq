import { useEffect, useState } from "react";
import { useWorkspaceMembersApi } from "../api/useWorkspaceMembersApi";

export function useWorkspaceMembers(workspaceSlug: string | undefined) {
  const { listMembers } = useWorkspaceMembersApi();
  const [workspaceMembers, setWorkspaceMembers] = useState<Array<{ id: string; displayName: string }>>([]);

  useEffect(() => {
    if (!workspaceSlug) {
      setWorkspaceMembers([]);
      return;
    }
    let cancelled = false;
    listMembers(workspaceSlug)
      .then((members) => {
        if (cancelled) return;
        setWorkspaceMembers(members.map((member) => ({ id: member.id, displayName: member.displayName })));
      })
      .catch(() => {
        if (cancelled) return;
        setWorkspaceMembers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceSlug, listMembers]);

  return { workspaceMembers };
}
