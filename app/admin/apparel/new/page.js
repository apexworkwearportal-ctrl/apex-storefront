"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, Trash2, Plus, Save, Loader2, AlertCircle, Ruler, CheckCircle2, Shirt, Sparkles } from "lucide-react";
import AdminGarmentCalibration from "@/components/AdminGarmentCalibration";

export default function AdminNewApparelProductPage() {
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
  const [shortDescription, setShortDescription] = useState("");
  const [longDescription, setLongDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [basePrice, setBasePrice] = useState("35.00");
  const [images, setImages] = useState([]);
  const [minimumOrderQuantity, setMinimumOrderQuantity] = useState(12);

  // Default apparel size and color options
  const [optionGroups, setOptionGroups] = useState([
    {
      name: "Size",
      choices: [
        { name: "S", priceUpcharge: 0 },
        { name: "M", priceUpcharge: 0 },
        { name: "L", priceUpcharge: 0 },
        { name: "XL", priceUpcharge: 0 },
        { name: "2XL", priceUpcharge: 3.50 },
        { name: "3XL", priceUpcharge: 5.00 }
      ]
    },
    {
      name: "Color",
      choices: [
        { name: "Black", priceUpcharge: 0 },
        { name: "Navy Blue", priceUpcharge: 0 },
        { name: "Heather Grey", priceUpcharge: 0 },
        { name: "White", priceUpcharge: 0 }
      ]
    }
  ]);

  // Product Markup Overrides
  const [useCustomMarkup, setUseCustomMarkup] = useState(false);
  const [markupPercent, setMarkupPercent] = useState(35);

  // Apparel Garment Views & Calibration
  const [garmentViews, setGarmentViews] = useState({
    front: { image: "", calibration: { isCalibrated: false } },
    back: { image: "", calibration: { isCalibrated: false } },
    left: { image: "", calibration: { isCalibrated: false } },
    right: { image: "", calibration: { isCalibrated: false } },
  });

  // Modal for calibration
  const [activeCalibrateSide, setActiveCalibrateSide] = useState(null);

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

  // Custom Options group handlers
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

  // Garment side profile upload helper
  const handleUploadGarmentImage = async (side, file) => {
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
        throw new Error(data.error || "Failed to upload garment image.");
      }

      setGarmentViews(prev => ({
        ...prev,
        [side]: {
          ...prev[side],
          image: data.url,
          calibration: prev[side]?.calibration || { isCalibrated: false }
        }
      }));

      // Automatically add front view to primary images if empty
      if (side === "front" && images.length === 0) {
        setImages([data.url]);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Garment image upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveGarmentCalibration = (calibrationPayload) => {
    if (!activeCalibrateSide) return;
    setGarmentViews(prev => ({
      ...prev,
      [activeCalibrateSide]: {
        ...prev[activeCalibrateSide],
        calibration: calibrationPayload
      }
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

      // Auto generate doc reference in apparel_products
      const apparelRef = collection(db, "apparel_products");
      const docRef = doc(apparelRef);

      const isFrontCalibrated = garmentViews.front?.calibration?.isCalibrated;
      const finalIsVisible = true;
      const needsAttention = images.length === 0 || (!shortDescription && !longDescription) || !isFrontCalibrated;

      const productPayload = {
        id: docRef.id,
        isApparel: true,
        name: name.trim(),
        sku: sku.trim() || `APX-APP-${Date.now().toString().slice(-4)}`,
        shortDescription,
        longDescription,
        description: longDescription || shortDescription,
        categoryId,
        pricing: {
          startingPrice: parseFloat(basePrice) || 0,
          basePrice: parseFloat(basePrice) || 0,
        },
        displayOrder: 0,
        isVisible: finalIsVisible,
        images: images.length > 0 ? images : (garmentViews.front?.image ? [garmentViews.front.image] : []),
        options: optionGroups,
        useCustomMarkup,
        markupPercent: parseFloat(markupPercent) || 0,
        minimumOrderQuantity: parseInt(minimumOrderQuantity) || 12,
        garmentViews,
        needsAttention,
        createdAt: new Date(),
      };

      await setDoc(docRef, productPayload);

      setSuccess(true);
      setTimeout(() => {
        router.push("/admin/apparel");
      }, 1200);
    } catch (err) {
      console.error("Error creating apparel product:", err);
      setError("Failed to create apparel product: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ marginBottom: "1.5rem" }}>
        <Link href="/admin/apparel" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "hsl(var(--muted-hsl))", fontSize: "0.9rem", fontWeight: 600 }}>
          <ArrowLeft size={16} /> Back to Apparel Catalog
        </Link>
      </div>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", color: "hsl(var(--accent-hsl))", letterSpacing: "0.05em", display: "block", marginBottom: "0.25rem" }}>
            Dedicated Apparel Engine
          </span>
          <h1 style={{ fontSize: "2rem", fontWeight: 900, marginBottom: "0.25rem", color: "hsl(var(--primary-hsl))", letterSpacing: "-0.02em" }}>
            Add New Apparel Product
          </h1>
          <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.95rem" }}>
            Configure garment view angles, interactive print area bounds, sizing matrix, and wholesale tier pricing.
          </p>
        </div>
        <button
          onClick={handleSave}
          className="btn btn-primary"
          disabled={saving}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.5rem" }}
        >
          {saving ? <Loader2 size={18} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} /> : <Save size={18} />}
          {saving ? "Creating Product..." : "Save Apparel Product"}
        </button>
      </div>

      {success && (
        <div className="card" style={{ borderColor: "hsl(var(--success-hsl))", backgroundColor: "hsl(var(--success-hsl) / 0.05)", padding: "1rem 1.5rem", marginBottom: "1.5rem", color: "hsl(var(--success-hsl))", fontWeight: 600 }}>
          Apparel product created successfully! Redirecting to catalog...
        </div>
      )}

      {error && (
        <div className="card" style={{ borderColor: "hsl(var(--destructive-hsl))", backgroundColor: "hsl(var(--destructive-hsl) / 0.05)", padding: "1rem 1.5rem", marginBottom: "1.5rem", color: "hsl(var(--destructive-hsl))", fontWeight: 600 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "2rem" }}>
        {/* Left column: Content details */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* Identification Details */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h2 style={{ fontSize: "1.2rem", margin: 0 }}>Apparel Identification</h2>
            <div>
              <label className="label">Apparel Product Name (Required)</label>
              <input 
                className="input" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="e.g. Apex Heavyweight Tradesman Hoodie"
                required 
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label className="label">SKU</label>
                <input 
                  className="input" 
                  value={sku} 
                  onChange={(e) => setSku(e.target.value)} 
                  placeholder="e.g. APX-HD-100" 
                  required 
                />
              </div>
              <div>
                <label className="label">Minimum Order Quantity (MOQ)</label>
                <input 
                  type="number"
                  min="1"
                  className="input" 
                  value={minimumOrderQuantity} 
                  onChange={(e) => setMinimumOrderQuantity(e.target.value)} 
                  required 
                />
              </div>
            </div>
          </div>

          {/* Descriptions Card */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div>
              <h2 style={{ fontSize: "1.2rem", marginBottom: "0.25rem" }}>Short Description (Catalog Summary)</h2>
              <textarea
                className="input"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="e.g. 400 GSM heavy fleece hoodie with double-stitched pouch pocket."
                rows={2}
                style={{ resize: "vertical", fontFamily: "inherit" }}
              />
            </div>

            <div>
              <h2 style={{ fontSize: "1.2rem", marginBottom: "0.25rem" }}>Detailed Specifications & Fabric Breakdown</h2>
              <textarea
                className="input"
                value={longDescription}
                onChange={(e) => setLongDescription(e.target.value)}
                placeholder="Fabric weight, ring-spun cotton blends, rib cuffs, sizing instructions, decoration embroidery/print guidelines..."
                rows={6}
                style={{ resize: "vertical", fontFamily: "inherit" }}
              />
            </div>
          </div>

          {/* Sizing & Options Configurator */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div>
                <h2 style={{ fontSize: "1.2rem", margin: 0 }}>Sizing & Option Matrix</h2>
                <p style={{ fontSize: "0.8rem", color: "hsl(var(--muted-hsl))", margin: "0.2rem 0 0" }}>
                  Configure garment sizes (with upcharges for 2XL/3XL) and fabric colors.
                </p>
              </div>
              <button type="button" onClick={addOptionGroup} className="btn btn-outline" style={{ padding: "0.4rem 0.85rem", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <Plus size={14} /> Add Option Group
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
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

                  <div style={{ maxWidth: "75%", marginBottom: "1rem" }}>
                    <label className="label">Group Name</label>
                    <input className="input" value={group.name} onChange={(e) => handleGroupNameChange(gIdx, e.target.value)} required />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    <label className="label">Choices & Upcharges</label>
                    {group.choices.map((choice, cIdx) => (
                      <div key={cIdx} style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                        <input
                          className="input"
                          value={choice.name}
                          onChange={(e) => handleChoiceChange(gIdx, cIdx, "name", e.target.value)}
                          placeholder="Choice name (e.g. 2XL, Navy)"
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
                          />
                        </div>
                        {group.choices.length > 1 && (
                          <button type="button" onClick={() => removeChoice(gIdx, cIdx)} className="btn btn-outline" style={{ padding: "0.5rem", color: "hsl(var(--destructive-hsl))" }}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={() => addChoice(gIdx)} className="btn btn-outline" style={{ padding: "0.4rem 0.85rem", fontSize: "0.8rem", width: "fit-content", marginTop: "0.25rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <Plus size={12} /> Add Choice Row
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Garment Angles & Interactive Calibration */}
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <Shirt size={20} style={{ color: "hsl(var(--accent-hsl))" }} />
              <h2 style={{ fontSize: "1.2rem", margin: 0 }}>Interactive Garment Calibration</h2>
            </div>
            <p style={{ fontSize: "0.85rem", color: "hsl(var(--muted-hsl))", marginBottom: "1.25rem" }}>
              Upload transparent PNG or clean photo angles of the blank garment, then calibrate the printable chest/back area.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              {["front", "back", "left", "right"].map(side => {
                const view = garmentViews[side];
                const isCalibrated = view?.calibration?.isCalibrated;

                return (
                  <div key={side} className="card" style={{ padding: "1rem", backgroundColor: "hsl(var(--secondary-hsl) / 0.15)", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 800, textTransform: "uppercase", fontSize: "0.8rem", color: "hsl(var(--primary-hsl))" }}>
                        {side} Angle {side === "front" ? "(Primary)" : ""}
                      </span>
                      {view.image && (
                        <span style={{
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          padding: "0.15rem 0.45rem",
                          borderRadius: "4px",
                          backgroundColor: isCalibrated ? "hsl(var(--success-hsl) / 0.12)" : "rgba(239, 68, 68, 0.1)",
                          color: isCalibrated ? "hsl(var(--success-hsl))" : "hsl(var(--destructive-hsl))"
                        }}>
                          {isCalibrated ? "Calibrated ✓" : "Uncalibrated ✗"}
                        </span>
                      )}
                    </div>

                    {view.image ? (
                      <div style={{ position: "relative", height: "140px", backgroundColor: "#ffffff", borderRadius: "var(--radius-sm)", border: "1px solid hsl(var(--border-hsl))", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                        <img src={view.image} alt={`${side} view`} style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} />
                      </div>
                    ) : (
                      <label style={{
                        height: "140px",
                        border: "2px dashed hsl(var(--border-hsl))",
                        borderRadius: "var(--radius-sm)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        gap: "0.5rem",
                        color: "hsl(var(--muted-hsl))",
                        fontSize: "0.8rem",
                        backgroundColor: "#ffffff"
                      }}>
                        <Upload size={20} />
                        <span>Upload {side} image</span>
                        <input type="file" accept="image/*" onChange={(e) => handleUploadGarmentImage(side, e.target.files[0])} style={{ display: "none" }} />
                      </label>
                    )}

                    {view.image && (
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          type="button"
                          onClick={() => setActiveCalibrateSide(side)}
                          className="btn btn-outline"
                          style={{ flex: 1, padding: "0.4rem", fontSize: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.25rem" }}
                        >
                          <Ruler size={13} /> {isCalibrated ? "Re-Calibrate" : "Calibrate"}
                        </button>
                        <label className="btn btn-outline" style={{ padding: "0.4rem 0.6rem", fontSize: "0.75rem", cursor: "pointer" }}>
                          Replace
                          <input type="file" accept="image/*" onChange={(e) => handleUploadGarmentImage(side, e.target.files[0])} style={{ display: "none" }} />
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right column: Settings & Pricing */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* Base Pricing Card */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h2 style={{ fontSize: "1.2rem", margin: 0 }}>Base Starting Pricing</h2>
            <div>
              <label className="label">Base Blank Starting Price (CAD $)</label>
              <input 
                type="number" 
                step="0.01" 
                className="input" 
                value={basePrice} 
                onChange={(e) => setBasePrice(e.target.value)} 
                required 
              />
              <p style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))", marginTop: "0.25rem" }}>
                Starting price before size upcharges and embroidery/printing placements.
              </p>
            </div>

            <div>
              <label className="label">Apparel Category</label>
              <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Storefront Images */}
          <div className="card">
            <h2 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>Catalog Gallery Photos</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
              {images.map((img, idx) => (
                <div key={idx} style={{ position: "relative", width: "80px", height: "80px", borderRadius: "6px", overflow: "hidden", border: "1px solid hsl(var(--border-hsl))" }}>
                  <img src={img} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button
                    type="button"
                    onClick={() => handleDeleteImage(idx)}
                    style={{ position: "absolute", top: "2px", right: "2px", background: "rgba(0,0,0,0.6)", color: "white", border: "none", borderRadius: "50%", width: "20px", height: "20px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
            <label className="btn btn-outline" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", width: "100%", justifyContent: "center" }}>
              <Upload size={14} /> {uploading ? "Uploading..." : "Upload Photo"}
              <input type="file" accept="image/*" onChange={handleUploadImage} style={{ display: "none" }} />
            </label>
          </div>
        </div>
      </form>

      {/* Garment Calibration Modal */}
      {activeCalibrateSide && garmentViews[activeCalibrateSide]?.image && (
        <AdminGarmentCalibration
          isOpen={true}
          imageUrl={garmentViews[activeCalibrateSide].image}
          sideName={activeCalibrateSide}
          initialCalibration={garmentViews[activeCalibrateSide].calibration}
          onSave={handleSaveGarmentCalibration}
          onSaveCalibration={handleSaveGarmentCalibration}
          onClose={() => setActiveCalibrateSide(null)}
        />
      )}
    </div>
  );
}
