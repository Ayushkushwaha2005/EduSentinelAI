import Image from "next/image";

/*
 * Official EduSentinel AI logo. Primary asset is the SVG
 * (public/logo.svg, from LOGO/edusentinel-logo.svg); the PNG tile remains
 * only as favicon fallback (src/app/icon.png) for browsers that cannot
 * load the SVG favicon. Per brand policy this is the only mark used
 * anywhere on the site.
 */
export function LogoMark({ size = 58 }: { size?: number }) {
  return (
    <Image
      src="/logo.svg"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      unoptimized
      priority
    />
  );
}

export function LogoWordmark() {
  return (
    <span className="flex items-center gap-1">
      {/* nudge down 2px so the mark and text share one visual centerline */}
      <span className="translate-y-[2px]">
        <LogoMark />
      </span>
      <span className="text-[28px] font-extrabold tracking-[-0.02em] text-text-primary">
        EduSentinel <span className="text-brand-teal">AI</span>
      </span>
    </span>
  );
}
