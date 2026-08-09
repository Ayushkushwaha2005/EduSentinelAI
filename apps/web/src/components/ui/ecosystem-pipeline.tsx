"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/*
 * The Sentinel engine console.
 *
 * This is the supplied pipeline component, integrated AS GIVEN: every path,
 * radius, duration, delay, stagger and interval below is the original. The only
 * edits are the strings — generic workflow copy replaced with the EduSentinel
 * ecosystem's own vocabulary — and the component's name.
 *
 * It is a SCHEMATIC, not telemetry: the counters are part of the illustration,
 * and the caption next to it on the page says so. Nothing here reads a
 * database, an API or a session.
 *
 * Mounting is gated by components/ecosystem-pipeline-panel.tsx — reduced motion
 * and narrow viewports never load this chunk at all.
 */

/*
 * The narration describes the STEPS of the flow, in order. It carries no
 * counts, confidences or timings: this schematic has never measured anything,
 * and a number here would be an invented measurement dressed as a log line.
 */
const messages = [
  'A signal arrives: "is this link safe?"',
  "The signal is parsed — links, sender, attachments",
  "Known threat patterns are checked first",
  "Context is assembled for the Sentinel engine",
  "On-device models weigh the signal in context",
  "Extension: a phishing page is blocked, with the reason shown",
  "App: an SMS sender is flagged on the device",
  "Insights: the finding is added to your safety digest",
  "The answer lands in the product you were already using",
  "Waiting for the next signal…",
];

function AnimatedDot({
  path,
  duration,
  delay,
  size,
  opacity,
}: {
  path: string;
  duration: number;
  delay: number;
  size: number;
  opacity: number;
}) {
  return (
    <circle r={size} fill="#0052FF" opacity={opacity}>
      <animateMotion
        dur={`${duration}s`}
        repeatCount="indefinite"
        begin={`${delay}s`}
        path={path}
      />
    </circle>
  );
}

