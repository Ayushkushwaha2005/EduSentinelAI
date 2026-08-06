"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/*
 * The avatar cropper.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS IS A CLIENT-SIDE STEP AND NOT A SERVER ONE
 *
 * Avatars are rendered square (and masked to a circle) everywhere in the
 * product. Uploading a 4:3 phone photo therefore produced a centre-crop nobody
 * chose — heads cut off, faces off to one side. Choosing the crop is a decision
 * about how you look, so it belongs to the person, in front of them, before the
 * bytes leave the device.
 *
 * IT ADDS NO TRUST. This does not replace, relax or re-implement any part of
 * `lib/images.ts`: the canvas emits an ordinary PNG/JPEG which is submitted
 * through exactly the same `avatar` field to exactly the same server action,
 * and `checkAvatar` still sniffs the magic bytes, enforces the 2 MB and 4096px
 * caps and rewrites the file without its metadata containers. A hand-written
 * POST that skips this component reaches the identical validation, because this
 * component was never the control.
 *
 * It does help twice over, though: re-encoding through a canvas cannot carry
 * EXIF forward, and a 512×512 output is far below every cap, so the "too large"
 * rejection stops happening to people holding a normal camera photo.
 *
 * No new dependency. A cropper is a viewport, a transform and two gestures.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** The stored avatar's edge, in pixels. Displayed at 80px at most — 512 leaves
 *  room for high-DPI screens without storing a camera-sized file. */
const OUTPUT = 512;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.1;
/** Viewport edge in CSS pixels; the geometry below is all relative to it. */
const VIEW = 288;

type Point = { x: number; y: number };

export type CropResult = { file: File };

