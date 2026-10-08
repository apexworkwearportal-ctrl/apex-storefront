"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { 
  Shirt, 
  Ruler, 
  Palette, 
  Layers, 
  Upload, 
  Trash2, 
  RotateCw, 
  Move, 
  ZoomIn, 
  ZoomOut, 
  CheckCircle2, 
  ShoppingBag, 
  Loader2, 
  ArrowLeft, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  Info,
  Maximize2,
  Minimize2,
  Crosshair
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ApparelSizeChartModal from "./ApparelSizeChartModal";

const DEFAULT_SIZES = [
  { name: "S", priceUpcharge: 0 },
  { name: "M", priceUpcharge: 0 },
  { name: "L", priceUpcharge: 0 },
  { name: "XL", priceUpcharge: 0 },
  { name: "2XL", priceUpcharge: 3.50 },
  { name: "3XL", priceUpcharge: 5.00 },
];

const DEFAULT_COLORS = [
  { name: "White", hex: "#FFFFFF" },
  { name: "Black", hex: "#111827" },
  { name: "Navy Blue", hex: "#1E293B" },
  { name: "Heather Grey", hex: "#94A3B8" },
  { name: "Royal Blue", hex: "#2563EB" },
  { name: "Forest Green", hex: "#15803D" },
  { name: "Crimson Red", hex: "#DC2626" },
  { name: "Maroon", hex: "#831843" },
];

const DEFAULT_PRINT_LOCATIONS = [
  { id: "front", label: "Front Only", priceUpcharge: 0, sides: ["front"] },
  { id: "back", label: "Back Only", priceUpcharge: 0, sides: ["back"] },
  { id: "front_back", label: "Front & Back", priceUpcharge: 5.00, sides: ["front", "back"] },
  { id: "left_chest_back", label: "Left Chest + Full Back", priceUpcharge: 6.00, sides: ["left", "back"] },
];

