"use server";

import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit, requestContext } from "@/lib/audit";
import { requireFounder } from "@/lib/guard";
import { checkAvatar } from "@/lib/images";
import { serializeLinks } from "@/lib/org";
import { safeHref } from "@/lib/catalog";
import { sanitizeLine, sanitizeUserText } from "@/lib/sanitize";

/*
 * Company profile (Phase 6.5) — FOUNDER ONLY (`company.manage` is founder-reserved).
 *
 * These strings are what the company says it is: its name, its description, its
 * contact address. A change here rewrites the marketing site, the footer and the
 * page metadata at once, which is exactly why it is not a delegable chore — the
 * contact email on a security page is a security control, not copy.
 *
 * Everything is sanitized on write and rendered as plain text; links go through
 * `safeHref` (https or an internal path only), because all of it lands on pages we
 * serve to the public.
 */

const BRAND_DIR = path.join(process.cwd(), "storage", "brand");

export type CompanyState = { error?: string; notice?: string };

function revalidateSite() {
  revalidatePath("/", "layout"); // the footer and metadata live in the root layout
  revalidatePath("/company");
  revalidatePath("/app/company");
  revalidatePath("/app/organization");
}

export async function saveCompany(
  _prev: CompanyState,
  formData: FormData,
): Promise<CompanyState> {
  const founder = await requireFounder();

  const name = sanitizeLine(formData.get("name"), 80);
  if (!name) return { error: "The company needs a name." };

  const data = {
    name,
    legalName: sanitizeLine(formData.get("legalName"), 120) || null,
    tagline: sanitizeLine(formData.get("tagline"), 140) || null,
    description: sanitizeUserText(formData.get("description"), 800) || null,
    email: sanitizeLine(formData.get("email"), 120) || null,
    phone: sanitizeLine(formData.get("phone"), 40) || null,
    address: sanitizeUserText(formData.get("address"), 240) || null,
    founded: sanitizeLine(formData.get("founded"), 20) || null,
    website: formData.get("website")
      ? safeHref(formData.get("website"), "https://edusentinel.ai")
      : null,
    links: serializeLinks(formData.get("links")),
  };

  // Upsert: the row is a singleton keyed "company", so this is create-or-update
  // without a "does it exist yet" dance at every call site.
  await db.companyProfile.upsert({
    where: { id: "company" },
    update: data,
    create: { id: "company", ...data },
  });

  const ctx = await requestContext();
  await audit("company.updated", { actorId: founder.id, detail: name, ...ctx });
  revalidateSite();
  return { notice: "Company profile saved — the website is updated." };
}

export async function uploadLogo(
  _prev: CompanyState,
  formData: FormData,
): Promise<CompanyState> {
  const founder = await requireFounder();
  const file = formData.get("logo");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image to upload." };
  }

  // Same pipeline as avatars (lib/images.ts): magic bytes, size cap, metadata
  // stripped, PNG/JPEG only. No SVG — an SVG logo would be script running on
  // every page of the marketing site, which is the worst possible place for it.
  const check = checkAvatar(new Uint8Array(await file.arrayBuffer()));
  if (!check.ok) return { error: check.error };

  const existing = await db.companyProfile.findUnique({
    where: { id: "company" },
    select: { logoName: true },
  });

  const storageName = `logo-${randomBytes(12).toString("hex")}.${check.ext}`;
  await mkdir(BRAND_DIR, { recursive: true });
  await writeFile(path.join(BRAND_DIR, storageName), check.bytes);

  await db.companyProfile.upsert({
    where: { id: "company" },
    update: { logoName: storageName, logoMime: check.mime, logoAt: new Date() },
    create: {
      id: "company",
      logoName: storageName,
      logoMime: check.mime,
      logoAt: new Date(),
    },
  });

  if (existing?.logoName) {
    await unlink(path.join(BRAND_DIR, existing.logoName)).catch(() => null);
  }

  const ctx = await requestContext();
  await audit("company.logo_updated", { actorId: founder.id, ...ctx });
  revalidateSite();
  return { notice: "Logo updated." };
}

export async function removeLogo(): Promise<void> {
  const founder = await requireFounder();
  const existing = await db.companyProfile.findUnique({
    where: { id: "company" },
    select: { logoName: true },
  });

  await db.companyProfile.upsert({
    where: { id: "company" },
    update: { logoName: null, logoMime: null, logoAt: null },
    create: { id: "company" },
  });
  if (existing?.logoName) {
    await unlink(path.join(BRAND_DIR, existing.logoName)).catch(() => null);
  }

  const ctx = await requestContext();
  await audit("company.logo_removed", { actorId: founder.id, ...ctx });
  revalidateSite();
}
