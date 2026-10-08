"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  Upload, 
  Trash2, 
  Plus, 
  Save, 
  Loader2, 
  AlertCircle, 
  Ruler, 
  CheckCircle2, 
  Shirt, 
  Sparkles, 
  Palette, 
  FileText, 
  Layers,
  Check,
  Eye,
  Table as TableIcon
} from "lucide-react";
import AdminGarmentCalibration from "@/components/AdminGarmentCalibration";

const DEFAULT_SIZES = [
  { name: "S", priceUpcharge: 0 },
  { name: "M", priceUpcharge: 0 },
  { name: "L", priceUpcharge: 0 },
  { name: "XL", priceUpcharge: 0 },
  { name: "2XL", priceUpcharge: 3.50 },
  { name: "3XL", priceUpcharge: 5.00 },
];

const STANDARD_COLORS_PRESET = [
  { name: "White", hex: "#FFFFFF" },
  { name: "Black", hex: "#111827" },
  { name: "Navy Blue", hex: "#1E293B" },
  { name: "Heather Grey", hex: "#94A3B8" },
  { name: "Royal Blue", hex: "#2563EB" },
  { name: "Forest Green", hex: "#15803D" },
  { name: "Crimson Red", hex: "#DC2626" },
  { name: "Maroon", hex: "#831843" },
  { name: "Charcoal", hex: "#374151" },
  { name: "Sand / Khaki", hex: "#D6C7B2" },
  { name: "Pastel Pink", hex: "#F472B6" },
  { name: "Sky Blue", hex: "#38BDF8" },
];

const DEFAULT_PRINT_LOCATIONS = [
  { id: "front", label: "Front Only", priceUpcharge: 0, sides: ["front"] },
  { id: "back", label: "Back Only", priceUpcharge: 0, sides: ["back"] },
  { id: "front_back", label: "Front & Back", priceUpcharge: 5.00, sides: ["front", "back"] },
  { id: "left_chest_back", label: "Left Chest + Full Back", priceUpcharge: 6.00, sides: ["left", "back"] },
];

const DEFAULT_SIZE_CHART_TABLE = [
  { size: "S", chest: "36 - 38\"", length: "28\"", sleeve: "15.5\"" },
  { size: "M", chest: "40 - 42\"", length: "29\"", sleeve: "17\"" },
  { size: "L", chest: "44 - 46\"", length: "30\"", sleeve: "18.5\"" },
  { size: "XL", chest: "48 - 50\"", length: "31\"", sleeve: "20\"" },
  { size: "2XL", chest: "52 - 54\"", length: "32\"", sleeve: "21.5\"" },
  { size: "3XL", chest: "56 - 58\"", length: "33\"", sleeve: "23\"" },
];

