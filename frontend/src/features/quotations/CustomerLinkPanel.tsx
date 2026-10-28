import { useEffect, useRef, useState } from "react";

type CustomerLinkPanelProps = {
  link: string;
  revisionNumber: number;
  onDone: () => void;
};

// The customer response link is returned once and never stored, so it is shown here
// until dismissed. Generating a new link later disables this one.
export function CustomerLinkPanel({ link, revisionNumber, onDone }: CustomerLinkPanelProps) {
  const [copied, setCopied] = useState<"yes" | "failed" | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied("yes");
    } catch {
      // Clipboard access can be refused; select the text so it can be copied by hand.
      inputRef.current?.select();
      setCopied("failed");
    }
  }

  return (
    <div ref={panelRef} tabIndex={-1} className="link-panel" role="region" aria-label="Customer link">
      <p className="link-panel__title">Customer link for revision {revisionNumber}</p>
      <p>
        Share this link with the customer along with the quotation PDF (for example on WhatsApp). They use it to
        accept, decline or ask for changes after confirming their phone number.
      </p>
      <div className="input-row">
        <label htmlFor="customer-link" className="visually-hidden">
          Customer link
        </label>
        <input id="customer-link" ref={inputRef} className="input" readOnly value={link} onFocus={(event) => event.target.select()} />
        <button type="button" className="button button--primary" onClick={copy}>
          {copied === "yes" ? "Copied" : "Copy link"}
        </button>
      </div>
      <p className="link-panel__status" role="status">
        {copied === "yes" && "Link copied to the clipboard."}
        {copied === "failed" && "Couldn't copy automatically. The link is selected: press Ctrl+C to copy it."}
      </p>
      <p className="muted">
        This link is shown only now and isn't saved. If it's lost, generate a new one; the old link then stops working.
      </p>
      <button type="button" className="button button--secondary" onClick={onDone}>
        Done
      </button>
    </div>
  );
}