function PulsingDot({
  cx,
  cy,
  color,
  duration,
  delay = 0,
}: {
  cx: number;
  cy: number;
  color: string;
  duration: number;
  delay?: number;
}) {
  return (
    <motion.circle
      cx={cx}
      cy={cy}
      r={2.8}
      fill={color}
      animate={{ opacity: [0.15, 1, 0.15] }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

function StatusIndicator({
  cx,
  cy,
  color,
  pulsing = false,
  duration = 1.9,
  delay = 0,
}: {
  cx: number;
  cy: number;
  color: string;
  pulsing?: boolean;
  duration?: number;
  delay?: number;
}) {
  if (pulsing) {
    return (
      <motion.circle
        cx={cx}
        cy={cy}
        r={3}
        fill={color}
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{
          duration,
          delay,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    );
  }
  return <circle cx={cx} cy={cy} r={3} fill={color} opacity={0.95} />;
}

export default function SentinelPipeline() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 2700);

    return () => clearInterval(messageInterval);
  }, []);

  const paths = {
    p1: "M116,88 L158,88",
    p2: "M268,88 L306,88",
    p3: "M411,88 C425,88 435,50 448,50",
    p4: "M411,88 L448,88",
    p5: "M411,88 C425,88 435,126 448,126",
  };

  return (
    /*
     * SIZE ONLY (Phase 12). Nothing about the schematic changed — every path,
     * radius, duration, delay and string below is still the original. What
     * changed is how much of the page it gets: 620px fixed → up to 920px, about
     * 48% wider, which makes it a hero visual instead of a diagram sitting in
     * the middle of a wide panel.
     *
     * `w-full` with a max, rather than a second fixed width: the SVG is a
     * viewBox, so it scales with the box, and a fluid width means the console
     * fits its column at 1024px instead of overflowing it. The gate in
     * ecosystem-pipeline-panel.tsx still decides WHETHER it mounts.
     */
    <div className="bg-[#090909] border border-white/[0.08] rounded-[14px] overflow-hidden font-sans w-full max-w-[920px] mx-auto">
      {/* Header */}
      <div className="px-[18px] py-[11px] border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-[7px]">
          <motion.span
            className="w-[6px] h-[6px] rounded-full bg-green-500 inline-block"
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <span className="text-[10px] text-white/30 tracking-[0.1em] font-mono">
            SENTINEL ENGINE · SCHEMATIC
          </span>
        </div>
        <span className="text-[10px] text-white/[0.18] font-mono">
          illustration, not telemetry
        </span>
      </div>

      {/* SVG Pipeline Visualization */}
      <svg width="100%" viewBox="0 0 580 172" className="block">
        <defs>
          <marker
            id="ma"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto"
          >
            <path
              d="M2 1.5L7.5 5L2 8.5"
              fill="none"
              stroke="rgba(0,82,255,0.45)"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </marker>
        </defs>

        {/* Connection Paths */}
        <path
          d={paths.p1}
          fill="none"
          stroke="rgba(0,82,255,0.22)"
          strokeWidth="1.5"
          strokeDasharray="3 5"
          markerEnd="url(#ma)"
        />
        <path
          d={paths.p2}
          fill="none"
          stroke="rgba(0,82,255,0.22)"
          strokeWidth="1.5"
          strokeDasharray="3 5"
          markerEnd="url(#ma)"
        />
        <path
          d={paths.p3}
          fill="none"
          stroke="rgba(0,82,255,0.15)"
          strokeWidth="1.5"
          strokeDasharray="3 5"
        />
        <path
          d={paths.p4}
          fill="none"
          stroke="rgba(0,82,255,0.15)"
          strokeWidth="1.5"
          strokeDasharray="3 5"
        />
        <path
          d={paths.p5}
          fill="none"
          stroke="rgba(0,82,255,0.15)"
          strokeWidth="1.5"
          strokeDasharray="3 5"
        />

        {/* Animated dots along paths */}
        <AnimatedDot path={paths.p1} duration={1.05} delay={0} size={2.5} opacity={1} />
        <AnimatedDot path={paths.p1} duration={1.05} delay={0.35} size={1.8} opacity={0.65} />
        <AnimatedDot path={paths.p1} duration={1.05} delay={0.7} size={1.3} opacity={0.35} />

        <AnimatedDot path={paths.p2} duration={0.88} delay={0.18} size={2.5} opacity={1} />
        <AnimatedDot path={paths.p2} duration={0.88} delay={0.62} size={1.8} opacity={0.65} />

        <AnimatedDot path={paths.p3} duration={1.3} delay={0.08} size={2.2} opacity={0.9} />
        <AnimatedDot path={paths.p3} duration={1.3} delay={0.65} size={1.5} opacity={0.55} />

        <AnimatedDot path={paths.p4} duration={1.15} delay={0.28} size={2.2} opacity={0.9} />
        <AnimatedDot path={paths.p4} duration={1.15} delay={0.85} size={1.5} opacity={0.55} />

        <AnimatedDot path={paths.p5} duration={1.4} delay={0.45} size={2.2} opacity={0.9} />
        <AnimatedDot path={paths.p5} duration={1.4} delay={1.0} size={1.5} opacity={0.55} />

        {/* Trigger Node */}
        <rect
          x="16"
          y="66"
          width="100"
          height="44"
          rx="8"
          fill="#141414"
          stroke="rgba(255,255,255,0.09)"
          strokeWidth="0.5"
        />
        <text
          x="66"
          y="83"
          textAnchor="middle"
          fontSize="9.5"
          fill="rgba(255,255,255,0.28)"
          fontFamily="system-ui"
          letterSpacing=".07em"
        >
          SIGNAL
        </text>
        <text
          x="66"
          y="100"
          textAnchor="middle"
          fontSize="12"
          fill="rgba(255,255,255,0.82)"
          fontFamily="system-ui"
        >
          User Activity
        </text>
        <text
          x="66"
          y="122"
          textAnchor="middle"
          fontSize="8.5"
          fill="rgba(255,255,255,0.18)"
          fontFamily="monospace"
        >
          edge-01
        </text>

        {/* Vector DB Node */}
        <rect
          x="158"
          y="66"
          width="110"
          height="44"
          rx="8"
          fill="#141414"
          stroke="rgba(255,255,255,0.09)"
          strokeWidth="0.5"
        />
        <text
          x="213"
          y="83"
          textAnchor="middle"
          fontSize="9.5"
          fill="rgba(255,255,255,0.28)"
          fontFamily="system-ui"
          letterSpacing=".07em"
        >
          THREAT INTEL
        </text>
        <text
          x="213"
          y="100"
          textAnchor="middle"
          fontSize="12"
          fill="rgba(255,255,255,0.82)"
          fontFamily="system-ui"
        >
          Pattern Match
        </text>
        <text
          x="213"
          y="122"
          textAnchor="middle"
          fontSize="8.5"
          fill="rgba(255,255,255,0.18)"
          fontFamily="monospace"
        >
          sentinel-index
        </text>

        {/* LLM Agent Node */}
        <rect
          x="306"
          y="53"
          width="105"
          height="70"
          rx="10"
          fill="#050D1C"
          stroke="#0052FF"
          strokeWidth="1"
        />
        <rect x="318" y="53.5" width="80" height="1" rx="0.5" fill="rgba(51,117,255,0.5)" />
        <text
          x="358"
          y="78"
          textAnchor="middle"
          fontSize="9.5"
          fill="rgba(51,117,255,0.65)"
          fontFamily="system-ui"
          letterSpacing=".07em"
        >
          AI ENGINE
        </text>
        <text
          x="358"
          y="97"
          textAnchor="middle"
          fontSize="13"
          fill="#fff"
          fontFamily="system-ui"
          fontWeight="500"
        >
          Analyzing
        </text>
        <PulsingDot cx={346} cy={113} color="#0052FF" duration={1.2} delay={0} />
        <PulsingDot cx={358} cy={113} color="#0052FF" duration={1.2} delay={0.4} />
        <PulsingDot cx={370} cy={113} color="#0052FF" duration={1.2} delay={0.8} />
        <text
          x="358"
          y="139"
          textAnchor="middle"
          fontSize="8.5"
          fill="rgba(0,82,255,0.4)"
          fontFamily="monospace"
        >
          sentinel-core-1
        </text>

        {/* Output Nodes */}
        <rect
          x="448"
          y="35"
          width="116"
          height="30"
          rx="7"
          fill="#111"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="0.5"
        />
        <text
          x="490"
          y="53.5"
          textAnchor="middle"
          fontSize="11"
          fill="rgba(255,255,255,0.62)"
          fontFamily="system-ui"
        >
          Extension Alert
        </text>
        <StatusIndicator cx={550} cy={43} color="#22c55e" />

        <rect
          x="448"
          y="73"
          width="116"
          height="30"
          rx="7"
          fill="#111"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="0.5"
        />
        <text
          x="490"
          y="91.5"
          textAnchor="middle"
          fontSize="11"
          fill="rgba(255,255,255,0.62)"
          fontFamily="system-ui"
        >
          App Shield
        </text>
        <StatusIndicator cx={550} cy={81} color="#f59e0b" pulsing duration={1.9} />

        <rect
          x="448"
          y="111"
          width="116"
          height="30"
          rx="7"
          fill="#111"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="0.5"
        />
        <text
          x="490"
          y="129.5"
          textAnchor="middle"
          fontSize="11"
          fill="rgba(255,255,255,0.62)"
          fontFamily="system-ui"
        >
          Insight Report
        </text>
        <StatusIndicator cx={550} cy={119} color="#f59e0b" pulsing duration={2.2} delay={0.35} />
      </svg>

      {/* Message Display */}
      <div className="border-t border-white/[0.06] px-[18px] py-[9px] h-[52px]">
        <div className="flex gap-2 items-start h-full">
          <span className="text-[#0052FF]/55 font-mono text-[13px] leading-[1.5] shrink-0">
            ›
          </span>
          <div className="relative flex-1 overflow-hidden h-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={messageIndex}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.25 }}
                className="font-mono text-[11px] text-white/[0.42] leading-[1.55] absolute inset-0"
              >
                {messages[messageIndex]}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/*
       * Footer.
       *
       * WHAT WAS HERE: SIGNALS 1,247 (incrementing every 7.2s), TOKENS 4.2M and
       * AVG LATENCY 342ms. Every one of those figures was invented, and the
       * ticking counter made them read as live measurement. This project's own
       * rule is that a thing we cannot measure is never printed as a number, so
       * they are gone rather than restyled — what is left describes the stages
       * of the flow, which is what the diagram above actually shows.
       */}
      <div className="border-t border-white/[0.06] px-[18px] py-[10px] flex gap-[22px] items-center">
        <div>
          <div className="text-[9px] text-white/20 tracking-[0.09em] mb-[3px]">IN</div>
          <div className="text-[13px] text-white/[0.72] font-mono">A signal</div>
        </div>
        <div>
          <div className="text-[9px] text-white/20 tracking-[0.09em] mb-[3px]">WEIGHED BY</div>
          <div className="text-[13px] text-white/[0.72] font-mono">One engine</div>
        </div>
        <div>
          <div className="text-[9px] text-white/20 tracking-[0.09em] mb-[3px]">OUT</div>
          <div className="text-[13px] text-white/[0.72] font-mono">An answer, in place</div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-[9px] text-white/[0.18] tracking-[0.09em] mb-[3px]">RUNS ON</div>
          <div className="text-[10px] text-[#0052FF]/55 font-mono">Sentinel · On-device</div>
        </div>
      </div>
    </div>
  );
}
