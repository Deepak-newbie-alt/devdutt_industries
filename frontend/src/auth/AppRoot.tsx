import { lazy, Suspense, useState } from "react";
import { Outlet, useMatches } from "react-router";

const StaffClerkProvider = lazy(async () => ({ default: (await import("./ClerkLayout")).StaffClerkProvider }));

// Routes that need Clerk (sign-in and the workspace) carry this handle.
export const NEEDS_CLERK = { needsClerk: true } as const;

function needsClerk(handle: unknown) {
  return typeof handle === "object" && handle !== null && "needsClerk" in handle;
}

// The root of every page. Clerk is loaded the first time a staff page is opened and then kept for the
// life of the tab: Clerk can't be started a second time on the same page, so unmounting it when leaving
// the staff pages left the sign-in form blank on the next visit until a reload.
export function AppRoot() {
  const matches = useMatches();
  const onStaffPage = matches.some((match) => needsClerk(match.handle));
  const [clerkStarted, setClerkStarted] = useState(onStaffPage);

  if (onStaffPage && !clerkStarted) {
    setClerkStarted(true);
  }

  if (!clerkStarted) {
    return <Outlet />;
  }

  return (
    <Suspense fallback={null}>
      <StaffClerkProvider>
        <Outlet />
      </StaffClerkProvider>
    </Suspense>
  );
}
