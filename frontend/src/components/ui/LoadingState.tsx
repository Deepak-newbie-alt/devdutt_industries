import { Spinner } from "./Spinner";

export function LoadingState({ label }: { label: string }) {
  return (
    <div className="loading-state">
      <Spinner label={label} />
      <span aria-hidden="true">{label}…</span>
    </div>
  );
}
