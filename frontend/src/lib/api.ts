import type { AuthResponse, Block, Category, Conversation, Deal, Listing, Meetup, Offer, Report, User, UserPublic } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit, token?: string): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new ApiError(data.detail ?? "Request failed", response.status);
  }
  return data as T;
}

export const api = {
  // Auth
  register: (payload: { email: string; password: string; full_name: string }) =>
    request<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload: { email: string; password: string }) =>
    request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  me: (token: string) => request<User>("/auth/me", undefined, token),

  // User
  updateProfile: (token: string, payload: { full_name?: string; avatar_url?: string; bio?: string; display_name?: string; phone?: string; address?: string; dob?: string; shop_slug?: string; banner_url?: string; }) =>
    request<User>("/users/me", { method: "PATCH", body: JSON.stringify(payload) }, token),
  getUser: (userId: string) => request<UserPublic>(`/users/${userId}`),
  getUserListings: (userId: string) => request<Listing[]>(`/users/${userId}/listings`),

  // Listings
  listCategories: () => request<Category[]>("/listings/categories"),
  createCategory: (token: string, payload: { name: string; parent_id?: string }) =>
    request<Category>("/listings/categories", { method: "POST", body: JSON.stringify(payload) }, token),
  listListings: (params?: URLSearchParams) =>
    request<Listing[]>(`/listings${params ? `?${params.toString()}` : ""}`),
  getListing: (listingId: string) => request<Listing>(`/listings/${listingId}`),
  createListing: (token: string, payload: Record<string, unknown>) =>
    request<Listing>("/listings", { method: "POST", body: JSON.stringify(payload) }, token),
  updateListing: (token: string, listingId: string, payload: Record<string, unknown>) =>
    request<Listing>(`/listings/${listingId}`, { method: "PATCH", body: JSON.stringify(payload) }, token),
  deleteListing: (token: string, listingId: string) =>
    request<void>(`/listings/${listingId}`, { method: "DELETE" }, token),
  restoreListing: (token: string, listingId: string) =>
    request<Listing>(`/listings/${listingId}/restore`, { method: "POST" }, token),
  getDeletedListings: (token: string) => 
    request<Listing[]>("/listings/me/deleted", undefined, token),
  toggleFavorite: (token: string, listingId: string) =>
    request<{ favorite: boolean }>(`/listings/${listingId}/favorite`, { method: "POST" }, token),

  // Transactions
  createOffer: (token: string, payload: { listing_id: string; price: number }) =>
    request<Offer>("/transactions/offers", { method: "POST", body: JSON.stringify(payload) }, token),
  myOffers: (token: string) => request<Offer[]>("/transactions/offers/mine", undefined, token),
  receivedOffers: (token: string) => request<Offer[]>("/transactions/offers/received", undefined, token),
  acceptOffer: (token: string, offerId: string) =>
    request<Deal>(`/transactions/offers/${offerId}/accept`, { method: "POST" }, token),
  declineOffer: (token: string, offerId: string) =>
    request<Offer>(`/transactions/offers/${offerId}/decline`, { method: "POST" }, token),
  cancelOffer: (token: string, offerId: string) =>
    request<Offer>(`/transactions/offers/${offerId}/cancel`, { method: "POST" }, token),
  counterOffer: (token: string, offerId: string, payload: { price: number }) =>
    request<Offer>(`/transactions/offers/${offerId}/counter`, { method: "POST", body: JSON.stringify(payload) }, token),
  listDeals: (token: string) => request<Deal[]>("/transactions/deals", undefined, token),
  completeDeal: (token: string, dealId: string) =>
    request<Deal>(`/transactions/deals/${dealId}/complete`, { method: "POST" }, token),
  cancelDeal: (token: string, dealId: string) =>
    request<Deal>(`/transactions/deals/${dealId}/cancel`, { method: "POST" }, token),
  updateDelivery: (token: string, dealId: string, payload: { delivery_status: string; tracking_code?: string | null }) =>
    request<Deal>(`/transactions/deals/${dealId}/delivery`, { method: "PATCH", body: JSON.stringify(payload) }, token),
  fileDispute: (token: string, dealId: string, payload: { reason: string }) =>
    request<Deal>(`/transactions/deals/${dealId}/dispute`, { method: "POST", body: JSON.stringify(payload) }, token),
  scheduleMeetup: (token: string, payload: { deal_id: string; scheduled_at: string; location?: Record<string, unknown> | null }) =>
    request<Meetup>("/transactions/meetups", { method: "POST", body: JSON.stringify(payload) }, token),
  checkInMeetup: (token: string, meetupId: string) =>
    request<Meetup>(`/transactions/meetups/${meetupId}/check-in`, { method: "POST" }, token),

  // Chat
  createConversation: (token: string, payload: { participant_ids: string[]; listing_id?: string; title?: string }) =>
    request<Conversation>("/chat/conversations", { method: "POST", body: JSON.stringify(payload) }, token),
  listConversations: (token: string) => request<Conversation[]>("/chat/conversations", undefined, token),
  getConversation: (token: string, conversationId: string) =>
    request<Conversation>(`/chat/conversations/${conversationId}`, undefined, token),
  sendMessage: (token: string, payload: { conversation_id: string; content: string }) =>
    request("/chat/messages", { method: "POST", body: JSON.stringify(payload) }, token),

  // Moderation
  createReport: (token: string, payload: { target_type: string; target_id: string; reason: string }) =>
    request<Report>("/moderation/reports", { method: "POST", body: JSON.stringify(payload) }, token),
  listReports: (token: string) => request<Report[]>("/moderation/reports", undefined, token),
  reviewReport: (token: string, reportId: string, status: string) =>
    request<Report>(`/moderation/reports/${reportId}`, { method: "PATCH", body: JSON.stringify({ status }) }, token),
  blockUser: (token: string, blocked_id: string) =>
    request<Block>("/moderation/blocks", { method: "POST", body: JSON.stringify({ blocked_id }) }, token),
  listBlocks: (token: string) => request<Block[]>("/moderation/blocks", undefined, token),
};
