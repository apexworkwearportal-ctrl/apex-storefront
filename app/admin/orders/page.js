"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { ShoppingBag, Eye, Clock, Mail, Truck, ChevronRight } from "lucide-react";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

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

      // 2. Fetch pending orders (awaiting payment or webhook callback)
      try {
        const pendingSnap = await getDocs(collection(db, "pendingOrders"));
        pendingSnap.forEach(doc => {
          // Avoid duplicates if already moved to orders
          if (!list.some(o => o.id === doc.id)) {
            list.push({ id: doc.id, ...doc.data(), isPendingCollection: true });
          }
        });
      } catch (e2) {
        console.error("Error fetching pendingOrders collection:", e2);
      }

      // 3. Sort chronologically in JS (newest first)
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

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem", marginBottom: "0.25rem" }}>Order Manager</h1>
        <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.95rem" }}>
          Inspect print order requests, fulfillment states, and SinaLite job tracking IDs.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "hsl(var(--muted-hsl))" }}>
          Loading orders...
        </div>
      ) : orders.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "4rem", color: "hsl(var(--muted-hsl))" }}>
          <ShoppingBag size={48} style={{ strokeWidth: 1, marginBottom: "1rem", opacity: 0.5, display: "inline-block" }} />
          <p>No customer orders found in the database yet.</p>
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
                  <th style={{ padding: "1rem 1.5rem", fontWeight: 600 }}>Placed Date</th>
                  <th style={{ padding: "1rem 1.5rem", fontWeight: 600 }}>Grand Total</th>
                  <th style={{ padding: "1rem 1.5rem", fontWeight: 600 }}>Status</th>
                  <th style={{ padding: "1rem 1.5rem", fontWeight: 600 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id} style={{ borderBottom: "1px solid hsl(var(--border-hsl))", backgroundColor: selectedOrder?.id === order.id ? "hsl(var(--secondary-hsl) / 0.3)" : "transparent" }}>
                    <td style={{ padding: "1.25rem 1.5rem", fontWeight: 600 }}>
                      {order.id.slice(0, 8)}...
                    </td>
                    <td style={{ padding: "1.25rem 1.5rem" }}>
                      <p style={{ fontWeight: 500 }}>{order.shippingAddress?.ShipFName} {order.shippingAddress?.ShipLName}</p>
                      <p style={{ fontSize: "0.8rem", color: "hsl(var(--muted-hsl))" }}>{order.shippingAddress?.ShipEmail}</p>
                    </td>
                    <td style={{ padding: "1.25rem 1.5rem" }}>
                      {new Date(order.createdAt?.seconds * 1000 || order.createdAt).toLocaleDateString()}
                    </td>
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
                      {new Date(order.createdAt?.seconds * 1000 || order.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "1.25rem 1.5rem", fontWeight: 600 }}>
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
                ))}
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
                    <span style={{ fontWeight: 700, fontSize: "0.8rem", color: selectedOrder.orderType === "apparel" ? "#D97706" : "#2563EB" }}>
                      {selectedOrder.orderType === "apparel" ? "👕 Custom Apparel (Admin Fulfill)" : "🖨️ Print Order"}
                    </span>
                  </div>
                )}

                {selectedOrder.parentOrderId && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px dashed #E2E8F0", paddingTop: "0.35rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "#64748B", textTransform: "uppercase", fontWeight: 700 }}>Parent Transaction ID</span>
                    <span style={{ fontFamily: "monospace", fontWeight: 600, fontSize: "0.8rem" }}>{selectedOrder.parentOrderId}</span>
                  </div>
                )}
              </div>

              {/* SinaLite Proof & Webhook Info Card */}
              {(selectedOrder.sinaliteReviewURL || selectedOrder.sinaliteOrderId || selectedOrder.sinaliteTrackingNumber) && (
                <div style={{
                  padding: "1rem 1.25rem",
                  backgroundColor: selectedOrder.sinaliteProofStatus === "approved" ? "#ECFDF5" : "#EFF6FF",
                  borderRadius: "8px",
                  border: selectedOrder.sinaliteProofStatus === "approved" ? "1px solid #A7F3D0" : "1px solid #BFDBFE",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "0.8rem", fontWeight: 800, color: selectedOrder.sinaliteProofStatus === "approved" ? "#065F46" : "#1E40AF" }}>
                        SinaLite API Integration Status
                      </span>
                    </div>

                    <span style={{
                      fontSize: "0.7rem",
                      fontWeight: 800,
                      padding: "0.2rem 0.6rem",
                      borderRadius: "12px",
                      backgroundColor: selectedOrder.sinaliteProofStatus === "approved" ? "#10B981" : "#F59E0B",
                      color: "white"
                    }}>
                      {selectedOrder.sinaliteProofStatus === "approved" ? "PROOF APPROVED" : "PROOF REVIEW REQUIRED"}
                    </span>
                  </div>

                  {selectedOrder.sinaliteOrderId && (
                    <p style={{ fontSize: "0.8rem", margin: 0 }}>
                      SinaLite Job Order ID: <code style={{ backgroundColor: "rgba(0,0,0,0.06)", padding: "2px 6px", borderRadius: "4px", fontWeight: 700 }}>{selectedOrder.sinaliteOrderId}</code>
                    </p>
                  )}

                  {selectedOrder.sinaliteTrackingNumber && (
                    <p style={{ fontSize: "0.8rem", margin: 0, color: "#059669", fontWeight: 700 }}>
                      🚚 Shipping Tracking #: <code style={{ backgroundColor: "#D1FAE5", padding: "2px 6px", borderRadius: "4px" }}>{selectedOrder.sinaliteTrackingNumber}</code>
                    </p>
                  )}

                  {selectedOrder.sinaliteReviewURL && (
                    <div style={{ marginTop: "0.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <a
                        href={selectedOrder.sinaliteReviewURL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary"
                        style={{ padding: "0.45rem 0.85rem", fontSize: "0.8rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.4rem", backgroundColor: "#2563EB", color: "white" }}
                      >
                        <Eye size={14} /> Open & Review Digital Proof File (SinaLite)
                      </a>

                      {selectedOrder.sinaliteReviewFILE && (
                        <p style={{ fontSize: "0.75rem", color: "#64748B", margin: 0, fontFamily: "monospace" }}>
                          Proof File Key: {selectedOrder.sinaliteReviewFILE}
                        </p>
                      )}

                      {selectedOrder.sinaliteProofStatus !== "approved" && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const res = await fetch("/api/admin/orders/approve-proof", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ orderId: selectedOrder.id })
                              });
                              const data = await res.json();
                              if (res.ok) {
                                alert("Proof approved! Order placed into production.");
                                handleUpdateStatus(selectedOrder.id, "processing");
                                setSelectedOrder(prev => ({ ...prev, sinaliteProofStatus: "approved", status: "processing" }));
                              } else {
                                alert("Error approving proof: " + data.error);
                              }
                            } catch (err) {
                              alert("Failed to approve proof: " + err.message);
                            }
                          }}
                          className="btn btn-primary"
                          style={{ padding: "0.5rem", fontSize: "0.85rem", backgroundColor: "#10B981", color: "white", marginTop: "0.25rem" }}
                        >
                          <CheckCircle2 size={16} /> Approve Proof & Authorize Production
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Status Updater */}
              <div>
                <label className="label">Update Order Status</label>
                <select
                  className="input"
                  value={selectedOrder.status}
                  onChange={(e) => handleUpdateStatus(selectedOrder.id, e.target.value)}
                >
                  <option value="pending">Pending Payment / Review</option>
                  <option value="pending_apparel_fulfillment">Pending Apparel Fulfillment</option>
                  <option value="proof_ready">SinaLite Digital Proof Ready</option>
                  <option value="submitted">Submitted to SinaLite</option>
                  <option value="processing">In Production</option>
                  <option value="shipped">Shipped</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Customer addresses */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <h3 style={{ fontSize: "0.9rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.25rem", color: "hsl(var(--muted-hsl))" }}><Truck size={14} /> Shipping Info</h3>
                  <p style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>
                    <strong>{selectedOrder.shippingAddress?.ShipFName} {selectedOrder.shippingAddress?.ShipLName}</strong><br />
                    {selectedOrder.shippingAddress?.ShipAddr}<br />
                    {selectedOrder.shippingAddress?.ShipAddr2 && `${selectedOrder.shippingAddress.ShipAddr2}\n`}
                    {selectedOrder.shippingAddress?.ShipCity}, {selectedOrder.shippingAddress?.ShipState} {selectedOrder.shippingAddress?.ShipZip}<br />
                    {selectedOrder.shippingAddress?.ShipCountry} • {selectedOrder.shippingAddress?.ShipPhone}
                  </p>
                  <p style={{ fontSize: "0.8rem", color: "hsl(var(--accent-hsl))", fontWeight: 600, marginTop: "0.5rem" }}>
                    Method: {selectedOrder.shippingAddress?.ShipMethod}
                  </p>
                </div>
                <div>
                  <h3 style={{ fontSize: "0.9rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.25rem", color: "hsl(var(--muted-hsl))" }}><Mail size={14} /> Customer Email</h3>
                  <p style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>
                    {selectedOrder.shippingAddress?.ShipEmail}
                  </p>
                </div>
              </div>

              {/* Order items with Visual Apparel Mockup Rendering */}
              <div>
                <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "hsl(var(--muted-hsl))", marginBottom: "0.75rem" }}>Ordered Items & Custom Mockups</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} style={{ border: "1px solid hsl(var(--border-hsl))", borderRadius: "8px", padding: "1rem", backgroundColor: "white", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <p style={{ fontWeight: 800, fontSize: "0.95rem", margin: 0, color: "#0F172A" }}>{item.name}</p>
                          <p style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))", margin: 0, marginTop: "2px" }}>
                            Qty: {item.quantity} {item.optionSummary ? `• ${item.optionSummary}` : ""}
                          </p>
                        </div>
                        <p style={{ fontWeight: 800, fontSize: "0.95rem", color: "#2563EB", margin: 0 }}>${parseFloat(item.price || 0).toFixed(2)} CAD</p>
                      </div>

                      {/* Render Visual Garment Mockup if Custom Apparel */}
                      {(item.isCustom || item.mockupLayers || item.logoUrl || (item.artworkFiles && item.artworkFiles.length > 0)) && (
                        <AdminApparelMockupRender item={item} />
                      )}

                      {/* Download Artwork / Digital Proof Files */}
                      {item.reviewURL && (
                        <a href={item.reviewURL} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.75rem", color: "#2563EB", fontWeight: 700, textDecoration: "underline", display: "inline-block" }}>
                          🔍 View SinaLite Digital Proof ({item.reviewFILE || "Review File"})
                        </a>
                      )}
                      {item.artworkUrl && (
                        <a href={item.artworkUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.75rem", color: "hsl(var(--accent-hsl))", textDecoration: "underline", display: "inline-block" }}>
                          📄 Download Primary Artwork PDF/Image
                        </a>
                      )}
                      {item.artworkFiles && item.artworkFiles.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                          <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Uploaded Artwork Files:</span>
                          {item.artworkFiles.map((file, fIdx) => (
                            <a
                              key={fIdx}
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: "0.75rem", color: "#2563EB", textDecoration: "underline", fontWeight: 600 }}
                            >
                              📄 {file.name || `Artwork File ${fIdx + 1}`} {file.side ? `(${file.side.toUpperCase()})` : ""} {file.sizeIn ? `[${file.sizeIn}" × ${file.sizeIn}"]` : ""}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div style={{ borderTop: "1px solid hsl(var(--border-hsl))", paddingTop: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "hsl(var(--muted-hsl))", marginBottom: "0.25rem" }}>
                  <span>Subtotal</span>
                  <span>${parseFloat(selectedOrder.totals?.subtotal || 0).toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "hsl(var(--muted-hsl))", marginBottom: "0.25rem" }}>
                  <span>Shipping Cost</span>
                  <span>${parseFloat(selectedOrder.totals?.shipping || 0).toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "hsl(var(--muted-hsl))", marginBottom: "0.5rem" }}>
                  <span>Taxes (HST/GST)</span>
                  <span>${parseFloat(selectedOrder.totals?.tax || 0).toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.1rem", fontWeight: 700 }}>
                  <span>Total</span>
                  <span style={{ color: "hsl(var(--accent-hsl))" }}>${parseFloat(selectedOrder.totals?.grandTotal || 0).toFixed(2)} CAD</span>
                </div>
              </div>

              {/* SinaLite order reference */}
              {selectedOrder.sinaliteOrderId && (
                <div style={{ backgroundColor: "rgba(0,0,0,0.03)", padding: "0.75rem", borderRadius: "var(--radius-sm)", fontSize: "0.8rem" }}>
                  <p><strong>SinaLite API Submission Ref:</strong></p>
                  <p style={{ fontFamily: "monospace", color: "hsl(var(--muted-hsl))", marginTop: "0.25rem" }}>{selectedOrder.sinaliteOrderId}</p>
                </div>
              )}
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

