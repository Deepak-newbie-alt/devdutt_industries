import { Spinner } from "../../components/ui/Spinner";
import { useCompanyInfo } from "../../context/CompanyInfoContext";

type QuotationSupportProps = {
  quotationNumber: string;
  revisionNumber: number;
  // Why the customer may need us, e.g. a missing PDF or a lost link; each is one sentence.
  reasons: string[];
};

// What to do when something about a quotation can't be done online: the reason, the quotation to
// mention, and ways to reach us from the public company details (never hardcoded here).
export function QuotationSupport({ quotationNumber, revisionNumber, reasons }: QuotationSupportProps) {
  const company = useCompanyInfo();
  const reference = `Quotation ${quotationNumber}, revision ${revisionNumber}`;

  return (
    <div className="quotation-support">
      {reasons.map((reason) => (
        <p key={reason}>{reason}</p>
      ))}

      {company.status === "loading" && <Spinner label="Loading contact details" />}

      {company.status === "error" && (
        <p className="muted">
          Please contact our sales team and mention quotation <strong>{quotationNumber}</strong>.
        </p>
      )}

      {company.status === "success" && (
        <>
          <p className="muted">
            Mention quotation <strong>{quotationNumber}</strong> when you contact us.
          </p>
          <div className="button-row">
            <a className="button button--secondary" href={`tel:${company.data.phone.replace(/\s+/g, "")}`}>
              Call {company.data.phone}
            </a>
            {company.data.email && (
              <a
                className="button button--secondary"
                href={`mailto:${company.data.email}?subject=${encodeURIComponent(reference)}`}
              >
                Email {company.data.email}
              </a>
            )}
          </div>
        </>
      )}
    </div>
  );
}
