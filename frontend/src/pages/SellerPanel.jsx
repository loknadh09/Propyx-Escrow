import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import { get, post, put } from "../services/api";

const ESCROW_STEPS = [
  { key: "AWAITING_DEPOSIT", label: "Awaiting Deposit", icon: "💰", desc: "Buyer must deposit funds" },
  { key: "AWAITING_BUYER_VERIFY", label: "Admin Verifying Buyer", icon: "🔍", desc: "Admin verifying buyer identity" },
  { key: "AWAITING_REGISTRATION", label: "Add Registration Docs", icon: "📄", desc: "Seller adds property registration" },
  { key: "AWAITING_ADMIN_APPROVAL", label: "Admin Approval", icon: "✅", desc: "Admin approves the deal" },
  { key: "AWAITING_CONFIRMATION", label: "Final Confirmation", icon: "🤝", desc: "Both parties confirm" },
  { key: "COMPLETED", label: "Completed", icon: "🎉", desc: "Deal done!" },
];

const stepIndex = (status) => ESCROW_STEPS.findIndex(s => s.key === status);

export default function SellerPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sellerProfile, setSellerProfile] = useState(null);
  const [myListings, setMyListings] = useState([]);
  const [myEscrows, setMyEscrows] = useState([]);
  const [activeTab, setActiveTab] = useState("listings");
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(false);

  // Form state
  const [form, setForm] = useState({ propertyDescription: "", propertyAddress: "", propertyType: "residential", transactionAmount: "", deadlineDurationDays: "30" });
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Registration doc state
  const [docInputs, setDocInputs] = useState({});

  useEffect(() => {
    if (!user) return navigate("/login/seller");
    if (user.role !== "seller") return navigate(`/login/${user.role}`);
  }, [user, navigate]);

  const notify = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchAll = useCallback(async () => {
    if (!user?.token) return;
    setLoading(true);
    try {
      const [profileData, listingsData, escrowsData] = await Promise.all([
        get("/api/seller/my-profile", user.token).catch(() => null),
        get("/api/listing/my-listings", user.token).catch(() => ({ listings: [] })),
        get("/api/escrow", user.token).catch(() => ({ escrows: [] }))
      ]);
      setSellerProfile(profileData?.seller || null);
      setMyListings(listingsData?.listings || []);
      setMyEscrows(escrowsData?.escrows || []);
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const registerProfile = async () => {
    try {
      const res = await post("/api/seller/register", {
        name: user.name,
        email: user.email,
        walletAddress: user.walletAddress || ""
      }, user.token);
      notify("Seller profile submitted for admin approval!");
      fetchAll();
    } catch (e) { notify(e.message, "error"); }
  };

  const createListing = async () => {
    if (!form.propertyDescription || !form.transactionAmount || !form.deadlineDurationDays) {
      return notify("Please fill in all required fields", "error");
    }
    try {
      await post("/api/listing/create", form, user.token);
      notify("Property listed publicly! Buyers can now browse and request to buy.");
      setShowCreateForm(false);
      setForm({ propertyDescription: "", propertyAddress: "", propertyType: "residential", transactionAmount: "", deadlineDurationDays: "30" });
      fetchAll();
    } catch (e) { notify(e.message, "error"); }
  };

  const acceptRequest = async (listingId, requestId) => {
    try {
      await put(`/api/listing/accept/${listingId}/${requestId}`, {}, user.token);
      notify("✅ Buyer request accepted! Escrow contract has been deployed. Buyer must now deposit funds.");
      fetchAll();
    } catch (e) { notify(e.message, "error"); }
  };

  const rejectRequest = async (listingId, requestId) => {
    try {
      await put(`/api/listing/reject/${listingId}/${requestId}`, {}, user.token);
      notify("Request rejected.", "info");
      fetchAll();
    } catch (e) { notify(e.message, "error"); }
  };

  const addRegistrationDoc = async (escrowId) => {
    const docHash = docInputs[escrowId];
    if (!docHash) return notify("Provide a document link or hash", "error");
    try {
      await put(`/api/listing/registration-doc/${escrowId}`, { documentHash: docHash, documentNotes: "Property registration document added by seller" }, user.token);
      notify("📄 Registration document added! Admin will now approve the deal.");
      setDocInputs(prev => ({ ...prev, [escrowId]: "" }));
      fetchAll();
    } catch (e) { notify(e.message, "error"); }
  };

  const confirmFulfillment = async (escrowId) => {
    try {
      await put(`/api/escrow/sellerConfirm/${escrowId}`, {}, user.token);
      notify("🤝 Seller confirmation done! Waiting for buyer to confirm.");
      fetchAll();
    } catch (e) { notify(e.message, "error"); }
  };

  const isApproved = sellerProfile?.status === "approved";

  return (
    <div className="section">
      {notification && (
        <div className={`notification notification-${notification.type}`}>{notification.msg}</div>
      )}

      <div className="section-header">
        <h2>🏠 Seller Portal</h2>
        <p>List your property, manage buyer requests, and track escrow deals.</p>
      </div>

      {/* Profile Status Banner */}
      {!sellerProfile ? (
        <div className="card" style={{ marginBottom: "2rem", borderColor: "rgba(245,158,11,0.4)", background: "rgba(245,158,11,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", justifyContent: "space-between", flexWrap: "wrap" }}>
            <div>
              <h3 style={{ color: "#fbbf24" }}>⚠️ No Seller Profile</h3>
              <p style={{ color: "var(--text-muted)", marginTop: "0.4rem" }}>Register as a seller to list properties. Admin must approve your account.</p>
            </div>
            <button className="btn btn-primary" onClick={registerProfile}>Register as Seller</button>
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: "2rem", borderColor: sellerProfile.status === "approved" ? "rgba(16,185,129,0.4)" : "rgba(245,158,11,0.4)", background: sellerProfile.status === "approved" ? "rgba(16,185,129,0.04)" : "rgba(245,158,11,0.04)" }}>
          <div style={{ display: "flex", justify: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
            <div>
              <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                <h3>{sellerProfile.name}</h3>
                <span className={`badge badge-${sellerProfile.status}`}>{sellerProfile.status === "approved" ? "✅ Verified Seller" : sellerProfile.status === "pending" ? "⏳ Pending Approval" : "❌ Rejected"}</span>
              </div>
              <p style={{ color: "var(--text-muted)", marginTop: "0.4rem" }}>{sellerProfile.email}</p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Wallet: {sellerProfile.walletAddress || <span style={{ color: "#f59e0b" }}>Not set – update in profile</span>}</p>
            </div>
            {isApproved && (
              <button className="btn btn-primary" onClick={() => setShowCreateForm(v => !v)}>
                {showCreateForm ? "✖ Cancel" : "＋ List New Property"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Create Listing Form */}
      {showCreateForm && isApproved && (
        <div className="card" style={{ marginBottom: "2rem", borderColor: "rgba(59,130,246,0.4)" }}>
          <h3 style={{ marginBottom: "1.5rem" }}>📋 New Property Listing</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group" style={{ gridColumn: "1/-1" }}>
              <label>Property Description *</label>
              <input placeholder="e.g. 3BHK Apartment in Hyderabad, Kondapur..." value={form.propertyDescription} onChange={e => setForm(f => ({ ...f, propertyDescription: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Property Address</label>
              <input placeholder="Street, City, State" value={form.propertyAddress} onChange={e => setForm(f => ({ ...f, propertyAddress: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Property Type</label>
              <select value={form.propertyType} onChange={e => setForm(f => ({ ...f, propertyType: e.target.value }))} style={{ background: "rgba(15,23,42,0.6)", border: "1px solid var(--border-color)", color: "white", borderRadius: "8px", padding: "0.75rem 1rem", width: "100%" }}>
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="land">Land</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>Price (ETH) *</label>
              <input type="number" placeholder="e.g. 2.5" value={form.transactionAmount} onChange={e => setForm(f => ({ ...f, transactionAmount: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Deadline (Days) *</label>
              <input type="number" placeholder="e.g. 30" value={form.deadlineDurationDays} onChange={e => setForm(f => ({ ...f, deadlineDurationDays: e.target.value }))} />
            </div>
          </div>
          <button className="btn btn-primary" onClick={createListing} style={{ width: "100%", padding: "1rem" }}>🚀 Publish Property Listing</button>
        </div>
      )}

      {/* Tabs */}
      {sellerProfile && (
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0" }}>
          {[["listings", "🏠 My Listings"], ["escrows", "🔐 Active Deals"]].map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{ background: activeTab === key ? "var(--primary)" : "transparent", border: "none", color: activeTab === key ? "white" : "var(--text-muted)", padding: "0.75rem 1.5rem", borderRadius: "8px 8px 0 0", fontWeight: 600, cursor: "pointer" }}>{label}</button>
          ))}
        </div>
      )}

      {/* My Listings Tab */}
      {activeTab === "listings" && (
        <>
          {loading && myListings.length === 0 ? (
            <div className="loader"><div className="spinner" /></div>
          ) : (
            <div className="grid">
              {myListings.map(listing => (
                <div key={listing._id} className="item-card">
                  <div className="item-header">
                    <h3>{listing.propertyDescription}</h3>
                    <span className={`badge badge-${listing.status === "active" ? "approved" : listing.status === "pending_deal" ? "pending" : "rejected"}`}>
                      {listing.status === "active" ? "🟢 Active" : listing.status === "pending_deal" ? "⏳ Deal In Progress" : "🔒 Closed"}
                    </span>
                  </div>
                  <div className="item-body">
                    {listing.propertyAddress && <p>📍 <strong>{listing.propertyAddress}</strong></p>}
                    <p>💰 <strong>{listing.transactionAmount} ETH</strong></p>
                    <p>⏰ Deadline: {listing.deadlineDurationDays} days</p>
                    <p>🏷️ {listing.propertyType}</p>
                  </div>

                  {/* Purchase Requests */}
                  {listing.purchaseRequests && listing.purchaseRequests.length > 0 && (
                    <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
                      <p style={{ color: "var(--text-muted)", fontWeight: 600, marginBottom: "0.75rem" }}>
                        📨 Purchase Requests ({listing.purchaseRequests.filter(r => r.status === "pending").length} pending)
                      </p>
                      {listing.purchaseRequests.map(req => (
                        <div key={req._id} style={{ background: "rgba(0,0,0,0.2)", borderRadius: "8px", padding: "0.75rem", marginBottom: "0.5rem", border: `1px solid ${req.status === "pending" ? "rgba(59,130,246,0.3)" : req.status === "accepted" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.2)"}` }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <p style={{ fontWeight: 600, color: "white" }}>{req.buyerName}</p>
                              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{req.buyerEmail}</p>
                              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>"{req.message}"</p>
                              {req.buyerWallet && <p style={{ fontSize: "0.75rem", color: "var(--primary)" }}>🔑 {req.buyerWallet.slice(0, 16)}...</p>}
                            </div>
                            <span className={`badge badge-${req.status}`}>{req.status}</span>
                          </div>
                          {req.status === "pending" && listing.status === "active" && (
                            <div className="item-actions" style={{ marginTop: "0.5rem" }}>
                              <button className="btn btn-success" onClick={() => acceptRequest(listing._id, req._id)} style={{ fontSize: "0.85rem", padding: "0.5rem 1rem" }}>✅ Accept & Create Escrow</button>
                              <button className="btn btn-danger" onClick={() => rejectRequest(listing._id, req._id)} style={{ fontSize: "0.85rem", padding: "0.5rem 1rem" }}>❌ Reject</button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {(!listing.purchaseRequests || listing.purchaseRequests.length === 0) && (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontStyle: "italic" }}>No buyer requests yet.</p>
                  )}
                </div>
              ))}
              {myListings.length === 0 && (
                <div className="empty-state" style={{ gridColumn: "1/-1" }}>
                  <p style={{ fontSize: "2rem" }}>🏠</p>
                  <p>No properties listed yet.</p>
                  {isApproved ? <p style={{ marginTop: "0.5rem" }}>Click "List New Property" to get started!</p> : <p style={{ marginTop: "0.5rem" }}>Awaiting admin approval to create listings.</p>}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Active Deals (Escrows) Tab */}
      {activeTab === "escrows" && (
        <div className="grid">
          {myEscrows.map(escrow => {
            const stepIdx = stepIndex(escrow.status);
            const currentStep = ESCROW_STEPS[stepIdx] || {};
            return (
              <div key={escrow._id} className="item-card" style={{ gridColumn: myEscrows.length === 1 ? "1/-1" : "auto" }}>
                <div className="item-header">
                  <h3>{escrow.propertyDescription}</h3>
                  <span className={`badge badge-${escrow.status}`}>{currentStep.icon} {currentStep.label}</span>
                </div>
                <div className="item-body">
                  <p>💰 Amount: <strong>{escrow.transactionAmount} ETH</strong></p>
                  <p>👤 Buyer: <strong>{escrow.buyerId?.name || "Unknown"}</strong> ({escrow.buyerId?.email})</p>
                  <p>🔑 Buyer Wallet: <code>{escrow.buyerAddress?.slice(0, 16)}...</code></p>
                  <p>📍 Contract: <code>{escrow.contractAddress?.slice(0, 16)}...</code></p>
                </div>

                {/* Progress Steps */}
                <div style={{ display: "flex", gap: "4px", padding: "0.5rem 0" }}>
                  {ESCROW_STEPS.slice(0, 6).map((step, idx) => (
                    <div key={step.key} style={{ flex: 1, height: "4px", borderRadius: "2px", background: idx <= stepIdx ? "var(--primary)" : "rgba(255,255,255,0.1)", transition: "background 0.3s" }} title={step.label} />
                  ))}
                </div>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "center" }}>{currentStep.desc}</p>

                {/* Action: Add Registration Docs when buyer verified */}
                {escrow.status === "AWAITING_REGISTRATION" && !escrow.registrationDocAdded && (
                  <div style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: "8px", padding: "1rem" }}>
                    <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>📄 Add Property Registration Document</p>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>Buyer has been verified. Now add the property registration document hash or IPFS link to proceed.</p>
                    <input
                      placeholder="Document hash or IPFS/URL link..."
                      value={docInputs[escrow._id] || ""}
                      onChange={e => setDocInputs(prev => ({ ...prev, [escrow._id]: e.target.value }))}
                      style={{ marginBottom: "0.5rem" }}
                    />
                    <button className="btn btn-primary" onClick={() => addRegistrationDoc(escrow._id)} style={{ width: "100%" }}>
                      📤 Submit Registration Document
                    </button>
                  </div>
                )}

                {/* Seller Confirmation */}
                {escrow.status === "AWAITING_CONFIRMATION" && !escrow.sellerConfirmed && (
                  <div className="item-actions">
                    <button className="btn btn-success" onClick={() => confirmFulfillment(escrow._id)}>
                      🤝 Confirm Property Handover
                    </button>
                  </div>
                )}

                {escrow.status === "AWAITING_CONFIRMATION" && escrow.sellerConfirmed && (
                  <div style={{ background: "rgba(16,185,129,0.1)", padding: "0.75rem", borderRadius: "8px" }}>
                    <p style={{ color: "#34d399" }}>✅ You confirmed. Waiting for buyer to confirm...</p>
                  </div>
                )}

                {escrow.status === "COMPLETED" && (
                  <div style={{ background: "rgba(16,185,129,0.1)", padding: "0.75rem", borderRadius: "8px" }}>
                    <p style={{ color: "#34d399", fontWeight: 700 }}>🎉 DEAL COMPLETE! Funds released to you.</p>
                  </div>
                )}

                {/* Transaction Log */}
                {escrow.transactionLog && escrow.transactionLog.length > 0 && (
                  <details style={{ marginTop: "0.5rem" }}>
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
              <p>No active escrow deals yet.</p>
              <p style={{ marginTop: "0.5rem" }}>Accept a buyer's request to create an escrow.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
