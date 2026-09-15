"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, updateDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { User, MapPin, ShoppingBag, LogOut, Plus, Trash2, Home, Printer, CreditCard } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function AccountDashboard() {
  const { user, userData, loading, logout, setUserData } = useAuth();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState("profile"); // profile, addresses, orders
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  
  // Address form states
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressName, setAddressName] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("CA");
  const [phone, setPhone] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  
  // Guard route
  useEffect(() => {
    if (!loading && !user) {
      router.push("/account/login");
    }
  }, [user, loading, router]);

  // Load orders
  useEffect(() => {
    if (user) {
      const fetchOrders = async () => {
        setLoadingOrders(true);
        try {
          const orderMap = new Map();

          // 1. Fetch from orders collection by userId
          try {
            const q1 = query(collection(db, "orders"), where("userId", "==", user.uid));
            const snap1 = await getDocs(q1);
            snap1.forEach((doc) => orderMap.set(doc.id, { id: doc.id, ...doc.data() }));
          } catch (e1) {
            console.error("Error fetching orders by userId:", e1);
          }

          // 2. Fetch from orders collection by user.email
          if (user.email) {
            try {
              const q2 = query(collection(db, "orders"), where("shippingAddress.ShipEmail", "==", user.email));
              const snap2 = await getDocs(q2);
              snap2.forEach((doc) => orderMap.set(doc.id, { id: doc.id, ...doc.data() }));
            } catch (e2) {
              console.error("Error fetching orders by email:", e2);
            }
          }

          // 3. Fetch from pendingOrders collection by userId
          try {
            const q3 = query(collection(db, "pendingOrders"), where("userId", "==", user.uid));
            const snap3 = await getDocs(q3);
            snap3.forEach((doc) => orderMap.set(doc.id, { id: doc.id, ...doc.data() }));
          } catch (e3) {
            console.error("Error fetching pendingOrders by userId:", e3);
          }

          // 4. Fetch from pendingOrders collection by user.email
          if (user.email) {
            try {
              const q4 = query(collection(db, "pendingOrders"), where("shippingAddress.ShipEmail", "==", user.email));
              const snap4 = await getDocs(q4);
              snap4.forEach((doc) => orderMap.set(doc.id, { id: doc.id, ...doc.data() }));
            } catch (e4) {
              console.error("Error fetching pendingOrders by email:", e4);
            }
          }

          const orderList = Array.from(orderMap.values());

          // Sort orders by createdAt descending in JS
          orderList.sort((a, b) => {
            const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
            const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
            return timeB - timeA;
          });

          setOrders(orderList);
        } catch (error) {
          console.error("Error fetching orders:", error);
        } finally {
          setLoadingOrders(false);
        }
      };
      
      fetchOrders();
    }
  }, [user, activeTab]);

  if (loading || !user) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "hsl(var(--muted-hsl))",
        fontWeight: 500
      }}>
        Loading your account...
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/");
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    if (!addressLine1 || !city || !state || !zip || !phone) return;

    const newAddress = {
      id: crypto.randomUUID(),
      name: addressName || "My Address",
      addressLine1,
      addressLine2,
      city,
      state,
      zip,
      country,
      phone,
      isDefault: isDefault || (userData.addresses || []).length === 0,
    };

    let updatedAddresses = [...(userData.addresses || [])];
    if (newAddress.isDefault) {
      // Unset other defaults
      updatedAddresses = updatedAddresses.map(addr => ({ ...addr, isDefault: false }));
    }
    updatedAddresses.push(newAddress);

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { addresses: updatedAddresses });
      setUserData({ ...userData, addresses: updatedAddresses });
      
      // Reset form
      setShowAddressForm(false);
      setAddressName("");
      setAddressLine1("");
      setAddressLine2("");
      setCity("");
      setState("");
      setZip("");
      setPhone("");
      setIsDefault(false);
    } catch (error) {
      console.error("Error adding address:", error);
    }
  };

  const handleDeleteAddress = async (id) => {
    const updatedAddresses = (userData.addresses || []).filter(addr => addr.id !== id);
    // If we deleted the default, set first remaining as default
    if (updatedAddresses.length > 0 && !updatedAddresses.some(addr => addr.isDefault)) {
      updatedAddresses[0].isDefault = true;
    }

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { addresses: updatedAddresses });
      setUserData({ ...userData, addresses: updatedAddresses });
    } catch (error) {
      console.error("Error deleting address:", error);
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "hsl(var(--background-hsl))" }}>
      {/* Header bar */}
      <header className="glass-panel" style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        borderRadius: 0,
        borderTop: "none",
        borderLeft: "none",
        borderRight: "none",
        padding: "1rem 2rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center" }}>
          <img 
            src="/Apex-Workwear-Logo-Horizontal.webp" 
            alt="Apex Workwear Logo" 
            style={{ height: "36px", width: "auto", display: "block" }} 
          />
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/" className="btn btn-outline" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
            <Home size={16} /> Home
          </Link>
          <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
            <LogOut size={16} /> Log Out
          </button>
        </div>
      </header>

      {/* Content wrapper */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ maxWidth: "1200px", margin: "2.5rem auto", padding: "0 1.5rem" }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "2rem" }}>
          {/* Welcome Card */}
          <div className="card orange-gradient-bg" style={{
            padding: "2rem",
            color: "white",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            borderRadius: "var(--radius-lg)"
          }}>
            <h1 style={{ color: "white", fontSize: "2rem", marginBottom: "0.25rem" }}>
              Welcome back, {userData?.name || user.email.split("@")[0]}!
            </h1>
            <p style={{ opacity: 0.9, fontSize: "0.95rem" }}>
              Manage your saved addresses, view your print order history, and update your credentials.
            </p>
          </div>
        </div>

        {/* Dashboard Sections Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "250px 1fr", gap: "2.5rem", marginTop: "2rem" }}>
          {/* Side Menu Navigation */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <button
              onClick={() => setActiveTab("profile")}
              className="btn"
              style={{
                justifyContent: "flex-start",
                backgroundColor: activeTab === "profile" ? "hsl(var(--secondary-hsl))" : "transparent",
                color: "hsl(var(--foreground-hsl))",
                borderColor: activeTab === "profile" ? "hsl(var(--border-hsl))" : "transparent"
              }}
            >
              <User size={18} /> Profile Details
            </button>
            <button
              onClick={() => setActiveTab("addresses")}
              className="btn"
              style={{
                justifyContent: "flex-start",
                backgroundColor: activeTab === "addresses" ? "hsl(var(--secondary-hsl))" : "transparent",
                color: "hsl(var(--foreground-hsl))",
                borderColor: activeTab === "addresses" ? "hsl(var(--border-hsl))" : "transparent"
              }}
            >
              <MapPin size={18} /> Address Book
            </button>
            <button
              onClick={() => setActiveTab("orders")}
              className="btn"
              style={{
                justifyContent: "flex-start",
                backgroundColor: activeTab === "orders" ? "hsl(var(--secondary-hsl))" : "transparent",
                color: "hsl(var(--foreground-hsl))",
                borderColor: activeTab === "orders" ? "hsl(var(--border-hsl))" : "transparent"
              }}
            >
              <ShoppingBag size={18} /> Order History
            </button>
          </div>

          {/* Section Detail Panel */}
          <div className="card" style={{ padding: "2rem", minHeight: "400px" }}>
            {activeTab === "profile" && (
              <div>
                <h2 style={{ fontSize: "1.5rem", marginBottom: "1.5rem", borderBottom: "1px solid hsl(var(--border-hsl))", paddingBottom: "0.75rem" }}>
                  Profile Settings
                </h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginTop: "1rem" }}>
                  <div>
                    <label className="label">Full Name</label>
                    <div className="input" style={{ backgroundColor: "hsl(var(--secondary-hsl) / 0.3)" }}>
                      {userData?.name || "Not specified"}
                    </div>
                  </div>
                  <div>
                    <label className="label">Email Address</label>
                    <div className="input" style={{ backgroundColor: "hsl(var(--secondary-hsl) / 0.3)" }}>
                      {user.email}
                    </div>
                  </div>
                  <div>
                    <label className="label">Account Status</label>
                    <div className="input" style={{ backgroundColor: "hsl(var(--secondary-hsl) / 0.3)" }}>
                      Active Customer
                    </div>
                  </div>
                  <div>
                    <label className="label">Member Since</label>
                    <div className="input" style={{ backgroundColor: "hsl(var(--secondary-hsl) / 0.3)" }}>
                      {userData?.createdAt ? new Date(userData.createdAt.seconds * 1000).toLocaleDateString() : new Date().toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "addresses" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", borderBottom: "1px solid hsl(var(--border-hsl))", paddingBottom: "0.75rem" }}>
                  <h2 style={{ fontSize: "1.5rem" }}>Address Book</h2>
                  <button onClick={() => setShowAddressForm(!showAddressForm)} className="btn btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
                    <Plus size={16} /> Add Address
                  </button>
                </div>

                {showAddressForm && (
                  <form onSubmit={handleAddAddress} className="glass-panel" style={{ padding: "1.5rem", marginBottom: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <h3 style={{ fontSize: "1.1rem" }}>New Address</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div>
                        <label className="label">Address Label (e.g. Home, Office)</label>
                        <input className="input" value={addressName} onChange={(e) => setAddressName(e.target.value)} placeholder="Home" required />
                      </div>
                      <div>
                        <label className="label">Phone Number</label>
                        <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="416-555-0199" required />
                      </div>
                    </div>
                    <div>
                      <label className="label">Street Address Line 1</label>
                      <input className="input" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} placeholder="123 Printing Ave" required />
                    </div>
                    <div>
                      <label className="label">Suite, Unit, Building (Optional)</label>
                      <input className="input" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} placeholder="Unit 4" />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                      <div>
                        <label className="label">City</label>
                        <input className="input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Toronto" required />
                      </div>
                      <div>
                        <label className="label">Province/State</label>
                        <input className="input" value={state} onChange={(e) => setState(e.target.value)} placeholder="ON" required />
                      </div>
                      <div>
                        <label className="label">Postal Code/ZIP</label>
                        <input className="input" value={zip} onChange={(e) => setZip(e.target.value)} placeholder="M5V 1A1" required />
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <input type="checkbox" id="default-check" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
                      <label htmlFor="default-check" style={{ fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}>Set as default address</label>
                    </div>
                    <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
                      <button type="submit" className="btn btn-primary" style={{ padding: "0.5rem 1.5rem" }}>Save Address</button>
                      <button type="button" onClick={() => setShowAddressForm(false)} className="btn btn-secondary" style={{ padding: "0.5rem 1.5rem" }}>Cancel</button>
                    </div>
                  </form>
                )}

                {(!userData?.addresses || userData.addresses.length === 0) ? (
                  <div style={{ textAlign: "center", padding: "3rem", color: "hsl(var(--muted-hsl))" }}>
                    <MapPin size={48} style={{ strokeWidth: 1, marginBottom: "1rem", opacity: 0.5 }} />
                    <p>No saved addresses found. Add a shipping address to speed up checkout.</p>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                    {userData.addresses.map((addr) => (
                      <div key={addr.id} className="card" style={{ position: "relative", borderColor: addr.isDefault ? "hsl(var(--accent-hsl))" : "hsl(var(--border-hsl))" }}>
                        {addr.isDefault && (
                          <span style={{
                            position: "absolute",
                            top: "1rem",
                            right: "1rem",
                            backgroundColor: "hsl(var(--accent-hsl) / 0.1)",
                            color: "hsl(var(--accent-hsl))",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            padding: "0.2rem 0.5rem",
                            borderRadius: "4px"
                          }}>
                            Default
                          </span>
                        )}
                        <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>{addr.name}</h3>
                        <p style={{ fontSize: "0.9rem", color: "hsl(var(--foreground-hsl) / 0.8)" }}>
                          {addr.addressLine1}
                          {addr.addressLine2 && `, ${addr.addressLine2}`}
                        </p>
                        <p style={{ fontSize: "0.9rem", color: "hsl(var(--foreground-hsl) / 0.8)" }}>
                          {addr.city}, {addr.state} {addr.zip}
                        </p>
                        <p style={{ fontSize: "0.9rem", color: "hsl(var(--foreground-hsl) / 0.8)", marginBottom: "1rem" }}>
                          {addr.country} • {addr.phone}
                        </p>
                        <button
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="btn"
                          style={{
                            padding: "0.4rem 0.75rem",
                            fontSize: "0.8rem",
                            backgroundColor: "transparent",
                            color: "hsl(var(--destructive-hsl))",
                            border: "1px solid hsl(var(--destructive-hsl) / 0.2)"
                          }}
                        >
                          <Trash2 size={14} /> Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "orders" && (
              <div>
                <h2 style={{ fontSize: "1.5rem", marginBottom: "1.5rem", borderBottom: "1px solid hsl(var(--border-hsl))", paddingBottom: "0.75rem" }}>
                  Order History
                </h2>

                {loadingOrders ? (
                  <div style={{ textAlign: "center", padding: "3rem", color: "hsl(var(--muted-hsl))" }}>
                    Loading order history...
                  </div>
                ) : orders.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "3rem", color: "hsl(var(--muted-hsl))" }}>
                    <ShoppingBag size={48} style={{ strokeWidth: 1, marginBottom: "1rem", opacity: 0.5 }} />
                    <p>You haven't placed any printing orders yet.</p>
                    <Link href="/" className="btn btn-primary" style={{ marginTop: "1rem", display: "inline-flex" }}>
                      Browse Products
                    </Link>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {orders.map((order) => (
                      <div key={order.id} className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", borderBottom: "1px solid hsl(var(--border-hsl))", paddingBottom: "0.75rem" }}>
                          <div>
                            <p style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, color: "hsl(var(--muted-hsl))" }}>Order ID</p>
                            <p style={{ fontSize: "0.9rem", fontWeight: 600 }}>{order.id}</p>
                          </div>
                          <div>
                            <p style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, color: "hsl(var(--muted-hsl))" }}>Placed On</p>
                            <p style={{ fontSize: "0.9rem", fontWeight: 600 }}>{new Date(order.createdAt.seconds * 1000).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, color: "hsl(var(--muted-hsl))" }}>Total</p>
                            <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "hsl(var(--accent-hsl))" }}>${parseFloat(order.totals.grandTotal).toFixed(2)} CAD</p>
                          </div>
                          <div>
                            <p style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, color: "hsl(var(--muted-hsl))" }}>Status</p>
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
                          </div>
                        </div>
                        
                        {/* Order Items */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                          {order.items.map((item, idx) => (
                            <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px dashed hsl(var(--border-hsl) / 0.5)", paddingBottom: "0.5rem" }}>
                              <div>
                                <p style={{ fontWeight: 600, fontSize: "0.95rem" }}>{item.name}</p>
                                <p style={{ fontSize: "0.8rem", color: "hsl(var(--muted-hsl))" }}>
                                  Qty: {item.quantity} {item.optionSummary ? `• ${item.optionSummary}` : ""}
                                </p>
                                {item.artworkFiles && item.artworkFiles.length > 0 && (
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.25rem" }}>
                                    {item.artworkFiles.map((file, fIdx) => (
                                      <a
                                        key={fIdx}
                                        href={file.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ fontSize: "0.75rem", color: "hsl(var(--accent-hsl))", textDecoration: "underline", fontWeight: 500 }}
                                      >
                                        📄 {file.name || `Artwork ${fIdx + 1}`}
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <p style={{ fontWeight: 600, fontSize: "0.95rem" }}>${parseFloat(item.price).toFixed(2)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
