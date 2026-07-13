/*
 * Initial-avatars. The reference uses stock photography; we render deterministic
 * initials instead — no remote image fetches, which keeps the no-tracker
 * privacy invariant (scripts/check-trackers) intact and avoids leaking staff
 * likenesses. Tint is derived from the name so a person looks the same everywhere.
 */
const TINTS = [
  "bg-brand-cyan/15 text-brand-cyan",
  "bg-brand-teal/15 text-brand-teal",
  "bg-success/15 text-success",
  "bg-warning/15 text-warning",
  "bg-ink/10 text-text-primary",
];

function tintFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  name,
  size = 36,
  online,
  className = "",
}: {
  name: string;
  size?: number;
  online?: boolean;
  className?: string;
}) {
  return (
    <span className={`relative inline-flex shrink-0 ${className}`} style={{ width: size, height: size }}>
      <span
        className={`flex h-full w-full items-center justify-center rounded-full font-semibold ring-2 ring-surface-raised ${tintFor(name)}`}
        style={{ fontSize: Math.round(size * 0.36) }}
        title={name}
      >
        {initialsOf(name)}
      </span>
      {online && (
        <span
          className="absolute bottom-0 right-0 block rounded-full bg-success ring-2 ring-surface-raised"
          style={{ width: Math.max(8, size * 0.26), height: Math.max(8, size * 0.26) }}
        />
      )}
    </span>
  );
}

/** Overlapping avatar row, as used on the reference's summary cards. */
export function AvatarStack({ names, size = 34 }: { names: string[]; size?: number }) {
  return (
    <div className="flex items-center">
      {names.slice(0, 3).map((n, i) => (
        <span key={n + i} style={{ marginLeft: i === 0 ? 0 : -10 }}>
          <Avatar name={n} size={size} />
        </span>
      ))}
      {names.length > 3 && (
        <span
          className="flex items-center justify-center rounded-full bg-surface-overlay text-xs font-semibold text-text-secondary ring-2 ring-surface-raised"
          style={{ width: size, height: size, marginLeft: -10 }}
        >
          +{names.length - 3}
        </span>
      )}
    </div>
  );
}
