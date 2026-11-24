"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  serverTimestamp,
  query,
  orderBy
} from "firebase/firestore";
import Link from "next/link";
import { 
  FolderTree, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Shirt, 
  Upload, 
  Sparkles,
  ArrowUpDown,
  Tag,
  Eye,
  EyeOff
} from "lucide-react";

const DEFAULT_APPAREL_TAXONOMIES = [
  { name: "T-Shirts", slug: "t-shirts", description: "Crewneck, v-neck, heavy cotton, and moisture-wicking tees", displayOrder: 1, isVisible: true },
  { name: "Hoodies & Sweatshirts", slug: "hoodies-sweatshirts", description: "Fleece pullovers, full-zip hooded jackets, and crewneck sweaters", displayOrder: 2, isVisible: true },
  { name: "Headwear & Caps", slug: "headwear-caps", description: "Structured snapbacks, dad hats, beanies, and trucker caps", displayOrder: 3, isVisible: true },
  { name: "Jackets & Outerwear", slug: "jackets-outerwear", description: "Windbreakers, softshells, workwear coats, and insulated outerwear", displayOrder: 4, isVisible: true },
  { name: "Polo Shirts", slug: "polo-shirts", description: "Pique knit and performance golf polos for professional uniforms", displayOrder: 5, isVisible: true },
  { name: "Safety Vests & High-Vis", slug: "safety-vests", description: "CSA/ANSI compliant high-visibility safety wear and construction gear", displayOrder: 6, isVisible: true },
  { name: "Bags & Accessories", slug: "bags-accessories", description: "Custom tote bags, backpacks, aprons, and branded merchandise", displayOrder: 7, isVisible: true },
];

