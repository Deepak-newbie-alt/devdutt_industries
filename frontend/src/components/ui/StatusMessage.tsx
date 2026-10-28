import type { ReactNode } from "react";

type StatusMessageProps = {
  tone: "error" | "info" | "success";
  title?: string;
  children: ReactNode;
  action?: ReactNode;
};

// Inline feedback block. Errors are announced to screen readers immediately.
export function StatusMessage({ tone, title, children, action }: StatusMessageProps) {
  return (
    <div className={`status status--${tone}`} role={tone === "error" ? "alert" : "status"}>
      {title && <p className="status__title">{title}</p>}
      <div className="status__body">{children}</div>
      {action && <div className="status__action">{action}</div>}
    </div>
  );
}
