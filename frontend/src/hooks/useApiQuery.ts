import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../api/client";

export type QueryState<T> =
  | { status: "loading"; data: null; error: null }
  | { status: "success"; data: T; error: null }
  | { status: "error"; data: null; error: ApiError };

const sameDeps = (a: readonly unknown[] | null, b: readonly unknown[]) =>
  a !== null && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));

// Loads data on mount and whenever `deps` change; cancels the request on unmount.
// reload() refreshes in the background: the current data stays on screen until the
// new data arrives, so pages don't flash a loading state after every action.
export function useApiQuery<T>(
  load: (signal: AbortSignal) => Promise<T>,
  deps: readonly unknown[],
) {
  const [state, setState] = useState<QueryState<T>>({ status: "loading", data: null, error: null });
  const [attempt, setAttempt] = useState(0);
  const previousDeps = useRef<readonly unknown[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const isRefresh = sameDeps(previousDeps.current, deps);
    previousDeps.current = deps;

    // Something different is being loaded: don't show the previous item meanwhile.
    if (!isRefresh) {
      setState({ status: "loading", data: null, error: null });
    }

    load(controller.signal).then(
      (data) => {
        // A response for a request that was replaced must not overwrite newer data.
        if (!controller.signal.aborted) {
          setState({ status: "success", data, error: null });
        }
      },
      (error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setState({
          status: "error",
          data: null,
          error: error instanceof ApiError ? error : new ApiError("Something went wrong. Please try again.", null),
        });
      },
    );

    return () => controller.abort();
    // `load` is recreated on every render; `deps` says when to reload.
  }, [...deps, attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  return { ...state, reload };
}
