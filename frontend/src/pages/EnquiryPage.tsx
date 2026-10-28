import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { getProduct } from "../api/catalog";
import { LoadError } from "../components/ui/LoadError";
import { LoadingState } from "../components/ui/LoadingState";
import { MachineNotFound } from "../features/catalog/MachineNotFound";
import { ProductImageFrame } from "../features/catalog/ProductImageFrame";
import { EnquiryForm } from "../features/inquiries/EnquiryForm";
import { useApiQuery } from "../hooks/useApiQuery";
import type { CreatedInquiry, Product } from "../types/api";
import { formatPrice, formatUnit } from "../utils/format";

function MachineSummary({ product }: { product: Product }) {
  return (
    <aside className="enquiry-machine" aria-label="Machine you're asking about">
      <ProductImageFrame src={product.images[0]?.imageUrl} alt="" eager />
      <div className="enquiry-machine__body">
        <p className="enquiry-machine__category">{product.category.name}</p>
        <p className="enquiry-machine__name">{product.name}</p>
        <p className="enquiry-machine__price">
          {formatPrice(product.price)} <span className="muted">per {formatUnit(product.unit)}</span>
        </p>
        <Link to={`/machines/${product.id}`}>View machine details</Link>
      </div>
    </aside>
  );
}

function EnquirySent({ product, result, phone }: { product: Product; result: CreatedInquiry; phone: string }) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus so screen-reader and keyboard users land on the confirmation.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="enquiry-sent">
      <title>Enquiry sent | Devdutt Industries</title>
      <h1 ref={headingRef} tabIndex={-1}>
        Thank you, your enquiry has been sent
      </h1>
      <p>
        Our sales team will contact you on <strong>+91 {phone}</strong> about the <strong>{product.name}</strong> and
        send you a quotation.
      </p>
      <p className="enquiry-sent__reference">
        Enquiry reference: <strong>#{result.inquiry.id}</strong>
      </p>
      <div className="button-row">
        <Link to="/machines" className="button button--primary">
          Browse more machines
        </Link>
        <Link to={`/machines/${product.id}`} className="button button--secondary">
          Back to this machine
        </Link>
      </div>
    </div>
  );
}

export function EnquiryPage() {
  const { productId } = useParams();
  const id = Number(productId);
  const validId = Number.isInteger(id) && id > 0;
  const [sent, setSent] = useState<{ result: CreatedInquiry; phone: string } | null>(null);

  const product = useApiQuery(
    (signal) => (validId ? getProduct(id, signal) : Promise.reject(null)),
    [productId],
  );

  if (!validId || (product.status === "error" && (product.error.status === 404 || product.error.status === 400))) {
    return <MachineNotFound />;
  }

  if (product.status === "loading") {
    return (
      <div className="container page-section">
        <LoadingState label="Loading machine" />
      </div>
    );
  }

  if (product.status === "error") {
    return (
      <div className="container page-section narrow">
        <LoadError title="This machine couldn't be loaded" error={product.error} onRetry={product.reload} />
      </div>
    );
  }

  return (
    <div className="container page-section">
      {sent ? (
        <EnquirySent product={product.data} result={sent.result} phone={sent.phone} />
      ) : (
        <>
          <title>{`Request a quote: ${product.data.name} | Devdutt Industries`}</title>
          <header className="page-header">
            <h1>Request a quote</h1>
            <p className="muted">Tell us what you need. No account needed.</p>
          </header>
          <div className="enquiry">
            <EnquiryForm productId={product.data.id} onSubmitted={(result, phone) => setSent({ result, phone })} />
            <MachineSummary product={product.data} />
          </div>
        </>
      )}
    </div>
  );
}
