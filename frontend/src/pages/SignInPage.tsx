import { SignIn } from "@clerk/react";
import { Link } from "react-router";
import { Logo } from "../components/brand/Logo";

// Clerk's form in the site's colours and type (appearance only).
const SIGN_IN_APPEARANCE = {
  variables: { colorPrimary: "#1b1c1f", borderRadius: "4px", fontFamily: "inherit" },
  elements: { footerAction: { display: "none" } },
};

// Staff sign-in only. Accounts are created by an administrator, so the
// "sign up" link in Clerk's footer is hidden; sign-up should also be disabled in Clerk.
export function SignInPage() {
  return (
    <div className="sign-in">
      <title>Staff sign-in | Devdutt Industries</title>
      <div className="sign-in__intro">
        <Link to="/" className="sign-in__brand logo-plate" aria-label="Devdutt Industries home">
          <Logo />
        </Link>
        <div>
          <h1 className="sign-in__title">Staff sign-in</h1>
          <p className="sign-in__lead">For the sales team and administrators. Accounts are created by an administrator.</p>
        </div>
        <p className="sign-in__note">
          Looking for our machines? <Link to="/machines">Browse the catalog</Link>
        </p>
      </div>
      <div className="sign-in__form">
        <SignIn routing="path" path="/sign-in" appearance={SIGN_IN_APPEARANCE} />
      </div>
    </div>
  );
}
