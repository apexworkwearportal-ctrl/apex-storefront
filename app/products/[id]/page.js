"use client";

import { useEffect, useState, use, useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useCart } from "@/lib/cart-context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShoppingBag, Loader2, Sparkles, FileCheck, Eye } from "lucide-react";
import { motion } from "framer-motion";
import PrintProofModal from "@/components/PrintProofModal";
import { calculateCustomPrintPrice } from "@/lib/custom-print-pricing";

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

  // Global custom print settings
  const [customPrintSettings, setCustomPrintSettings] = useState({
  colorClickCharge: 0.045,      // $/click for color
  grayscaleClickCharge: 0.01,  // $/click for b&w / grayscale
  markupMultiplier: 3.0        // Multiplier over cost (e.g. 2.0 = 2x)
  });

  // File Upload & Print Proof states
  const [uploadingFile, setUploadingFile] = useState(false);
  const [artworkFiles, setArtworkFiles] = useState([]); // Array of { name, url }
  const [uploadError, setUploadError] = useState("");
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [proofApproved, setProofApproved] = useState(false);
  const [proofDetails, setProofDetails] = useState(null);

  // Compute selection validation states
  const totalGroupsCount = Object.keys(optionGroups).length;
  const selectedCount = Object.keys(selectedOptions).filter(k => selectedOptions[k] !== "").length;
  const allSelected = totalGroupsCount > 0 && selectedCount === totalGroupsCount;

  // Compute custom product price with useMemo using the Custom Print Pricing Engine
  const customCalculatedPrice = useMemo(() => {
    if (!product?.isCustom) return null;

    // 1. Extract Quantity
    const selectedQtyId = selectedOptions["Quantity"] || selectedOptions["quantity"] || selectedOptions["Qty"];
    const qtyOpt = (optionGroups["Quantity"] || optionGroups["quantity"] || optionGroups["Qty"] || []).find(o => o.id === selectedQtyId);
    const quantity = qtyOpt?.value || parseInt(selectedQtyId, 10) || 500;

    // 2. Extract Size
    const selectedSizeId = selectedOptions["Size"] || selectedOptions["size"];
    const sizeOpt = (optionGroups["Size"] || optionGroups["size"] || []).find(o => o.id === selectedSizeId);

    // 3. Extract Sides / Pages
    const selectedSidesId = selectedOptions["Sides / Pages"] || selectedOptions["sides"] || selectedOptions["Pages"];
    const sidesOpt = (optionGroups["Sides / Pages"] || optionGroups["sides"] || optionGroups["Pages"] || []).find(o => o.id === selectedSidesId);

    // 4. Extract Print Mode
    const selectedModeId = selectedOptions["Print Mode"] || selectedOptions["printMode"] || selectedOptions["Mode"];
    const modeOpt = (optionGroups["Print Mode"] || optionGroups["printMode"] || optionGroups["Mode"] || []).find(o => o.id === selectedModeId);

    // 5. Additional options upcharges (if any)
    let additionalUpcharges = 0;
    Object.entries(selectedOptions).forEach(([groupName, selectedId]) => {
      if (["Quantity", "quantity", "Qty", "Size", "size", "Sides / Pages", "sides", "Pages", "Print Mode", "printMode", "Mode"].includes(groupName)) {
        return;
      }
      const choices = optionGroups[groupName] || [];
      const choice = choices.find(c => c.id === selectedId);
      if (choice) {
        additionalUpcharges += parseFloat(choice.priceUpcharge || 0);
      }
    });

    const basePrice = parseFloat(product.basePrice !== undefined ? product.basePrice : (product.pricing?.startingPrice || 0));

    const result = calculateCustomPrintPrice({
      quantity,
      size: sizeOpt,
      sidesPages: sidesOpt,
      printMode: modeOpt,
      basePrice,
      settings: customPrintSettings,
      additionalUpcharges
    });

    return {
      price: result.finalPrice,
      unitPrice: result.unitPrice,
      breakdown: result
    };
  }, [product, selectedOptions, optionGroups, customPrintSettings]);

  const effectivePriceData = product?.isCustom ? customCalculatedPrice : priceData;

  const handleAddToCart = () => {
    if (!product || !effectivePriceData || !allSelected) return;

    // Guard: never add a $0.00 item — this combination is unavailable
    const resolvedPrice = parseFloat(effectivePriceData.price || effectivePriceData.price?.price || 0);
    if (resolvedPrice <= 0) return;

    // Print Proof Enforcement
    if (artworkFiles.length > 0 && !proofApproved) {
      setProofModalOpen(true);
      return;
    }

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
      productId: product.isCustom ? productId : parseInt(productId),
      name: product.name || product.sinalite?.name,
      images: product.images || [],
      categoryId: product.categoryId || product.category || null,
      selectedOptionMap: selectedOptions,
      selectedOptionIds: product.isCustom ? Object.values(selectedOptions) : Object.values(selectedOptions).map(id => parseInt(id)),
      optionSummary: optionSummaries.join(" | "),
      price: parseFloat(effectivePriceData.price || effectivePriceData.price?.price || product.pricing?.startingPrice || 0),
      unitPrice: effectivePriceData.unitPrice || null,
      quantity: 1, // 1 ordered job bundle
      artworkFiles: artworkFiles,
      proofDetails: proofDetails,
      isCustom: !!product.isCustom
    };

    addToCart(cartItem);
    router.push("/cart");
  };

  useEffect(() => {
    const fetchProductAndOptions = async () => {
      setLoadingProduct(true);
      setLoadingOptions(true);
      setError("");
      
      try {
        // Fetch custom print pricing settings in parallel
        fetch("/api/custom-print-settings")
          .then(r => r.json())
          .then(data => {
            if (data && !data.error) {
              setCustomPrintSettings({
                colorClickCharge: parseFloat(data.colorClickCharge) || 0.08,
                grayscaleClickCharge: parseFloat(data.grayscaleClickCharge) || 0.02,
                markupMultiplier: parseFloat(data.markupMultiplier) || 2.0
              });
            }
          })
          .catch(console.error);

        // Load product from Firestore
        let docRef = doc(db, "products", productId);
        let snap = await getDoc(docRef);
        
        if (!snap.exists()) {
          // Check if it exists in apparel_products collection
          const apparelDocRef = doc(db, "apparel_products", productId);
          const apparelSnap = await getDoc(apparelDocRef);
          if (apparelSnap.exists()) {
            router.replace(`/apparel/${productId}`);
            return;
          }

          setError("Product not found.");
          setLoadingProduct(false);
          setLoadingOptions(false);
          return;
        }
        
        const data = snap.data();

        // If product is an apparel product, redirect to dedicated apparel studio
        if (data.isApparel) {
          router.replace(`/apparel/${productId}`);
          return;
        }

        setProduct(data);
        setLoadingProduct(false);

        if (data.isCustom) {
          // Build custom options structure for Custom Print Engine
          const customGroups = {};

          // 1. Quantity Choices
          customGroups["Quantity"] = [
            { id: "50", name: "50 Units", value: 50 },
            { id: "100", name: "100 Units", value: 100 },
            { id: "250", name: "250 Units", value: 250 },
            { id: "500", name: "500 Units", value: 500 },
            { id: "1000", name: "1,000 Units", value: 1000 },
            { id: "2500", name: "2,500 Units", value: 2500 },
            { id: "5000", name: "5,000 Units", value: 5000 }
          ];

          // 2. Size Choices (Customer sees only name, backend uses imposition and costPerM)
          const sizesList = Array.isArray(data.customPrintSizes) && data.customPrintSizes.length > 0
            ? data.customPrintSizes
            : [
                { id: "sz_1", name: '8.5" x 11"', imposition: 2, costPerM: 40.00 },
                { id: "sz_2", name: '11" x 17"', imposition: 1, costPerM: 75.00 },
                { id: "sz_3", name: '4" x 6"', imposition: 4, costPerM: 25.00 },
                { id: "sz_4", name: '5.5" x 8.5"', imposition: 4, costPerM: 35.00 }
              ];
          
          customGroups["Size"] = sizesList.map(s => ({
            id: s.name,
            name: s.name,
            imposition: parseFloat(s.imposition) || 1,
            costPerM: parseFloat(s.costPerM) || 0
          }));

          // 3. Sides / Pages Choices
          const sidesList = Array.isArray(data.sidesPagesOptions) && data.sidesPagesOptions.length > 0
            ? data.sidesPagesOptions
            : [
                { id: "1_sided", name: "1 Sided", value: 1 },
                { id: "2_sided", name: "2 Sided", value: 2 }
              ];

          customGroups["Sides / Pages"] = sidesList.map(s => ({
            id: s.name,
            name: s.name,
            value: parseFloat(s.value) || 1
          }));

          // 4. Print Mode Choices
          const modesList = Array.isArray(data.printModeOptions) && data.printModeOptions.length > 0
            ? data.printModeOptions
            : [
                { id: "color", name: "Colour", type: "color" },
                { id: "bw", name: "Black & White (Grayscale)", type: "bw" }
              ];

          customGroups["Print Mode"] = modesList.map(m => ({
            id: m.name,
            name: m.name,
            type: m.type || "color"
          }));

          // 5. Additional custom option groups (e.g. Finishing, Coating)
          (data.options || []).forEach(group => {
            if (group.name && group.choices?.length > 0) {
              customGroups[group.name] = group.choices.map(choice => ({
                id: `${group.name}:${choice.name}`,
                name: choice.name,
                priceUpcharge: parseFloat(choice.priceUpcharge || 0)
              }));
            }
          });

          setOptionGroups(customGroups);

          // Default Pre-selections
          const defaultSelections = {};
          Object.entries(customGroups).forEach(([gName, opts]) => {
            if (opts.length > 0) {
              // For quantity, default to 500 or 100 if present
              if (gName === "Quantity") {
                const preferred = opts.find(o => o.id === "500") || opts[0];
                defaultSelections[gName] = preferred.id.toString();
              } else {
                defaultSelections[gName] = opts[0].id.toString();
              }
            }
          });
          setSelectedOptions(defaultSelections);
          setLoadingOptions(false);
        } else {
          // Fetch options live from SinaLite API proxy
          const optRes = await fetch(`/api/product/${productId}/options`);
          const optData = await optRes.json();
          
          if (!optRes.ok) {
            throw new Error(optData.error || "Failed to load product options.");
          }

          const groups = optData.optionGroups || {};
          setOptionGroups(groups);
          const preSelected = optData.defaultSelections || {};
          setSelectedOptions(preSelected);
          setLoadingOptions(false);
        }
      } catch (err) {
        console.error("Error loading product/options:", err);
        setError(err.message || "Failed to load product details.");
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchProductAndOptions();
  }, [productId, router]);

  // Calculate live price when options change (ONLY for API products)
  useEffect(() => {
    if (!product || product.isCustom || loadingOptions || !allSelected) {
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
    }, 150);

    return () => clearTimeout(timer);
  }, [selectedOptions, product, loadingOptions, allSelected, productId]);

  const handleOptionChange = (groupName, value) => {
    setSelectedOptions(prev => ({
      ...prev,
      [groupName]: value
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
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload file.");
      }

      setArtworkFiles(prev => [...prev, { name: file.name, url: data.url }]);
      setProofApproved(false);
      setProofDetails(null);
    } catch (err) {
      console.error("Upload error:", err);
      setUploadError(err.message || "File upload failed.");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleRemoveArtwork = (index) => {
    setArtworkFiles(prev => prev.filter((_, idx) => idx !== index));
    if (artworkFiles.length <= 1) {
      setProofApproved(false);
      setProofDetails(null);
    }
  };

  const handleProofApproval = (details) => {
    setProofApproved(true);
    setProofDetails(details);
    setProofModalOpen(false);
  };

  if (loadingProduct) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <Header />
        <main className="container" style={{ flex: 1, padding: "4rem 1.5rem", display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", color: "hsl(var(--muted-hsl))" }}>
            <Loader2 className="animate-spin" size={32} style={{ animation: "spin 1.5s linear infinite", color: "hsl(var(--accent-hsl))" }} />
            <p style={{ fontWeight: 600 }}>Loading product specifications...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <Header />
        <main className="container" style={{ flex: 1, padding: "4rem 1.5rem", textAlign: "center" }}>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Product Not Found</h2>
          <p style={{ color: "hsl(var(--muted-hsl))", marginBottom: "1.5rem" }}>{error || "The requested product is unavailable."}</p>
          <Link href="/products" className="btn btn-primary">
            Back to Catalog
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const productName = product.name || product.sinalite?.name || "Print Product";
  const skuCode = product.sku || product.sinalite?.sku || "PRNT-ITEM";
  const images = product.images && product.images.length > 0 
    ? product.images 
    : ["https://placehold.co/800x600/png?text=Custom+Print+Product"];

  const displayStartingPrice = parseFloat(product.basePrice !== undefined ? product.basePrice : (product.pricing?.startingPrice || 0));

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <main className="container" style={{ flex: 1, padding: "2rem 1.5rem 5rem" }}>
        {/* Breadcrumb */}
        <div style={{ marginBottom: "1.5rem" }}>
          <Link href="/products" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "hsl(var(--muted-hsl))", fontSize: "0.85rem", fontWeight: 600 }}>
            <ArrowLeft size={16} /> Back to Products
          </Link>
        </div>

        <div className="product-detail-grid">
          {/* Left Column: Gallery */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", position: "sticky", top: "6rem" }}>
            <div style={{
              width: "100%",
              aspectRatio: "1/1",
              maxHeight: "520px",
              backgroundColor: "white",
              borderRadius: "var(--radius-lg)",
              border: "1px solid hsl(var(--border-hsl))",
              boxShadow: "var(--shadow-sm)",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative"
            }}>
              <img
                src={images[activeImageIdx] || images[0]}
                alt={productName}
                style={{ width: "100%", height: "100%", objectFit: "contain", padding: "1.5rem" }}
              />
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div style={{ display: "flex", gap: "0.75rem", overflowX: "auto", paddingBottom: "0.5rem" }}>
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIdx(idx)}
                    style={{
                      width: "70px",
                      height: "70px",
                      borderRadius: "var(--radius-sm)",
                      border: activeImageIdx === idx ? "2px solid hsl(var(--accent-hsl))" : "1px solid hsl(var(--border-hsl))",
                      backgroundColor: "white",
                      padding: "0.25rem",
                      cursor: "pointer",
                      flexShrink: 0,
                      overflow: "hidden"
                    }}
                  >
                    <img src={img} alt={`Thumb ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Specifications & Pricing Engine */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
            <div>
              <h1 style={{ fontSize: "2rem", fontWeight: 900, lineHeight: 1.2 }}>{productName}</h1>
              <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.8rem", marginTop: "0.25rem" }}>SKU: {skuCode}</p>
            </div>
            
            {(product.shortDescription || product.description) && (
              <p style={{
                fontSize: "0.9rem",
                color: "hsl(var(--foreground-hsl) / 0.8)",
                lineHeight: "1.5",
                marginTop: "0.75rem",
                paddingTop: "0.75rem",
                borderTop: "1px solid hsl(var(--border-hsl))"
              }}>
                {product.shortDescription || product.description}
              </p>
            )}

            {/* Display starting price info */}
            {!allSelected && displayStartingPrice > 0 && (
              <div style={{ padding: "0.85rem 1rem", backgroundColor: "hsl(var(--secondary-hsl) / 0.3)", borderRadius: "var(--radius-sm)" }}>
                <p style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))", fontWeight: 600 }}>Starting Price</p>
                <p style={{ fontSize: "1.25rem", fontWeight: 800, color: "hsl(var(--accent-hsl))" }}>${displayStartingPrice.toFixed(2)} CAD</p>
              </div>
            )}

            {/* Dynamic Option Groups loop */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <h3 style={{ fontSize: "0.9rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "hsl(var(--muted-hsl))" }}>
                Configure Options
              </h3>
              
              {loadingOptions ? (
                <div style={{ display: "flex", alignItems: "center", color: "hsl(var(--muted-hsl))", fontSize: "0.85rem", padding: "1rem 0" }}>
                  <Loader2 className="animate-spin" size={14} style={{ animation: "spin 1.5s linear infinite", marginRight: "0.25rem" }} /> Loading configuration options...
                </div>
              ) : (
                Object.entries(optionGroups).map(([groupName, options]) => {
                  const isQuantity = groupName.toLowerCase().includes("qty") || groupName.toLowerCase().includes("quantity");

                  if (isQuantity) {
                    return (
                      <div key={groupName}>
                        <label className="label" htmlFor={`opt-${groupName}`} style={{ textTransform: "capitalize", fontWeight: 700 }}>
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
                      <label className="label" style={{ textTransform: "capitalize", fontWeight: 700 }}>
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
                                padding: "0.55rem 0.95rem",
                                fontSize: "0.85rem",
                                borderRadius: "var(--radius-sm)",
                                border: isSelected ? "2px solid hsl(var(--accent-hsl))" : "1px solid hsl(var(--border-hsl))",
                                backgroundColor: isSelected ? "hsl(var(--accent-hsl) / 0.08)" : "white",
                                color: isSelected ? "hsl(var(--accent-hsl))" : "hsl(var(--foreground-hsl))",
                                fontWeight: isSelected ? 800 : 600,
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
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem", flexWrap: "wrap" }}>
                  {calculatingPrice ? (
                    <div style={{ display: "flex", alignItems: "center", color: "hsl(var(--muted-hsl))", fontSize: "0.95rem" }}>
                      <Loader2 className="animate-spin" size={16} style={{ animation: "spin 1.5s linear infinite", marginRight: "0.25rem" }} />
                      Calculating...
                    </div>
                  ) : !allSelected ? (
                    <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "hsl(var(--muted-hsl))" }}>
                      Select all options above to view price
                    </span>
                  ) : effectivePriceData && parseFloat(effectivePriceData.price || effectivePriceData.price?.price || 0) <= 0 ? (
                    <div style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.6rem",
                      padding: "0.75rem 1rem",
                      backgroundColor: "hsl(var(--destructive-hsl) / 0.06)",
                      border: "1px solid hsl(var(--destructive-hsl) / 0.25)",
                      borderRadius: "var(--radius-sm)",
                      width: "100%"
                    }}>
                      <span style={{ fontSize: "1.1rem", lineHeight: 1, marginTop: "0.05rem" }}>⚠️</span>
                      <div>
                        <p style={{ fontWeight: 800, fontSize: "0.9rem", color: "hsl(var(--destructive-hsl))", marginBottom: "0.2rem" }}>
                          This combination is not available
                        </p>
                        <p style={{ fontSize: "0.8rem", color: "hsl(var(--muted-hsl))", lineHeight: 1.4 }}>
                          This option selection is currently unavailable for ordering. Please try a different combination of options above.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "baseline", gap: "0.6rem", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "2rem", fontWeight: 900, color: "hsl(var(--accent-hsl))" }}>
                        ${effectivePriceData ? parseFloat(effectivePriceData.price || effectivePriceData.price?.price || 0).toFixed(2) : "0.00"}
                        <span style={{ fontSize: "0.9rem", color: "hsl(var(--muted-hsl))", fontWeight: 600 }}> CAD</span>
                      </span>
                      {effectivePriceData?.unitPrice > 0 && (
                        <span style={{ fontSize: "0.85rem", color: "hsl(var(--muted-hsl))", fontWeight: 700 }}>
                          (${effectivePriceData.unitPrice.toFixed(2)} / unit)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Configuration Summary */}
            {allSelected && (
              <div style={{
                borderTop: "1px solid hsl(var(--border-hsl))",
                paddingTop: "1rem",
                marginTop: "0.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem"
              }}>
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

                {/* Box weight details (Only for API products) */}
                {!product.isCustom && effectivePriceData?.packageInfo && (
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
                    <span>📦 Est. Package: {effectivePriceData.packageInfo.weight} lbs ({effectivePriceData.packageInfo.boxes} box)</span>
                  </div>
                )}
              </div>
            )}

            {/* Artwork File Upload Card */}
            <div style={{
              border: "1px solid hsl(var(--border-hsl))",
              borderRadius: "var(--radius-md)",
              padding: "1.25rem",
              backgroundColor: "white",
              display: "flex",
              flexDirection: "column",
              gap: "1rem"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h4 style={{ fontSize: "0.95rem", fontWeight: 700 }}>Upload Print Artwork</h4>
                  <p style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))" }}>
                    PDF, AI, PSD, or high-res TIFF/JPEG files (300 DPI recommended).
                  </p>
                </div>
                {proofApproved && (
                  <span style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "hsl(var(--success-hsl))",
                    backgroundColor: "hsl(var(--success-hsl) / 0.1)",
                    padding: "0.25rem 0.5rem",
                    borderRadius: "var(--radius-sm)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem"
                  }}>
                    <FileCheck size={14} /> Proof Approved
                  </span>
                )}
              </div>

              {/* Uploaded files list */}
              {artworkFiles.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {artworkFiles.map((f, idx) => (
                    <div key={idx} style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.5rem 0.75rem",
                      backgroundColor: "hsl(var(--secondary-hsl) / 0.3)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "0.85rem"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", overflow: "hidden" }}>
                        <span style={{ fontWeight: 600, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                          {f.name}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <button
                          type="button"
                          onClick={() => setProofModalOpen(true)}
                          className="btn btn-outline"
                          style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.25rem" }}
                        >
                          <Eye size={12} /> Inspect Proof
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveArtwork(idx)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "hsl(var(--destructive-hsl))",
                            cursor: "pointer",
                            fontSize: "0.75rem",
                            fontWeight: 700
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload input button */}
              <div style={{ position: "relative" }}>
                <input
                  type="file"
                  accept=".pdf,.ai,.psd,.eps,.tiff,.tif,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                  disabled={uploadingFile}
                  style={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0,
                    cursor: uploadingFile ? "not-allowed" : "pointer"
                  }}
                />
                <button
                  type="button"
                  disabled={uploadingFile}
                  className="btn btn-outline"
                  style={{ width: "100%", padding: "0.6rem", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem" }}
                >
                  {uploadingFile ? (
                    <>
                      <Loader2 className="animate-spin" size={16} /> Uploading Artwork File...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} /> + Attach Artwork / Print File
                    </>
                  )}
                </button>
              </div>

              {uploadError && (
                <p style={{ fontSize: "0.8rem", color: "hsl(var(--destructive-hsl))" }}>{uploadError}</p>
              )}
            </div>

            {/* Add to Cart CTA */}
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!allSelected || (effectivePriceData && parseFloat(effectivePriceData.price || effectivePriceData.price?.price || 0) <= 0)}
              className="btn btn-primary"
              style={{
                width: "100%",
                padding: "1rem",
                fontSize: "1.1rem",
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                borderRadius: "var(--radius-md)",
                boxShadow: "0 4px 14px hsl(var(--accent-hsl) / 0.25)"
              }}
            >
              <ShoppingBag size={20} />
              {!allSelected 
                ? "Select All Options to Order" 
                : effectivePriceData && parseFloat(effectivePriceData.price || effectivePriceData.price?.price || 0) <= 0 
                  ? "Option Combination Unavailable" 
                  : "Add to Shopping Cart"
              }
            </button>
          </div>
        </div>
      </main>

      {/* Proof Inspection Modal */}
      <PrintProofModal
        isOpen={proofModalOpen}
        onClose={() => setProofModalOpen(false)}
        artworkFile={artworkFiles[0] || null}
        productName={productName}
        productSpecs={selectedOptions}
        onApprove={handleProofApproval}
      />

      <Footer />
    </div>
  );
}
