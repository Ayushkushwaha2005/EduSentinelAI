import Image from "next/image";

/*
 * Official EduSentinel AI logo (assets/brand/logo-master.png, square-cropped
 * to public/logo-tile.png). Per brand policy this is the only mark used
 * anywhere on the site — no placeholder logos.
 */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <Image
      src="/logo-tile.png"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className="rounded-[22%]"
      priority
    />
  );
}

export function LogoWordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="text-[19px] font-semibold tracking-tight text-text-primary">
        EduSentinel <span className="text-brand-teal">AI</span>
      </span>
    </span>
  );
}
