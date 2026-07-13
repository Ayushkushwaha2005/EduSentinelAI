"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { removeLogo, saveCompany, uploadLogo, type CompanyState } from "./actions";
import { linksToText } from "@/lib/org-types";
import type { Company } from "@/lib/company";

const input =
  "h-11 w-full rounded-control border border-border-subtle bg-surface-raised px-3.5 text-[15px] placeholder:text-text-muted focus:border-brand-cyan focus:outline-none";
const label = "block text-sm font-medium text-text-secondary";
const primary =
  "h-11 rounded-control bg-ink px-5 text-sm font-medium text-surface-raised transition-colors duration-[--duration-fast] hover:bg-ink-hover disabled:opacity-60";
const ghost =
  "h-11 rounded-control border border-border-subtle px-5 text-sm font-medium transition-colors duration-[--duration-fast] hover:bg-surface-overlay";

function Feedback({ state }: { state: CompanyState }) {
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

export function LogoForm({ company }: { company: Company }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<CompanyState, FormData>(uploadLogo, {});

  return (
    <div className="flex flex-wrap items-center gap-6">
      {company.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={company.logoUrl}
          alt={`${company.name} logo`}
          className="h-16 w-auto max-w-[220px] rounded-card bg-surface-overlay object-contain p-2"
        />
      ) : (
        <span className="flex h-16 w-16 items-center justify-center rounded-card bg-surface-overlay text-sm text-text-muted">
          none
        </span>
      )}

      <div className="min-w-0 flex-1">
        <form action={action} className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            name="logo"
            accept="image/png,image/jpeg"
            required
            className="max-w-full text-sm text-text-secondary file:mr-3 file:h-10 file:cursor-pointer file:rounded-control file:border file:border-border-subtle file:bg-surface-raised file:px-4 file:text-sm file:font-medium file:text-text-primary"
          />
          <button type="submit" disabled={pending} className={primary}>
            {pending ? "Uploading…" : "Upload"}
          </button>
          {company.logoUrl && (
            <button
              type="button"
              className={ghost}
              onClick={async () => {
                await removeLogo();
                router.refresh();
              }}
            >
              Remove
            </button>
          )}
        </form>
        <p className="mt-3 text-sm text-text-muted">
          PNG or JPEG, up to 2 MB. SVG is refused: an SVG can carry script, and a
          logo runs on every page of the public site — the worst possible place for
          it. With no logo uploaded, the built-in EduSentinel wordmark is used.
        </p>
        <Feedback state={state} />
      </div>
    </div>
  );
}

export function CompanyForm({ company }: { company: Company }) {
  const [state, action, pending] = useActionState<CompanyState, FormData>(saveCompany, {});

  return (
    <form action={action}>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="name">
            Company name
          </label>
          <input id="name" name="name" defaultValue={company.name} required maxLength={80} className={`mt-2 ${input}`} />
        </div>
        <div>
          <label className={label} htmlFor="legalName">
            Legal name
          </label>
          <input
            id="legalName"
            name="legalName"
            defaultValue={company.legalName ?? ""}
            maxLength={120}
            placeholder="Used in legal pages and contracts"
            className={`mt-2 ${input}`}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="tagline">
            Tagline
          </label>
          <input
            id="tagline"
            name="tagline"
            defaultValue={company.tagline ?? ""}
            maxLength={140}
            className={`mt-2 ${input}`}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            maxLength={800}
            defaultValue={company.description ?? ""}
            className="mt-2 w-full rounded-control border border-border-subtle bg-surface-raised p-3.5 text-[15px] leading-relaxed focus:border-brand-cyan focus:outline-none"
          />
          <p className="mt-1.5 text-xs text-text-muted">
            Used as the site&apos;s meta description — it is what search engines and
            link previews show.
          </p>
        </div>

        <div>
          <label className={label} htmlFor="email">
            Contact email
          </label>
          <input id="email" name="email" type="email" defaultValue={company.email ?? ""} maxLength={120} className={`mt-2 ${input}`} />
        </div>
        <div>
          <label className={label} htmlFor="phone">
            Phone
          </label>
          <input id="phone" name="phone" defaultValue={company.phone ?? ""} maxLength={40} className={`mt-2 ${input}`} />
        </div>
        <div>
          <label className={label} htmlFor="website">
            Website
          </label>
          <input
            id="website"
            name="website"
            defaultValue={company.website ?? ""}
            maxLength={200}
            placeholder="https://…"
            className={`mt-2 ${input}`}
          />
        </div>
        <div>
          <label className={label} htmlFor="founded">
            Founded
          </label>
          <input id="founded" name="founded" defaultValue={company.founded ?? ""} maxLength={20} className={`mt-2 ${input}`} />
        </div>

        <div className="sm:col-span-2">
          <label className={label} htmlFor="address">
            Address
          </label>
          <textarea
            id="address"
            name="address"
            rows={2}
            maxLength={240}
            defaultValue={company.address ?? ""}
            className="mt-2 w-full rounded-control border border-border-subtle bg-surface-raised p-3.5 text-[15px] focus:border-brand-cyan focus:outline-none"
          />
        </div>

        <div className="sm:col-span-2">
          <label className={label} htmlFor="links">
            Social links
          </label>
          <textarea
            id="links"
            name="links"
            rows={3}
            defaultValue={linksToText(company.links)}
            placeholder={"LinkedIn|https://linkedin.com/company/…\nGitHub|https://github.com/…"}
            className="mt-2 w-full rounded-control border border-border-subtle bg-surface-raised p-3.5 font-mono text-sm focus:border-brand-cyan focus:outline-none"
          />
          <p className="mt-1.5 text-xs text-text-muted">
            One per line, <code>Label|URL</code>. https only — they render in the
            site footer.
          </p>
        </div>
      </div>

      <button type="submit" disabled={pending} className={`mt-5 ${primary}`}>
        {pending ? "Saving…" : "Save company profile"}
      </button>
      <Feedback state={state} />
    </form>
  );
}
