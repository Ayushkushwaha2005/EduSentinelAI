"use client";

import { useActionState, useState } from "react";
import {
  archiveCatalogProductAction,
  createCatalogProductAction,
  deleteCatalogProductAction,
  publishCatalogProductAction,
  unpublishCatalogProductAction,
  updateCatalogProductAction,
  type CatalogState,
} from "./catalog-actions";
import { PRODUCT_ICON_KEYS, ProductIcon } from "@/lib/product-icons";
import { PRICING_TONES } from "@/lib/catalog";

const EMPTY: CatalogState = {};

const field =
  "h-10 w-full rounded-control border border-border-subtle bg-surface-raised px-3 text-sm outline-none transition-colors duration-[--duration-fast] focus:border-brand-cyan";
const area =
  "w-full resize-y rounded-control border border-border-subtle bg-surface-raised p-3 text-sm leading-relaxed outline-none transition-colors duration-[--duration-fast] focus:border-brand-cyan";
const label = "mb-1.5 block text-sm text-text-secondary";

export type EditableProduct = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  pricing: string;
  tags: string[];
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  sortOrder: number;
  featured: boolean;
  status: string;
};

function Note({ state }: { state: CatalogState }) {
  if (!state.error && !state.ok) return null;
  return (
    <p
      role="status"
      className={`mt-3 text-sm ${state.error ? "text-danger" : "text-success"}`}
    >
      {state.error ?? state.ok}
    </p>
  );
}

/**
 * The product editor. Used for both "new" and "edit" — the only difference is
 * whether a productId travels with the form, so the two paths cannot drift.
 */
