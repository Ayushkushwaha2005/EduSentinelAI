import Image from "next/image";

/*
 * Official EduSentinel AI logo (assets/brand/logo-master.png, square-cropped
 * to public/logo-tile.png). Per brand policy this is the only mark used
 * anywhere on the site — no placeholder logos.
 */
export function LogoMark({ size = 58 }: { size?: number }) {
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
    <span className="flex items-center gap-0">
      {/* Mark sized to match the cap-height presence of the wordmark */}
      <LogoMark />
      <span className="text-[28px] font-extrabold tracking-[-0.02em] text-text-primary">
        EduSentinel <span className="text-brand-teal">AI</span>
      </span>
    </span>
  );
}
