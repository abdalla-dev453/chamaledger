// src/hooks/useMembers.js
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../services/api";

/** Lists group members, plus a role/active-status mutation for treasurers. */
export function useMembers(groupId) {
  const [members, setMembers] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    if (!groupId) return;
    setStatus("loading");
    setError(null);
    try {
      const data = await api.groups.listMembers(groupId);
      setMembers(data.members);
      setStatus("idle");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load members.");
      setStatus("error");
    }
  }, [groupId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const updateMember = useCallback(
    async (memberId, changes) => {
      const data = await api.groups.updateMember(groupId, memberId, changes);
      setMembers((current) => current.map((m) => (m.id === memberId ? data.member : m)));
      return data.member;
    },
    [groupId]
  );

  return { members, status, error, refetch, updateMember };
}