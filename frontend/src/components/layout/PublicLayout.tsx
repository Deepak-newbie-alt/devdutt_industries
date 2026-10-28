import { Outlet, ScrollRestoration } from "react-router";
import { CompanyInfoProvider } from "../../context/CompanyInfoContext";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

export function PublicLayout() {
  return (
    <CompanyInfoProvider>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="page">
        <SiteHeader />
        <main id="main" className="page__main" tabIndex={-1}>
          <Outlet />
        </main>
        <SiteFooter />
      </div>
      <ScrollRestoration />
    </CompanyInfoProvider>
  );
}
