"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/dashboard/avatar";
import { AvatarCropper } from "./crop";
import {
  changePassword,
  removeAvatar,
  updateNotifications,
  updateProfile,
  uploadAvatar,
  type ProfileState,
} from "./actions";
import type { OwnProfile } from "@/lib/profile";

const input =
  "h-11 w-full rounded-control border border-border-subtle bg-surface-raised px-3.5 text-[15px] placeholder:text-text-muted focus:border-brand-cyan focus:outline-none";
const label = "block text-sm font-medium text-text-secondary";
const primary =
  "h-11 rounded-control bg-ink px-5 text-sm font-medium text-surface-raised transition-colors duration-[--duration-fast] hover:bg-ink-hover disabled:opacity-60";
const ghost =
  "h-11 rounded-control border border-border-subtle px-5 text-sm font-medium transition-colors duration-[--duration-fast] hover:bg-surface-overlay disabled:opacity-60";

function Feedback({ state }: { state: ProfileState }) {
  if (state.error) {
    return (
      <p role="alert" className="mt-3 text-sm text-danger">
        {state.error}
      </p>
    );
  }
  if (state.notice) {
    return (
      <p role="status" className="mt-3 text-sm text-success">
        {state.notice}
      </p>
    );
  }
  return null;
}

/**
 * Photo: choose, crop, upload, remove.
 *
 * Choosing a file no longer submits it. It opens the cropper (./crop.tsx), and
 * what is uploaded is the square the person composed — under the same field
 * name, to the same server action, through the same `checkAvatar` validation.
 * The client step decides framing; it decides nothing about trust.
 */
