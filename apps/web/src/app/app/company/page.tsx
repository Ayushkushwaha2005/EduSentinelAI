import Link from "next/link";
import { requireCapability } from "@/lib/guard";
import { getCompany } from "@/lib/company";
import { Breadcrumb, Panel } from "@/components/dashboard/widgets";
import { CompanyForm, LogoForm } from "./forms";

/*
 * Company profile (Phase 6.5). Gated on `company.manage` — FOUNDER-RESERVED.
 *
 * One row in the database backs the marketing site's name, description, footer and
 * metadata. There is no second copy in a component, which is the only reason a
 * change here can be trusted to land everywhere.
 */
export const metadata = { title: "Company" };

export default async function CompanyConsole() {
  await requireCapability("company.manage");
  const company = await getCompany();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Breadcrumb trail={[{ label: "Dashboards", href: "/app" }, { label: "Company" }]} />

      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Company profile</h1>
        <p className="mt-1 text-[15px] text-text-secondary">
          What EduSentinel says it is. The public{" "}
          <Link href="/company" className="text-brand-cyan hover:text-brand-teal">
            company page
          </Link>
          , the site footer and the page metadata all read this record — change it
          here and it changes everywhere, with no deploy.
        </p>
      </div>

      <Panel>
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
          Logo
        </h2>
        <div className="mt-5">
          <LogoForm company={company} />
        </div>
      </Panel>

      <Panel>
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
          Details
        </h2>
        <div className="mt-5">
          <CompanyForm company={company} />
        </div>
      </Panel>

      <Panel>
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
          Organization
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-text-secondary">
          Leadership, departments, teams and the people on the public company page
          are managed on the{" "}
          <Link
            href="/app/organization"
            className="text-brand-cyan hover:text-brand-teal"
          >
            Organization
          </Link>{" "}
          page.
        </p>
      </Panel>
    </div>
  );
}
