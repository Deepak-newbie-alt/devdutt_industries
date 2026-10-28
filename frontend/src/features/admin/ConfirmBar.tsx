import type { ReactNode } from "react";

type ConfirmBarProps = {
  children: ReactNode;
  confirmLabel: string;
  busyLabel: string;
  busy: boolean;
  disabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

// Second step for actions that change access or remove something.
export function ConfirmBar({ children, confirmLabel, busyLabel, busy, disabled, onConfirm, onCancel }: ConfirmBarProps) {
  return (
    <div className="confirm confirm--stacked" role="group" aria-label="Confirm">
      <span>{children}</span>
      <div className="form-actions form-actions--tight">
        <button type="button" className="button button--primary" disabled={busy || disabled} onClick={onConfirm}>
          {busy ? busyLabel : confirmLabel}
        </button>
        <button type="button" className="button button--secondary" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
