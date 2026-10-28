import { Link } from "react-router";
import { useCompanyInfo } from "../../context/CompanyInfoContext";
import { Spinner } from "../ui/Spinner";

function CompanyContact() {
  const company = useCompanyInfo();

  if (company.status === "loading") {
    return <Spinner label="Loading contact details" />;
  }

  if (company.status === "error") {
    return (
      <p className="site-footer__muted">
        Contact details are unavailable right now.{" "}
        <button type="button" className="link-button" onClick={company.reload}>
          Try again
        </button>
      </p>
    );
  }

  const info = company.data;
  const addressLines = [
    info.addressLine1,
    info.addressLine2,
    `${info.city}, ${info.state} ${info.postalCode}`,
    info.country,
  ].filter(Boolean);

  return (
    <>
      <p className="site-footer__company">{info.companyName}</p>
      <address className="site-footer__address">
        {addressLines.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </address>
      <ul className="site-footer__contact">
        <li>
          Phone: <a href={`tel:${info.phone.replace(/\s+/g, "")}`}>{info.phone}</a>
        </li>
        {info.email && (
          <li>
            Email: <a href={`mailto:${info.email}`}>{info.email}</a>
          </li>
        )}
        {info.website && (
          <li>
            Website:{" "}
            <a href={info.website} rel="noopener noreferrer">
              {info.website.replace(/^https?:\/\//, "")}
            </a>
          </li>
        )}
      </ul>
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer" id="contact">
      <div className="container site-footer__inner">
        <section aria-labelledby="footer-contact-heading">
          <h2 id="footer-contact-heading" className="site-footer__heading">
            Contact
          </h2>
          <CompanyContact />
        </section>

        <section aria-labelledby="footer-links-heading">
          <h2 id="footer-links-heading" className="site-footer__heading">
            Explore
          </h2>
          <ul className="site-footer__links">
            <li>
              <Link to="/machines">All machines</Link>
            </li>
          </ul>
        </section>
      </div>
    </footer>
  );
}
