"use client";

import { useEffect, useState, use } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, Trash2, Eye, EyeOff, Save, Loader2, AlertCircle, Plus, Printer, Calculator, CheckCircle2 } from "lucide-react";
import { calculateCustomPrintPrice } from "@/lib/custom-print-pricing";

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

  // Custom Print Variants
  const [customPrintSizes, setCustomPrintSizes] = useState([
    { id: "sz_1", name: '8.5" x 11"', imposition: 2, costPerM: 40.00 },
    { id: "sz_2", name: '11" x 17"', imposition: 1, costPerM: 75.00 },
    { id: "sz_3", name: '4" x 6"', imposition: 4, costPerM: 25.00 },
    { id: "sz_4", name: '5.5" x 8.5"', imposition: 4, costPerM: 35.00 }
  ]);

  const [sidesPagesOptions, setSidesPagesOptions] = useState([
    { id: "1_sided", name: "1 Sided", value: 1 },
    { id: "2_sided", name: "2 Sided", value: 2 }
  ]);

  const [printModeOptions, setPrintModeOptions] = useState([
    { id: "color", name: "Colour", type: "color" },
    { id: "bw", name: "Black & White (Grayscale)", type: "bw" }
  ]);

  // Global Print Settings (for live simulator)
  const [globalPrintSettings, setGlobalPrintSettings] = useState({
    colorClickCharge: 0.08,
    grayscaleClickCharge: 0.02,
    markupMultiplier: 2.0
  });

  // Simulator Test States
  const [simQty, setSimQty] = useState(500);
  const [simSizeIdx, setSimSizeIdx] = useState(0);
  const [simSidesIdx, setSimSidesIdx] = useState(1);
  const [simModeIdx, setSimModeIdx] = useState(0);

  // Product Markup Overrides
  const [useCustomMarkup, setUseCustomMarkup] = useState(false);
  const [markupPercent, setMarkupPercent] = useState(35);

  useEffect(() => {
    const fetchProductAndCategories = async () => {
      setLoading(true);
      try {
        // Fetch categories list and global print settings in parallel
        const [catSnap, settingsRes] = await Promise.all([
          getDocs(collection(db, "categories")),
          fetch("/api/admin/custom-print-settings").then(r => r.json()).catch(() => null)
        ]);

        const catList = [];
        catSnap.forEach(d => {
          catList.push({ id: d.id, ...d.data() });
        });
        setCategories(catList);

        if (settingsRes && !settingsRes.error) {
          setGlobalPrintSettings({
            colorClickCharge: parseFloat(settingsRes.colorClickCharge) || 0.08,
            grayscaleClickCharge: parseFloat(settingsRes.grayscaleClickCharge) || 0.02,
            markupMultiplier: parseFloat(settingsRes.markupMultiplier) || 2.0
          });
        }

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
          
          if (data.isCustom) {
            setName(data.name || "");
            setSku(data.sku || "");
            setCategoryId(data.categoryId || "");
            setPriceOverride(data.basePrice !== undefined ? data.basePrice : (data.pricing?.startingPrice || ""));
            setOptionGroups(data.options || []);

            if (Array.isArray(data.customPrintSizes) && data.customPrintSizes.length > 0) {
              setCustomPrintSizes(data.customPrintSizes);
            }
            if (Array.isArray(data.sidesPagesOptions) && data.sidesPagesOptions.length > 0) {
              setSidesPagesOptions(data.sidesPagesOptions);
            }
            if (Array.isArray(data.printModeOptions) && data.printModeOptions.length > 0) {
              setPrintModeOptions(data.printModeOptions);
            }
          } else {
            // API product overrides & custom editable name
            setName(data.name || data.sinalite?.name || "");
            setSku(data.sku || data.sinalite?.sku || "");
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

  // Custom Print Sizes Handlers
  const addSizeRow = () => {
    setCustomPrintSizes(prev => [
      ...prev,
      { id: `sz_${Date.now()}`, name: "New Size", imposition: 2, costPerM: 30.00 }
    ]);
  };

  const removeSizeRow = (idx) => {
    setCustomPrintSizes(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSizeChange = (idx, field, value) => {
    setCustomPrintSizes(prev => prev.map((s, i) => {
      if (i === idx) {
        return {
          ...s,
          [field]: field === "imposition" || field === "costPerM" ? (parseFloat(value) || 0) : value
        };
      }
      return s;
    }));
  };

  // Sides / Pages Handlers
  const addSidesOption = () => {
    const nextVal = sidesPagesOptions.length + 1;
    setSidesPagesOptions(prev => [
      ...prev,
      { id: `sides_${Date.now()}`, name: `${nextVal} Pages`, value: nextVal }
    ]);
  };

  const removeSidesOption = (idx) => {
    setSidesPagesOptions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSidesChange = (idx, field, value) => {
    setSidesPagesOptions(prev => prev.map((item, i) => {
      if (i === idx) {
        return {
          ...item,
          [field]: field === "value" ? (parseFloat(value) || 1) : value
        };
      }
      return item;
    }));
  };

  // Print Mode Handlers
  const addPrintModeOption = () => {
    setPrintModeOptions(prev => [
      ...prev,
      { id: `mode_${Date.now()}`, name: "Custom Print Mode", type: "color" }
    ]);
  };

  const removePrintModeOption = (idx) => {
    setPrintModeOptions(prev => prev.filter((_, i) => i !== idx));
  };

  const handlePrintModeChange = (idx, field, value) => {
    setPrintModeOptions(prev => prev.map((m, i) => {
      if (i === idx) {
        return { ...m, [field]: value };
      }
      return m;
    }));
  };

  // Optional Additional Option groups handlers
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

  // Run Real-Time Calculation for Live Simulator
  const activeSimSize = customPrintSizes[simSizeIdx] || customPrintSizes[0] || { name: '8.5" x 11"', imposition: 2, costPerM: 40 };
  const activeSimSides = sidesPagesOptions[simSidesIdx] || sidesPagesOptions[0] || { name: "1 Sided", value: 1 };
  const activeSimMode = printModeOptions[simModeIdx] || printModeOptions[0] || { name: "Colour", type: "color" };

  const liveSimulation = calculateCustomPrintPrice({
    quantity: simQty,
    size: activeSimSize,
    sidesPages: activeSimSides,
    printMode: activeSimMode,
    basePrice: parseFloat(priceOverride) || 0,
    settings: globalPrintSettings
  });

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError("");

    try {
      const docRef = doc(db, "products", productId);
      const needsAttention = images.length === 0 || (!shortDescription && !longDescription);

      if (product.isCustom) {
        // Validate additional custom option groups if any
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

        const basePriceVal = parseFloat(priceOverride) || 0;

        const updateData = {
          name,
          sku,
          shortDescription,
          longDescription,
          description: longDescription || shortDescription,
          categoryId,
          basePrice: basePriceVal,
          "pricing.startingPrice": basePriceVal,
          displayOrder: parseInt(displayOrder) || 0,
          isVisible: isVisible,
          images,
          isCustomPrint: true,
          customPrintSizes,
          sidesPagesOptions,
          printModeOptions,
          options: optionGroups,
          useCustomMarkup,
          markupPercent: parseFloat(markupPercent) || 0,
          needsAttention,
        };

        await updateDoc(docRef, updateData);
      } else {
        const priceVal = priceOverride !== "" ? parseFloat(priceOverride) : null;
        
        const updateData = {
          name: name.trim() || null,
          shortDescription,
          longDescription,
          description: longDescription || shortDescription,
          categoryOverride: categoryId || null,
          displayOrder: parseInt(displayOrder) || 0,
          isVisible: isVisible,
          images,
          useCustomMarkup,
          markupPercent: parseFloat(markupPercent) || 0,
          needsAttention,
          "pricing.startingPriceOverride": priceVal,
        };

        await updateDoc(docRef, updateData);
      }

      setSuccess(true);
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
        <Link href="/admin/products" className="btn btn-secondary" style={{ marginTop: "1rem", display: "inline-flex" }}>
          Back to Catalog
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ marginBottom: "1.5rem" }}>
        <Link href={product?.isCustom ? "/admin/products?type=custom" : "/admin/products?type=synced"} style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "hsl(var(--muted-hsl))", fontSize: "0.9rem", fontWeight: 600 }}>
          <ArrowLeft size={16} /> Back to {product?.isCustom ? "Custom Products" : "Product Catalog"}
        </Link>
      </div>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", marginBottom: "0.25rem", fontWeight: 900 }}>Edit Product</h1>
          <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.95rem" }}>
            {product?.isCustom ? (
              <>
                <span style={{ fontSize: "0.85rem", padding: "0.2rem 0.5rem", marginRight: "0.5rem", backgroundColor: "hsl(var(--primary-hsl) / 0.15)", color: "hsl(var(--primary-hsl))", borderRadius: "4px", fontWeight: 700 }}>Custom Print Product</span>
                {name || "Untitled Product"} <span style={{ fontSize: "0.8rem", padding: "0.1rem 0.4rem", backgroundColor: "hsl(var(--secondary-hsl))", borderRadius: "4px" }}>SKU: {sku || "N/A"}</span>
              </>
            ) : (
              <>
                <span style={{ fontSize: "0.85rem", padding: "0.2rem 0.5rem", marginRight: "0.5rem", backgroundColor: "hsl(var(--success-hsl) / 0.15)", color: "hsl(var(--success-hsl))", borderRadius: "4px", fontWeight: 700 }}>Synced API Product</span>
                {name || product?.sinalite?.name} <span style={{ fontSize: "0.8rem", padding: "0.1rem 0.4rem", backgroundColor: "hsl(var(--secondary-hsl))", borderRadius: "4px" }}>SKU: {product?.sinalite?.sku || product?.sku || "N/A"}</span>
              </>
            )}
          </p>
        </div>
        <button
          onClick={handleSave}
          className="btn btn-primary"
          disabled={saving}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.75rem", fontWeight: 800 }}
        >
          {saving ? <Loader2 size={18} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} /> : <Save size={18} />}
          {saving ? "Saving Changes..." : "Save Product"}
        </button>
      </div>

      {success && (
        <div className="card" style={{ borderColor: "hsl(var(--success-hsl))", backgroundColor: "hsl(var(--success-hsl) / 0.05)", padding: "1rem 1.5rem", marginBottom: "1.5rem", color: "hsl(var(--success-hsl))", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <CheckCircle2 size={18} /> Changes saved successfully!
        </div>
      )}

      {error && (
        <div className="card" style={{ borderColor: "hsl(var(--destructive-hsl))", backgroundColor: "hsl(var(--destructive-hsl) / 0.05)", padding: "1rem 1.5rem", marginBottom: "1.5rem", color: "hsl(var(--destructive-hsl))", fontWeight: 600 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="admin-form-grid">
        {/* Left column: Content details */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* Product Name & Specifications Card */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "1.2rem", margin: 0, fontWeight: 800 }}>Product Information</h2>
              <span style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                padding: "0.2rem 0.55rem",
                borderRadius: "4px",
                backgroundColor: product?.isCustom ? "hsl(var(--primary-hsl) / 0.12)" : "hsl(var(--success-hsl) / 0.12)",
                color: product?.isCustom ? "hsl(var(--primary-hsl))" : "hsl(var(--success-hsl))"
              }}>
                {product?.isCustom ? "Custom In-House Product" : "SinaLite Synced Product"}
              </span>
            </div>

            <div>
              <label className="label">
                Product Name {product?.isCustom ? "(Required)" : "(Storefront Title Override)"}
              </label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={product?.isCustom ? "e.g. Premium Custom Workwear Jacket" : (product?.sinalite?.name || "Product Name")}
                required={product?.isCustom}
              />
            </div>

            {product?.isCustom ? (
              <div>
                <label className="label">SKU</label>
                <input className="input" value={sku} onChange={(e) => setSku(e.target.value)} required />
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", padding: "0.75rem 1rem", backgroundColor: "hsl(var(--secondary-hsl) / 0.2)", borderRadius: "var(--radius-sm)", fontSize: "0.825rem" }}>
                <div>
                  <span style={{ color: "hsl(var(--muted-hsl))" }}>API SKU: </span>
                  <strong style={{ fontFamily: "monospace" }}>{product?.sinalite?.sku || product?.sku || "N/A"}</strong>
                </div>
                <div>
                  <span style={{ color: "hsl(var(--muted-hsl))" }}>API Category: </span>
                  <strong>{product?.sinalite?.category || "N/A"}</strong>
                </div>
                <div>
                  <span style={{ color: "hsl(var(--muted-hsl))" }}>Live Options: </span>
                  <strong>{optionGroupsCount} groups</strong>
                </div>
              </div>
            )}
          </div>

          {/* Description Card */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div>
              <h2 style={{ fontSize: "1.2rem", marginBottom: "0.25rem", fontWeight: 800 }}>Short Description (Summary)</h2>
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
              <h2 style={{ fontSize: "1.2rem", marginBottom: "0.25rem", fontWeight: 800 }}>Long Description (Detailed Specs)</h2>
              <textarea
                className="input"
                value={longDescription}
                onChange={(e) => setLongDescription(e.target.value)}
                placeholder="Provide detailed specs, sizing tables, material options, artwork instructions..."
                rows={6}
                style={{ resize: "vertical", fontFamily: "inherit" }}
              />
            </div>
          </div>

          {/* Custom Print Variants Configuration if product is custom */}
          {product?.isCustom && (
            <>
              {/* 1. Print Sizes Matrix */}
              <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem", border: "1.5px solid #CBD5E1" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Printer size={18} style={{ color: "#2563EB" }} />
                      <h2 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0 }}>
                        1. Print Sizes Matrix
                      </h2>
                    </div>
                    <p style={{ fontSize: "0.8rem", color: "hsl(var(--muted-hsl))", margin: "0.2rem 0 0" }}>
                      Customer only selects Size Name. Imposition & Cost/M are used by the backend pricing engine.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addSizeRow}
                    className="btn btn-outline"
                    style={{ padding: "0.4rem 0.85rem", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.25rem" }}
                  >
                    <Plus size={14} /> Add Size
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 1.4fr auto", gap: "0.75rem", padding: "0 0.5rem", fontSize: "0.75rem", fontWeight: 800, color: "#64748B" }}>
                    <span>SIZE LABEL (CUSTOMER SEES)</span>
                    <span>IMPOSITION (CUTS/SHEET)</span>
                    <span>PAPER COST / M ($ CAD)</span>
                    <span></span>
                  </div>

                  {customPrintSizes.map((sz, idx) => (
                    <div
                      key={sz.id || idx}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "2fr 1.2fr 1.4fr auto",
                        gap: "0.75rem",
                        alignItems: "center",
                        backgroundColor: "#F8FAFC",
                        padding: "0.75rem",
                        borderRadius: "8px",
                        border: "1px solid #E2E8F0"
                      }}
                    >
                      <input
                        type="text"
                        className="input"
                        value={sz.name}
                        onChange={(e) => handleSizeChange(idx, "name", e.target.value)}
                        placeholder='e.g. 8.5" x 11"'
                        style={{ fontWeight: 700, padding: "0.45rem 0.65rem", fontSize: "0.85rem" }}
                        required
                      />

                      <input
                        type="number"
                        min="1"
                        className="input"
                        value={sz.imposition}
                        onChange={(e) => handleSizeChange(idx, "imposition", e.target.value)}
                        placeholder="2"
                        style={{ padding: "0.45rem 0.65rem", fontSize: "0.85rem" }}
                        required
                      />

                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#64748B", fontWeight: 700, fontSize: "0.85rem" }}>$</span>
                        <input
                          type="number"
                          step="0.01"
                          className="input"
                          value={sz.costPerM}
                          onChange={(e) => handleSizeChange(idx, "costPerM", e.target.value)}
                          placeholder="40.00"
                          style={{ paddingLeft: "1.65rem", paddingRight: "0.5rem", paddingTop: "0.45rem", paddingBottom: "0.45rem", fontSize: "0.85rem" }}
                          required
                        />
                      </div>

                      {customPrintSizes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSizeRow(idx)}
                          style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", padding: "0.25rem" }}
                          title="Remove size"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Sides / Pages & Print Mode */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
                
                {/* Sides / Pages Card */}
                <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h3 style={{ fontSize: "1rem", fontWeight: 800, margin: 0 }}>
                        2. Sides / Pages
                      </h3>
                      <span style={{ fontSize: "0.75rem", color: "#64748B" }}>Multiplied in Paper Cost</span>
                    </div>
                    <button type="button" onClick={addSidesOption} className="btn btn-outline" style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}>
                      <Plus size={12} /> Add
                    </button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {sidesPagesOptions.map((side, idx) => (
                      <div key={side.id || idx} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <input
                          type="text"
                          className="input"
                          value={side.name}
                          onChange={(e) => handleSidesChange(idx, "name", e.target.value)}
                          placeholder="e.g. 1 Sided, 2 Sided, 8 Pages"
                          style={{ flex: 1.8, fontSize: "0.85rem", padding: "0.45rem 0.65rem" }}
                          required
                        />
                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexShrink: 0 }}>
                          <span style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 700 }}>Val:</span>
                          <input
                            type="number"
                            className="input"
                            value={side.value}
                            onChange={(e) => handleSidesChange(idx, "value", e.target.value)}
                            style={{ fontSize: "0.85rem", width: "64px", padding: "0.45rem 0.5rem", textAlign: "center" }}
                            required
                          />
                        </div>
                        {sidesPagesOptions.length > 1 && (
                          <button type="button" onClick={() => removeSidesOption(idx)} style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer" }}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Print Mode Card */}
                <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h3 style={{ fontSize: "1rem", fontWeight: 800, margin: 0 }}>
                        3. Print Mode
                      </h3>
                      <span style={{ fontSize: "0.75rem", color: "#64748B" }}>Determines Click Charge</span>
                    </div>
                    <button type="button" onClick={addPrintModeOption} className="btn btn-outline" style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}>
                      <Plus size={12} /> Add
                    </button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {printModeOptions.map((mode, idx) => (
                      <div key={mode.id || idx} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <input
                          type="text"
                          className="input"
                          value={mode.name}
                          onChange={(e) => handlePrintModeChange(idx, "name", e.target.value)}
                          placeholder="e.g. Colour, B&W"
                          style={{ flex: 1.8, fontSize: "0.85rem", padding: "0.45rem 0.65rem" }}
                          required
                        />
                        <select
                          className="input"
                          value={mode.type}
                          onChange={(e) => handlePrintModeChange(idx, "type", e.target.value)}
                          style={{ flex: 1.2, fontSize: "0.8rem", padding: "0.45rem 0.5rem" }}
                        >
                          <option value="color">Colour Rate</option>
                          <option value="bw">B&W Rate</option>
                        </select>
                        {printModeOptions.length > 1 && (
                          <button type="button" onClick={() => removePrintModeOption(idx)} style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer" }}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Interactive Live Calculation Sandbox / Validator Box */}
              <div style={{
                backgroundColor: "#F0FDF4",
                border: "2px solid #86EFAC",
                borderRadius: "12px",
                padding: "1.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#166534" }}>
                    <Calculator size={20} />
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 900, margin: 0 }}>
                      Live Backend Pricing Validator
                    </h3>
                  </div>
                  <span style={{ fontSize: "0.75rem", backgroundColor: "#DCFCE7", color: "#166534", padding: "0.25rem 0.6rem", borderRadius: "20px", fontWeight: 700 }}>
                    Cost = (Sides × Cost/M ÷ 1000) + (Clicks × Click Charge)
                  </span>
                </div>

                {/* Simulator Controls */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.75rem" }}>
                  <div>
                    <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "#166534" }}>Test Quantity</label>
                    <input type="number" className="input" value={simQty} onChange={e => setSimQty(e.target.value)} style={{ fontSize: "0.85rem", height: "36px" }} />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "#166534" }}>Test Size</label>
                    <select className="input" value={simSizeIdx} onChange={e => setSimSizeIdx(parseInt(e.target.value))} style={{ fontSize: "0.85rem", height: "36px" }}>
                      {customPrintSizes.map((s, i) => (
                        <option key={i} value={i}>{s.name} (Imp: {s.imposition}, ${s.costPerM}/M)</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "#166534" }}>Test Sides/Pages</label>
                    <select className="input" value={simSidesIdx} onChange={e => setSimSidesIdx(parseInt(e.target.value))} style={{ fontSize: "0.85rem", height: "36px" }}>
                      {sidesPagesOptions.map((s, i) => (
                        <option key={i} value={i}>{s.name} (Val: {s.value})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "#166534" }}>Test Mode</label>
                    <select className="input" value={simModeIdx} onChange={e => setSimModeIdx(parseInt(e.target.value))} style={{ fontSize: "0.85rem", height: "36px" }}>
                      {printModeOptions.map((m, i) => (
                        <option key={i} value={i}>{m.name} ({m.type === "color" ? `$${globalPrintSettings.colorClickCharge}` : `$${globalPrintSettings.grayscaleClickCharge}`})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Real-Time Live Math Breakdown Cards */}
                <div style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: "10px",
                  border: "1px solid #BBF7D0",
                  padding: "1.25rem",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                  gap: "1rem"
                }}>
                  <div>
                    <span style={{ fontSize: "0.7rem", color: "#64748B", fontWeight: 700, display: "block" }}>1. Press Clicks</span>
                    <span style={{ fontSize: "1.1rem", fontWeight: 900, color: "#0F172A" }}>{liveSimulation.clicks} Clicks</span>
                    <span style={{ fontSize: "0.68rem", color: "#64748B", display: "block" }}>{simQty} qty ÷ {liveSimulation.imposition} imposition</span>
                  </div>

                  <div>
                    <span style={{ fontSize: "0.7rem", color: "#64748B", fontWeight: 700, display: "block" }}>2. Click Cost</span>
                    <span style={{ fontSize: "1.1rem", fontWeight: 900, color: "#0F172A" }}>${liveSimulation.clickCost.toFixed(2)}</span>
                    <span style={{ fontSize: "0.68rem", color: "#64748B", display: "block" }}>{liveSimulation.clicks} × ${liveSimulation.clickCharge.toFixed(3)}</span>
                  </div>

                  <div>
                    <span style={{ fontSize: "0.7rem", color: "#64748B", fontWeight: 700, display: "block" }}>3. Paper Cost</span>
                    <span style={{ fontSize: "1.1rem", fontWeight: 900, color: "#0F172A" }}>${liveSimulation.paperCost.toFixed(2)}</span>
                    <span style={{ fontSize: "0.68rem", color: "#64748B", display: "block" }}>({liveSimulation.sidesCount} sides × ${liveSimulation.paperCostPerM}/M ÷ 1000) × {liveSimulation.clicks}</span>
                  </div>

                  <div>
                    <span style={{ fontSize: "0.7rem", color: "#64748B", fontWeight: 700, display: "block" }}>4. Total Job Cost</span>
                    <span style={{ fontSize: "1.1rem", fontWeight: 900, color: "#EA580C" }}>${liveSimulation.totalCost.toFixed(2)}</span>
                    <span style={{ fontSize: "0.68rem", color: "#64748B", display: "block" }}>Paper + Click Cost</span>
                  </div>

                  <div style={{ backgroundColor: "#F8FAFC", padding: "0.75rem", borderRadius: "8px", border: "1.5px solid #2563EB" }}>
                    <span style={{ fontSize: "0.7rem", color: "#2563EB", fontWeight: 800, display: "block" }}>5. Customer Selling Price</span>
                    <span style={{ fontSize: "1.3rem", fontWeight: 900, color: "#2563EB" }}>${liveSimulation.finalPrice.toFixed(2)} CAD</span>
                    <span style={{ fontSize: "0.72rem", color: "#166534", fontWeight: 700, display: "block" }}>
                      ${liveSimulation.unitPrice.toFixed(2)}/unit • {liveSimulation.markupMultiplier}x Multiplier + ${parseFloat(priceOverride || 0).toFixed(2)} Base
                    </span>
                  </div>
                </div>
              </div>

              {/* Optional Additional Custom Options */}
              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                  <div>
                    <h2 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0 }}>Additional Custom Options (Optional)</h2>
                    <p style={{ fontSize: "0.8rem", color: "hsl(var(--muted-hsl))", margin: "0.2rem 0 0" }}>
                      Configure extra selectors (e.g. Folding, Lamination, Round Corners).
                    </p>
                  </div>
                  <button type="button" onClick={addOptionGroup} className="btn btn-outline" style={{ padding: "0.4rem 0.85rem", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <Plus size={14} /> Add Option Group
                  </button>
                </div>

                {optionGroups.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "1.5rem", border: "1px dashed hsl(var(--border-hsl))", borderRadius: "var(--radius-md)", color: "hsl(var(--muted-hsl))", fontSize: "0.85rem" }}>
                    No extra options. Only the standard Custom Print engine variants (Sizes, Sides, Print Mode) will be used.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    {optionGroups.map((group, gIdx) => (
                      <div key={gIdx} className="card" style={{ padding: "1rem", backgroundColor: "#F8FAFC", position: "relative" }}>
                        <button
                          type="button"
                          onClick={() => removeOptionGroup(gIdx)}
                          style={{ position: "absolute", top: "0.75rem", right: "0.75rem", background: "none", border: "none", color: "#EF4444", cursor: "pointer" }}
                        >
                          <Trash2 size={15} />
                        </button>

                        <div style={{ maxWidth: "75%", marginBottom: "0.75rem" }}>
                          <label className="label">Option Group Name</label>
                          <input className="input" value={group.name} onChange={(e) => handleGroupNameChange(gIdx, e.target.value)} required />
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                          {group.choices.map((choice, cIdx) => (
                            <div key={cIdx} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                              <input
                                className="input"
                                value={choice.name}
                                onChange={(e) => handleChoiceChange(gIdx, cIdx, "name", e.target.value)}
                                placeholder="Choice name (e.g. Gloss Lamination, Half Fold)"
                                style={{ flex: 2 }}
                                required
                              />
                              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flex: 1 }}>
                                <span style={{ fontSize: "0.8rem", fontWeight: 700 }}>+$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  className="input"
                                  value={choice.priceUpcharge}
                                  onChange={(e) => handleChoiceChange(gIdx, cIdx, "priceUpcharge", e.target.value)}
                                />
                              </div>
                              {group.choices.length > 1 && (
                                <button type="button" onClick={() => removeChoice(gIdx, cIdx)} style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer" }}>
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                          <button type="button" onClick={() => addChoice(gIdx)} className="btn btn-outline" style={{ padding: "0.3rem 0.65rem", fontSize: "0.75rem", width: "fit-content", marginTop: "0.25rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                            <Plus size={12} /> Add Choice Row
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Media Images Card */}
          <div className="card">
            <h2 style={{ fontSize: "1.2rem", marginBottom: "0.5rem", fontWeight: 800 }}>Storefront Images</h2>
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
            <h2 style={{ fontSize: "1.2rem", marginBottom: "1.25rem", fontWeight: 800 }}>Storefront Settings</h2>
            
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

              {/* Starting / Base Price */}
              <div>
                <label className="label" htmlFor="price-override">
                  {product?.isCustom ? "Base Setup Price ($ CAD)*" : "Starting Price Override ($ CAD)"}
                </label>
                <input
                  id="price-override"
                  type="number"
                  step="0.01"
                  className="input"
                  placeholder={parseFloat(product?.basePrice || product?.pricing?.startingPrice || 0).toFixed(2)}
                  value={priceOverride}
                  onChange={(e) => setPriceOverride(e.target.value)}
                />
                <span style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))", display: "block", marginTop: "0.25rem" }}>
                  {product?.isCustom 
                    ? "Base setup cost added to the paper & click pricing formula."
                    : `Manually override starting price (cheapest calculations: $${parseFloat(product?.pricing?.startingPrice || 0).toFixed(2)}).`
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Markup Override Card */}
          <div className="card">
            <h2 style={{ fontSize: "1.2rem", marginBottom: "1rem", fontWeight: 800 }}>Pricing & Markup Settings</h2>
            
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

          {/* SinaLite Specs (Only if API Product) */}
          {!product?.isCustom && (
            <div className="card" style={{ backgroundColor: "hsl(var(--secondary-hsl) / 0.2)" }}>
              <h2 style={{ fontSize: "1.1rem", marginBottom: "1rem", fontWeight: 800 }}>SinaLite Details</h2>
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
    </div>
  );
}