export default function AdminNewApparelProductPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingSizeChart, setUploadingSizeChart] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Core Form states
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [longDescription, setLongDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [basePrice, setBasePrice] = useState("28.00");
  const [images, setImages] = useState([]);
  const [minimumOrderQuantity, setMinimumOrderQuantity] = useState(12);

  // Apparel specific states
  const [fit, setFit] = useState("Semi-fitted");
  const [sizes, setSizes] = useState(DEFAULT_SIZES);
  const [colors, setColors] = useState(STANDARD_COLORS_PRESET.slice(0, 6));
  const [printLocations, setPrintLocations] = useState(DEFAULT_PRINT_LOCATIONS);

  // Size chart configuration
  const [sizeChartType, setSizeChartType] = useState("table"); // 'image', 'pdf', or 'table'
  const [sizeChartUrl, setSizeChartUrl] = useState("");
  const [sizeChartTable, setSizeChartTable] = useState(DEFAULT_SIZE_CHART_TABLE);

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

  // Primary image gallery upload
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

  // Size chart upload handler (PDF or Image)
  const handleUploadSizeChart = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingSizeChart(true);
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
        throw new Error(data.error || "Failed to upload size chart file.");
      }

      setSizeChartUrl(data.url);
      if (file.type.includes("pdf")) {
        setSizeChartType("pdf");
      } else {
        setSizeChartType("image");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Size chart upload failed.");
    } finally {
      setUploadingSizeChart(false);
    }
  };

  // Sizing handlers
  const handleAddSize = () => {
    setSizes(prev => [...prev, { name: "", priceUpcharge: 0 }]);
  };

  const handleRemoveSize = (index) => {
    setSizes(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSizeChange = (index, field, val) => {
    setSizes(prev => prev.map((s, idx) => {
      if (idx === index) {
        return {
          ...s,
          [field]: field === "priceUpcharge" ? (parseFloat(val) || 0) : val
        };
      }
      return s;
    }));
  };

  // Color handlers
  const handleAddColor = () => {
    setColors(prev => [...prev, { name: "Custom Color", hex: "#3B82F6" }]);
  };

  const handleRemoveColor = (index) => {
    setColors(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleColorChange = (index, field, val) => {
    setColors(prev => prev.map((c, idx) => {
      if (idx === index) {
        return { ...c, [field]: val };
      }
      return c;
    }));
  };

  const handleLoadFullColorPreset = () => {
    setColors(STANDARD_COLORS_PRESET);
  };

  // Print Location handlers
  const handleAddPrintLocation = () => {
    setPrintLocations(prev => [
      ...prev,
      { id: `custom_${Date.now()}`, label: "Custom Print Placement", priceUpcharge: 4.50, sides: ["front"] }
    ]);
  };

  const handleRemovePrintLocation = (index) => {
    setPrintLocations(prev => prev.filter((_, idx) => idx !== index));
  };

  const handlePrintLocationChange = (index, field, val) => {
    setPrintLocations(prev => prev.map((loc, idx) => {
      if (idx === index) {
        return {
          ...loc,
          [field]: field === "priceUpcharge" ? (parseFloat(val) || 0) : val
        };
      }
      return loc;
    }));
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

    if (sizes.length === 0) {
      setError("Please add at least one available size.");
      setSaving(false);
      return;
    }

    if (colors.length === 0) {
      setError("Please add at least one color option.");
      setSaving(false);
      return;
    }

    try {
      const apparelRef = collection(db, "apparel_products");
      const docRef = doc(apparelRef);

      const isFrontCalibrated = garmentViews.front?.calibration?.isCalibrated;
      const finalIsVisible = true;
      const needsAttention = images.length === 0 || (!shortDescription && !longDescription) || !isFrontCalibrated;

      const matchedCatObj = categories.find(c => c.id === categoryId);
      const catName = matchedCatObj?.name || "Custom Apparel";

      const productPayload = {
        id: docRef.id,
        isApparel: true,
        name: name.trim(),
        sku: sku.trim() || `APX-APP-${Date.now().toString().slice(-4)}`,
        shortDescription,
        longDescription,
        description: longDescription || shortDescription,
        categoryId,
        category: catName,
        categoryOverride: catName,
        subCategory: matchedCatObj?.parentId ? catName : "",
        pricing: {
          startingPrice: parseFloat(basePrice) || 0,
          basePrice: parseFloat(basePrice) || 0,
        },
        basePrice: parseFloat(basePrice) || 0,
        displayOrder: 0,
        isVisible: finalIsVisible,
        images: images.length > 0 ? images : (garmentViews.front?.image ? [garmentViews.front.image] : []),
        
        // Sizing & Fit
        fit: fit.trim() || "Semi-fitted",
        sizes: sizes.filter(s => s.name.trim()),
        
        // Colors palette
        colors: colors.filter(c => c.name.trim()),
        
        // Size Chart
        sizeChart: {
          type: sizeChartType,
          url: sizeChartUrl,
          tableData: sizeChartTable
        },
        
        // Print locations / decoration choices
        printLocations: printLocations.filter(p => p.label.trim()),

        useCustomMarkup,
        markupPercent: parseFloat(markupPercent) || 0,
        minimumOrderQuantity: parseInt(minimumOrderQuantity) || 12,
        garmentViews,
        needsAttention,
        createdAt: new Date(),
        updatedAt: new Date()
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
            Configure garment view angles, interactive calibration, sizing matrix, color swatches, and size charts.
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
            <h2 style={{ fontSize: "1.2rem", margin: 0, fontWeight: 700 }}>Garment Identification</h2>
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

          {/* Sizing & Fit Matrix Section (New Feature) */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid hsl(var(--border-hsl))", paddingBottom: "0.75rem" }}>
              <div>
                <h2 style={{ fontSize: "1.2rem", margin: 0, fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Shirt size={18} style={{ color: "hsl(var(--accent-hsl))" }} /> Sizing & Fit Matrix
                </h2>
                <p style={{ fontSize: "0.8rem", color: "hsl(var(--muted-hsl))", margin: "0.2rem 0 0" }}>
                  Customers can enter quantities across multiple sizes in a single order.
                </p>
              </div>
              <button type="button" onClick={handleAddSize} className="btn btn-outline" style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <Plus size={14} /> Add Size
              </button>
            </div>

            {/* Fit description */}
            <div>
              <label className="label">Fit Description (Displayed under Size header on product page)</label>
              <input
                className="input"
                value={fit}
                onChange={(e) => setFit(e.target.value)}
                placeholder="e.g. Fit: Semi-fitted, Fit: Regular unisex, Fit: Athletic"
              />
            </div>

            {/* Sizes list */}
            <div>
              <label className="label">Available Sizes & Upcharges (CAD)</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem" }}>
                {sizes.map((sz, sIdx) => (
                  <div key={sIdx} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.6rem 0.75rem", backgroundColor: "hsl(var(--secondary-hsl) / 0.3)", borderRadius: "var(--radius-sm)", border: "1px solid hsl(var(--border-hsl))" }}>
                    <input
                      className="input"
                      value={sz.name}
                      onChange={(e) => handleSizeChange(sIdx, "name", e.target.value)}
                      placeholder="Size (e.g. M)"
                      style={{ width: "70px", fontWeight: 700, textAlign: "center", padding: "0.3rem" }}
                    />
                    <div style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}>
                      <span style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))" }}>+$</span>
                      <input
                        type="number"
                        step="0.50"
                        min="0"
                        className="input"
                        value={sz.priceUpcharge}
                        onChange={(e) => handleSizeChange(sIdx, "priceUpcharge", e.target.value)}
                        placeholder="0.00"
                        style={{ width: "65px", padding: "0.3rem", fontSize: "0.85rem" }}
                        title="Upcharge per unit"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSize(sIdx)}
                      style={{ color: "hsl(var(--destructive-hsl))", background: "none", border: "none", cursor: "pointer", padding: "0.2rem" }}
                      title="Remove size"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Colors & Swatches Configuration (Screenshot 2 Match) */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid hsl(var(--border-hsl))", paddingBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div>
                <h2 style={{ fontSize: "1.2rem", margin: 0, fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Palette size={18} style={{ color: "hsl(var(--accent-hsl))" }} /> Color Palette & Swatches
                </h2>
                <p style={{ fontSize: "0.8rem", color: "hsl(var(--muted-hsl))", margin: "0.2rem 0 0" }}>
                  Renders interactive circular swatches on the customer product page.
                </p>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button type="button" onClick={handleLoadFullColorPreset} className="btn btn-secondary" style={{ padding: "0.35rem 0.65rem", fontSize: "0.75rem" }}>
                  Load 12 Preset Colors
                </button>
                <button type="button" onClick={handleAddColor} className="btn btn-outline" style={{ padding: "0.35rem 0.65rem", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <Plus size={13} /> Add Color
                </button>
              </div>
            </div>

            {/* Colors Preview Row */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap", padding: "0.75rem", backgroundColor: "hsl(var(--secondary-hsl) / 0.2)", borderRadius: "var(--radius-md)", border: "1px solid hsl(var(--border-hsl))" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "hsl(var(--muted-hsl))", marginRight: "0.25rem" }}>Storefront Preview:</span>
              {colors.map((c, idx) => (
                <div
                  key={idx}
                  title={`${c.name} (${c.hex})`}
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    backgroundColor: c.hex,
                    border: "1px solid rgba(0,0,0,0.15)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    cursor: "pointer",
                    position: "relative"
                  }}
                />
              ))}
            </div>

            {/* Colors List Editor */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.75rem" }}>
              {colors.map((col, cIdx) => (
                <div key={cIdx} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.75rem", backgroundColor: "hsl(var(--secondary-hsl) / 0.3)", borderRadius: "var(--radius-sm)", border: "1px solid hsl(var(--border-hsl))" }}>
                  <input
                    type="color"
                    value={col.hex.startsWith("#") ? col.hex : "#000000"}
                    onChange={(e) => handleColorChange(cIdx, "hex", e.target.value)}
                    style={{ width: "32px", height: "32px", border: "none", borderRadius: "50%", cursor: "pointer", padding: 0, backgroundColor: "transparent" }}
                    title="Pick Color"
                  />
                  <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, gap: "0.2rem" }}>
                    <input
                      className="input"
                      value={col.name}
                      onChange={(e) => handleColorChange(cIdx, "name", e.target.value)}
                      placeholder="Color Name (e.g. White)"
                      style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem", fontWeight: 600 }}
                    />
                    <input
                      className="input"
                      value={col.hex}
                      onChange={(e) => handleColorChange(cIdx, "hex", e.target.value)}
                      placeholder="#FFFFFF"
                      style={{ padding: "0.15rem 0.5rem", fontSize: "0.75rem", fontFamily: "monospace" }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveColor(cIdx)}
                    style={{ color: "hsl(var(--destructive-hsl))", background: "none", border: "none", cursor: "pointer" }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Size Chart Setup */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid hsl(var(--border-hsl))", paddingBottom: "0.75rem" }}>
              <div>
                <h2 style={{ fontSize: "1.2rem", margin: 0, fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Ruler size={18} style={{ color: "hsl(var(--accent-hsl))" }} /> Size Chart Modal Configuration
                </h2>
                <p style={{ fontSize: "0.8rem", color: "hsl(var(--muted-hsl))", margin: "0.2rem 0 0" }}>
                  Opens when customer clicks &quot;Size chart&quot; on the product page.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="sizeChartType"
                  checked={sizeChartType === "table"}
                  onChange={() => setSizeChartType("table")}
                />
                Formatted Measurement Table
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="sizeChartType"
                  checked={sizeChartType === "image" || sizeChartType === "pdf"}
                  onChange={() => setSizeChartType("image")}
                />
                Uploaded Image / PDF Chart
              </label>
            </div>

            {sizeChartType === "table" ? (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                  <thead>
                    <tr style={{ backgroundColor: "hsl(var(--secondary-hsl) / 0.5)", textAlign: "left" }}>
                      <th style={{ padding: "0.5rem 0.75rem", border: "1px solid hsl(var(--border-hsl))" }}>Size</th>
                      <th style={{ padding: "0.5rem 0.75rem", border: "1px solid hsl(var(--border-hsl))" }}>Chest (Pit to Pit)</th>
                      <th style={{ padding: "0.5rem 0.75rem", border: "1px solid hsl(var(--border-hsl))" }}>Body Length</th>
                      <th style={{ padding: "0.5rem 0.75rem", border: "1px solid hsl(var(--border-hsl))" }}>Sleeve</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sizeChartTable.map((row, rIdx) => (
                      <tr key={rIdx}>
                        <td style={{ padding: "0.35rem 0.5rem", border: "1px solid hsl(var(--border-hsl))" }}>
                          <input
                            className="input"
                            value={row.size}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSizeChartTable(prev => prev.map((r, i) => i === rIdx ? { ...r, size: val } : r));
                            }}
                            style={{ padding: "0.25rem", fontWeight: 700 }}
                          />
                        </td>
                        <td style={{ padding: "0.35rem 0.5rem", border: "1px solid hsl(var(--border-hsl))" }}>
                          <input
                            className="input"
                            value={row.chest}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSizeChartTable(prev => prev.map((r, i) => i === rIdx ? { ...r, chest: val } : r));
                            }}
                            style={{ padding: "0.25rem" }}
                          />
                        </td>
                        <td style={{ padding: "0.35rem 0.5rem", border: "1px solid hsl(var(--border-hsl))" }}>
                          <input
                            className="input"
                            value={row.length}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSizeChartTable(prev => prev.map((r, i) => i === rIdx ? { ...r, length: val } : r));
                            }}
                            style={{ padding: "0.25rem" }}
                          />
                        </td>
                        <td style={{ padding: "0.35rem 0.5rem", border: "1px solid hsl(var(--border-hsl))" }}>
                          <input
                            className="input"
                            value={row.sleeve}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSizeChartTable(prev => prev.map((r, i) => i === rIdx ? { ...r, sleeve: val } : r));
                            }}
                            style={{ padding: "0.25rem" }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ position: "relative" }}>
                    <input
                      type="file"
                      accept=".pdf,image/png,image/jpeg,image/webp"
                      onChange={handleUploadSizeChart}
                      disabled={uploadingSizeChart}
                      style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
                    />
                    <button type="button" className="btn btn-outline" disabled={uploadingSizeChart} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      {uploadingSizeChart ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                      Upload Size Chart (PDF or Image)
                    </button>
                  </div>
                  {sizeChartUrl && (
                    <a href={sizeChartUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.85rem", color: "hsl(var(--accent-hsl))", textDecoration: "underline", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <Eye size={14} /> View Current Size Chart File
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Print Locations / Decoration Types Configurator */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid hsl(var(--border-hsl))", paddingBottom: "0.75rem" }}>
              <div>
                <h2 style={{ fontSize: "1.2rem", margin: 0, fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Layers size={18} style={{ color: "hsl(var(--accent-hsl))" }} /> Print Locations & Decoration Options
                </h2>
                <p style={{ fontSize: "0.8rem", color: "hsl(var(--muted-hsl))", margin: "0.2rem 0 0" }}>
                  Options the customer selects before placing artwork (e.g. Front Only, Front & Back).
                </p>
              </div>
              <button type="button" onClick={handleAddPrintLocation} className="btn btn-outline" style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <Plus size={14} /> Add Placement Choice
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {printLocations.map((loc, lIdx) => (
                <div key={lIdx} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", backgroundColor: "hsl(var(--secondary-hsl) / 0.25)", borderRadius: "var(--radius-sm)", border: "1px solid hsl(var(--border-hsl))" }}>
                  <input
                    className="input"
                    value={loc.label}
                    onChange={(e) => handlePrintLocationChange(lIdx, "label", e.target.value)}
                    placeholder="Option Label (e.g. Front & Back)"
                    style={{ flexGrow: 1, fontWeight: 600 }}
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <span style={{ fontSize: "0.8rem", color: "hsl(var(--muted-hsl))" }}>Upcharge (CAD): +$</span>
                    <input
                      type="number"
                      step="0.50"
                      min="0"
                      className="input"
                      value={loc.priceUpcharge}
                      onChange={(e) => handlePrintLocationChange(lIdx, "priceUpcharge", e.target.value)}
                      placeholder="0.00"
                      style={{ width: "80px" }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemovePrintLocation(lIdx)}
                    style={{ color: "hsl(var(--destructive-hsl))", background: "none", border: "none", cursor: "pointer" }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Descriptions Card */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div>
              <h2 style={{ fontSize: "1.2rem", marginBottom: "0.25rem", fontWeight: 700 }}>Short Description (Catalog Summary)</h2>
              <textarea
                className="input"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="e.g. 100% ring-spun combed cotton unisex t-shirt. Pre-shrunk fabric with ultra-soft hand feel."
                rows={2}
                style={{ resize: "vertical", fontFamily: "inherit" }}
              />
            </div>

            <div>
              <h2 style={{ fontSize: "1.2rem", marginBottom: "0.25rem", fontWeight: 700 }}>Detailed Specifications & Fabric Breakdown</h2>
              <textarea
                className="input"
                value={longDescription}
                onChange={(e) => setLongDescription(e.target.value)}
                placeholder="Fabric weight, ring-spun cotton blends, rib cuffs, sizing instructions, decoration embroidery/print guidelines..."
                rows={5}
                style={{ resize: "vertical", fontFamily: "inherit" }}
              />
            </div>
          </div>
        </div>

        {/* Right column: Garment views, calibration & pricing */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* Base Pricing & Category */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <h2 style={{ fontSize: "1.2rem", margin: 0, fontWeight: 700 }}>Category & Base Price</h2>
            <div>
              <label className="label">Category</label>
              <select
                className="input"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Starting Base Unit Price (CAD)</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "hsl(var(--muted-hsl))", fontWeight: 700 }}>$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  placeholder="28.00"
                  style={{ paddingLeft: "1.75rem", fontWeight: 800, fontSize: "1.1rem" }}
                  required
                />
              </div>
            </div>
          </div>

          {/* Dedicated Garment Angle Views & Calibration */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem", borderColor: "hsl(var(--accent-hsl) / 0.3)" }}>
            <div style={{ borderBottom: "1px solid hsl(var(--border-hsl))", paddingBottom: "0.75rem" }}>
              <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "hsl(var(--accent-hsl))", textTransform: "uppercase" }}>High-Precision Setup</span>
              <h2 style={{ fontSize: "1.2rem", margin: "0.15rem 0 0", fontWeight: 800, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Ruler size={18} /> Garment Views & Calibration
              </h2>
              <p style={{ fontSize: "0.8rem", color: "hsl(var(--muted-hsl))", margin: "0.2rem 0 0" }}>
                Upload clear view angles (Front, Back, Sleeves) and calibrate real-world inches.
              </p>
            </div>

            {/* View angle upload cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {["front", "back", "left", "right"].map((sideKey) => {
                const view = garmentViews[sideKey];
                const hasImg = !!view?.image;
                const isCalibrated = !!view?.calibration?.isCalibrated;
                const sideLabel = sideKey.charAt(0).toUpperCase() + sideKey.slice(1) + " View";

                return (
                  <div
                    key={sideKey}
                    style={{
                      border: "1px solid hsl(var(--border-hsl))",
                      borderRadius: "var(--radius-md)",
                      padding: "0.85rem",
                      backgroundColor: hasImg ? "hsl(var(--secondary-hsl) / 0.15)" : "transparent",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{sideLabel}</span>
                      {hasImg && (
                        <span style={{
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          padding: "0.2rem 0.5rem",
                          borderRadius: "4px",
                          backgroundColor: isCalibrated ? "hsl(var(--success-hsl) / 0.15)" : "hsl(var(--destructive-hsl) / 0.1)",
                          color: isCalibrated ? "hsl(var(--success-hsl))" : "hsl(var(--destructive-hsl))"
                        }}>
                          {isCalibrated ? "✓ Calibrated" : "⚠ Uncalibrated"}
                        </span>
                      )}
                    </div>

                    {hasImg ? (
                      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                        <img
                          src={view.image}
                          alt={sideLabel}
                          style={{ width: "64px", height: "64px", objectFit: "contain", backgroundColor: "white", borderRadius: "4px", border: "1px solid hsl(var(--border-hsl))", padding: "2px" }}
                        />
                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            onClick={() => setActiveCalibrateSide(sideKey)}
                            className="btn btn-outline"
                            style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.35rem", borderColor: "hsl(var(--accent-hsl))", color: "hsl(var(--accent-hsl))" }}
                          >
                            <Ruler size={14} /> {isCalibrated ? "Re-Calibrate" : "Calibrate"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setGarmentViews(prev => ({
                                ...prev,
                                [sideKey]: { image: "", calibration: { isCalibrated: false } }
                              }));
                            }}
                            style={{ background: "none", border: "none", color: "hsl(var(--destructive-hsl))", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ position: "relative" }}>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          disabled={uploading}
                          onChange={(e) => handleUploadGarmentImage(sideKey, e.target.files[0])}
                          style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
                        />
                        <button
                          type="button"
                          className="btn btn-outline"
                          disabled={uploading}
                          style={{ width: "100%", fontSize: "0.8rem", padding: "0.45rem", borderStyle: "dashed", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.4rem" }}
                        >
                          <Upload size={14} /> Upload {sideLabel} Photo
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Primary Gallery Images */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "1.2rem", margin: 0, fontWeight: 700 }}>Gallery Photos</h2>
              <div style={{ position: "relative" }}>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleUploadImage}
                  disabled={uploading}
                  style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
                />
                <button type="button" className="btn btn-outline" disabled={uploading} style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <Upload size={14} /> Add Photo
                </button>
              </div>
            </div>

            {images.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
                {images.map((img, idx) => (
                  <div key={idx} style={{ position: "relative", width: "100%", paddingTop: "100%", border: "1px solid hsl(var(--border-hsl))", borderRadius: "4px", overflow: "hidden", backgroundColor: "white" }}>
                    <img src={img} alt="Product" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(idx)}
                      style={{ position: "absolute", top: "4px", right: "4px", backgroundColor: "rgba(0,0,0,0.6)", color: "white", border: "none", borderRadius: "50%", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: "0.8rem", color: "hsl(var(--muted-hsl))", margin: 0 }}>
                No extra gallery images uploaded. (Front garment view will be used by default).
              </p>
            )}
          </div>
        </div>
      </form>

      {/* Garment Calibration Modal */}
      {activeCalibrateSide && garmentViews[activeCalibrateSide]?.image && (
        <AdminGarmentCalibration
          isOpen={true}
          onClose={() => setActiveCalibrateSide(null)}
          imageUrl={garmentViews[activeCalibrateSide].image}
          sideName={activeCalibrateSide.charAt(0).toUpperCase() + activeCalibrateSide.slice(1) + " View"}
          initialCalibration={garmentViews[activeCalibrateSide].calibration}
          onSave={(calPayload) => {
            handleSaveGarmentCalibration(calPayload);
            setActiveCalibrateSide(null);
          }}
          onSaveCalibration={(calPayload) => {
            handleSaveGarmentCalibration(calPayload);
            setActiveCalibrateSide(null);
          }}
        />
      )}
    </div>
  );
}
