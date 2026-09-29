"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { 
  ShoppingBag, 
  Eye, 
  Clock, 
  Mail, 
  Truck, 
  ChevronRight, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  ExternalLink,
  Loader2,
  RefreshCw
} from "lucide-react";

function AdminOrdersContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentTab = searchParams.get("tab") || "all";

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [submittingSinalite, setSubmittingSinalite] = useState(false);
  const [approvingProof, setApprovingProof] = useState(false);

  const handleManualSubmitSinalite = async (orderId) => {
    if (!orderId) return;
    setSubmittingSinalite(true);
    try {
      const res = await fetch("/api/admin/orders/submit-sinalite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message || `Order successfully transmitted to SinaLite! Ref ID: #${data.sinaliteOrderId}`);
        setSelectedOrder(prev => prev ? ({ ...prev, sinaliteOrderId: data.sinaliteOrderId, status: "submitted" }) : null);
        fetchOrders();
      } else {
        alert(`Failed to submit to SinaLite: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      alert(`Error submitting to SinaLite: ${err.message}`);
    } finally {
      setSubmittingSinalite(false);
    }
  };

  const handleApproveProof = async (orderId) => {
    if (!orderId) return;
    setApprovingProof(true);
    try {
      const res = await fetch("/api/admin/orders/approve-proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("Digital proof approved successfully! SinaLite has been notified to proceed with printing.");
        setSelectedOrder(prev => prev ? ({ ...prev, sinaliteProofStatus: "approved" }) : null);
        fetchOrders();
      } else {
        alert(`Failed to approve proof: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      alert(`Error approving proof: ${err.message}`);
    } finally {
      setApprovingProof(false);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const list = [];

      // 1. Fetch completed/submitted orders
      try {
        const snap = await getDocs(collection(db, "orders"));
        snap.forEach(doc => {
          list.push({ id: doc.id, ...doc.data(), isPendingCollection: false });
        });
      } catch (e1) {
        console.error("Error fetching orders collection:", e1);
      }

      // 2. Fetch pending orders
      try {
        const pendingSnap = await getDocs(collection(db, "pendingOrders"));
        pendingSnap.forEach(doc => {
          if (!list.some(o => o.id === doc.id)) {
            list.push({ id: doc.id, ...doc.data(), isPendingCollection: true });
          }
        });
      } catch (e2) {
        console.error("Error fetching pendingOrders collection:", e2);
      }

      // 3. Sort chronologically (newest first)
      list.sort((a, b) => {
        const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      setOrders(list);
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, { status: newStatus });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleTabChange = (tabKey) => {
    const url = tabKey === "all" ? "/admin/orders" : `/admin/orders?tab=${tabKey}`;
    router.push(url);
  };

  // Filter orders by active tab
  const proofOrders = orders.filter(o => 
    o.sinaliteReviewURL || 
    (o.items && o.items.some(i => i.artworkFiles && i.artworkFiles.length > 0)) ||
    o.sinaliteProofStatus
  );

  const unsubmittedOrders = orders.filter(o => 
    !o.sinaliteOrderId && o.status !== "completed" && o.status !== "shipped"
  );

  const completedOrders = orders.filter(o => 
    o.status === "completed" || o.status === "shipped" || o.sinaliteTrackingNumber
  );

  let displayedOrders = orders;
  if (currentTab === "proofs") {
    displayedOrders = proofOrders;
  } else if (currentTab === "unsubmitted") {
    displayedOrders = unsubmittedOrders;
  } else if (currentTab === "shipped") {
    displayedOrders = completedOrders;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "2rem", marginBottom: "0.25rem", color: "hsl(var(--primary-hsl))", fontWeight: 900 }}>
          {currentTab === "proofs" ? "Print Proof Review Queue" : "Order Manager"}
        </h1>
        <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.95rem" }}>
          {currentTab === "proofs"
            ? "Inspect customer uploaded artwork files, digital SinaLite proof links, and grant print approvals."
            : "Inspect customer orders, live SinaLite transmission statuses, proofs, and shipping trackings."}
        </p>
      </div>

      {/* Tabs Bar */}
      <div style={{
        display: "flex",
        gap: "0.5rem",
        borderBottom: "2px solid hsl(var(--border-hsl))",
        marginBottom: "1.75rem",
        overflowX: "auto",
        paddingBottom: "2px"
      }}>
        <button
          onClick={() => handleTabChange("all")}
          style={{
            padding: "0.65rem 1.25rem",
            fontSize: "0.85rem",
            fontWeight: currentTab === "all" ? 800 : 600,
            border: "none",
            background: "none",
            cursor: "pointer",
            borderBottom: currentTab === "all" ? "3px solid hsl(var(--accent-hsl))" : "3px solid transparent",
            color: currentTab === "all" ? "hsl(var(--accent-hsl))" : "hsl(var(--muted-hsl))",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            transition: "all 0.2s ease"
          }}
        >
          <ShoppingBag size={16} /> All Orders ({orders.length})
        </button>

        <button
          onClick={() => handleTabChange("proofs")}
          style={{
            padding: "0.65rem 1.25rem",
            fontSize: "0.85rem",
            fontWeight: currentTab === "proofs" ? 800 : 600,
            border: "none",
            background: "none",
            cursor: "pointer",
            borderBottom: currentTab === "proofs" ? "3px solid hsl(var(--accent-hsl))" : "3px solid transparent",
            color: currentTab === "proofs" ? "hsl(var(--accent-hsl))" : "hsl(var(--muted-hsl))",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            transition: "all 0.2s ease"
          }}
        >
          <Printer size={16} /> Print Proof Review ({proofOrders.length})
        </button>

        <button
          onClick={() => handleTabChange("unsubmitted")}
          style={{
            padding: "0.65rem 1.25rem",
            fontSize: "0.85rem",
            fontWeight: currentTab === "unsubmitted" ? 800 : 600,
            border: "none",
            background: "none",
            cursor: "pointer",
            borderBottom: currentTab === "unsubmitted" ? "3px solid hsl(var(--accent-hsl))" : "3px solid transparent",
            color: currentTab === "unsubmitted" ? "hsl(var(--accent-hsl))" : "hsl(var(--muted-hsl))",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            transition: "all 0.2s ease"
          }}
        >
          <Clock size={16} /> Awaiting Submission ({unsubmittedOrders.length})
        </button>

        <button
          onClick={() => handleTabChange("shipped")}
          style={{
            padding: "0.65rem 1.25rem",
            fontSize: "0.85rem",
            fontWeight: currentTab === "shipped" ? 800 : 600,
            border: "none",
            background: "none",
            cursor: "pointer",
            borderBottom: currentTab === "shipped" ? "3px solid hsl(var(--accent-hsl))" : "3px solid transparent",
            color: currentTab === "shipped" ? "hsl(var(--accent-hsl))" : "hsl(var(--muted-hsl))",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            transition: "all 0.2s ease"
          }}
        >
          <Truck size={16} /> Shipped & Completed ({completedOrders.length})
        </button>
      </div>

      {currentTab === "proofs" && (
        <div className="card" style={{ backgroundColor: "hsl(var(--primary-hsl) / 0.05)", borderColor: "hsl(var(--primary-hsl) / 0.2)", padding: "1rem 1.25rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Printer size={20} style={{ color: "hsl(var(--primary-hsl))" }} />
          <div>
            <span style={{ fontWeight: 800, fontSize: "0.9rem", color: "hsl(var(--primary-hsl))" }}>Print Proof Review Queue</span>
            <p style={{ fontSize: "0.8rem", color: "hsl(var(--muted-hsl))", margin: 0 }}>
              Orders below contain customer uploaded artwork files or active SinaLite digital proofs awaiting review or approval.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "hsl(var(--muted-hsl))" }}>
          <Loader2 className="animate-spin" size={24} style={{ display: "inline-block", marginRight: "0.5rem" }} /> Loading orders...
        </div>
      ) : displayedOrders.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "4rem", color: "hsl(var(--muted-hsl))" }}>
          <ShoppingBag size={48} style={{ strokeWidth: 1, marginBottom: "1rem", opacity: 0.5, display: "inline-block" }} />
          <p>No orders found in this view.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: selectedOrder ? "1.2fr 1fr" : "1fr", gap: "2rem" }}>
          {/* Left: Orders list table */}
          <div className="card" style={{ padding: 0, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.95rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid hsl(var(--border-hsl))", backgroundColor: "hsl(var(--secondary-hsl) / 0.2)" }}>
                  <th style={{ padding: "1rem 1.5rem", fontWeight: 600 }}>Order ID</th>
                  <th style={{ padding: "1rem 1.5rem", fontWeight: 600 }}>Customer</th>
                  <th style={{ padding: "1rem 1.5rem", fontWeight: 600 }}>Proof / Artwork</th>
                  <th style={{ padding: "1rem 1.5rem", fontWeight: 600 }}>Placed Date</th>
                  <th style={{ padding: "1rem 1.5rem", fontWeight: 600 }}>Total</th>
                  <th style={{ padding: "1rem 1.5rem", fontWeight: 600 }}>Status</th>
                  <th style={{ padding: "1rem 1.5rem", fontWeight: 600 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {displayedOrders.map(order => {
                  const hasArtwork = order.items && order.items.some(i => i.artworkFiles && i.artworkFiles.length > 0);
                  const hasSinaliteProof = !!order.sinaliteReviewURL;
                  const isProofApproved = order.sinaliteProofStatus === "approved";

                  return (
                    <tr key={order.id} style={{ borderBottom: "1px solid hsl(var(--border-hsl))", backgroundColor: selectedOrder?.id === order.id ? "hsl(var(--secondary-hsl) / 0.3)" : "transparent" }}>
                      <td style={{ padding: "1.25rem 1.5rem", fontWeight: 600 }}>
                        <div>
                          <p style={{ margin: 0 }}>{order.id.slice(0, 10)}</p>
                          {order.sinaliteOrderId && (
                            <span style={{ fontSize: "0.7rem", color: "#10B981", fontWeight: 700, display: "inline-block", marginTop: "2px" }}>
                              SinaLite #{order.sinaliteOrderId}
                            </span>
                          )}
                          {order.orderType && (
                            <span style={{
                              fontSize: "0.65rem",
                              fontWeight: 800,
                              textTransform: "uppercase",
                              display: "block",
                              marginTop: "2px",
                              color: order.orderType === "print" ? "#2563EB" : "#D97706"
                            }}>
                              {order.orderType === "print" ? "🖨️ Print" : "👕 Apparel"}
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: "1.25rem 1.5rem" }}>
                        <p style={{ fontWeight: 500 }}>{order.shippingAddress?.ShipFName} {order.shippingAddress?.ShipLName}</p>
                        <p style={{ fontSize: "0.8rem", color: "hsl(var(--muted-hsl))" }}>{order.shippingAddress?.ShipEmail}</p>
                      </td>

                      <td style={{ padding: "1.25rem 1.5rem" }}>
                        {hasSinaliteProof ? (
                          <span style={{
                            fontSize: "0.7rem",
                            fontWeight: 800,
                            padding: "0.2rem 0.5rem",
                            borderRadius: "4px",
                            backgroundColor: isProofApproved ? "#D1FAE5" : "#FEF3C7",
                            color: isProofApproved ? "#065F46" : "#92400E",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem"
                          }}>
                            {isProofApproved ? <CheckCircle2 size={12} /> : <Printer size={12} />}
                            {isProofApproved ? "Proof Approved" : "Proof Ready"}
                          </span>
                        ) : hasArtwork ? (
                          <span style={{
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            padding: "0.2rem 0.5rem",
                            borderRadius: "4px",
                            backgroundColor: "hsl(var(--primary-hsl) / 0.1)",
                            color: "hsl(var(--primary-hsl))",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem"
                          }}>
                            <FileText size={12} /> Customer Artwork
                          </span>
                        ) : (
                          <span style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))" }}>No Artwork</span>
                        )}
                      </td>

                      <td style={{ padding: "1.25rem 1.5rem", fontSize: "0.85rem" }}>
                        {new Date(order.createdAt?.seconds * 1000 || order.createdAt).toLocaleDateString()}
                      </td>

                      <td style={{ padding: "1.25rem 1.5rem", fontWeight: 700 }}>
                        ${parseFloat(order.totals?.grandTotal || 0).toFixed(2)} CAD
                      </td>

                      <td style={{ padding: "1.25rem 1.5rem" }}>
                        <span style={{
                          display: "inline-block",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          padding: "0.2rem 0.5rem",
                          borderRadius: "4px",
                          backgroundColor: order.status === "completed" ? "hsl(var(--success-hsl) / 0.1)" : "hsl(var(--accent-hsl) / 0.1)",
                          color: order.status === "completed" ? "hsl(var(--success-hsl))" : "hsl(var(--accent-hsl))"
                        }}>
                          {order.status}
                        </span>
                      </td>

                      <td style={{ padding: "1.25rem 1.5rem" }}>
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="btn btn-outline"
                          style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                        >
                          <Eye size={14} /> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Right: Detailed View */}
          {selectedOrder && (
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid hsl(var(--border-hsl))", paddingBottom: "0.75rem" }}>
                <h2 style={{ fontSize: "1.3rem" }}>Order Details</h2>
                <button onClick={() => setSelectedOrder(null)} className="btn btn-secondary" style={{ padding: "0.25rem 0.75rem", fontSize: "0.8rem" }}>
                  Close
                </button>
              </div>

              {/* Order IDs & Linkage Display */}
              <div style={{ padding: "0.85rem", backgroundColor: "#F8FAFC", borderRadius: "8px", border: "1px solid #E2E8F0", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", color: "#64748B", textTransform: "uppercase", fontWeight: 700 }}>Storefront Order ID</span>
                  <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.9rem", color: "#0F172A" }}>{selectedOrder.id}</span>
                </div>

                {selectedOrder.sinaliteOrderId ? (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px dashed #E2E8F0", paddingTop: "0.35rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "#059669", textTransform: "uppercase", fontWeight: 700 }}>SinaLite Supplier Job ID</span>
                    <span style={{ fontFamily: "monospace", fontWeight: 800, fontSize: "0.9rem", color: "#059669" }}>#{selectedOrder.sinaliteOrderId}</span>
                  </div>
                ) : (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px dashed #E2E8F0", paddingTop: "0.35rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "#64748B", textTransform: "uppercase", fontWeight: 700 }}>Order Type / Fulfillment</span>
                    <span style={{ fontWeight: 700, fontSize: "0.8rem", color: "#D97706" }}>
                      {selectedOrder.orderType === "apparel" ? "Apparel Workshop (In-house)" : "Awaiting SinaLite Transmission"}
                    </span>
                  </div>
                )}
              </div>

              {/* SinaLite Submission Box */}
              {!selectedOrder.sinaliteOrderId && selectedOrder.orderType !== "apparel" && (
                <div style={{ padding: "1rem", backgroundColor: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#1E40AF" }}>
                    ⚡ SinaLite Order Dispatch
                  </span>
                  <p style={{ fontSize: "0.75rem", color: "#1E3A8A", margin: 0 }}>
                    Transmits print jobs and artwork to SinaLite wholesale fulfillment production queue.
                  </p>
                  <button
                    onClick={() => handleManualSubmitSinalite(selectedOrder.id)}
                    disabled={submittingSinalite}
                    className="btn btn-primary"
                    style={{ marginTop: "0.25rem", padding: "0.45rem 1rem", fontSize: "0.8rem", alignSelf: "flex-start", backgroundColor: "#2563EB", color: "white" }}
                  >
                    {submittingSinalite ? "Submitting..." : "Send Job to SinaLite API Now"}
                  </button>
                </div>
              )}

              {/* Proof Review Box */}
              {selectedOrder.sinaliteReviewURL && (
                <div style={{ padding: "1rem", backgroundColor: "#FEF3C7", border: "1px solid #FCD34D", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#92400E", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <Printer size={15} /> Digital Proof Approval Required
                  </span>
                  <p style={{ fontSize: "0.75rem", color: "#78350F", margin: 0 }}>
                    SinaLite has generated a digital proof file for this print job. Review and approve to proceed to production.
                  </p>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
                    <a
                      href={selectedOrder.sinaliteReviewURL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline"
                      style={{ padding: "0.4rem 0.85rem", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
                    >
                      <Eye size={14} /> Open Digital Proof <ExternalLink size={12} />
                    </a>

                    {selectedOrder.sinaliteProofStatus !== "approved" ? (
                      <button
                        onClick={() => handleApproveProof(selectedOrder.id)}
                        disabled={approvingProof}
                        className="btn btn-primary"
                        style={{ padding: "0.4rem 0.85rem", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
                      >
                        {approvingProof ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        Approve Proof for Production
                      </button>
                    ) : (
                      <span style={{ padding: "0.4rem 0.85rem", fontSize: "0.8rem", fontWeight: 800, color: "#065F46", backgroundColor: "#D1FAE5", borderRadius: "4px", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                        <CheckCircle2 size={14} /> Proof Approved
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Status Updater */}
              <div>
                <label className="label">Update Order Status</label>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {["pending", "processing", "submitted", "in_production", "shipped", "completed", "cancelled"].map(status => (
                    <button
                      key={status}
                      onClick={() => handleUpdateStatus(selectedOrder.id, status)}
                      style={{
                        padding: "0.35rem 0.65rem",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        borderRadius: "4px",
                        border: "1px solid",
                        borderColor: selectedOrder.status === status ? "hsl(var(--accent-hsl))" : "hsl(var(--border-hsl))",
                        backgroundColor: selectedOrder.status === status ? "hsl(var(--accent-hsl) / 0.1)" : "transparent",
                        color: selectedOrder.status === status ? "hsl(var(--accent-hsl))" : "hsl(var(--muted-hsl))",
                        cursor: "pointer"
                      }}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shipping Address Details */}
              <div>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.5rem" }}>Shipping Destination</h3>
                <div style={{ fontSize: "0.9rem", color: "hsl(var(--foreground-hsl) / 0.8)", lineHeight: 1.5, backgroundColor: "hsl(var(--secondary-hsl) / 0.2)", padding: "0.75rem", borderRadius: "var(--radius-sm)" }}>
                  <p style={{ fontWeight: 600 }}>{selectedOrder.shippingAddress?.ShipFName} {selectedOrder.shippingAddress?.ShipLName}</p>
                  <p>{selectedOrder.shippingAddress?.ShipAddr} {selectedOrder.shippingAddress?.ShipAddr2}</p>
                  <p>{selectedOrder.shippingAddress?.ShipCity}, {selectedOrder.shippingAddress?.ShipState} {selectedOrder.shippingAddress?.ShipZip}</p>
                  <p>{selectedOrder.shippingAddress?.ShipCountry}</p>
                  <p style={{ marginTop: "0.25rem", color: "hsl(var(--muted-hsl))" }}>📞 {selectedOrder.shippingAddress?.ShipPhone}</p>
                </div>
              </div>

              {/* Items List */}
              <div>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.5rem" }}>Order Items ({selectedOrder.items?.length})</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} style={{ padding: "0.75rem", border: "1px solid hsl(var(--border-hsl))", borderRadius: "var(--radius-sm)", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, fontSize: "0.9rem" }}>
                        <span>{item.name}</span>
                        <span>Qty: {item.quantity}</span>
                      </div>
                      <p style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))", margin: 0 }}>
                        {item.optionSummary}
                      </p>

                      {/* Customer Artwork Files */}
                      {item.artworkFiles && item.artworkFiles.length > 0 && (
                        <div style={{ marginTop: "0.35rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "hsl(var(--accent-hsl))" }}>Customer Artwork Files:</span>
                          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                            {item.artworkFiles.map((file, fIdx) => (
                              <a
                                key={fIdx}
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  fontSize: "0.75rem",
                                  padding: "0.2rem 0.5rem",
                                  backgroundColor: "hsl(var(--secondary-hsl))",
                                  borderRadius: "4px",
                                  color: "hsl(var(--primary-hsl))",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.25rem",
                                  textDecoration: "underline"
                                }}
                              >
                                <FileText size={12} /> {file.name || `Artwork ${fIdx + 1}`}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Mockup Preview for Custom Apparel */}
                      {item.isCustom && item.mockupLayers && (
                        <div style={{ marginTop: "0.5rem" }}>
                          <AdminApparelMockupRender item={item} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing Totals */}
              <div style={{ borderTop: "1px solid hsl(var(--border-hsl))", paddingTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.85rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Subtotal:</span>
                  <span>${parseFloat(selectedOrder.totals?.subtotal || 0).toFixed(2)} CAD</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Shipping:</span>
                  <span>${parseFloat(selectedOrder.totals?.shipping || 0).toFixed(2)} CAD</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Tax:</span>
                  <span>${parseFloat(selectedOrder.totals?.tax || 0).toFixed(2)} CAD</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "1rem", color: "hsl(var(--accent-hsl))", borderTop: "1px dashed hsl(var(--border-hsl))", paddingTop: "0.25rem" }}>
                  <span>Grand Total:</span>
                  <span>${parseFloat(selectedOrder.totals?.grandTotal || 0).toFixed(2)} CAD</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AdminApparelMockupRender({ item }) {
  const logos = item.mockupLayers?.logos || (item.artworkFiles || []).map((f, i) => ({
    id: `logo-${i}`,
    url: f.url,
    name: f.name || `Logo ${i + 1}`,
    side: f.side || item.selectedSide || "front",
    sizeIn: f.sizeIn || 6,
    placement: item.placement || { positionX: 0.5, positionY: 0.35 }
  }));

  const side = item.selectedSide || item.mockupLayers?.side || "front";
  const garmentImg = item.garmentViews?.[side]?.image || item.images?.[0] || null;

  return (
    <div style={{
      backgroundColor: "#F8FAFC",
      border: "1px solid #E2E8F0",
      borderRadius: "8px",
      padding: "0.85rem",
      display: "flex",
      flexDirection: "column",
      gap: "0.5rem"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#2563EB", textTransform: "uppercase" }}>
          👕 Visual Garment Mockup ({side.toUpperCase()} VIEW)
        </span>
        <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748B" }}>
          {logos.length} Attached Logo Layer(s)
        </span>
      </div>

      <div style={{
        position: "relative",
        width: "100%",
        height: "220px",
        backgroundColor: "white",
        borderRadius: "6px",
        border: "1px solid #CBD5E1",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        {garmentImg ? (
          <img src={garmentImg} alt="Garment Base" style={{ width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }} />
        ) : (
          <div style={{ fontSize: "0.8rem", color: "#94A3B8" }}>Custom Apparel Item</div>
        )}

        {logos.map((logo, idx) => {
          const posX = logo.placement?.positionX ?? 0.5;
          const posY = logo.placement?.positionY ?? 0.35;
          const sizeW = Math.min(120, Math.max(30, (logo.sizeIn || 6) * 8));

          return (
            <div
              key={idx}
              style={{
                position: "absolute",
                left: `${posX * 100}%`,
                top: `${posY * 100}%`,
                transform: "translate(-50%, -50%)",
                width: `${sizeW}px`,
                height: `${sizeW}px`,
                pointerEvents: "none"
              }}
            >
              <img src={logo.url} alt={logo.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              <div style={{ position: "absolute", inset: "-2px", border: "1px dashed #2563EB", borderRadius: "2px", pointerEvents: "none" }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={
      <div style={{ textAlign: "center", padding: "4rem", color: "hsl(var(--muted-hsl))" }}>
        Loading order dashboard...
      </div>
    }>
      <AdminOrdersContent />
    </Suspense>
  );
}
