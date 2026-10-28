import { useState, type FormEvent } from "react";
import { Link, useLocation, useParams } from "react-router";
import { ApiError } from "../../api/client";
import { changeUserRole, changeUserStatus, getUser, ROLE_LABELS, serverFieldErrors, updateUserProfile } from "../../api/admin";
import { useEmployee } from "../../auth/EmployeeContext";
import { FormField } from "../../components/ui/FormField";
import { LoadError } from "../../components/ui/LoadError";
import { LoadingState } from "../../components/ui/LoadingState";
import { StatusMessage } from "../../components/ui/StatusMessage";
import { ConfirmBar } from "../../features/admin/ConfirmBar";
import { UserStatusBadge } from "../../features/admin/StatusBadges";
import { useApiQuery } from "../../hooks/useApiQuery";
import type { Employee } from "../../types/api";
import { formatDateTime } from "../../utils/format";

type Pending = "role" | "status" | null;

export function StaffDetailPage() {
  const { employee, request } = useEmployee();
  const { userId } = useParams();
  const location = useLocation();
  const id = Number(userId);
  const validId = Number.isInteger(id) && id > 0;

  const user = useApiQuery(
    (signal) => (validId ? getUser(request, id, signal) : Promise.reject(new ApiError("User not found", 404))),
    [userId],
  );

  if (user.status === "loading") {
    return (
      <div className="container page-section">
        <LoadingState label="Loading staff member" />
      </div>
    );
  }

  if (user.status === "error") {
    return (
      <div className="container page-section narrow">
        <title>Staff | Devdutt Industries Staff</title>
        {user.error.status === 404 || user.error.status === 400 ? (
          <>
            <h1>Staff member not found</h1>
            <Link to="/app/staff" className="button button--primary">
              Back to staff
            </Link>
          </>
        ) : (
          <LoadError title="This staff member couldn't be loaded" error={user.error} onRetry={user.reload} />
        )}
      </div>
    );
  }

  const justCreated = (location.state as { created?: boolean } | null)?.created === true;

  return (
    <StaffDetail
      key={user.data.id}
      person={user.data}
      isSelf={user.data.id === employee.id}
      justCreated={justCreated}
      onChanged={user.reload}
    />
  );
}

