"use client";

import { useEffect, useState, use } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, Trash2, Eye, EyeOff, Save, Loader2, AlertCircle } from "lucide-react";

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

  // Form states
  const [description, setDescription] = useState("");
  const [categoryOverride, setCategoryOverride] = useState("");
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [priceOverride, setPriceOverride] = useState("");
  const [images, setImages] = useState([]);
  const [optionGroupsCount, setOptionGroupsCount] = useState(0);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, "products", productId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setProduct(data);
          setDescription(data.description || "");
          setCategoryOverride(data.categoryOverride || "");
          setDisplayOrder(data.displayOrder || 0);
          setIsVisible(data.isVisible !== undefined ? data.isVisible : true);
          setPriceOverride(data.pricing?.startingPriceOverride || "");
          setImages(data.images || []);

          // Fetch options count dynamically from live API proxy
          const optRes = await fetch(`/api/product/${productId}/options`);
          if (optRes.ok) {
            const optData = await optRes.json();
            const count = optData.optionGroups ? Object.keys(optData.optionGroups).length : 0;
            setOptionGroupsCount(count);
          }
        } else {
          setError("Product not found in Firestore cache.");
        }
      } catch (err) {
        console.error("Error loading product:", err);
        setError("Failed to load product data.");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
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

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError("");

    try {
      const docRef = doc(db, "products", productId);
      
      const priceVal = priceOverride !== "" ? parseFloat(priceOverride) : null;
      
      // Determine needsAttention: true if no description or images
      const needsAttention = images.length === 0 || !description;

      const updateData = {
        description,
        categoryOverride: categoryOverride || null,
        displayOrder: parseInt(displayOrder) || 0,
        isVisible,
        images,
        needsAttention,
        "pricing.startingPriceOverride": priceVal,
      };

      await updateDoc(docRef, updateData);
      setSuccess(true);
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
            {product?.sinalite?.name} <span style={{ fontSize: "0.8rem", padding: "0.1rem 0.4rem", backgroundColor: "hsl(var(--secondary-hsl))", borderRadius: "4px" }}>SKU: {product?.sinalite?.sku}</span>
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
          {/* Description Card */}
          <div className="card">
            <h2 style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>Product Description</h2>
            <p style={{ fontSize: "0.85rem", color: "hsl(var(--muted-hsl))", marginBottom: "0.75rem" }}>
              Add a compelling storefront description for merchandising. Supports clean spacing.
            </p>
            <textarea
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide information on paper weights, sizes, turnarounds, best practices..."
              rows={8}
              required
              style={{ resize: "vertical", fontFamily: "inherit" }}
            />
          </div>

          {/* Media Images Card */}
          <div className="card">
            <h2 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>Storefront Images</h2>
            <p style={{ fontSize: "0.85rem", color: "hsl(var(--muted-hsl))", marginBottom: "1.5rem" }}>
              Add product renders or photos uploaded directly to Cloudinary. Order matters.
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

              {/* Category Override */}
              <div>
                <label className="label" htmlFor="cat-override">Category Override</label>
                <input
                  id="cat-override"
                  className="input"
                  placeholder={product?.sinalite?.category || "Enter category..."}
                  value={categoryOverride}
                  onChange={(e) => setCategoryOverride(e.target.value)}
                />
                <span style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))", display: "block", marginTop: "0.25rem" }}>
                  Override category mapping (defaults to SinaLite's <i>{product?.sinalite?.category}</i>).
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

              {/* Starting Price Override */}
              <div>
                <label className="label" htmlFor="price-override">Starting Price Override ($ CAD)</label>
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
                  Manually override starting price (calculated cheapest price is <i>${parseFloat(product?.pricing?.startingPrice || 0).toFixed(2)}</i>).
                </span>
              </div>
            </div>
          </div>

          {/* SinaLite Specs */}
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
        </div>
      </form>
    </div>
  );
}
