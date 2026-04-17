export type UserRole = "USER" | "ADMIN";
export type UserStatus = "ACTIVE" | "BANNED";
export type ListingStatus = "AVAILABLE" | "RESERVED" | "SOLD" | "HIDDEN";
export type ItemCondition = "NEW" | "LIKE_NEW" | "USED" | "DAMAGED";
export type OfferStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED" | "EXPIRED";
export type DealStatus = "OPEN" | "CANCELLED" | "COMPLETED";
export type MeetupStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED";
export type ReportStatus = "PENDING" | "RESOLVED" | "DISMISSED";

export interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  bio?: string | null;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  profile?: Profile | null;
}

export interface UserPublic {
  id: string;
  created_at: string;
  profile?: Profile | null;
}

export interface Category {
  id: string;
  name: string;
  parent_id?: string | null;
}

export interface Listing {
  id: string;
  owner_id: string;
  category_id?: string | null;
  title: string;
  description?: string | null;
  price: string;
  condition: ItemCondition;
  location_data?: Record<string, unknown> | null;
  image_urls: string[];
  status: ListingStatus;
  created_at: string;
  updated_at?: string | null;
  owner?: User | null;
  category?: Category | null;
}

export interface Offer {
  id: string;
  listing_id: string;
  buyer_id: string;
  price: string;
  status: OfferStatus;
  created_at: string;
  listing_title?: string | null;
}

export interface Meetup {
  id: string;
  deal_id: string;
  scheduled_at: string;
  location?: Record<string, unknown> | null;
  status: MeetupStatus;
  created_at: string;
}

export interface Deal {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  agreed_price: string;
  status: DealStatus;
  created_at: string;
  listing_title?: string | null;
  meetups?: Meetup[];
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: User | null;
}

export interface Conversation {
  id: string;
  title?: string | null;
  listing_id?: string | null;
  created_at: string;
  participants: User[];
  messages: Message[];
}

export interface Report {
  id: string;
  reporter_id: string;
  target_type: "USER" | "LISTING" | "MESSAGE";
  target_id: string;
  reason: string;
  status: ReportStatus;
  created_at: string;
}

export interface Block {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}
