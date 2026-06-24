import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import { get, put, post } from "../services/api";

const STATUS_COLORS = {
  AWAITING_DEPOSIT: { color: "#60a5fa", bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.3)" },
  AWAITING_BUYER_VERIFY: { color: "#fbbf24", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.3)" },
  AWAITING_REGISTRATION: { color: "#f97316", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.3)" },
  AWAITING_ADMIN_APPROVAL: { color: "#c084fc", bg: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.3)" },
  AWAITING_CONFIRMATION: { color: "#34d399", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.3)" },
  COMPLETED: { color: "#34d399", bg: "rgba(16,185,129,0.15)", border: "rgba(16,185,129,0.4)" },
  REFUNDED: { color: "#c084fc", bg: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.3)" },
};

export default function AdminPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sellers, setSellers] = useState([]);
  const [escrows, setEscrows] = useState([]);
  const [activeTab, setActiveTab] = useState("sellers");
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // For recording transactions
  const [recordInputs, setRecordInputs] = useState({});
  const [verifyNotes, setVerifyNotes] = useState({});
  const [approveNotes, setApproveNotes] = useState({});
  const [expandedEscrow, setExpandedEscrow] = useState(null);

  useEffect(() => {
    if (!user) return navigate("/login/admin");
    if (user.role !== "admin") return navigate(`/login/${user.role}`);
  }, [user, navigate]);

  const notify = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchAll = useCallback(async () => {
    if (!user?.token) return;
    setLoading(true);
    try {
      const [sellersData, escrowsData] = await Promise.all([
        get("/api/seller", user.token).catch(() => ({ sellers: [] })),
        get("/api/escrow", user.token).catch(() => ({ escrows: [] }))
      ]);
      setSellers(sellersData?.sellers || []);
      setEscrows(escrowsData?.escrows || []);
    } catch (e) {
      console.error("Fetch failed:", e);
      notify("Failed to fetch data", "error");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const approveSeller = async (id) => {
    try {
      await put(`/api/seller/approve/${id}`, {}, user.token);
      notify("✅ Seller approved! They can now list properties.");
      fetchAll();
    } catch (e) { notify(e.message, "error"); }
  };

  const rejectSeller = async (id) => {
    try {
      await put(`/api/seller/reject/${id}`, {}, user.token);
      notify("Seller rejected.", "info");
      fetchAll();
    } catch (e) { notify(e.message, "error"); }
  };

  const verifyBuyer = async (escrowId) => {
    try {
      await put(`/api/escrow/verify-buyer/${escrowId}`, { notes: verifyNotes[escrowId] || "Buyer identity verified by admin" }, user.token);
      notify("🔍 Buyer verified! Seller must now add registration documents.");
      setVerifyNotes(prev => ({ ...prev, [escrowId]: "" }));
      fetchAll();
    } catch (e) { notify(e.message, "error"); }
  };

  const approveDeal = async (escrowId) => {
    try {
      await put(`/api/escrow/approve-deal/${escrowId}`, { notes: approveNotes[escrowId] || "Deal approved by admin after reviewing registration documents" }, user.token);
      notify("✅ Deal approved! Both parties can now confirm to close the transaction.");
      setApproveNotes(prev => ({ ...prev, [escrowId]: "" }));
      fetchAll();
    } catch (e) { notify(e.message, "error"); }
  };

  const forceRefund = async (id) => {
    if (!window.confirm("Are you sure you want to force-refund this escrow? This cannot be undone.")) return;
    try {
      await put(`/api/escrow/refund/${id}`, {}, user.token);
      notify("💜 Refund processed to buyer.");
      fetchAll();
    } catch (e) { notify(e.message, "error"); }
  };

  const recordTransaction = async (escrowId) => {
    const input = recordInputs[escrowId];
    if (!input?.action || !input?.notes) return notify("Provide action and notes", "error");
    try {
      await post(`/api/escrow/record/${escrowId}`, { action: input.action, notes: input.notes }, user.token);
      notify("📋 Transaction recorded.");
      setRecordInputs(prev => ({ ...prev, [escrowId]: {} }));
      fetchAll();
    } catch (e) { notify(e.message, "error"); }
  };

  const pendingCount = sellers.filter(s => s.status === "pending").length;
  const actionNeededEscrows = escrows.filter(e => ["AWAITING_BUYER_VERIFY", "AWAITING_ADMIN_APPROVAL"].includes(e.status));

  return (
    <div className="section">
      {notification && (
        <div className={`notification notification-${notification.type}`}>{notification.msg}</div>
      )}

      <div className="section-header">
        <h2>🛡️ Admin Dashboard</h2>
        <p>Verify sellers, oversee escrow deals, and record all transactions.</p>
      </div>

      {/* Stats Overview */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {[
          { label: "Total Sellers", value: sellers.length, icon: "👤", color: "var(--primary)" },
          { label: "Pending Approval", value: pendingCount, icon: "⏳", color: "#fbbf24" },
          { label: "Active Escrows", value: escrows.filter(e => !["COMPLETED", "REFUNDED"].includes(e.status)).length, icon: "🔐", color: "#34d399" },
          { label: "Action Required", value: actionNeededEscrows.length, icon: "🚨", color: "#ef4444" },
          { label: "Completed Deals", value: escrows.filter(e => e.status === "COMPLETED").length, icon: "✅", color: "var(--success)" },
        ].map(stat => (
          <div key={stat.label} className="card" style={{ textAlign: "center", padding: "1.25rem" }}>
            <div style={{ fontSize: "1.75rem" }}>{stat.icon}</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: stat.color, fontFamily: "Outfit, sans-serif" }}>{stat.value}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem", borderBottom: "1px solid var(--border-color)" }}>
        {[
          ["sellers", `👤 Sellers ${pendingCount > 0 ? `(${pendingCount} pending)` : ""}`],
          ["escrows", `🔐 Escrow Deals ${actionNeededEscrows.length > 0 ? `(${actionNeededEscrows.length} need action)` : ""}`],
          ["transactions", "📋 Transaction Log"],
        ].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)} style={{ background: activeTab === key ? "var(--primary)" : "transparent", border: "none", color: activeTab === key ? "white" : "var(--text-muted)", padding: "0.75rem 1.5rem", borderRadius: "8px 8px 0 0", fontWeight: 600, cursor: "pointer" }}>
            {label}
          </button>
        ))}
      </div>

      {/* SELLERS TAB */}
      {activeTab === "sellers" && (
        <>
          {loading && sellers.length === 0 ? <div className="loader"><div className="spinner" /></div> : (
            <div className="grid">
              {sellers.map(s => (
                <div key={s._id} className="item-card">
                  <div className="item-header">
                    <h3>{s.name}</h3>
                    <span className={`badge badge-${s.status}`}>{s.status === "approved" ? "✅" : s.status === "pending" ? "⏳" : "❌"} {s.status}</span>
                  </div>
                  <div className="item-body">
                    <p>📧 {s.email}</p>
                    {s.userId && <p>👤 User: {s.userId?.name || s.userId?.email || s.userId}</p>}
                    <p>🔑 Wallet: {s.walletAddress ? `${s.walletAddress.slice(0, 16)}...` : <span style={{ color: "#f59e0b" }}>Not set</span>}</p>
                    <p>📅 Registered: {new Date(s.createdAt).toLocaleDateString()}</p>
                  </div>
                  {s.status === "pending" && (
                    <div className="item-actions">
                      <button className="btn btn-success" onClick={() => approveSeller(s._id)}>✅ Approve</button>
                      <button className="btn btn-danger" onClick={() => rejectSeller(s._id)}>❌ Reject</button>
                    </div>
                  )}
                  {s.status === "approved" && (
                    <div style={{ padding: "0.5rem", background: "rgba(16,185,129,0.08)", borderRadius: "8px", fontSize: "0.85rem", color: "#34d399" }}>
                      ✅ Verified seller — can create property listings
                    </div>
                  )}
                </div>
              ))}
              {sellers.length === 0 && (
                <div className="empty-state" style={{ gridColumn: "1/-1" }}>
                  <p style={{ fontSize: "2rem" }}>👤</p>
                  <p>No sellers registered yet.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ESCROWS TAB */}
      {activeTab === "escrows" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {escrows.map(escrow => {
            const sc = STATUS_COLORS[escrow.status] || STATUS_COLORS.AWAITING_DEPOSIT;
            const isExpanded = expandedEscrow === escrow._id;
            return (
              <div key={escrow._id} className="card" style={{ borderColor: sc.border, background: "var(--bg-card)" }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", cursor: "pointer" }} onClick={() => setExpandedEscrow(isExpanded ? null : escrow._id)}>
                  <div>
                    <h3 style={{ marginBottom: "0.25rem" }}>{escrow.propertyDescription}</h3>
                    {escrow.propertyAddress && <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>📍 {escrow.propertyAddress}</p>}
                  </div>
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                    <span style={{ color: sc.color, background: sc.bg, border: `1px solid ${sc.border}`, padding: "0.25rem 0.75rem", borderRadius: "999px", fontSize: "0.8rem", fontWeight: 600 }}>
                      {escrow.status.replace(/_/g, " ")}
                    </span>
                    <span style={{ color: "var(--text-muted)" }}>{isExpanded ? "▲" : "▼"}</span>
                  </div>
                </div>

                {/* Quick summary always visible */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.75rem", marginTop: "1rem" }}>
                  <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: "8px", padding: "0.75rem" }}>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Amount</p>
                    <p style={{ fontWeight: 700, color: "white" }}>{escrow.transactionAmount} ETH</p>
                  </div>
                  <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: "8px", padding: "0.75rem" }}>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Seller</p>
                    <p style={{ fontWeight: 600, color: "white", fontSize: "0.9rem" }}>{escrow.sellerId?.name || "—"}</p>
                  </div>
                  <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: "8px", padding: "0.75rem" }}>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Buyer</p>
                    <p style={{ fontWeight: 600, color: "white", fontSize: "0.9rem" }}>{escrow.buyerId?.name || escrow.buyerAddress?.slice(0, 10) || "—"}...</p>
                  </div>
                  <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: "8px", padding: "0.75rem" }}>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Deposited</p>
                    <p style={{ fontWeight: 700, color: escrow.isDeposited ? "#34d399" : "#fbbf24" }}>{escrow.isDeposited ? "✅ Yes" : "❌ No"}</p>
                  </div>
                </div>

                {/* Expanded details + actions */}
                {isExpanded && (
                  <div style={{ marginTop: "1.5rem", borderTop: "1px solid var(--border-color)", paddingTop: "1.5rem" }}>
                    {/* Detailed info */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                      <div>
                        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Buyer Email</p>
                        <p>{escrow.buyerId?.email || "—"}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Contract Address</p>
                        <code style={{ fontSize: "0.8rem", color: "var(--primary)", wordBreak: "break-all" }}>{escrow.contractAddress}</code>
                      </div>
                      <div>
                        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Buyer Verified</p>
                        <p style={{ color: escrow.buyerVerified ? "#34d399" : "#fbbf24" }}>{escrow.buyerVerified ? "✅ Yes" : "❌ No"}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Registration Docs</p>
                        <p style={{ color: escrow.registrationDocAdded ? "#34d399" : "#fbbf24" }}>{escrow.registrationDocAdded ? "✅ Added" : "❌ Not Added"}</p>
                        {escrow.registrationDocHash && <p style={{ fontSize: "0.78rem", color: "var(--primary)", wordBreak: "break-all" }}>{escrow.registrationDocHash}</p>}
                      </div>
                      <div>
                        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Admin Approved</p>
                        <p style={{ color: escrow.adminApproved ? "#34d399" : "#fbbf24" }}>{escrow.adminApproved ? `✅ Yes – by ${escrow.adminApprovedBy}` : "❌ No"}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Completion</p>
                        <p>Buyer: {escrow.buyerConfirmed ? "✅" : "❌"} | Seller: {escrow.sellerConfirmed ? "✅" : "❌"}</p>
                      </div>
                    </div>

                    {/* Admin Actions */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

                      {/* VERIFY BUYER */}
                      {escrow.status === "AWAITING_BUYER_VERIFY" && (
                        <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "12px", padding: "1.25rem" }}>
                          <h4 style={{ color: "#fbbf24", marginBottom: "0.75rem" }}>🔍 Step 1: Verify Buyer Identity</h4>
                          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1rem" }}>
                            Buyer has deposited funds. Verify their identity before proceeding.
                            <br />Buyer: <strong>{escrow.buyerId?.name}</strong> — {escrow.buyerId?.email}
                            <br />Wallet: <code style={{ color: "var(--primary)" }}>{escrow.buyerAddress}</code>
                          </p>
                          <input
                            placeholder="Verification notes (e.g. ID document verified, KYC complete)..."
                            value={verifyNotes[escrow._id] || ""}
                            onChange={e => setVerifyNotes(prev => ({ ...prev, [escrow._id]: e.target.value }))}
                            style={{ marginBottom: "0.75rem" }}
                          />
                          <button className="btn btn-success" onClick={() => verifyBuyer(escrow._id)} style={{ width: "100%" }}>
                            🔍 Verify Buyer & Proceed
                          </button>
                        </div>
                      )}

                      {/* APPROVE DEAL */}
                      {escrow.status === "AWAITING_ADMIN_APPROVAL" && (
                        <div style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: "12px", padding: "1.25rem" }}>
                          <h4 style={{ color: "#c084fc", marginBottom: "0.75rem" }}>✅ Step 2: Approve Final Deal</h4>
                          {escrow.registrationDocAdded ? (
                            <>
                              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                                Seller has submitted registration documents. Review and approve to allow fund release.
                              </p>
                              <p style={{ color: "var(--primary)", fontSize: "0.85rem", marginBottom: "1rem" }}>
                                📄 Document: {escrow.registrationDocHash}
                              </p>
                              <input
                                placeholder="Approval notes (e.g. Documents verified, deal is legitimate)..."
                                value={approveNotes[escrow._id] || ""}
                                onChange={e => setApproveNotes(prev => ({ ...prev, [escrow._id]: e.target.value }))}
                                style={{ marginBottom: "0.75rem" }}
                              />
                              <button className="btn btn-primary" onClick={() => approveDeal(escrow._id)} style={{ width: "100%" }}>
                                ✅ Approve Deal – Allow Final Confirmation
                              </button>
                            </>
                          ) : (
                            <p style={{ color: "#fbbf24" }}>⏳ Waiting for seller to add registration document...</p>
                          )}
                        </div>
                      )}

                      {/* RECORD TRANSACTION */}
                      <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: "12px", padding: "1.25rem" }}>
                        <h4 style={{ marginBottom: "0.75rem" }}>📋 Record Transaction Event</h4>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.5rem" }}>
                          <input
                            placeholder="Action (e.g. Document Check)"
                            value={recordInputs[escrow._id]?.action || ""}
                            onChange={e => setRecordInputs(prev => ({ ...prev, [escrow._id]: { ...prev[escrow._id], action: e.target.value } }))}
                          />
                          <input
                            placeholder="Notes / remarks..."
                            value={recordInputs[escrow._id]?.notes || ""}
                            onChange={e => setRecordInputs(prev => ({ ...prev, [escrow._id]: { ...prev[escrow._id], notes: e.target.value } }))}
                          />
                        </div>
                        <button className="btn btn-primary" onClick={() => recordTransaction(escrow._id)} style={{ marginTop: "0.5rem" }}>
                          📋 Record
                        </button>
                      </div>

                      {/* FORCE REFUND */}
                      {!["COMPLETED", "REFUNDED"].includes(escrow.status) && escrow.isDeposited && (
                        <button className="btn btn-danger" onClick={() => forceRefund(escrow._id)}>
                          💔 Force Refund Buyer
                        </button>
                      )}
                    </div>

                    {/* Transaction Log */}
                    {escrow.transactionLog && escrow.transactionLog.length > 0 && (
                      <div style={{ marginTop: "1.5rem" }}>
                        <h4 style={{ marginBottom: "0.75rem" }}>📋 Full Transaction Log</h4>
                        <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: "8px", padding: "1rem", maxHeight: "250px", overflowY: "auto" }}>
                          {escrow.transactionLog.map((log, i) => (
                            <div key={i} style={{ padding: "0.5rem 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: "0.85rem" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                                <div>
                                  <span style={{ background: "rgba(59,130,246,0.2)", color: "var(--primary)", padding: "0.15rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem", marginRight: "0.5rem" }}>{log.performedByRole?.toUpperCase()}</span>
                                  <strong style={{ color: "white" }}>{log.action}</strong>
                                </div>
                                <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", whiteSpace: "nowrap" }}>{new Date(log.timestamp).toLocaleString()}</span>
                              </div>
                              <p style={{ color: "var(--text-muted)", marginTop: "0.25rem", paddingLeft: "0.25rem" }}>{log.notes}</p>
                              <p style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>By: {log.performedBy}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {escrows.length === 0 && (
            <div className="empty-state">
              <p style={{ fontSize: "2rem" }}>🔐</p>
              <p>No escrow contracts created yet.</p>
            </div>
          )}
        </div>
      )}

      {/* TRANSACTIONS TAB */}
      {activeTab === "transactions" && (
        <div>
          <h3 style={{ marginBottom: "1.5rem" }}>📋 All Recorded Transactions</h3>
          {escrows.filter(e => e.transactionLog && e.transactionLog.length > 0).length === 0 ? (
            <div className="empty-state">
              <p style={{ fontSize: "2rem" }}>📋</p>
              <p>No transactions recorded yet.</p>
            </div>
          ) : (
            escrows.map(escrow => (
              escrow.transactionLog && escrow.transactionLog.length > 0 ? (
                <div key={escrow._id} className="card" style={{ marginBottom: "1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <div>
                      <h3 style={{ fontSize: "1rem" }}>{escrow.propertyDescription}</h3>
                      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Seller: {escrow.sellerId?.name} | Buyer: {escrow.buyerId?.name || escrow.buyerAddress?.slice(0, 12)}</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontWeight: 700, color: "white" }}>{escrow.transactionAmount} ETH</p>
                      <span className={`badge badge-${escrow.status}`}>{escrow.status}</span>
                    </div>
                  </div>
                  <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: "8px", padding: "1rem" }}>
                    {escrow.transactionLog.map((log, i) => (
                      <div key={i} style={{ padding: "0.5rem 0", borderBottom: i < escrow.transactionLog.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "rgba(59,130,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "0.7rem", color: "var(--primary)", fontWeight: 700 }}>
                          {i + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 600, color: "white" }}>{log.action}</span>
                            <span style={{ background: "rgba(59,130,246,0.1)", color: "var(--primary)", padding: "0.1rem 0.4rem", borderRadius: "4px", fontSize: "0.75rem" }}>{log.performedByRole}</span>
                          </div>
                          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.2rem" }}>{log.notes}</p>
                          <p style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{log.performedBy} • {new Date(log.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null
            ))
          )}
        </div>
      )}
    </div>
  );
}
