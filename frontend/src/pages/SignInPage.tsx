import { SignIn } from "@clerk/react";
import { Link } from "react-router";

// Staff sign-in only. Accounts are created by an administrator, so the
// "sign up" link in Clerk's footer is hidden; sign-up should also be disabled in Clerk.
export function SignInPage() {
  return (
    <div className="sign-in">
      <title>Staff sign-in | Devdutt Industries</title>
      <Link to="/" className="brand sign-in__brand">
        <span className="brand__mark" aria-hidden="true">
          DI
        </span>
        <span className="brand__name">Devdutt Industries</span>
      </Link>
      <p className="sign-in__lead">Staff sign-in</p>
      <SignIn routing="path" path="/sign-in" appearance={{ elements: { footerAction: { display: "none" } } }} />
      <p className="sign-in__note muted">
        Looking for our machines? <Link to="/machines">Browse the catalog</Link>
      </p>
    </div>
  );
}
