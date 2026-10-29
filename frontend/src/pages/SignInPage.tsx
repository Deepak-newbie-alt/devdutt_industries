import { SignIn } from "@clerk/react";
import { Link } from "react-router";
import { Logo } from "../components/brand/Logo";
import { useTheme } from "../theme/theme";

// Clerk's form in the site's colours and type (appearance only). Clerk follows the page's colour
// scheme on its own, so only the primary button needs the theme's action colours.
const PRIMARY = {
  light: { colorPrimary: "#1b1c1f", colorPrimaryForeground: "#ffffff" },
  dark: { colorPrimary: "#f1efeb", colorPrimaryForeground: "#121315" },
};

// Staff sign-in only. Accounts are created by an administrator, so the
// "sign up" link in Clerk's footer is hidden; sign-up should also be disabled in Clerk.
export function SignInPage() {
  const theme = useTheme();
  const appearance = {
    variables: { ...PRIMARY[theme], borderRadius: "4px", fontFamily: "inherit" },
    elements: { footerAction: { display: "none" } },
  };

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
          Customer? You don't need an account. <Link to="/machines">Browse the catalog</Link> or{" "}
          <Link to="/my-inquiries">check on an enquiry</Link>.
        </p>
      </div>
      <div className="sign-in__form">
        <SignIn routing="path" path="/sign-in" appearance={appearance} />
      </div>
    </div>
  );
}
