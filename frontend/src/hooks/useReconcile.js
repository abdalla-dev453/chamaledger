// src/hooks/useReconcile.js
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../services/api";

/** Treasurer-only: M-Pesa statement upload + unmatched-statement review. */
export function useReconcile(groupId) {
  const [unmatched, setUnmatched] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const [error, setError] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  const refetchUnmatched = useCallback(async () => {
    if (!groupId) return;
    setStatus("loading");
    setError(null);
    try {
      const data = await api.reconcile.unmatched(groupId);
      setUnmatched(data.unmatched_statements);
      setStatus("idle");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load unmatched statements.");
      setStatus("error");
    }
  }, [groupId]);

  useEffect(() => {
    refetchUnmatched();
  }, [refetchUnmatched]);

  const uploadStatement = useCallback(
    async (cycleId, file) => {
      const data = await api.reconcile.upload(groupId, cycleId, file);
      setLastResult(data);
      await refetchUnmatched();
      return data;
    },
    [groupId, refetchUnmatched]
  );

  return { unmatched, status, error, lastResult, refetchUnmatched, uploadStatement };
}