export function AvatarForm({ profile }: { profile: OwnProfile }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ProfileState, FormData>(uploadAvatar, {});
  /** The file the person picked, awaiting a crop. Null when nothing is pending. */
  const [picked, setPicked] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /* Selecting the same file twice must reopen the cropper, so the input is
     cleared after every pick — otherwise `change` never fires the second time. */
  function reset() {
    setPicked(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-6">
        {profile.avatarUrl ? (
          // Served from our own authenticated route; no remote host is involved.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatarUrl}
            alt=""
            width={80}
            height={80}
            className="h-20 w-20 rounded-full object-cover ring-2 ring-surface-raised"
          />
        ) : (
          <Avatar name={profile.name} size={80} />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              name="avatar"
              accept="image/png,image/jpeg"
              disabled={pending}
              onChange={(e) => setPicked(e.target.files?.[0] ?? null)}
              className="max-w-full text-sm text-text-secondary file:mr-3 file:h-10 file:cursor-pointer file:rounded-control file:border file:border-border-subtle file:bg-surface-raised file:px-4 file:text-sm file:font-medium file:text-text-primary"
            />
            {profile.avatarUrl && !picked && (
              <button
                type="button"
                className={ghost}
                onClick={async () => {
                  await removeAvatar();
                  router.refresh();
                }}
              >
                Remove
              </button>
            )}
          </div>
          <p className="mt-3 text-sm text-text-muted">
            PNG or JPEG, up to 2 MB. Choose a photo and you will be able to
            position and zoom it before it is saved. Location and camera metadata
            are stripped from the file before it is stored — a photo from a phone
            carries the place it was taken, and we do not keep that.
          </p>
          <Feedback state={state} />
        </div>
      </div>

      {picked && (
        <AvatarCropper
          file={picked}
          busy={pending}
          onCancel={reset}
          onCropped={({ file }) => {
            /* The cropped square goes into the SAME field the plain input used,
               so the server action is untouched and sees an ordinary upload. */
            const data = new FormData();
            data.set("avatar", file);
            // uploadAvatar revalidates /app/profile and the workspace layout
            // itself, so there is nothing to refresh from here.
            action(data);
            reset();
          }}
        />
      )}
    </div>
  );
}

export function DetailsForm({ profile }: { profile: OwnProfile }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfile, {});

  return (
    <form action={action}>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="name">
            Display name
          </label>
          <input id="name" name="name" defaultValue={profile.name} required maxLength={80} className={`mt-2 ${input}`} />
        </div>
        <div>
          <label className={label} htmlFor="title">
            Title
          </label>
          <input
            id="title"
            name="title"
            defaultValue={profile.title ?? ""}
            maxLength={80}
            placeholder="e.g. Security Engineer"
            className={`mt-2 ${input}`}
          />
        </div>
        <div>
          <label className={label} htmlFor="pronouns">
            Pronouns
          </label>
          <input
            id="pronouns"
            name="pronouns"
            defaultValue={profile.pronouns ?? ""}
            maxLength={32}
            placeholder="she/her · he/him · they/them"
            className={`mt-2 ${input}`}
          />
        </div>
        <div>
          <label className={label} htmlFor="timezone">
            Timezone
          </label>
          <input
            id="timezone"
            name="timezone"
            defaultValue={profile.timezone ?? ""}
            maxLength={64}
            placeholder="e.g. Asia/Kolkata"
            className={`mt-2 ${input}`}
          />
        </div>
        <div>
          <label className={label} htmlFor="location">
            Location
          </label>
          <input
            id="location"
            name="location"
            defaultValue={profile.location ?? ""}
            maxLength={80}
            className={`mt-2 ${input}`}
          />
        </div>
        <div>
          <label className={label} htmlFor="phone">
            Contact number
          </label>
          <input
            id="phone"
            name="phone"
            defaultValue={profile.phone ?? ""}
            maxLength={40}
            className={`mt-2 ${input}`}
          />
          <p className="mt-1.5 text-xs text-text-muted">
            Visible to colleagues only — never to external collaborators.
          </p>
        </div>
      </div>

      <div className="mt-5">
        <label className={label} htmlFor="bio">
          About
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={4}
          maxLength={600}
          defaultValue={profile.bio ?? ""}
          className="mt-2 w-full rounded-control border border-border-subtle bg-surface-raised p-3.5 text-[15px] leading-relaxed placeholder:text-text-muted focus:border-brand-cyan focus:outline-none"
        />
      </div>

      <button type="submit" disabled={pending} className={`mt-5 ${primary}`}>
        {pending ? "Saving…" : "Save profile"}
      </button>
      <Feedback state={state} />
    </form>
  );
}

export function NotificationsForm({ profile }: { profile: OwnProfile }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(
    updateNotifications,
    {},
  );

  const rows = [
    {
      name: "notifyMentions",
      title: "Mentions and direct messages",
      detail: "When someone messages you or assigns you work.",
      checked: profile.notifyMentions,
    },
    {
      name: "notifyDigest",
      title: "Weekly digest",
      detail: "A summary of your workspace — what moved, what is waiting on you.",
      checked: profile.notifyDigest,
    },
    {
      name: "notifyProduct",
      title: "Product announcements",
      detail: "New releases and platform changes.",
      checked: profile.notifyProduct,
    },
  ];

  return (
    <form action={action}>
      <ul className="flex flex-col gap-4">
        {rows.map((r) => (
          <li key={r.name} className="flex items-start gap-3">
            <input
              id={r.name}
              name={r.name}
              type="checkbox"
              defaultChecked={r.checked}
              className="mt-1 h-4 w-4 accent-brand-cyan"
            />
            <label htmlFor={r.name} className="min-w-0">
              <span className="block text-[15px] font-medium">{r.title}</span>
              <span className="block text-sm text-text-secondary">{r.detail}</span>
            </label>
          </li>
        ))}
      </ul>

      <p className="mt-5 rounded-card border border-border-subtle bg-surface-overlay/40 p-4 text-sm leading-relaxed text-text-secondary">
        Security mail — password changes, two-factor changes, sign-in alerts and
        incident notices — has no switch here and never will. You do not get to
        mute the alarm on your own account.
      </p>

      <button type="submit" disabled={pending} className={`mt-5 ${primary}`}>
        {pending ? "Saving…" : "Save preferences"}
      </button>
      <Feedback state={state} />
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<ProfileState, FormData>(changePassword, {});

  return (
    <form action={action} className="max-w-md">
      <div className="flex flex-col gap-5">
        <div>
          <label className={label} htmlFor="current">
            Current password
          </label>
          <input
            id="current"
            name="current"
            type="password"
            autoComplete="current-password"
            required
            className={`mt-2 ${input}`}
          />
        </div>
        <div>
          <label className={label} htmlFor="next">
            New password
          </label>
          <input
            id="next"
            name="next"
            type="password"
            autoComplete="new-password"
            minLength={10}
            required
            className={`mt-2 ${input}`}
          />
        </div>
        <div>
          <label className={label} htmlFor="confirm">
            Confirm new password
          </label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            className={`mt-2 ${input}`}
          />
        </div>
      </div>

      <button type="submit" disabled={pending} className={`mt-5 ${primary}`}>
        {pending ? "Changing…" : "Change password"}
      </button>
      <p className="mt-3 text-sm text-text-muted">
        Changing your password signs out every other session.
      </p>
      <Feedback state={state} />
    </form>
  );
}
