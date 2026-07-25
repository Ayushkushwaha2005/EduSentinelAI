"use client";

import { memo, forwardRef, useEffect, useRef, type ReactNode } from "react";
import {
  motion,
  useAnimation,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";

/*
 * Animated sign-in primitives (Phase 10, Task 1).
 *
 * Ported from the approved reference implementation (animation.txt) rather than
 * reinvented: BoxReveal, Ripple, OrbitingCircles, TechOrbitDisplay, the
 * spotlight Input and BottomGradient are the reference's components, with four
 * changes forced by this codebase and stated here so nobody has to diff them:
 *
 *  1. `motion/react` -> `framer-motion`. Same API; it is the package this repo
 *     already ships, and adding a second motion library for one screen would be
 *     a bundle regression on the page that most needs to be fast.
 *
 *  2. `cn` from `@/lib/utils` did not exist here, and neither did clsx or
 *     tailwind-merge. A four-line local `cn` replaces them — a dependency is a
 *     supply-chain surface, and this one would have earned its keep once.
 *
 *  3. HARD-CODED COLOURS -> TOKENS. The reference paints in #3b82f6, zinc-800
 *     and neutral-400. This platform's rule is that every colour comes from
 *     packages/ui/src/tokens.css (CLAUDE.md), which is also what makes the screen
 *     work in dark mode without a second implementation.
 *
 *  4. REDUCED MOTION. The reference animates unconditionally. Here every effect
 *     below degrades to its finished state — the reveal shows its content, the
 *     orbits stand still, the spotlight does not track. Standing project rule.
 *
 * The reference's `AnimatedForm`/`AuthTabs` are deliberately NOT ported: they
 * carry their own client-side validation, their own submit handler and a Google
 * button. This app's sign-in runs through a server action with a real MFA step,
 * and there is no Google provider. See auth-form.tsx — the presentation below is
 * wrapped around the existing auth flow, which was not touched.
 */

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/* ==================== Input ==================== */

/*
 * The reference's spotlight input: a radial highlight that follows the pointer
 * across the field's border. The gradient is painted on a 2px padded wrapper, so
 * what you see is the light catching the EDGE of the control.
 */
export const SpotlightInput = memo(
  forwardRef(function SpotlightInput(
    { className, type, ...props }: React.InputHTMLAttributes<HTMLInputElement>,
    ref: React.ForwardedRef<HTMLInputElement>,
  ) {
    const radius = 120;
    const reduce = useReducedMotion();
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const visible = useMotionValue(0);

    function handleMouseMove({
      currentTarget,
      clientX,
      clientY,
    }: React.MouseEvent<HTMLDivElement>) {
      const { left, top } = currentTarget.getBoundingClientRect();
      mouseX.set(clientX - left);
      mouseY.set(clientY - top);
    }

    // The brand accent replaces the reference's #3b82f6. `--color-brand-glow`
    // is already the "light source" colour in both themes, so this tracks the
    // theme for free.
    const background = useMotionTemplate`radial-gradient(${visible}px circle at ${mouseX}px ${mouseY}px, var(--color-brand-glow), transparent 80%)`;

    return (
      <motion.div
        style={reduce ? undefined : { background }}
        onMouseMove={reduce ? undefined : handleMouseMove}
        onMouseEnter={() => !reduce && visible.set(radius)}
        onMouseLeave={() => visible.set(0)}
        className="group/input rounded-control p-[2px] transition duration-300"
      >
        <input
          type={type}
          ref={ref}
          className={cn(
            "flex h-11 w-full rounded-control border border-border-subtle bg-surface-raised px-3.5 text-[15px] text-text-primary",
            "transition duration-300 placeholder:text-text-muted",
            "focus:border-brand-cyan focus:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          {...props}
        />
      </motion.div>
    );
  }),
);

SpotlightInput.displayName = "SpotlightInput";

/* ==================== BoxReveal ==================== */

type BoxRevealProps = {
  children: ReactNode;
  width?: string;
  boxColor?: string;
  duration?: number;
  overflow?: string;
  position?: string;
  className?: string;
};

/**
 * The reference's signature reveal: content rises into place while a coloured
 * panel slides off it. Under reduced motion the content is simply present and
 * the panel never exists.
 */
export const BoxReveal = memo(function BoxReveal({
  children,
  width = "fit-content",
  boxColor,
  duration,
  overflow = "hidden",
  position = "relative",
  className,
}: BoxRevealProps) {
  const mainControls = useAnimation();
  const slideControls = useAnimation();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) {
      mainControls.set("visible");
      slideControls.set("visible");
      return;
    }
    if (isInView) {
      slideControls.start("visible");
      mainControls.start("visible");
    }
  }, [isInView, mainControls, slideControls, reduce]);

  return (
    <section
      ref={ref}
      style={{
        position: position as "relative" | "absolute" | "fixed" | "sticky" | "static",
        width,
        overflow,
      }}
      className={className}
    >
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 40 },
          visible: { opacity: 1, y: 0 },
        }}
        initial={reduce ? "visible" : "hidden"}
        animate={mainControls}
        transition={{ duration: duration ?? 0.5, delay: reduce ? 0 : 0.2 }}
      >
        {children}
      </motion.div>

      {!reduce && (
        <motion.div
          variants={{ hidden: { left: 0 }, visible: { left: "100%" } }}
          initial="hidden"
          animate={slideControls}
          transition={{ duration: duration ?? 0.5, ease: "easeIn" }}
          style={{
            position: "absolute",
            top: 4,
            bottom: 4,
            left: 0,
            right: 0,
            zIndex: 20,
            // Tokenised: the reference's #5046e6 is not a colour this brand owns.
            background: boxColor ?? "var(--color-brand-teal)",
            borderRadius: 4,
          }}
        />
      )}
    </section>
  );
});

