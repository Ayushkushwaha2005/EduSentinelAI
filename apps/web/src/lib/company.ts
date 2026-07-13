import { db } from "./db";
import { parseLinks, type OrgLink } from "./org";

/*
 * The company, as a record (Phase 6.5).
 *
 * One row, id "company". The marketing site, the footer and the page metadata all
 * read this — so the Founder changes the company's name, tagline, contact details
 * or logo in one place and it is correct everywhere, with no deploy. There is
 * nowhere else these strings are kept, which is the whole point: a second copy in
 * a component is a copy that will be stale.
 *
 * The defaults below are what the site shipped with, so an empty database renders
 * exactly the site we already had rather than a page full of blanks.
 */

export type Company = {
  name: string;
  legalName: string | null;
  tagline: string | null;
  description: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  founded: string | null;
  links: OrgLink[];
  logoUrl: string | null;
};

export const COMPANY_DEFAULTS: Company = {
  name: "EduSentinel AI",
  legalName: null,
  tagline: "Privacy-First Technology Ecosystem",
  description:
    "EduSentinel AI builds privacy-first products across cybersecurity, artificial intelligence, cloud computing, developer tools, and education.",
  email: null,
  phone: null,
  address: null,
  website: "https://edusentinel.ai",
  founded: null,
  links: [],
  logoUrl: null,
};

export async function getCompany(): Promise<Company> {
  const row = await db.companyProfile.findUnique({ where: { id: "company" } });
  if (!row) return COMPANY_DEFAULTS;

  return {
    name: row.name || COMPANY_DEFAULTS.name,
    legalName: row.legalName,
    tagline: row.tagline ?? COMPANY_DEFAULTS.tagline,
    description: row.description ?? COMPANY_DEFAULTS.description,
    email: row.email,
    phone: row.phone,
    address: row.address,
    website: row.website ?? COMPANY_DEFAULTS.website,
    founded: row.founded,
    links: parseLinks(row.links),
    logoUrl: row.logoName
      ? `/api/photo/logo/company?v=${row.logoAt?.getTime() ?? 0}`
      : null,
  };
}
