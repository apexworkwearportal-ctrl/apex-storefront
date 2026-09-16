"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { 
  User, 
  MapPin, 
  ShoppingBag, 
  LogOut, 
  Plus, 
  Trash2, 
  Home, 
  Printer, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  Package, 
  FileCheck, 
  Truck, 
  ExternalLink, 
  Shield, 
  Edit3, 
  Save, 
  Sparkles, 
  RefreshCw, 
  ChevronRight, 
  Check, 
  LayoutDashboard,
  Shirt,
  Building,
  Phone
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function AccountDashboard() {
  const { user, userData, loading, logout, setUserData } = useAuth();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState("overview"); // overview, orders, addresses, profile
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Profile Edit states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  
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

  // Sync profile edit fields
  useEffect(() => {
    if (userData) {
      setEditName(userData.name || "");
      setEditPhone(userData.phone || "");
      setEditCompany(userData.company || "");
    } else if (user?.email) {
      setEditName(user.email.split("@")[0]);
    }
  }, [userData, user]);

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

          // Sort orders by createdAt descending
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
        fontWeight: 600,
        backgroundColor: "hsl(var(--background-hsl))"
      }}>
        <RefreshCw size={24} style={{ animation: "spin 1.5s linear infinite", marginRight: "0.5rem" }} />
        Loading your account portal...
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

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSuccess(false);

    try {
      const userRef = doc(db, "users", user.uid);
      const updateData = {
        name: editName,
        phone: editPhone,
        company: editCompany,
        updatedAt: new Date()
      };
      await updateDoc(userRef, updateData);
      setUserData({ ...userData, ...updateData });
      setIsEditingProfile(false);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 4000);
    } catch (err) {
      console.error("Profile save error:", err);
      alert("Failed to update profile: " + err.message);
    } finally {
      setSavingProfile(false);
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
      isDefault: isDefault || (userData?.addresses || []).length === 0,
    };

    let updatedAddresses = [...(userData?.addresses || [])];
    if (newAddress.isDefault) {
      updatedAddresses = updatedAddresses.map(addr => ({ ...addr, isDefault: false }));
    }
    updatedAddresses.push(newAddress);

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { addresses: updatedAddresses });
      setUserData({ ...userData, addresses: updatedAddresses });
      
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
    const updatedAddresses = (userData?.addresses || []).filter(addr => addr.id !== id);
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

  // Compute Order KPIs
  const activeOrdersCount = orders.filter(o => !["completed", "shipped", "delivered"].includes((o.status || "").toLowerCase())).length;
  const completedOrdersCount = orders.filter(o => ["completed", "shipped", "delivered"].includes((o.status || "").toLowerCase())).length;
  const totalSpent = orders.reduce((sum, o) => sum + parseFloat(o.totals?.grandTotal || o.grandTotal || 0), 0);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "hsl(var(--background-hsl))" }}>
      <Header />

      <main style={{ maxWidth: "1380px", margin: "2rem auto 4rem auto", padding: "0 1.5rem", width: "100%", flexGrow: 1 }}>
        {/* HERO PROFILE SUMMARY HEADER BANNER */}
        <div style={{
          background: "linear-gradient(135deg, hsl(var(--primary-hsl)) 0%, #0f172a 100%)",
          borderRadius: "var(--radius-lg)",
          padding: "2.25rem 2.5rem",
          color: "#ffffff",
          boxShadow: "0 15px 35px rgba(0, 0, 0, 0.12)",
          marginBottom: "2.5rem",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{
            position: "absolute",
            top: "-30%",
            right: "-5%",
            width: "350px",
            height: "350px",
            background: "radial-gradient(circle, hsl(var(--accent-hsl) / 0.15) 0%, transparent 70%)",
            filter: "blur(50px)",
            pointerEvents: "none"
          }} />

          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1.5rem",
            position: "relative",
            zIndex: 1
          }}>
            {/* User Identity */}
            <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
              <div style={{
                width: "68px",
                height: "68px",
                borderRadius: "50%",
                backgroundColor: "hsl(var(--accent-hsl))",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.75rem",
                fontWeight: 900,
                boxShadow: "0 8px 20px rgba(249, 115, 22, 0.35)",
                border: "3px solid rgba(255, 255, 255, 0.2)"
              }}>
                {(userData?.name || user.email.charAt(0)).toUpperCase().charAt(0)}
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                  <h1 style={{ fontSize: "1.85rem", fontWeight: 900, color: "#ffffff", lineHeight: 1.2 }}>
                    Welcome, {userData?.name || user.email.split("@")[0]}
                  </h1>
                  <span style={{
                    backgroundColor: "rgba(255, 255, 255, 0.15)",
                    color: "#f97316",
                    fontSize: "0.675rem",
                    fontWeight: 800,
                    padding: "0.2rem 0.6rem",
                    borderRadius: "20px",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase"
                  }}>
                    COMMERCIAL ACCOUNT
                  </span>
                </div>

                <p style={{ color: "#cbd5e1", fontSize: "0.9rem", marginTop: "0.25rem" }}>
                  {user.email} {userData?.company ? `• ${userData.company}` : ""}
                </p>
              </div>
            </div>

            {/* Quick KPI Counters */}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
              <div style={{
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                padding: "0.85rem 1.25rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                textAlign: "center",
                minWidth: "110px"
              }}>
                <p style={{ fontSize: "1.5rem", fontWeight: 900, color: "#ffffff", lineHeight: 1 }}>{orders.length}</p>
                <p style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", marginTop: "0.3rem" }}>Total Orders</p>
              </div>

              <div style={{
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                padding: "0.85rem 1.25rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                textAlign: "center",
                minWidth: "110px"
              }}>
                <p style={{ fontSize: "1.5rem", fontWeight: 900, color: "hsl(var(--accent-hsl))", lineHeight: 1 }}>{activeOrdersCount}</p>
                <p style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", marginTop: "0.3rem" }}>In Progress</p>
              </div>

              <div style={{
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                padding: "0.85rem 1.25rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                textAlign: "center",
                minWidth: "110px"
              }}>
                <p style={{ fontSize: "1.5rem", fontWeight: 900, color: "#38bdf8", lineHeight: 1 }}>${totalSpent.toFixed(2)}</p>
                <p style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", marginTop: "0.3rem" }}>Total Volume</p>
              </div>
            </div>
          </div>
        </div>

        {/* DASHBOARD GRID SYSTEM */}
        <div style={{ display: "grid", gridTemplateColumns: "270px 1fr", gap: "2.5rem" }} className="account-grid">
          {/* Side Menu Navigation */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <button
              onClick={() => setActiveTab("overview")}
              className="btn"
              style={{
                justifyContent: "flex-start",
                padding: "0.75rem 1.15rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: activeTab === "overview" ? "hsl(var(--primary-hsl))" : "white",
                color: activeTab === "overview" ? "#ffffff" : "hsl(var(--foreground-hsl))",
                border: "1px solid hsl(var(--border-hsl))",
                fontWeight: activeTab === "overview" ? 700 : 600,
                fontSize: "0.9rem",
                boxShadow: activeTab === "overview" ? "0 4px 12px rgba(0, 0, 0, 0.08)" : "none"
              }}
            >
              <LayoutDashboard size={18} style={{ color: activeTab === "overview" ? "#ffffff" : "hsl(var(--muted-hsl))" }} />
              Dashboard Overview
            </button>

            <button
              onClick={() => setActiveTab("orders")}
              className="btn"
              style={{
                justifyContent: "flex-start",
                padding: "0.75rem 1.15rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: activeTab === "orders" ? "hsl(var(--primary-hsl))" : "white",
                color: activeTab === "orders" ? "#ffffff" : "hsl(var(--foreground-hsl))",
                border: "1px solid hsl(var(--border-hsl))",
                fontWeight: activeTab === "orders" ? 700 : 600,
                fontSize: "0.9rem",
                boxShadow: activeTab === "orders" ? "0 4px 12px rgba(0, 0, 0, 0.08)" : "none"
              }}
            >
              <ShoppingBag size={18} style={{ color: activeTab === "orders" ? "#ffffff" : "hsl(var(--muted-hsl))" }} />
              Orders & Proof Approval
              {orders.length > 0 && (
                <span style={{
                  marginLeft: "auto",
                  backgroundColor: activeTab === "orders" ? "hsl(var(--accent-hsl))" : "hsl(var(--secondary-hsl))",
                  color: activeTab === "orders" ? "#ffffff" : "hsl(var(--foreground-hsl))",
                  fontSize: "0.7rem",
                  fontWeight: 800,
                  padding: "0.15rem 0.5rem",
                  borderRadius: "10px"
                }}>
                  {orders.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("addresses")}
              className="btn"
              style={{
                justifyContent: "flex-start",
                padding: "0.75rem 1.15rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: activeTab === "addresses" ? "hsl(var(--primary-hsl))" : "white",
                color: activeTab === "addresses" ? "#ffffff" : "hsl(var(--foreground-hsl))",
                border: "1px solid hsl(var(--border-hsl))",
                fontWeight: activeTab === "addresses" ? 700 : 600,
                fontSize: "0.9rem",
                boxShadow: activeTab === "addresses" ? "0 4px 12px rgba(0, 0, 0, 0.08)" : "none"
              }}
            >
              <MapPin size={18} style={{ color: activeTab === "addresses" ? "#ffffff" : "hsl(var(--muted-hsl))" }} />
              Saved Shipping Addresses
            </button>

            <button
              onClick={() => setActiveTab("profile")}
              className="btn"
              style={{
                justifyContent: "flex-start",
                padding: "0.75rem 1.15rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: activeTab === "profile" ? "hsl(var(--primary-hsl))" : "white",
                color: activeTab === "profile" ? "#ffffff" : "hsl(var(--foreground-hsl))",
                border: "1px solid hsl(var(--border-hsl))",
                fontWeight: activeTab === "profile" ? 700 : 600,
                fontSize: "0.9rem",
                boxShadow: activeTab === "profile" ? "0 4px 12px rgba(0, 0, 0, 0.08)" : "none"
              }}
            >
              <User size={18} style={{ color: activeTab === "profile" ? "#ffffff" : "hsl(var(--muted-hsl))" }} />
              Account & Security
            </button>

            <div style={{ marginTop: "1.5rem", borderTop: "1px solid hsl(var(--border-hsl))", paddingTop: "1rem" }}>
              <button
                onClick={handleLogout}
                className="btn btn-outline"
                style={{
                  width: "100%",
                  justifyContent: "flex-start",
                  padding: "0.65rem 1.15rem",
                  fontSize: "0.85rem",
                  borderColor: "hsl(var(--destructive-hsl) / 0.3)",
                  color: "hsl(var(--destructive-hsl))"
                }}
              >
                <LogOut size={16} /> Sign Out Account
              </button>
            </div>
          </div>

          {/* MAIN PANEL CONTENT */}
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            {/* TAB 1: OVERVIEW DASHBOARD */}
            {activeTab === "overview" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                {/* Notification / Promo Card */}
                <div className="card" style={{
                  padding: "1.75rem",
                  background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
                  border: "1px solid hsl(var(--border-hsl))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "1rem"
                }}>
                  <div>
                    <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "hsl(var(--accent-hsl))", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.25rem" }}>
                      ✨ CUSTOM APPAREL DESIGNER
                    </span>
                    <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "hsl(var(--primary-hsl))" }}>
                      Build New Custom Apparel Order
                    </h3>
                    <p style={{ fontSize: "0.85rem", color: "hsl(var(--muted-hsl))", marginTop: "0.2rem" }}>
                      Upload corporate logos, position front/back artwork, and configure volume tiers.
                    </p>
                  </div>
                  <Link href="/products?category=apparel" className="btn btn-primary" style={{ padding: "0.6rem 1.25rem", fontSize: "0.85rem" }}>
                    Launch Apparel Designer <ChevronRight size={16} />
                  </Link>
                </div>

                {/* Recent Orders List Preview */}
                <div className="card" style={{ padding: "1.75rem", border: "1px solid hsl(var(--border-hsl))" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "hsl(var(--primary-hsl))" }}>Recent Print Orders</h3>
                    <button onClick={() => setActiveTab("orders")} style={{ background: "none", border: "none", color: "hsl(var(--accent-hsl))", fontSize: "0.825rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      View All Orders <ChevronRight size={14} />
                    </button>
                  </div>

                  {loadingOrders ? (
                    <div style={{ padding: "2rem", textAlign: "center", color: "hsl(var(--muted-hsl))" }}>Loading recent orders...</div>
                  ) : orders.length === 0 ? (
                    <div style={{ padding: "2rem", textAlign: "center", color: "hsl(var(--muted-hsl))" }}>
                      <Package size={40} style={{ margin: "0 auto 0.75rem auto", opacity: 0.4 }} />
                      <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>No orders placed yet</p>
                      <p style={{ fontSize: "0.8rem", marginTop: "0.25rem" }}>Your print & apparel order details and tracking numbers will appear here.</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      {orders.slice(0, 3).map((order) => (
                        <div
                          key={order.id}
                          style={{
                            padding: "1rem",
                            borderRadius: "var(--radius-md)",
                            backgroundColor: "hsl(var(--secondary-hsl) / 0.4)",
                            border: "1px solid hsl(var(--border-hsl) / 0.6)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: "1rem"
                          }}
                        >
                          <div>
                            <p style={{ fontWeight: 700, fontSize: "0.9rem" }}>Order #{order.id.slice(0, 8)}</p>
                            <p style={{ fontSize: "0.775rem", color: "hsl(var(--muted-hsl))" }}>
                              {order.items?.length || 0} item(s) • Placed on {order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleDateString() : "Recent"}
                            </p>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
                            <span style={{
                              padding: "0.2rem 0.65rem",
                              borderRadius: "12px",
                              fontSize: "0.725rem",
                              fontWeight: 800,
                              textTransform: "uppercase",
                              backgroundColor: ["completed", "shipped"].includes((order.status || "").toLowerCase()) ? "hsl(var(--success-hsl) / 0.15)" : "hsl(var(--accent-hsl) / 0.15)",
                              color: ["completed", "shipped"].includes((order.status || "").toLowerCase()) ? "hsl(var(--success-hsl))" : "hsl(var(--accent-hsl))"
                            }}>
                              {order.status || "PROCESSING"}
                            </span>

                            <span style={{ fontWeight: 800, fontSize: "0.95rem" }}>
                              ${parseFloat(order.totals?.grandTotal || order.grandTotal || 0).toFixed(2)}
                            </span>

                            <button onClick={() => setActiveTab("orders")} className="btn btn-outline" style={{ padding: "0.35rem 0.75rem", fontSize: "0.775rem" }}>
                              Details
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: ORDER HISTORY & PROOFS */}
            {activeTab === "orders" && (
              <div className="card" style={{ padding: "2rem", border: "1px solid hsl(var(--border-hsl))" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", borderBottom: "1px solid hsl(var(--border-hsl))", paddingBottom: "1rem" }}>
                  <div>
                    <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "hsl(var(--primary-hsl))" }}>Order History & Print Proofs</h2>
                    <p style={{ fontSize: "0.825rem", color: "hsl(var(--muted-hsl))", marginTop: "0.2rem" }}>
                      Track SinaLite print status, inspect digital proofs, and view custom apparel mockups.
                    </p>
                  </div>
                </div>

                {loadingOrders ? (
                  <div style={{ textAlign: "center", padding: "4rem", color: "hsl(var(--muted-hsl))" }}>
                    <RefreshCw size={24} style={{ animation: "spin 1.5s linear infinite", margin: "0 auto 0.5rem auto" }} />
                    Loading orders...
                  </div>
                ) : orders.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "4rem", color: "hsl(var(--muted-hsl))" }}>
                    <ShoppingBag size={48} style={{ margin: "0 auto 1rem auto", opacity: 0.4 }} />
                    <h3 style={{ fontWeight: 700, fontSize: "1.1rem" }}>No print orders found</h3>
                    <p style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>Start browsing commercial business cards, banners, and apparel.</p>
                    <Link href="/products" className="btn btn-primary" style={{ marginTop: "1.25rem", display: "inline-flex" }}>
                      Browse Products
                    </Link>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    {orders.map((order) => {
                      const statusUpper = (order.status || "PROCESSING").toUpperCase();
                      const isShipped = ["SHIPPED", "COMPLETED", "DELIVERED"].includes(statusUpper);

                      return (
                        <div 
                          key={order.id} 
                          style={{
                            borderRadius: "var(--radius-md)",
                            border: "1px solid hsl(var(--border-hsl))",
                            backgroundColor: "#ffffff",
                            overflow: "hidden",
                            boxShadow: "0 4px 15px rgba(0, 0, 0, 0.03)"
                          }}
                        >
                          {/* Order Card Header */}
                          <div style={{
                            padding: "1rem 1.25rem",
                            backgroundColor: "hsl(var(--secondary-hsl) / 0.5)",
                            borderBottom: "1px solid hsl(var(--border-hsl))",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "1rem"
                          }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                                <span style={{ fontWeight: 800, fontSize: "0.95rem" }}>Order #{order.id}</span>
                                {order.sinaliteOrderId && (
                                  <span style={{ fontSize: "0.725rem", backgroundColor: "hsl(var(--primary-hsl) / 0.1)", color: "hsl(var(--primary-hsl))", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: "4px" }}>
                                    SinaLite Job #{order.sinaliteOrderId}
                                  </span>
                                )}
                              </div>
                              <p style={{ fontSize: "0.775rem", color: "hsl(var(--muted-hsl))", marginTop: "0.15rem" }}>
                                Placed on {order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleDateString() : "Recent"}
                              </p>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
                              <span style={{
                                padding: "0.25rem 0.75rem",
                                borderRadius: "20px",
                                fontSize: "0.75rem",
                                fontWeight: 800,
                                textTransform: "uppercase",
                                backgroundColor: isShipped ? "hsl(var(--success-hsl) / 0.15)" : "hsl(var(--accent-hsl) / 0.15)",
                                color: isShipped ? "hsl(var(--success-hsl))" : "hsl(var(--accent-hsl))"
                              }}>
                                {statusUpper}
                              </span>

                              <span style={{ fontSize: "1.1rem", fontWeight: 900, color: "hsl(var(--primary-hsl))" }}>
                                ${parseFloat(order.totals?.grandTotal || order.grandTotal || 0).toFixed(2)} <span style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))" }}>CAD</span>
                              </span>
                            </div>
                          </div>

                          {/* Tracking Number Callout Banner (If Available) */}
                          {order.shippingTrackingNumber || order.shipping && (
                            <div style={{
                              padding: "0.65rem 1.25rem",
                              backgroundColor: "hsl(var(--accent-hsl) / 0.08)",
                              borderBottom: "1px solid hsl(var(--border-hsl))",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.6rem",
                              fontSize: "0.825rem"
                            }}>
                              <Truck size={16} style={{ color: "hsl(var(--accent-hsl))" }} />
                              <span>Tracking Number: <strong>{order.shippingTrackingNumber || order.shipping}</strong></span>
                            </div>
                          )}

                          {/* Order Items List */}
                          <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                            {order.items?.map((item, idx) => (
                              <div 
                                key={idx} 
                                style={{
                                  display: "flex",
                                  alignItems: "flex-start",
                                  justifyContent: "space-between",
                                  paddingBottom: idx === order.items.length - 1 ? 0 : "1rem",
                                  borderBottom: idx === order.items.length - 1 ? "none" : "1px dashed hsl(var(--border-hsl))",
                                  gap: "1rem"
                                }}
                              >
                                <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                                  <img 
                                    src={item.image || item.mockupUrl || "/Apex-Workwear-Logo-Horizontal.webp"} 
                                    alt={item.name} 
                                    style={{ width: "48px", height: "48px", objectFit: "contain", borderRadius: "6px", backgroundColor: "#f8fafc", padding: "4px" }} 
                                  />
                                  <div>
                                    <h4 style={{ fontSize: "0.925rem", fontWeight: 700 }}>{item.name}</h4>
                                    <p style={{ fontSize: "0.8rem", color: "hsl(var(--muted-hsl))", marginTop: "0.15rem" }}>
                                      Qty: {item.quantity} {item.optionSummary ? `• ${item.optionSummary}` : ""}
                                    </p>

                                    {/* Proof Reviewer Link if SinaLite Webhook Proof is Ready */}
                                    {item.reviewURL && (
                                      <div style={{ marginTop: "0.4rem" }}>
                                        <a
                                          href={item.reviewURL}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "0.35rem",
                                            fontSize: "0.775rem",
                                            fontWeight: 700,
                                            color: "hsl(var(--accent-hsl))",
                                            textDecoration: "underline"
                                          }}
                                        >
                                          <FileCheck size={14} /> Review Official Print Proof File <ExternalLink size={12} />
                                        </a>
                                      </div>
                                    )}

                                    {/* Uploaded Artworks */}
                                    {item.artworkFiles?.length > 0 && (
                                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.35rem" }}>
                                        {item.artworkFiles.map((art, aIdx) => (
                                          <a
                                            key={aIdx}
                                            href={art.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                              fontSize: "0.75rem",
                                              backgroundColor: "hsl(var(--secondary-hsl))",
                                              padding: "0.2rem 0.5rem",
                                              borderRadius: "4px",
                                              color: "hsl(var(--foreground-hsl))",
                                              textDecoration: "none",
                                              display: "inline-flex",
                                              alignItems: "center",
                                              gap: "0.3rem"
                                            }}
                                          >
                                            📄 {art.name || `Artwork ${aIdx + 1}`}
                                          </a>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div style={{ textAlign: "right", flexShrink: 0 }}>
                                  <p style={{ fontWeight: 800, fontSize: "0.95rem" }}>
                                    ${((parseFloat(item.price || item.unitPrice || 0)) * (item.quantity || 1)).toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: SAVED ADDRESSES */}
            {activeTab === "addresses" && (
              <div className="card" style={{ padding: "2rem", border: "1px solid hsl(var(--border-hsl))" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", borderBottom: "1px solid hsl(var(--border-hsl))", paddingBottom: "1rem" }}>
                  <div>
                    <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "hsl(var(--primary-hsl))" }}>Saved Shipping Addresses</h2>
                    <p style={{ fontSize: "0.825rem", color: "hsl(var(--muted-hsl))", marginTop: "0.2rem" }}>
                      Manage destination addresses for fast local shipping lookup.
                    </p>
                  </div>
                  <button onClick={() => setShowAddressForm(!showAddressForm)} className="btn btn-primary" style={{ padding: "0.55rem 1.15rem", fontSize: "0.85rem" }}>
                    <Plus size={16} /> Add New Address
                  </button>
                </div>

                {showAddressForm && (
                  <form onSubmit={handleAddAddress} className="card" style={{ padding: "1.75rem", marginBottom: "2rem", display: "flex", flexDirection: "column", gap: "1rem", backgroundColor: "hsl(var(--secondary-hsl) / 0.3)" }}>
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 800 }}>New Destination Address</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div>
                        <label className="label">Address Label (e.g. Headquarters, Warehouse)</label>
                        <input className="input" value={addressName} onChange={(e) => setAddressName(e.target.value)} placeholder="Headquarters" required />
                      </div>
                      <div>
                        <label className="label">Phone Number</label>
                        <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="416-555-0199" required />
                      </div>
                    </div>
                    <div>
                      <label className="label">Street Address Line 1</label>
                      <input className="input" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} placeholder="123 Industrial Parkway" required />
                    </div>
                    <div>
                      <label className="label">Suite, Unit, Building (Optional)</label>
                      <input className="input" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} placeholder="Suite 400" />
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
                      <label htmlFor="default-check" style={{ fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}>Set as default shipping address</label>
                    </div>
                    <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
                      <button type="submit" className="btn btn-primary" style={{ padding: "0.55rem 1.5rem" }}>Save Address</button>
                      <button type="button" onClick={() => setShowAddressForm(false)} className="btn btn-secondary" style={{ padding: "0.55rem 1.5rem" }}>Cancel</button>
                    </div>
                  </form>
                )}

                {(!userData?.addresses || userData.addresses.length === 0) ? (
                  <div style={{ textAlign: "center", padding: "4rem", color: "hsl(var(--muted-hsl))" }}>
                    <MapPin size={48} style={{ strokeWidth: 1, margin: "0 auto 1rem auto", opacity: 0.4 }} />
                    <p style={{ fontWeight: 600 }}>No saved addresses found</p>
                    <p style={{ fontSize: "0.8rem", marginTop: "0.25rem" }}>Add your commercial shipping address for instant rate quotes.</p>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem" }}>
                    {userData.addresses.map((addr) => (
                      <div 
                        key={addr.id} 
                        className="card" 
                        style={{
                          position: "relative",
                          border: addr.isDefault ? "2px solid hsl(var(--accent-hsl))" : "1px solid hsl(var(--border-hsl))",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between"
                        }}
                      >
                        <div>
                          {addr.isDefault && (
                            <span style={{
                              position: "absolute",
                              top: "1rem",
                              right: "1rem",
                              backgroundColor: "hsl(var(--accent-hsl))",
                              color: "#ffffff",
                              fontSize: "0.675rem",
                              fontWeight: 800,
                              padding: "0.15rem 0.5rem",
                              borderRadius: "10px",
                              textTransform: "uppercase"
                            }}>
                              Default
                            </span>
                          )}
                          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "0.5rem", paddingRight: "4rem" }}>{addr.name}</h3>
                          <p style={{ fontSize: "0.875rem", color: "hsl(var(--foreground-hsl) / 0.85)", lineHeight: 1.5 }}>
                            {addr.addressLine1}
                            {addr.addressLine2 && `, ${addr.addressLine2}`}
                          </p>
                          <p style={{ fontSize: "0.875rem", color: "hsl(var(--foreground-hsl) / 0.85)", lineHeight: 1.5 }}>
                            {addr.city}, {addr.state} {addr.zip}
                          </p>
                          <p style={{ fontSize: "0.825rem", color: "hsl(var(--muted-hsl))", marginTop: "0.5rem" }}>
                            {addr.country} • {addr.phone}
                          </p>
                        </div>

                        <div style={{ marginTop: "1.25rem", paddingTop: "0.75rem", borderTop: "1px solid hsl(var(--border-hsl))" }}>
                          <button
                            onClick={() => handleDeleteAddress(addr.id)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "hsl(var(--destructive-hsl))",
                              cursor: "pointer",
                              fontSize: "0.8rem",
                              fontWeight: 700,
                              display: "flex",
                              alignItems: "center",
                              gap: "0.35rem"
                            }}
                          >
                            <Trash2 size={14} /> Delete Address
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: PROFILE & SECURITY */}
            {activeTab === "profile" && (
              <div className="card" style={{ padding: "2rem", border: "1px solid hsl(var(--border-hsl))" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", borderBottom: "1px solid hsl(var(--border-hsl))", paddingBottom: "1rem" }}>
                  <div>
                    <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "hsl(var(--primary-hsl))" }}>Account & Profile Settings</h2>
                    <p style={{ fontSize: "0.825rem", color: "hsl(var(--muted-hsl))", marginTop: "0.2rem" }}>
                      Manage account identity, contact details, and organization info.
                    </p>
                  </div>
                  {!isEditingProfile && (
                    <button onClick={() => setIsEditingProfile(true)} className="btn btn-outline" style={{ padding: "0.55rem 1.15rem", fontSize: "0.85rem" }}>
                      <Edit3 size={16} /> Edit Profile
                    </button>
                  )}
                </div>

                {profileSuccess && (
                  <div style={{ padding: "0.85rem 1.25rem", backgroundColor: "hsl(var(--success-hsl) / 0.15)", color: "hsl(var(--success-hsl))", borderRadius: "var(--radius-md)", fontSize: "0.875rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
                    <CheckCircle2 size={18} /> Profile details successfully updated!
                  </div>
                )}

                {isEditingProfile ? (
                  <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
                      <div>
                        <label className="label">Full Name</label>
                        <input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} required />
                      </div>
                      <div>
                        <label className="label">Company / Business Name</label>
                        <input className="input" value={editCompany} onChange={(e) => setEditCompany(e.target.value)} placeholder="Apex Commercial Inc." />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
                      <div>
                        <label className="label">Phone Number</label>
                        <input className="input" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="416-555-0199" />
                      </div>
                      <div>
                        <label className="label">Email Address (Read-only)</label>
                        <input className="input" value={user.email} disabled style={{ backgroundColor: "hsl(var(--secondary-hsl))" }} />
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
                      <button type="submit" className="btn btn-primary" style={{ padding: "0.6rem 1.5rem" }} disabled={savingProfile}>
                        {savingProfile ? <><RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} /> Saving...</> : <><Save size={16} /> Save Changes</>}
                      </button>
                      <button type="button" onClick={() => setIsEditingProfile(false)} className="btn btn-secondary" style={{ padding: "0.6rem 1.5rem" }}>
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1.5rem" }}>
                    <div style={{ padding: "1.25rem", backgroundColor: "hsl(var(--secondary-hsl) / 0.4)", borderRadius: "var(--radius-md)" }}>
                      <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "hsl(var(--muted-hsl))", textTransform: "uppercase" }}>Full Name</p>
                      <p style={{ fontSize: "1.05rem", fontWeight: 800, marginTop: "0.25rem" }}>{userData?.name || user.email.split("@")[0]}</p>
                    </div>

                    <div style={{ padding: "1.25rem", backgroundColor: "hsl(var(--secondary-hsl) / 0.4)", borderRadius: "var(--radius-md)" }}>
                      <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "hsl(var(--muted-hsl))", textTransform: "uppercase" }}>Email Address</p>
                      <p style={{ fontSize: "1.05rem", fontWeight: 800, marginTop: "0.25rem", overflow: "hidden", textOverflow: "ellipsis" }}>{user.email}</p>
                    </div>

                    <div style={{ padding: "1.25rem", backgroundColor: "hsl(var(--secondary-hsl) / 0.4)", borderRadius: "var(--radius-md)" }}>
                      <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "hsl(var(--muted-hsl))", textTransform: "uppercase" }}>Company / Business</p>
                      <p style={{ fontSize: "1.05rem", fontWeight: 800, marginTop: "0.25rem" }}>{userData?.company || "Not specified"}</p>
                    </div>

                    <div style={{ padding: "1.25rem", backgroundColor: "hsl(var(--secondary-hsl) / 0.4)", borderRadius: "var(--radius-md)" }}>
                      <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "hsl(var(--muted-hsl))", textTransform: "uppercase" }}>Phone Contact</p>
                      <p style={{ fontSize: "1.05rem", fontWeight: 800, marginTop: "0.25rem" }}>{userData?.phone || "Not specified"}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />

      <style jsx global>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @media (max-width: 900px) {
          .account-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

