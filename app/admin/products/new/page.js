"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, Trash2, Plus, Save, Loader2, Printer, Calculator, CheckCircle2, Layers } from "lucide-react";
import { calculateCustomPrintPrice } from "@/lib/custom-print-pricing";

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
  const [shortDescription, setShortDescription] = useState("");
  const [longDescription, setLongDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [basePrice, setBasePrice] = useState("10.00");
  const [images, setImages] = useState([]);

  // Auto-added Custom Print Variants
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

  // Optional Additional Custom Option Groups (Finishing, Folding, etc.)
  const [optionGroups, setOptionGroups] = useState([]);

  // Global Print Settings (for live simulator)
  const [globalPrintSettings, setGlobalPrintSettings] = useState({
    colorClickCharge: 0.08,
    grayscaleClickCharge: 0.02,
    markupMultiplier: 2.0
  });

  // Simulator Test States
  const [simQty, setSimQty] = useState(500);
  const [simSizeIdx, setSimSizeIdx] = useState(0);
  const [simSidesIdx, setSimSidesIdx] = useState(1); // Default 2 sided
  const [simModeIdx, setSimModeIdx] = useState(0); // Default Color

  // Product Markup Overrides
  const [useCustomMarkup, setUseCustomMarkup] = useState(false);
  const [markupPercent, setMarkupPercent] = useState(35);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catSnapshot, settingsRes] = await Promise.all([
          getDocs(collection(db, "categories")),
          fetch("/api/admin/custom-print-settings").then(r => r.json()).catch(() => null)
        ]);

        const list = [];
        catSnapshot.forEach(d => {
          list.push({ id: d.id, ...d.data() });
        });
        setCategories(list);
        if (list.length > 0) {
          setCategoryId(list[0].id);
        }

        if (settingsRes && !settingsRes.error) {
          setGlobalPrintSettings({
            colorClickCharge: parseFloat(settingsRes.colorClickCharge) || 0.08,
            grayscaleClickCharge: parseFloat(settingsRes.grayscaleClickCharge) || 0.02,
            markupMultiplier: parseFloat(settingsRes.markupMultiplier) || 2.0
          });
        }
      } catch (err) {
        console.error("Failed to load initial data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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

  // Optional Additional Option Groups Handlers
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
    basePrice: parseFloat(basePrice) || 0,
    settings: globalPrintSettings
  });

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

    if (customPrintSizes.length === 0) {
      setError("Please add at least one custom print size.");
      setSaving(false);
      return;
    }

    try {
      // Validate option groups if any
      for (const group of optionGroups) {
        if (!group.name.trim()) {
          throw new Error("Additional option groups must have a name.");
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

      const needsAttention = images.length === 0 || (!shortDescription && !longDescription);

      const productPayload = {
        id: docRef.id,
        isCustom: true,
        isCustomPrint: true,
        isVisible: true,
        name,
        sku: sku || `print-${docRef.id.slice(0, 6)}`,
        shortDescription,
        longDescription,
        description: longDescription || shortDescription,
        categoryId,
        basePrice: parseFloat(basePrice) || 0,
        pricing: {
          startingPrice: parseFloat(basePrice) || 0
        },
        images,
        customPrintSizes,
        sidesPagesOptions,
        printModeOptions,
        options: optionGroups,
        useCustomMarkup,
        markupPercent: parseFloat(markupPercent) || 0,
        needsAttention,
        createdAt: new Date()
      };

      await setDoc(docRef, productPayload);
      setSuccess(true);
      
      // Redirect back to admin catalogue
      setTimeout(() => {
        router.push("/admin/products?type=custom");
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
        <Link href="/admin/products?type=custom" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "hsl(var(--muted-hsl))", fontSize: "0.9rem", fontWeight: 600 }}>
          <ArrowLeft size={16} /> Back to Catalog
        </Link>
      </div>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", marginBottom: "0.25rem", fontWeight: 900 }}>Add Custom Print Product</h1>
          <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.95rem" }}>
            Create a custom print product with automatic click charges, size imposition, paper cost, and base pricing.
          </p>
        </div>
        <button
          onClick={handleSave}
          className="btn btn-primary"
          disabled={saving}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.75rem", fontWeight: 800 }}
        >
          {saving ? <Loader2 size={18} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} /> : <Save size={18} />}
          {saving ? "Saving Product..." : "Save Product"}
        </button>
      </div>

      {success && (
        <div className="card" style={{ borderColor: "hsl(var(--success-hsl))", backgroundColor: "hsl(var(--success-hsl) / 0.05)", padding: "1rem 1.5rem", marginBottom: "1.5rem", color: "hsl(var(--success-hsl))", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <CheckCircle2 size={18} /> Custom product created successfully! Redirecting...
        </div>
      )}

      {error && (
        <div className="card" style={{ borderColor: "hsl(var(--destructive-hsl))", backgroundColor: "hsl(var(--destructive-hsl) / 0.05)", padding: "1rem 1.5rem", marginBottom: "1.5rem", color: "hsl(var(--destructive-hsl))", fontWeight: 600 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="admin-form-grid">
        {/* Left Column: Core Details, Auto Variants, Matrix, & Simulator */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
          
          {/* General Information Card */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 800 }}>General Information</h2>
            
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
              <div>
                <label className="label">Product Title</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Custom Presentation Folders, Booklets, Flyers" required />
              </div>
              <div>
                <label className="label">SKU</label>
                <input className="input" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g. PRNT-FLDR-01" />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label className="label">Category</label>
                <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Base Price ($ CAD)*</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  placeholder="10.00"
                  required
                />
                <span style={{ fontSize: "0.72rem", color: "hsl(var(--muted-hsl))", marginTop: "0.25rem", display: "block" }}>
                  Fixed starting setup cost added to final calculation
                </span>
              </div>
            </div>

            <div>
              <label className="label">Short Description</label>
              <textarea className="input" value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} rows={2} placeholder="Brief summary shown in product cards..." required />
            </div>

            <div>
              <label className="label">Long Description / Specifications</label>
              <textarea className="input" value={longDescription} onChange={(e) => setLongDescription(e.target.value)} rows={4} placeholder="Full product details, paper stocks, print quality..." required />
            </div>
          </div>

          {/* 1. Custom Print Sizes Matrix (Size - Imposition - Cost/M) */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem", border: "1.5px solid #CBD5E1" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Printer size={18} style={{ color: "#2563EB" }} />
                  <h2 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0 }}>
                    1. Print Sizes Matrix (Auto-Added)
                  </h2>
                </div>
                <p style={{ fontSize: "0.8rem", color: "hsl(var(--muted-hsl))", margin: "0.2rem 0 0" }}>
                  Customer only sees Size Name. Imposition & Cost/M are used by the backend pricing engine.
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

                  <div>
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
                  </div>

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

          {/* 2. Sides / Pages & Print Mode Variants */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
            
            {/* Sides / Pages Card */}
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 800, margin: 0 }}>
                    2. Sides / Pages (Auto-Added)
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
                    3. Print Mode (Auto-Added)
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
                  ${liveSimulation.unitPrice.toFixed(2)}/unit • {liveSimulation.markupMultiplier}x Multiplier + ${parseFloat(basePrice || 0).toFixed(2)} Base
                </span>
              </div>
            </div>
          </div>

          {/* Optional Additional Custom Option Groups (e.g. Folding, Coating) */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0 }}>Additional Custom Options (Optional)</h2>
                <p style={{ fontSize: "0.8rem", color: "hsl(var(--muted-hsl))", margin: "0.2rem 0 0" }}>
                  Add extra custom selectors (e.g. Folding, Lamination, Round Corners).
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
                      <input className="input" value={group.name} onChange={(e) => handleGroupNameChange(gIdx, e.target.value)} placeholder="e.g. Finishing, Folding, Round Corners" required />
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
                              placeholder="0.00"
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
        </div>

        {/* Right Column: Images & Uploads */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Media Images Card */}
          <div className="card">
            <h2 style={{ fontSize: "1.2rem", marginBottom: "0.5rem", fontWeight: 800 }}>Storefront Images</h2>
            <p style={{ fontSize: "0.85rem", color: "hsl(var(--muted-hsl))", marginBottom: "1.25rem" }}>
              Upload product renders or mockups shown to customers.
            </p>

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
                      {index === 0 ? "Hero Image" : `Image ${index + 1}`}
                    </span>
                  </div>
                ))}
              </div>
            )}

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
