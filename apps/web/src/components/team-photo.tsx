import Image from "next/image";
import { LogoMark } from "./logo";

/*
 * Team portrait. Source photos are tall portraits with faces in the upper
 * region, so crops anchor to the top — never center-crop a face away.
 * When no photo has been supplied, render a neutral brand tile (per brand
 * policy: no initials, no stock avatars).
 */
export function TeamPhoto({
  name,
  photo,
  className = "",
  sizes,
}: {
  name: string;
  photo: string | null;
  className?: string;
  sizes: string;
}) {
  if (!photo) {
    return (
      <div
        className={`flex items-center justify-center bg-surface-overlay ${className}`}
      >
        <div className="flex flex-col items-center gap-2 text-text-muted">
          <LogoMark size={28} />
          <span className="text-xs">Photo coming soon</span>
        </div>
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
      />
    </div>
  );
}
