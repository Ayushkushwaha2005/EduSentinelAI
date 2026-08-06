"use client";

import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import React, { useState } from "react";

/*
 * The radial domain launcher.
 *
 * This is the supplied circle-menu component, integrated AS GIVEN. Every
 * constant, spring, stagger, scale ramp and shake below is the original — the
 * geometry (`pointOnCircle`), the close sequence and the blur cross-fade are
 * untouched.
 *
 * Three integration edits, none of them visual:
 *
 *   1. TOKENS. The original targets shadcn's palette (`bg-foreground`,
 *      `bg-muted`, `var(--background)`), which does not exist here. Each one is
 *      mapped to its EduSentinel equivalent so the launcher inherits the real
 *      design tokens — and, because `--color-ink` and `--color-surface-raised`
 *      invert under `[data-theme="dark"]`, it follows the theme for free with no
 *      `dark:` variant written anywhere.
 *
 *   2. ICONS. lucide-react is not a dependency of this app and adding one for
 *      two glyphs would be a new package on the critical path, so the default
 *      open/close icons are the same two shapes drawn inline.
 *
 *   3. A11Y ATTRIBUTES. The anchor is the one interactive element in the
 *      accessibility tree (the button it wraps is hidden from it), items are
 *      unreachable while collapsed, and the label also appears on keyboard
 *      focus. Attributes only — nothing that renders differently for a mouse.
 *
 * The launcher is a shortcut, never the only route: the same domains are listed
 * as plain links beside it, which is what carries the page without JavaScript.
 */

const cn = (...classes: Array<string | false | undefined | null>) =>
  classes.filter(Boolean).join(" ");

const CONSTANTS = {
  itemSize: 48,
  containerSize: 250,
  openStagger: 0.02,
  closeStagger: 0.07,
};

const STYLES: Record<string, Record<string, string>> = {
  trigger: {
    container:
      "rounded-full flex items-center bg-ink justify-center cursor-pointer outline-none ring-0 hover:brightness-125 transition-all duration-100 z-50",
    active: "bg-ink",
  },
  item: {
    container:
      "rounded-full flex items-center justify-center absolute bg-surface-overlay hover:bg-surface-overlay/60 cursor-pointer",
    label:
      "text-xs text-text-primary absolute top-full left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap",
  },
};

