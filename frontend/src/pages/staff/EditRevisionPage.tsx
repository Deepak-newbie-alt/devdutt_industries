import { Link, useNavigate, useParams } from "react-router";
import { ApiError } from "../../api/client";
import { editRevision, getRevisions } from "../../api/staffQuotations";
import { useEmployee } from "../../auth/EmployeeContext";
import { LoadError } from "../../components/ui/LoadError";
import { LoadingState } from "../../components/ui/LoadingState";
import { QuotationForm } from "../../features/quotations/QuotationForm";
import { stateFromRevision } from "../../features/quotations/quotationFormState";
import { useApiQuery } from "../../hooks/useApiQuery";

export function EditRevisionPage() {
  const { employee, request } = useEmployee();
  const { quotationId, revisionId } = useParams();
  const navigate = useNavigate();
  const quotation = Number(quotationId);
  const revisionNumberId = Number(revisionId);

  const revisions = useApiQuery(
    (signal) =>
      Number.isInteger(quotation) && quotation > 0
        ? getRevisions(request, quotation, signal)
        : Promise.reject(new ApiError("Quotation not found", 404)),
    [quotationId],
  );

  if (revisions.status === "loading") {
    return (
      <div className="container page-section">
        <LoadingState label="Loading draft" />
      </div>
    );
  }

  if (revisions.status === "error") {
    return (
      <div className="container page-section narrow">
        <LoadError title="This quotation couldn't be loaded" error={revisions.error} onRetry={revisions.reload} />
      </div>
    );
  }

  const back = `/app/quotations/${quotation}`;
  const revision = revisions.data.find((item) => item.id === revisionNumberId);

  const inquiryClosed = revision?.quotation.inquiry.status === "CLOSED";

  if (!revision || revision.quotationRevisionStatus !== "DRAFT" || revision.salespersonId !== employee.id || inquiryClosed) {
    return (
      <div className="container page-section narrow">
        <title>Edit quotation | Devdutt Industries Staff</title>
        <h1>This revision can't be edited</h1>
        <p>
          {inquiryClosed
            ? "Its enquiry is closed, so the quotation can't be changed any more."
            : "Only your own draft revisions can be edited. Sent quotations are fixed; create a new revision instead."}
        </p>
        <Link to={back} className="button button--primary">
          Back to the quotation
        </Link>
      </div>
    );
  }

  return (
    <div className="container page-section">
      <title>{`Edit ${revision.quotation.quotationNumber} revision ${revision.revisionNumber} | Devdutt Industries Staff`}</title>
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <ol>
          <li>
            <Link to="/app/inquiries">Inquiries</Link>
          </li>
          <li>
            <Link to={back}>{revision.quotation.quotationNumber}</Link>
          </li>
          <li aria-current="page">Edit revision {revision.revisionNumber}</li>
        </ol>
      </nav>
      <header className="page-header">
        <h1>
          Edit {revision.quotation.quotationNumber}, revision {revision.revisionNumber}
        </h1>
      </header>
      <QuotationForm
        initial={stateFromRevision(revision)}
        submitLabel="Save changes"
        savingLabel="Saving…"
        onCancel={() => navigate(back)}
        onSubmit={async (input) => {
          await editRevision(request, revision.id, input);
          navigate(back);
        }}
      />
    </div>
  );
}