export default function AdminApparelCategoriesPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [productCounts, setProductCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Create form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDisplayOrder, setNewDisplayOrder] = useState(1);
  const [newHeroImage, setNewHeroImage] = useState("");
  const [newSaleDiscount, setNewSaleDiscount] = useState("");
  const [newFulfillmentOption, setNewFulfillmentOption] = useState("both"); // "both" | "shipping_only" | "pickup_only"

  // Edit state
  const [editingCategory, setEditingCategory] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/apparel-categories");
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load apparel categories");
      }
      setCategories(data.categories || []);
      setProductCounts(data.productCounts || {});
    } catch (err) {
      console.error("Error fetching apparel categories:", err);
      setError("Failed to load apparel categories: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNameChange = (val) => {
    setNewName(val);
    if (!newSlug || newSlug === generateSlug(newName)) {
      setNewSlug(generateSlug(val));
    }
  };

  const generateSlug = (str) => {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleUploadHeroImage = async (e, isEditing = false) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    setError("");
    try {
      const idToken = await user.getIdToken();
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { "Authorization": `Bearer ${idToken}` },
        body: formData,
      });

      if (!res.ok) throw new Error("Image upload failed");
      const data = await res.json();

      if (isEditing && editingCategory) {
        setEditingCategory({ ...editingCategory, heroImage: data.url });
      } else {
        setNewHeroImage(data.url);
      }
    } catch (err) {
      setError("Image upload failed: " + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveNew = async (e) => {
    e.preventDefault();
    if (!newName.trim()) {
      setError("Category name is required");
      return;
    }

    setSaving(true);
    setError("");
    const slug = newSlug.trim() || generateSlug(newName);

    try {
      const payload = {
        name: newName.trim(),
        slug: slug,
        description: newDescription.trim() || "",
        heroImage: newHeroImage || "",
        displayOrder: Number(newDisplayOrder) || 1,
        isVisible: true,
        saleDiscountPercent: Number(newSaleDiscount) > 0 ? Number(newSaleDiscount) : null,
        fulfillmentOption: newFulfillmentOption || "both",
      };

      const res = await fetch("/api/admin/apparel-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: payload, id: slug })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create category");
      }

      setSuccess(`Apparel category "${newName}" created successfully!`);
      setShowCreateModal(false);
      setNewName("");
      setNewSlug("");
      setNewDescription("");
      setNewHeroImage("");
      setNewSaleDiscount("");
      setNewFulfillmentOption("both");
      setNewDisplayOrder(categories.length + 2);
      await fetchCategories();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      console.error("Error creating category:", err);
      setError("Failed to create category: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingCategory || !editingCategory.name.trim()) return;

    setSaving(true);
    setError("");
    try {
      const payload = {
        name: editingCategory.name.trim(),
        description: editingCategory.description || "",
        heroImage: editingCategory.heroImage || "",
        displayOrder: Number(editingCategory.displayOrder) || 1,
        isVisible: editingCategory.isVisible !== false,
        saleDiscountPercent: Number(editingCategory.saleDiscountPercent) > 0 ? Number(editingCategory.saleDiscountPercent) : null,
        fulfillmentOption: editingCategory.fulfillmentOption || "both",
      };

      const res = await fetch("/api/admin/apparel-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingCategory.id, category: payload })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update category");
      }

      setSuccess(`Category "${editingCategory.name}" updated!`);
      setEditingCategory(null);
      await fetchCategories();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      console.error("Error updating category:", err);
      setError("Failed to update category: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Are you sure you want to delete the apparel category "${name}"?`)) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/apparel-categories?id=${encodeURIComponent(id)}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete category");
      }

      setSuccess(`Category "${name}" deleted.`);
      await fetchCategories();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      console.error("Error deleting category:", err);
      setError("Failed to delete category: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSeedDefaults = async () => {
    if (!confirm("This will seed standard apparel categories (T-Shirts, Hoodies, Headwear, Jackets, Polos, Safety Vests, Bags). Continue?")) return;

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/apparel-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed" })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to seed defaults");
      }

      setSuccess("Default apparel categories seeded successfully!");
      await fetchCategories();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError("Failed to seed default categories: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", paddingBottom: "4rem" }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "2rem",
        flexWrap: "wrap",
        gap: "1rem"
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#64748B", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
            <Link href="/admin/apparel" style={{ color: "#2563EB", textDecoration: "none", fontWeight: 600 }}>
              Apparel
            </Link>
            <span>/</span>
            <span>Taxonomy</span>
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0F172A", display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <FolderTree size={26} style={{ color: "#2563EB" }} />
            Apparel Taxonomy & Categories
          </h1>
          <p style={{ color: "#64748B", fontSize: "0.9rem", marginTop: "0.25rem" }}>
            Manage apparel categories independently from print products. Used across garment builders, filters, and apparel navigation.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          {categories.length === 0 && (
            <button
              onClick={handleSeedDefaults}
              disabled={saving}
              className="btn btn-secondary"
              style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
            >
              <Sparkles size={16} />
              Seed Defaults
            </button>
          )}

          <button
            onClick={() => {
              setNewDisplayOrder(categories.length + 1);
              setShowCreateModal(true);
            }}
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            <Plus size={16} />
            Add Apparel Category
          </button>
        </div>
      </div>

      {/* Alert Messages */}
      {error && (
        <div style={{
          backgroundColor: "#FEF2F2",
          border: "1px solid #F87171",
          borderRadius: "8px",
          padding: "0.85rem 1.25rem",
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          color: "#991B1B",
          fontSize: "0.9rem"
        }}>
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {success && (
        <div style={{
          backgroundColor: "#F0FDF4",
          border: "1px solid #4ADE80",
          borderRadius: "8px",
          padding: "0.85rem 1.25rem",
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          color: "#166534",
          fontSize: "0.9rem"
        }}>
          <CheckCircle2 size={20} />
          {success}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "4rem",
          color: "#64748B",
          gap: "0.75rem",
          backgroundColor: "#FFFFFF",
          borderRadius: "12px",
          border: "1px solid #E2E8F0"
        }}>
          <Loader2 className="animate-spin" size={24} style={{ color: "#2563EB" }} />
          <span>Loading apparel categories...</span>
        </div>
      ) : categories.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: "4rem 2rem",
          backgroundColor: "#FFFFFF",
          borderRadius: "12px",
          border: "1px dashed #CBD5E1"
        }}>
          <Shirt size={48} style={{ color: "#94A3B8", margin: "0 auto 1rem" }} />
          <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#1E293B", marginBottom: "0.5rem" }}>
            No Apparel Categories Yet
          </h3>
          <p style={{ color: "#64748B", fontSize: "0.9rem", maxWidth: "460px", margin: "0 auto 1.5rem" }}>
            Create custom apparel categories or seed the standard presets (T-Shirts, Hoodies, Headwear, Jackets, etc.) to get started.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "1rem" }}>
            <button onClick={handleSeedDefaults} className="btn btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
              <Sparkles size={16} /> Seed Default Categories
            </button>
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
              <Plus size={16} /> Create New Category
            </button>
          </div>
        </div>
      ) : (
        /* Categories Table */
        <div style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "12px",
          border: "1px solid #E2E8F0",
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
            <thead>
              <tr style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid #E2E8F0", color: "#64748B", fontWeight: 700 }}>
                <th style={{ padding: "0.85rem 1rem", width: "70px", textAlign: "center" }}>Order</th>
                <th style={{ padding: "0.85rem 1rem" }}>Category</th>
                <th style={{ padding: "0.85rem 1rem" }}>Description</th>
                <th style={{ padding: "0.85rem 1rem", width: "100px", textAlign: "center" }}>Products</th>
                <th style={{ padding: "0.85rem 1rem", width: "110px", textAlign: "center" }}>Sale %</th>
                <th style={{ padding: "0.85rem 1rem", width: "90px", textAlign: "center" }}>Status</th>
                <th style={{ padding: "0.85rem 1rem", width: "120px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, idx) => {
                const count = productCounts[cat.id] || productCounts[cat.name] || 0;
                const isVisible = cat.isVisible !== false;

                return (
                  <tr 
                    key={cat.id} 
                    style={{ 
                      borderBottom: idx < categories.length - 1 ? "1px solid #F1F5F9" : "none",
                      backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#FAFAFA",
                      transition: "background 0.15s ease"
                    }}
                  >
                    <td style={{ padding: "0.85rem 1rem", textAlign: "center", fontWeight: 700, color: "#64748B" }}>
                      {cat.displayOrder ?? idx + 1}
                    </td>

                    <td style={{ padding: "0.85rem 1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        {cat.heroImage ? (
                          <img 
                            src={cat.heroImage} 
                            alt={cat.name} 
                            style={{ width: "36px", height: "36px", objectFit: "cover", borderRadius: "6px", border: "1px solid #E2E8F0" }} 
                          />
                        ) : (
                          <div style={{ width: "36px", height: "36px", borderRadius: "6px", backgroundColor: "#EFF6FF", color: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Shirt size={18} />
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 800, color: "#0F172A" }}>{cat.name}</div>
                          <div style={{ fontSize: "0.75rem", color: "#94A3B8" }}>Slug: {cat.slug || cat.id}</div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: "0.85rem 1rem", color: "#64748B", maxWidth: "340px" }}>
                      <div style={{ display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {cat.description || "—"}
                      </div>
                    </td>

                    <td style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
                      <span style={{
                        display: "inline-block",
                        padding: "0.15rem 0.6rem",
                        borderRadius: "100px",
                        backgroundColor: count > 0 ? "#EFF6FF" : "#F1F5F9",
                        color: count > 0 ? "#2563EB" : "#94A3B8",
                        fontWeight: 700,
                        fontSize: "0.8rem"
                      }}>
                        {count} styles
                      </span>
                    </td>

                    <td style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
                      {cat.saleDiscountPercent ? (
                        <span style={{
                          display: "inline-block",
                          padding: "0.15rem 0.5rem",
                          borderRadius: "4px",
                          backgroundColor: "#FEF2F2",
                          color: "#DC2626",
                          fontWeight: 800,
                          fontSize: "0.78rem"
                        }}>
                          -{cat.saleDiscountPercent}%
                        </span>
                      ) : (
                        <span style={{ color: "#CBD5E1" }}>—</span>
                      )}
                    </td>

                    <td style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.3rem",
                        padding: "0.15rem 0.5rem",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        backgroundColor: isVisible ? "#F0FDF4" : "#F1F5F9",
                        color: isVisible ? "#16A34A" : "#94A3B8"
                      }}>
                        {isVisible ? "Active" : "Hidden"}
                      </span>
                    </td>

                    <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                        <button
                          onClick={() => setEditingCategory({ ...cat })}
                          title="Edit Category"
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "0.35rem",
                            color: "#475569",
                            borderRadius: "4px"
                          }}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(cat.id, cat.name)}
                          title="Delete Category"
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "0.35rem",
                            color: "#EF4444",
                            borderRadius: "4px"
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Create Category */}
      {showCreateModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(15,23,42,0.6)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999,
          padding: "1rem"
        }}>
          <div style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "14px",
            width: "100%",
            maxWidth: "520px",
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
            overflow: "hidden"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "1.25rem 1.5rem",
              borderBottom: "1px solid #E2E8F0"
            }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0F172A", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Plus size={18} style={{ color: "#2563EB" }} />
                New Apparel Category
              </h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8" }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveNew} style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                  Category Name *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Hoodies & Fleece"
                  required
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.85rem",
                    borderRadius: "6px",
                    border: "1px solid #CBD5E1",
                    fontSize: "0.9rem"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                  Slug (URL Key)
                </label>
                <input
                  type="text"
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value)}
                  placeholder="e.g. hoodies-fleece"
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.85rem",
                    borderRadius: "6px",
                    border: "1px solid #CBD5E1",
                    fontSize: "0.9rem"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                  Description
                </label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Brief summary of styles in this category..."
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.85rem",
                    borderRadius: "6px",
                    border: "1px solid #CBD5E1",
                    fontSize: "0.9rem",
                    resize: "vertical"
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={newDisplayOrder}
                    onChange={(e) => setNewDisplayOrder(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.85rem",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E1",
                      fontSize: "0.9rem"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                    Sale Discount %
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={newSaleDiscount}
                    onChange={(e) => setNewSaleDiscount(e.target.value)}
                    placeholder="Optional (e.g. 15)"
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.85rem",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E1",
                      fontSize: "0.9rem"
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                  Category Fulfillment Eligibility
                </label>
                <select
                  value={newFulfillmentOption}
                  onChange={(e) => setNewFulfillmentOption(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.85rem",
                    borderRadius: "6px",
                    border: "1px solid #CBD5E1",
                    fontSize: "0.9rem"
                  }}
                >
                  <option value="both">📦 Both Courier Delivery & In-Store Pickup</option>
                  <option value="shipping_only">🚚 Courier Delivery Only</option>
                  <option value="pickup_only">🏬 In-Store Pickup Only</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                  Hero / Thumbnail Image
                </label>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                  {newHeroImage && (
                    <img 
                      src={newHeroImage} 
                      alt="Preview" 
                      style={{ width: "40px", height: "40px", borderRadius: "6px", objectFit: "cover", border: "1px solid #CBD5E1" }} 
                    />
                  )}
                  <label style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.55rem 0.85rem",
                    borderRadius: "6px",
                    border: "1px solid #CBD5E1",
                    backgroundColor: "#F8FAFC",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    color: "#334155"
                  }}>
                    <Upload size={14} />
                    {uploadingImage ? "Uploading..." : "Upload Image"}
                    <input type="file" accept="image/*" onChange={(e) => handleUploadHeroImage(e, false)} style={{ display: "none" }} />
                  </label>
                  {newHeroImage && (
                    <button
                      type="button"
                      onClick={() => setNewHeroImage("")}
                      style={{ background: "none", border: "none", color: "#EF4444", fontSize: "0.8rem", cursor: "pointer" }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                  style={{ padding: "0.6rem 1rem" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                  style={{ padding: "0.6rem 1.25rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
                >
                  {saving && <Loader2 className="animate-spin" size={16} />}
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Category */}
      {editingCategory && (
        <div style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(15,23,42,0.6)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999,
          padding: "1rem"
        }}>
          <div style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "14px",
            width: "100%",
            maxWidth: "520px",
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
            overflow: "hidden"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "1.25rem 1.5rem",
              borderBottom: "1px solid #E2E8F0"
            }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0F172A", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Edit size={18} style={{ color: "#2563EB" }} />
                Edit Category: {editingCategory.name}
              </h3>
              <button onClick={() => setEditingCategory(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8" }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdate} style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                  Category Name *
                </label>
                <input
                  type="text"
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  required
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.85rem",
                    borderRadius: "6px",
                    border: "1px solid #CBD5E1",
                    fontSize: "0.9rem"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editingCategory.description || ""}
                  onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.85rem",
                    borderRadius: "6px",
                    border: "1px solid #CBD5E1",
                    fontSize: "0.9rem",
                    resize: "vertical"
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={editingCategory.displayOrder ?? 1}
                    onChange={(e) => setEditingCategory({ ...editingCategory, displayOrder: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.85rem",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E1",
                      fontSize: "0.9rem"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                    Sale Discount %
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={editingCategory.saleDiscountPercent || ""}
                    onChange={(e) => setEditingCategory({ ...editingCategory, saleDiscountPercent: e.target.value })}
                    placeholder="Optional"
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.85rem",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E1",
                      fontSize: "0.9rem"
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                  Category Fulfillment Eligibility
                </label>
                <select
                  value={editingCategory.fulfillmentOption || "both"}
                  onChange={(e) => setEditingCategory({ ...editingCategory, fulfillmentOption: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.85rem",
                    borderRadius: "6px",
                    border: "1px solid #CBD5E1",
                    fontSize: "0.9rem"
                  }}
                >
                  <option value="both">📦 Both Courier Delivery & In-Store Pickup</option>
                  <option value="shipping_only">🚚 Courier Delivery Only</option>
                  <option value="pickup_only">🏬 In-Store Pickup Only</option>
                </select>
              </div>

              <div>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", fontWeight: 700, color: "#334155", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={editingCategory.isVisible !== false}
                    onChange={(e) => setEditingCategory({ ...editingCategory, isVisible: e.target.checked })}
                  />
                  Visible in Apparel Catalog & Filters
                </label>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                  Hero Image
                </label>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                  {editingCategory.heroImage && (
                    <img 
                      src={editingCategory.heroImage} 
                      alt="Preview" 
                      style={{ width: "40px", height: "40px", borderRadius: "6px", objectFit: "cover", border: "1px solid #CBD5E1" }} 
                    />
                  )}
                  <label style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.55rem 0.85rem",
                    borderRadius: "6px",
                    border: "1px solid #CBD5E1",
                    backgroundColor: "#F8FAFC",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    color: "#334155"
                  }}>
                    <Upload size={14} />
                    {uploadingImage ? "Uploading..." : "Upload New Image"}
                    <input type="file" accept="image/*" onChange={(e) => handleUploadHeroImage(e, true)} style={{ display: "none" }} />
                  </label>
                  {editingCategory.heroImage && (
                    <button
                      type="button"
                      onClick={() => setEditingCategory({ ...editingCategory, heroImage: "" })}
                      style={{ background: "none", border: "none", color: "#EF4444", fontSize: "0.8rem", cursor: "pointer" }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="btn btn-secondary"
                  style={{ padding: "0.6rem 1rem" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                  style={{ padding: "0.6rem 1.25rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
                >
                  {saving && <Loader2 className="animate-spin" size={16} />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

