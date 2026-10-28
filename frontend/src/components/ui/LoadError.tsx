import type { ApiError } from "../../api/client";
import { StatusMessage } from "./StatusMessage";

type LoadErrorProps = {
  title: string;
  error: ApiError;
  onRetry: () => void;
};

// A failed load, with the reason and a way to try again.
export function LoadError({ title, error, onRetry }: LoadErrorProps) {
  return (
    <StatusMessage
      tone="error"
      title={title}
      action={
        <button type="button" className="button button--secondary" onClick={onRetry}>
          Try again
        </button>
      }
    >
      <p>{error.message}</p>
    </StatusMessage>
  );
}
