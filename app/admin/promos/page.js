"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { 
  Ticket, 
  Plus, 
  Search, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Edit2, 
  Copy, 
  Check, 
  Percent, 
  DollarSign, 
  Layers, 
  ShoppingBag, 
  Globe, 
  Users, 
  Calendar, 
  ArrowRight,
  Filter,
  RefreshCw,
  AlertCircle,
  HelpCircle
} from "lucide-react";

export default function AdminPromosPage() {
  const [promos, setPromos] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [filterScope, setFilterScope] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [codeMode, setCodeMode] = useState("auto"); // "auto" | "manual"
  const [code, setCode] = useState("");
  const [codePrefix, setCodePrefix] = useState("APEX");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState("percentage"); // "percentage" | "flat"
  const [discountValue, setDiscountValue] = useState("10");
  const [scope, setScope] = useState("site"); // "site" | "category" | "product"
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [categorySearch, setCategorySearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [usageType, setUsageType] = useState("one_per_customer"); // "one_per_customer" | "multiple_per_customer"
  const [perCustomerLimit, setPerCustomerLimit] = useState("");
  const [maxSiteUses, setMaxSiteUses] = useState("");
  const [minOrderSubtotal, setMinOrderSubtotal] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Copied state
  const [copiedCode, setCopiedCode] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      // 1. Fetch Promos
      const res = await fetch("/api/admin/promos");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load promo codes");
      setPromos(data.promos || []);

      // 2. Fetch Categories
      const catSnap = await getDocs(collection(db, "categories"));
      const catList = [];
      catSnap.forEach(d => catList.push({ id: d.id, ...d.data() }));
      catList.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setCategories(catList);

      // 3. Fetch Products
      const prodSnap = await getDocs(collection(db, "products"));
      const prodList = [];
      prodSnap.forEach(d => prodList.push({ id: d.id, ...d.data() }));
      prodList.sort((a, b) => (a.name || a.sinalite?.name || "").localeCompare(b.name || b.sinalite?.name || ""));
      setProducts(prodList);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCopyCode = (promoCode) => {
    navigator.clipboard.writeText(promoCode);
    setCopiedCode(promoCode);
    setTimeout(() => setCopiedCode(""), 2000);
  };

  const handleGenerateRandomCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let randomPart = "";
    for (let i = 0; i < 4; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const year = new Date().getFullYear().toString().slice(-2);
    const newGenCode = `${codePrefix || "APEX"}-${randomPart}${year}`.toUpperCase();
    setCode(newGenCode);
  };

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setCodeMode("auto");
    setCodePrefix("APEX");
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let randomPart = "";
    for (let i = 0; i < 4; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const year = new Date().getFullYear().toString().slice(-2);
    setCode(`APEX-${randomPart}${year}`);
    setDescription("");
    setDiscountType("percentage");
    setDiscountValue("15");
    setScope("site");
    setSelectedCategories([]);
    setSelectedProducts([]);
    setUsageType("one_per_customer");
    setPerCustomerLimit("");
    setMaxSiteUses("");
    setMinOrderSubtotal("");
    setExpiryDate("");
    setIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (promo) => {
    setEditingId(promo.id);
    setCodeMode("manual");
    setCode(promo.code || "");
    setDescription(promo.description || "");
    setDiscountType(promo.discountType || "percentage");
    setDiscountValue(String(promo.discountValue || "0"));
    setScope(promo.scope || "site");
    setSelectedCategories(promo.applicableCategoryIds || []);
    setSelectedProducts((promo.applicableProductIds || []).map(String));
    setUsageType(promo.usageType || "one_per_customer");
    setPerCustomerLimit(promo.perCustomerLimit ? String(promo.perCustomerLimit) : "");
    setMaxSiteUses(promo.maxSiteUses ? String(promo.maxSiteUses) : "");
    setMinOrderSubtotal(promo.minOrderSubtotal ? String(promo.minOrderSubtotal) : "");
    setExpiryDate(promo.expiryDate || "");
    setIsActive(promo.isActive !== false);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const payload = {
        code: code.trim().toUpperCase(),
        autoGenerate: codeMode === "auto" && !code.trim(),
        prefix: codePrefix,
        description,
        discountType,
        discountValue: parseFloat(discountValue),
        scope,
        applicableCategoryIds: scope === "category" ? selectedCategories : [],
        applicableProductIds: scope === "product" ? selectedProducts : [],
        usageType,
        perCustomerLimit: usageType === "multiple_per_customer" && perCustomerLimit ? parseInt(perCustomerLimit) : null,
        maxSiteUses: maxSiteUses ? parseInt(maxSiteUses) : null,
        minOrderSubtotal: minOrderSubtotal ? parseFloat(minOrderSubtotal) : null,
        expiryDate: expiryDate || null,
        isActive: Boolean(isActive)
      };

      let res;
      if (editingId) {
        res = await fetch("/api/admin/promos", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId, ...payload })
        });
      } else {
        res = await fetch("/api/admin/promos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save promo code");

      setSuccessMsg(editingId ? "Promo code updated successfully!" : "Promo code created successfully!");
      setTimeout(() => setSuccessMsg(""), 3500);
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to save promo code");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (promo) => {
    const newStatus = !promo.isActive;
    try {
      const res = await fetch("/api/admin/promos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: promo.id, isActive: newStatus })
      });
      if (res.ok) {
        setPromos(prev => prev.map(p => p.id === promo.id ? { ...p, isActive: newStatus } : p));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (promoId, promoCode) => {
    if (!confirm(`Are you sure you want to permanently delete promo code "${promoCode}"?`)) return;
    try {
      const res = await fetch(`/api/admin/promos?id=${promoId}`, { method: "DELETE" });
      if (res.ok) {
        setPromos(prev => prev.filter(p => p.id !== promoId));
      } else {
        const d = await res.json();
        alert(d.error || "Failed to delete promo code");
      }
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  // Filtered List
  const filteredPromos = promos.filter(p => {
    const matchesSearch = (p.code || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesScope = filterScope === "all" || p.scope === filterScope;

    const isExpired = p.expiryDate && new Date(p.expiryDate) < new Date();
    let matchesStatus = true;
    if (filterStatus === "active") matchesStatus = p.isActive && !isExpired;
    if (filterStatus === "inactive") matchesStatus = !p.isActive;
    if (filterStatus === "expired") matchesStatus = isExpired;

    return matchesSearch && matchesScope && matchesStatus;
  });

  // Stats calculation
  const totalPromos = promos.length;
  const activePromos = promos.filter(p => p.isActive && (!p.expiryDate || new Date(p.expiryDate) >= new Date())).length;
  const totalRedemptions = promos.reduce((sum, p) => sum + (p.usedCount || 0), 0);

  return (
    <div style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <div style={{ padding: "0.5rem", borderRadius: "8px", backgroundColor: "#1E293B", color: "#60A5FA" }}>
              <Ticket size={24} />
            </div>
            <h1 style={{ fontSize: "1.875rem", fontWeight: 800, color: "#0F172A", letterSpacing: "-0.025em" }}>
              Promo Codes & Discounts
            </h1>
          </div>
          <p style={{ color: "#64748B", fontSize: "0.95rem" }}>
            Create and manage site-wide, category-wise, or product-specific discount vouchers with custom customer limits.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="btn btn-primary"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            backgroundColor: "#2563EB",
            color: "#FFFFFF",
            padding: "0.65rem 1.25rem",
            borderRadius: "8px",
            fontWeight: 600,
            fontSize: "0.9rem",
            boxShadow: "0 2px 4px rgba(37,99,235,0.2)"
          }}
        >
          <Plus size={18} /> Create Promo Code
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div style={{ backgroundColor: "#ECFDF5", border: "1px solid #10B981", color: "#065F46", padding: "0.75rem 1rem", borderRadius: "8px", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <CheckCircle2 size={18} style={{ color: "#10B981" }} />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #EF4444", color: "#991B1B", padding: "0.75rem 1rem", borderRadius: "8px", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <AlertCircle size={18} style={{ color: "#EF4444" }} />
          <span>{error}</span>
        </div>
      )}

      {/* Metric Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <div className="card" style={{ padding: "1.25rem", backgroundColor: "#FFFFFF", borderRadius: "10px", border: "1px solid #E2E8F0" }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748B", textTransform: "uppercase" }}>Total Coupons</span>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0F172A", marginTop: "0.25rem" }}>{totalPromos}</div>
          <span style={{ fontSize: "0.75rem", color: "#94A3B8" }}>Created campaigns</span>
        </div>

        <div className="card" style={{ padding: "1.25rem", backgroundColor: "#FFFFFF", borderRadius: "10px", border: "1px solid #E2E8F0" }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#10B981", textTransform: "uppercase" }}>Active Codes</span>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#10B981", marginTop: "0.25rem" }}>{activePromos}</div>
          <span style={{ fontSize: "0.75rem", color: "#94A3B8" }}>Ready to redeem in checkout</span>
        </div>

        <div className="card" style={{ padding: "1.25rem", backgroundColor: "#FFFFFF", borderRadius: "10px", border: "1px solid #E2E8F0" }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#3B82F6", textTransform: "uppercase" }}>Total Redemptions</span>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#2563EB", marginTop: "0.25rem" }}>{totalRedemptions}</div>
          <span style={{ fontSize: "0.75rem", color: "#94A3B8" }}>Orders completed with discounts</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ backgroundColor: "#FFFFFF", padding: "1rem", borderRadius: "10px", border: "1px solid #E2E8F0", marginBottom: "1.5rem", display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: "1 1 300px" }}>
          <div style={{ position: "relative", width: "100%" }}>
            <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }} />
            <input
              type="text"
              placeholder="Search code or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "0.55rem 0.75rem 0.55rem 2.25rem",
                borderRadius: "6px",
                border: "1px solid #CBD5E1",
                fontSize: "0.9rem",
                outline: "none"
              }}
            />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", color: "#64748B", fontWeight: 600 }}>Scope:</span>
            <select
              value={filterScope}
              onChange={(e) => setFilterScope(e.target.value)}
              style={{ padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "0.85rem", backgroundColor: "#FFFFFF" }}
            >
              <option value="all">All Scopes</option>
              <option value="site">Site-wide</option>
              <option value="category">Category-wise</option>
              <option value="product">Product-wise</option>
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", color: "#64748B", fontWeight: 600 }}>Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "0.85rem", backgroundColor: "#FFFFFF" }}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
              <option value="expired">Expired Only</option>
            </select>
          </div>

          <button
            onClick={fetchData}
            style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #CBD5E1", backgroundColor: "#F8FAFC", fontSize: "0.85rem", cursor: "pointer", color: "#475569" }}
            title="Refresh list"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Promos Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", backgroundColor: "#FFFFFF", borderRadius: "10px", border: "1px solid #E2E8F0" }}>
          <RefreshCw size={32} className="animate-spin" style={{ color: "#3B82F6", margin: "0 auto 1rem" }} />
          <p style={{ color: "#64748B" }}>Loading promo codes...</p>
        </div>
      ) : filteredPromos.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 2rem", backgroundColor: "#FFFFFF", borderRadius: "10px", border: "1px dashed #CBD5E1" }}>
          <Ticket size={48} style={{ color: "#CBD5E1", margin: "0 auto 1rem" }} />
          <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#1E293B" }}>No promo codes found</h3>
          <p style={{ color: "#64748B", fontSize: "0.9rem", maxWidth: "400px", margin: "0.5rem auto 1.5rem" }}>
            {searchQuery || filterScope !== "all" || filterStatus !== "all"
              ? "No promo codes match your current filters. Try changing or clearing filters."
              : "You haven't created any promotional discount codes yet. Create your first code now!"}
          </p>
          <button onClick={handleOpenCreateModal} className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
            <Plus size={16} /> Create First Promo Code
          </button>
        </div>
      ) : (
        <div style={{ backgroundColor: "#FFFFFF", borderRadius: "10px", border: "1px solid #E2E8F0", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid #E2E8F0", color: "#64748B", fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  <th style={{ padding: "0.9rem 1.25rem" }}>Promo Code</th>
                  <th style={{ padding: "0.9rem 1.25rem" }}>Discount</th>
                  <th style={{ padding: "0.9rem 1.25rem" }}>Scope</th>
                  <th style={{ padding: "0.9rem 1.25rem" }}>Usage Limit & Rules</th>
                  <th style={{ padding: "0.9rem 1.25rem" }}>Redemptions</th>
                  <th style={{ padding: "0.9rem 1.25rem" }}>Status / Expiry</th>
                  <th style={{ padding: "0.9rem 1.25rem", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody style={{ divideY: "1px solid #E2E8F0" }}>
                {filteredPromos.map(promo => {
                  const isExpired = promo.expiryDate && new Date(promo.expiryDate) < new Date();
                  const isSiteWide = promo.scope === "site";
                  const isCategoryWise = promo.scope === "category";
                  const isProductWise = promo.scope === "product";

                  return (
                    <tr key={promo.id} style={{ borderBottom: "1px solid #F1F5F9", transition: "background-color 0.15s ease" }}>
                      {/* Code */}
                      <td style={{ padding: "1rem 1.25rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{
                            fontFamily: "monospace",
                            fontWeight: 800,
                            fontSize: "0.95rem",
                            backgroundColor: "#F1F5F9",
                            color: "#0F172A",
                            padding: "0.25rem 0.5rem",
                            borderRadius: "6px",
                            border: "1px solid #E2E8F0",
                            letterSpacing: "0.05em"
                          }}>
                            {promo.code}
                          </span>
                          <button
                            onClick={() => handleCopyCode(promo.code)}
                            title="Copy code"
                            style={{ background: "none", border: "none", cursor: "pointer", color: copiedCode === promo.code ? "#10B981" : "#94A3B8" }}
                          >
                            {copiedCode === promo.code ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                        </div>
                        {promo.description && (
                          <div style={{ fontSize: "0.75rem", color: "#64748B", marginTop: "0.25rem" }}>
                            {promo.description}
                          </div>
                        )}
                      </td>

                      {/* Discount */}
                      <td style={{ padding: "1rem 1.25rem" }}>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          fontWeight: 700,
                          fontSize: "0.9rem",
                          color: promo.discountType === "percentage" ? "#2563EB" : "#059669",
                          backgroundColor: promo.discountType === "percentage" ? "#EFF6FF" : "#ECFDF5",
                          padding: "0.2rem 0.6rem",
                          borderRadius: "9999px"
                        }}>
                          {promo.discountType === "percentage" ? (
                            <><Percent size={13} /> {promo.discountValue}% OFF</>
                          ) : (
                            <><DollarSign size={13} /> ${parseFloat(promo.discountValue).toFixed(2)} CAD OFF</>
                          )}
                        </span>
                        {promo.minOrderSubtotal && (
                          <div style={{ fontSize: "0.72rem", color: "#64748B", marginTop: "0.2rem" }}>
                            Min order: ${parseFloat(promo.minOrderSubtotal).toFixed(2)}
                          </div>
                        )}
                      </td>

                      {/* Scope */}
                      <td style={{ padding: "1rem 1.25rem" }}>
                        {isSiteWide && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.8rem", color: "#475569", backgroundColor: "#F1F5F9", padding: "0.2rem 0.5rem", borderRadius: "6px" }}>
                            <Globe size={13} /> Entire Site
                          </span>
                        )}
                        {isCategoryWise && (
                          <div>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.8rem", color: "#7C3AED", backgroundColor: "#F5F3FF", padding: "0.2rem 0.5rem", borderRadius: "6px", fontWeight: 600 }}>
                              <Layers size={13} /> {promo.applicableCategoryIds?.length || 0} Categories
                            </span>
                            <div style={{ fontSize: "0.7rem", color: "#94A3B8", marginTop: "0.2rem", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {(promo.applicableCategoryIds || []).map(cid => categories.find(c => c.id === cid)?.name || cid).join(", ")}
                            </div>
                          </div>
                        )}
                        {isProductWise && (
                          <div>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.8rem", color: "#D97706", backgroundColor: "#FFFBEB", padding: "0.2rem 0.5rem", borderRadius: "6px", fontWeight: 600 }}>
                              <ShoppingBag size={13} /> {promo.applicableProductIds?.length || 0} Products
                            </span>
                            <div style={{ fontSize: "0.7rem", color: "#94A3B8", marginTop: "0.2rem", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {(promo.applicableProductIds || []).map(pid => {
                                const found = products.find(pr => String(pr.id) === String(pid));
                                return found ? (found.name || found.sinalite?.name) : pid;
                              }).join(", ")}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Usage Rules */}
                      <td style={{ padding: "1rem 1.25rem" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", fontSize: "0.8rem" }}>
                          <span style={{ color: "#334155", fontWeight: 600 }}>
                            {promo.usageType === "one_per_customer" ? (
                              "1 use per customer"
                            ) : promo.perCustomerLimit ? (
                              `Max ${promo.perCustomerLimit} per customer`
                            ) : (
                              "Multiple per customer (unlimited)"
                            )}
                          </span>
                          {promo.maxSiteUses ? (
                            <span style={{ color: "#64748B", fontSize: "0.75rem" }}>
                              Max {promo.maxSiteUses} total site uses
                            </span>
                          ) : (
                            <span style={{ color: "#94A3B8", fontSize: "0.75rem" }}>
                              No total site limit
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Redemptions */}
                      <td style={{ padding: "1rem 1.25rem" }}>
                        <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0F172A" }}>
                          {promo.usedCount || 0}
                          {promo.maxSiteUses && (
                            <span style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 500 }}>
                              {" "}/ {promo.maxSiteUses}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: "0.72rem", color: "#94A3B8" }}>orders</span>
                      </td>

                      {/* Status / Expiry */}
                      <td style={{ padding: "1rem 1.25rem" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                          {isExpired ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", color: "#DC2626", fontSize: "0.75rem", fontWeight: 700 }}>
                              <XCircle size={12} /> Expired
                            </span>
                          ) : promo.isActive ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", color: "#16A34A", fontSize: "0.75rem", fontWeight: 700 }}>
                              <CheckCircle2 size={12} /> Active
                            </span>
                          ) : (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", color: "#64748B", fontSize: "0.75rem", fontWeight: 700 }}>
                              <XCircle size={12} /> Disabled
                            </span>
                          )}

                          <span style={{ fontSize: "0.72rem", color: "#64748B" }}>
                            {promo.expiryDate ? `Exp: ${promo.expiryDate}` : "No expiry"}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "1rem 1.25rem", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                          <button
                            onClick={() => handleToggleStatus(promo)}
                            title={promo.isActive ? "Deactivate promo" : "Activate promo"}
                            style={{
                              padding: "0.35rem 0.65rem",
                              borderRadius: "6px",
                              border: "1px solid #CBD5E1",
                              backgroundColor: promo.isActive ? "#FEF2F2" : "#F0FDF4",
                              color: promo.isActive ? "#DC2626" : "#16A34A",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              cursor: "pointer"
                            }}
                          >
                            {promo.isActive ? "Disable" : "Enable"}
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(promo)}
                            title="Edit promo code"
                            style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid #CBD5E1", backgroundColor: "#FFFFFF", color: "#475569", cursor: "pointer" }}
                          >
                            <Edit2 size={14} />
                          </button>

                          <button
                            onClick={() => handleDelete(promo.id, promo.code)}
                            title="Delete promo code"
                            style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid #FCA5A5", backgroundColor: "#FEF2F2", color: "#EF4444", cursor: "pointer" }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(15, 23, 42, 0.65)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          zIndex: 9999,
          overflowY: "auto"
        }}>
          <div style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "12px",
            width: "100%",
            maxWidth: "700px",
            maxHeight: "90vh",
            overflowY: "auto",
            padding: "2rem",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            border: "1px solid #E2E8F0"
          }}>
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E2E8F0", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Ticket size={20} style={{ color: "#2563EB" }} />
                <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0F172A" }}>
                  {editingId ? "Edit Promo Code" : "Create New Promo Code"}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "#94A3B8" }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {/* Code Generation Section */}
              <div style={{ backgroundColor: "#F8FAFC", padding: "1.25rem", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#1E293B", marginBottom: "0.5rem" }}>
                  Promo Code Generation Mode
                </label>
                
                <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1rem" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", cursor: "pointer", fontWeight: 600 }}>
                    <input
                      type="radio"
                      name="codeMode"
                      value="auto"
                      checked={codeMode === "auto"}
                      onChange={() => {
                        setCodeMode("auto");
                        handleGenerateRandomCode();
                      }}
                    />
                    <Sparkles size={14} style={{ color: "#2563EB" }} /> Auto-Generate
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", cursor: "pointer", fontWeight: 600 }}>
                    <input
                      type="radio"
                      name="codeMode"
                      value="manual"
                      checked={codeMode === "manual"}
                      onChange={() => setCodeMode("manual")}
                    />
                    Manual Entry
                  </label>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: codeMode === "auto" ? "1fr auto" : "1fr", gap: "0.75rem", alignItems: "center" }}>
                  <div>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. APEX-SAVE20"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      required
                      style={{
                        fontFamily: "monospace",
                        fontWeight: 800,
                        letterSpacing: "0.08em",
                        fontSize: "1.05rem",
                        textTransform: "uppercase"
                      }}
                    />
                  </div>

                  {codeMode === "auto" && (
                    <button
                      type="button"
                      onClick={handleGenerateRandomCode}
                      className="btn btn-outline"
                      style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.8rem", whiteSpace: "nowrap" }}
                    >
                      <Sparkles size={14} /> Regenerate
                    </button>
                  )}
                </div>

                <div style={{ marginTop: "0.75rem" }}>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#64748B", marginBottom: "0.25rem" }}>
                    Campaign Description (Internal Note)
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. 15% off Summer Launch for Contractors"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={{ fontSize: "0.85rem" }}
                  />
                </div>
              </div>

              {/* Discount Settings */}
              <div>
                <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 700, color: "#1E293B", marginBottom: "0.5rem" }}>
                  Discount Amount & Type
                </label>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#64748B", marginBottom: "0.25rem" }}>
                      Discount Calculation
                    </label>
                    <select
                      className="input"
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value)}
                      style={{ fontSize: "0.9rem" }}
                    >
                      <option value="percentage">Percentage Discount (% OFF)</option>
                      <option value="flat">Flat Dollar Amount ($ CAD OFF)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#64748B", marginBottom: "0.25rem" }}>
                      {discountType === "percentage" ? "Percentage Value (1 - 100%)" : "Flat Amount ($ CAD)"}
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="number"
                        className="input"
                        min="1"
                        max={discountType === "percentage" ? "100" : "99999"}
                        step={discountType === "percentage" ? "1" : "1"}
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        required
                        style={{ fontSize: "0.9rem", fontWeight: 700 }}
                      />
                      <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#94A3B8", fontWeight: 700 }}>
                        {discountType === "percentage" ? "%" : "CAD"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scope Settings */}
              <div>
                <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 700, color: "#1E293B", marginBottom: "0.5rem" }}>
                  Promo Code Scope (Eligible Products)
                </label>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
                  <label style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.75rem",
                    borderRadius: "8px",
                    border: `1.5px solid ${scope === "site" ? "#2563EB" : "#E2E8F0"}`,
                    backgroundColor: scope === "site" ? "#EFF6FF" : "#FFFFFF",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    fontWeight: 600
                  }}>
                    <input
                      type="radio"
                      name="scope"
                      value="site"
                      checked={scope === "site"}
                      onChange={() => setScope("site")}
                    />
                    <Globe size={16} style={{ color: scope === "site" ? "#2563EB" : "#64748B" }} />
                    Site-Wide
                  </label>

                  <label style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.75rem",
                    borderRadius: "8px",
                    border: `1.5px solid ${scope === "category" ? "#7C3AED" : "#E2E8F0"}`,
                    backgroundColor: scope === "category" ? "#F5F3FF" : "#FFFFFF",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    fontWeight: 600
                  }}>
                    <input
                      type="radio"
                      name="scope"
                      value="category"
                      checked={scope === "category"}
                      onChange={() => setScope("category")}
                    />
                    <Layers size={16} style={{ color: scope === "category" ? "#7C3AED" : "#64748B" }} />
                    Category-Wise
                  </label>

                  <label style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.75rem",
                    borderRadius: "8px",
                    border: `1.5px solid ${scope === "product" ? "#D97706" : "#E2E8F0"}`,
                    backgroundColor: scope === "product" ? "#FFFBEB" : "#FFFFFF",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    fontWeight: 600
                  }}>
                    <input
                      type="radio"
                      name="scope"
                      value="product"
                      checked={scope === "product"}
                      onChange={() => setScope("product")}
                    />
                    <ShoppingBag size={16} style={{ color: scope === "product" ? "#D97706" : "#64748B" }} />
                    Product-Wise
                  </label>
                </div>

                {/* Category Picker Subpanel */}
                {scope === "category" && (
                  <div style={{ backgroundColor: "#F8FAFC", padding: "1rem", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                      <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#1E293B" }}>
                        Select Eligible Categories ({selectedCategories.length} selected):
                      </span>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          type="button"
                          onClick={() => setSelectedCategories(categories.map(c => c.id))}
                          style={{ fontSize: "0.75rem", color: "#2563EB", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedCategories([])}
                          style={{ fontSize: "0.75rem", color: "#64748B", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                        >
                          Deselect All
                        </button>
                      </div>
                    </div>

                    <input
                      type="text"
                      placeholder="Filter categories..."
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      style={{ width: "100%", padding: "0.4rem 0.6rem", fontSize: "0.8rem", borderRadius: "4px", border: "1px solid #CBD5E1", marginBottom: "0.75rem" }}
                    />

                    <div style={{ maxHeight: "150px", overflowY: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
                      {categories
                        .filter(c => (c.name || "").toLowerCase().includes(categorySearch.toLowerCase()))
                        .map(cat => {
                          const checked = selectedCategories.includes(cat.id);
                          return (
                            <label key={cat.id} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", cursor: "pointer", backgroundColor: checked ? "#EFF6FF" : "#FFFFFF", padding: "0.3rem 0.5rem", borderRadius: "4px", border: "1px solid #E2E8F0" }}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedCategories(prev => [...prev, cat.id]);
                                  } else {
                                    setSelectedCategories(prev => prev.filter(id => id !== cat.id));
                                  }
                                }}
                              />
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cat.name || cat.id}</span>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Product Picker Subpanel */}
                {scope === "product" && (
                  <div style={{ backgroundColor: "#F8FAFC", padding: "1rem", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                      <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#1E293B" }}>
                        Select Eligible Products ({selectedProducts.length} selected):
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedProducts([])}
                        style={{ fontSize: "0.75rem", color: "#64748B", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                      >
                        Clear Selection
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="Search product name or SKU..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      style={{ width: "100%", padding: "0.4rem 0.6rem", fontSize: "0.8rem", borderRadius: "4px", border: "1px solid #CBD5E1", marginBottom: "0.75rem" }}
                    />

                    <div style={{ maxHeight: "170px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                      {products
                        .filter(pr => (pr.name || pr.sinalite?.name || "").toLowerCase().includes(productSearch.toLowerCase()))
                        .slice(0, 100)
                        .map(prod => {
                          const pIdStr = String(prod.id);
                          const checked = selectedProducts.includes(pIdStr);
                          return (
                            <label key={prod.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", cursor: "pointer", backgroundColor: checked ? "#FFFBEB" : "#FFFFFF", padding: "0.35rem 0.6rem", borderRadius: "4px", border: "1px solid #E2E8F0" }}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedProducts(prev => [...prev, pIdStr]);
                                  } else {
                                    setSelectedProducts(prev => prev.filter(id => id !== pIdStr));
                                  }
                                }}
                              />
                              <span style={{ fontWeight: 600, color: "#0F172A" }}>{prod.name || prod.sinalite?.name}</span>
                              <span style={{ color: "#94A3B8", fontSize: "0.75rem" }}>({pIdStr})</span>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              {/* Usage Limits & Customer Rules */}
              <div style={{ backgroundColor: "#F8FAFC", padding: "1.25rem", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 700, color: "#1E293B", marginBottom: "0.75rem" }}>
                  Usage Rules & Restrictions
                </label>

                {/* Usage per Customer */}
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.4rem" }}>
                    Customer Usage Limit:
                  </label>
                  <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "center" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", cursor: "pointer", fontWeight: 600 }}>
                      <input
                        type="radio"
                        name="usageType"
                        value="one_per_customer"
                        checked={usageType === "one_per_customer"}
                        onChange={() => setUsageType("one_per_customer")}
                      />
                      One per customer (1 order per email)
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", cursor: "pointer", fontWeight: 600 }}>
                      <input
                        type="radio"
                        name="usageType"
                        value="multiple_per_customer"
                        checked={usageType === "multiple_per_customer"}
                        onChange={() => setUsageType("multiple_per_customer")}
                      />
                      Multiple per customer
                    </label>
                  </div>

                  {usageType === "multiple_per_customer" && (
                    <div style={{ marginTop: "0.5rem", maxWidth: "250px" }}>
                      <label style={{ display: "block", fontSize: "0.75rem", color: "#64748B", marginBottom: "0.2rem" }}>
                        Max uses per customer (leave blank for unlimited):
                      </label>
                      <input
                        type="number"
                        className="input"
                        min="1"
                        placeholder="e.g. 3"
                        value={perCustomerLimit}
                        onChange={(e) => setPerCustomerLimit(e.target.value)}
                        style={{ fontSize: "0.85rem" }}
                      />
                    </div>
                  )}
                </div>

                {/* Total Site-Wide Usage Limit & Min Subtotal */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#64748B", marginBottom: "0.25rem" }}>
                      Total Max Site Redemptions (Leave blank for unlimited)
                    </label>
                    <input
                      type="number"
                      className="input"
                      min="1"
                      placeholder="e.g. 100"
                      value={maxSiteUses}
                      onChange={(e) => setMaxSiteUses(e.target.value)}
                      style={{ fontSize: "0.85rem" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#64748B", marginBottom: "0.25rem" }}>
                      Minimum Order Subtotal (CAD) (Leave blank for none)
                    </label>
                    <input
                      type="number"
                      className="input"
                      min="0"
                      step="0.01"
                      placeholder="e.g. 50.00"
                      value={minOrderSubtotal}
                      onChange={(e) => setMinOrderSubtotal(e.target.value)}
                      style={{ fontSize: "0.85rem" }}
                    />
                  </div>
                </div>

                {/* Expiration Date & Active Status */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#64748B", marginBottom: "0.25rem" }}>
                      Expiry Date (Optional)
                    </label>
                    <input
                      type="date"
                      className="input"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      style={{ fontSize: "0.85rem" }}
                    />
                  </div>

                  <div style={{ display: "flex", alignItems: "center", marginTop: "1.2rem" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.85rem", fontWeight: 700 }}>
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        style={{ width: "16px", height: "16px" }}
                      />
                      Enable & Activate Code Immediately
                    </label>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-outline"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
                >
                  {submitting && <RefreshCw size={14} className="animate-spin" />}
                  {editingId ? "Update Promo Code" : "Save & Publish Promo Code"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
