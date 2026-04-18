"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

import { useAuth } from "@/components/auth-provider";
import { PageShell } from "@/components/page-shell";
import { showToast } from "@/components/toast";
import { api } from "@/lib/api";
import type { Deal, Offer } from "@/lib/types";
import { formatDateTime, formatPrice, timeAgo } from "@/lib/utils";

const LocationPicker = dynamic(() => import("@/components/location-picker").then((mod) => mod.LocationPicker), { ssr: false });

type Tab = "sent" | "received" | "deals";

function OfferStatusBadge({ status }: { status: string }) {
  const cls = status === "PENDING" ? "badge-warning" : status === "ACCEPTED" ? "badge-success" : status === "DECLINED" || status === "CANCELLED" ? "badge-danger" : status === "COUNTERED" ? "badge-info" : "";
  const labels: Record<string, string> = { PENDING: "Chờ phản hồi", ACCEPTED: "Đã chấp nhận", DECLINED: "Đã từ chối", CANCELLED: "Đã hủy", EXPIRED: "Hết hạn", COUNTERED: "Đã trả giá lại" };
  return <span className={`badge ${cls}`}>{labels[status] ?? status}</span>;
}

function DealStatusBadge({ status }: { status: string }) {
  const cls = status === "OPEN" ? "badge-info" : status === "COMPLETED" ? "badge-success" : "badge-danger";
  const labels: Record<string, string> = { OPEN: "Đang giao dịch", COMPLETED: "Hoàn thành", CANCELLED: "Đã hủy" };
  return <span className={`badge ${cls}`}>{labels[status] ?? status}</span>;
}

const DEAL_STEPS = ["Chấp nhận", "Hẹn gặp / Giao hàng", "Hoàn thành"];