const MenuIcon = ({ className }: { className?: string }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const CloseIcon = ({ className }: { className?: string }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const pointOnCircle = (i: number, n: number, r: number, cx = 0, cy = 0) => {
  const theta = (2 * Math.PI * i) / n - Math.PI / 2;
  const x = cx + r * Math.cos(theta);
  const y = cy + r * Math.sin(theta) + 0;
  return { x, y };
};

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  index: number;
  totalItems: number;
  isOpen: boolean;
}

const MenuItem = ({ icon, label, href, index, totalItems, isOpen }: MenuItemProps) => {
  const { x, y } = pointOnCircle(index, totalItems, CONSTANTS.containerSize / 2);
  const [hovering, setHovering] = useState(false);

  return (
    <a
      href={href}
      className={STYLES.item.container}
      aria-label={label}
      aria-hidden={!isOpen}
      tabIndex={isOpen ? 0 : -1}
      onFocus={() => setHovering(true)}
      onBlur={() => setHovering(false)}
    >
      <motion.button
        animate={{
          x: isOpen ? x : 0,
          y: isOpen ? y : 0,
        }}
        whileHover={{
          scale: 1.1,
          transition: {
            duration: 0.1,
            delay: 0,
          },
        }}
        transition={{
          delay: isOpen ? index * CONSTANTS.openStagger : index * CONSTANTS.closeStagger,
          type: "spring",
          stiffness: 300,
          damping: 30,
        }}
        style={{
          height: CONSTANTS.itemSize - 2,
          width: CONSTANTS.itemSize - 2,
        }}
        className={STYLES.item.container}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        tabIndex={-1}
        aria-hidden="true"
      >
        {icon}
        {hovering && <p className={STYLES.item.label}>{label}</p>}
      </motion.button>
    </a>
  );
};

interface MenuTriggerProps {
  setIsOpen: (isOpen: boolean) => void;
  isOpen: boolean;
  itemsLength: number;
  closeAnimationCallback: () => void;
  openIcon?: React.ReactNode;
  closeIcon?: React.ReactNode;
  label: string;
}

const MenuTrigger = ({
  setIsOpen,
  isOpen,
  itemsLength,
  closeAnimationCallback,
  openIcon,
  closeIcon,
  label,
}: MenuTriggerProps) => {
  const animate = useAnimationControls();
  const shakeAnimation = useAnimationControls();

  const scaleTransition = Array.from({ length: itemsLength - 1 })
    .map((_, index) => index + 1)
    .reduce((acc, _, index) => {
      const increasedValue = index * 0.15;
      acc.push(1 + increasedValue);
      return acc;
    }, [] as number[]);

  const closeAnimation = async () => {
    shakeAnimation.start({
      translateX: [0, 2, -2, 0, 2, -2, 0],
      transition: {
        duration: CONSTANTS.closeStagger,
        ease: "linear",
        repeat: Infinity,
        repeatType: "loop",
      },
    });
    for (let i = 0; i < scaleTransition.length; i++) {
      await animate.start({
        height: Math.min(
          CONSTANTS.itemSize * scaleTransition[i],
          CONSTANTS.itemSize + CONSTANTS.itemSize / 2,
        ),
        width: Math.min(
          CONSTANTS.itemSize * scaleTransition[i],
          CONSTANTS.itemSize + CONSTANTS.itemSize / 2,
        ),
        backgroundColor: `color-mix(in srgb, var(--color-ink) ${Math.max(
          100 - i * 10,
          40,
        )}%, var(--color-surface-raised))`,
        transition: {
          duration: CONSTANTS.closeStagger / 2,
          ease: "linear",
        },
      });
      if (i !== scaleTransition.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, CONSTANTS.closeStagger * 1000));
      }
    }

    shakeAnimation.stop();
    shakeAnimation.start({
      translateX: 0,
      transition: {
        duration: 0,
      },
    });

    animate.start({
      height: CONSTANTS.itemSize,
      width: CONSTANTS.itemSize,
      backgroundColor: "var(--color-ink)",
      transition: {
        duration: 0.1,
        ease: "backInOut",
      },
    });
  };

  return (
    <motion.div animate={shakeAnimation} className="z-50">
      <motion.button
        type="button"
        aria-expanded={isOpen}
        aria-label={label}
        animate={animate}
        style={{
          height: CONSTANTS.itemSize,
          width: CONSTANTS.itemSize,
        }}
        className={cn(STYLES.trigger.container, isOpen && STYLES.trigger.active)}
        onClick={() => {
          if (isOpen) {
            setIsOpen(false);
            closeAnimationCallback();
            closeAnimation();
          } else {
            setIsOpen(true);
          }
        }}
      >
        <AnimatePresence mode="popLayout">
          {isOpen ? (
            <motion.span
              key="menu-close"
              initial={{
                opacity: 0,
                filter: "blur(10px)",
              }}
              animate={{
                opacity: 1,
                filter: "blur(0px)",
              }}
              exit={{
                opacity: 0,
                filter: "blur(10px)",
              }}
              transition={{
                duration: 0.2,
              }}
            >
              {closeIcon}
            </motion.span>
          ) : (
            <motion.span
              key="menu-open"
              initial={{
                opacity: 0,
                filter: "blur(10px)",
              }}
              animate={{
                opacity: 1,
                filter: "blur(0px)",
              }}
              exit={{
                opacity: 0,
                filter: "blur(10px)",
              }}
              transition={{
                duration: 0.2,
              }}
            >
              {openIcon}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </motion.div>
  );
};

const CircleMenu = ({
  items,
  label = "Open the menu",
  openIcon = <MenuIcon className="text-surface-raised" />,
  closeIcon = <CloseIcon className="text-surface-raised" />,
}: {
  items: Array<{ label: string; icon: React.ReactNode; href: string }>;
  label?: string;
  openIcon?: React.ReactNode;
  closeIcon?: React.ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const animate = useAnimationControls();

  const closeAnimationCallback = async () => {
    await animate.start({
      rotate: -360,
      filter: "blur(1px)",
      transition: {
        duration: CONSTANTS.closeStagger * (items.length + 2),
        ease: "linear",
      },
    });
    await animate.start({
      rotate: 0,
      filter: "blur(0px)",
      transition: {
        duration: 0,
      },
    });
  };

  return (
    <div
      style={{
        width: CONSTANTS.containerSize,
        height: CONSTANTS.containerSize,
      }}
      className="relative flex items-center justify-center place-self-center"
    >
      <MenuTrigger
        setIsOpen={setIsOpen}
        isOpen={isOpen}
        itemsLength={items.length}
        closeAnimationCallback={closeAnimationCallback}
        openIcon={openIcon}
        closeIcon={closeIcon}
        label={label}
      />
      <motion.div
        animate={animate}
        className={cn("absolute inset-0 z-0 flex items-center justify-center")}
      >
        {items.map((item, index) => {
          return (
            <MenuItem
              key={`menu-item-${index}`}
              icon={item.icon}
              label={item.label}
              href={item.href}
              index={index}
              totalItems={items.length}
              isOpen={isOpen}
            />
          );
        })}
      </motion.div>
    </div>
  );
};

export { CircleMenu };
