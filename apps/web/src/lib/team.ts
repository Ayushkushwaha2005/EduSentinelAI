/*
 * Single source of truth for team members. Every surface that shows a
 * person (company page, home team rail, future about/blog bylines) must
 * render from this module so information stays consistent site-wide.
 *
 * Photos live in public/team/, matched by filename from the CORE_TEAM
 * asset folder. photo: null = no photo supplied yet (renders a neutral
 * "photo coming soon" tile — never initials, never a stock avatar).
 */
export type TeamMember = {
  name: string;
  position: "Founder" | "Co-Founder" | "Core Team" | "Collaborative Partner";
  roles: string[];
  photo: string | null;
  statement: string;
  motto?: string;
  links?: { label: string; href: string }[];
};

export const TEAM: TeamMember[] = [
  {
    name: "Ayush Kushwaha",
    position: "Founder",
    roles: ["Frontend", "Backend", "AI/ML", "App Development"],
    photo: "/team/ayush-kushwaha.jpg",
    statement:
      "Protection without surveillance isn't a slogan — it's an engineering constraint we apply to every release.",
    motto: "Build Until Success Finds You.",
    links: [
      { label: "Portfolio", href: "https://www.ayushkushwaha.me/" },
      { label: "LinkedIn", href: "https://www.linkedin.com/in/ayush-kushwaha-b881132b8/" },
      { label: "GitHub", href: "https://github.com/Ayushkushwaha2005" },
    ],
  },
  {
    name: "Ayush Maurya",
    position: "Co-Founder",
    roles: ["AI/ML Developer", "Data Analytics"],
    photo: null,
    statement:
      "If we can't explain what a model does with your data in one paragraph, we don't ship it.",
    links: [{ label: "LinkedIn", href: "https://www.linkedin.com/in/contactayush111/" }],
  },
  {
    name: "Shalu Kumari",
    position: "Co-Founder",
    roles: ["Frontend Developer", "UI/UX Designer"],
    photo: "/team/shalu-kumari.png",
    statement:
      "Privacy-first should feel premium — good design is how trust becomes visible.",
  },
  {
    name: "Jujhar Singh",
    position: "Core Team",
    roles: ["Frontend Developer", "Marketing Lead"],
    photo: "/team/jujhar-singh.jpeg",
    statement:
      "One design language, one identity, one platform — every product we add should feel inevitable.",
    links: [{ label: "LinkedIn", href: "https://www.linkedin.com/in/jujhar-singh-23137a341/" }],
  },
  {
    name: "Vedansh Devnani",
    position: "Core Team",
    roles: ["Backend", "AI/ML", "Database Handling", "App Development"],
    photo: null,
    statement:
      "Reliable systems are quiet systems — the backend should earn trust by never demanding attention.",
    links: [{ label: "LinkedIn", href: "https://www.linkedin.com/in/vedansh-devnani-7269b6322/" }],
  },
  {
    name: "Aishika",
    position: "Collaborative Partner",
    roles: ["Content", "UI/UX", "Testing"],
    photo: null,
    statement:
      "We grow by being worth recommending — clarity and honesty are the whole marketing strategy.",
    links: [{ label: "LinkedIn", href: "https://www.linkedin.com/in/aishika-0a185725b/" }],
  },
];
