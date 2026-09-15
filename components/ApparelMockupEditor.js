"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Move, ZoomIn, ZoomOut, Upload, Check, AlertTriangle, ShoppingBag, Loader2, Trash2, Plus, RotateCw, Layers } from "lucide-react";
import { computeLayout, clampCenter, placementFromCenter, PLACEMENT_PRESETS } from "@/lib/mockup-geometry";

/**
 * Customer Interactive Apparel Visual Configurator & Mockup Editor (Pure JS/JSX)
 * Supports multiple logo uploads, positioning, sizing, rotation, and individual/bulk deletion.
 */
export default function ApparelMockupEditor({
  productName = "Custom Apparel",
  apparelViews = {},
  garmentViews = {},
  selectedSide: externalSide,
  onSideChange,
  logoUrl: externalLogoUrl = "",
  logoWidthIn = 6,
  logoHeightIn = 6,
  minimumOrderQuantity: propMoq = 12,
  moq: altMoq = 12,
  quantity: externalQuantity,
  basePrice = 0,
  onQuantityChange = () => {},
  onPlacementChange = () => {},
  onAddToCart = () => {}
}) {
  const containerRef = useRef(null);
  const [containerW, setContainerW] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Fallbacks for views
  const views = useMemo(() => {
    return Object.keys(garmentViews).length > 0 ? garmentViews : apparelViews;
  }, [garmentViews, apparelViews]);

  const effectiveMoq = Math.max(1, parseInt(propMoq || altMoq || 12));

  // Internal states
  const [internalSide, setInternalSide] = useState("front");
  const [internalQty, setInternalQty] = useState(effectiveMoq);

  const selectedSide = externalSide || internalSide;
  const quantity = externalQuantity !== undefined ? externalQuantity : internalQty;

  // Multi-logo layer array state: array of { id, url, name, side, sizeIn, rotationDeg, placement: { positionX, positionY } }
  const [logos, setLogos] = useState(() => {
    if (externalLogoUrl) {
      return [{
        id: "logo-1",
        url: externalLogoUrl,
        name: "Logo 1",
        side: "front",
        sizeIn: logoWidthIn || 6,
        rotationDeg: 0,
        placement: { positionX: 0.5, positionY: 0.35, offsetXIn: 0, offsetYIn: 8 }
      }];
    }
    return [];
  });

  const [activeLogoId, setActiveLogoId] = useState(logos[0]?.id || null);

  // Sync external logoUrl if passed & not present in logos
  useEffect(() => {
    if (externalLogoUrl && !logos.some(l => l.url === externalLogoUrl)) {
      const newLogo = {
        id: `logo-${Date.now()}`,
        url: externalLogoUrl,
        name: `Logo ${logos.length + 1}`,
        side: selectedSide,
        sizeIn: logoWidthIn || 6,
        rotationDeg: 0,
        placement: { positionX: 0.5, positionY: 0.35, offsetXIn: 0, offsetYIn: 8 }
      };
      setLogos(prev => [...prev, newLogo]);
      setActiveLogoId(newLogo.id);
    }
  }, [externalLogoUrl]);

  const activeView = views[selectedSide] || Object.values(views)[0] || null;
  const activeImageUrl = activeView?.image || activeView?.imageUrl || null;
  const activeCalibration = activeView?.calibration || null;
  const isCalibrated = activeCalibration?.isCalibrated || false;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      if (entries[0]) {
        setContainerW(entries[0].contentRect.width);
      }
    });
    observer.observe(el);
    setContainerW(el.clientWidth);
    return () => observer.disconnect();
  }, []);

  // Filter logos for current side
  const currentSideLogos = useMemo(() => {
    return logos.filter(l => l.side === selectedSide);
  }, [logos, selectedSide]);

  // Set active logo if current active one is deleted or not on current side
  useEffect(() => {
    if (currentSideLogos.length > 0 && (!activeLogoId || !currentSideLogos.some(l => l.id === activeLogoId))) {
      setActiveLogoId(currentSideLogos[0].id);
    }
  }, [currentSideLogos, activeLogoId]);

  const activeLogo = useMemo(() => {
    return logos.find(l => l.id === activeLogoId) || currentSideLogos[0] || null;
  }, [logos, activeLogoId, currentSideLogos]);

  // Layout calculations for all logos on the current side
  const layoutsMap = useMemo(() => {
    const map = {};
    currentSideLogos.forEach(logo => {
      map[logo.id] = computeLayout({
        canvasW: containerW || 400,
        image: activeCalibration,
        fallbackApparelWidthIn: activeCalibration?.garmentWidthIn || 20,
        fallbackApparelHeightIn: activeCalibration?.garmentHeightIn || 28,
        logoWidthIn: logo.sizeIn || 6,
        logoHeightIn: logo.sizeIn || 6,
        placement: logo.placement || { positionX: 0.5, positionY: 0.35 }
      });
    });
    return map;
  }, [containerW, activeCalibration, currentSideLogos]);

  // Active logo layout
  const activeLayout = activeLogo ? layoutsMap[activeLogo.id] : null;

  // Notify parent component of placements
  useEffect(() => {
    if (onPlacementChange) {
      onPlacementChange({
        side: selectedSide,
        logos,
        activeLogo,
        isCalibrated
      });
    }
  }, [selectedSide, logos, activeLogo, isCalibrated, onPlacementChange]);

  const dragRef = useRef({ startX: 0, startY: 0, startCX: 0, startCY: 0, logoId: null });

  const handlePointerDownLogo = (e, logoId) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveLogoId(logoId);

    const l = layoutsMap[logoId];
    if (!l) return;

    const startCX = l.logoLeft + l.logoW / 2;
    const startCY = l.logoTop + l.logoH / 2;

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startCX,
      startCY,
      logoId
    };
    setDragging(true);
  };

  useEffect(() => {
    if (!dragging || containerW === 0 || !dragRef.current.logoId) return;

    const logoId = dragRef.current.logoId;
    const l = layoutsMap[logoId];
    if (!l) return;

    const onMove = (e) => {
      e.preventDefault();
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const newCX = dragRef.current.startCX + dx;
      const newCY = dragRef.current.startCY + dy;

      const clamped = clampCenter(newCX, newCY, l);
      const nextPlacement = placementFromCenter(clamped.x, clamped.y, l);

      setLogos(prev => prev.map(logo => {
        if (logo.id === logoId) {
          return { ...logo, placement: nextPlacement };
        }
        return logo;
      }));
    };

    const onUp = () => setDragging(false);

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging, containerW, layoutsMap]);

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload logo");

      const newLogo = {
        id: `logo-${Date.now()}`,
        url: data.url,
        name: file.name || `Logo ${logos.length + 1}`,
        side: selectedSide,
        sizeIn: 6,
        rotationDeg: 0,
        placement: { positionX: 0.5, positionY: 0.35, offsetXIn: 0, offsetYIn: 8 }
      };

      setLogos(prev => [...prev, newLogo]);
      setActiveLogoId(newLogo.id);
    } catch (err) {
      console.error(err);
      alert("Error uploading logo: " + err.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleDeleteLogo = (idToDelete) => {
    setLogos(prev => {
      const remaining = prev.filter(l => l.id !== idToDelete);
      if (activeLogoId === idToDelete) {
        const nextActive = remaining.find(l => l.side === selectedSide);
        setActiveLogoId(nextActive ? nextActive.id : null);
      }
      return remaining;
    });
  };

  const handleClearAllLogos = () => {
    if (confirm("Are you sure you want to remove all uploaded logos?")) {
      setLogos([]);
      setActiveLogoId(null);
    }
  };

  const updateActiveLogoSize = (newSize) => {
    if (!activeLogoId) return;
    setLogos(prev => prev.map(l => l.id === activeLogoId ? { ...l, sizeIn: newSize } : l));
  };

  const updateActiveLogoRotation = () => {
    if (!activeLogoId) return;
    setLogos(prev => prev.map(l => l.id === activeLogoId ? { ...l, rotationDeg: ((l.rotationDeg || 0) + 90) % 360 } : l));
  };

  const handleQtyChange = (val) => {
    const validQty = Math.max(effectiveMoq, parseInt(val) || effectiveMoq);
    setInternalQty(validQty);
    if (typeof onQuantityChange === "function") {
      onQuantityChange(validQty);
    }
  };

  const availableSides = Object.keys(views).filter(side => views[side]?.image || views[side]?.imageUrl);

  const handleSideClick = (side) => {
    setInternalSide(side);
    if (typeof onSideChange === "function") {
      onSideChange(side);
    }
  };

  const unitPrice = parseFloat(basePrice) || 0;
  const totalPrice = unitPrice * quantity;

  const handleAddToCartSubmit = () => {
    if (typeof onAddToCart === "function") {
      onAddToCart({
        quantity,
        price: unitPrice,
        unitPrice: unitPrice,
        totalPrice: totalPrice,
        artworkFiles: logos.map(l => ({ name: l.name, url: l.url, side: l.side, sizeIn: l.sizeIn })),
        optionSummary: `Logos: ${logos.length} attached | Qty: ${quantity}`,
        mockupLayers: {
          side: selectedSide,
          logos,
          isCalibrated
        }
      });
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Side Profiles Tab Selector */}
      {availableSides.length > 1 && (
        <div>
          <label className="label" style={{ marginBottom: "0.5rem", display: "block" }}>Select Garment View</label>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            {availableSides.map(side => {
              const isSelected = selectedSide === side;
              const view = views[side];
              const img = view?.image || view?.imageUrl;
              const sideLogosCount = logos.filter(l => l.side === side).length;

              return (
                <button
                  key={side}
                  type="button"
                  onClick={() => handleSideClick(side)}
                  style={{
                    padding: "0.4rem 0.85rem",
                    borderRadius: "var(--radius-sm)",
                    border: isSelected ? "2px solid hsl(var(--accent-hsl))" : "1px solid hsl(var(--border-hsl))",
                    backgroundColor: isSelected ? "hsl(var(--accent-hsl) / 0.1)" : "white",
                    color: isSelected ? "hsl(var(--accent-hsl))" : "hsl(var(--foreground-hsl))",
                    fontWeight: isSelected ? 800 : 600,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    textTransform: "capitalize",
                    position: "relative"
                  }}
                >
                  {img && (
                    <img src={img} alt={side} style={{ width: "24px", height: "24px", objectFit: "contain" }} />
                  )}
                  {side} View
                  {sideLogosCount > 0 && (
                    <span style={{
                      backgroundColor: "hsl(var(--accent-hsl))",
                      color: "white",
                      fontSize: "0.65rem",
                      fontWeight: 800,
                      borderRadius: "10px",
                      padding: "1px 6px"
                    }}>
                      {sideLogosCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Canvas Viewport */}
      <div
        ref={containerRef}
        style={{
          position: "relative",
          width: "100%",
          height: activeLayout?.canvasH > 0 ? activeLayout.canvasH : 400,
          backgroundColor: "white",
          borderRadius: "var(--radius-lg)",
          border: "1px solid hsl(var(--border-hsl))",
          overflow: "hidden",
          userSelect: "none"
        }}
      >
        {/* Garment Base Silhouette */}
        {activeImageUrl ? (
          <img
            src={activeImageUrl}
            alt="Apparel Silhouette"
            style={{ width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }}
          />
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "hsl(var(--muted-hsl))" }}>
            No garment image available for this view.
          </div>
        )}

        {/* Uploaded Logo Overlays (Render all logos for current side) */}
        {currentSideLogos.map(logo => {
          const l = layoutsMap[logo.id];
          if (!l || l.logoW <= 0) return null;
          const isActive = logo.id === activeLogoId;

          return (
            <div
              key={logo.id}
              onPointerDown={(e) => handlePointerDownLogo(e, logo.id)}
              style={{
                position: "absolute",
                left: l.logoLeft,
                top: l.logoTop,
                width: l.logoW,
                height: l.logoH,
                cursor: dragging && isActive ? "grabbing" : "grab",
                transform: logo.rotationDeg ? `rotate(${logo.rotationDeg}deg)` : undefined,
                touchAction: "none",
                zIndex: isActive ? 10 : 2
              }}
            >
              <img
                src={logo.url}
                alt={logo.name}
                style={{ width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }}
              />

              {/* Dotted active outline & delete quick handle */}
              <div style={{
                position: "absolute",
                top: "-6px",
                left: "-6px",
                right: "-6px",
                bottom: "-6px",
                border: isActive ? "2px solid hsl(var(--accent-hsl))" : "1px dashed rgba(0,0,0,0.4)",
                borderRadius: "4px",
                pointerEvents: "none"
              }}>
                {isActive && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteLogo(logo.id);
                    }}
                    title="Delete Logo"
                    style={{
                      position: "absolute",
                      top: "-12px",
                      right: "-12px",
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      backgroundColor: "#EF4444",
                      color: "white",
                      border: "2px solid white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      pointerEvents: "auto",
                      boxShadow: "0 2px 5px rgba(0,0,0,0.3)"
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Canvas Helper Badges */}
        {currentSideLogos.length > 0 && (
          <div style={{
            position: "absolute",
            top: "0.75rem",
            left: "0.75rem",
            backgroundColor: "rgba(0,0,0,0.65)",
            color: "white",
            fontSize: "0.75rem",
            padding: "0.3rem 0.75rem",
            borderRadius: "40px",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem"
          }}>
            <Move size={12} /> Drag logos to position • Click logo to edit
          </div>
        )}

        {/* Scale Badge */}
        <div style={{
          position: "absolute",
          bottom: "0.75rem",
          right: "0.75rem",
          backgroundColor: isCalibrated ? "rgba(16, 185, 129, 0.9)" : "rgba(245, 158, 11, 0.9)",
          color: "white",
          fontSize: "0.7rem",
          fontWeight: 800,
          padding: "0.3rem 0.65rem",
          borderRadius: "40px",
          display: "flex",
          alignItems: "center",
          gap: "0.3rem"
        }}>
          {isCalibrated ? <Check size={12} /> : <AlertTriangle size={12} />}
          {isCalibrated ? "100% Calibrated True Print Scale" : "Estimated Scale"}
        </div>
      </div>

      {/* Upload Additional Logo Card / Trigger */}
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
        <label className="btn btn-outline" style={{ flex: 1, padding: "0.75rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
          {uploadingLogo ? (
            <Loader2 className="animate-spin" size={18} style={{ color: "hsl(var(--accent-hsl))" }} />
          ) : (
            <Upload size={18} style={{ color: "hsl(var(--accent-hsl))" }} />
          )}
          <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>
            {uploadingLogo ? "Uploading Artwork..." : logos.length === 0 ? "Upload Artwork / Logo" : "+ Add Another Logo"}
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            disabled={uploadingLogo}
            style={{ display: "none" }}
          />
        </label>

        {logos.length > 0 && (
          <button
            type="button"
            onClick={handleClearAllLogos}
            className="btn btn-outline"
            style={{ padding: "0.75rem", color: "#EF4444", borderColor: "#FCA5A5" }}
            title="Clear all logos"
          >
            <Trash2 size={18} /> Clear All
          </button>
        )}
      </div>

      {/* Logo Controls: Sizing, Preset Placement & Deletion for Active Logo */}
      {activeLogo && (
        <div className="card" style={{ padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid hsl(var(--border-hsl))", paddingBottom: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Layers size={16} style={{ color: "hsl(var(--accent-hsl))" }} />
              <span style={{ fontSize: "0.9rem", fontWeight: 800 }}>
                Selected Layer: <span style={{ color: "hsl(var(--accent-hsl))" }}>{activeLogo.name}</span>
              </span>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <button
                type="button"
                onClick={updateActiveLogoRotation}
                className="btn btn-outline"
                style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.25rem" }}
              >
                <RotateCw size={12} /> Rotate
              </button>
              <button
                type="button"
                onClick={() => handleDeleteLogo(activeLogo.id)}
                className="btn btn-outline"
                style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem", color: "#EF4444", borderColor: "#FCA5A5", display: "flex", alignItems: "center", gap: "0.25rem" }}
              >
                <Trash2 size={12} /> Delete Logo
              </button>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>Logo Print Size (Inches)</span>
            <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "hsl(var(--accent-hsl))" }}>
              {activeLogo.sizeIn}" × {activeLogo.sizeIn}"
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <ZoomOut size={16} style={{ color: "hsl(var(--muted-hsl))" }} />
            <input
              type="range"
              min="2"
              max="14"
              step="0.5"
              value={activeLogo.sizeIn || 6}
              onChange={(e) => updateActiveLogoSize(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: "hsl(var(--accent-hsl))" }}
            />
            <ZoomIn size={16} style={{ color: "hsl(var(--muted-hsl))" }} />
          </div>

          {/* Quick Presets */}
          <div>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "hsl(var(--muted-hsl))", display: "block", marginBottom: "0.5rem" }}>
              Quick Preset Placements:
            </span>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {PLACEMENT_PRESETS.filter(p => p.side === selectedSide || p.side === 'both').map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setLogos(prev => prev.map(l => {
                      if (l.id === activeLogo.id) {
                        return {
                          ...l,
                          placement: { positionX: 0.5, positionY: 0.35, offsetXIn: p.offsetXIn, offsetYIn: p.offsetYIn },
                          sizeIn: p.suggestedWidthIn || l.sizeIn
                        };
                      }
                      return l;
                    }));
                  }}
                  className="btn btn-outline"
                  style={{ padding: "0.3rem 0.65rem", fontSize: "0.75rem" }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Uploaded Logos List & Layers Manager */}
      {logos.length > 0 && (
        <div className="card" style={{ padding: "1rem 1.25rem" }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 800, textTransform: "uppercase", color: "hsl(var(--muted-hsl))", display: "block", marginBottom: "0.75rem" }}>
            Attached Artwork Layers ({logos.length})
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {logos.map(logo => {
              const isSelected = logo.id === activeLogoId;
              return (
                <div
                  key={logo.id}
                  onClick={() => {
                    handleSideClick(logo.side);
                    setActiveLogoId(logo.id);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: isSelected ? "hsl(var(--accent-hsl) / 0.1)" : "hsl(var(--secondary-hsl) / 0.3)",
                    border: isSelected ? "1.5px solid hsl(var(--accent-hsl))" : "1px solid hsl(var(--border-hsl))",
                    cursor: "pointer"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <img src={logo.url} alt={logo.name} style={{ width: "32px", height: "32px", objectFit: "contain", borderRadius: "4px", backgroundColor: "white", padding: "2px", border: "1px solid hsl(var(--border-hsl))" }} />
                    <div>
                      <p style={{ fontSize: "0.85rem", fontWeight: 700, margin: 0 }}>{logo.name}</p>
                      <p style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))", margin: 0 }}>
                        Side: <strong style={{ textTransform: "capitalize" }}>{logo.side}</strong> • Size: {logo.sizeIn}"
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteLogo(logo.id);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#EF4444",
                      cursor: "pointer",
                      padding: "4px"
                    }}
                    title="Delete Logo Layer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Minimum Order Quantity (MOQ) Notice & Input */}
      <div style={{
        padding: "0.85rem 1rem",
        backgroundColor: "hsl(var(--secondary-hsl) / 0.3)",
        borderRadius: "var(--radius-md)",
        border: "1px solid hsl(var(--border-hsl))",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div>
          <p style={{ fontSize: "0.85rem", fontWeight: 700 }}>Apparel Minimum Order Quantity (MOQ)</p>
          <p style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))" }}>
            This apparel item requires a minimum order of {effectiveMoq} units.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.85rem", fontWeight: 700 }}>Qty:</label>
          <input
            type="number"
            min={effectiveMoq}
            className="input"
            value={quantity}
            onChange={(e) => handleQtyChange(e.target.value)}
            style={{ width: "80px", textAlign: "center" }}
          />
        </div>
      </div>

      {/* Add to Cart CTA */}
      <button
        type="button"
        onClick={handleAddToCartSubmit}
        className="btn btn-primary"
        style={{ width: "100%", padding: "0.85rem", fontSize: "1rem", marginTop: "0.5rem" }}
      >
        <ShoppingBag size={18} /> Add Apparel Order to Cart {totalPrice > 0 && `($${totalPrice.toFixed(2)} CAD)`}
      </button>
    </div>
  );
}
