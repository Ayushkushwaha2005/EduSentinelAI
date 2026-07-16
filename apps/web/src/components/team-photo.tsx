import Image from "next/image";
import { LogoMark } from "./logo";

/*
 * Team portrait. Source photos are tall portraits with faces in the upper
 * region, so crops anchor to the top — never center-crop a face away.
 * When no photo has been supplied, render a neutral brand tile (per brand
 * policy: no initials, no stock avatars). `compact` drops the caption for
 * small tiles where it cannot fit.
 */
export function TeamPhoto({
  name,
  photo,
  className = "",
  sizes,
  compact = false,
  objectPosition,
}: {
  name: string;
  photo: string | null;
  className?: string;
  sizes: string;
  compact?: boolean;
  /**
   * Per-portrait crop override for sources whose framing differs from the
   * default (tall portrait, face at top). Still `object-cover` — never a
   * stretch — this only moves the visible window.
   */
  objectPosition?: string;
}) {
  if (!photo) {
    return (
      <div
        className={`flex items-center justify-center bg-surface-overlay ${className}`}
      >
        {compact ? (
          <LogoMark size={26} />
        ) : (
          <div className="flex flex-col items-center gap-2 text-text-muted">
            <LogoMark size={40} />
            <span className="text-xs">Photo coming soon</span>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        src={photo}
        alt={`Portrait of ${name}`}
        fill
        sizes={sizes}
        className="object-cover object-top"
        style={objectPosition ? { objectPosition } : undefined}
      />
    </div>
  );
}