function StaffDetail({ person, isSelf, justCreated, onChanged }: { person: Employee; isSelf: boolean; justCreated: boolean; onChanged: () => void }) {
  const { request } = useEmployee();
  const [name, setName] = useState(person.name);
  const [phone, setPhone] = useState(person.phone);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(justCreated ? `${person.name} was added as a salesperson.` : null);

  async function run(key: string, action: () => Promise<unknown>, success: string) {
    setBusy(key);
    setError(null);
    setNotice(null);

    try {
      await action();
      setPending(null);
      setNotice(success);
      onChanged();
    } catch (caught) {
      const failure = caught instanceof ApiError ? caught : new ApiError("Something went wrong. Please try again.", null);
      setError(failure.message);
      if (key === "profile") setProfileErrors(serverFieldErrors(failure.fieldErrors));
      // 502: saved locally but the sign-in service didn't update; show the stored state.
      if (failure.status === 502) onChanged();
    } finally {
      setBusy(null);
    }
  }

  function saveProfile(event: FormEvent) {
    event.preventDefault();
    const changes: { name?: string; phone?: string } = {};
    const errors: Record<string, string> = {};

    if (!name.trim()) errors.name = "Enter their name.";
    if (!phone.trim()) errors.phone = "Enter their phone number.";
    setProfileErrors(errors);
    if (Object.keys(errors).length > 0) return;

    if (name.trim() !== person.name) changes.name = name.trim();
    if (phone.trim() !== person.phone) changes.phone = phone.trim();

    if (Object.keys(changes).length === 0) {
      setNotice("Nothing to save: the details are unchanged.");
      return;
    }

    void run("profile", () => updateUserProfile(request, person.id, changes), "Details saved.");
  }

  const nextRole = person.role === "ADMIN" ? "SALESPERSON" : "ADMIN";
  const nextStatus = person.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

  return (
    <div className="container page-section">
      <title>{`${person.name} | Devdutt Industries Staff`}</title>
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <ol>
          <li>
            <Link to="/app/staff">Staff</Link>
          </li>
          <li aria-current="page">{person.name}</li>
        </ol>
      </nav>

      <header className="detail-header">
        <h1>{person.name}</h1>
        <UserStatusBadge status={person.status} />
      </header>

      {notice && (
        <StatusMessage tone="success">
          <p>{notice}</p>
        </StatusMessage>
      )}
      {error && (
        <StatusMessage tone="error" title="That didn't work">
          <p>{error}</p>
        </StatusMessage>
      )}

      <div className="detail-grid">
        <div className="detail-main">
          <section className="panel" aria-labelledby="profile-heading">
            <h2 id="profile-heading" className="panel__title">
              Details
            </h2>
            <dl className="facts">
              <div>
                <dt>Email</dt>
                <dd>{person.email}</dd>
              </div>
              <div>
                <dt>Role</dt>
                <dd>{ROLE_LABELS[person.role]}</dd>
              </div>
              <div>
                <dt>Added</dt>
                <dd>{formatDateTime(person.createdAt)}</dd>
              </div>
            </dl>
            <form onSubmit={saveProfile} noValidate>
              <fieldset className="plain-fieldset" disabled={busy !== null}>
                <div className="form-grid">
                  <FormField id="profile-name" label="Name" error={profileErrors.name}>
                    {(a11y) => <input id="profile-name" className="input" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} {...a11y} />}
                  </FormField>
                  <FormField id="profile-phone" label="Phone" error={profileErrors.phone}>
                    {(a11y) => (
                      <input id="profile-phone" className="input" type="tel" maxLength={20} value={phone} onChange={(e) => setPhone(e.target.value)} {...a11y} />
                    )}
                  </FormField>
                </div>
                <p className="muted">The email address can't be changed here.</p>
                <button type="submit" className="button button--secondary">
                  {busy === "profile" ? "Saving…" : "Save details"}
                </button>
              </fieldset>
            </form>
          </section>
        </div>

        <aside className="detail-side">
          <section className="panel" aria-labelledby="access-heading">
            <h2 id="access-heading" className="panel__title">
              Access
            </h2>
            {isSelf ? (
              <p className="muted">You can't change your own role or status. Ask another admin.</p>
            ) : (
              <div className="button-column">
                {pending === "role" ? (
                  <ConfirmBar
                    confirmLabel={nextRole === "ADMIN" ? "Yes, make admin" : "Yes, make salesperson"}
                    busyLabel="Saving…"
                    busy={busy === "role"}
                    onCancel={() => setPending(null)}
                    onConfirm={() =>
                      void run("role", () => changeUserRole(request, person.id, nextRole), `${person.name} is now ${nextRole === "ADMIN" ? "an admin" : "a salesperson"}.`)
                    }
                  >
                    {nextRole === "ADMIN"
                      ? `Make ${person.name} an admin? Admins manage staff, the catalog and company settings, but can't claim inquiries, create quotations or update orders.`
                      : `Make ${person.name} a salesperson? They'll lose access to the admin pages.`}
                  </ConfirmBar>
                ) : (
                  <button type="button" className="button button--secondary" disabled={busy !== null || pending !== null} onClick={() => setPending("role")}>
                    {nextRole === "ADMIN" ? "Make admin" : "Make salesperson"}
                  </button>
                )}

                {pending === "status" ? (
                  <ConfirmBar
                    confirmLabel={nextStatus === "INACTIVE" ? "Yes, deactivate" : "Yes, reactivate"}
                    busyLabel="Saving…"
                    busy={busy === "status"}
                    onCancel={() => setPending(null)}
                    onConfirm={() =>
                      void run(
                        "status",
                        () => changeUserStatus(request, person.id, nextStatus),
                        nextStatus === "INACTIVE" ? `${person.name} was deactivated.` : `${person.name} was reactivated.`,
                      )
                    }
                  >
                    {nextStatus === "INACTIVE"
                      ? `Deactivate ${person.name}? They lose access straight away and can't sign in until reactivated. Their inquiries, quotations and orders stay as they are.`
                      : `Reactivate ${person.name}? They'll be able to sign in again.`}
                  </ConfirmBar>
                ) : (
                  <button type="button" className="button button--secondary" disabled={busy !== null || pending !== null} onClick={() => setPending("status")}>
                    {nextStatus === "INACTIVE" ? "Deactivate" : "Reactivate"}
                  </button>
                )}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
