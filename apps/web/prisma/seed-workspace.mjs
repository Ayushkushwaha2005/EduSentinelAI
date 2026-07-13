// Phase 5 workspace demo data: teams, projects, tasks and one account per role,
// so every dashboard renders against real records instead of mocked props.
//
// DEV ONLY. Refuses to run against a non-SQLite database, and never touches the
// FOUNDER account (the founder is bootstrapped by seed.mjs alone).
import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";

const db = new PrismaClient();

// Two independent fences (Phase 6.1). The SQLite check was already here; the
// NODE_ENV check is not redundant with it, because the day production runs on a
// local file — a restore drill, a staging box, a mistake — the first fence opens.
// Demo rows must never be reachable in a production build: they are people who do
// not exist, holding roles nobody granted them.
if (!process.env.DATABASE_URL?.startsWith("file:")) {
  console.error("seed:workspace — refusing to run: this is dev-only demo data (non-SQLite database).");
  process.exit(1);
}
if (process.env.NODE_ENV === "production") {
  console.error("seed:workspace — refusing to run: this is dev-only demo data (NODE_ENV=production).");
  process.exit(1);
}

const password = process.env.DEMO_PASSWORD ?? "EduSentinel-demo-2026";
const passwordHash = await hash(password, {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
});

const PEOPLE = [
  { email: "cofounder@edusentinel.ai", name: "Aarav Mehta", role: "CO_FOUNDER", title: "Co-Founder" },
  { email: "priya@edusentinel.ai", name: "Priya Nair", role: "EMPLOYEE", title: "Security Engineer" },
  { email: "rohan@edusentinel.ai", name: "Rohan Verma", role: "EMPLOYEE", title: "Platform Engineer" },
  { email: "sara@edusentinel.ai", name: "Sara Khan", role: "EMPLOYEE", title: "Product Designer" },
  { email: "dev@edusentinel.ai", name: "Dev Sharma", role: "ADMIN", title: "Engineering Lead" },
  // HR is a function, not a rung on the role ladder: an HR lead is an EMPLOYEE
  // with an HR title on the People & Culture team. Adding an HR *role* would
  // change the authorization ladder, which needs founder approval.
  { email: "neha@edusentinel.ai", name: "Neha Sharma", role: "EMPLOYEE", title: "HR Manager" },
  { email: "partner@external.org", name: "Lena Fischer", role: "COLLABORATOR", title: null },
];

// Releases need a creator; the Founder owns the seeded product.
const founder = await db.user.findFirst({
  where: { role: "FOUNDER" },
  select: { id: true },
});
const founderId = founder?.id ?? null;

const users = {};
for (const p of PEOPLE) {
  users[p.email] = await db.user.upsert({
    where: { email: p.email },
    update: { role: p.role, name: p.name },
    create: {
      email: p.email,
      name: p.name,
      role: p.role,
      passwordHash,
      emailVerified: new Date(),
    },
  });
}

const TEAMS = [
  {
    name: "Security Engineering",
    members: ["priya@edusentinel.ai", "dev@edusentinel.ai"],
    projects: [
      { name: "Release signing pipeline", progress: 100 },
      { name: "Audit chain verification", progress: 80 },
      { name: "Threat model refresh", progress: 40 },
    ],
  },
  {
    name: "Platform",
    members: ["rohan@edusentinel.ai", "dev@edusentinel.ai"],
    projects: [
      { name: "Download center", progress: 90 },
      { name: "Postgres migration", progress: 30 },
    ],
  },
  {
    name: "Design",
    members: ["sara@edusentinel.ai"],
    projects: [
      { name: "Workspace dashboards", progress: 70 },
      { name: "Brand system v2", progress: 50 },
    ],
  },
  {
    name: "People & Culture",
    members: ["neha@edusentinel.ai"],
    projects: [
      { name: "Onboarding handbook", progress: 60 },
      { name: "Quarterly access review", progress: 20 },
    ],
  },
];

