"use client";

import { useActionState, useState } from "react";
import { Avatar } from "@/components/dashboard/avatar";
import {
  removeDepartment,
  removeMember,
  saveDepartment,
  saveMember,
  uploadMemberPhoto,
  type OrgState,
} from "./actions";
import {
  DESIGNATION_SUGGESTIONS,
  linksToText,
  type ResolvedMember,
} from "@/lib/org-types";

const input =
  "h-11 w-full rounded-control border border-border-subtle bg-surface-raised px-3.5 text-[15px] placeholder:text-text-muted focus:border-brand-cyan focus:outline-none";
const label = "block text-sm font-medium text-text-secondary";
const primary =
  "h-11 rounded-control bg-ink px-5 text-sm font-medium text-surface-raised transition-colors duration-[--duration-fast] hover:bg-ink-hover disabled:opacity-60";
const ghost =
  "h-11 rounded-control border border-border-subtle px-5 text-sm font-medium transition-colors duration-[--duration-fast] hover:bg-surface-overlay";

function Feedback({ state }: { state: OrgState }) {
  if (state.error)
    return (
      <p role="alert" className="mt-3 text-sm text-danger">
        {state.error}
      </p>
    );
  if (state.notice)
    return (
      <p role="status" className="mt-3 text-sm text-success">
        {state.notice}
      </p>
    );
  return null;
}

export type Option = { id: string; name: string };
export type AccountOption = { id: string; name: string; email: string; roleLabel: string };