/* ==================== Ripple ==================== */

type RippleProps = {
  mainCircleSize?: number;
  mainCircleOpacity?: number;
  numCircles?: number;
  className?: string;
};

/** Concentric rings behind the orbit display — the reference's depth device. */
export const Ripple = memo(function Ripple({
  mainCircleSize = 210,
  mainCircleOpacity = 0.24,
  numCircles = 8,
  className = "",
}: RippleProps) {
  return (
    <section
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 flex items-center justify-center",
        "[mask-image:linear-gradient(to_bottom,black,transparent)]",
        className,
      )}
    >
      {Array.from({ length: numCircles }, (_, i) => {
        const size = mainCircleSize + i * 70;
        const opacity = mainCircleOpacity - i * 0.025;
        const borderStyle = i === numCircles - 1 ? "dashed" : "solid";

        return (
          <span
            key={i}
            className="animate-ripple absolute rounded-full border border-border-subtle"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              opacity: Math.max(opacity, 0),
              animationDelay: `${i * 0.18}s`,
              borderStyle,
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          />
        );
      })}
    </section>
  );
});

/* ==================== OrbitingCircles ==================== */

type OrbitingCirclesProps = {
  className?: string;
  children: ReactNode;
  reverse?: boolean;
  duration?: number;
  delay?: number;
  radius?: number;
  path?: boolean;
};

export const OrbitingCircles = memo(function OrbitingCircles({
  className,
  children,
  reverse = false,
  duration = 20,
  delay = 10,
  radius = 50,
  path = true,
}: OrbitingCirclesProps) {
  return (
    <>
      {path && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="pointer-events-none absolute inset-0 size-full"
          aria-hidden="true"
        >
          <circle
            className="stroke-border-subtle"
            strokeWidth="1"
            cx="50%"
            cy="50%"
            r={radius}
            fill="none"
          />
        </svg>
      )}
      <section
        aria-hidden="true"
        style={
          {
            "--duration": duration,
            "--radius": radius,
            /*
             * The starting angle, as a real value.
             *
             * The reference sets `--delay` and applies it through a Tailwind
             * arbitrary class, `[animation-delay:calc(var(--delay)*1000ms)]`.
             * That silently did nothing here — measured in the browser, every
             * orbiting element computed `animation-delay: 0s`, so all nine
             * glyphs sat at 0° and rendered as a vertical column stacked on top
             * of the wordmark instead of a constellation. Paired icons were
             * exactly superimposed.
             *
             * animationDelay is now set directly, which does not depend on the
             * arbitrary-property class being generated. `--angle` is the same
             * offset expressed statically, for the reduced-motion case where
             * there is no animation to be delayed.
             */
            "--angle": `${((((delay % duration) + duration) % duration) / duration) * 360}deg`,
            animationDelay: `${-delay}s`,
          } as React.CSSProperties
        }
        className={cn(
          "animate-orbit absolute flex size-full transform-gpu items-center justify-center rounded-full",
          reverse && "[animation-direction:reverse]",
          className,
        )}
      >
        {children}
      </section>
    </>
  );
});

/* ==================== TechOrbitDisplay ==================== */

export type OrbitIcon = {
  className?: string;
  duration?: number;
  delay?: number;
  radius?: number;
  path?: boolean;
  reverse?: boolean;
  component: () => ReactNode;
};

/**
 * The reference's orbit panel. Its `text` prop defaulted to "Animated Login";
 * this screen passes the EduSentinel wordmark and the official mark instead
 * (Task 1) — see auth-form.tsx.
 */
export const TechOrbitDisplay = memo(function TechOrbitDisplay({
  iconsArray,
  children,
}: {
  iconsArray: OrbitIcon[];
  children?: ReactNode;
}) {
  return (
    <section className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden">
      {children}

      {iconsArray.map((icon, index) => (
        <OrbitingCircles
          key={index}
          className={icon.className}
          duration={icon.duration}
          delay={icon.delay}
          radius={icon.radius}
          path={icon.path}
          reverse={icon.reverse}
        >
          {icon.component()}
        </OrbitingCircles>
      ))}
    </section>
  );
});

/* ==================== BottomGradient ==================== */

/** The reference's hover underline on primary controls, in brand colours. */
export function BottomGradient() {
  return (
    <>
      <span className="absolute -bottom-px inset-x-0 block h-px w-full bg-gradient-to-r from-transparent via-brand-cyan to-transparent opacity-0 transition duration-500 group-hover/btn:opacity-100" />
      <span className="absolute -bottom-px inset-x-10 mx-auto block h-px w-1/2 bg-gradient-to-r from-transparent via-brand-teal to-transparent opacity-0 blur-sm transition duration-500 group-hover/btn:opacity-100" />
    </>
  );
}

/* ==================== Label ==================== */

export const Label = memo(function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "text-sm font-medium leading-none text-text-secondary",
        className,
      )}
      {...props}
    />
  );
});
