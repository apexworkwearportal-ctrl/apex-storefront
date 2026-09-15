"use client";

import { useEffect, useState, use } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, Trash2, Eye, EyeOff, Save, Loader2, AlertCircle, Plus, Ruler, CheckCircle2 } from "lucide-react";
import AdminGarmentCalibration from "@/components/AdminGarmentCalibration";

export default function AdminProductEditPage({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const productId = params.id;
  const { user } = useAuth();
  const router = useRouter();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Categories list
  const [categories, setCategories] = useState([]);

  // Form states (common)
  const [shortDescription, setShortDescription] = useState("");
  const [longDescription, setLongDescription] = useState("");
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [priceOverride, setPriceOverride] = useState("");
  const [images, setImages] = useState([]);
  
  // Custom Product states
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [optionGroups, setOptionGroups] = useState([]);
  const [optionGroupsCount, setOptionGroupsCount] = useState(0);

  // Product Markup Overrides
  const [useCustomMarkup, setUseCustomMarkup] = useState(false);
  const [markupPercent, setMarkupPercent] = useState(35);

  // Apparel & Calibration states
  const [isApparel, setIsApparel] = useState(false);
  const [minimumOrderQuantity, setMinimumOrderQuantity] = useState(12);
  const [garmentViews, setGarmentViews] = useState({
    front: { image: "", calibration: { isCalibrated: false } },
    back: { image: "", calibration: { isCalibrated: false } },
    left: { image: "", calibration: { isCalibrated: false } },
    right: { image: "", calibration: { isCalibrated: false } },
  });

  // Modal for calibration
  const [activeCalibrateSide, setActiveCalibrateSide] = useState(null);

  useEffect(() => {
    const fetchProductAndCategories = async () => {
      setLoading(true);
      try {
        // Fetch categories list
        const catSnap = await getDocs(collection(db, "categories"));
        const catList = [];
        catSnap.forEach(d => {
          catList.push({ id: d.id, ...d.data() });
        });
        setCategories(catList);

        // Fetch product
        const docRef = doc(db, "products", productId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setProduct(data);
          setShortDescription(data.shortDescription || data.description || "");
          setLongDescription(data.longDescription || data.description || "");
          setDisplayOrder(data.displayOrder || 0);
          setIsVisible(data.isVisible !== undefined ? data.isVisible : true);
          setImages(data.images || []);

          setUseCustomMarkup(data.useCustomMarkup || false);
          setMarkupPercent(data.markupPercent !== undefined ? data.markupPercent : 35);

          setIsApparel(data.isApparel || false);
          setMinimumOrderQuantity(data.minimumOrderQuantity || 12);
          if (data.garmentViews) {
            setGarmentViews(prev => ({
              ...prev,
              ...data.garmentViews
            }));
          }
          
          if (data.isCustom) {
            setName(data.name || "");
            setSku(data.sku || "");
            setCategoryId(data.categoryId || "");
            setPriceOverride(data.pricing?.startingPrice || "");
            setOptionGroups(data.options || []);
          } else {
            // API product overrides
            setCategoryId(data.categoryOverride || "");
            setPriceOverride(data.pricing?.startingPriceOverride || "");

            // Fetch live API options count
            const optRes = await fetch(`/api/product/${productId}/options`);
            if (optRes.ok) {
              const optData = await optRes.json();
              const count = optData.optionGroups ? Object.keys(optData.optionGroups).length : 0;
              setOptionGroupsCount(count);
            }
          }
        } else {
          setError("Product not found in Firestore.");
        }
      } catch (err) {
        console.error("Error loading product:", err);
        setError("Failed to load product data.");
      } finally {
        setLoading(false);
      }
    };

    fetchProductAndCategories();
  }, [productId]);

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

    try {
      const docRef = doc(db, "products", productId);
      
      // Garment Calibration Gating
      const isFrontCalibrated = garmentViews.front?.calibration?.isCalibrated;
      const apparelGated = isApparel && !isFrontCalibrated;
      const finalIsVisible = apparelGated ? false : isVisible;
      const needsAttention = images.length === 0 || (!shortDescription && !longDescription) || apparelGated;

      if (apparelGated && isVisible) {
        setError("Warning: Uncalibrated Apparel products cannot be set to active on the storefront. Product has been saved but remains hidden until calibration is complete.");
      }

      if (product.isCustom) {
        // Validate custom option groups
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

        const updateData = {
          name,
          sku,
          shortDescription,
          longDescription,
          description: longDescription || shortDescription,
          categoryId,
          "pricing.startingPrice": parseFloat(priceOverride) || 0,
          displayOrder: parseInt(displayOrder) || 0,
          isVisible: finalIsVisible,
          images,
          options: optionGroups,
          useCustomMarkup,
          markupPercent: parseFloat(markupPercent) || 0,
          isApparel,
          minimumOrderQuantity: parseInt(minimumOrderQuantity) || 1,
          garmentViews,
          needsAttention,
        };

        await updateDoc(docRef, updateData);
      } else {
        const priceVal = priceOverride !== "" ? parseFloat(priceOverride) : null;
        
        const updateData = {
          shortDescription,
          longDescription,
          description: longDescription || shortDescription,
          categoryOverride: categoryId || null,
          displayOrder: parseInt(displayOrder) || 0,
          isVisible: finalIsVisible,
          images,
          useCustomMarkup,
          markupPercent: parseFloat(markupPercent) || 0,
          isApparel,
          minimumOrderQuantity: parseInt(minimumOrderQuantity) || 1,
          garmentViews,
          needsAttention,
          "pricing.startingPriceOverride": priceVal,
        };

        await updateDoc(docRef, updateData);
      }

      setSuccess(true);
      // Refresh local model cache
      const freshSnap = await getDoc(docRef);
      if (freshSnap.exists()) {
        setProduct(freshSnap.data());
      }
    } catch (err) {
      console.error("Error saving product:", err);
      setError("Failed to save changes: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "4rem", color: "hsl(var(--muted-hsl))" }}>
        Loading product details...
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "3rem", borderColor: "hsl(var(--destructive-hsl))" }}>
        <AlertCircle size={40} style={{ color: "hsl(var(--destructive-hsl))", marginBottom: "1rem" }} />
        <h2>Error</h2>
        <p>{error}</p>
        <Link href="/admin" className="btn btn-secondary" style={{ marginTop: "1rem", display: "inline-flex" }}>
          Back to Catalog
        </Link>
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
          <h1 style={{ fontSize: "2rem", marginBottom: "0.25rem" }}>Edit Product</h1>
          <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.95rem" }}>
            {product?.isCustom ? (
              <>
                <span style={{ fontSize: "0.85rem", padding: "0.2rem 0.5rem", marginRight: "0.5rem", backgroundColor: "hsl(var(--primary-hsl) / 0.15)", color: "hsl(var(--primary-hsl))", borderRadius: "4px", fontWeight: 700 }}>Custom Product</span>
                {name} <span style={{ fontSize: "0.8rem", padding: "0.1rem 0.4rem", backgroundColor: "hsl(var(--secondary-hsl))", borderRadius: "4px" }}>SKU: {sku}</span>
              </>
            ) : (
              <>
                <span style={{ fontSize: "0.85rem", padding: "0.2rem 0.5rem", marginRight: "0.5rem", backgroundColor: "hsl(var(--success-hsl) / 0.15)", color: "hsl(var(--success-hsl))", borderRadius: "4px", fontWeight: 700 }}>API Product</span>
                {product?.sinalite?.name} <span style={{ fontSize: "0.8rem", padding: "0.1rem 0.4rem", backgroundColor: "hsl(var(--secondary-hsl))", borderRadius: "4px" }}>SKU: {product?.sinalite?.sku}</span>
              </>
            )}
          </p>
        </div>
        <button
          onClick={handleSave}
          className="btn btn-primary"
          disabled={saving}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.5rem" }}
        >
          {saving ? <Loader2 size={18} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} /> : <Save size={18} />}
          {saving ? "Saving Changes..." : "Save Product"}
        </button>
      </div>

      {success && (
        <div className="card" style={{ borderColor: "hsl(var(--success-hsl))", backgroundColor: "hsl(var(--success-hsl) / 0.05)", padding: "1rem 1.5rem", marginBottom: "1.5rem", color: "hsl(var(--success-hsl))", fontWeight: 600 }}>
          Changes saved successfully!
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
          
          {/* Custom specifications if product is custom */}
          {product?.isCustom && (
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <h2 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>Product Details</h2>
              <div>
                <label className="label">Product Name</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <label className="label">SKU</label>
                <input className="input" value={sku} onChange={(e) => setSku(e.target.value)} required />
              </div>
            </div>
          )}

          {/* Description Card */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div>
              <h2 style={{ fontSize: "1.2rem", marginBottom: "0.25rem" }}>Short Description (Summary)</h2>
              <p style={{ fontSize: "0.85rem", color: "hsl(var(--muted-hsl))", marginBottom: "0.5rem" }}>
                Brief summary for catalog cards, search results, and quick previews.
              </p>
              <textarea
                className="input"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="e.g. 16pt premium business cards with gloss UV finish."
                rows={3}
                style={{ resize: "vertical", fontFamily: "inherit" }}
              />
            </div>

            <div>
              <h2 style={{ fontSize: "1.2rem", marginBottom: "0.25rem" }}>Long Description (Detailed Specs)</h2>
              <p style={{ fontSize: "0.85rem", color: "hsl(var(--muted-hsl))", marginBottom: "0.5rem" }}>
                Full product specifications, paper stock details, template requirements, and artwork guidelines.
              </p>
              <textarea
                className="input"
                value={longDescription}
                onChange={(e) => setLongDescription(e.target.value)}
                placeholder="Provide detailed specs, sizing tables, material options, artwork instructions..."
                rows={7}
                style={{ resize: "vertical", fontFamily: "inherit" }}
              />
            </div>
          </div>

          {/* Custom Options Manager if product is custom */}
          {product?.isCustom && (
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <div>
                  <h2 style={{ fontSize: "1.2rem" }}>Options & Variants Configurator</h2>
                  <p style={{ fontSize: "0.8rem", color: "hsl(var(--muted-hsl))" }}>
                    Configure dynamic upcharges for selectable custom sizing, colors, or printing placements.
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
                        <input className="input" value={group.name} onChange={(e) => handleGroupNameChange(gIdx, e.target.value)} required />
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        <label className="label">Choices & Price Upcharges</label>
                        {group.choices.map((choice, cIdx) => (
                          <div key={cIdx} style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                            <input
                              className="input"
                              value={choice.name}
                              onChange={(e) => handleChoiceChange(gIdx, cIdx, "name", e.target.value)}
                              placeholder="Choice name (e.g. XL, Navy Blue)"
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
                        <button type="button" onClick={() => addChoice(gIdx)} className="btn btn-outline" style={{ padding: "0.4rem 0.85rem", fontSize: "0.8rem", width: "fit-content", marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                          <Plus size={12} /> Add Choice Row
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Media Images Card */}
          <div className="card">
            <h2 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>Storefront Images</h2>
            <p style={{ fontSize: "0.85rem", color: "hsl(var(--muted-hsl))", marginBottom: "1.5rem" }}>
              Add product renders or photos uploaded directly. Order matters.
            </p>

            {/* Existing Images Grid */}
            {images.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
                {images.map((imgUrl, index) => (
                  <div key={index} className="card" style={{ padding: "0.25rem", position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <img
                      src={imgUrl}
                      alt={`Product render ${index + 1}`}
                      style={{ width: "100%", height: "100px", objectFit: "contain", borderRadius: "var(--radius-sm)" }}
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(index)}
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
                    <span style={{ fontSize: "0.7rem", color: "hsl(var(--muted-hsl))", marginTop: "0.25rem" }}>
                      Image {index + 1} {index === 0 && " (Hero)"}
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
                <p style={{ fontWeight: 600 }}>{uploading ? "Uploading render..." : "Click or drag to upload"}</p>
                <p style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))" }}>Supports PNG, JPEG, WEBP files up to 5MB</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Metas & Configuration */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Metadata Card */}
          <div className="card">
            <h2 style={{ fontSize: "1.2rem", marginBottom: "1.25rem" }}>Storefront Settings</h2>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Visibility Toggle */}
              <div>
                <label className="label">Storefront Visibility</label>
                <button
                  type="button"
                  onClick={() => setIsVisible(!isVisible)}
                  className="btn"
                  style={{
                    width: "100%",
                    justifyContent: "center",
                    backgroundColor: isVisible ? "hsl(var(--success-hsl) / 0.1)" : "hsl(var(--secondary-hsl))",
                    color: isVisible ? "hsl(var(--success-hsl))" : "hsl(var(--muted-hsl))",
                    border: "1px solid transparent"
                  }}
                >
                  {isVisible ? (
                    <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><Eye size={18} /> Active Storefront Product</span>
                  ) : (
                    <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><EyeOff size={18} /> Hidden from Storefront</span>
                  )}
                </button>
              </div>

              {/* Category Select */}
              <div>
                <label className="label">Storefront Category</label>
                <select
                  className="input"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">Select category...</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <span style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))", display: "block", marginTop: "0.25rem" }}>
                  Choose which category this product is filed under.
                </span>
              </div>

              {/* Display Order */}
              <div>
                <label className="label" htmlFor="disp-order">Display Priority Order</label>
                <input
                  id="disp-order"
                  type="number"
                  className="input"
                  placeholder="0"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(e.target.value)}
                />
                <span style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))", display: "block", marginTop: "0.25rem" }}>
                  Used to order cards in catalogs. Lower numbers display first.
                </span>
              </div>

              {/* Starting Price (Override for API, main price for Custom) */}
              <div>
                <label className="label" htmlFor="price-override">
                  {product?.isCustom ? "Base Selling Price ($ CAD)" : "Starting Price Override ($ CAD)"}
                </label>
                <input
                  id="price-override"
                  type="number"
                  step="0.01"
                  className="input"
                  placeholder={parseFloat(product?.pricing?.startingPrice || 0).toFixed(2)}
                  value={priceOverride}
                  onChange={(e) => setPriceOverride(e.target.value)}
                />
                <span style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))", display: "block", marginTop: "0.25rem" }}>
                  {product?.isCustom 
                    ? "Starting base price before option choices are selected."
                    : `Manually override starting price (cheapest calculations: $${parseFloat(product?.pricing?.startingPrice || 0).toFixed(2)}).`
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Markup Override Card */}
          <div className="card">
            <h2 style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>Pricing & Markup Settings</h2>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={useCustomMarkup}
                  onChange={(e) => setUseCustomMarkup(e.target.checked)}
                />
                Enable Product Specific Markup Override
              </label>

              {useCustomMarkup ? (
                <div>
                  <label className="label">Custom Markup Percentage (%)</label>
                  <input
                    type="number"
                    className="input"
                    value={markupPercent}
                    onChange={(e) => setMarkupPercent(e.target.value)}
                    placeholder="35"
                  />
                  <span style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))", display: "block", marginTop: "0.25rem" }}>
                    Overrides Category markup and Sitewise global markup.
                  </span>
                </div>
              ) : (
                <p style={{ fontSize: "0.8rem", color: "hsl(var(--muted-hsl))" }}>
                  Currently following standard Category or Sitewise markup hierarchy.
                </p>
              )}
            </div>
          </div>

          {/* Apparel & Garment Calibration Card */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ fontSize: "1.2rem" }}>Apparel & Interactive Mockup</h2>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem" }}>
                <input
                  type="checkbox"
                  checked={isApparel}
                  onChange={(e) => setIsApparel(e.target.checked)}
                />
                Is Apparel Product
              </label>
            </div>

            {isApparel && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div>
                  <label className="label">Minimum Order Quantity (MOQ)</label>
                  <input
                    type="number"
                    className="input"
                    value={minimumOrderQuantity}
                    onChange={(e) => setMinimumOrderQuantity(e.target.value)}
                    placeholder="12"
                    min="1"
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 700 }}>Garment Views & Calibration</h3>

                  {["front", "back", "left", "right"].map((side) => {
                    const view = garmentViews[side] || {};
                    const isCalibrated = view.calibration?.isCalibrated;

                    return (
                      <div key={side} style={{ padding: "0.75rem", borderRadius: "var(--radius-md)", border: "1px solid hsl(var(--border-hsl))", backgroundColor: "hsl(var(--secondary-hsl) / 0.1)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                          <span style={{ fontWeight: 700, textTransform: "capitalize", fontSize: "0.9rem" }}>{side} Profile</span>
                          <span style={{
                            fontSize: "0.7rem",
                            padding: "0.2rem 0.5rem",
                            borderRadius: "999px",
                            fontWeight: 700,
                            backgroundColor: isCalibrated ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
                            color: isCalibrated ? "rgb(22, 163, 74)" : "rgb(220, 38, 38)"
                          }}>
                            {isCalibrated ? "Calibrated ✓" : "Needs Calibration ⚠️"}
                          </span>
                        </div>

                        {view.image ? (
                          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                            <img src={view.image} alt={side} style={{ width: "60px", height: "60px", objectFit: "contain", borderRadius: "4px", backgroundColor: "#fff", border: "1px solid #ddd" }} />
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                              <button
                                type="button"
                                onClick={() => setActiveCalibrateSide(side)}
                                className="btn btn-outline"
                                style={{ fontSize: "0.75rem", padding: "0.3rem 0.6rem", display: "flex", alignItems: "center", gap: "0.25rem" }}
                              >
                                <Ruler size={12} /> {isCalibrated ? "Recalibrate View" : "Calibrate View"}
                              </button>
                              <label style={{ fontSize: "0.7rem", color: "hsl(var(--primary-hsl))", cursor: "pointer", textDecoration: "underline" }}>
                                Replace Image
                                <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleUploadGarmentImage(side, e.target.files[0])} />
                              </label>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <label className="btn btn-outline" style={{ fontSize: "0.8rem", cursor: "pointer", width: "100%", justifyContent: "center", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                              <Upload size={14} /> Upload {side} Profile Render
                              <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleUploadGarmentImage(side, e.target.files[0])} />
                            </label>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {(!garmentViews.front?.calibration?.isCalibrated) && (
                  <div style={{ padding: "0.75rem", backgroundColor: "rgba(239, 68, 68, 0.08)", borderRadius: "var(--radius-sm)", color: "rgb(185, 28, 28)", fontSize: "0.8rem", fontWeight: 600 }}>
                    ⚠️ Front view calibration required before this apparel item can go live on the storefront.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SinaLite Specs (Only if API Product) */}
          {!product?.isCustom && (
            <div className="card" style={{ backgroundColor: "hsl(var(--secondary-hsl) / 0.2)" }}>
              <h2 style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>SinaLite Details</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.85rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "hsl(var(--muted-hsl))" }}>SinaLite Category</span>
                  <span style={{ fontWeight: 600 }}>{product?.sinalite?.category}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "hsl(var(--muted-hsl))" }}>SKU Prefix</span>
                  <span style={{ fontWeight: 600 }}>{product?.sinalite?.sku}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "hsl(var(--muted-hsl))" }}>Option Groups Count</span>
                  <span style={{ fontWeight: 600 }}>{optionGroupsCount}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "hsl(var(--muted-hsl))" }}>Last Synced At</span>
                  <span style={{ fontWeight: 600 }}>{product?.lastSyncedAt ? new Date(product.lastSyncedAt.seconds * 1000 || product.lastSyncedAt).toLocaleString() : "Never"}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </form>

      {/* Garment Calibration Modal */}
      {activeCalibrateSide && (
        <AdminGarmentCalibration
          isOpen={!!activeCalibrateSide}
          onClose={() => setActiveCalibrateSide(null)}
          imageUrl={garmentViews[activeCalibrateSide]?.image}
          sideName={`${activeCalibrateSide.toUpperCase()} View`}
          initialCalibration={garmentViews[activeCalibrateSide]?.calibration}
          onSaveCalibration={handleSaveGarmentCalibration}
        />
      )}
    </div>
  );
}
