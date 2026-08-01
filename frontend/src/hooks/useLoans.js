// src/hooks/useLoans.js
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../services/api";

/** Lists loans for the group (server already scopes members to their own). */
export function useLoans(groupId) {
  const [loans, setLoans] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    if (!groupId) return;
    setStatus("loading");
    setError(null);
    try {
      const data = await api.loans.list(groupId);
      setLoans(data.loans);
      setStatus("idle");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load loans.");
      setStatus("error");
    }
  }, [groupId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const issueLoan = useCallback(
    async (payload) => {
      const data = await api.loans.issue(groupId, payload);
      await refetch();
      return data.loan;
    },
    [groupId, refetch]
  );

  const repayLoan = useCallback(
    async (loanId, payload) => {
      const data = await api.loans.repay(groupId, loanId, payload);
      await refetch();
      return data.loan;
    },
    [groupId, refetch]
  );

  return { loans, status, error, refetch, issueLoan, repayLoan };
}

/** Fetches a single loan with its full repayment history. */
export function useLoanDetail(groupId, loanId) {
  const [loan, setLoan] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    if (!groupId || !loanId) return;
    setStatus("loading");
    setError(null);
    try {
      const data = await api.loans.get(groupId, loanId);
      setLoan(data);
      setStatus("idle");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load this loan.");
      setStatus("error");
    }
  }, [groupId, loanId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { loan, status, error, refetch };
}