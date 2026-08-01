// src/hooks/useContributions.js
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../services/api";

/** Lists contributions for a cycle, plus a "record manual contribution" mutation for treasurers. */
export function useContributions(groupId, cycleId) {
  const [contributions, setContributions] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    if (!groupId || !cycleId) return;
    setStatus("loading");
    setError(null);
    try {
      const data = await api.contributions.list(groupId, cycleId);
      setContributions(data.contributions);
      setStatus("idle");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load contributions.");
      setStatus("error");
    }
  }, [groupId, cycleId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const recordContribution = useCallback(
    async (payload) => {
      const data = await api.contributions.record(groupId, cycleId, payload);
      await refetch();
      return data.contribution;
    },
    [groupId, cycleId, refetch]
  );

  return { contributions, status, error, refetch, recordContribution };
}