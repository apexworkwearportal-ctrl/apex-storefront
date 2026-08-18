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
      const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const list = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
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

              <div>
                <p style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))", textTransform: "uppercase", fontWeight: 700 }}>Order ID</p>
                <p style={{ fontWeight: 600, fontSize: "0.95rem" }}>{selectedOrder.id}</p>
              </div>

              {/* Status Updater */}
              <div>
                <label className="label">Update Order Status</label>
                <select
                  className="input"
                  value={selectedOrder.status}
                  onChange={(e) => handleUpdateStatus(selectedOrder.id, e.target.value)}
                >
                  <option value="pending">Pending Payment / Review</option>
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

              {/* Order items */}
              <div>
                <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "hsl(var(--muted-hsl))", marginBottom: "0.75rem" }}>Ordered Items</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed hsl(var(--border-hsl))", paddingBottom: "0.5rem" }}>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>{item.name}</p>
                        <p style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))" }}>
                          Qty: {item.quantity} {item.optionSummary ? `• ${item.optionSummary}` : ""}
                        </p>
                        {item.artworkUrl && (
                          <a href={item.artworkUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.75rem", color: "hsl(var(--accent-hsl))", textDecoration: "underline", display: "inline-block", marginTop: "0.25rem" }}>
                            Download Artwork PDF
                          </a>
                        )}
                        {item.artworkFiles && item.artworkFiles.length > 0 && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginTop: "0.25rem" }}>
                            {item.artworkFiles.map((file, fIdx) => (
                              <a
                                key={fIdx}
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: "0.75rem", color: "hsl(var(--accent-hsl))", textDecoration: "underline" }}
                              >
                                📄 {file.name || `Artwork ${fIdx + 1}`}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                      <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>${parseFloat(item.price || 0).toFixed(2)}</p>
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
