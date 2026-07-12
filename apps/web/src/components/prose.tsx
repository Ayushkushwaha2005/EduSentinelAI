import { MDXRemote } from "next-mdx-remote/rsc";

/*
 * Renders repo-authored MDX (blog/docs) in the site's type system.
 * Trusted content only — reviewed via pull request. Public submissions are
 * never rendered through here; they go through lib/sanitize.ts as plain text.
 */
export function Prose({ source }: { source: string }) {
  return (
    <div className="[&_a]:text-brand-teal [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:border-l-2 [&_blockquote]:border-border-subtle [&_blockquote]:pl-4 [&_blockquote]:text-text-secondary [&_code]:rounded [&_code]:bg-surface-overlay [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] [&_h2]:mt-12 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:mt-8 [&_h3]:text-lg [&_h3]:font-semibold [&_li]:leading-relaxed [&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_ol]:text-text-secondary [&_p]:mt-5 [&_p]:leading-relaxed [&_p]:text-text-secondary [&_pre]:mt-5 [&_pre]:overflow-x-auto [&_pre]:rounded-card [&_pre]:border [&_pre]:border-border-subtle [&_pre]:bg-surface-overlay/60 [&_pre]:p-5 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_strong]:font-semibold [&_strong]:text-text-primary [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_ul]:text-text-secondary">
      <MDXRemote source={source} />
    </div>
  );
}