export function AvatarCropper({
  file,
  onCancel,
  onCropped,
  busy,
}: {
  file: File;
  onCancel: () => void;
  onCropped: (result: CropResult) => void;
  busy: boolean;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  /* Offset of the image's top-left corner within the viewport, in CSS pixels.
     Always <= 0 on both axes, because the image must cover the square. */
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });

  /* Refs, not state: a drag updates on every pointermove and re-rendering to
     remember where the finger started would be a render per frame for a value
     nothing draws. */
  const dragging = useRef(false);
  const dragFrom = useRef<Point>({ x: 0, y: 0 });
  const offsetFrom = useRef<Point>({ x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);

  /*
   * Decode the chosen file, and centre it in the same breath.
   *
   * The initial framing is computed HERE, in the decoder's callback, rather than
   * in an effect that watches the measured size. An effect that calls setState
   * from its own body is a cascading render, which this codebase does not do in
   * animation or canvas code — and the natural size is not knowable until this
   * callback anyway, so there is nothing to synchronise afterwards.
   *
   * The object URL is revoked on cleanup so selecting several photos in a row
   * does not leak one blob per attempt.
   */
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const base = VIEW / Math.min(image.naturalWidth, image.naturalHeight);
      setImg(image);
      setZoom(1);
      setOffset({
        x: (VIEW - image.naturalWidth * base) / 2,
        y: (VIEW - image.naturalHeight * base) / 2,
      });
      setError(null);
    };
    image.onerror = () => setError("That image could not be read.");
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  /* The scale at which the image exactly covers the square viewport. Everything
     else is this times the zoom, so the image can never be panned off the crop. */
  const baseScale = img ? VIEW / Math.min(img.naturalWidth, img.naturalHeight) : 1;
  const drawW = img ? img.naturalWidth * baseScale * zoom : 0;
  const drawH = img ? img.naturalHeight * baseScale * zoom : 0;

  const clamp = useCallback(
    (p: Point, w: number, h: number): Point => ({
      // VIEW - w is negative (the image is wider than the frame), so this reads
      // "no further left than the right edge, no further right than the left".
      x: Math.min(0, Math.max(VIEW - w, p.x)),
      y: Math.min(0, Math.max(VIEW - h, p.y)),
    }),
    [],
  );

  /* Zooming keeps the CENTRE of the frame fixed. Scaling about the origin
     instead would slide the subject out of frame on every slider tick. */
  const applyZoom = useCallback(
    (next: number) => {
      if (!img) return;
      const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(next.toFixed(3))));
      const w = img.naturalWidth * baseScale * z;
      const h = img.naturalHeight * baseScale * z;
      setOffset((prev) => {
        const cx = (VIEW / 2 - prev.x) / drawW;
        const cy = (VIEW / 2 - prev.y) / drawH;
        return clamp({ x: VIEW / 2 - cx * w, y: VIEW / 2 - cy * h }, w, h);
      });
      setZoom(z);
    },
    [img, baseScale, drawW, drawH, clamp],
  );

  /* Every write to `offset` — the initial centring, each drag frame and each
     zoom step — is clamped where it is made, so there is no reconciling pass to
     run afterwards and the image can never be left off the crop. */

  /* ------------------------------------------------------------- gestures -- */

  function onPointerDown(e: React.PointerEvent) {
    if (!img) return;
    dragging.current = true;
    dragFrom.current = { x: e.clientX, y: e.clientY };
    offsetFrom.current = offset;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current || !img) return;
    setOffset(
      clamp(
        {
          x: offsetFrom.current.x + (e.clientX - dragFrom.current.x),
          y: offsetFrom.current.y + (e.clientY - dragFrom.current.y),
        },
        drawW,
        drawH,
      ),
    );
  }

  function endDrag(e: React.PointerEvent) {
    dragging.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  /* Keyboard is not an afterthought here: without it the crop is unreachable
     for anyone not using a pointer, and this is the one control on the page
     that decides what your colleagues see. */
  function onKeyDown(e: React.KeyboardEvent) {
    if (!img) return;
    const step = e.shiftKey ? 20 : 5;
    const nudge: Record<string, Point> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    };
    if (nudge[e.key]) {
      e.preventDefault();
      setOffset((p) => clamp({ x: p.x + nudge[e.key].x, y: p.y + nudge[e.key].y }, drawW, drawH));
      return;
    }
    if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      applyZoom(zoom + ZOOM_STEP);
    }
    if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      applyZoom(zoom - ZOOM_STEP);
    }
  }

  /* Wheel-to-zoom is bound imperatively because React's onWheel is passive and
     cannot preventDefault, which would scroll the page behind the cropper. */
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      applyZoom(zoom + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [applyZoom, zoom]);

  /* --------------------------------------------------------------- output -- */

  async function apply() {
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setError("Your browser could not prepare the image.");
      return;
    }

    /* Map the visible square back into the ORIGINAL image's pixels: whatever is
       inside the frame, at full source resolution, and nothing else. */
    const scale = baseScale * zoom;
    const sx = -offset.x / scale;
    const sy = -offset.y / scale;
    const size = VIEW / scale;

    ctx.imageSmoothingQuality = "high";
    /* A JPEG source has no alpha; painting an opaque backdrop first means a PNG
       with transparency does not come out with black corners. */
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, OUTPUT, OUTPUT);
    ctx.drawImage(img, sx, sy, size, size, 0, 0, OUTPUT, OUTPUT);

    /* Keep the format the person chose, so a PNG logo stays crisp and a photo
       stays a photo. Both are on the server's allowlist; anything else was
       already refused before we got here. */
    const png = file.type === "image/png";
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, png ? "image/png" : "image/jpeg", png ? undefined : 0.92),
    );
    if (!blob) {
      setError("Your browser could not prepare the image.");
      return;
    }

    const cropped = new File([blob], png ? "avatar.png" : "avatar.jpg", { type: blob.type });
    onCropped({ file: cropped });
  }

  const control =
    "h-11 rounded-control px-5 text-sm font-medium transition-colors duration-[--duration-fast] disabled:opacity-60";

  return (
    <div className="flex flex-col gap-5 rounded-card border border-border-subtle bg-surface-overlay/30 p-5">
      <div>
        <h3 className="text-[15px] font-semibold tracking-[-0.01em]">Position your photo</h3>
        <p className="mt-1 text-sm leading-relaxed text-text-secondary">
          Drag to move, and zoom until it sits the way you want. The square is
          what gets saved — avatars are shown square everywhere in the workspace.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-start gap-6">
        <div
          ref={viewportRef}
          role="application"
          aria-label="Crop area: drag or use the arrow keys to reposition, plus and minus to zoom"
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onKeyDown}
          className="relative shrink-0 touch-none select-none overflow-hidden rounded-card border border-border-subtle bg-ws-canvas focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan"
          style={{ width: VIEW, height: VIEW, cursor: img ? "grab" : "progress" }}
        >
          {img && (
            /* The decoded bitmap, positioned by the transform above. next/image
               is for optimising served assets; this is a local object URL that
               exists for the length of one interaction.
               eslint-disable-next-line @next/next/no-img-element */
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={img.src}
              alt=""
              draggable={false}
              className="pointer-events-none absolute max-w-none"
              style={{ left: offset.x, top: offset.y, width: drawW, height: drawH }}
            />
          )}

          {/* The circular mask is a preview of how the avatar is actually
              displayed. It is decoration over the square crop, not a second
              shape — nothing round is stored. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-card"
            style={{
              boxShadow: "0 0 0 9999px color-mix(in srgb, var(--color-ink) 42%, transparent)",
              clipPath: "circle(50% at 50% 50%)",
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full border border-white/70"
          />
        </div>

        <div className="min-w-[220px] flex-1">
          <label className="block text-sm font-medium text-text-secondary" htmlFor="avatar-zoom">
            Zoom
          </label>
          <input
            id="avatar-zoom"
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            disabled={!img}
            onChange={(e) => applyZoom(Number(e.target.value))}
            className="mt-3 w-full accent-brand-cyan"
          />
          <p className="mt-2 text-xs text-text-muted">
            {zoom.toFixed(1)}× · scroll over the photo, or use + and − when the
            crop area has focus.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={apply}
              disabled={!img || busy}
              className={`${control} bg-ink text-surface-raised hover:bg-ink-hover`}
            >
              {busy ? "Saving…" : "Save photo"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className={`${control} border border-border-subtle hover:bg-surface-overlay`}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
