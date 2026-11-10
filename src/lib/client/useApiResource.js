"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "./api";

/**
 * Fetches a same-origin JSON resource and refetches when `path` changes.
 * While a new request is in flight the previous data stays available
 * (`loading` is true), so charts do not flash empty on range changes.
 * State is only set from the async callbacks, never synchronously in the effect.
 */
export function useApiResource(path) {
  const [state, setState] = useState({ key: null, data: null, error: null });
  const [nonce, setNonce] = useState(0);
  const requestKey = `${path}#${nonce}`;

  useEffect(() => {
    if (!path) return undefined;
    const controller = new AbortController();
    apiFetch(path, { signal: controller.signal })
      .then((data) => setState({ key: requestKey, data, error: null }))
      .catch((error) => {
        if (error?.name !== "AbortError") setState({ key: requestKey, data: null, error });
      });
    return () => controller.abort();
  }, [path, requestKey]);

  const loading = Boolean(path) && state.key !== requestKey;
  return {
    loading,
    data: state.data,
    error: loading ? null : state.error,
    reload: () => setNonce((n) => n + 1),
  };
}
