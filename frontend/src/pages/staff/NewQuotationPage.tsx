import { Link, useNavigate, useParams } from "react-router";
import { ApiError } from "../../api/client";
import { getInquiry } from "../../api/staffInquiries";
import { createQuotation } from "../../api/staffQuotations";
import { useEmployee } from "../../auth/EmployeeContext";
import { LoadError } from "../../components/ui/LoadError";
import { LoadingState } from "../../components/ui/LoadingState";
import { QuotationForm } from "../../features/quotations/QuotationForm";
import { stateFromInquiry } from "../../features/quotations/quotationFormState";
import { useApiQuery } from "../../hooks/useApiQuery";

export function NewQuotationPage() {
  const { employee, request } = useEmployee();
  const { inquiryId } = useParams();
  const navigate = useNavigate();
  const id = Number(inquiryId);
  const validId = Number.isInteger(id) && id > 0;

  const inquiry = useApiQuery(
    (signal) => (validId ? getInquiry(request, id, signal) : Promise.reject(new ApiError("Inquiry not found", 404))),
    [inquiryId],
  );
  // Company default terms pre-fill the terms section when they've been set up.
  // 404 means no company settings yet; any other failure is shown.
  const settings = useApiQuery(
    (signal) =>
      request<{ defaultTermsAndConditions: string | null }>("/company-settings", { signal }).catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 404) return { defaultTermsAndConditions: null };
        throw error;
      }),
    [],
  );

  if (inquiry.status === "loading" || settings.status === "loading") {
    return (
      <div className="container page-section">
        <LoadingState label="Preparing the quotation form" />
      </div>
    );
  }

  if (inquiry.status === "error") {
    return (
      <div className="container page-section narrow">
        <LoadError title="This enquiry couldn't be loaded" error={inquiry.error} onRetry={inquiry.reload} />
      </div>
    );
  }

  if (settings.status === "error") {
    return (
      <div className="container page-section narrow">
        <LoadError title="The company's default terms couldn't be loaded" error={settings.error} onRetry={settings.reload} />
      </div>
    );
  }

  const data = inquiry.data;
  const back = `/app/inquiries/${data.id}`;

  // The backend enforces these too; checking first avoids filling in a form that can't be saved.
  if (data.quotation || data.salespersonId !== employee.id || data.status !== "IN_PROGRESS") {
    return (
      <div className="container page-section narrow">
        <title>New quotation | Devdutt Industries Staff</title>
        <h1>A quotation can't be created here</h1>
        <p>
          {data.quotation
            ? `This enquiry already has quotation ${data.quotation.quotationNumber}.`
            : "Quotations can only be created for enquiries you've claimed that are still in progress."}
        </p>
        <Link to={data.quotation ? `/app/quotations/${data.quotation.id}` : back} className="button button--primary">
          {data.quotation ? "Open the quotation" : "Back to the enquiry"}
        </Link>
      </div>
    );
  }

  const defaultTerms = settings.status === "success" ? settings.data.defaultTermsAndConditions : null;

  return (
    <div className="container page-section">
      <title>{`New quotation for enquiry #${data.id} | Devdutt Industries Staff`}</title>
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <ol>
          <li>
            <Link to="/app/inquiries">Inquiries</Link>
          </li>
          <li>
            <Link to={back}>Enquiry #{data.id}</Link>
          </li>
          <li aria-current="page">New quotation</li>
        </ol>
      </nav>
      <header className="page-header">
        <h1>New quotation</h1>
        <p className="muted">
          For enquiry #{data.id}: {data.product.name}. It's saved as a draft; you can preview the PDF before sending.
        </p>
      </header>
      <QuotationForm
        initial={stateFromInquiry(data, defaultTerms)}
        submitLabel="Save draft"
        savingLabel="Saving…"
        onCancel={() => navigate(back)}
        onSubmit={async (input) => {
          const quotation = await createQuotation(request, data.id, input);
          navigate(`/app/quotations/${quotation.id}`);
        }}
      />
    </div>
  );
}
