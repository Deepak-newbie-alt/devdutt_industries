import { Link } from "react-router";
import { useCompanyInfo } from "../../context/CompanyInfoContext";
import { Logo } from "../brand/Logo";
import { Spinner } from "../ui/Spinner";

// Address and contact details from the public company settings; email and website only when set.
function CompanyContact() {
  const company = useCompanyInfo();

  if (company.status === "loading") {
    return (
      <div className="site-footer__wide">
        <Spinner label="Loading contact details" />
      </div>
    );
  }

  if (company.status === "error") {
    return (
      <p className="site-footer__muted site-footer__wide">
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
      <section aria-labelledby="footer-visit-heading">
        <h3 id="footer-visit-heading" className="site-footer__heading">
          Visit
        </h3>
        <address className="site-footer__address">
          <span>{info.companyName}</span>
          {addressLines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </address>
      </section>

      <section aria-labelledby="footer-reach-heading">
        <h3 id="footer-reach-heading" className="site-footer__heading">
          Talk to sales
        </h3>
        <ul className="site-footer__contact">
          <li>
            <span className="site-footer__label">Phone</span>
            <a href={`tel:${info.phone.replace(/\s+/g, "")}`}>{info.phone}</a>
          </li>
          {info.email && (
            <li>
              <span className="site-footer__label">Email</span>
              <a href={`mailto:${info.email}`}>{info.email}</a>
            </li>
          )}
          {info.website && (
            <li>
              <span className="site-footer__label">Website</span>
              <a href={info.website} rel="noopener noreferrer">
                {info.website.replace(/^https?:\/\//, "")}
              </a>
            </li>
          )}
        </ul>
      </section>
    </>
  );
}

function FooterLinks() {
  return (
    <nav aria-labelledby="footer-links-heading">
      <h3 id="footer-links-heading" className="site-footer__heading">
        Explore
      </h3>
      <ul className="site-footer__links">
        <li>
          <Link to="/machines">All machines</Link>
        </li>
        <li>
          <Link to="/my-inquiries">My enquiries</Link>
        </li>
      </ul>
    </nav>
  );
}

function CompanyName() {
  const company = useCompanyInfo();
  return <>{company.status === "success" ? company.data.companyName : "Devdutt Industries"}</>;
}

// The closing call to action: the sales phone (once loaded) and the catalog.
function FooterActions() {
  const company = useCompanyInfo();
  const phone = company.status === "success" ? company.data.phone : null;

  return (
    <div className="button-row">
      {phone && (
        <a href={`tel:${phone.replace(/s+/g, "")}`} className="button button--accent button--large">
          Call {phone}
        </a>
      )}
      <Link to="/machines" className="button button--inverse button--large">
        Browse machines
      </Link>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer" id="contact">
      <div className="container site-footer__inner">
        <div className="site-footer__lead">
          <div>
            <span className="logo-plate">
              <Logo />
            </span>
            <h2 className="site-footer__title">Have a requirement? Talk to our sales team.</h2>
          </div>
          <FooterActions />
        </div>
        <div className="site-footer__columns">
          <CompanyContact />
          <FooterLinks />
        </div>
        <div className="site-footer__bottom">
          <p>
            © {new Date().getFullYear()} <CompanyName />
          </p>
          <p>Prices are per unit; taxes and final terms are confirmed in your quotation.</p>
          {/* Kept out of "Explore" and labelled, so customers can tell it isn't for them. */}
          <p className="site-footer__staff">
            <Link to="/sign-in">Staff sign-in</Link>
            <span>Employees only. Customers don't need an account.</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
