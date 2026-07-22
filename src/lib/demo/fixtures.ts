/**
 * DEMO MODE fixtures — mirrors supabase/seed.sql so the app can render
 * without a Supabase backend (NEXT_PUBLIC_DEMO_MODE=1). Dev/preview only;
 * never enabled in production. supabase/seed.sql stays the source of truth.
 */

const daysAgo = (n: number) =>
  new Date(Date.now() - n * 86_400_000).toISOString();
const inDays = (n: number) =>
  new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

const E = (n: number) => `e0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const M = (n: number) => `a0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const S = (n: number) => `50000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const P = (n: number) => `b0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const R = (n: number) => `c0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const D = (n: number) => `d0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const U = (n: number) => `f0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

export interface DemoStore {
  [table: string]: Record<string, unknown>[];
}

export function buildFixtures(): DemoStore {
  const events = [
    { id: E(1), name: "PodHive Mumbai", city: "Mumbai", country: "India", event_date: "2025-09-18", timezone: "Asia/Kolkata", description: "The first PodHive gathering — 40 technology leaders on real Copilot rollouts, wins and scars.", cover_image_url: null, status: "completed", created_at: daysAgo(320), updated_at: daysAgo(300) },
    { id: E(2), name: "PodHive Dubai", city: "Dubai", country: "UAE", event_date: "2025-11-06", timezone: "Asia/Dubai", description: "An evening on AI in regulated industries: banking, government and energy leaders compare notes.", cover_image_url: null, status: "completed", created_at: daysAgo(290), updated_at: daysAgo(250) },
    { id: E(3), name: "PodHive Riyadh", city: "Riyadh", country: "KSA", event_date: "2026-02-12", timezone: "Asia/Riyadh", description: "Saudi CIOs on Vision-2030 AI programmes — from pilots to production.", cover_image_url: null, status: "completed", created_at: daysAgo(200), updated_at: daysAgo(160) },
    { id: E(4), name: "PodHive Nairobi", city: "Nairobi", country: "Kenya", event_date: inDays(50), timezone: "Africa/Nairobi", description: "East Africa joins the Hive: fintech and telecom leaders on practical AI adoption.", cover_image_url: null, status: "upcoming", created_at: daysAgo(60), updated_at: daysAgo(60) },
  ];

  const member = (
    n: number, full_name: string, email: string, company: string,
    designation: string, industry: string | null, country: string | null,
    bio: string, referred_by: string | null, joined_event_id: string | null,
    role = "member", status = "active", createdDaysAgo = 200
  ) => ({
    id: M(n), auth_user_id: U(n), full_name, email, company, designation,
    industry, country, avatar_url: null, bio, referred_by, joined_event_id,
    role, status, created_at: daysAgo(createdDaysAgo), updated_at: daysAgo(10),
  });

  const members = [
    member(1, "Anita Rao", "anita.rao@example.com", "Meridian Bank", "CTO", "banking-financial-services", "India", "Building the AI-first bank. Cut customer onboarding from 30 days to 3 with Copilot and document intelligence.", null, E(1), "member", "active", 310),
    member(2, "Farid Al-Mansoori", "farid.almansoori@example.com", "Gulfstone Energy", "CIO", "oil-gas", "UAE", "Digital lead for upstream operations. Interested in safety analytics and field-worker Copilot use cases.", M(1), E(2), "member", "active", 255),
    member(3, "Kavya Nair", "kavya.nair@example.com", "Lotus Health Group", "Head of Digital", "healthcare", "India", "Running clinical-documentation AI across 12 hospitals. Ask me about physician adoption.", M(1), E(1), "member", "active", 300),
    member(4, "Joseph Mwangi", "joseph.mwangi@example.com", "Savannah Capital Bank", "CTO", "banking-financial-services", "Kenya", "East Africa banking tech. Bringing the Nairobi cohort into the Hive.", M(1), E(2), "member", "active", 250),
    member(5, "Deepak Sharma", "deepak.sharma@example.com", "UrbanBasket Retail", "CIO", "retail", "India", "Omnichannel retail at scale. Currently piloting shelf-analytics vision AI in 60 stores.", M(1), E(1), "member", "active", 298),
    member(6, "Layla Haddad", "layla.haddad@example.com", "Emirates Municipal Authority", "Director of Technology", "government", "UAE", "Public-sector service transformation. Arabic-language Copilot evaluations underway.", M(2), E(2), "member", "active", 240),
    member(7, "Omar Qassim", "omar.qassim@example.com", "Pearl Bay Hotels", "CTO", "hospitality", "Qatar", "Guest-experience AI: concierge bots, revenue optimisation, multilingual service.", M(2), E(2), "member", "invited", 235),
    member(8, "Ritu Menon", "ritu.menon@example.com", "Crestwood University", "CIO", "education", "India", "AI in higher education — admissions triage and research-support copilots.", M(3), E(1), "member", "active", 280),
    member(9, "Salma Al-Zahrani", "salma.alzahrani@example.com", "Riyadh Digital Authority", "Chief Digital Officer", "government", "KSA", "National digital-services programme. Recruiting the Riyadh chapter of the Hive.", null, E(3), "member", "active", 160),
    member(10, "Tariq Hassan", "tariq.hassan@example.com", "Nile Industrial Works", "CIO", "manufacturing", "Egypt", "Smart-factory programmes: predictive maintenance and quality-inspection vision models.", M(9), E(3), "member", "active", 155),
    member(11, "Noura Al-Harbi", "noura.alharbi@example.com", "Falcon Telecom", "VP Technology", "telecom", "KSA", "Network-operations AI and contact-centre copilots for 20M subscribers.", M(10), E(3), "member", "active", 150),
    member(12, "Grace Wanjiru", "grace.wanjiru@example.com", "Baobab Fintech", "CTO", "technology", "Kenya", "Payments infrastructure for East Africa. Contact-centre AI took first response from 4 hours to 12 minutes.", M(9), E(3), "member", "active", 152),
    member(13, "Amina Yusuf", "amina.yusuf@example.com", "Coral Coast Medical", "Head of IT", "healthcare", "Kenya", "Hospital-group IT lead, evaluating clinical documentation AI for 2027.", M(12), E(4), "member", "invited", 58),
    member(14, "Vikram Bhatt", "vikram.bhatt@example.com", "Muscat Grand Resorts", "CIO", "hospitality", "Oman", "Resort-group technology: booking-flow AI and back-office Copilot rollout.", M(9), E(3), "member", "active", 148),
    member(15, "Priya Raghavan", "priya.raghavan@redington.example.com", "Redington SSG", "Community Lead", "technology", "UAE", "Runs CodeHive for the Redington Software Solutions Group.", null, null, "admin", "active", 330),
    member(100, "Harsh Kank", "harsh.kank@redingtongroup.com", "Redington SSG", "Community Admin", "technology", "India", "CodeHive administrator.", null, null, "admin", "active", 1),
    member(104, "Test CTO", "x.redington+cto@gmail.com", "Test Bank", "CTO", "banking-financial-services", "UAE", "Real-inbox test account (alias of x.redington@gmail.com).", M(1), E(2), "member", "invited", 1),
    member(105, "Test CIO", "x.redington+cio@gmail.com", "Test Retail Group", "CIO", "retail", "India", "Real-inbox test account (alias of x.redington@gmail.com).", M(9), E(3), "member", "invited", 1),
    member(106, "Test Member", "x.redington+member@gmail.com", "Test Telecom", "Head of Digital", "telecom", "Kenya", "Real-inbox test account (alias of x.redington@gmail.com).", null, E(4), "member", "invited", 1),
    member(101, "Demo CTO", "demo.cto@codehive.test", "Demo Bank", "CTO", "banking-financial-services", "UAE", "Test account for sign-in and member-flow checks.", M(1), E(2), "member", "active", 2),
    member(102, "Demo CIO", "demo.cio@codehive.test", "Demo Retail Group", "CIO", "retail", "India", "Test account for sign-in and member-flow checks.", M(9), E(3), "member", "active", 2),
    member(103, "Demo Member", "demo.member@codehive.test", "Demo Telecom", "Head of Digital", "telecom", "Kenya", "Test account for sign-in and member-flow checks.", null, E(4), "member", "invited", 1),
  ];

  const event_rsvps = [
    [E(4), M(4), "going"], [E(4), M(12), "going"], [E(4), M(13), "going"],
    [E(4), M(1), "going"], [E(4), M(5), "not_going"], [E(4), M(10), "not_going"],
  ].map(([event_id, member_id, status], i) => ({
    id: `rsvp-${i}`, event_id, member_id, status, created_at: daysAgo(20),
  }));

  const event_attendance = [
    [E(1), M(1)], [E(1), M(3)], [E(1), M(5)], [E(1), M(8)],
    [E(2), M(2)], [E(2), M(4)], [E(2), M(6)], [E(2), M(7)], [E(2), M(1)],
    [E(3), M(9)], [E(3), M(10)], [E(3), M(11)], [E(3), M(12)], [E(3), M(14)],
  ].map(([event_id, member_id], i) => ({
    id: `att-${i}`, event_id, member_id, created_at: daysAgo(100),
  }));

  const solution = (
    n: number, title: string, vendor: string, category: string, summary: string,
    description: string, outcomes: string, owner_name: string, owner_email: string
  ) => ({
    id: S(n), title, vendor, category, summary, description, outcomes,
    logo_url: null, owner_name, owner_email, status: "published",
    created_at: daysAgo(120), updated_at: daysAgo(30),
  });

  const solutions = [
    solution(1, "Microsoft 365 Copilot rollout accelerator", "Microsoft", "copilot", "Structured 90-day rollout: readiness, pilot cohorts, adoption analytics and governance for M365 Copilot.", "A packaged programme that takes an organisation from licence purchase to measured adoption.\n\n**What's included**\n\n- Tenant readiness and data-governance assessment\n- Pilot-cohort selection and champion training\n- Adoption dashboards wired to Viva Insights\n- Prompt libraries per department", "- 68% weekly active usage after 90 days (median across deployments)\n- 51 minutes saved per user per day on drafting and meeting recap\n- Governance sign-off achieved before wave-2 rollout", "Rahul Iyer", "rahul.iyer@redington.example.com"),
    solution(2, "GitHub Copilot for engineering teams", "Microsoft", "productivity-ai", "Enterprise enablement for GitHub Copilot: policy setup, secure rollout and engineering-velocity measurement.", "Rollout blueprint for regulated enterprises adopting GitHub Copilot.\n\n- IP-indemnity and policy configuration\n- Secure-coding guardrails and audit trails\n- Velocity baselining and quarterly impact reviews", "- 30–40% faster completion of routine coding tasks\n- Pull-request cycle time down 22%\n- Developer-satisfaction scores up across all pilots", "Meera Pillai", "meera.pillai@redington.example.com"),
    solution(3, "Microsoft Security Copilot deployment", "Microsoft", "security-ai", "SOC augmentation with Security Copilot: incident summarisation, guided response and analyst upskilling.", "Deploys Security Copilot into an existing SOC with Sentinel integration.\n\n- Promptbook development for tier-1 triage\n- Sentinel and Defender XDR data connections\n- Analyst enablement and measured MTTR baselines", "- Mean time to respond down 44% in the first quarter\n- Tier-1 triage effort halved\n- Incident reports generated in minutes, not hours", "Ahmed Shafiq", "ahmed.shafiq@redington.example.com"),
    solution(4, "Azure AI document intelligence for onboarding", "Microsoft", "data-analytics", "KYC and onboarding automation: extract, validate and route documents with Azure AI Document Intelligence.", "The pattern behind the \"30 days to 3 days\" story. Automates document-heavy onboarding flows.\n\n- Custom extraction models for local ID and trade documents\n- Human-in-the-loop validation queues\n- Straight-through processing metrics", "- Customer onboarding time: 30 days → 3 days at a leading bank\n- 92% straight-through processing on standard document sets\n- Compliance review effort down 60%", "Rahul Iyer", "rahul.iyer@redington.example.com"),
    solution(5, "Retail shelf-analytics vision AI", "Redington ISV partner", "industry-solution", "Camera-based shelf monitoring: out-of-stock detection, planogram compliance and promo execution tracking.", "An ISV-built vision solution tuned for Middle East and India retail formats.\n\n- Works with existing CCTV where coverage allows\n- Out-of-stock alerts to store-ops apps within minutes\n- Planogram-compliance scoring per aisle", "- On-shelf availability up 4.1 points in pilot stores\n- Promo-execution compliance up from 71% to 93%\n- Payback inside two quarters at 60-store scale", "Meera Pillai", "meera.pillai@redington.example.com"),
    solution(6, "Azure landing zone for AI workloads", "Microsoft", "infrastructure", "Production-grade Azure foundation for AI: identity, networking, cost guardrails and model-endpoint governance.", "Gets AI workloads out of proof-of-concept subscriptions and into a governed platform.\n\n- Hub-spoke landing zone with private endpoints for Azure OpenAI\n- FinOps guardrails and per-workload cost allocation\n- Model-endpoint catalogue with access reviews", "- POC-to-production time cut from months to weeks\n- Zero public model endpoints across the estate\n- Cloud AI spend visible per business unit", "Ahmed Shafiq", "ahmed.shafiq@redington.example.com"),
  ];

  const solution_interests = [
    { id: "int-1", solution_id: S(4), member_id: M(4), note: "We want the onboarding pattern for retail-banking KYC in Kenya — regulator-ready audit trail is the key question.", created_at: daysAgo(12) },
    { id: "int-2", solution_id: S(1), member_id: M(14), note: null, created_at: daysAgo(9) },
    { id: "int-3", solution_id: S(3), member_id: M(11), note: "SOC of 14 analysts, Sentinel already deployed. Interested in a scoped pilot.", created_at: daysAgo(4) },
  ];

  const post = (
    n: number, author_id: string, title: string, body: string,
    category: string, is_pinned: boolean, createdDaysAgo: number
  ) => ({
    id: P(n), author_id, title, body, category, is_pinned, is_locked: false,
    created_at: daysAgo(createdDaysAgo), updated_at: daysAgo(createdDaysAgo),
  });

  const posts = [
    post(1, M(15), "Welcome to CodeHive — start here", "Welcome to the Hive. This is the private space for PodHive alumni to share what's actually working.\n\n**House rules**\n\n- Share real numbers where you can\n- No vendor pitches — this is a peer room\n- Grow your Hive: bring in leaders you rate\n\nIntroduce yourself in a reply below.", "general", true, 90),
    post(2, M(1), "How we cut customer onboarding from 30 days to 3", "Full write-up of our onboarding transformation at Meridian.\n\nThe stack: Azure AI Document Intelligence for extraction, a human-in-the-loop queue for exceptions, and Copilot drafting the relationship-manager summaries.\n\nHappy to go deep on the compliance sign-off process — that was the hard part, not the tech.", "ai-use-cases", false, 30),
    post(3, M(3), "Physician adoption of clinical Copilot — what actually moved the needle", "We stalled at 20% weekly usage for two months. Three changes got us to 74%:\n\n- Champions per ward, not per hospital\n- Templates for the five most common note types\n- Publishing time-saved numbers weekly\n\nAsk me anything.", "copilot", false, 21),
    post(4, M(10), "Predictive maintenance: how much history do you really need?", "Vendors keep telling me two years of sensor history minimum. Our oldest lines have eight months of clean data.\n\nAnyone shipped predictive maintenance with less? What accuracy did you actually get at go-live?", "implementation-help", false, 14),
    post(5, M(12), "Contact-centre AI: 4 hours to 12 minutes first response", "Numbers from our Nairobi contact centre after six months:\n\n- First response: 4 hours → 12 minutes\n- Full resolution: 2.1 days → 6 hours\n- CSAT up 18 points\n\nThe unlock was letting the model draft in Swahili and English and routing only low-confidence drafts to agents.", "ai-use-cases", false, 10),
    post(6, M(6), "Arabic-language Copilot quality — sharing our evaluation set", "We built a 400-prompt Arabic evaluation set for citizen-service scenarios (dialect coverage: Gulf, Levantine, Egyptian).\n\nResults vary a lot by task type. Summarisation is strong; form-filling guidance still needs human review. Happy to share the rubric with anyone testing Arabic scenarios.", "copilot", false, 7),
    post(7, M(5), "Who owns AI governance in your org?", "Genuine question for the room: where does AI governance sit for you?\n\nWe've bounced between risk, IT and a new digital-ethics committee. None of them can veto a business unit that wants to ship. How are you structuring this?", "general", false, 4),
    post(8, M(4), "Sizing a Security Copilot pilot for a mid-size SOC", "We're a 9-analyst SOC on Sentinel. Redington proposed a Security Copilot pilot and I want to scope it right.\n\nFor those who've deployed: how many SCUs did you provision for the pilot, and what did you measure in the first 30 days?", "implementation-help", false, 2),
  ];

  const reply = (n: number, post_id: string, author_id: string, body: string, createdDaysAgo: number) => ({
    id: R(n), post_id, author_id, body, created_at: daysAgo(createdDaysAgo),
  });

  const replies = [
    reply(1, P(1), M(1), "Anita from Meridian Bank, Mumbai. Here for the onboarding and document-AI conversations — and to bring more India banking leaders into the Hive.", 89),
    reply(2, P(1), M(2), "Farid, Gulfstone Energy, Abu Dhabi. Focused on field-operations AI. Good to see familiar faces from PodHive Dubai.", 85),
    reply(3, P(1), M(9), "Salma, Riyadh Digital Authority. Building the KSA chapter — say hello if you're in Riyadh.", 80),
    reply(4, P(1), M(12), "Grace from Baobab Fintech, Nairobi. Counting down to PodHive Nairobi in September.", 60),
    reply(5, P(2), M(4), "This is exactly our roadmap for next year. How did you handle regulator sign-off on the extraction models?", 29),
    reply(6, P(2), M(1), "We treated the model like any other outsourced process: documented the validation queue as the control, and gave the regulator the exception-rate dashboard. Approval took six weeks.", 28),
    reply(7, P(2), M(10), "The human-in-the-loop queue design is the transferable part — we're copying it for quality inspection, different industry entirely.", 25),
    reply(8, P(3), M(13), "Bookmarking this. We're evaluating clinical documentation for 2027 — would love the template list for the five note types.", 20),
    reply(9, P(3), M(3), "Will share the templates in this thread next week. The discharge summary one alone saves 11 minutes per patient.", 19),
    reply(10, P(3), M(8), "The champions-per-ward model maps well to faculties in a university. Stealing it for our research-support rollout.", 18),
    reply(11, P(4), M(11), "We went live on network equipment with nine months of history. Started with anomaly detection only, added failure prediction at month six. Don't let perfect data block the start.", 13),
    reply(12, P(4), M(2), "Same experience offshore — eight months was enough for the high-frequency sensors. The gap was labelled failure events, not history length.", 12),
    reply(13, P(5), M(7), "The low-confidence routing threshold is the detail everyone skips. What confidence cut-off are you using?", 9),
    reply(14, P(5), M(12), "We route anything under 0.82 to an agent, and we re-tune monthly against QA scores. Started at 0.9 and relaxed it as trust built.", 9),
    reply(15, P(5), M(14), "Would this hold up for hotel-guest messaging? Volumes are lower but the languages are wilder.", 8),
    reply(16, P(6), M(9), "Yes please — send the rubric. We'll run it against our citizen-services pilot and share results back.", 6),
    reply(17, P(6), M(11), "Interested too. Our contact-centre models see heavy dialect mixing — your dialect coverage split would be useful.", 5),
    reply(18, P(7), M(1), "Ours reports to the CRO with a standing seat for tech. The veto question is real — we gave the committee a \"pause and escalate to exco\" power rather than a veto. Used once in a year.", 3),
    reply(19, P(7), M(6), "Government angle: we inherit national AI guidelines, so our committee is mostly about conformance evidence. The structure matters less than who writes the audit trail.", 3),
    reply(20, P(7), M(10), "We put it under the COO. Governance that sits outside delivery becomes a newsletter.", 2),
    reply(21, P(8), M(11), "We ran the pilot at 3 SCUs for a 14-analyst SOC and measured MTTR plus triage minutes per incident. 30-day numbers were enough to green-light production.", 1),
    reply(22, P(8), M(15), "Ahmed Shafiq owns this solution on our side — I'll connect you. He has sizing worksheets from three regional deployments.", 0.8),
  ];

  const post_likes = [
    [P(2), M(2)], [P(2), M(3)], [P(2), M(4)], [P(2), M(9)], [P(2), M(10)], [P(2), M(12)],
    [P(3), M(1)], [P(3), M(13)],
    [P(5), M(1)], [P(5), M(4)], [P(5), M(7)], [P(5), M(14)],
    [P(6), M(9)], [P(7), M(1)], [P(7), M(10)], [P(1), M(5)],
  ].map(([post_id, member_id], i) => ({
    id: `like-${i}`, post_id, member_id, created_at: daysAgo(5),
  }));

  const spotlights = [
    { id: D(1), member_id: M(1), headline: "The bank that onboards customers in three days", story_md: "When Anita Rao took over technology at Meridian Bank, opening a corporate account took a month of document ping-pong.\n\n**The problem**\n\nEvery onboarding file crossed six desks. Documents arrived by email, were checked by hand, and one missing signature restarted the clock.\n\n**The build**\n\nHer team put Azure AI Document Intelligence at the front door: every incoming document is extracted, validated and routed automatically, with a human-in-the-loop queue for the 8% that need judgement. Copilot drafts the relationship-manager summary from the verified file.\n\n**The result**\n\nOnboarding now completes in three days. The compliance team — the loudest sceptics — became the pattern's biggest advocates once the exception dashboard gave them more visibility than the old process ever did.\n\n**What she'd tell a peer**\n\n\"Start with the queue design, not the model. The model was the easy part.\"", metric_label: "Customer onboarding time", metric_before: "30 days", metric_after: "3 days", hero_image_url: null, status: "published", published_at: daysAgo(45), created_at: daysAgo(50), updated_at: daysAgo(45) },
    { id: D(2), member_id: M(12), headline: "Twelve-minute first response, in two languages", story_md: "Baobab Fintech's contact centre was drowning: 4-hour first responses and agents copy-pasting between five systems.\n\n**The build**\n\nGrace Wanjiru's team deployed a drafting model that answers in Swahili and English, wired directly into the ticketing queue. Low-confidence drafts route to agents; everything else ships with one-click review.\n\n**The result**\n\nFirst response fell from 4 hours to 12 minutes, resolution from 2.1 days to 6 hours, and CSAT climbed 18 points. Agent headcount stayed flat while volumes grew 40%.\n\n**What she'd tell a peer**\n\n\"Publish the confidence threshold and let your QA team own it. That's what turned the agents from sceptics into tuners.\"", metric_label: "First response time", metric_before: "4 hours", metric_after: "12 minutes", hero_image_url: null, status: "published", published_at: daysAgo(20), created_at: daysAgo(25), updated_at: daysAgo(20) },
    { id: D(3), member_id: M(3), headline: "Getting 3,000 physicians to actually use clinical AI", story_md: "Lotus Health Group's clinical-documentation Copilot was technically live for months — and stuck at 20% weekly usage.\n\n**The turn**\n\nKavya Nair scrapped the hospital-level champion model and named a champion per ward. Her team shipped templates for the five most common note types and published time-saved numbers every Friday.\n\n**The result**\n\nWeekly usage reached 74% across 12 hospitals. The discharge-summary template alone saves 11 minutes per patient — time that goes back to the bedside.\n\n**What she'd tell a peer**\n\n\"Adoption is a ward-by-ward campaign, not a deployment milestone.\"", metric_label: "Physician weekly usage", metric_before: "20%", metric_after: "74%", hero_image_url: null, status: "published", published_at: daysAgo(8), created_at: daysAgo(12), updated_at: daysAgo(8) },
  ];

  return {
    events,
    members,
    event_rsvps,
    event_attendance,
    solutions,
    solution_interests,
    posts,
    replies,
    post_likes,
    spotlights,
  };
}

export const DEMO_DEFAULT_EMAIL = "priya.raghavan@redington.example.com";