export default function OffersDashboardPage() {
  const { token, user } = useAuth();
  const [tab, setTab] = useState<Tab>("sent");
  const [myOffers, setMyOffers] = useState<Offer[]>([]);
  const [receivedOffers, setReceivedOffers] = useState<Offer[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Counter offer state
  const [counterOfferId, setCounterOfferId] = useState<string | null>(null);
  const [counterPrice, setCounterPrice] = useState("");

  // Delivery / Dispute state
  const [deliveryDealId, setDeliveryDealId] = useState<string | null>(null);
  const [trackingCode, setTrackingCode] = useState("");
  const [disputeDealId, setDisputeDealId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState("");

  // Meetup scheduling
  const [meetupDealId, setMeetupDealId] = useState<string | null>(null);
  const [meetupDate, setMeetupDate] = useState("");
  const [meetupLocation, setMeetupLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);

  const reload = async () => {
    if (!token) return;
    const [mine, received, nextDeals] = await Promise.all([
      api.myOffers(token), api.receivedOffers(token), api.listDeals(token),
    ]);
    setMyOffers(mine);
    setReceivedOffers(received);
    setDeals(nextDeals);
  };

  useEffect(() => {
    if (!token) return;
    let active = true;
    void Promise.all([api.myOffers(token), api.receivedOffers(token), api.listDeals(token)]).then(
      ([mine, received, nextDeals]) => {
        if (!active) return;
        setMyOffers(mine); setReceivedOffers(received); setDeals(nextDeals); setLoading(false);
      },
    );
    return () => { active = false; };
  }, [token]);

  const handleAction = async (action: () => Promise<unknown>, successMsg: string, id: string, confirmation?: string) => {
    if (confirmation && !window.confirm(confirmation)) return;
    setActionLoading(id);
    try { await action(); showToast(successMsg, "success"); await reload(); }
    catch (err) { showToast(err instanceof Error ? err.message : "Thao tác thất bại.", "danger"); }
    finally { setActionLoading(null); }
  };

  const handleCounter = async () => {
    if (!token || !counterOfferId || !counterPrice) return;
    setActionLoading(`counter-${counterOfferId}`);
    try {
      await api.counterOffer(token, counterOfferId, { price: parseInt(counterPrice.replace(/\D/g, "")) });
      showToast("Đã gửi trả giá!", "success");
      setCounterOfferId(null); setCounterPrice("");
      await reload();
    } catch (err) { showToast(err instanceof Error ? err.message : "Lỗi.", "danger"); }
    finally { setActionLoading(null); }
  };

  const handleScheduleMeetup = async () => {
    if (!token || !meetupDealId || !meetupDate) return;
    setActionLoading("meetup");
    try {
      await api.scheduleMeetup(token, {
        deal_id: meetupDealId,
        scheduled_at: new Date(meetupDate).toISOString(),
        location: meetupLocation ? { lat: meetupLocation.lat, lng: meetupLocation.lng, address: meetupLocation.address } : null,
      });
      showToast("Đã hẹn gặp thành công!", "success");
      setMeetupDealId(null); setMeetupDate(""); setMeetupLocation(null);
      await reload();
    } catch (err) { showToast(err instanceof Error ? err.message : "Lỗi.", "danger"); }
    finally { setActionLoading(null); }
  };

  const handleUpdateDelivery = async () => {
    if (!token || !deliveryDealId) return;
    setActionLoading("delivery");
    try {
      await api.updateDelivery(token, deliveryDealId, { delivery_status: "SHIPPING", tracking_code: trackingCode || null });
      showToast("Đã cập nhật trạng thái giao hàng!", "success");
      setDeliveryDealId(null); setTrackingCode("");
      await reload();
    } catch (err) { showToast(err instanceof Error ? err.message : "Lỗi.", "danger"); }
    finally { setActionLoading(null); }
  };

  const handleDispute = async () => {
    if (!token || !disputeDealId || !disputeReason) return;
    if (disputeReason.length < 10) { showToast("Lý do quá ngắn", "danger"); return; }
    setActionLoading("dispute");
    try {
      await api.fileDispute(token, disputeDealId, { reason: disputeReason });
      showToast("Đã gửi khiếu nại!", "success");
      setDisputeDealId(null); setDisputeReason("");
      await reload();
    } catch (err) { showToast(err instanceof Error ? err.message : "Lỗi.", "danger"); }
    finally { setActionLoading(null); }
  };

  if (!token) {
    return (
      <PageShell title="Giao dịch">
        <div className="panel"><p className="muted">Vui lòng đăng nhập để xem giao dịch.</p></div>
      </PageShell>
    );
  }

  const getDealStep = (deal: Deal) => {
    if (deal.status === "COMPLETED") return 3;
    if ((deal.meetups && deal.meetups.length > 0) || deal.delivery_status !== "PENDING") return 2;
    return 1;
  };

  const renderOfferItem = (offer: Offer, type: "sent" | "received") => {
    const isPending = offer.status === "PENDING";
    // If I sent this offer, and it's pending, I can cancel.
    // Wait, the logic: 
    // "sent" tab = myOffers (I am the buyer). "received" tab = receivedOffers (I am the seller).
    // But with counter offers, if I am the buyer and the seller counters, the new offer has `buyer_id` = me, `is_counter_from_seller` = true.
    // It still shows in `myOffers` because I am the buyer_id. 
    // If `is_counter_from_seller` is true, it means it's my turn to reply (Accept/Decline/Counter).
    // If `is_counter_from_seller` is false, it means I sent it, I wait for seller, I can only Cancel.
    
    // For "received" tab: `is_counter_from_seller` is true -> Seller sent it, waiting for buyer. Seller can cancel.
    // `is_counter_from_seller` is false -> Buyer sent it, waiting for seller. Seller can Accept/Decline/Counter.

    const canRespond = (type === "sent" && offer.is_counter_from_seller) || (type === "received" && !offer.is_counter_from_seller);
    const canCancel = (type === "sent" && !offer.is_counter_from_seller) || (type === "received" && offer.is_counter_from_seller);

    return (
      <div className="list-item" key={offer.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="split" style={{ alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {offer.listing_title ? (
              <Link href={`/listings/${offer.listing_id}`} style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>
                {offer.listing_title}
              </Link>
            ) : (
              <span className="muted" style={{ fontSize: 13 }}>Tin đăng #{offer.listing_id.slice(0, 8)}</span>
            )}
            <div className="inline">
              <OfferStatusBadge status={offer.status} />
              <span className="price-sm">{formatPrice(offer.price)} ₫</span>
              {offer.is_counter_from_seller && <span className="badge badge-info">Từ người bán</span>}
              {!offer.is_counter_from_seller && <span className="badge badge-info">Từ người mua</span>}
            </div>
            <span className="muted" style={{ fontSize: 12 }}>Tạo lúc: {formatDateTime(offer.created_at)}</span>
            {offer.expires_at && offer.status === "PENDING" && <span className="muted" style={{ fontSize: 12, color: "var(--danger)" }}>Hết hạn: {formatDateTime(offer.expires_at)}</span>}
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            {isPending && canCancel && (
              <button className="button ghost sm" type="button" disabled={actionLoading === offer.id}
                onClick={() => handleAction(() => api.cancelOffer(token, offer.id), "Đã hủy đề xuất.", offer.id, "Bạn có chắc chắn muốn rút lại đề xuất này không?")}>
                Rút lại đề xuất
              </button>
            )}

            {isPending && canRespond && (
              <div className="inline">
                <button className="button primary sm" type="button" disabled={actionLoading === `a-${offer.id}`}
                  onClick={() => handleAction(() => api.acceptOffer(token, offer.id), "Đã chấp nhận!", `a-${offer.id}`)}>
                  ✓ Chấp nhận
                </button>
                <button className="button secondary sm" type="button" onClick={() => setCounterOfferId(counterOfferId === offer.id ? null : offer.id)}>
                  Trả giá khác
                </button>
                <button className="button danger ghost sm" type="button" disabled={actionLoading === `d-${offer.id}`}
                  onClick={() => handleAction(() => api.declineOffer(token, offer.id), "Đã từ chối.", `d-${offer.id}`, "Bạn có chắc chắn muốn từ chối đề xuất này?")}>
                  Từ chối
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Counter Offer Box */}
        {counterOfferId === offer.id && (
           <div style={{ display: "flex", gap: 8, padding: 12, background: "var(--bg-inset)", borderRadius: "var(--radius)" }}>
             <input type="text" className="input sm" placeholder="Nhập mức giá mới..." value={counterPrice} onChange={(e) => setCounterPrice(e.target.value)} />
             <button className="button primary sm" onClick={handleCounter} disabled={actionLoading === `counter-${offer.id}`}>Gửi trả giá</button>
             <button className="button ghost sm" onClick={() => setCounterOfferId(null)}>Hủy</button>
           </div>
        )}
      </div>
    );
  };

  return (
    <PageShell title="Quản lý giao dịch" description="Theo dõi đề xuất giá, thỏa thuận mua bán và hẹn gặp giao dịch">
      <div className="tabs">
        <button className={`tab${tab === "sent" ? " active" : ""}`} type="button" onClick={() => setTab("sent")}>
          📤 Mua ({myOffers.length})
        </button>
        <button className={`tab${tab === "received" ? " active" : ""}`} type="button" onClick={() => setTab("received")}>
          📥 Bán ({receivedOffers.length})
        </button>
        <button className={`tab${tab === "deals" ? " active" : ""}`} type="button" onClick={() => setTab("deals")}>
          🤝 Thỏa thuận ({deals.length})
        </button>
      </div>

      {loading ? (
        <div className="grid" style={{ gap: 12 }}>{[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 100 }} />)}</div>
      ) : null}

      {/* OFFERS (Buy/Sell) */}
      {!loading && tab === "sent" ? (
        myOffers.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📤</div><h3>Chưa có đề xuất nào</h3><p>Bạn chưa gửi đề xuất mua sản phẩm nào.</p></div>
        ) : <div className="grid" style={{ gap: 12 }}>{myOffers.map(o => renderOfferItem(o, "sent"))}</div>
      ) : null}

      {!loading && tab === "received" ? (
        receivedOffers.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📥</div><h3>Chưa nhận đề xuất nào</h3><p>Chưa có ai gửi đề xuất giá cho sản phẩm của bạn.</p></div>
        ) : <div className="grid" style={{ gap: 12 }}>{receivedOffers.map(o => renderOfferItem(o, "received"))}</div>
      ) : null}

      {/* DEALS */}
      {!loading && tab === "deals" ? (
        deals.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🤝</div><h3>Chưa có thỏa thuận nào</h3><p>Thỏa thuận sẽ xuất hiện sau khi chấp nhận đề xuất giá.</p></div>
        ) : (
          <div className="grid" style={{ gap: 16 }}>
            {deals.map((deal) => {
              const step = getDealStep(deal);
              const isSeller = user?.id === deal.seller_id;
              const isBuyer = user?.id === deal.buyer_id;

              return (
                <div className="panel" key={deal.id} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div className="split">
                    <div>
                      {deal.listing_title ? (
                        <Link href={`/listings/${deal.listing_id}`} style={{ fontWeight: 600, fontSize: 15 }}>
                          {deal.listing_title}
                        </Link>
                      ) : (
                        <span className="muted">Thỏa thuận #{deal.id.slice(0, 8)}</span>
                      )}
                      <div className="inline" style={{ marginTop: 4 }}>
                        <DealStatusBadge status={deal.status} />
                        <span className="price-sm">{formatPrice(deal.agreed_price)} ₫</span>
                        {isSeller ? <span className="badge badge-info">Bạn là người bán</span> : <span className="badge badge-warning">Bạn là người mua</span>}
                      </div>
                      {deal.delivery_status !== "PENDING" && (
                        <div className="inline" style={{ marginTop: 4 }}>
                          <span className="badge badge-warning">Giao hàng: {deal.delivery_status}</span>
                          {deal.tracking_code && <span className="muted" style={{ fontSize: 12 }}>Mã vận đơn: {deal.tracking_code}</span>}
                        </div>
                      )}
                      {deal.has_dispute && (
                        <div style={{ marginTop: 8, padding: 8, background: "var(--danger-dim)", borderRadius: "var(--radius)", fontSize: 12, color: "var(--danger)" }}>
                          <strong>Đang khiếu nại:</strong> {deal.dispute_reason}
                        </div>
                      )}
                    </div>
                    <span className="muted" style={{ fontSize: 12 }}>{timeAgo(deal.created_at)}</span>
                  </div>

                  {/* Progress tracker */}
                  {deal.status !== "CANCELLED" ? (
                    <div style={{ display: "flex", gap: 0, alignItems: "center" }}>
                      {DEAL_STEPS.map((label, i) => (
                        <div key={label} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: "var(--radius-full)",
                            background: i < step ? "var(--accent)" : "var(--bg-inset)",
                            color: i < step ? "var(--text-inverse)" : "var(--text-tertiary)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 12, fontWeight: 600, flexShrink: 0,
                          }}>{i < step ? "✓" : i + 1}</div>
                          <span style={{ fontSize: 12, marginLeft: 6, color: i < step ? "var(--text)" : "var(--text-tertiary)", fontWeight: i < step ? 600 : 400 }}>{label}</span>
                          {i < DEAL_STEPS.length - 1 ? <div style={{ flex: 1, height: 2, background: i < step - 1 ? "var(--accent)" : "var(--border)", margin: "0 8px" }} /> : null}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {/* Meetups */}
                  {deal.meetups && deal.meetups.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {deal.meetups.map((meetup) => (
                        <div key={meetup.id} className="list-item" style={{ padding: 10, fontSize: 13 }}>
                          <div className="split">
                            <div className="inline">
                              <span>📅 {formatDateTime(meetup.scheduled_at)}</span>
                              {meetup.location?.address && <span>📍 {meetup.location.address}</span>}
                              <span className={`badge ${meetup.status === "SCHEDULED" ? "badge-warning" : meetup.status === "COMPLETED" ? "badge-success" : "badge-danger"}`} style={{ fontSize: 11 }}>
                                {meetup.status === "SCHEDULED" ? "Đã hẹn" : meetup.status === "COMPLETED" ? "Đã gặp" : "Hủy"}
                              </span>
                            </div>
                            
                            {meetup.status === "SCHEDULED" && deal.status === "OPEN" && !deal.has_dispute && (
                              <button className="button primary sm" disabled={actionLoading === `checkin-${meetup.id}`}
                                onClick={() => handleAction(() => api.checkInMeetup(token, meetup.id), "Đã check-in điểm hẹn!", `checkin-${meetup.id}`)}>
                                ✓ Check-in ngay
                              </button>
                            )}
                          </div>
                          {meetup.status === "SCHEDULED" && (
                            <div className="inline" style={{ marginTop: 4, fontSize: 11, color: "var(--text-tertiary)" }}>
                              <span>Người mua: {meetup.buyer_checked_in ? "Đã tới" : "Chưa tới"}</span>
                              <span>•</span>
                              <span>Người bán: {meetup.seller_checked_in ? "Đã tới" : "Chưa tới"}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {/* Actions */}
                  {deal.status === "OPEN" && !deal.has_dispute ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      
                      {/* Meetup scheduling box */}
                      {meetupDealId === deal.id && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16, background: "var(--bg-inset)", borderRadius: "var(--radius)" }}>
                          <h4 style={{ margin: 0, fontSize: 14 }}>Tạo lịch hẹn gặp</h4>
                          <div className="field">
                            <label style={{ fontSize: 12 }}>Thời gian hẹn</label>
                            <input type="datetime-local" value={meetupDate} onChange={(e) => setMeetupDate(e.target.value)} style={{ fontSize: 13, padding: 8, borderRadius: 6, border: "1px solid var(--border)" }} />
                          </div>
                          <div className="field">
                            <label style={{ fontSize: 12 }}>Địa điểm</label>
                            <div style={{ background: "#fff", borderRadius: 8, overflow: "hidden" }}>
                              <LocationPicker 
                                value={meetupLocation || null}
                                onChange={(loc) => setMeetupLocation(loc as any)} 
                              />
                            </div>
                          </div>
                          <div className="inline">
                            <button className="button primary sm" type="button" onClick={handleScheduleMeetup} disabled={actionLoading === "meetup" || !meetupDate || !meetupLocation}>
                              Xác nhận lịch hẹn
                            </button>
                            <button className="button ghost sm" type="button" onClick={() => setMeetupDealId(null)}>Hủy</button>
                          </div>
                        </div>
                      )}

                      {/* Delivery box */}
                      {deliveryDealId === deal.id && isSeller && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16, background: "var(--bg-inset)", borderRadius: "var(--radius)" }}>
                          <h4 style={{ margin: 0, fontSize: 14 }}>Cập nhật giao hàng</h4>
                          <div className="field">
                            <label style={{ fontSize: 12 }}>Mã vận đơn (nếu có)</label>
                            <input type="text" className="input" placeholder="VD: SPX123456" value={trackingCode} onChange={(e) => setTrackingCode(e.target.value)} />
                          </div>
                          <div className="inline">
                            <button className="button primary sm" type="button" onClick={handleUpdateDelivery} disabled={actionLoading === "delivery"}>
                              Đánh dấu đã chuyển hàng
                            </button>
                            <button className="button ghost sm" type="button" onClick={() => setDeliveryDealId(null)}>Hủy</button>
                          </div>
                        </div>
                      )}

                      {/* Dispute box */}
                      {disputeDealId === deal.id && isBuyer && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16, background: "var(--danger-dim)", borderRadius: "var(--radius)" }}>
                          <h4 style={{ margin: 0, fontSize: 14, color: "var(--danger)" }}>Tạo khiếu nại</h4>
                          <div className="field">
                            <label style={{ fontSize: 12 }}>Lý do khiếu nại (tối thiểu 10 ký tự)</label>
                            <textarea className="input" rows={3} placeholder="Mô tả chi tiết vấn đề..." value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} />
                          </div>
                          <div className="inline">
                            <button className="button danger sm" type="button" onClick={handleDispute} disabled={actionLoading === "dispute"}>
                              Gửi khiếu nại
                            </button>
                            <button className="button ghost sm" type="button" onClick={() => setDisputeDealId(null)}>Hủy</button>
                          </div>
                        </div>
                      )}

                      {/* Toolbar */}
                      <div className="split">
                        <div className="inline">
                          <button className="button secondary sm" type="button" onClick={() => setMeetupDealId(meetupDealId === deal.id ? null : deal.id)}>
                            📅 Hẹn gặp
                          </button>
                          {isSeller && deal.delivery_status === "PENDING" && (
                            <button className="button secondary sm" type="button" onClick={() => setDeliveryDealId(deliveryDealId === deal.id ? null : deal.id)}>
                              📦 Giao hàng
                            </button>
                          )}
                          {isBuyer && deal.delivery_status !== "PENDING" && (
                             <button className="button primary sm" type="button" disabled={actionLoading === `c-${deal.id}`}
                                onClick={() => handleAction(() => api.completeDeal(token, deal.id), "Đã nhận hàng thành công!", `c-${deal.id}`, "Bạn xác nhận đã nhận được hàng và hàng đúng mô tả chứ?")}>
                                ✓ Đã nhận hàng
                              </button>
                          )}
                          {isBuyer && (
                            <button className="button ghost danger sm" type="button" onClick={() => setDisputeDealId(disputeDealId === deal.id ? null : deal.id)}>
                               Khiếu nại
                            </button>
                          )}
                        </div>
                        <div className="inline">
                          <button className="button danger sm" type="button" disabled={actionLoading === `x-${deal.id}`}
                            onClick={() => handleAction(() => api.cancelDeal(token, deal.id), "Đã hủy thỏa thuận.", `x-${deal.id}`, "Bạn có chắc chắn muốn hủy thỏa thuận này? Việc này sẽ ảnh hưởng uy tín của bạn.")}>
                            Hủy giao dịch
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )
      ) : null}
    </PageShell>
  );
}
