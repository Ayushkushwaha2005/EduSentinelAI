// Demo Founder bootstrap — LOCAL DEVELOPMENT ONLY.
//
// Creates the account that unlocks the /demo sandbox. Reads DEMO_FOUNDER_EMAIL,
// DEMO_FOUNDER_NAME and DEMO_FOUNDER_PASSWORD from apps/web/.env.
//
// ─────────────────────────────────────────────────────────────────────────────
// ⚠ THIS MUST NEVER RUN AGAINST PRODUCTION.
//
//   Two guards, both hard failures rather than warnings:
//
//     1. NODE_ENV=production is refused outright.
//     2. The email may not be on an EduSentinel domain. The demo account is a
//        throwaway test identity; giving it a company address would make it look
//        like staff in the directory and put a fake account on a real domain.
//
//   It is also created with role USER — the LOWEST role in the ladder — so even
//   if this somehow ran somewhere it should not, the account it creates holds no
//   production capability whatsoever. The role ladder is untouched by this work.
// ─────────────────────────────────────────────────────────────────────────────
import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";

if (process.env.NODE_ENV === "production") {
  console.error("db:seed:demo — refusing to run: this is a local-only test account.");
  process.exit(1);
}

const email = process.env.DEMO_FOUNDER_EMAIL?.toLowerCase();
const name = process.env.DEMO_FOUNDER_NAME ?? "Demo Founder";
const password = process.env.DEMO_FOUNDER_PASSWORD;

if (!email || !password) {
  console.log("db:seed:demo — set DEMO_FOUNDER_EMAIL and DEMO_FOUNDER_PASSWORD in apps/web/.env. Skipping.");
  process.exit(0);
}

if (/@([a-z0-9-]+\.)*edusentinel\.(ai|tech|com)$/i.test(email)) {
  console.error(
    "db:seed:demo — refusing to run: the demo account must NOT use an EduSentinel\n" +
      "                domain. Use a generic local address such as demo-founder@local.dev.",
  );
  process.exit(1);
}

if (password.length < 10) {
  console.error("db:seed:demo — DEMO_FOUNDER_PASSWORD must be at least 10 characters.");
  process.exit(1);
}

const passwordHash = await hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 });

// role: USER — the bottom of the ladder. The /demo sandbox is unlocked by
// identity (this exact address, from env), not by a privileged role, so no new
// role was added and no existing one was widened.
await db_upsert();

async function db_upsert() {
  const db = new PrismaClient();
  await db.user.upsert({
    where: { email },
    update: { name, passwordHash, role: "USER" },
    create: { email, name, passwordHash, role: "USER" },
  });
  console.log(`db:seed:demo — demo account ready: ${email} (role USER, sandbox access only)`);
  await db.$disconnect();
}
