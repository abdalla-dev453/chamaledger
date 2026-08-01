// src/hooks/useCycles.js
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../services/api";

/** Lists cycles for a group, plus create/close mutations. */
export function useCycles(groupId) {
  const [cycles, setCycles] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    if (!groupId) return;
    setStatus("loading");
    setError(null);
    try {
      const data = await api.cycles.list(groupId);
      setCycles(data.cycles);
      setStatus("idle");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load cycles.");
      setStatus("error");
    }
  }, [groupId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const createCycle = useCallback(
    async (payload) => {
      const data = await api.cycles.create(groupId, payload);
      await refetch();
      return data.cycle;
    },
    [groupId, refetch]
  );

  const closeCycle = useCallback(
    async (cycleId) => {
      await api.cycles.close(groupId, cycleId);
      await refetch();
    },
    [groupId, refetch]
  );

  return { cycles, status, error, refetch, createCycle, closeCycle };
}

/** Fetches the financial summary + member breakdown for a single cycle. */
export function useCycleSummary(groupId, cycleId) {
  const [summary, setSummary] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    if (!groupId || !cycleId) return;
    setStatus("loading");
    setError(null);
    try {
      const data = await api.cycles.summary(groupId, cycleId);
      setSummary(data);
      setStatus("idle");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load the cycle summary.");
      setStatus("error");
    }
  }, [groupId, cycleId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { summary, status, error, refetch };
}