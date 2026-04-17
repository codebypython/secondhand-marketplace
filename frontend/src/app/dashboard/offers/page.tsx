"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { PageShell } from "@/components/page-shell";
import { showToast } from "@/components/toast";
import { api } from "@/lib/api";
import type { Deal, Offer } from "@/lib/types";
import { formatDateTime, formatPrice, timeAgo } from "@/lib/utils";

type Tab = "sent" | "received" | "deals";

function OfferStatusBadge({ status }: { status: string }) {
  const cls = status === "PENDING" ? "badge-warning" : status === "ACCEPTED" ? "badge-success" : status === "DECLINED" || status === "CANCELLED" ? "badge-danger" : "";
  const labels: Record<string, string> = { PENDING: "Chờ phản hồi", ACCEPTED: "Đã chấp nhận", DECLINED: "Đã từ chối", CANCELLED: "Đã hủy", EXPIRED: "Hết hạn" };
  return <span className={`badge ${cls}`}>{labels[status] ?? status}</span>;
}

function DealStatusBadge({ status }: { status: string }) {
  const cls = status === "OPEN" ? "badge-info" : status === "COMPLETED" ? "badge-success" : "badge-danger";
  const labels: Record<string, string> = { OPEN: "Đang giao dịch", COMPLETED: "Hoàn thành", CANCELLED: "Đã hủy" };
  return <span className={`badge ${cls}`}>{labels[status] ?? status}</span>;
}

const DEAL_STEPS = ["Chấp nhận", "Hẹn gặp", "Hoàn thành"];

