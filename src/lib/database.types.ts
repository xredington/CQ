/**
 * Hand-maintained database types mirroring supabase/migrations.
 * Regenerate mentally on every migration — migrations are the source of truth.
 */

export type Industry =
  | "banking-financial-services"
  | "oil-gas"
  | "government"
  | "hospitality"
  | "healthcare"
  | "retail"
  | "manufacturing"
  | "telecom"
  | "education"
  | "technology"
  | "other";

export type MemberRole = "member" | "admin";
export type MemberStatus = "invited" | "active" | "deactivated";
export type EventStatus = "upcoming" | "completed" | "cancelled";
export type RsvpStatus = "going" | "not_going";
export type SolutionCategory =
  | "copilot"
  | "productivity-ai"
  | "security-ai"
  | "data-analytics"
  | "industry-solution"
  | "infrastructure"
  | "other";
export type PostCategory =
  | "copilot"
  | "ai-use-cases"
  | "implementation-help"
  | "general";
export type PublishStatus = "draft" | "published";

export interface Member {
  id: string;
  created_at: string;
  updated_at: string;
  auth_user_id: string | null;
  full_name: string;
  email: string;
  company: string;
  designation: string | null;
  industry: Industry | null;
  country: string | null;
  avatar_url: string | null;
  bio: string | null;
  referred_by: string | null;
  joined_event_id: string | null;
  role: MemberRole;
  status: MemberStatus;
}

export interface CommunityEvent {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  city: string;
  country: string;
  event_date: string;
  timezone: string;
  description: string | null;
  cover_image_url: string | null;
  status: EventStatus;
}

export interface EventRsvp {
  id: string;
  created_at: string;
  event_id: string;
  member_id: string;
  status: RsvpStatus;
}

export interface EventAttendance {
  id: string;
  created_at: string;
  event_id: string;
  member_id: string;
}

export interface Solution {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  vendor: string;
  category: SolutionCategory;
  summary: string;
  description: string | null;
  outcomes: string | null;
  logo_url: string | null;
  owner_name: string | null;
  owner_email: string | null;
  status: PublishStatus;
}

export interface SolutionInterest {
  id: string;
  created_at: string;
  solution_id: string;
  member_id: string;
  note: string | null;
}

export interface Post {
  id: string;
  created_at: string;
  updated_at: string;
  author_id: string;
  title: string;
  body: string;
  category: PostCategory;
  is_pinned: boolean;
  is_locked: boolean;
}

export interface Reply {
  id: string;
  created_at: string;
  post_id: string;
  author_id: string;
  body: string;
}

export interface PostLike {
  id: string;
  created_at: string;
  post_id: string;
  member_id: string;
}

export interface Spotlight {
  id: string;
  created_at: string;
  updated_at: string;
  member_id: string;
  headline: string;
  story_md: string;
  metric_label: string;
  metric_before: string;
  metric_after: string;
  hero_image_url: string | null;
  status: PublishStatus;
  published_at: string | null;
}

export interface HiveTreeRow {
  id: string;
  full_name: string;
  company: string;
  industry: Industry | null;
  country: string | null;
  referred_by: string | null;
  depth: number;
  path: string[];
}

export interface MemberRecruitCounts {
  member_id: string;
  direct_recruits: number;
  total_downline: number;
}