export function ProductForm({
  product,
  onDone,
}: {
  product?: EditableProduct;
  onDone?: () => void;
}) {
  const isEdit = !!product;
  const [state, action, pending] = useActionState(
    isEdit ? updateCatalogProductAction : createCatalogProductAction,
    EMPTY,
  );
  const [icon, setIcon] = useState(product?.icon ?? "shield");

  return (
    <form action={action} className="flex flex-col gap-4">
      {isEdit && <input type="hidden" name="productId" value={product.id} />}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={label} htmlFor={`name-${product?.id ?? "new"}`}>
            Product name
          </label>
          <input
            id={`name-${product?.id ?? "new"}`}
            name="name"
            required
            defaultValue={product?.name}
            placeholder="EduSentinel AI Extension"
            className={field}
          />
        </div>
        <div>
          <label className={label} htmlFor={`slug-${product?.id ?? "new"}`}>
            Slug <span className="text-text-muted">(URL: /products/…)</span>
          </label>
          <input
            id={`slug-${product?.id ?? "new"}`}
            name="slug"
            required
            defaultValue={product?.slug}
            placeholder="edusentinel-extension"
            className={field}
          />
        </div>
      </div>

      <div>
        <label className={label} htmlFor={`tagline-${product?.id ?? "new"}`}>
          Tagline <span className="text-text-muted">(one line, shown on cards)</span>
        </label>
        <input
          id={`tagline-${product?.id ?? "new"}`}
          name="tagline"
          defaultValue={product?.tagline}
          placeholder="Scam detection for students, right in the browser."
          className={field}
        />
      </div>

      <div>
        <label className={label} htmlFor={`desc-${product?.id ?? "new"}`}>
          Description
        </label>
        <textarea
          id={`desc-${product?.id ?? "new"}`}
          name="description"
          required
          rows={4}
          defaultValue={product?.description}
          className={area}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={label} htmlFor={`tags-${product?.id ?? "new"}`}>
            Tags <span className="text-text-muted">(comma separated)</span>
          </label>
          <input
            id={`tags-${product?.id ?? "new"}`}
            name="tags"
            defaultValue={product?.tags.join(", ")}
            placeholder="Cybersecurity, Chrome Extension"
            className={field}
          />
        </div>
        <div>
          <label className={label} htmlFor={`feat-${product?.id ?? "new"}`}>
            Features <span className="text-text-muted">(comma separated)</span>
          </label>
          <input
            id={`feat-${product?.id ?? "new"}`}
            name="features"
            defaultValue={product?.features.join(", ")}
            placeholder="Scam detection, Phishing protection"
            className={field}
          />
        </div>
      </div>

      {/* Icons are picked from a fixed set — the catalogue never accepts raw
          SVG, because these records render on the public marketing site. */}
      <div>
        <span className={label}>Icon</span>
        <input type="hidden" name="icon" value={icon} />
        <div className="flex flex-wrap gap-2">
          {PRODUCT_ICON_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setIcon(key)}
              aria-pressed={icon === key}
              aria-label={key}
              className={`flex h-11 w-11 items-center justify-center rounded-control border transition-colors duration-[--duration-fast] ${
                icon === key
                  ? "border-brand-cyan bg-brand-cyan/10 text-brand-cyan"
                  : "border-border-subtle text-text-secondary hover:bg-surface-overlay"
              }`}
            >
              <ProductIcon icon={key} size={22} />
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div>
          <label className={label} htmlFor={`pricing-${product?.id ?? "new"}`}>
            Badge
          </label>
          <select
            id={`pricing-${product?.id ?? "new"}`}
            name="pricing"
            defaultValue={product?.pricing ?? "free"}
            className={field}
          >
            {PRICING_TONES.map((t) => (
              <option key={t} value={t}>
                {t === "soon" ? "Coming soon" : t === "paid" ? "Paid" : "Free"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label} htmlFor={`ctal-${product?.id ?? "new"}`}>
            CTA label
          </label>
          <input
            id={`ctal-${product?.id ?? "new"}`}
            name="ctaLabel"
            defaultValue={product?.ctaLabel ?? "Get notified"}
            className={field}
          />
        </div>
        <div>
          <label className={label} htmlFor={`ctah-${product?.id ?? "new"}`}>
            CTA link
          </label>
          <input
            id={`ctah-${product?.id ?? "new"}`}
            name="ctaHref"
            defaultValue={product?.ctaHref ?? "/contact"}
            placeholder="/contact or https://…"
            className={field}
          />
        </div>
        <div>
          <label className={label} htmlFor={`order-${product?.id ?? "new"}`}>
            Sort order
          </label>
          <input
            id={`order-${product?.id ?? "new"}`}
            name="sortOrder"
            type="number"
            defaultValue={product?.sortOrder ?? 0}
            className={field}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-text-secondary">
        <input
          type="checkbox"
          name="featured"
          defaultChecked={product?.featured}
          className="h-4 w-4 accent-[var(--color-brand-cyan)]"
        />
        Feature this product on the home page
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="h-10 rounded-control bg-ink px-5 text-sm font-medium text-surface-raised transition-colors duration-[--duration-fast] hover:bg-ink-hover disabled:opacity-60"
        >
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create draft"}
        </button>
        {onDone && (
          <button
            type="button"
            onClick={onDone}
            className="h-10 rounded-control border border-border-subtle px-5 text-sm font-medium transition-colors duration-[--duration-fast] hover:bg-surface-overlay"
          >
            Close
          </button>
        )}
      </div>

      <Note state={state} />
    </form>
  );
}

/** Lifecycle buttons. Each is a separate action with its own capability. */
export function LifecycleControls({
  product,
  canPublish,
  canDelete,
  releaseCount,
}: {
  product: EditableProduct;
  canPublish: boolean;
  canDelete: boolean;
  releaseCount: number;
}) {
  const [pubState, publish, pubPending] = useActionState(publishCatalogProductAction, EMPTY);
  const [unpubState, unpublish, unpubPending] = useActionState(
    unpublishCatalogProductAction,
    EMPTY,
  );
  const [arcState, archive, arcPending] = useActionState(archiveCatalogProductAction, EMPTY);
  const [delState, remove, delPending] = useActionState(deleteCatalogProductAction, EMPTY);
  const [confirming, setConfirming] = useState(false);

  const state = pubState.error || pubState.ok
    ? pubState
    : unpubState.error || unpubState.ok
      ? unpubState
      : arcState.error || arcState.ok
        ? arcState
        : delState;

  const btn =
    "h-9 rounded-control border border-border-subtle px-3.5 text-sm font-medium transition-colors duration-[--duration-fast] hover:bg-surface-overlay disabled:opacity-60";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {canPublish && product.status !== "PUBLISHED" && (
          <form action={publish}>
            <input type="hidden" name="productId" value={product.id} />
            <button
              type="submit"
              disabled={pubPending}
              className="h-9 rounded-control bg-brand-cyan px-3.5 text-sm font-medium text-surface-raised transition-colors duration-[--duration-fast] hover:bg-brand-teal disabled:opacity-60"
            >
              {pubPending ? "Publishing…" : "Publish"}
            </button>
          </form>
        )}

        {canPublish && product.status === "PUBLISHED" && (
          <form action={unpublish}>
            <input type="hidden" name="productId" value={product.id} />
            <button type="submit" disabled={unpubPending} className={btn}>
              {unpubPending ? "Pulling…" : "Unpublish"}
            </button>
          </form>
        )}

        {canPublish && product.status !== "ARCHIVED" && (
          <form action={archive}>
            <input type="hidden" name="productId" value={product.id} />
            <button type="submit" disabled={arcPending} className={btn}>
              {arcPending ? "Archiving…" : "Archive"}
            </button>
          </form>
        )}

        {canDelete && (
          <button
            type="button"
            onClick={() => setConfirming((v) => !v)}
            className="h-9 rounded-control border border-border-subtle px-3.5 text-sm font-medium text-danger transition-colors duration-[--duration-fast] hover:bg-danger/5"
          >
            Delete
          </button>
        )}
      </div>

      {confirming && canDelete && (
        <form
          action={remove}
          className="flex flex-wrap items-end gap-2 rounded-control border border-danger/30 bg-danger/5 p-3"
        >
          <input type="hidden" name="productId" value={product.id} />
          <div>
            <label className="mb-1 block text-xs text-text-secondary" htmlFor={`c-${product.id}`}>
              {releaseCount > 0
                ? "This product has releases — deletion is blocked. Archive it instead."
                : `Type "${product.slug}" to permanently delete this product.`}
            </label>
            <input
              id={`c-${product.id}`}
              name="confirm"
              placeholder={product.slug}
              disabled={releaseCount > 0}
              className={`${field} w-56`}
            />
          </div>
          <button
            type="submit"
            disabled={delPending || releaseCount > 0}
            className="h-10 rounded-control bg-danger px-4 text-sm font-medium text-surface-raised transition-colors duration-[--duration-fast] disabled:opacity-50"
          >
            {delPending ? "Deleting…" : "Delete permanently"}
          </button>
        </form>
      )}

      <Note state={state} />
    </div>
  );
}
