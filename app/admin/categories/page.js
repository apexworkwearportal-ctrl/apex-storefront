"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, query, orderBy } from "firebase/firestore";
import { Save, Upload, Edit, Trash2, ArrowRight, Loader2, AlertCircle, Plus } from "lucide-react";

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

  // Create form states
  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newHeroImage, setNewHeroImage] = useState("");
  const [newDisplayOrder, setNewDisplayOrder] = useState(0);
  const [newShowOnHome, setNewShowOnHome] = useState(true);
  const [newHomeOrder, setNewHomeOrder] = useState(0);
  const [newParentId, setNewParentId] = useState("");
  
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

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
        headers: {
          "Authorization": `Bearer ${idToken}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload hero image.");
      }

      if (isNewForm) {
        setNewHeroImage(data.url);
      } else {
        setHeroImage(data.url);
      }
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
        parentId: parentId || null
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
        parentId: newParentId || null
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
          <h1 style={{ fontSize: "2rem", marginBottom: "0.25rem" }}>Category Management</h1>
          <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.95rem" }}>
            Edit storefront names, parent categories, hero images, descriptions, home page visibility, and custom display sorting.
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

                      <div>
                        <label className="label">Category Description</label>
                        <textarea className="input" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Enter a promotional description..." />
                      </div>
                      <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
                        <button type="submit" className="btn btn-primary" style={{ padding: "0.5rem 1.5rem" }} disabled={saving}>
                          {saving ? <Loader2 size={16} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} /> : <Save size={16} />}
                          Save
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
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "0.1rem 0.4rem", backgroundColor: "hsl(var(--secondary-hsl))", color: "hsl(var(--muted-hsl))", borderRadius: "4px" }}>
                          Home Order: {cat.homeOrder !== undefined ? cat.homeOrder : (cat.displayOrder || 0)}
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
