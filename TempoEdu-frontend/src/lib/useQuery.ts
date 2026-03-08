import { useState, useEffect, useCallback, useRef } from 'react';

interface UseQueryOptions<T> {
  queryKey: string;
  queryFn: () => Promise<T>;
  refetchInterval?: number;
  refetchOnWindowFocus?: boolean;
  enabled?: boolean;
}

interface UseQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

// ── Shared cache & listeners ──
const cache = new Map<string, { data: unknown; ts: number }>();
const listeners = new Map<string, Set<() => void>>();
const STALE = 10_000; // 10 s

/** Invalidate all queries whose key starts with `prefix` */
export function invalidateQueries(prefix: string) {
  for (const [key, cbs] of listeners) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
      cbs.forEach((cb) => cb());
    }
  }
}

// ── Hook ──
export function useQuery<T>(opts: UseQueryOptions<T>): UseQueryResult<T> {
  const {
    queryKey,
    queryFn,
    refetchInterval = 0,
    refetchOnWindowFocus = true,
    enabled = true,
  } = opts;

  const cached = cache.get(queryKey);
  const [data, setData] = useState<T | undefined>(cached?.data as T | undefined);
  const [isLoading, setIsLoading] = useState(!cached);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const alive = useRef(true);
  const fnRef = useRef(queryFn);
  fnRef.current = queryFn;

  const fetchData = useCallback(
    async (bg = false) => {
      if (!alive.current) return;
      if (!bg) setIsLoading((prev) => (data !== undefined ? false : prev || true));
      try {
        const res = await fnRef.current();
        if (!alive.current) return;
        cache.set(queryKey, { data: res, ts: Date.now() });
        setData(res);
        setIsLoading(false);
        setIsError(false);
      } catch (e) {
        if (!alive.current) return;
        setError(e instanceof Error ? e : new Error(String(e)));
        setIsError(true);
        setIsLoading(false);
      }
    },
    [queryKey], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Initial fetch (skip if cached & fresh)
  useEffect(() => {
    if (!enabled) return;
    const c = cache.get(queryKey);
    if (c && Date.now() - c.ts < STALE) {
      setData(c.data as T);
      setIsLoading(false);
      return;
    }
    fetchData(!!data);
  }, [queryKey, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for invalidation
  useEffect(() => {
    if (!enabled) return;
    if (!listeners.has(queryKey)) listeners.set(queryKey, new Set());
    const cb = () => fetchData(true);
    listeners.get(queryKey)!.add(cb);
    return () => {
      listeners.get(queryKey)?.delete(cb);
      if (listeners.get(queryKey)?.size === 0) listeners.delete(queryKey);
    };
  }, [queryKey, fetchData, enabled]);

  // Refetch on window focus
  useEffect(() => {
    if (!refetchOnWindowFocus || !enabled) return;
    const onFocus = () => {
      const c = cache.get(queryKey);
      if (!c || Date.now() - c.ts > STALE) fetchData(true);
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [queryKey, fetchData, refetchOnWindowFocus, enabled]);

  // Polling
  useEffect(() => {
    if (!refetchInterval || !enabled) return;
    const id = setInterval(() => fetchData(true), refetchInterval);
    return () => clearInterval(id);
  }, [refetchInterval, fetchData, enabled]);

  // Cleanup
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  return { data, isLoading, isError, error, refetch: () => fetchData(false) };
}
