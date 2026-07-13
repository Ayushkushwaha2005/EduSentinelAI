"use client";

import { useState } from "react";
import Link from "next/link";
import { ProductIcon } from "@/lib/product-icons";
import {
  LifecycleControls,
  ProductForm,
  type EditableProduct,
} from "./product-form";

const statusTone: Record<string, string> = {
  DRAFT: "bg-surface-overlay text-text-secondary",
  PUBLISHED: "bg-success/10 text-success",
  ARCHIVED: "bg-warning/10 text-warning",
};

export type ReleaseSummary = {
  id: string;
  version: string;
  status: string;
  scanStatus: string | null;
  sha256: string | null;
};

/**
 * One product in the management list: identity, lifecycle state, its releases,
 * and — behind a toggle — the editor. Controls are rendered only for the
 * capabilities the viewer actually holds; the server re-checks each one.
 */
export function ProductRow({
  product,
  releases,
  canManage,
  canPublish,
  canDelete,
  uploadForm,
}: {
  product: EditableProduct;
  releases: ReleaseSummary[];
  canManage: boolean;
  canPublish: boolean;
  canDelete: boolean;
  uploadForm?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="rounded-card border border-border-subtle p-5">
      <div className="flex flex-wrap items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-card bg-brand-cyan/10 text-brand-cyan">
          <ProductIcon icon={product.icon} size={24} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[17px] font-semibold tracking-[-0.01em]">{product.name}</h3>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusTone[product.status] ?? ""}`}
            >
              {product.status}
            </span>
            {product.featured && (
              <span className="rounded-full bg-brand-cyan/10 px-2.5 py-0.5 text-xs font-semibold text-brand-teal">
                Featured
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            {product.tagline || product.description.slice(0, 100)}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-muted">
            <code>/products/{product.slug}</code>
            {product.status === "PUBLISHED" && (
              <Link
                href={`/products/${product.slug}`}
                className="text-brand-cyan hover:text-brand-teal"
              >
                View live →
              </Link>
            )}
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            aria-expanded={editing}
            className="h-9 rounded-control border border-border-subtle px-3.5 text-sm font-medium transition-colors duration-[--duration-fast] hover:bg-surface-overlay"
          >
            {editing ? "Close" : "Edit"}
          </button>
        )}
      </div>

      {(canPublish || canDelete) && (
        <div className="mt-4">
          <LifecycleControls
            product={product}
            canPublish={canPublish}
            canDelete={canDelete}
            releaseCount={releases.length}
          />
        </div>
      )}

      {releases.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-border-subtle pt-4">
          {releases.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 text-sm">
              <span className="font-medium">v{r.version}</span>
              <span className="text-text-secondary">{r.status}</span>
              {r.scanStatus && (
                <span className="text-text-muted">scan: {r.scanStatus}</span>
              )}
              {r.sha256 && (
                <code className="text-xs text-text-muted">
                  sha256 {r.sha256.slice(0, 16)}…
                </code>
              )}
            </li>
          ))}
        </ul>
      )}

      {uploadForm && <div className="mt-4">{uploadForm}</div>}

      {editing && canManage && (
        <div className="mt-5 border-t border-border-subtle pt-5">
          <ProductForm product={product} onDone={() => setEditing(false)} />
        </div>
      )}
    </div>
  );
}

/** "New product" panel — collapsed until the Founder wants it. */
export function NewProductPanel() {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-card bg-surface-raised p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Add a product</h2>
          <p className="mt-1 text-sm text-text-secondary">
            New products start as drafts. Publishing puts them on the public site —
            no code change, no deploy.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="h-10 rounded-control bg-ink px-5 text-sm font-medium text-surface-raised transition-colors duration-[--duration-fast] hover:bg-ink-hover"
        >
          {open ? "Close" : "New product"}
        </button>
      </div>

      {open && (
        <div className="mt-6 border-t border-border-subtle pt-6">
          <ProductForm onDone={() => setOpen(false)} />
        </div>
      )}
    </section>
  );
}
