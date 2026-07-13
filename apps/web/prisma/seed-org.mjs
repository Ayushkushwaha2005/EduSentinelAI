// Phase 6.5 migration seed: the organization and the company become DATA.
//
// The team that was hard-coded in src/lib/team.ts and the company strings that
// were scattered through the layout and footer are imported into the database
// ONCE, so the public site renders exactly as it did before — but the Founder can
// now change any of it from /app/organization and /app/company with no deploy.
//
// Idempotent: matches on name, so re-running does not duplicate anyone. It never
// overwrites an existing row, because by then the Founder's edits are the truth
// and this file is just history.
//
// Usage: npm run db:seed:org
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// A verbatim copy of what src/lib/team.ts held. Deliberately duplicated here
// rather than imported: seeds run outside the Next build, and this is a one-time
// migration record — it must not change when the app's source does.
const TEAM = [
  {
    name: "Ayush Kushwaha",
    designation: "Founder",
    bio: "Protection without surveillance isn't a slogan — it's an engineering constraint we apply to every release.",
    photo: "ayush-kushwaha.jpg",
    links: [
      { label: "Portfolio", href: "https://www.ayushkushwaha.me/" },
      { label: "LinkedIn", href: "https://www.linkedin.com/in/ayush-kushwaha-b881132b8/" },
      { label: "GitHub", href: "https://github.com/Ayushkushwaha2005" },
    ],
  },
  {
    name: "Ayush Maurya",
    designation: "Co-Founder",
    bio: "If we can't explain what a model does with your data in one paragraph, we don't ship it.",
    photo: null,
    links: [{ label: "LinkedIn", href: "https://www.linkedin.com/in/contactayush111/" }],
  },
  {
    name: "Shalu Kumari",
    designation: "Co-Founder",
    bio: "Privacy-first should feel premium — good design is how trust becomes visible.",
    photo: "shalu-kumari.png",
    links: [],
  },
  {
    name: "Jujhar Singh",
    designation: "Marketing Lead",
    bio: "One design language, one identity, one platform — every product we add should feel inevitable.",
    photo: "jujhar-singh.jpeg",
    links: [{ label: "LinkedIn", href: "https://www.linkedin.com/in/jujhar-singh-23137a341/" }],
  },
  {
    name: "Vedansh Devnani",
    designation: "Engineering Lead",
    bio: "Reliable systems are quiet systems — the backend should earn trust by never demanding attention.",
    photo: null,
    links: [{ label: "LinkedIn", href: "https://www.linkedin.com/in/vedansh-devnani-7269b6322/" }],
  },
  {
    name: "Aishika",
    designation: "Collaborative Partner",
    bio: "We grow by being worth recommending — clarity and honesty are the whole marketing strategy.",
    photo: null,
    links: [{ label: "LinkedIn", href: "https://www.linkedin.com/in/aishika-0a185725b/" }],
  },
];

const DEPARTMENTS = [
  { name: "Leadership", slug: "leadership", sortOrder: 0 },
  { name: "Engineering", slug: "engineering", sortOrder: 1 },
  { name: "Design", slug: "design", sortOrder: 2 },
  { name: "People & Culture", slug: "people-culture", sortOrder: 3 },
  { name: "Growth", slug: "growth", sortOrder: 4 },
];

const DEPT_FOR = {
  Founder: "Leadership",
  "Co-Founder": "Leadership",
  "Engineering Lead": "Engineering",
  "Marketing Lead": "Growth",
  "Collaborative Partner": null,
};

// ---- company ----
await db.companyProfile.upsert({
  where: { id: "company" },
  update: {}, // never overwrite: by now the Founder's edits are the truth
  create: {
    id: "company",
    name: "EduSentinel AI",
    tagline: "Privacy-First Technology Ecosystem",
    description:
      "EduSentinel AI builds privacy-first products across cybersecurity, artificial intelligence, cloud computing, developer tools, and education.",
    website: "https://edusentinel.ai",
    links: "[]",
  },
});

// ---- departments ----
for (const d of DEPARTMENTS) {
  await db.department.upsert({
    where: { slug: d.slug },
    update: {},
    create: d,
  });
}
const departments = await db.department.findMany();
const deptId = (name) => departments.find((d) => d.name === name)?.id ?? null;

// ---- people ----
//
// Where a team member already has an ACCOUNT (matched on name), the org row is
// LINKED to it and carries no copy of their name, email or photo — those resolve
// from their profile (lib/org.ts). That is the whole point of the milestone: one
// person, one record, no field stored twice.
let created = 0;
let linked = 0;

for (const [i, m] of TEAM.entries()) {
  const existing = await db.orgMember.findFirst({ where: { name: m.name } });
  if (existing) continue;

  const account = await db.user.findFirst({
    where: { name: m.name },
    select: { id: true },
  });

  await db.orgMember.create({
    data: {
      userId: account?.id ?? null,
      name: m.name,
      designation: m.designation,
      bio: m.bio,
      departmentId: deptId(DEPT_FOR[m.designation] ?? ""),
      links: JSON.stringify(m.links),
      // The portraits that shipped in public/team/ stay where they are: they are
      // build assets, not uploads, and copying them into storage/ would create a
      // second copy of a file we already serve. They are recorded as a path and
      // used only until someone uploads a real photo, which then wins.
      photoPath: m.photo ? `/team/${m.photo}` : null,
      sortOrder: i,
      visibility: "PUBLIC",
    },
  });
  created++;
  if (account) linked++;
}

console.log(
  `db:seed:org — company profile ready · ${DEPARTMENTS.length} departments · ` +
    `${created} org members imported (${linked} linked to existing accounts).`,
);
await db.$disconnect();
