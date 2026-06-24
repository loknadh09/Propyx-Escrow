import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import { get, post, put } from "../services/api";

const ESCROW_STEPS = [
  { key: "AWAITING_DEPOSIT", label: "Deposit Funds", icon: "💰" },
  { key: "AWAITING_BUYER_VERIFY", label: "Admin Verifies You", icon: "🔍" },
  { key: "AWAITING_REGISTRATION", label: "Seller Adds Docs", icon: "📄" },
  { key: "AWAITING_ADMIN_APPROVAL", label: "Admin Approves Deal", icon: "✅" },
  { key: "AWAITING_CONFIRMATION", label: "Final Confirmation", icon: "🤝" },
  { key: "COMPLETED", label: "Done!", icon: "🎉" },
];

const stepIndex = (status) => ESCROW_STEPS.findIndex(s => s.key === status);

export default function BuyerPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [myEscrows, setMyEscrows] = useState([]);
  const [activeTab, setActiveTab] = useState("browse");
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [requestMsg, setRequestMsg] = useState({});

  useEffect(() => {
    if (!user) return navigate("/login/buyer");
    if (user.role !== "buyer") return navigate(`/login/${user.role}`);
  }, [user, navigate]);

  const notify = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchAll = useCallback(async () => {
    if (!user?.token) return;
    setLoading(true);
    try {
      const [listData, escrowData] = await Promise.all([
        get("/api/listing", user.token).catch(() => ({ listings: [] })),
        get("/api/escrow", user.token).catch(() => ({ escrows: [] }))
      ]);
      setListings(listData?.listings || []);
      setMyEscrows(escrowData?.escrows || []);
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const requestPurchase = async (listingId) => {
    if (!user?.walletAddress) {
      return notify("⚠️ You must set a wallet address in your profile before requesting to buy.", "error");
    }
    try {
      await post(`/api/listing/request/${listingId}`, { message: requestMsg[listingId] || "I am interested in buying this property." }, user.token);
      notify("✅ Purchase request sent! Waiting for seller to accept.");
      setRequestMsg(prev => ({ ...prev, [listingId]: "" }));
      fetchAll();
    } catch (e) { notify(e.message, "error"); }
  };

  const depositFunds = async (escrowId) => {
    try {
      await post(`/api/escrow/deposit/${escrowId}`, {}, user.token);
      notify("💰 Funds deposited into escrow! Admin will now verify your identity.");
      fetchAll();
    } catch (e) { notify(e.message, "error"); }
  };

  const confirmReceipt = async (escrowId) => {
    try {
      await put(`/api/escrow/buyerConfirm/${escrowId}`, {}, user.token);
      notify("🤝 Confirmed! Transaction completing on blockchain.");
      fetchAll();
    } catch (e) { notify(e.message, "error"); }
  };

  const hasPendingRequest = (listing) => {
    return (listing.purchaseRequests || []).some(r => r.buyerId === user?._id || r.buyerEmail === user?.email);
  };

  return (
    <div className="section">
      {notification && (
        <div className={`notification notification-${notification.type}`}>{notification.msg}</div>
      )}

      <div className="section-header">
        <h2>🛒 Buyer Portal</h2>
        <p>Browse properties, request to buy, and track your escrow deals.</p>
      </div>

      {/* Wallet warning */}
      {!user?.walletAddress && (
        <div className="card" style={{ marginBottom: "2rem", borderColor: "rgba(245,158,11,0.4)", background: "rgba(245,158,11,0.05)" }}>
          <p style={{ color: "#fbbf24", fontWeight: 600 }}>⚠️ No Wallet Address Set</p>
          <p style={{ color: "var(--text-muted)", marginTop: "0.4rem", fontSize: "0.9rem" }}>
            You need an Ethereum wallet address to purchase properties. Go to your Profile page to set it.
          </p>
        </div>
      )}

      {/* Buyer profile summary */}
      <div className="card" style={{ marginBottom: "2rem", display: "flex", gap: "2rem", flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>Name</p>
          <p style={{ fontWeight: 600 }}>{user?.name || "—"}</p>
        </div>
        <div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>Email</p>
          <p style={{ fontWeight: 600 }}>{user?.email}</p>
        </div>
        <div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>Wallet</p>
          <p style={{ fontWeight: 600, color: user?.walletAddress ? "var(--primary)" : "#f59e0b", fontSize: "0.9rem" }}>
            {user?.walletAddress ? `${user.walletAddress.slice(0, 20)}...` : "Not set"}
          </p>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <span className="badge badge-approved">🛒 Buyer</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem", borderBottom: "1px solid var(--border-color)" }}>
        {[["browse", "🏘️ Browse Properties"], ["deals", "🔐 My Deals"]].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)} style={{ background: activeTab === key ? "var(--primary)" : "transparent", border: "none", color: activeTab === key ? "white" : "var(--text-muted)", padding: "0.75rem 1.5rem", borderRadius: "8px 8px 0 0", fontWeight: 600, cursor: "pointer" }}>
            {label} {key === "deals" && myEscrows.length > 0 ? `(${myEscrows.length})` : ""}
          </button>
        ))}
      </div>

      {/* Browse Tab */}
      {activeTab === "browse" && (
        <>
          {loading && listings.length === 0 ? (
            <div className="loader"><div className="spinner" /></div>
          ) : (
            <div className="grid">
              {listings.filter(l => l.status === "active").map(listing => (
                <div key={listing._id} className="item-card">
                  <div className="item-header">
                    <h3>{listing.propertyDescription}</h3>
                    <span className="badge badge-approved">🟢 Available</span>
                  </div>
                  <div className="item-body">
                    {listing.propertyAddress && <p>📍 {listing.propertyAddress}</p>}
                    <p>💰 <strong style={{ color: "white", fontSize: "1.1rem" }}>{listing.transactionAmount} ETH</strong></p>
                    <p>⏰ Deadline: {listing.deadlineDurationDays} days</p>
                    <p>👤 Seller: {listing.sellerId?.name || "Unknown"}</p>
                    {listing.sellerId?.status === "approved" && (
                      <p style={{ color: "#34d399" }}>✅ Verified Seller</p>
                    )}
                    <p>🏷️ {listing.propertyType || "Residential"}</p>
                  </div>

                  <div>
                    <input
                      placeholder="Message to seller (optional)..."
                      value={requestMsg[listing._id] || ""}
                      onChange={e => setRequestMsg(prev => ({ ...prev, [listing._id]: e.target.value }))}
                      style={{ marginBottom: "0.5rem ", fontSize: "0.87rem" }}
                    />
                  </div>

                  <div className="item-actions">
                    <button
                      className="btn btn-primary"
                      onClick={() => requestPurchase(listing._id)}
                      disabled={!user?.walletAddress}
                    >
                      {!user?.walletAddress ? "⚠️ Set Wallet First" : "📩 Request to Buy"}
                    </button>
                  </div>
                </div>
              ))}
              {listings.filter(l => l.status === "active").length === 0 && (
                <div className="empty-state" style={{ gridColumn: "1/-1" }}>
                  <p style={{ fontSize: "2rem" }}>🏘️</p>
                  <p>No properties available right now. Check back later!</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* My Deals Tab */}
      {activeTab === "deals" && (
        <div className="grid">
          {myEscrows.map(escrow => {
            const stepIdx = stepIndex(escrow.status);
            const currentStep = ESCROW_STEPS[stepIdx] || {};
            return (
              <div key={escrow._id} className="item-card">
                <div className="item-header">
                  <h3>{escrow.propertyDescription}</h3>
                  <span className={`badge badge-${escrow.status}`}>{currentStep.icon} {currentStep.label}</span>
                </div>
                <div className="item-body">
                  <p>💰 Amount: <strong>{escrow.transactionAmount} ETH</strong></p>
                  {escrow.propertyAddress && <p>📍 {escrow.propertyAddress}</p>}
                  <p>🔑 Contract: <code>{escrow.contractAddress?.slice(0, 16)}...</code></p>
                  <p>💳 Your Wallet: <code>{escrow.buyerAddress?.slice(0, 16)}...</code></p>
                </div>

                {/* Step Progress */}
                <div>
                  <div style={{ display: "flex", gap: "4px", marginBottom: "0.5rem" }}>
                    {ESCROW_STEPS.map((step, idx) => (
                      <div key={step.key} style={{ flex: 1, height: "4px", borderRadius: "2px", background: idx <= stepIdx ? "var(--primary)" : "rgba(255,255,255,0.1)" }} title={step.label} />
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    {ESCROW_STEPS.map((step, idx) => (
                      <span key={step.key} style={{ fontSize: "1rem", opacity: idx <= stepIdx ? 1 : 0.3 }} title={step.label}>{step.icon}</span>
                    ))}
                  </div>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.5rem", textAlign: "center" }}>
                    Current: <strong style={{ color: "white" }}>{currentStep.label}</strong>
                  </p>
                </div>

                {/* Stage-specific checks */}
                {escrow.status === "AWAITING_BUYER_VERIFY" && (
                  <div style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: "8px", padding: "0.75rem" }}>
                    <p style={{ color: "#60a5fa", fontWeight: 600 }}>🔍 Admin is verifying your identity</p>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Your funds are safely locked in escrow. Wait for admin verification.</p>
                  </div>
                )}

                {escrow.status === "AWAITING_REGISTRATION" && (
                  <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "8px", padding: "0.75rem" }}>
                    <p style={{ color: "#fbbf24", fontWeight: 600 }}>📄 Waiting for seller to add registration docs</p>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Seller must add property registration document before admin can approve.</p>
                  </div>
                )}

                {escrow.status === "AWAITING_ADMIN_APPROVAL" && (
                  <div style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: "8px", padding: "0.75rem" }}>
                    <p style={{ color: "#c084fc", fontWeight: 600 }}>⏳ Admin reviewing registration documents</p>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      {escrow.registrationDocAdded ? "Seller has submitted docs. Admin will approve soon." : "Waiting for seller to submit docs."}
                    </p>
                    {escrow.registrationDocHash && (
                      <p style={{ fontSize: "0.78rem", color: "var(--primary)", wordBreak: "break-all", marginTop: "0.4rem" }}>📄 Doc: {escrow.registrationDocHash}</p>
                    )}
                  </div>
                )}

                {/* DEPOSIT - Only when escrow starts */}
                {escrow.status === "AWAITING_DEPOSIT" && !escrow.isDeposited && (
                  <div style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: "8px", padding: "1rem" }}>
                    <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>💰 Deposit Required</p>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
                      Seller accepted your request! Deposit <strong>{escrow.transactionAmount} ETH</strong> into the escrow smart contract to proceed.
                    </p>
                    <button className="btn btn-primary" onClick={() => depositFunds(escrow._id)} style={{ width: "100%" }}>
                      💰 Deposit {escrow.transactionAmount} ETH into Escrow
                    </button>
                  </div>
                )}

                {/* FINAL CONFIRMATION */}
                {escrow.status === "AWAITING_CONFIRMATION" && !escrow.buyerConfirmed && (
                  <div className="item-actions">
                    <button className="btn btn-success" onClick={() => confirmReceipt(escrow._id)}>
                      🤝 Confirm Property Received
                    </button>
                  </div>
                )}

                {escrow.status === "AWAITING_CONFIRMATION" && escrow.buyerConfirmed && (
                  <div style={{ background: "rgba(16,185,129,0.1)", padding: "0.75rem", borderRadius: "8px" }}>
                    <p style={{ color: "#34d399" }}>✅ You confirmed. Waiting for seller to confirm...</p>
                  </div>
                )}

                {escrow.status === "COMPLETED" && (
                  <div style={{ background: "rgba(16,185,129,0.1)", padding: "1rem", borderRadius: "8px", textAlign: "center" }}>
                    <p style={{ fontSize: "1.5rem" }}>🎉</p>
                    <p style={{ color: "#34d399", fontWeight: 700 }}>Purchase Complete! Property is yours.</p>
                  </div>
                )}

                {escrow.status === "REFUNDED" && (
                  <div style={{ background: "rgba(139,92,246,0.1)", padding: "0.75rem", borderRadius: "8px" }}>
                    <p style={{ color: "#c084fc", fontWeight: 600 }}>💜 Funds Refunded by Admin</p>
                  </div>
                )}

                {/* Transaction Log */}
                {escrow.transactionLog && escrow.transactionLog.length > 0 && (
                  <details>
                    <summary style={{ cursor: "pointer", color: "var(--text-muted)", fontSize: "0.85rem" }}>📋 Transaction Log ({escrow.transactionLog.length} events)</summary>
                    <div style={{ marginTop: "0.5rem", maxHeight: "150px", overflowY: "auto" }}>
                      {escrow.transactionLog.map((log, i) => (
                        <div key={i} style={{ fontSize: "0.78rem", color: "var(--text-muted)", padding: "0.25rem 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                          <span style={{ color: "var(--primary)" }}>[{log.performedByRole?.toUpperCase()}]</span> {log.action}: {log.notes}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            );
          })}
          {myEscrows.length === 0 && (
            <div className="empty-state" style={{ gridColumn: "1/-1" }}>
              <p style={{ fontSize: "2rem" }}>🔐</p>
              <p>No active deals yet.</p>
              <p style={{ marginTop: "0.5rem" }}>Browse properties and request to buy one!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