export function MemberForm({
  member,
  departments,
  teams,
  accounts,
  onDone,
}: {
  member?: ResolvedMember;
  departments: Option[];
  teams: Option[];
  /** Accounts not yet on the chart, plus this member's own linked account. */
  accounts: AccountOption[];
  onDone?: () => void;
}) {
  const [state, action, pending] = useActionState<OrgState, FormData>(saveMember, {});
  const [linked, setLinked] = useState(member?.userId ?? "");

  return (
    <form
      action={async (fd) => {
        await action(fd);
        onDone?.();
      }}
      className="rounded-card border border-border-subtle p-5"
    >
      {member && <input type="hidden" name="id" value={member.id} />}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={label} htmlFor={`userId-${member?.id ?? "new"}`}>
            Linked account
          </label>
          <select
            id={`userId-${member?.id ?? "new"}`}
            name="userId"
            value={linked}
            onChange={(e) => setLinked(e.target.value)}
            className={`mt-2 ${input}`}
          >
            <option value="">No account (advisor, investor, external)</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} · {a.roleLabel} · {a.email}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-text-muted">
            {linked
              ? "Name, email and photo come from this person's own profile — there is only ever one copy, and they keep it correct themselves."
              : "Nobody to link to? Fill in the details below; they live on the org record."}
          </p>
        </div>

        {/* Identity fields are only editable when there is no account to take them
            from. Showing them for a linked member would invite someone to type a
            second name that quietly disagrees with the first. */}
        {!linked && (
          <>
            <div>
              <label className={label} htmlFor={`name-${member?.id ?? "new"}`}>
                Name
              </label>
              <input
                id={`name-${member?.id ?? "new"}`}
                name="name"
                defaultValue={member?.linked ? "" : (member?.name ?? "")}
                maxLength={80}
                className={`mt-2 ${input}`}
              />
            </div>
            <div>
              <label className={label} htmlFor={`email-${member?.id ?? "new"}`}>
                Email
              </label>
              <input
                id={`email-${member?.id ?? "new"}`}
                name="email"
                type="email"
                defaultValue={member?.linked ? "" : (member?.email ?? "")}
                maxLength={120}
                className={`mt-2 ${input}`}
              />
            </div>
            <div>
              <label className={label} htmlFor={`phone-${member?.id ?? "new"}`}>
                Phone
              </label>
              <input
                id={`phone-${member?.id ?? "new"}`}
                name="phone"
                defaultValue={member?.linked ? "" : (member?.phone ?? "")}
                maxLength={40}
                className={`mt-2 ${input}`}
              />
            </div>
          </>
        )}

        <div>
          <label className={label} htmlFor={`designation-${member?.id ?? "new"}`}>
            Designation
          </label>
          <input
            id={`designation-${member?.id ?? "new"}`}
            name="designation"
            list="designations"
            defaultValue={member?.designation ?? ""}
            required
            maxLength={60}
            placeholder="CTO, Investor, Engineering Lead…"
            className={`mt-2 ${input}`}
          />
          <datalist id="designations">
            {DESIGNATION_SUGGESTIONS.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
          <p className="mt-1.5 text-xs text-text-muted">
            Suggestions only — type anything. A fixed list of job titles is a guess
            about a company that does not exist yet.
          </p>
        </div>

        <div>
          <label className={label} htmlFor={`department-${member?.id ?? "new"}`}>
            Department
          </label>
          <select
            id={`department-${member?.id ?? "new"}`}
            name="departmentId"
            defaultValue={member?.department?.id ?? ""}
            className={`mt-2 ${input}`}
          >
            <option value="">Unassigned</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={label} htmlFor={`team-${member?.id ?? "new"}`}>
            Team
          </label>
          <select
            id={`team-${member?.id ?? "new"}`}
            name="teamId"
            defaultValue={member?.team?.id ?? ""}
            className={`mt-2 ${input}`}
          >
            <option value="">None</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={label} htmlFor={`visibility-${member?.id ?? "new"}`}>
            Visibility
          </label>
          <select
            id={`visibility-${member?.id ?? "new"}`}
            name="visibility"
            defaultValue={member?.visibility ?? "INTERNAL"}
            className={`mt-2 ${input}`}
          >
            <option value="PUBLIC">Public — shown on the website</option>
            <option value="INTERNAL">Internal — workspace only</option>
            <option value="HIDDEN">Hidden — visible to you alone</option>
          </select>
        </div>

        <div>
          <label className={label} htmlFor={`sortOrder-${member?.id ?? "new"}`}>
            Display order
          </label>
          <input
            id={`sortOrder-${member?.id ?? "new"}`}
            name="sortOrder"
            type="number"
            defaultValue={member?.sortOrder ?? 0}
            className={`mt-2 ${input}`}
          />
        </div>

        <div className="sm:col-span-2">
          <label className={label} htmlFor={`bio-${member?.id ?? "new"}`}>
            Bio
          </label>
          <textarea
            id={`bio-${member?.id ?? "new"}`}
            name="bio"
            rows={3}
            maxLength={600}
            defaultValue={member?.linked ? "" : (member?.bio ?? "")}
            placeholder={
              linked ? "Linked accounts use the bio from their own profile." : ""
            }
            className="mt-2 w-full rounded-control border border-border-subtle bg-surface-raised p-3.5 text-[15px] leading-relaxed focus:border-brand-cyan focus:outline-none"
          />
        </div>

        <div className="sm:col-span-2">
          <label className={label} htmlFor={`links-${member?.id ?? "new"}`}>
            Social links
          </label>
          <textarea
            id={`links-${member?.id ?? "new"}`}
            name="links"
            rows={3}
            defaultValue={member ? linksToText(member.links) : ""}
            placeholder={"LinkedIn|https://linkedin.com/in/…\nGitHub|https://github.com/…"}
            className="mt-2 w-full rounded-control border border-border-subtle bg-surface-raised p-3.5 font-mono text-sm focus:border-brand-cyan focus:outline-none"
          />
          <p className="mt-1.5 text-xs text-text-muted">
            One per line, <code>Label|URL</code>. https only — these become links on
            the public site.
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button type="submit" disabled={pending} className={primary}>
          {pending ? "Saving…" : member ? "Save changes" : "Add to organization"}
        </button>
        {onDone && (
          <button type="button" onClick={onDone} className={ghost}>
            Cancel
          </button>
        )}
      </div>
      <Feedback state={state} />
    </form>
  );
}

