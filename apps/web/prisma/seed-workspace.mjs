// Phase 5 workspace demo data: teams, projects, tasks and one account per role,
// so every dashboard renders against real records instead of mocked props.
//
// DEV ONLY. Refuses to run against a non-SQLite database, and never touches the
// FOUNDER account (the founder is bootstrapped by seed.mjs alone).
import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";

const db = new PrismaClient();

if (!process.env.DATABASE_URL?.startsWith("file:")) {
  console.error("seed:workspace — refusing to run: this is dev-only demo data.");
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
  { email: "partner@external.org", name: "Lena Fischer", role: "COLLABORATOR", title: null },
];

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

console.log(
  `seed:workspace — ${PEOPLE.length} accounts, ${TEAMS.length} teams, ${THREADS.length} threads seeded. Demo password: ${password}`,
);
await db.$disconnect();