for (const t of TEAMS) {
  const team = await db.team.upsert({
    where: { name: t.name },
    update: {},
    create: { name: t.name },
  });

  for (const email of t.members) {
    const person = PEOPLE.find((p) => p.email === email);
    await db.teamMember.upsert({
      where: { teamId_userId: { teamId: team.id, userId: users[email].id } },
      update: { title: person?.title ?? null },
      create: { teamId: team.id, userId: users[email].id, title: person?.title ?? null },
    });
  }

  for (const proj of t.projects) {
    const existing = await db.project.findFirst({
      where: { teamId: team.id, name: proj.name },
    });
    const project =
      existing ??
      (await db.project.create({
        data: { teamId: team.id, name: proj.name, progress: proj.progress },
      }));

    const taskTitle = `Review ${proj.name.toLowerCase()}`;
    const hasTask = await db.task.findFirst({ where: { title: taskTitle } });
    if (!hasTask) {
      await db.task.create({
        data: {
          title: taskTitle,
          projectId: project.id,
          assigneeId: users[t.members[0]].id,
          status: proj.progress === 100 ? "DONE" : "IN_PROGRESS",
          priority: proj.progress < 50 ? "HIGH" : "NORMAL",
          dueAt: new Date(Date.now() + 7 * 864e5),
        },
      });
    }
  }
}

// ---- message center demo threads (Phase 5.3) ----
// One internal TEAM thread and one COLLAB thread with the external partner, so
// both tabs of the Message Center have content.
const THREADS = [
  {
    kind: "TEAM",
    subject: "Release signing",
    between: ["priya@edusentinel.ai", "rohan@edusentinel.ai"],
    messages: [
      ["priya@edusentinel.ai", "The signing pipeline is green — quarantine to publish took 4s."],
      ["rohan@edusentinel.ai", "Nice. Are the checksums published on the download page?"],
      ["priya@edusentinel.ai", "Yes, SHA-256 plus the ed25519 signature next to every artifact."],
    ],
  },
  {
    kind: "COLLAB",
    subject: "Research partnership",
    between: ["dev@edusentinel.ai", "partner@external.org"],
    messages: [
      ["partner@external.org", "Thanks for approving the collaboration request."],
      ["dev@edusentinel.ai", "Welcome aboard. Access is scoped to your own threads for now."],
    ],
  },
];

for (const t of THREADS) {
  const existing = await db.conversation.findFirst({ where: { subject: t.subject } });
  if (existing) continue;

  const convo = await db.conversation.create({
    data: {
      kind: t.kind,
      subject: t.subject,
      createdById: users[t.between[0]].id,
      participants: { create: t.between.map((e) => ({ userId: users[e].id })) },
    },
  });

  let when = Date.now() - t.messages.length * 6e5;
  for (const [email, body] of t.messages) {
    await db.message.create({
      data: {
        conversationId: convo.id,
        authorId: users[email].id,
        body,
        createdAt: new Date(when),
      },
    });
    when += 6e5;
  }
  await db.conversation.update({
    where: { id: convo.id },
    data: { lastMessageAt: new Date(when) },
  });
}

// ---- one quarantined release, so the pipeline has something to review ----
// Dev only. Written into storage/quarantine exactly like a real upload (a real
// zip, so magic-byte validation would pass) and left QUARANTINED: the Founder
// still has to sign and publish it, which is the flow worth exercising.
const firstProduct = await db.product.findFirst({ orderBy: { sortOrder: "asc" } });
if (firstProduct && founderId && (await db.release.count()) === 0) {
  const { mkdir, writeFile } = await import("node:fs/promises");
  const { createHash, randomBytes } = await import("node:crypto");
  const path = await import("node:path");

  // Smallest valid zip: an empty archive (PK end-of-central-directory record).
  const zip = Buffer.from([
    0x50, 0x4b, 0x05, 0x06, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ]);
  const storageName = `${randomBytes(16).toString("hex")}.bin`;
  const dir = path.join(process.cwd(), "storage", "quarantine");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, storageName), zip);

  await db.release.create({
    data: {
      productId: firstProduct.id,
      version: "0.1.0",
      notes: "Seeded demo build awaiting founder review.",
      status: "QUARANTINED",
      createdById: founderId,
      artifact: {
        create: {
          fileName: "edusentinel-extension-0.1.0.zip",
          storageName,
          size: zip.length,
          mime: "application/zip",
          sha256: createHash("sha256").update(zip).digest("hex"),
          scanStatus: "CLEAN",
          scanDetail: "seeded demo artifact (dev only)",
        },
      },
    },
  });
}

console.log(
  `seed:workspace — ${PEOPLE.length} accounts, ${TEAMS.length} teams, ${THREADS.length} threads, 1 quarantined release seeded. Demo password: ${password}`,
);
await db.$disconnect();
