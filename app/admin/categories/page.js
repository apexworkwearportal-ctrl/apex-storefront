"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, query, orderBy } from "firebase/firestore";
import { Save, Upload, Edit, Trash2, ArrowRight, Loader2, AlertCircle, Plus, Percent, DollarSign, Sliders } from "lucide-react";

export default function AdminCategoriesPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Editing form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [heroImage, setHeroImage] = useState("");
  const [displayOrder, setDisplayOrder] = useState(0);
  const [showOnHome, setShowOnHome] = useState(true);
  const [homeOrder, setHomeOrder] = useState(0);
  const [parentId, setParentId] = useState("");
  const [useCustomMarkup, setUseCustomMarkup] = useState(false);
  const [markupType, setMarkupType] = useState("percentage"); // "percentage" or "tiers"
  const [markupPercent, setMarkupPercent] = useState(30);
  const [setupCharge, setSetupCharge] = useState(0);
  const [quantityTiers, setQuantityTiers] = useState([
    { minQty: 1, maxQty: 25, markupPercent: 45 },
    { minQty: 26, maxQty: 100, markupPercent: 35 },
    { minQty: 101, maxQty: 500, markupPercent: 25 },
    { minQty: 501, maxQty: 99999, markupPercent: 20 }
  ]);

  // Create form states
  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newHeroImage, setNewHeroImage] = useState("");
  const [newDisplayOrder, setNewDisplayOrder] = useState(0);
  const [newShowOnHome, setNewShowOnHome] = useState(true);
  const [newHomeOrder, setNewHomeOrder] = useState(0);
  const [newParentId, setNewParentId] = useState("");
  const [newUseCustomMarkup, setNewUseCustomMarkup] = useState(false);
  const [newMarkupType, setNewMarkupType] = useState("percentage");
  const [newMarkupPercent, setNewMarkupPercent] = useState(30);
  const [newSetupCharge, setNewSetupCharge] = useState(0);
  const [newQuantityTiers, setNewQuantityTiers] = useState([
    { minQty: 1, maxQty: 25, markupPercent: 45 },
    { minQty: 26, maxQty: 100, markupPercent: 35 },
    { minQty: 101, maxQty: 500, markupPercent: 25 },
    { minQty: 501, maxQty: 99999, markupPercent: 20 }
  ]);
  
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [faqs, setFaqs] = useState([]);
  const [newFaqs, setNewFaqs] = useState([]);

  // FAQ Handlers
  const handleAddFaq = () => setFaqs([...faqs, { question: "", answer: "" }]);
  const handleUpdateFaq = (index, field, value) => setFaqs(faqs.map((f, i) => i === index ? { ...f, [field]: value } : f));
  const handleRemoveFaq = (index) => setFaqs(faqs.filter((_, i) => i !== index));

  const handleAddNewFaq = () => setNewFaqs([...newFaqs, { question: "", answer: "" }]);
  const handleUpdateNewFaq = (index, field, value) => setNewFaqs(newFaqs.map((f, i) => i === index ? { ...f, [field]: value } : f));
  const handleRemoveNewFaq = (index) => setNewFaqs(newFaqs.filter((_, i) => i !== index));

  // Tier Handlers
  const handleAddTier = (isNew = false) => {
    const list = isNew ? newQuantityTiers : quantityTiers;
    const last = list[list.length - 1];
    const newMin = last ? last.maxQty + 1 : 1;
    const item = { minQty: newMin, maxQty: newMin + 50, markupPercent: 20 };
    if (isNew) setNewQuantityTiers([...list, item]);
    else setQuantityTiers([...list, item]);
  };

  const handleRemoveTier = (idx, isNew = false) => {
    if (isNew) setNewQuantityTiers(newQuantityTiers.filter((_, i) => i !== idx));
    else setQuantityTiers(quantityTiers.filter((_, i) => i !== idx));
  };

  const handleTierChange = (idx, field, value, isNew = false) => {
    const list = isNew ? newQuantityTiers : quantityTiers;
    const updated = list.map((t, i) => i === idx ? { ...t, [field]: parseFloat(value) || 0 } : t);
    if (isNew) setNewQuantityTiers(updated);
    else setQuantityTiers(updated);
  };

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "categories"), orderBy("displayOrder", "asc"));
      const snapshot = await getDocs(q);
      const list = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setCategories(list);
    } catch (err) {
      console.error("Error loading categories:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleEditClick = (cat) => {
    setEditingId(cat.id);
    setName(cat.name || "");
    setDescription(cat.description || "");
    setHeroImage(cat.heroImage || "");
    setDisplayOrder(cat.displayOrder || 0);
    setShowOnHome(cat.showOnHome !== false);
    setHomeOrder(cat.homeOrder !== undefined ? cat.homeOrder : (cat.displayOrder || 0));
    setParentId(cat.parentId || "");
    setFaqs(cat.faqs || []);
    setUseCustomMarkup(Boolean(cat.useCustomMarkup));
    setMarkupType(cat.markupType || "percentage");
    setMarkupPercent(cat.markupPercent !== undefined ? cat.markupPercent : 30);
    setSetupCharge(cat.setupCharge || 0);
    setQuantityTiers(cat.quantityTiers || [
      { minQty: 1, maxQty: 25, markupPercent: 45 },
      { minQty: 26, maxQty: 100, markupPercent: 35 },
      { minQty: 101, maxQty: 500, markupPercent: 25 },
      { minQty: 501, maxQty: 99999, markupPercent: 20 }
    ]);
    setError("");
  };

  const handleUploadHeroImage = async (e, isNewForm = false) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
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

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload hero image.");

      if (isNewForm) setNewHeroImage(data.url);
      else setHeroImage(data.url);
    } catch (err) {
      console.error(err);
      setError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const catRef = doc(db, "categories", editingId);
      await updateDoc(catRef, {
        name,
        description,
        heroImage,
        displayOrder: parseInt(displayOrder) || 0,
        showOnHome: Boolean(showOnHome),
        homeOrder: parseInt(homeOrder) || 0,
        parentId: parentId || null,
        faqs: faqs || [],
        useCustomMarkup: Boolean(useCustomMarkup),
        markupType,
        markupPercent: parseFloat(markupPercent) || 0,
        setupCharge: parseFloat(setupCharge) || 0,
        quantityTiers: quantityTiers || []
      });
      
      setEditingId(null);
      await fetchCategories();
    } catch (err) {
      console.error("Error updating category:", err);
      setError("Failed to save category updates: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError("");

    const slug = newId.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-");
    if (!slug) {
      setError("Please specify a valid Category ID / Slug.");
      setCreating(false);
      return;
    }

    try {
      const catRef = doc(db, "categories", slug);
      const snap = await getDoc(catRef);
      if (snap.exists()) {
        setError(`A category with ID "${slug}" already exists.`);
        setCreating(false);
        return;
      }

      await setDoc(catRef, {
        name: newName,
        description: newDescription,
        heroImage: newHeroImage,
        displayOrder: parseInt(newDisplayOrder) || 0,
        showOnHome: Boolean(newShowOnHome),
        homeOrder: parseInt(newHomeOrder) || 0,
        parentId: newParentId || null,
        faqs: newFaqs || [],
        useCustomMarkup: Boolean(newUseCustomMarkup),
        markupType: newMarkupType,
        markupPercent: parseFloat(newMarkupPercent) || 0,
        setupCharge: parseFloat(newSetupCharge) || 0,
        quantityTiers: newQuantityTiers || []
      });

      // Reset form states
      setNewId("");
      setNewName("");
      setNewDescription("");
      setNewHeroImage("");
      setNewDisplayOrder(0);
      setNewShowOnHome(true);
      setNewHomeOrder(0);
      setNewParentId("");
      setNewFaqs([]);
      setNewUseCustomMarkup(false);
      setNewMarkupType("percentage");
      setNewMarkupPercent(30);
      setNewSetupCharge(0);
      setShowCreateForm(false);

      await fetchCategories();
    } catch (err) {
      console.error("Error creating category:", err);
      setError("Failed to create category: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", marginBottom: "0.25rem" }}>Category Management & Pricing Rules</h1>
          <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.95rem" }}>
            Edit category hierarchy, hero images, description, home visibility, and category-level custom markup overrides.
          </p>
        </div>
        <button
          onClick={() => {
            setShowCreateForm(!showCreateForm);
            setError("");
          }}
          className="btn btn-primary"
          style={{ padding: "0.6rem 1.25rem", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          <Plus size={16} /> Create Category
        </button>
      </div>

      {error && (
        <div className="card" style={{ borderColor: "hsl(var(--destructive-hsl))", backgroundColor: "hsl(var(--destructive-hsl) / 0.05)", padding: "1rem", marginBottom: "1.5rem", color: "hsl(var(--destructive-hsl))", display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 600 }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* Create custom category form drawer */}
      {showCreateForm && (
        <div className="card" style={{ borderColor: "hsl(var(--accent-hsl))", padding: "2rem", marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "1.5rem", color: "hsl(var(--accent-hsl))" }}>Create Custom Category</h2>
          
          <form onSubmit={handleCreate} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
            {/* Left: inputs */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label className="label">Category Display Name</label>
                  <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Custom Hats" required />
                </div>
                <div>
                  <label className="label">Category ID / Slug</label>
                  <input className="input" value={newId} onChange={(e) => setNewId(e.target.value)} placeholder="e.g. custom-hats" required />
                </div>
              </div>

              <div>
                <label className="label">Parent Category</label>
                <select className="input" value={newParentId} onChange={(e) => setNewParentId(e.target.value)}>
                  <option value="">None (Top-Level Parent)</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label className="label">Catalog Order Index</label>
                  <input type="number" className="input" value={newDisplayOrder} onChange={(e) => setNewDisplayOrder(e.target.value)} required />
                </div>
                <div>
                  <label className="label">Home Page Order Index</label>
                  <input type="number" className="input" value={newHomeOrder} onChange={(e) => setNewHomeOrder(e.target.value)} required />
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: "0.25rem 0" }}>
                <input 
                  type="checkbox" 
                  id="newShowOnHome" 
                  checked={newShowOnHome} 
                  onChange={(e) => setNewShowOnHome(e.target.checked)}
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                />
                <label htmlFor="newShowOnHome" style={{ fontWeight: 600, fontSize: "0.9rem", cursor: "pointer", userSelect: "none" }}>
                  Show on Home Page
                </label>
              </div>

              {/* Category Markup Rule Box */}
              <div style={{ padding: "1rem", backgroundColor: "hsl(var(--secondary-hsl) / 0.25)", borderRadius: "var(--radius-md)", border: "1px solid hsl(var(--border-hsl))" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                  <input 
                    type="checkbox" 
                    id="newUseCustomMarkup" 
                    checked={newUseCustomMarkup} 
                    onChange={(e) => setNewUseCustomMarkup(e.target.checked)}
                    style={{ width: "18px", height: "18px", cursor: "pointer" }}
                  />
                  <label htmlFor="newUseCustomMarkup" style={{ fontWeight: 800, fontSize: "0.95rem", cursor: "pointer", userSelect: "none", color: "hsl(var(--primary-hsl))" }}>
                    Enable Category-Specific Custom Markup
                  </label>
                </div>

                {newUseCustomMarkup && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "0.5rem" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div>
                        <label className="label">Markup Type</label>
                        <select className="input" value={newMarkupType} onChange={(e) => setNewMarkupType(e.target.value)}>
                          <option value="percentage">Flat Percentage (%)</option>
                          <option value="tiers">Quantity Tiers</option>
                        </select>
                      </div>
                      <div>
                        <label className="label">Category Markup %</label>
                        <input type="number" step="0.1" className="input" value={newMarkupPercent} onChange={(e) => setNewMarkupPercent(e.target.value)} required />
                      </div>
                    </div>

                    <div>
                      <label className="label">Setup Charge ($ CAD)</label>
                      <input type="number" step="0.01" className="input" value={newSetupCharge} onChange={(e) => setNewSetupCharge(e.target.value)} />
                    </div>

                    {newMarkupType === "tiers" && (
                      <div style={{ marginTop: "0.5rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                          <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>Quantity Tier Table</span>
                          <button type="button" onClick={() => handleAddTier(true)} className="btn btn-outline" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>
                            + Add Tier
                          </button>
                        </div>
                        {newQuantityTiers.map((t, idx) => (
                          <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "0.5rem", marginBottom: "0.5rem", alignItems: "center" }}>
                            <input type="number" className="input" placeholder="Min" value={t.minQty} onChange={(e) => handleTierChange(idx, "minQty", e.target.value, true)} />
                            <input type="number" className="input" placeholder="Max" value={t.maxQty} onChange={(e) => handleTierChange(idx, "maxQty", e.target.value, true)} />
                            <input type="number" step="0.1" className="input" placeholder="%" value={t.markupPercent} onChange={(e) => handleTierChange(idx, "markupPercent", e.target.value, true)} />
                            {newQuantityTiers.length > 1 && (
                              <button type="button" onClick={() => handleRemoveTier(idx, true)} className="btn" style={{ color: "hsl(var(--destructive-hsl))", padding: "0.25rem" }}>
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="label">Category Description</label>
                <textarea className="input" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} rows={3} placeholder="Enter a promotional description..." />
              </div>
              <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
                <button type="submit" className="btn btn-primary" style={{ padding: "0.5rem 1.5rem" }} disabled={creating}>
                  {creating ? <Loader2 size={16} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={16} />}
                  Create Category
                </button>
                <button type="button" onClick={() => setShowCreateForm(false)} className="btn btn-secondary" style={{ padding: "0.5rem 1.5rem" }}>
                  Cancel
                </button>
              </div>
            </div>

            {/* Right: image upload */}
            <div>
              <label className="label">Hero Banner Image</label>
              {newHeroImage ? (
                <div style={{ position: "relative", marginBottom: "1rem", display: "inline-block", width: "100%" }}>
                  <img src={newHeroImage} alt="Hero render preview" style={{ height: "180px", width: "100%", objectFit: "cover", borderRadius: "var(--radius-md)" }} />
                  <button
                    type="button"
                    onClick={() => setNewHeroImage("")}
                    className="btn"
                    style={{
                      position: "absolute",
                      top: "0.5rem",
                      right: "0.5rem",
                      padding: "0.3rem",
                      backgroundColor: "rgba(220, 38, 38, 0.9)",
                      color: "white",
                      borderRadius: "50%",
                      border: "none",
                      cursor: "pointer"
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ) : (
                <div style={{
                  border: "2px dashed hsl(var(--border-hsl))",
                  borderRadius: "var(--radius-md)",
                  padding: "2rem",
                  textAlign: "center",
                  position: "relative",
                  cursor: uploading ? "not-allowed" : "pointer",
                  marginBottom: "1rem"
                }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleUploadHeroImage(e, true)}
                    disabled={uploading}
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      width: "100%",
                      height: "100%",
                      opacity: 0,
                      cursor: "pointer"
                    }}
                  />
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                    <Upload size={24} style={{ color: "hsl(var(--muted-hsl))" }} />
                    <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>{uploading ? "Uploading hero..." : "Upload Hero Banner"}</p>
                  </div>
                </div>
              )}
            </div>

            {/* FAQs Management Section */}
            <div style={{ gridColumn: "1 / -1", borderTop: "1px solid hsl(var(--border-hsl))", paddingTop: "1.5rem", marginTop: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "hsl(var(--primary-hsl))" }}>Category FAQs Accordion items</h3>
                <button
                  type="button"
                  onClick={handleAddNewFaq}
                  className="btn btn-outline"
                  style={{ padding: "0.4rem 1rem", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.25rem" }}
                >
                  <Plus size={14} /> Add FAQ Item
                </button>
              </div>

              {newFaqs.length === 0 ? (
                <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.85rem", fontStyle: "italic", margin: 0 }}>
                  No FAQs added for this category yet. Click "Add FAQ Item" to set dynamic FAQs.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {newFaqs.map((faq, index) => (
                    <div key={index} style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <input
                          className="input"
                          placeholder="FAQ Question (e.g. What sizes are available?)"
                          value={faq.question}
                          onChange={(e) => handleUpdateNewFaq(index, "question", e.target.value)}
                          required
                          style={{ fontSize: "0.85rem" }}
                        />
                        <textarea
                          className="input"
                          placeholder="FAQ Answer details..."
                          value={faq.answer}
                          onChange={(e) => handleUpdateNewFaq(index, "answer", e.target.value)}
                          required
                          rows={2}
                          style={{ fontSize: "0.85rem" }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveNewFaq(index)}
                        className="btn"
                        style={{
                          padding: "0.5rem",
                          backgroundColor: "hsl(var(--destructive-hsl) / 0.1)",
                          color: "hsl(var(--destructive-hsl))",
                          border: "none",
                          borderRadius: "var(--radius-sm)",
                          cursor: "pointer",
                          marginTop: "0.25rem"
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "hsl(var(--muted-hsl))" }}>
          Loading categories...
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.5rem" }}>
          {categories.map(cat => {
            const isEditing = editingId === cat.id;

            return (
              <div key={cat.id} className="card" style={{
                borderColor: isEditing ? "hsl(var(--accent-hsl))" : "hsl(var(--border-hsl))"
              }}>
                {isEditing ? (
                  <form onSubmit={handleSave} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
                    {/* Left: inputs */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      <div>
                        <label className="label">Category Display Name</label>
                        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
                      </div>

                      <div>
                        <label className="label">Parent Category</label>
                        <select className="input" value={parentId} onChange={(e) => setParentId(e.target.value)}>
                          <option value="">None (Top-Level Parent)</option>
                          {categories.filter(c => c.id !== editingId).map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <div>
                          <label className="label">Catalog Order Index</label>
                          <input type="number" className="input" value={displayOrder} onChange={(e) => setDisplayOrder(e.target.value)} required />
                        </div>
                        <div>
                          <label className="label">Home Page Order Index</label>
                          <input type="number" className="input" value={homeOrder} onChange={(e) => setHomeOrder(e.target.value)} required />
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: "0.25rem 0" }}>
                        <input 
                          type="checkbox" 
                          id="showOnHome" 
                          checked={showOnHome} 
                          onChange={(e) => setShowOnHome(e.target.checked)}
                          style={{ width: "18px", height: "18px", cursor: "pointer" }}
                        />
                        <label htmlFor="showOnHome" style={{ fontWeight: 600, fontSize: "0.9rem", cursor: "pointer", userSelect: "none" }}>
                          Show on Home Page
                        </label>
                      </div>

                      {/* Category Markup Rule Box */}
                      <div style={{ padding: "1rem", backgroundColor: "hsl(var(--secondary-hsl) / 0.25)", borderRadius: "var(--radius-md)", border: "1px solid hsl(var(--border-hsl))" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                          <input 
                            type="checkbox" 
                            id="useCustomMarkup" 
                            checked={useCustomMarkup} 
                            onChange={(e) => setUseCustomMarkup(e.target.checked)}
                            style={{ width: "18px", height: "18px", cursor: "pointer" }}
                          />
                          <label htmlFor="useCustomMarkup" style={{ fontWeight: 800, fontSize: "0.95rem", cursor: "pointer", userSelect: "none", color: "hsl(var(--primary-hsl))" }}>
                            Enable Category-Specific Custom Markup
                          </label>
                        </div>

                        {useCustomMarkup && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "0.5rem" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                              <div>
                                <label className="label">Markup Type</label>
                                <select className="input" value={markupType} onChange={(e) => setMarkupType(e.target.value)}>
                                  <option value="percentage">Flat Percentage (%)</option>
                                  <option value="tiers">Quantity Tiers</option>
                                </select>
                              </div>
                              <div>
                                <label className="label">Category Markup %</label>
                                <input type="number" step="0.1" className="input" value={markupPercent} onChange={(e) => setMarkupPercent(e.target.value)} required />
                              </div>
                            </div>

                            <div>
                              <label className="label">Setup Charge ($ CAD)</label>
                              <input type="number" step="0.01" className="input" value={setupCharge} onChange={(e) => setSetupCharge(e.target.value)} />
                            </div>

                            {markupType === "tiers" && (
                              <div style={{ marginTop: "0.5rem" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                                  <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>Quantity Tier Table</span>
                                  <button type="button" onClick={() => handleAddTier(false)} className="btn btn-outline" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>
                                    + Add Tier
                                  </button>
                                </div>
                                {quantityTiers.map((t, idx) => (
                                  <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "0.5rem", marginBottom: "0.5rem", alignItems: "center" }}>
                                    <input type="number" className="input" placeholder="Min" value={t.minQty} onChange={(e) => handleTierChange(idx, "minQty", e.target.value, false)} />
                                    <input type="number" className="input" placeholder="Max" value={t.maxQty} onChange={(e) => handleTierChange(idx, "maxQty", e.target.value, false)} />
                                    <input type="number" step="0.1" className="input" placeholder="%" value={t.markupPercent} onChange={(e) => handleTierChange(idx, "markupPercent", e.target.value, false)} />
                                    {quantityTiers.length > 1 && (
                                      <button type="button" onClick={() => handleRemoveTier(idx, false)} className="btn" style={{ color: "hsl(var(--destructive-hsl))", padding: "0.25rem" }}>
                                        <Trash2 size={14} />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="label">Category Description</label>
                        <textarea className="input" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Enter a promotional description..." />
                      </div>
                      <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
                        <button type="submit" className="btn btn-primary" style={{ padding: "0.5rem 1.5rem" }} disabled={saving}>
                          {saving ? <Loader2 size={16} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} /> : <Save size={16} />}
                          Save Category
                        </button>
                        <button type="button" onClick={() => setEditingId(null)} className="btn btn-secondary" style={{ padding: "0.5rem 1.5rem" }}>
                          Cancel
                        </button>
                      </div>
                    </div>

                    {/* Right: image upload */}
                    <div>
                      <label className="label">Hero Banner Image</label>
                      {heroImage ? (
                        <div style={{ position: "relative", marginBottom: "1rem", display: "inline-block", width: "100%" }}>
                          <img src={heroImage} alt="Hero render preview" style={{ height: "180px", width: "100%", objectFit: "cover", borderRadius: "var(--radius-md)" }} />
                          <button
                            type="button"
                            onClick={() => setHeroImage("")}
                            className="btn"
                            style={{
                              position: "absolute",
                              top: "0.5rem",
                              right: "0.5rem",
                              padding: "0.3rem",
                              backgroundColor: "rgba(220, 38, 38, 0.9)",
                              color: "white",
                              borderRadius: "50%",
                              border: "none",
                              cursor: "pointer"
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ) : (
                        <div style={{
                          border: "2px dashed hsl(var(--border-hsl))",
                          borderRadius: "var(--radius-md)",
                          padding: "2rem",
                          textAlign: "center",
                          position: "relative",
                          cursor: uploading ? "not-allowed" : "pointer",
                          marginBottom: "1rem"
                        }}>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleUploadHeroImage(e, false)}
                            disabled={uploading}
                            style={{
                              position: "absolute",
                              left: 0,
                              top: 0,
                              width: "100%",
                              height: "100%",
                              opacity: 0,
                              cursor: "pointer"
                            }}
                          />
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                            <Upload size={24} style={{ color: "hsl(var(--muted-hsl))" }} />
                            <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>{uploading ? "Uploading hero..." : "Upload Hero Banner"}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* FAQs Management Section */}
                    <div style={{ gridColumn: "1 / -1", borderTop: "1px solid hsl(var(--border-hsl))", paddingTop: "1.5rem", marginTop: "1rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                        <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "hsl(var(--primary-hsl))" }}>Category FAQs Accordion items</h3>
                        <button
                          type="button"
                          onClick={handleAddFaq}
                          className="btn btn-outline"
                          style={{ padding: "0.4rem 1rem", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.25rem" }}
                        >
                          <Plus size={14} /> Add FAQ Item
                        </button>
                      </div>

                      {faqs.length === 0 ? (
                        <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.85rem", fontStyle: "italic", margin: 0 }}>
                          No FAQs added for this category yet. Click "Add FAQ Item" to set dynamic FAQs.
                        </p>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                          {faqs.map((faq, index) => (
                            <div key={index} style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                <input
                                  className="input"
                                  placeholder="FAQ Question (e.g. What sizes are available?)"
                                  value={faq.question}
                                  onChange={(e) => handleUpdateFaq(index, "question", e.target.value)}
                                  required
                                  style={{ fontSize: "0.85rem" }}
                                />
                                <textarea
                                  className="input"
                                  placeholder="FAQ Answer details..."
                                  value={faq.answer}
                                  onChange={(e) => handleUpdateFaq(index, "answer", e.target.value)}
                                  required
                                  rows={2}
                                  style={{ fontSize: "0.85rem" }}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveFaq(index)}
                                className="btn"
                                style={{
                                  padding: "0.5rem",
                                  backgroundColor: "hsl(var(--destructive-hsl) / 0.1)",
                                  color: "hsl(var(--destructive-hsl))",
                                  border: "none",
                                  borderRadius: "var(--radius-sm)",
                                  cursor: "pointer",
                                  marginTop: "0.25rem"
                                }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </form>
                ) : (
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "2rem", alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                        <h2 style={{ fontSize: "1.3rem", marginRight: "0.5rem" }}>{cat.name}</h2>
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "0.1rem 0.4rem", backgroundColor: "hsl(var(--secondary-hsl))", color: "hsl(var(--muted-hsl))", borderRadius: "4px" }}>
                          Slug: {cat.id}
                        </span>
                        {cat.parentId && (
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "0.1rem 0.4rem", backgroundColor: "hsl(var(--primary-hsl) / 0.1)", color: "hsl(var(--primary-hsl))", borderRadius: "4px" }}>
                            Parent: {categories.find(c => c.id === cat.parentId)?.name || cat.parentId}
                          </span>
                        )}
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "0.1rem 0.4rem", backgroundColor: "hsl(var(--secondary-hsl))", color: "hsl(var(--muted-hsl))", borderRadius: "4px" }}>
                          Catalog Order: {cat.displayOrder || 0}
                        </span>
                        <span style={{ 
                          fontSize: "0.75rem", 
                          fontWeight: 700, 
                          padding: "0.1rem 0.4rem", 
                          backgroundColor: cat.showOnHome !== false ? "hsl(var(--success-hsl) / 0.1)" : "hsl(var(--destructive-hsl) / 0.1)", 
                          color: cat.showOnHome !== false ? "hsl(var(--success-hsl))" : "hsl(var(--destructive-hsl))", 
                          borderRadius: "4px" 
                        }}>
                          {cat.showOnHome !== false ? "Visible on Home" : "Hidden on Home"}
                        </span>
                        {cat.useCustomMarkup ? (
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "0.15rem 0.5rem", backgroundColor: "hsl(var(--accent-hsl) / 0.15)", color: "hsl(var(--accent-hsl))", borderRadius: "4px", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                            <Sliders size={12} /> Category Markup: {cat.markupPercent || 0}% {cat.markupType === "tiers" ? "(Tiers)" : "(Flat)"}
                          </span>
                        ) : (
                          <span style={{ fontSize: "0.75rem", fontWeight: 600, padding: "0.15rem 0.5rem", backgroundColor: "hsl(var(--muted-hsl) / 0.15)", color: "hsl(var(--muted-hsl))", borderRadius: "4px" }}>
                            Using Sitewise Default Markup
                          </span>
                        )}
                        {cat.faqs && cat.faqs.length > 0 && (
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "0.1rem 0.4rem", backgroundColor: "hsl(var(--primary-hsl) / 0.1)", color: "hsl(var(--primary-hsl))", borderRadius: "4px" }}>
                            FAQs: {cat.faqs.length}
                          </span>
                        )}
                      </div>
                      <p style={{ color: "hsl(var(--foreground-hsl) / 0.8)", fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                        {cat.description || <i>No custom description provided yet.</i>}
                      </p>
                    </div>

                    {cat.heroImage && (
                      <div style={{ width: "180px", height: "100px", borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid hsl(var(--border-hsl))" }}>
                        <img src={cat.heroImage} alt={`${cat.name} Hero`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    )}

                    <div>
                      <button onClick={() => handleEditClick(cat)} className="btn btn-outline" style={{ display: "flex", alignItems: "center", gap: "0.25rem", padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
                        <Edit size={14} /> Edit Category
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
