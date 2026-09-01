// Hand-written types mirroring mysql/schema.sql.

export type Gender = "male" | "female";
export type UserRole = "member" | "admin";
export type UserStatus = "pending" | "approved" | "suspended";
export type MutualMatchStatus = "active" | "ended";
export type MembershipTier = "founding" | "regular" | "priority";
export type CounsellorType = "relationship" | "marriage" | "religious";
export type CounsellingRequestStatus = "pending" | "contacted" | "closed";
export type Community = "chinese" | "malay" | "indian" | "eurasian" | "other";
export type RelationshipIntent = "marriage_minded" | "open_to_marriage" | "not_sure";
export type EducationLevel =
  | "secondary"
  | "diploma"
  | "bachelors"
  | "masters"
  | "phd"
  | "other";
export type SmokingPreference = "non_smoker" | "occasional" | "regular";
export type DrinkingPreference = "non_drinker" | "social" | "regular";

// Full row as stored — includes password_hash. Never send this
// straight to the client; pick only the fields you need (see the
// Next.js DTO pattern) or use PublicUser below.
export type UserRow = {
  id: string;
  email: string | null;
  phone: string | null;
  password_hash: string | null;
  full_name: string | null;
  date_of_birth: string | null; // ISO date
  gender: Gender | null;
  photos: string[] | null;
  bio: string | null;
  location: string | null;
  occupation: string | null;
  role: UserRole;
  status: UserStatus;
  own_faith: string | null;
  faith_matters_to_them: 0 | 1;
  open_to_other_faith: 0 | 1 | null;
  community: Community | null;
  relationship_intent: RelationshipIntent | null;
  education_level: EducationLevel | null;
  height_cm: number | null;
  smoking: SmokingPreference | null;
  drinking: DrinkingPreference | null;
  terms_accepted_at: string | null;
  photo_consent_accepted_at: string | null;
  last_login_at: string | null;
  years_out_of_relationship: number | null;
  preferred_gender: Gender | null;
  preferred_age_min: number | null;
  preferred_age_max: number | null;
  preferred_location: string | null;
  created_at: string;
};

// Same shape, with MySQL's TINYINT booleans normalized to real
// booleans — this is what the matching engine and app code work
// with. Use `toProfile()` in src/lib/matching/engine.ts to convert.
export type Profile = Omit<
  UserRow,
  "password_hash" | "faith_matters_to_them" | "open_to_other_faith" | "photos"
> & {
  faith_matters_to_them: boolean;
  open_to_other_faith: boolean | null;
  photos: string[];
};

export type PublicUser = Omit<UserRow, "password_hash">;

export type OtpCodeRow = {
  id: string;
  phone: string;
  code_hash: string;
  expires_at: string;
  consumed_at: string | null;
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

export type PhotoModerationLog = {
  id: string;
  user_id: string;
  reason: string;
  created_at: string;
};
