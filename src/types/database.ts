// Hand-written types mirroring supabase/schema.sql. Regenerate with
// `supabase gen types typescript` once the project is linked to a
// real Supabase instance, and delete this file in favour of that.

export type Gender = "male" | "female";
export type ProfileStatus = "pending" | "approved" | "suspended";
export type MutualMatchStatus = "active" | "ended";
export type MembershipTier = "founding" | "regular" | "priority";
export type CounsellorType = "relationship" | "marriage" | "religious";
export type CounsellingRequestStatus = "pending" | "contacted" | "closed";

export type Profile = {
  id: string;
  full_name: string | null;
  date_of_birth: string | null; // ISO date
  gender: Gender | null;
  photos: string[];
  bio: string | null;
  location: string | null;
  occupation: string | null;
  role: "member" | "admin";
  status: ProfileStatus;
  faith_matters_to_them: boolean;
  own_faith: string | null;
  open_to_other_faith: boolean | null;
  years_out_of_relationship: number | null;
  preferred_gender: Gender | null;
  preferred_age_min: number | null;
  preferred_age_max: number | null;
  preferred_location: string | null;
  created_at: string;
};

export type MatchRow = {
  id: string;
  user_id: string;
  matched_user_id: string;
  batch_id: string;
  created_at: string;
  expires_at: string;
};

export type Interest = {
  id: string;
  user_id: string;
  matched_user_id: string;
  batch_id: string;
  created_at: string;
};

export type MutualMatch = {
  id: string;
  user_a_id: string;
  user_b_id: string;
  matched_at: string;
  status: MutualMatchStatus;
  cooling_off_until: string | null;
};

export type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  mutual_match_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
};

export type Membership = {
  id: string;
  user_id: string;
  tier: MembershipTier;
  started_at: string;
  expires_at: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

export type CounsellingRequest = {
  id: string;
  user_id: string;
  requested_at: string;
  counsellor_type: CounsellorType;
  status: CounsellingRequestStatus;
};
