import { ClerkProvider } from "@clerk/react";
import { Outlet, useNavigate } from "react-router";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Wraps only the sign-in page and the employee workspace, so the public site
// and the customer quotation page never load Clerk.
export function ClerkLayout() {
  const navigate = useNavigate();

  if (!publishableKey) {
    throw new Error("VITE_CLERK_PUBLISHABLE_KEY is not set. Add it to frontend/.env.local.");
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      signInUrl="/sign-in"
      signInFallbackRedirectUrl="/app"
      afterSignOutUrl="/sign-in"
    >
      <Outlet />
    </ClerkProvider>
  );
}
