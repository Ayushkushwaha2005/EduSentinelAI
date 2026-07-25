"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import {
  DEMO_INVITATIONS,
  DEMO_NOTIFICATIONS,
  DEMO_PEOPLE,
  DEMO_PRODUCTS,
  DEMO_RELEASES,
  DEMO_SETTINGS,
  type DemoInvitation,
  type DemoNotification,
  type DemoPerson,
  type DemoProduct,
  type DemoRelease,
} from "./data";

/*
 * DEMO FOUNDER MODE — simulated state (Task 16).
 *
 * WHERE THE "WRITES" GO.
 *
 * Every action a visitor can take in Demo Mode is dispatched into this reducer
 * and lives in React state for the lifetime of the tab. Nothing is persisted:
 * no server action, no fetch, no localStorage, no cookie, and — above all — no
 * database. Refresh the page and the sandbox is exactly as it started.
 *
 * That is deliberate and is the point of the whole feature. A visitor gets to
 * press the buttons a Founder presses and watch the interface respond, while the
 * production database is not merely *protected* from those presses — it is
 * unreachable from this module. There is no code path from here to `db`.
 *
 * ⚠ DO NOT import `@/lib/db`, `@prisma/client`, or any server action into this
 *   file or anything else under src/lib/demo or src/app/demo.
 *   `npm run check:demo` fails the build if you do.
 */

type ToastKind = "simulated" | "blocked";

export type DemoToast = {
  id: number;
  kind: ToastKind;
  message: string;
};

type State = {
  people: DemoPerson[];
  products: DemoProduct[];
  releases: DemoRelease[];
  invitations: DemoInvitation[];
  notifications: DemoNotification[];
  settings: typeof DEMO_SETTINGS;
  toasts: DemoToast[];
  nextToastId: number;
};

const initial: State = {
  people: DEMO_PEOPLE,
  products: DEMO_PRODUCTS,
  releases: DEMO_RELEASES,
  invitations: DEMO_INVITATIONS,
  notifications: DEMO_NOTIFICATIONS,
  settings: DEMO_SETTINGS,
  toasts: [],
  nextToastId: 1,
};

type Action =
  | { type: "toast"; kind: ToastKind; message: string }
  | { type: "dismissToast"; id: number }
  | { type: "publishProduct"; id: string }
  | { type: "archiveProduct"; id: string }
  | { type: "signRelease"; id: string }
  | { type: "revokeRelease"; id: string }
  | { type: "sendInvitation"; email: string; roleLabel: string }
  | { type: "revokeInvitation"; id: string }
  | { type: "readNotification"; id: string }
  | { type: "readAllNotifications" }
  | { type: "toggleSetting"; key: "releaseSigning" | "requireMfaForPrivileged" }
  | { type: "reset" };

function withToast(state: State, kind: ToastKind, message: string): State {
  return {
    ...state,
    toasts: [...state.toasts, { id: state.nextToastId, kind, message }],
    nextToastId: state.nextToastId + 1,
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "toast":
      return withToast(state, action.kind, action.message);

    case "dismissToast":
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.id) };

    case "publishProduct": {
      const next = state.products.map((p) =>
        p.id === action.id ? { ...p, status: "PUBLISHED" as const, updated: "just now" } : p,
      );
      const name = state.products.find((p) => p.id === action.id)?.name ?? "Product";
      return withToast({ ...state, products: next }, "simulated", `${name} published — simulated, nothing was saved.`);
    }

    case "archiveProduct": {
      const next = state.products.map((p) =>
        p.id === action.id ? { ...p, status: "ARCHIVED" as const, updated: "just now" } : p,
      );
      const name = state.products.find((p) => p.id === action.id)?.name ?? "Product";
      return withToast({ ...state, products: next }, "simulated", `${name} archived — simulated, nothing was saved.`);
    }

    case "signRelease": {
      const next = state.releases.map((r) =>
        r.id === action.id
          ? { ...r, status: "PUBLISHED" as const, scan: "CLEAN" as const, published: "just now" }
          : r,
      );
      const v = state.releases.find((r) => r.id === action.id);
      return withToast(
        { ...state, releases: next },
        "simulated",
        `${v?.product ?? "Release"} ${v?.version ?? ""} signed & published — simulated. In production this needs the Founder's key.`,
      );
    }

    case "revokeRelease": {
      const next = state.releases.map((r) =>
        r.id === action.id ? { ...r, status: "REVOKED" as const } : r,
      );
      return withToast({ ...state, releases: next }, "simulated", "Release revoked — simulated, nothing was saved.");
    }

    case "sendInvitation": {
      const invite: DemoInvitation = {
        id: `i${Date.now()}`,
        email: action.email,
        roleLabel: action.roleLabel,
        invitedBy: "Amara Osei",
        sent: "just now",
        expires: "in 7 days",
        status: "PENDING",
      };
      return withToast(
        { ...state, invitations: [invite, ...state.invitations] },
        "simulated",
        `Invitation to ${action.email} simulated — no email was sent and no account exists.`,
      );
    }

    case "revokeInvitation":
      return withToast(
        { ...state, invitations: state.invitations.filter((i) => i.id !== action.id) },
        "simulated",
        "Invitation revoked — simulated, nothing was saved.",
      );

    case "readNotification":
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === action.id ? { ...n, unread: false } : n,
        ),
      };

    case "readAllNotifications":
      return {
        ...state,
        notifications: state.notifications.map((n) => ({ ...n, unread: false })),
      };

    case "toggleSetting": {
      const next = { ...state.settings, [action.key]: !state.settings[action.key] };
      return withToast({ ...state, settings: next }, "simulated", "Setting changed — simulated, nothing was saved.");
    }

    case "reset":
      return { ...initial, nextToastId: state.nextToastId };

    default:
      return state;
  }
}

type DemoContextValue = State & {
  dispatch: React.Dispatch<Action>;
  /** For controls that exist in production but are deliberately inert here. */
  blocked: (what: string) => void;
};

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);

  const blocked = useCallback(
    (what: string) =>
      dispatch({
        type: "toast",
        kind: "blocked",
        message: `${what} is disabled in Demo Mode — it would touch real data.`,
      }),
    [],
  );

  const value = useMemo(() => ({ ...state, dispatch, blocked }), [state, blocked]);

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoContextValue {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used inside <DemoProvider>");
  return ctx;
}
