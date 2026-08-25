"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, Trash2, Plus, Save, Loader2, AlertCircle } from "lucide-react";

export default function AdminNewProductPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [images, setImages] = useState([]);
  const [optionGroups, setOptionGroups] = useState([]); // [{ name: "Size", choices: [{ name: "S", priceUpcharge: 0 }] }]

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const snapshot = await getDocs(collection(db, "categories"));
        const list = [];
        snapshot.forEach(d => {
          list.push({ id: d.id, ...d.data() });
        });
        setCategories(list);
        if (list.length > 0) {
          setCategoryId(list[0].id);
        }
      } catch (err) {
        console.error("Failed to load categories:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const handleUploadImage = async (e) => {
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
        throw new Error(data.error || "Failed to upload image.");
      }

      setImages(prev => [...prev, data.url]);
    } catch (err) {
      console.error(err);
      setError(err.message || "Image upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = (index) => {
    setImages(prev => prev.filter((_, idx) => idx !== index));
  };

  // Option Groups Handlers
  const addOptionGroup = () => {
    setOptionGroups(prev => [...prev, { name: "", choices: [{ name: "", priceUpcharge: 0 }] }]);
  };

  const removeOptionGroup = (groupIndex) => {
    setOptionGroups(prev => prev.filter((_, idx) => idx !== groupIndex));
  };

  const handleGroupNameChange = (groupIndex, value) => {
    setOptionGroups(prev => prev.map((g, idx) => idx === groupIndex ? { ...g, name: value } : g));
  };

  const addChoice = (groupIndex) => {
    setOptionGroups(prev => prev.map((g, idx) => {
      if (idx === groupIndex) {
        return {
          ...g,
          choices: [...g.choices, { name: "", priceUpcharge: 0 }]
        };
      }
      return g;
    }));
  };

  const removeChoice = (groupIndex, choiceIndex) => {
    setOptionGroups(prev => prev.map((g, idx) => {
      if (idx === groupIndex) {
        return {
          ...g,
          choices: g.choices.filter((_, cIdx) => cIdx !== choiceIndex)
        };
      }
      return g;
    }));
  };

  const handleChoiceChange = (groupIndex, choiceIndex, field, value) => {
    setOptionGroups(prev => prev.map((g, idx) => {
      if (idx === groupIndex) {
        const updatedChoices = g.choices.map((c, cIdx) => {
          if (cIdx === choiceIndex) {
            return {
              ...c,
              [field]: field === "priceUpcharge" ? parseFloat(value) || 0 : value
            };
          }
          return c;
        });
        return { ...g, choices: updatedChoices };
      }
      return g;
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError("");

    if (!categoryId) {
      setError("Please select a category.");
      setSaving(false);
      return;
    }

    try {
      // Validate option groups
      for (const group of optionGroups) {
        if (!group.name.trim()) {
          throw new Error("Option groups must have a name.");
        }
        if (group.choices.length === 0) {
          throw new Error(`Option group "${group.name}" must have at least one choice.`);
        }
        for (const choice of group.choices) {
          if (!choice.name.trim()) {
            throw new Error(`All choices in option group "${group.name}" must have a name.`);
          }
        }
      }

      // Auto generate doc reference in products
      const productsRef = collection(db, "products");
      const docRef = doc(productsRef); // Unique ID

      const productPayload = {
        id: docRef.id,
        isCustom: true,
        isVisible: true,
        name,
        sku: sku || `custom-${docRef.id.slice(0, 6)}`,
        description,
        categoryId,
        pricing: {
          startingPrice: parseFloat(basePrice) || 0
        },
        images,
        options: optionGroups,
        needsAttention: images.length === 0 || !description,
        createdAt: new Date()
      };

      await setDoc(docRef, productPayload);
      setSuccess(true);
      
      // Redirect back to admin catalogue
      setTimeout(() => {
        router.push("/admin");
      }, 1500);
    } catch (err) {
      console.error("Error creating custom product:", err);
      setError(err.message || "Failed to create product.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "4rem", color: "hsl(var(--muted-hsl))" }}>
        Loading custom products creator...
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ marginBottom: "1.5rem" }}>
        <Link href="/admin" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "hsl(var(--muted-hsl))", fontSize: "0.9rem", fontWeight: 600 }}>
          <ArrowLeft size={16} /> Back to Catalog
        </Link>
      </div>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", marginBottom: "0.25rem" }}>Add Custom Product</h1>
          <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.95rem" }}>
            Create a custom product (e.g. apparel) stored directly in your Firebase database.
          </p>
        </div>
        <button
          onClick={handleSave}
          className="btn btn-primary"
          disabled={saving}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.5rem" }}
        >
          {saving ? <Loader2 size={18} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} /> : <Save size={18} />}
          {saving ? "Saving Product..." : "Save Product"}
        </button>
      </div>

      {success && (
        <div className="card" style={{ borderColor: "hsl(var(--success-hsl))", backgroundColor: "hsl(var(--success-hsl) / 0.05)", padding: "1rem 1.5rem", marginBottom: "1.5rem", color: "hsl(var(--success-hsl))", fontWeight: 600 }}>
          Product created successfully! Redirecting...
        </div>
      )}

      {error && (
        <div className="card" style={{ borderColor: "hsl(var(--destructive-hsl))", backgroundColor: "hsl(var(--destructive-hsl) / 0.05)", padding: "1rem 1.5rem", marginBottom: "1.5rem", color: "hsl(var(--destructive-hsl))", fontWeight: 600 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "2rem" }}>
        {/* Left Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* General Specs */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h2 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>Product Details</h2>
            
            <div>
              <label className="label">Product Name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Custom Embroidered Heavy Hoodie" required />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label className="label">SKU / Code</label>
                <input className="input" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g. APP-HD-001" />
              </div>
              <div>
                <label className="label">Starting / Base Price ($ CAD)</label>
                <input type="number" step="0.01" className="input" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} placeholder="e.g. 45.00" required />
              </div>
            </div>

            <div>
              <label className="label">Product Category</label>
              <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Product Description</label>
              <textarea className="input" value={description} onChange={(e) => setDescription(e.target.value)} rows={6} placeholder="Provide description, material options, layout specs, artwork templates details..." required />
            </div>
          </div>

          {/* Options Configurator */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <div>
                <h2 style={{ fontSize: "1.2rem" }}>Product Options (Variants)</h2>
                <p style={{ fontSize: "0.8rem", color: "hsl(var(--muted-hsl))" }}>
                  Configure product customization selectors (e.g. sizes, colors, material finishes) with price upcharges.
                </p>
              </div>
              <button type="button" onClick={addOptionGroup} className="btn btn-outline" style={{ padding: "0.4rem 0.85rem", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <Plus size={14} /> Add Option Group
              </button>
            </div>

            {optionGroups.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", border: "1px dashed hsl(var(--border-hsl))", borderRadius: "var(--radius-md)", color: "hsl(var(--muted-hsl))" }}>
                No custom options specified. The product will sell at base price only.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {optionGroups.map((group, gIdx) => (
                  <div key={gIdx} className="card" style={{ padding: "1.25rem", backgroundColor: "hsl(var(--secondary-hsl) / 0.15)", position: "relative" }}>
                    <button
                      type="button"
                      onClick={() => removeOptionGroup(gIdx)}
                      className="btn"
                      style={{
                        position: "absolute",
                        top: "1rem",
                        right: "1rem",
                        padding: "0.3rem",
                        backgroundColor: "rgba(220, 38, 38, 0.1)",
                        color: "hsl(var(--destructive-hsl))",
                        border: "none",
                        cursor: "pointer",
                        borderRadius: "var(--radius-sm)"
                      }}
                    >
                      <Trash2 size={14} />
                    </button>

                    <div style={{ maxWidth: "80%", marginBottom: "1rem" }}>
                      <label className="label">Option Group Name</label>
                      <input className="input" value={group.name} onChange={(e) => handleGroupNameChange(gIdx, e.target.value)} placeholder="e.g. Size, Apparel Color, Embroidery Placement" required />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      <label className="label">Choices & Price Upcharges</label>
                      {group.choices.map((choice, cIdx) => (
                        <div key={cIdx} style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                          <input
                            className="input"
                            value={choice.name}
                            onChange={(e) => handleChoiceChange(gIdx, cIdx, "name", e.target.value)}
                            placeholder="Choice name (e.g. XL, Navy Blue, Left Chest)"
                            style={{ flex: 2 }}
                            required
                          />
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1 }}>
                            <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>+$</span>
                            <input
                              type="number"
                              step="0.01"
                              className="input"
                              value={choice.priceUpcharge}
                              onChange={(e) => handleChoiceChange(gIdx, cIdx, "priceUpcharge", e.target.value)}
                              placeholder="0.00"
                            />
                          </div>
                          {group.choices.length > 1 && (
                            <button type="button" onClick={() => removeChoice(gIdx, cIdx)} className="btn btn-outline" style={{ padding: "0.5rem", color: "hsl(var(--destructive-hsl))" }}>
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button type="button" onClick={() => addChoice(gIdx)} className="btn btn-outline" style={{ padding: "0.4rem 0.85rem", fontSize: "0.8rem", width: "fit-content", marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <Plus size={12} /> Add Choice Row
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Images & Uploads */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Media Images Card */}
          <div className="card">
            <h2 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>Storefront Images</h2>
            <p style={{ fontSize: "0.85rem", color: "hsl(var(--muted-hsl))", marginBottom: "1.5rem" }}>
              Add product renders or photos uploaded directly. Order matters.
            </p>

            {/* Existing Images Grid */}
            {images.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
                {images.map((imgUrl, index) => (
                  <div key={index} className="card" style={{ padding: "0.25rem", position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <img
                      src={imgUrl}
                      alt={`Product render ${index + 1}`}
                      style={{ width: "100%", height: "80px", objectFit: "contain", borderRadius: "var(--radius-sm)" }}
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(index)}
                      className="btn"
                      style={{
                        position: "absolute",
                        top: "0.25rem",
                        right: "0.25rem",
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
                    <span style={{ fontSize: "0.65rem", color: "hsl(var(--muted-hsl))", marginTop: "0.25rem", textAlign: "center" }}>
                      Hero Image
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Image Uploader */}
            <div style={{
              border: "2px dashed hsl(var(--border-hsl))",
              borderRadius: "var(--radius-md)",
              padding: "2rem",
              textAlign: "center",
              position: "relative",
              cursor: uploading ? "not-allowed" : "pointer"
            }}>
              <input
                type="file"
                accept="image/*"
                onChange={handleUploadImage}
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
                <Upload size={32} style={{ color: "hsl(var(--muted-hsl))", marginBottom: "0.25rem" }} />
                <p style={{ fontWeight: 600 }}>{uploading ? "Uploading render..." : "Click to upload image"}</p>
                <p style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))" }}>Supports PNG, JPEG, WEBP files up to 5MB</p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
