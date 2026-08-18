"use client";

import { useEffect, useState, use } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useCart } from "@/lib/cart-context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShoppingBag, Loader2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function ProductDetailPage({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const productId = params.id;
  const router = useRouter();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [error, setError] = useState("");

  // Configurator states
  const [optionGroups, setOptionGroups] = useState({});
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [selectedOptions, setSelectedOptions] = useState({}); // { [groupName]: optionId }
  const [priceData, setPriceData] = useState(null);
  const [calculatingPrice, setCalculatingPrice] = useState(false);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  // File Upload states
  const [uploadingFile, setUploadingFile] = useState(false);
  const [artworkFiles, setArtworkFiles] = useState([]); // Array of { name, url }
  const [uploadError, setUploadError] = useState("");

  // Load product details and option groups
  useEffect(() => {
    const fetchProductAndOptions = async () => {
      setLoadingProduct(true);
      setLoadingOptions(true);
      setError("");
      
      try {
        // Load product from Firestore
        const docRef = doc(db, "products", productId);
        const snap = await getDoc(docRef);
        
        if (!snap.exists()) {
          setError("Product not found.");
          setLoadingProduct(false);
          setLoadingOptions(false);
          return;
        }
        
        const data = snap.data();
        setProduct(data);
        setLoadingProduct(false);

        // Fetch options live from SinaLite API proxy
        const optRes = await fetch(`/api/product/${productId}/options`);
        const optData = await optRes.json();
        
        if (!optRes.ok) {
          throw new Error(optData.error || "Failed to load product options.");
        }

        const groups = optData.optionGroups || {};
        setOptionGroups(groups);

        // At first, no option will be selected (empty object)
        setSelectedOptions({});
      } catch (err) {
        console.error("Error loading product/options:", err);
        setError(err.message || "Failed to load product details.");
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchProductAndOptions();
  }, [productId]);

  // Compute selection validation states
  const totalGroupsCount = Object.keys(optionGroups).length;
  const selectedCount = Object.keys(selectedOptions).filter(k => selectedOptions[k] !== "").length;
  const allSelected = totalGroupsCount > 0 && selectedCount === totalGroupsCount;

  // Calculate price when options change (ONLY if all options are selected)
  useEffect(() => {
    if (!product || loadingOptions || !allSelected) {
      setPriceData(null);
      return;
    }

    const calculateLivePrice = async () => {
      setCalculatingPrice(true);
      try {
        const optionIds = Object.values(selectedOptions).map(id => parseInt(id));
        
        const res = await fetch("/api/price", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productId: parseInt(productId),
            optionIds,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to calculate live price.");
        }
        setPriceData(data);
      } catch (err) {
        console.error("Live price error:", err);
      } finally {
        setCalculatingPrice(false);
      }
    };

    const timer = setTimeout(() => {
      calculateLivePrice();
    }, 150); // Small debounce

    return () => clearTimeout(timer);
  }, [selectedOptions, product, productId, loadingOptions, allSelected]);

  const handleOptionChange = (groupName, value) => {
    setSelectedOptions(prev => ({
      ...prev,
      [groupName]: value,
    }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingFile(true);
    setUploadError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload artwork file.");
      }

      setArtworkFiles(prev => [...prev, { name: file.name, url: data.url }]);
    } catch (err) {
      console.error("Upload error:", err);
      setUploadError(err.message || "File upload failed.");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleRemoveFile = (indexToRemove) => {
    setArtworkFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleAddToCart = () => {
    if (!product || !priceData || !allSelected) return;

    // Build configuration summary string
    const optionSummaries = [];
    Object.entries(optionGroups).forEach(([groupName, options]) => {
      const selectedId = selectedOptions[groupName];
      const selectedOption = options.find(opt => opt.id.toString() === selectedId);
      if (selectedOption) {
        optionSummaries.push(`${groupName}: ${selectedOption.name}`);
      }
    });

    const cartItem = {
      productId: parseInt(productId),
      name: product.sinalite?.name,
      images: product.images || [],
      selectedOptionMap: selectedOptions,
      selectedOptionIds: Object.values(selectedOptions).map(id => parseInt(id)),
      optionSummary: optionSummaries.join(" | "),
      price: parseFloat(priceData.price || priceData.price?.price || product.pricing?.startingPrice || 0),
      quantity: 1, // Add one configuration unit by default
      artworkFiles: artworkFiles, // Linked files uploaded on details page!
    };

    addToCart(cartItem);
    router.push("/cart");
  };

  if (loadingProduct) {
    return (
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <Header />
        <div style={{ flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "hsl(var(--muted-hsl))", fontWeight: 500 }}>
          <Loader2 className="animate-spin" style={{ animation: "spin 1.5s linear infinite", marginRight: "0.5rem" }} /> Loading configuration...
        </div>
        <Footer />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <Header />
        <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem" }}>
          <h2>Product Not Found</h2>
          <p style={{ color: "hsl(var(--muted-hsl))" }}>{error || "The requested printing product does not exist."}</p>
          <Link href="/products" className="btn btn-primary">Back to Catalog</Link>
        </div>
        <Footer />
      </div>
    );
  }

  const imagesList = product.images?.length > 0 ? product.images : ["https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=600&auto=format&fit=crop"];
  const displayCategory = product.categoryOverride || product.sinalite?.category;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Header />

      <main style={{ maxWidth: "1200px", margin: "2.5rem auto", padding: "0 1.5rem", width: "100%" }}>
        {/* Breadcrumbs */}
        <div style={{ marginBottom: "2rem" }}>
          <Link href="/products" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", color: "hsl(var(--muted-hsl))", fontSize: "0.9rem", fontWeight: 600 }}>
            <ArrowLeft size={16} /> All Products
          </Link>
        </div>

        {/* Dynamic Grid Layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "3.5rem" }} className="product-grid">
          {/* Left Column: Visual Gallery */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
          >
            <div className="card" style={{
              padding: "2rem",
              backgroundColor: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "400px",
              border: "1px solid hsl(var(--border-hsl))"
            }}>
              <img
                src={imagesList[activeImageIdx]}
                alt={product.sinalite?.name}
                style={{ width: "100%", maxHeight: "350px", objectFit: "contain" }}
              />
            </div>

            {/* Thumbnail Selectors */}
            {imagesList.length > 1 && (
              <div style={{ display: "flex", gap: "0.75rem" }}>
                {imagesList.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIdx(idx)}
                    className="card"
                    style={{
                      padding: "0.25rem",
                      width: "80px",
                      height: "80px",
                      cursor: "pointer",
                      borderColor: activeImageIdx === idx ? "hsl(var(--accent-hsl))" : "hsl(var(--border-hsl))",
                      backgroundColor: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <img src={img} alt="Thumbnail" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                  </button>
                ))}
              </div>
            )}

            {/* Description & Merchandising Details */}
            <div style={{ marginTop: "1rem" }}>
              <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Product Specifications</h2>
              <div style={{
                color: "hsl(var(--foreground-hsl) / 0.85)",
                fontSize: "0.95rem",
                lineHeight: "1.7",
                whiteSpace: "pre-line"
              }}>
                {product.description || "High-quality storefront print products configured dynamically to order."}
              </div>
            </div>
          </motion.div>

          {/* Right Column: Spec Configurator Form */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            style={{ display: "flex", flexDirection: "column", gap: "2rem" }}
          >
            <div>
              <span style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "hsl(var(--accent-hsl))"
              }}>
                {displayCategory}
              </span>
              <h1 style={{ fontSize: "2.25rem", fontWeight: 900, lineHeight: "1.2", marginTop: "0.25rem", marginBottom: "0.5rem" }}>
                {product.sinalite?.name}
              </h1>
              <p style={{ fontSize: "0.85rem", color: "hsl(var(--muted-hsl))" }}>
                SKU: {product.sinalite?.sku}
              </p>
            </div>

            {/* Configurator Form Card */}
            <div className="card" style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, borderBottom: "1px solid hsl(var(--border-hsl))", paddingBottom: "0.5rem" }}>
                Configure Options
              </h3>

              {/* Option Selector Fields */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {loadingOptions ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", color: "hsl(var(--muted-hsl))", fontSize: "0.9rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Loader2 className="animate-spin" size={16} style={{ animation: "spin 1s linear infinite" }} />
                      Loading options list...
                    </div>
                  </div>
                ) : Object.keys(optionGroups).length === 0 ? (
                  <p style={{ fontSize: "0.85rem", color: "hsl(var(--muted-hsl))" }}>No options available.</p>
                ) : (
                  Object.entries(optionGroups).map(([groupName, options]) => {
                    const isQuantity = groupName.toLowerCase().includes("qty") || groupName.toLowerCase().includes("quantity");

                    if (isQuantity) {
                      return (
                        <div key={groupName}>
                          <label className="label" htmlFor={`opt-${groupName}`} style={{ textTransform: "capitalize" }}>
                            {groupName}
                          </label>
                          <select
                            id={`opt-${groupName}`}
                            className="input"
                            value={selectedOptions[groupName] || ""}
                            onChange={(e) => handleOptionChange(groupName, e.target.value)}
                          >
                            <option value="">Select quantity...</option>
                            {options.map(opt => (
                              <option key={opt.id} value={opt.id.toString()}>
                                {opt.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    }

                    return (
                      <div key={groupName}>
                        <label className="label" style={{ textTransform: "capitalize" }}>
                          {groupName}
                        </label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.25rem" }}>
                          {options.map(opt => {
                            const isSelected = selectedOptions[groupName] === opt.id.toString();
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => handleOptionChange(groupName, opt.id.toString())}
                                style={{
                                  padding: "0.5rem 0.85rem",
                                  fontSize: "0.85rem",
                                  borderRadius: "var(--radius-sm)",
                                  border: isSelected ? "2px solid hsl(var(--accent-hsl))" : "1px solid hsl(var(--border-hsl))",
                                  backgroundColor: isSelected ? "hsl(var(--accent-hsl) / 0.08)" : "white",
                                  color: isSelected ? "hsl(var(--accent-hsl))" : "hsl(var(--foreground-hsl))",
                                  fontWeight: isSelected ? 700 : 500,
                                  cursor: "pointer",
                                  transition: "all 0.15s ease",
                                  fontFamily: "var(--font-sans)"
                                }}
                              >
                                {opt.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Price Calculator Display */}
              <div style={{
                borderTop: "1px solid hsl(var(--border-hsl))",
                paddingTop: "1.5rem",
                marginTop: "0.5rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <div>
                  <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "hsl(var(--muted-hsl))", textTransform: "uppercase" }}>Price Estimate</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
                    {calculatingPrice ? (
                      <div style={{ display: "flex", alignItems: "center", color: "hsl(var(--muted-hsl))", fontSize: "0.95rem" }}>
                        <Loader2 className="animate-spin" size={16} style={{ animation: "spin 1.5s linear infinite", marginRight: "0.25rem" }} />
                        Calculating...
                      </div>
                    ) : !allSelected ? (
                      <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "hsl(var(--muted-hsl))" }}>
                        Select all options above to view price
                      </span>
                    ) : (
                      <span style={{ fontSize: "2rem", fontWeight: 900, color: "hsl(var(--accent-hsl))" }}>
                        ${priceData ? parseFloat(priceData.price || priceData.price?.price || 0).toFixed(2) : "0.00"}
                        <span style={{ fontSize: "0.9rem", color: "hsl(var(--muted-hsl))", fontWeight: 600 }}> CAD</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Package Box Info & Configuration Summary (SinaLite Spec Layout) */}
              {allSelected && (
                <div style={{
                  borderTop: "1px solid hsl(var(--border-hsl))",
                  paddingTop: "1rem",
                  marginTop: "0.5rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem"
                }}>
                  {/* Configuration list */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "hsl(var(--muted-hsl))", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Configuration Summary
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.8rem" }}>
                      {Object.entries(optionGroups).map(([groupName, options]) => {
                        const selectedId = selectedOptions[groupName];
                        const selectedOption = options.find(opt => opt.id.toString() === selectedId);
                        return (
                          <div key={groupName} style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "hsl(var(--muted-hsl))", textTransform: "capitalize" }}>{groupName}</span>
                            <span style={{ fontWeight: 600 }}>{selectedOption?.name || "N/A"}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Box weight details */}
                  {priceData?.packageInfo && (
                    <div style={{
                      padding: "0.6rem 0.85rem",
                      backgroundColor: "hsl(var(--secondary-hsl) / 0.4)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "0.8rem",
                      color: "hsl(var(--muted-hsl))",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginTop: "0.25rem"
                    }}>
                      <span>📦</span>
                      <span>
                        {priceData.packageInfo["number of boxes"]} {parseInt(priceData.packageInfo["number of boxes"]) === 1 ? "box" : "boxes"}
                        {" • "}{priceData.packageInfo["box size"]}
                        {" • "}{parseFloat(priceData.packageInfo["total weight"]).toFixed(2)} lbs
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* File Upload Section */}
              <div style={{
                borderTop: "1px solid hsl(var(--border-hsl))",
                paddingTop: "1rem",
                marginTop: "0.5rem"
              }}>
                <label className="label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Upload Print-Ready Artwork</span>
                  <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "hsl(var(--muted-hsl))" }}>PDF, PNG, JPG (Max 10MB)</span>
                </label>
                
                {/* Uploaded files list */}
                {artworkFiles.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.75rem" }}>
                    {artworkFiles.map((file, idx) => (
                      <div key={idx} style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.5rem 0.75rem",
                        backgroundColor: "hsl(var(--secondary-hsl) / 0.3)",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "0.85rem"
                      }}>
                        <span style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: "80%",
                          fontWeight: 500
                        }}>
                          📄 {file.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(idx)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "hsl(var(--destructive-hsl))",
                            cursor: "pointer",
                            fontSize: "0.8rem",
                            fontWeight: 600
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Trigger Area */}
                <div style={{
                  border: "2px dashed hsl(var(--border-hsl))",
                  borderRadius: "var(--radius-md)",
                  padding: "1.25rem",
                  textAlign: "center",
                  position: "relative",
                  backgroundColor: "hsl(var(--background-hsl) / 0.3)",
                  cursor: uploadingFile ? "not-allowed" : "pointer"
                }}>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileUpload}
                    disabled={uploadingFile}
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
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" }}>
                    {uploadingFile ? (
                      <>
                        <Loader2 className="animate-spin" size={20} style={{ animation: "spin 1s linear infinite", color: "hsl(var(--accent-hsl))" }} />
                        <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Uploading file...</span>
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: "1.25rem" }}>📁</span>
                        <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Click to upload file attachment</span>
                      </>
                    )}
                  </div>
                </div>

                {uploadError && (
                  <p style={{ color: "hsl(var(--destructive-hsl))", fontSize: "0.75rem", marginTop: "0.5rem", fontWeight: 500 }}>
                    {uploadError}
                  </p>
                )}
              </div>

              {/* Add to Cart CTA */}
              <button
                onClick={handleAddToCart}
                disabled={calculatingPrice || !priceData || loadingOptions || !allSelected || uploadingFile}
                className="btn btn-primary"
                style={{ width: "100%", padding: "0.85rem", fontSize: "1rem" }}
              >
                <ShoppingBag size={18} /> Add to Cart
              </button>
            </div>
            
            {/* Guarantee Signal */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.8rem",
              color: "hsl(var(--muted-hsl))",
              justifyContent: "center"
            }}>
              <Sparkles size={16} style={{ color: "hsl(var(--accent-hsl))" }} />
              <span>Free local GTA shipping lookup during checkout.</span>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
      
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .product-grid {
            grid-template-columns: 1fr !important;
            gap: 2.5rem !important;
          }
        }
      `}</style>
    </div>
  );
}