export default function OffersDashboardPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>("sent");
  const [myOffers, setMyOffers] = useState<Offer[]>([]);
  const [receivedOffers, setReceivedOffers] = useState<Offer[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Meetup scheduling
  const [meetupDealId, setMeetupDealId] = useState<string | null>(null);
  const [meetupDate, setMeetupDate] = useState("");
  const [meetupLocation, setMeetupLocation] = useState("");

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

  const handleAction = async (action: () => Promise<unknown>, successMsg: string, id: string) => {
    setActionLoading(id);
    try { await action(); showToast(successMsg, "success"); await reload(); }
    catch (err) { showToast(err instanceof Error ? err.message : "Thao tác thất bại.", "danger"); }
    finally { setActionLoading(null); }
  };

  const handleScheduleMeetup = async () => {
    if (!token || !meetupDealId || !meetupDate) return;
    setActionLoading("meetup");
    try {
      await api.scheduleMeetup(token, {
        deal_id: meetupDealId,
        scheduled_at: new Date(meetupDate).toISOString(),
        location: meetupLocation ? { address: meetupLocation } : undefined,
      });
      showToast("Đã hẹn gặp thành công!", "success");
      setMeetupDealId(null); setMeetupDate(""); setMeetupLocation("");
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
    if (deal.meetups && deal.meetups.length > 0) return 2;
    return 1;
  };

  return (
    <PageShell title="Quản lý giao dịch" description="Theo dõi đề xuất giá, thỏa thuận mua bán và hẹn gặp giao dịch">
      <div className="tabs">
        <button className={`tab${tab === "sent" ? " active" : ""}`} type="button" onClick={() => setTab("sent")}>
          📤 Đã gửi ({myOffers.length})
        </button>
        <button className={`tab${tab === "received" ? " active" : ""}`} type="button" onClick={() => setTab("received")}>
          📥 Đã nhận ({receivedOffers.length})
        </button>
        <button className={`tab${tab === "deals" ? " active" : ""}`} type="button" onClick={() => setTab("deals")}>
          🤝 Thỏa thuận ({deals.length})
        </button>
      </div>

      {loading ? (
        <div className="grid" style={{ gap: 12 }}>{[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 100 }} />)}</div>
      ) : null}

      {/* SENT OFFERS */}
      {!loading && tab === "sent" ? (
        myOffers.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📤</div><h3>Chưa có đề xuất nào</h3><p>Bạn chưa gửi đề xuất giá cho sản phẩm nào.</p></div>
        ) : (
          <div className="grid" style={{ gap: 12 }}>
            {myOffers.map((offer) => (
              <div className="list-item" key={offer.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div className="split">
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
                    </div>
                    <span className="muted" style={{ fontSize: 12 }}>{timeAgo(offer.created_at)}</span>
                  </div>
                  {offer.status === "PENDING" ? (
                    <button className="button ghost sm" type="button" disabled={actionLoading === offer.id}
                      onClick={() => handleAction(() => api.cancelOffer(token, offer.id), "Đã hủy đề xuất.", offer.id)}>
                      Hủy
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )
      ) : null}

      {/* RECEIVED OFFERS */}
      {!loading && tab === "received" ? (
        receivedOffers.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📥</div><h3>Chưa nhận đề xuất nào</h3><p>Chưa có ai gửi đề xuất giá cho sản phẩm của bạn.</p></div>
        ) : (
          <div className="grid" style={{ gap: 12 }}>
            {receivedOffers.map((offer) => (
              <div className="list-item" key={offer.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div className="split">
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
                    </div>
                    <span className="muted" style={{ fontSize: 12 }}>{timeAgo(offer.created_at)}</span>
                  </div>
                  {offer.status === "PENDING" ? (
                    <div className="inline">
                      <button className="button primary sm" type="button" disabled={actionLoading === `a-${offer.id}`}
                        onClick={() => handleAction(() => api.acceptOffer(token, offer.id), "Đã chấp nhận!", `a-${offer.id}`)}>
                        ✓ Chấp nhận
                      </button>
                      <button className="button ghost sm" type="button" disabled={actionLoading === `d-${offer.id}`}
                        onClick={() => handleAction(() => api.declineOffer(token, offer.id), "Đã từ chối.", `d-${offer.id}`)}>
                        Từ chối
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )
      ) : null}

      {/* DEALS */}
      {!loading && tab === "deals" ? (
        deals.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🤝</div><h3>Chưa có thỏa thuận nào</h3><p>Thỏa thuận sẽ xuất hiện sau khi chấp nhận đề xuất giá.</p></div>
        ) : (
          <div className="grid" style={{ gap: 16 }}>
            {deals.map((deal) => {
              const step = getDealStep(deal);
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
                      </div>
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
                          <div className="inline">
                            <span>📅 {formatDateTime(meetup.scheduled_at)}</span>
                            {meetup.location && "address" in meetup.location ? <span>📍 {String(meetup.location.address)}</span> : null}
                            <span className={`badge ${meetup.status === "SCHEDULED" ? "badge-info" : meetup.status === "COMPLETED" ? "badge-success" : "badge-danger"}`} style={{ fontSize: 11 }}>
                              {meetup.status === "SCHEDULED" ? "Đã hẹn" : meetup.status === "COMPLETED" ? "Đã gặp" : "Hủy"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {/* Actions */}
                  {deal.status === "OPEN" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {/* Meetup scheduling */}
                      {meetupDealId === deal.id ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, background: "var(--bg-inset)", borderRadius: "var(--radius)" }}>
                          <div className="field">
                            <label style={{ fontSize: 12 }}>Thời gian hẹn</label>
                            <input type="datetime-local" value={meetupDate} onChange={(e) => setMeetupDate(e.target.value)} style={{ fontSize: 13 }} />
                          </div>
                          <div className="field">
                            <label style={{ fontSize: 12 }}>Địa điểm (tùy chọn)</label>
                            <input placeholder="Ví dụ: Quán cafe ABC, Q1" value={meetupLocation} onChange={(e) => setMeetupLocation(e.target.value)} style={{ fontSize: 13 }} />
                          </div>
                          <div className="inline">
                            <button className="button primary sm" type="button" onClick={handleScheduleMeetup} disabled={actionLoading === "meetup"}>
                              Xác nhận hẹn
                            </button>
                            <button className="button ghost sm" type="button" onClick={() => setMeetupDealId(null)}>Hủy</button>
                          </div>
                        </div>
                      ) : null}

                      <div className="inline">
                        <button className="button secondary sm" type="button" onClick={() => setMeetupDealId(meetupDealId === deal.id ? null : deal.id)}>
                          📅 Hẹn gặp
                        </button>
                        <button className="button primary sm" type="button" disabled={actionLoading === `c-${deal.id}`}
                          onClick={() => handleAction(() => api.completeDeal(token, deal.id), "Giao dịch hoàn thành! 🎉", `c-${deal.id}`)}>
                          ✓ Hoàn thành
                        </button>
                        <button className="button danger sm" type="button" disabled={actionLoading === `x-${deal.id}`}
                          onClick={() => handleAction(() => api.cancelDeal(token, deal.id), "Đã hủy thỏa thuận.", `x-${deal.id}`)}>
                          Hủy
                        </button>
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
