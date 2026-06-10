import type { AuthResponse, Block, Category, Conversation, Deal, Listing, Meetup, Offer, Report, User, UserPublic, ListingQuestion, Review, Wishlist, MapLegend } from "@/lib/types";
import { translateError } from "@/lib/error-translator";


const API_BASE = typeof window === "undefined"
  ? "http://127.0.0.1:8000/api/v1"
  : (process.env.NEXT_PUBLIC_API_URL ?? "/api/v1");

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
    let errMsg = "Yêu cầu thất bại";
    if (data.detail) {
      if (typeof data.detail === "string") {
        errMsg = translateError(undefined, data.detail);
      } else if (Array.isArray(data.detail)) {
        errMsg = data.detail.map((err: any) => {
          const field = err.loc ? err.loc[err.loc.length - 1] : undefined;
          return translateError(field, err.msg);
        }).join(", ");
      } else if (typeof data.detail === "object") {
        errMsg = data.detail.message ? translateError(undefined, data.detail.message) : JSON.stringify(data.detail);
      }
    } else if (data.message) {
      errMsg = translateError(undefined, data.message);
    }
    throw new ApiError(errMsg, response.status);
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
  updateProfile: (token: string, payload: { full_name?: string; avatar_url?: string; bio?: string; display_name?: string; phone?: string; address?: string; dob?: string; shop_slug?: string; banner_url?: string; lat?: number; lng?: number; }) =>
    request<User>("/users/me", { method: "PATCH", body: JSON.stringify(payload) }, token),
  getUser: (userId: string) => request<UserPublic>(`/users/${userId}`),
  getUserListings: (userId: string, inLiveRoom?: boolean) => 
    request<Listing[]>(`/users/${userId}/listings${inLiveRoom !== undefined ? `?in_live_room=${inLiveRoom}` : ""}`),

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
  unblockUser: (token: string, blockedId: string) =>
    request<void>(`/moderation/blocks/${blockedId}`, { method: "DELETE" }, token),

  // Chat delete message
  deleteMessage: (token: string, messageId: string) =>
    request<void>(`/chat/messages/${messageId}`, { method: "DELETE" }, token),

  // Wishlists
  getWishlists: (token: string) =>
    request<Wishlist[]>("/wishlists/me", undefined, token),
  createWishlist: (token: string, payload: { name: string; is_public?: boolean }) =>
    request<Wishlist>("/wishlists", { method: "POST", body: JSON.stringify(payload) }, token),
  addWishlistItem: (token: string, wishlistId: string, listingId: string) =>
    request<any>(`/wishlists/${wishlistId}/items`, { method: "POST", body: JSON.stringify({ listing_id: listingId }) }, token),
  removeWishlistItem: (token: string, wishlistId: string, listingId: string) =>
    request<void>(`/wishlists/${wishlistId}/items/${listingId}`, { method: "DELETE" }, token),

  // Listing Q&A
  getListingQuestions: (listingId: string) => 
    request<ListingQuestion[]>(`/listings/${listingId}/questions`),
  askQuestion: (token: string, listingId: string, question: string) => 
    request<ListingQuestion>(`/listings/${listingId}/questions`, { method: "POST", body: JSON.stringify({ question }) }, token),
  answerQuestion: (token: string, questionId: string, answer: string) => 
    request<ListingQuestion>(`/listings/questions/${questionId}/answer`, { method: "POST", body: JSON.stringify({ answer }) }, token),

  // Social Follow & Reviews
  followUser: (token: string, userId: string) =>
    request<void>(`/users/${userId}/follow`, { method: "POST" }, token),
  unfollowUser: (token: string, userId: string) =>
    request<void>(`/users/${userId}/follow`, { method: "DELETE" }, token),
  getUserReviews: (userId: string, token?: string) =>
    request<Review[]>(`/users/${userId}/reviews`, undefined, token),
  createReview: (token: string, userId: string, payload: { deal_id: string; rating: number; comment?: string | null }) =>
    request<Review>(`/users/${userId}/reviews`, { method: "POST", body: JSON.stringify(payload) }, token),

  // Search Suggestions
  searchSuggestions: (query: string) =>
    request<string[]>(`/listings/search/suggestions?query=${encodeURIComponent(query)}`),

  // Disputes
  listDisputes: (token: string) => 
    request<Deal[]>("/moderation/disputes", undefined, token),
  resolveDispute: (token: string, dealId: string, resolution: "COMPLETED" | "CANCELLED") =>
    request<Deal>(`/moderation/disputes/${dealId}/resolve`, { method: "POST", body: JSON.stringify({ resolution }) }, token),

  // Notifications
  listNotifications: (token: string) =>
    request<any[]>("/notifications", undefined, token),
  unreadCountNotifications: (token: string) =>
    request<{ count: number }>("/notifications/unread-count", undefined, token),
  unreadCountMessages: (token: string) =>
    request<{ count: number }>("/chat/unread-count", undefined, token),
  readNotification: (token: string, notificationId: string) =>
    request<any>(`/notifications/${notificationId}/read`, { method: "PATCH" }, token),
  readAllNotifications: (token: string) =>
    request<{ status: string }>("/notifications/read-all", { method: "POST" }, token),

  // Audit Logs
  listAuditLogs: (token: string) =>
    request<any[]>("/moderation/audit-logs", undefined, token),

  classifyListingImage: (token: string, imageUrl: string) =>
    request<any>(`/listings/classify?image_url=${encodeURIComponent(imageUrl)}`, { method: "POST" }, token),

  // Sprint 4 improvements
  forgotPassword: (email: string) =>
    request<any>("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
  verifyResetToken: (token: string) =>
    request<{ email: string }>(`/auth/verify-reset-token/${token}`),
  resetPassword: (payload: Record<string, any>) =>
    request<any>("/auth/reset-password", { method: "POST", body: JSON.stringify(payload) }),
  listMockEmails: () =>
    request<any[]>("/auth/mock-emails"),
  getModerationAnalytics: (token: string) =>
    request<any>("/moderation/analytics/stats", undefined, token),
  listMapLegends: () =>
    request<MapLegend[]>("/listings/map-legends"),
  updateMapLegend: (token: string, symbol_type: string, payload: { icon: string; name: string; description: string; color: string }) =>
    request<MapLegend>(`/moderation/map-legends/${symbol_type}`, { method: "PUT", body: JSON.stringify(payload) }, token),
  uploadMedia: async (token: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`${API_BASE}/media/upload`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`
      },
      body: formData
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new ApiError(data.detail ?? "Upload failed", response.status);
    }
    return response.json() as Promise<{ url: string }>;
  },

  // Livestreaming
  getMyLiveRoom: (token: string) =>
    request<any>("/livestream/rooms/me", undefined, token),
  updateMyLiveRoom: (token: string, payload: { title?: string; preview_url?: string; tags?: string; is_live?: boolean; is_online?: boolean }) =>
    request<any>("/livestream/rooms/me", { method: "PATCH", body: JSON.stringify(payload) }, token),
  getActiveLiveRooms: () =>
    request<any[]>("/livestream/rooms"),
  getLiveRoom: (streamerId: string) =>
    request<any>(`/livestream/rooms/${streamerId}`),
  getLiveComments: (streamerId: string) =>
    request<any[]>(`/livestream/rooms/${streamerId}/comments`),
  postLiveComment: (token: string, streamerId: string, content: string) =>
    request<any>(`/livestream/rooms/${streamerId}/comments`, { method: "POST", body: JSON.stringify({ content }) }, token)
};