export default function ApparelVisualCustomizer({
  product,
  onAddToCart,
  initialQuantities = null
}) {
  const [step, setStep] = useState(1); // 1 = Sizing & Color, 2 = Logo Placement & Review
  const [sizeChartOpen, setSizeChartOpen] = useState(false);
  const [submittingToCart, setSubmittingToCart] = useState(false);

  // Garment Views from Product
  const views = useMemo(() => {
    return product.garmentViews || product.apparelViews || {};
  }, [product]);

  // Sizing & Fit Setup
  const fitDescription = product.fit || "Semi-fitted";
  const availableSizes = useMemo(() => {
    if (product.sizes && product.sizes.length > 0) return product.sizes;
    return DEFAULT_SIZES;
  }, [product.sizes]);

  // Color Swatches Setup
  const availableColors = useMemo(() => {
    if (product.colors && product.colors.length > 0) return product.colors;
    return DEFAULT_COLORS;
  }, [product.colors]);

  // Print Locations Setup
  const availablePrintLocations = useMemo(() => {
    if (product.printLocations && product.printLocations.length > 0) return product.printLocations;
    return DEFAULT_PRINT_LOCATIONS;
  }, [product.printLocations]);

  const moq = Math.max(1, parseInt(product.minimumOrderQuantity || 12));
  const basePrice = parseFloat(product.pricing?.basePrice || product.pricing?.startingPrice || product.basePrice || 28);

  // Selection states
  const [selectedColor, setSelectedColor] = useState(() => availableColors[0] || { name: "White", hex: "#FFFFFF" });
  
  // Size quantities map: { S: 5, M: 10, L: 10, ... }
  const [sizeQuantities, setSizeQuantities] = useState(() => {
    if (initialQuantities) return initialQuantities;
    const initialMap = {};
    availableSizes.forEach((s, idx) => {
      // Pre-fill first couple sizes to reach MOQ for pleasant initial state
      if (idx === 0) initialMap[s.name] = Math.ceil(moq / 2);
      else if (idx === 1) initialMap[s.name] = Math.floor(moq / 2);
      else initialMap[s.name] = 0;
    });
    return initialMap;
  });

  const [selectedPrintLocationId, setSelectedPrintLocationId] = useState(availablePrintLocations[0]?.id || "front");

  const selectedPrintLocation = useMemo(() => {
    return availablePrintLocations.find(p => p.id === selectedPrintLocationId) || availablePrintLocations[0];
  }, [availablePrintLocations, selectedPrintLocationId]);

  // Active decoration sides based on selected print location (e.g. ['front', 'back'])
  const activeSides = useMemo(() => {
    if (selectedPrintLocation?.sides && selectedPrintLocation.sides.length > 0) {
      return selectedPrintLocation.sides;
    }
    if (selectedPrintLocationId.includes("back") && selectedPrintLocationId.includes("front")) {
      return ["front", "back"];
    }
    if (selectedPrintLocationId.includes("back")) return ["back"];
    return ["front"];
  }, [selectedPrintLocation, selectedPrintLocationId]);

  const [currentEditingSide, setCurrentEditingSide] = useState("front");

  // Keep current editing side within active sides
  useEffect(() => {
    if (!activeSides.includes(currentEditingSide)) {
      setCurrentEditingSide(activeSides[0] || "front");
    }
  }, [activeSides, currentEditingSide]);

  // Logo placements state per side: { front: { logoUrl, logoName, posX, posY, scale, rotation, widthIn, heightIn }, back: ... }
  const [placements, setPlacements] = useState({
    front: {
      logoUrl: "",
      logoName: "",
      positionX: 50, // % from left (0 - 100)
      positionY: 35, // % from top (0 - 100)
      scale: 1, // 0.3 - 2.5
      rotation: 0, // degrees
      sizeIn: 8, // physical width in inches
    },
    back: {
      logoUrl: "",
      logoName: "",
      positionX: 50,
      positionY: 35,
      scale: 1,
      rotation: 0,
      sizeIn: 10,
    },
    left: {
      logoUrl: "",
      logoName: "",
      positionX: 50,
      positionY: 35,
      scale: 1,
      rotation: 0,
      sizeIn: 4,
    },
    right: {
      logoUrl: "",
      logoName: "",
      positionX: 50,
      positionY: 35,
      scale: 1,
      rotation: 0,
      sizeIn: 4,
    }
  });

  const [uploadingLogoSide, setUploadingLogoSide] = useState(null);

  // Calculations
  const totalQuantity = useMemo(() => {
    return Object.values(sizeQuantities).reduce((sum, qty) => sum + (parseInt(qty) || 0), 0);
  }, [sizeQuantities]);

  const meetsMoq = totalQuantity >= moq;

  // Compute weighted price including size upcharges and location upcharges
  const pricingSummary = useMemo(() => {
    const locationUpcharge = parseFloat(selectedPrintLocation?.priceUpcharge || 0);
    
    let totalSizeUpcharges = 0;
    Object.entries(sizeQuantities).forEach(([sizeName, qty]) => {
      const q = parseInt(qty) || 0;
      if (q > 0) {
        const sizeObj = availableSizes.find(s => s.name === sizeName);
        const upcharge = parseFloat(sizeObj?.priceUpcharge || 0);
        totalSizeUpcharges += upcharge * q;
      }
    });

    const averageUnitSizeUpcharge = totalQuantity > 0 ? (totalSizeUpcharges / totalQuantity) : 0;
    const effectiveUnitPrice = basePrice + locationUpcharge + averageUnitSizeUpcharge;
    const grandTotal = effectiveUnitPrice * totalQuantity;

    return {
      basePrice,
      locationUpcharge,
      totalSizeUpcharges,
      effectiveUnitPrice,
      grandTotal
    };
  }, [basePrice, selectedPrintLocation, sizeQuantities, availableSizes, totalQuantity]);

  // Quantity input handler
  const handleQuantityChange = (sizeName, value) => {
    const intVal = Math.max(0, parseInt(value) || 0);
    setSizeQuantities(prev => ({
      ...prev,
      [sizeName]: intVal
    }));
  };

  // Logo upload handler for specific side
  const handleLogoUpload = async (side, file) => {
    if (!file) return;
    setUploadingLogoSide(side);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload logo.");

      setPlacements(prev => ({
        ...prev,
        [side]: {
          ...prev[side],
          logoUrl: data.url,
          logoName: file.name
        }
      }));
    } catch (err) {
      alert("Logo upload error: " + err.message);
    } finally {
      setUploadingLogoSide(null);
    }
  };

  const handleRemoveLogo = (side) => {
    setPlacements(prev => ({
      ...prev,
      [side]: {
        ...prev[side],
        logoUrl: "",
        logoName: ""
      }
    }));
  };

  const updatePlacement = (side, field, val) => {
    setPlacements(prev => ({
      ...prev,
      [side]: {
        ...prev[side],
        [field]: val
      }
    }));
  };

  // Dragging logic on canvas
  const canvasRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, initialPosX: 50, initialPosY: 35 });

  const handlePointerDown = (e) => {
    const currentPlacement = placements[currentEditingSide];
    if (!currentPlacement?.logoUrl) return;

    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialPosX: currentPlacement.positionX,
      initialPosY: currentPlacement.positionY
    };
  };

  const handlePointerMove = (e) => {
    if (!isDragging || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const deltaXPct = ((e.clientX - dragStartRef.current.x) / rect.width) * 100;
    const deltaYPct = ((e.clientY - dragStartRef.current.y) / rect.height) * 100;

    const newX = Math.max(15, Math.min(85, dragStartRef.current.initialPosX + deltaXPct));
    const newY = Math.max(15, Math.min(85, dragStartRef.current.initialPosY + deltaYPct));

    updatePlacement(currentEditingSide, "positionX", newX);
    updatePlacement(currentEditingSide, "positionY", newY);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // High-accuracy canvas composite snapshot generator
  const generateSideMockupSnapshot = async (sideKey) => {
    const viewData = views[sideKey] || Object.values(views)[0];
    const garmentImgSrc = viewData?.image || product.images?.[0] || "";
    const placement = placements[sideKey];

    if (!garmentImgSrc) return "";

    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const garmentImg = new Image();
      garmentImg.crossOrigin = "anonymous";

      garmentImg.onload = () => {
        canvas.width = garmentImg.naturalWidth || 1000;
        canvas.height = garmentImg.naturalHeight || 1000;

        // Draw garment base
        ctx.drawImage(garmentImg, 0, 0, canvas.width, canvas.height);

        // If a logo is placed on this side, composite it
        if (placement?.logoUrl) {
          const logoImg = new Image();
          logoImg.crossOrigin = "anonymous";
          logoImg.onload = () => {
            const centerX = (placement.positionX / 100) * canvas.width;
            const centerY = (placement.positionY / 100) * canvas.height;
            
            const baseLogoW = canvas.width * 0.28;
            const logoW = baseLogoW * (placement.scale || 1);
            const aspect = logoImg.naturalHeight / (logoImg.naturalWidth || 1);
            const logoH = logoW * aspect;

            ctx.save();
            ctx.translate(centerX, centerY);
            if (placement.rotation) {
              ctx.rotate((placement.rotation * Math.PI) / 180);
            }
            ctx.drawImage(logoImg, -logoW / 2, -logoH / 2, logoW, logoH);
            ctx.restore();

            resolve(canvas.toDataURL("image/png", 0.9));
          };
          logoImg.onerror = () => resolve(canvas.toDataURL("image/png", 0.9));
          logoImg.src = placement.logoUrl;
        } else {
          resolve(canvas.toDataURL("image/png", 0.9));
        }
      };

      garmentImg.onerror = () => resolve("");
      garmentImg.src = garmentImgSrc;
    });
  };

  // Final Add to Cart
  const handleFinalAddToCart = async () => {
    setSubmittingToCart(true);

    try {
      // 1. Generate composite mockup snapshots for all active sides
      const mockupSnapshots = {};
      for (const side of activeSides) {
        mockupSnapshots[side] = await generateSideMockupSnapshot(side);
      }

      // 2. Gather raw artwork files
      const artworkFiles = [];
      activeSides.forEach(side => {
        const p = placements[side];
        if (p?.logoUrl) {
          artworkFiles.push({
            name: p.logoName || `${side.toUpperCase()} Logo`,
            url: p.logoUrl,
            side: side,
            sizeIn: p.sizeIn || 8,
            placement: {
              positionX: p.positionX / 100,
              positionY: p.positionY / 100,
              rotation: p.rotation,
              scale: p.scale
            }
          });
        }
      });

      // 3. Construct clean size breakdown string: e.g. "S: 5, M: 10, L: 10"
      const sizeBreakdownList = Object.entries(sizeQuantities)
        .filter(([_, qty]) => qty > 0)
        .map(([name, qty]) => `${name}: ${qty}`);
      
      const optionSummaryText = `${selectedColor.name} • ${sizeBreakdownList.join(", ")} • ${selectedPrintLocation.label}`;

      const primaryImage = mockupSnapshots[activeSides[0]] || views.front?.image || product.images?.[0] || "";

      const cartPayload = {
        productId: product.id,
        name: product.name || "Custom Branded Apparel",
        images: [primaryImage, ...Object.values(mockupSnapshots)].filter(Boolean),
        category: product.category || "Custom Apparel",
        categoryId: product.categoryId || "apparel",
        quantity: totalQuantity,
        price: pricingSummary.effectiveUnitPrice,
        unitPrice: pricingSummary.effectiveUnitPrice,
        totalPrice: pricingSummary.grandTotal,
        
        // Dedicated Apparel Breakdown
        isApparel: true,
        isCustom: true,
        fit: fitDescription,
        color: selectedColor,
        sizeBreakdown: sizeQuantities,
        printLocation: selectedPrintLocation,
        optionSummary: optionSummaryText,
        
        // Visual placements & raw artwork for manufacturing
        artworkFiles,
        mockupSnapshots,
        placementMetadata: placements
      };

      onAddToCart(cartPayload);
    } catch (err) {
      console.error("Failed to add apparel to cart:", err);
      alert("Error preparing order: " + err.message);
    } finally {
      setSubmittingToCart(false);
    }
  };

  // Active garment view data
  const currentViewData = views[currentEditingSide] || views.front || Object.values(views)[0] || {};
  const currentGarmentImg = currentViewData.image || product.images?.[0] || "";
  const currentCalibration = currentViewData.calibration || {};
  const currentPlacement = placements[currentEditingSide] || {};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      
      {/* Multi-Step Header Indicator */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "2px solid #E2E8F0",
        paddingBottom: "1rem",
        backgroundColor: "#FFFFFF",
        borderRadius: "12px",
        padding: "1.25rem 1.75rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button
            onClick={() => setStep(1)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontWeight: 800,
              fontSize: "0.95rem",
              color: step === 1 ? "#2563EB" : "#10B981"
            }}
          >
            <span style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              backgroundColor: step === 1 ? "#2563EB" : "#10B981",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.8rem",
              fontWeight: 800
            }}>
              {step === 2 ? "✓" : "1"}
            </span>
            1. Sizing, Color & Locations
          </button>

          <span style={{ color: "#CBD5E1", fontSize: "1.2rem" }}>→</span>

          <button
            onClick={() => meetsMoq && setStep(2)}
            disabled={!meetsMoq}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "none",
              border: "none",
              cursor: meetsMoq ? "pointer" : "not-allowed",
              fontWeight: 800,
              fontSize: "0.95rem",
              color: step === 2 ? "#2563EB" : "#94A3B8"
            }}
          >
            <span style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              backgroundColor: step === 2 ? "#2563EB" : "#E2E8F0",
              color: step === 2 ? "#FFFFFF" : "#64748B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.8rem",
              fontWeight: 800
            }}>
              2
            </span>
            2. Place Logo & Verify Proof
          </button>
        </div>

        {/* Live Total Badge */}
        <div style={{ textAlign: "right" }}>
          <span style={{ fontSize: "0.75rem", color: "#64748B", textTransform: "uppercase", fontWeight: 700 }}>
            {totalQuantity} {totalQuantity === 1 ? "Unit" : "Units"} • Total
          </span>
          <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#2563EB" }}>
            ${pricingSummary.grandTotal.toFixed(2)} <span style={{ fontSize: "0.75rem", color: "#64748B" }}>CAD</span>
          </div>
        </div>
      </div>

      {/* STEP 1: Sizing, Color & Placement Selection */}
      {step === 1 && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "2.5rem" }}
          className="apparel-step-grid"
        >
          {/* Left Column: Visual Showcase */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{
              position: "relative",
              width: "100%",
              paddingTop: "100%",
              backgroundColor: "#FFFFFF",
              borderRadius: "16px",
              border: "1px solid #E2E8F0",
              overflow: "hidden",
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)"
            }}>
              <img
                src={currentGarmentImg || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=800"}
                alt={product.name}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  padding: "1.5rem"
                }}
              />

              {/* Side switcher thumbnails */}
              <div style={{
                position: "absolute",
                bottom: "1rem",
                left: "50%",
                transform: "translateX(-50%)",
                display: "flex",
                gap: "0.5rem",
                backgroundColor: "rgba(255,255,255,0.9)",
                backdropFilter: "blur(6px)",
                padding: "0.35rem 0.75rem",
                borderRadius: "100px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                border: "1px solid rgba(226,232,240,0.8)"
              }}>
                {Object.keys(views).filter(k => views[k]?.image).map((sideKey) => (
                  <button
                    key={sideKey}
                    type="button"
                    onClick={() => setCurrentEditingSide(sideKey)}
                    style={{
                      border: "none",
                      background: currentEditingSide === sideKey ? "#2563EB" : "transparent",
                      color: currentEditingSide === sideKey ? "#FFFFFF" : "#64748B",
                      padding: "0.25rem 0.75rem",
                      borderRadius: "100px",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      textTransform: "capitalize",
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                  >
                    {sideKey}
                  </button>
                ))}
              </div>
            </div>

            {/* Quality & Production Guarantees */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.75rem",
              fontSize: "0.8rem",
              color: "#475569"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem", backgroundColor: "#F8FAFC", borderRadius: "10px", border: "1px solid #E2E8F0" }}>
                <ShieldCheck size={18} style={{ color: "#10B981", flexShrink: 0 }} />
                <span>Commercial Grade High-Density Embroidery / DTG Print</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem", backgroundColor: "#F8FAFC", borderRadius: "10px", border: "1px solid #E2E8F0" }}>
                <Sparkles size={18} style={{ color: "#2563EB", flexShrink: 0 }} />
                <span>Digital Proof Verification Included With Every Order</span>
              </div>
            </div>
          </div>

          {/* Right Column: Customization Controls */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
            
            {/* 1. Colour Selection (Screenshot 2 Match) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <span style={{ fontSize: "1rem", fontWeight: 800, color: "#0F172A" }}>
                  Colour*
                </span>
                <span style={{ fontSize: "1rem", fontWeight: 600, color: "#475569", marginLeft: "0.25rem" }}>
                  {selectedColor.name}
                </span>
              </div>

              {/* Circular Color Swatches */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                flexWrap: "wrap",
                padding: "0.5rem 0"
              }}>
                {availableColors.map((col, idx) => {
                  const isSelected = selectedColor.name === col.name;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedColor(col)}
                      title={col.name}
                      style={{
                        position: "relative",
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        backgroundColor: col.hex,
                        border: "1px solid rgba(0,0,0,0.18)",
                        cursor: "pointer",
                        outline: "none",
                        padding: 0,
                        transition: "all 0.15s ease-in-out",
                        boxShadow: isSelected
                          ? "0 0 0 2px #FFFFFF, 0 0 0 4px #0284C7"
                          : "0 1px 2px rgba(0,0,0,0.08)",
                        transform: isSelected ? "scale(1.15)" : "scale(1)"
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.transform = "scale(1.1)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.transform = "scale(1)";
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* 2. Size and Quantity Matrix (Screenshot 1 Match) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "1rem", fontWeight: 800, color: "#0F172A" }}>
                  Size and quantity*
                </span>
                <button
                  type="button"
                  onClick={() => setSizeChartOpen(true)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#0F172A",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    textDecoration: "underline",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    padding: 0
                  }}
                >
                  Size chart
                </button>
              </div>

              {/* Fit description subtitle */}
              <div style={{ fontSize: "0.85rem", color: "#475569", fontWeight: 500 }}>
                Fit: {fitDescription}
              </div>

              {/* Grid of rounded size input boxes */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "0.75rem",
                marginTop: "0.5rem"
              }}>
                {availableSizes.map((sizeObj, idx) => {
                  const qty = sizeQuantities[sizeObj.name] || "";

                  return (
                    <div
                      key={idx}
                      style={{
                        position: "relative",
                        border: "1.5px solid #CBD5E1",
                        borderRadius: "10px",
                        padding: "0.5rem 0.75rem",
                        backgroundColor: "#FFFFFF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        transition: "all 0.15s ease-in-out"
                      }}
                    >
                      {/* Left: Size Label */}
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "#1E293B" }}>
                          {sizeObj.name}
                        </span>
                      </div>

                      {/* Right: Quantity Input Box */}
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={qty}
                        onChange={(e) => handleQuantityChange(sizeObj.name, e.target.value)}
                        style={{
                          width: "55px",
                          textAlign: "center",
                          fontWeight: 700,
                          fontSize: "1rem",
                          border: "none",
                          outline: "none",
                          backgroundColor: "transparent",
                          color: qty > 0 ? "#2563EB" : "#94A3B8"
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* MOQ Alert or Confirmation */}
              {!meetsMoq ? (
                <div style={{
                  marginTop: "0.5rem",
                  padding: "0.6rem 0.85rem",
                  backgroundColor: "#FEF2F2",
                  border: "1px solid #FCA5A5",
                  borderRadius: "8px",
                  color: "#991B1B",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}>
                  <Info size={16} />
                  <span>
                    Minimum order is {moq} garments. Current total: {totalQuantity} ({moq - totalQuantity} more needed).
                  </span>
                </div>
              ) : (
                <div style={{
                  marginTop: "0.5rem",
                  fontSize: "0.8rem",
                  color: "#059669",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem"
                }}>
                  <CheckCircle2 size={15} /> Total: {totalQuantity} garments selected (Meets MOQ ✓)
                </div>
              )}
            </div>

            {/* 3. Print Location Selection */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <span style={{ fontSize: "1rem", fontWeight: 800, color: "#0F172A" }}>
                Print Location / Decoration Sides*
              </span>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                {availablePrintLocations.map((loc) => {
                  const isSelected = selectedPrintLocationId === loc.id;

                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => setSelectedPrintLocationId(loc.id)}
                      style={{
                        padding: "0.85rem 1rem",
                        borderRadius: "10px",
                        border: isSelected ? "2px solid #2563EB" : "1.5px solid #CBD5E1",
                        backgroundColor: isSelected ? "rgba(37, 99, 235, 0.04)" : "#FFFFFF",
                        cursor: "pointer",
                        textAlign: "left",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        transition: "all 0.15s ease"
                      }}
                    >
                      <span style={{ fontWeight: 800, fontSize: "0.85rem", color: isSelected ? "#1E40AF" : "#0F172A" }}>
                        {loc.label}
                      </span>
                      {isSelected && <span style={{ color: "#2563EB", fontWeight: 800 }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Proceed to Step 2 Action Button */}
            <div style={{ marginTop: "0.5rem" }}>
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!meetsMoq}
                className="btn btn-primary"
                style={{
                  width: "100%",
                  padding: "1rem",
                  fontSize: "1.05rem",
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  borderRadius: "10px",
                  opacity: !meetsMoq ? 0.5 : 1,
                  cursor: !meetsMoq ? "not-allowed" : "pointer"
                }}
              >
                <span>Next: Place Your Logo & Review Design</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* STEP 2: Interactive High-Accuracy Logo Placement & Live Proof */}
      {step === 2 && (
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "2.5rem" }}
          className="apparel-step-grid"
        >
          {/* Left Column: Interactive Garment Canvas */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            
            {/* Side Tabs for selected print locations */}
            <div style={{ display: "flex", gap: "0.5rem", borderBottom: "2px solid #E2E8F0", paddingBottom: "0.5rem" }}>
              {activeSides.map((sideKey) => {
                const isCurrent = currentEditingSide === sideKey;
                const hasLogo = !!placements[sideKey]?.logoUrl;
                const sideLabel = sideKey.charAt(0).toUpperCase() + sideKey.slice(1) + " View";

                return (
                  <button
                    key={sideKey}
                    type="button"
                    onClick={() => setCurrentEditingSide(sideKey)}
                    style={{
                      padding: "0.5rem 1rem",
                      borderRadius: "8px",
                      border: "none",
                      backgroundColor: isCurrent ? "#2563EB" : "#F1F5F9",
                      color: isCurrent ? "#FFFFFF" : "#475569",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <span>{sideLabel}</span>
                    {hasLogo && (
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: isCurrent ? "#FFFFFF" : "#10B981" }} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Interactive Canvas Viewport */}
            <div
              ref={canvasRef}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              style={{
                position: "relative",
                width: "100%",
                paddingTop: "100%",
                backgroundColor: "#FFFFFF",
                borderRadius: "16px",
                border: "2px solid #E2E8F0",
                overflow: "hidden",
                boxShadow: "0 10px 25px -5px rgba(0,0,0,0.06)",
                cursor: isDragging ? "grabbing" : "default",
                userSelect: "none",
                touchAction: "none"
              }}
            >
              {/* Garment Base Image */}
              <img
                src={currentGarmentImg || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=800"}
                alt="Garment Preview"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  padding: "2rem",
                  pointerEvents: "none"
                }}
              />

              {/* Calibrated Printable Zone Guideline (Subtle dashed border) */}
              <div style={{
                position: "absolute",
                left: "22%",
                top: "20%",
                width: "56%",
                height: "60%",
                border: "1.5px dashed rgba(37, 99, 235, 0.4)",
                borderRadius: "8px",
                pointerEvents: "none",
                display: "flex",
                justifyContent: "center",
                alignItems: "flex-start",
                padding: "0.35rem"
              }}>
                <span style={{ fontSize: "0.65rem", color: "#2563EB", fontWeight: 700, backgroundColor: "rgba(255,255,255,0.85)", padding: "0.1rem 0.4rem", borderRadius: "4px" }}>
                  Max Printable Area
                </span>
              </div>

              {/* Positioned Logo Layer */}
              {currentPlacement?.logoUrl && (
                <div
                  onPointerDown={handlePointerDown}
                  style={{
                    position: "absolute",
                    left: `${currentPlacement.positionX}%`,
                    top: `${currentPlacement.positionY}%`,
                    transform: `translate(-50%, -50%) rotate(${currentPlacement.rotation || 0}deg)`,
                    width: `${160 * (currentPlacement.scale || 1)}px`,
                    cursor: "grab",
                    zIndex: 10,
                    filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.15))"
                  }}
                >
                  <img
                    src={currentPlacement.logoUrl}
                    alt="Logo"
                    style={{
                      width: "100%",
                      height: "auto",
                      display: "block",
                      pointerEvents: "none"
                    }}
                  />
                  {/* Active selection boundary */}
                  <div style={{
                    position: "absolute",
                    inset: "-4px",
                    border: "1.5px solid #2563EB",
                    borderRadius: "4px",
                    pointerEvents: "none"
                  }}>
                    <span style={{ position: "absolute", top: "-10px", right: "-10px", width: "18px", height: "18px", borderRadius: "50%", backgroundColor: "#2563EB", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px" }}>
                      ✥
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Live Placement Controls Bar */}
            {currentPlacement?.logoUrl && (
              <div style={{
                backgroundColor: "#F8FAFC",
                borderRadius: "12px",
                border: "1px solid #E2E8F0",
                padding: "1rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#0F172A", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <Move size={14} /> Adjust {currentEditingSide.toUpperCase()} Placement
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveLogo(currentEditingSide)}
                    style={{ background: "none", border: "none", color: "#DC2626", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem" }}
                  >
                    <Trash2 size={13} /> Remove Logo
                  </button>
                </div>

                {/* Scale & Rotate Sliders */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", fontSize: "0.8rem" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                      <label style={{ fontWeight: 600, color: "#475569" }}>Size / Scale</label>
                      <span style={{ fontWeight: 700 }}>{(currentPlacement.scale * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.4"
                      max="2.0"
                      step="0.05"
                      value={currentPlacement.scale || 1}
                      onChange={(e) => updatePlacement(currentEditingSide, "scale", parseFloat(e.target.value))}
                      style={{ width: "100%", accentColor: "#2563EB" }}
                    />
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                      <label style={{ fontWeight: 600, color: "#475569" }}>Rotation</label>
                      <span style={{ fontWeight: 700 }}>{currentPlacement.rotation || 0}°</span>
                    </div>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      step="5"
                      value={currentPlacement.rotation || 0}
                      onChange={(e) => updatePlacement(currentEditingSide, "rotation", parseInt(e.target.value))}
                      style={{ width: "100%", accentColor: "#2563EB" }}
                    />
                  </div>
                </div>

                {/* Quick alignment presets */}
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", paddingTop: "0.25rem" }}>
                  <button
                    type="button"
                    onClick={() => {
                      updatePlacement(currentEditingSide, "positionX", 50);
                      updatePlacement(currentEditingSide, "positionY", 35);
                      updatePlacement(currentEditingSide, "rotation", 0);
                    }}
                    className="btn btn-outline"
                    style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                  >
                    Center Chest
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      updatePlacement(currentEditingSide, "positionX", 35);
                      updatePlacement(currentEditingSide, "positionY", 30);
                      updatePlacement(currentEditingSide, "scale", 0.65);
                    }}
                    className="btn btn-outline"
                    style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                  >
                    Left Chest
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      updatePlacement(currentEditingSide, "positionX", 50);
                      updatePlacement(currentEditingSide, "positionY", 45);
                      updatePlacement(currentEditingSide, "scale", 1.3);
                    }}
                    className="btn btn-outline"
                    style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                  >
                    Full Width
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Logo Upload & Order Review */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            
            {/* Logo Upload Card for current side */}
            <div style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "14px",
              border: "1px solid #E2E8F0",
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem"
            }}>
              <div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0, color: "#0F172A" }}>
                  Upload Artwork for {currentEditingSide.toUpperCase()} Side
                </h3>
                <p style={{ fontSize: "0.8rem", color: "#64748B", margin: "0.2rem 0 0" }}>
                  PNG, SVG, PDF, or high-res JPG. Transparent background recommended.
                </p>
              </div>

              {/* Upload Drop Area */}
              <div style={{
                position: "relative",
                border: "2px dashed #CBD5E1",
                borderRadius: "10px",
                padding: "1.75rem 1rem",
                textAlign: "center",
                backgroundColor: "#F8FAFC",
                cursor: uploadingLogoSide ? "not-allowed" : "pointer"
              }}>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,application/pdf"
                  disabled={!!uploadingLogoSide}
                  onChange={(e) => handleLogoUpload(currentEditingSide, e.target.files[0])}
                  style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
                />
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem" }}>
                  {uploadingLogoSide ? (
                    <>
                      <Loader2 className="animate-spin" size={24} style={{ color: "#2563EB" }} />
                      <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>Uploading high-res artwork...</span>
                    </>
                  ) : (
                    <>
                      <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "rgba(37,99,235,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563EB" }}>
                        <Upload size={20} />
                      </div>
                      <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#0F172A" }}>
                        {currentPlacement?.logoUrl ? "Click to Replace Logo" : "Choose Logo File to Place"}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "#64748B" }}>Drag & drop or browse files</span>
                    </>
                  )}
                </div>
              </div>

              {currentPlacement?.logoUrl && (
                <div style={{ padding: "0.6rem 0.85rem", backgroundColor: "rgba(16,185,129,0.08)", borderRadius: "8px", border: "1px solid rgba(16,185,129,0.2)", display: "flex", alignItems: "center", gap: "0.5rem", color: "#065F46", fontSize: "0.8rem", fontWeight: 600 }}>
                  <CheckCircle2 size={16} /> Attached: {currentPlacement.logoName || "Logo ready"}
                </div>
              )}
            </div>

            {/* Order Specification Summary Card */}
            <div style={{
              backgroundColor: "#F8FAFC",
              borderRadius: "14px",
              border: "1px solid #E2E8F0",
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem"
            }}>
              <h4 style={{ fontSize: "0.9rem", fontWeight: 800, textTransform: "uppercase", color: "#475569", margin: 0, letterSpacing: "0.04em" }}>
                Order Configuration Summary
              </h4>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.85rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748B" }}>Garment Style:</span>
                  <span style={{ fontWeight: 700 }}>{product.name}</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748B" }}>Color Selected:</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <span style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: selectedColor.hex, border: "1px solid rgba(0,0,0,0.2)" }} />
                    <span style={{ fontWeight: 700 }}>{selectedColor.name}</span>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748B" }}>Print Location:</span>
                  <span style={{ fontWeight: 700 }}>{selectedPrintLocation.label}</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed #CBD5E1", paddingTop: "0.4rem" }}>
                  <span style={{ color: "#64748B" }}>Size Breakdown:</span>
                  <span style={{ fontWeight: 700 }}>
                    {Object.entries(sizeQuantities).filter(([_, q]) => q > 0).map(([s, q]) => `${s}: ${q}`).join(", ")}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748B" }}>Total Garments:</span>
                  <span style={{ fontWeight: 800, color: "#2563EB" }}>{totalQuantity} Units</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #CBD5E1", paddingTop: "0.5rem", fontSize: "1.1rem", fontWeight: 900 }}>
                  <span>Total Amount:</span>
                  <span style={{ color: "#2563EB" }}>${pricingSummary.grandTotal.toFixed(2)} CAD</span>
                </div>
              </div>
            </div>

            {/* Navigation & Add to Cart Actions */}
            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn btn-outline"
                style={{ padding: "0.85rem 1.25rem", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
              >
                <ArrowLeft size={16} /> Back to Sizing
              </button>

              <button
                type="button"
                onClick={handleFinalAddToCart}
                disabled={submittingToCart}
                className="btn btn-primary"
                style={{
                  flexGrow: 1,
                  padding: "0.85rem 1.5rem",
                  fontSize: "1rem",
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  borderRadius: "10px"
                }}
              >
                {submittingToCart ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Rendering Proofs...</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag size={18} />
                    <span>Add {totalQuantity} Garments to Cart</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Size Chart Modal */}
      <ApparelSizeChartModal
        isOpen={sizeChartOpen}
        onClose={() => setSizeChartOpen(false)}
        productName={product.name}
        fit={fitDescription}
        sizeChart={product.sizeChart}
      />

      <style>{`
        @media (max-width: 860px) {
          .apparel-step-grid {
            grid-template-columns: 1fr !important;
            gap: 2rem !important;
          }
        }
      `}</style>
    </div>
  );
}