/** Photo upload — only for members with no account (a linked member has a profile). */
export function MemberPhotoForm({ member }: { member: ResolvedMember }) {
  const [state, action, pending] = useActionState<OrgState, FormData>(
    uploadMemberPhoto,
    {},
  );

  if (member.linked) {
    return (
      <p className="text-sm text-text-muted">
        Photo comes from this person&apos;s profile. They change it themselves — and
        it changes everywhere at once.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-center gap-4">
      <input type="hidden" name="id" value={member.id} />
      <Avatar name={member.name} size={56} src={member.photoUrl} />
      <input
        type="file"
        name="photo"
        accept="image/png,image/jpeg"
        required
        className="max-w-full text-sm text-text-secondary file:mr-3 file:h-10 file:cursor-pointer file:rounded-control file:border file:border-border-subtle file:bg-surface-raised file:px-4 file:text-sm file:font-medium file:text-text-primary"
      />
      <button type="submit" disabled={pending} className={primary}>
        {pending ? "Uploading…" : "Upload photo"}
      </button>
      <Feedback state={state} />
    </form>
  );
}

export function MemberRow({
  member,
  departments,
  teams,
  accounts,
}: {
  member: ResolvedMember;
  departments: Option[];
  teams: Option[];
  accounts: AccountOption[];
}) {
  const [open, setOpen] = useState(false);

  const tone =
    member.visibility === "PUBLIC"
      ? "bg-success/10 text-success"
      : member.visibility === "HIDDEN"
        ? "bg-danger/10 text-danger"
        : "bg-surface-overlay text-text-secondary";

  return (
    <li className="border-b border-border-subtle py-4 last:border-0">
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={member.name} size={44} src={member.photoUrl} online={member.online} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold">{member.name}</span>
            <span className="rounded-full bg-brand-cyan/10 px-2.5 py-0.5 text-xs font-semibold text-brand-cyan">
              {member.designation}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>
              {member.visibility}
            </span>
            {member.linked ? (
              <span className="rounded-full bg-surface-overlay px-2.5 py-0.5 text-xs text-text-secondary">
                account linked
              </span>
            ) : (
              <span className="rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-semibold text-warning">
                no account
              </span>
            )}
          </span>
          <span className="mt-0.5 block truncate text-sm text-text-muted">
            {[member.department?.name, member.team?.name, member.email]
              .filter(Boolean)
              .join(" · ") || "—"}
          </span>
        </span>

        <span className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-sm font-medium text-brand-cyan hover:text-brand-teal"
          >
            {open ? "Close" : "Edit"}
          </button>
          <form action={removeMember}>
            <input type="hidden" name="id" value={member.id} />
            <button type="submit" className="text-sm font-medium text-danger hover:opacity-80">
              Remove
            </button>
          </form>
        </span>
      </div>

      {open && (
        <div className="mt-4 flex flex-col gap-4">
          <MemberForm
            member={member}
            departments={departments}
            teams={teams}
            accounts={accounts}
            onDone={() => setOpen(false)}
          />
          <div className="rounded-card border border-border-subtle p-5">
            <h4 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
              Photo
            </h4>
            <div className="mt-4">
              <MemberPhotoForm member={member} />
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

export function AddMember({
  departments,
  teams,
  accounts,
}: {
  departments: Option[];
  teams: Option[];
  accounts: AccountOption[];
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={primary}>
        Add person
      </button>
    );
  }
  return (
    <MemberForm
      departments={departments}
      teams={teams}
      accounts={accounts}
      onDone={() => setOpen(false)}
    />
  );
}

export function DepartmentForm({ department }: { department?: Option & { description?: string | null; sortOrder?: number } }) {
  const [state, action, pending] = useActionState<OrgState, FormData>(saveDepartment, {});

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      {department && <input type="hidden" name="id" value={department.id} />}
      <div className="min-w-[180px] flex-1">
        <label className={label} htmlFor={`dept-name-${department?.id ?? "new"}`}>
          Department
        </label>
        <input
          id={`dept-name-${department?.id ?? "new"}`}
          name="name"
          defaultValue={department?.name ?? ""}
          required
          maxLength={60}
          className={`mt-2 ${input}`}
        />
      </div>
      <div className="w-28">
        <label className={label} htmlFor={`dept-order-${department?.id ?? "new"}`}>
          Order
        </label>
        <input
          id={`dept-order-${department?.id ?? "new"}`}
          name="sortOrder"
          type="number"
          defaultValue={department?.sortOrder ?? 0}
          className={`mt-2 ${input}`}
        />
      </div>
      <button type="submit" disabled={pending} className={primary}>
        {department ? "Save" : "Add"}
      </button>
      {department && (
        <span className="flex items-center">
          <RemoveDepartment id={department.id} />
        </span>
      )}
      <span className="w-full">
        <Feedback state={state} />
      </span>
    </form>
  );
}

function RemoveDepartment({ id }: { id: string }) {
  return (
    <form action={removeDepartment}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="h-11 rounded-control px-3 text-sm font-medium text-danger hover:opacity-80"
      >
        Remove
      </button>
    </form>
  );
}
