import { useEffect, useLayoutEffect, useState } from "react";

// Whole seconds left until `deadline` (a Date.now() timestamp), updated every second.
// Returns 0 once the deadline has passed or when there is no deadline.
export function useCountdown(deadline: number | null) {
  const [now, setNow] = useState(() => Date.now());

  // Refresh the clock before paint whenever the deadline changes, so a new deadline
  // is never measured against an old time.
  useLayoutEffect(() => {
    setNow(Date.now());
  }, [deadline]);

  useEffect(() => {
    if (deadline === null) {
      return;
    }

    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);

      if (current >= deadline) {
        window.clearInterval(timer);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [deadline]);

  // Derived on render: with an older `now` this can only over-count, never report 0 early.
  return deadline === null ? 0 : Math.max(0, Math.ceil((deadline - now) / 1000));
}

// 272 -> "4:32"
export function formatSeconds(total: number) {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
