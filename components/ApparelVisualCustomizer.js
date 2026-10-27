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
  Crosshair,
  Grid3x3,
  Download,
  Plus,
  Check,
  AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ApparelSizeChartModal from "./ApparelSizeChartModal";
import { computeLayout, resolveScale, placementFromCenter, clampCenter, canvasAspect, resolvePrintAreaBounds } from "@/lib/mockup-geometry";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

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
  initialQuantities = null,
  isAdmin: propIsAdmin = undefined
}) {
  const { user, userData } = useAuth();
  const isAdmin = propIsAdmin !== undefined ? Boolean(propIsAdmin) : Boolean(
    user && (
      userData?.role === "admin" ||
      user.email === "admin@apexworkwear.ca" ||
      user.email === "apexworkwearportal@gmail.com" ||
      user.email?.endsWith("@apexworkwear.ca")
    )
  );

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

  const [selectedSide, setSelectedSide] = useState("front");
  const currentEditingSide = activeSides.includes(selectedSide) ? selectedSide : (activeSides[0] || "front");
  const setCurrentEditingSide = setSelectedSide;

  // Print method and internal production notes
  const [printMethod, setPrintMethod] = useState("screenprint"); // screenprint, embroidery, dtg, vinyl
  const [internalNotes, setInternalNotes] = useState("");

  // Live calibrations per side (override product.views[side].calibration if calibrated in-studio)
  const [liveCalibrations, setLiveCalibrations] = useState(() => {
    const initial = {};
    if (views) {
      Object.keys(views).forEach(side => {
        if (views[side]?.calibration) initial[side] = views[side].calibration;
      });
    }
    return initial;
  });

  const [showGrid, setShowGrid] = useState(false);
  const [exportingMockup, setExportingMockup] = useState(false);

  // Multi-logo state per side: { front: [ { id, label, imageUrl, fileName, widthIn, heightIn, rotationDeg, offsetXIn, offsetYIn, positionX, positionY } ], back: ... }
  const [logosBySide, setLogosBySide] = useState({
    front: [],
    back: [],
    left: [],
    right: []
  });

  const [selectedLogoId, setSelectedLogoId] = useState(null);
  const [uploadingLogoSide, setUploadingLogoSide] = useState(null);
  const fileInputRef = useRef(null);

  // Viewport container width & image aspect ratio
  const containerRef = useRef(null);
  const [containerW, setContainerW] = useState(0);
  const [imgAspectBySide, setImgAspectBySide] = useState({});

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      if (entries[0]) {
        setContainerW(entries[0].contentRect.width);
      }
    });
    ro.observe(el);
    setContainerW(el.clientWidth);
    return () => ro.disconnect();
  }, [step, currentEditingSide]);

  // Active garment view data
  const currentViewData = views[currentEditingSide] || views.front || Object.values(views)[0] || {};

  // Color-specific picture resolution:
  // If the customer selected a color and that color has a picture for this view (front, back, etc.), use it!
  // Otherwise fall back to the main garment view image.
  const selectedColorView = selectedColor?.views?.[currentEditingSide];
  const colorSpecificImg = selectedColorView?.image;
  const currentGarmentImg = colorSpecificImg || currentViewData.image || product.images?.[0] || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=800";

  // Calibration resolution:
  // 1. If this specific color picture has a custom override calibration, use it.
  // 2. Otherwise, inherit the main garment calibration (liveCalibrations or currentViewData.calibration).
  const isColorCalibrated = Boolean(selectedColorView?.calibration?.isCalibrated);
  const mainCalibration = liveCalibrations[currentEditingSide] || currentViewData.calibration || null;
  const currentCalibration = isColorCalibrated ? selectedColorView.calibration : mainCalibration;
  const currentAspect = imgAspectBySide[`${selectedColor?.name || 'def'}-${currentEditingSide}`] || imgAspectBySide[currentEditingSide] || 1.1;

  // Available view sides across product.garmentViews, selectedColor.views, and activeSides
  const availableViewSides = useMemo(() => {
    const set = new Set();
    Object.keys(views).forEach(k => {
      if (views[k]?.image) set.add(k);
    });
    if (selectedColor?.views) {
      Object.keys(selectedColor.views).forEach(k => {
        if (selectedColor.views[k]?.image) set.add(k);
      });
    }
    activeSides.forEach(s => set.add(s));
    if (set.size === 0) set.add("front");
    return Array.from(set);
  }, [views, selectedColor, activeSides]);

  const currentLogos = useMemo(() => logosBySide[currentEditingSide] || [], [logosBySide, currentEditingSide]);
  const selectedLogo = currentLogos.find(l => l.id === selectedLogoId) || currentLogos[0] || null;

  // Sizing fallback measurements
  const fallbackApparelWidthIn = 22; // Medium chest
  const fallbackApparelHeightIn = 28.5; // Medium body length

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

  // True scale layouts for current side
  const layouts = useMemo(() => {
    const out = {};
    for (const logo of currentLogos) {
      out[logo.id] = computeLayout({
        canvasW: containerW,
        image: currentCalibration,
        fallbackApparelWidthIn,
        fallbackApparelHeightIn,
        logoWidthIn: logo.widthIn || 6,
        logoHeightIn: logo.heightIn || 5,
        placement: {
          positionX: logo.positionX !== undefined ? logo.positionX : 0.5,
          positionY: logo.positionY !== undefined ? logo.positionY : 0.35,
          offsetXIn: logo.offsetXIn !== undefined ? logo.offsetXIn : 0,
          offsetYIn: logo.offsetYIn !== undefined ? logo.offsetYIn : 8,
        }
      });
    }
    return out;
  }, [currentLogos, containerW, currentCalibration]);

  // Base canvas layout for scale indicators and ruler
  const canvasMeta = useMemo(() => {
    return computeLayout({
      canvasW: containerW,
      image: currentCalibration,
      fallbackApparelWidthIn,
      fallbackApparelHeightIn,
      logoWidthIn: 0,
      logoHeightIn: 0,
      placement: { positionX: 0.5, positionY: 0.25 }
    });
  }, [containerW, currentCalibration]);

  const canvasH = containerW > 0 ? containerW * currentAspect : 500;
  const unitsPerInch = canvasMeta.unitsPerInch || (containerW > 0 ? containerW / 22 : 0);
  const isTrueToScale = canvasMeta.isTrueToScale;

  // Printable area bounds on active canvas (if calibrated view has restricted box)
  const printAreaBounds = useMemo(() => {
    if (!currentCalibration?.hasPrintArea || !currentCalibration?.printArea || containerW <= 0) return null;
    return resolvePrintAreaBounds(currentCalibration.printArea, containerW, canvasH);
  }, [currentCalibration, containerW, canvasH]);

  // Max artwork size limit (if configured on this garment side)
  const maxAllowedLogoSizeIn = useMemo(() => {
    if (currentCalibration?.hasMaxLogoSize && currentCalibration?.maxLogoSizeIn > 0) {
      return parseFloat(currentCalibration.maxLogoSizeIn);
    }
    return null;
  }, [currentCalibration]);

  const [sizeWarning, setSizeWarning] = useState("");

  // Garment measured dimensions
  const garmentMeasuredW = currentCalibration?.garmentWidthIn || fallbackApparelWidthIn;
  const garmentMeasuredH = currentCalibration?.garmentHeightIn || fallbackApparelHeightIn;
  const garmentCalSize = currentCalibration?.calSize || "M";

  // Dragging logic on canvas
  const [draggingLogoId, setDraggingLogoId] = useState(null);
  const dragRef = useRef({ id: "", mouseX: 0, mouseY: 0, startCX: 0, startCY: 0 });

  const handleLogoPointerDown = (e, logo) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedLogoId(logo.id);
    const l = layouts[logo.id];
    if (!l) return;
    setDraggingLogoId(logo.id);
    dragRef.current = {
      id: logo.id,
      mouseX: e.clientX,
      mouseY: e.clientY,
      startCX: l.logoLeft + l.logoW / 2,
      startCY: l.logoTop + l.logoH / 2,
    };
  };

  useEffect(() => {
    if (!draggingLogoId || containerW === 0) return;

    const onMove = (e) => {
      e.preventDefault();
      const { id, mouseX, mouseY, startCX, startCY } = dragRef.current;
      const l = layouts[id];
      if (!l) return;

      const newCX = startCX + (e.clientX - mouseX);
      const newCY = startCY + (e.clientY - mouseY);
      const clamped = clampCenter(newCX, newCY, l, printAreaBounds);
      const nextPlacement = placementFromCenter(clamped.x, clamped.y, l);

      setLogosBySide(prev => {
        const sideList = prev[currentEditingSide] || [];
        return {
          ...prev,
          [currentEditingSide]: sideList.map(item => {
            if (item.id === id) {
              return {
                ...item,
                positionX: nextPlacement.positionX,
                positionY: nextPlacement.positionY,
                offsetXIn: nextPlacement.offsetXIn != null ? Math.round(nextPlacement.offsetXIn * 100) / 100 : item.offsetXIn,
                offsetYIn: nextPlacement.offsetYIn != null ? Math.round(nextPlacement.offsetYIn * 100) / 100 : item.offsetYIn,
              };
            }
            return item;
          })
        };
      });
    };

    const onUp = () => {
      setDraggingLogoId(null);
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [draggingLogoId, containerW, layouts, currentEditingSide, printAreaBounds]);

  // Apply placement preset (Left Chest, Centre Chest, etc.)
  const applyPresetOffsets = (offsetXIn, offsetYIn, suggestedWidthIn) => {
    if (!selectedLogo) return;
    setLogosBySide(prev => {
      const sideList = prev[currentEditingSide] || [];
      return {
        ...prev,
        [currentEditingSide]: sideList.map(item => {
          if (item.id === selectedLogo.id) {
            const patch = {
              ...item,
              offsetXIn: Math.round(offsetXIn * 100) / 100,
              offsetYIn: Math.round(offsetYIn * 100) / 100,
            };
            if (suggestedWidthIn && item.widthIn && item.heightIn) {
              const effectiveW = maxAllowedLogoSizeIn ? Math.min(suggestedWidthIn, maxAllowedLogoSizeIn) : suggestedWidthIn;
              const ratio = item.heightIn / item.widthIn;
              patch.widthIn = effectiveW;
              patch.heightIn = Math.round(effectiveW * ratio * 100) / 100;
            }
            return patch;
          }
          return item;
        })
      };
    });
  };

  // Update offset in inches directly
  const handleOffsetChange = (field, val) => {
    if (!selectedLogo) return;
    const num = parseFloat(val) || 0;
    setLogosBySide(prev => {
      const sideList = prev[currentEditingSide] || [];
      return {
        ...prev,
        [currentEditingSide]: sideList.map(item => {
          if (item.id === selectedLogo.id) {
            return {
              ...item,
              [field]: num
            };
          }
          return item;
        })
      };
    });
  };

  // Add a new logo to the current side
  const handleAddLogoFile = async (file) => {
    if (!file) return;
    setUploadingLogoSide(currentEditingSide);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload logo.");

      // Calculate initial dimensions based on image aspect ratio
      const img = new Image();
      img.src = data.url;
      await new Promise(r => { img.onload = r; img.onerror = r; });
      const aspect = (img.naturalHeight && img.naturalWidth) ? (img.naturalHeight / img.naturalWidth) : 0.833;

      const initialBaseW = maxAllowedLogoSizeIn ? Math.min(6, maxAllowedLogoSizeIn) : 6;
      const baseWidthIn = initialBaseW;
      let baseHeightIn = Math.round(baseWidthIn * aspect * 10) / 10 || 5;
      if (maxAllowedLogoSizeIn && baseHeightIn > maxAllowedLogoSizeIn) {
        baseHeightIn = maxAllowedLogoSizeIn;
      }

      const currentList = logosBySide[currentEditingSide] || [];
      const newLogo = {
        id: `logo-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        label: `Logo ${currentList.length + 1}`,
        imageUrl: data.url,
        fileName: file.name,
        widthIn: baseWidthIn,
        heightIn: baseHeightIn,
        rotationDeg: 0,
        positionX: 0.5,
        positionY: 0.35,
        offsetXIn: 0,
        offsetYIn: 7.99
      };

      setLogosBySide(prev => ({
        ...prev,
        [currentEditingSide]: [...(prev[currentEditingSide] || []), newLogo]
      }));
      setSelectedLogoId(newLogo.id);
    } catch (err) {
      alert("Error adding logo: " + err.message);
    } finally {
      setUploadingLogoSide(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Update logo properties with maximum allowed size validation
  const handleUpdateLogo = (logoId, patch) => {
    if (maxAllowedLogoSizeIn) {
      if (patch.widthIn !== undefined && patch.widthIn > maxAllowedLogoSizeIn) {
        patch.widthIn = maxAllowedLogoSizeIn;
        setSizeWarning(`Maximum logo size limit is ${maxAllowedLogoSizeIn}" for this garment view. Artwork constrained to ${maxAllowedLogoSizeIn}".`);
      } else if (patch.heightIn !== undefined && patch.heightIn > maxAllowedLogoSizeIn) {
        patch.heightIn = maxAllowedLogoSizeIn;
        setSizeWarning(`Maximum logo size limit is ${maxAllowedLogoSizeIn}" for this garment view. Artwork constrained to ${maxAllowedLogoSizeIn}".`);
      } else {
        setSizeWarning("");
      }
    }

    setLogosBySide(prev => {
      const sideList = prev[currentEditingSide] || [];
      return {
        ...prev,
        [currentEditingSide]: sideList.map(item => {
          if (item.id === logoId) {
            return { ...item, ...patch };
          }
          return item;
        })
      };
    });
  };

  // Remove a logo
  const handleRemoveLogo = (logoId) => {
    setLogosBySide(prev => {
      const sideList = prev[currentEditingSide] || [];
      const nextList = sideList.filter(item => item.id !== logoId);
      return {
        ...prev,
        [currentEditingSide]: nextList
      };
    });
    if (selectedLogoId === logoId) {
      const remaining = (logosBySide[currentEditingSide] || []).filter(l => l.id !== logoId);
      setSelectedLogoId(remaining[0]?.id || null);
    }
  };

  // Export full-res composite mockup PNG
  const handleExportMockup = async () => {
    if (!currentGarmentImg || currentLogos.length === 0) return;
    setExportingMockup(true);

    try {
      const load = (src) => new Promise((res, rej) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = src;
      });

      const garmentImg = await load(currentGarmentImg);
      const logoImgs = await Promise.all(currentLogos.map(l => load(l.imageUrl)));

      const exportW = garmentImg.naturalWidth || 1600;
      const exportH = exportW * (garmentImg.naturalHeight / garmentImg.naturalWidth || currentAspect);

      const canvasEl = document.createElement("canvas");
      canvasEl.width = Math.round(exportW);
      canvasEl.height = Math.round(exportH);
      const ctx = canvasEl.getContext("2d");

      // Draw garment
      ctx.drawImage(garmentImg, 0, 0, canvasEl.width, canvasEl.height);

      // Draw logos at true scale
      currentLogos.forEach((logo, i) => {
        const ex = computeLayout({
          canvasW: exportW,
          image: currentCalibration,
          fallbackApparelWidthIn,
          fallbackApparelHeightIn,
          logoWidthIn: logo.widthIn,
          logoHeightIn: logo.heightIn,
          placement: {
            positionX: logo.positionX,
            positionY: logo.positionY,
            offsetXIn: logo.offsetXIn,
            offsetYIn: logo.offsetYIn
          }
        });

        const angle = ((logo.rotationDeg || 0) * Math.PI) / 180;
        ctx.save();
        if (angle) {
          ctx.translate(ex.logoLeft + ex.logoW / 2, ex.logoTop + ex.logoH / 2);
          ctx.rotate(angle);
          ctx.translate(-(ex.logoLeft + ex.logoW / 2), -(ex.logoTop + ex.logoH / 2));
        }
        ctx.drawImage(logoImgs[i], ex.logoLeft, ex.logoTop, ex.logoW, ex.logoH);
        ctx.restore();
      });

      const a = document.createElement("a");
      a.download = `${product.name.replace(/\s+/g, "_")}_${currentEditingSide}_mockup.png`;
      a.href = canvasEl.toDataURL("image/png");
      a.click();
    } catch (err) {
      alert("Error exporting mockup: " + err.message);
    } finally {
      setExportingMockup(false);
    }
  };

  // High-accuracy canvas composite snapshot generator for cart submission
  const generateSideMockupSnapshot = async (sideKey) => {
    const viewData = views[sideKey] || Object.values(views)[0];
    const colorView = selectedColor?.views?.[sideKey];
    const garmentImgSrc = colorView?.image || viewData?.image || product.images?.[0] || "";
    const sideLogos = logosBySide[sideKey] || [];
    const sideCalib = (colorView?.calibration?.isCalibrated ? colorView.calibration : null) || liveCalibrations[sideKey] || viewData?.calibration || null;

    if (!garmentImgSrc) return "";

    return new Promise((resolve) => {
      const garmentImg = new Image();
      garmentImg.crossOrigin = "anonymous";
      garmentImg.onload = async () => {
        const canvas = document.createElement("canvas");
        const exportW = garmentImg.naturalWidth || 1400;
        const exportH = garmentImg.naturalHeight || 1400;
        canvas.width = exportW;
        canvas.height = exportH;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(garmentImg, 0, 0, exportW, exportH);

        for (const logo of sideLogos) {
          try {
            const logoImg = new Image();
            logoImg.crossOrigin = "anonymous";
            await new Promise((res, rej) => {
              logoImg.onload = res;
              logoImg.onerror = rej;
              logoImg.src = logo.imageUrl;
            });

            const ex = computeLayout({
              canvasW: exportW,
              image: sideCalib,
              fallbackApparelWidthIn,
              fallbackApparelHeightIn,
              logoWidthIn: logo.widthIn,
              logoHeightIn: logo.heightIn,
              placement: {
                positionX: logo.positionX,
                positionY: logo.positionY,
                offsetXIn: logo.offsetXIn,
                offsetYIn: logo.offsetYIn
              }
            });

            const angle = ((logo.rotationDeg || 0) * Math.PI) / 180;
            ctx.save();
            if (angle) {
              ctx.translate(ex.logoLeft + ex.logoW / 2, ex.logoTop + ex.logoH / 2);
              ctx.rotate(angle);
              ctx.translate(-(ex.logoLeft + ex.logoW / 2), -(ex.logoTop + ex.logoH / 2));
            }
            ctx.drawImage(logoImg, ex.logoLeft, ex.logoTop, ex.logoW, ex.logoH);
            ctx.restore();
          } catch (e) {
            console.error("Failed to draw logo on snapshot:", e);
          }
        }

        resolve(canvas.toDataURL("image/png", 0.9));
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
        const sideLogos = logosBySide[side] || [];
        sideLogos.forEach(logo => {
          artworkFiles.push({
            name: logo.label || `${side.toUpperCase()} Logo`,
            url: logo.imageUrl,
            side: side,
            widthIn: logo.widthIn || 6,
            heightIn: logo.heightIn || 5,
            rotationDeg: logo.rotationDeg || 0,
            placement: {
              offsetXIn: logo.offsetXIn,
              offsetYIn: logo.offsetYIn,
              positionX: logo.positionX,
              positionY: logo.positionY
            }
          });
        });
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
        printMethod: printMethod,
        internalNotes: internalNotes,
        optionSummary: optionSummaryText,
        
        // Visual placements & raw artwork for manufacturing
        artworkFiles,
        mockupSnapshots,
        placementMetadata: logosBySide
      };

      onAddToCart(cartPayload);
    } catch (err) {
      console.error("Failed to add apparel to cart:", err);
      alert("Error preparing order: " + err.message);
    } finally {
      setSubmittingToCart(false);
    }
  };

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
                {availableViewSides.map((sideKey) => (
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

      {/* STEP 2: Interactive True-Scale Logo Placement & Live Proof */}
      {step === 2 && (
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "2.5rem" }}
          className="apparel-step-grid"
        >
          {/* Left Column: Interactive True-Scale Garment Viewport & Placement Controls */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            
            {/* Side Tabs for active print locations & Live Garment Color Switcher */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #E2E8F0", paddingBottom: "0.5rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {activeSides.map((sideKey) => {
                  const isCurrent = currentEditingSide === sideKey;
                  const sideLogosCount = (logosBySide[sideKey] || []).length;
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
                      {sideLogosCount > 0 && (
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: isCurrent ? "#FFFFFF" : "#10B981" }} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Quick Color Switcher in Step 2 */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748B" }}>Color:</span>
                <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#0F172A", marginRight: "0.2rem" }}>{selectedColor.name}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", flexWrap: "wrap" }}>
                  {availableColors.map((col, idx) => (
                    <button
                      key={idx}
                      type="button"
                      title={col.name}
                      onClick={() => setSelectedColor(col)}
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "50%",
                        backgroundColor: col.hex,
                        border: selectedColor.name === col.name ? "2px solid #2563EB" : "1px solid rgba(0,0,0,0.2)",
                        outline: selectedColor.name === col.name ? "2px solid #93C5FD" : "none",
                        cursor: "pointer",
                        padding: 0
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Interactive True-Scale Viewport Container */}
            <div
              ref={containerRef}
              style={{
                position: "relative",
                width: "100%",
                height: canvasH > 0 ? `${canvasH}px` : "500px",
                backgroundColor: "#FFFFFF",
                borderRadius: "16px",
                border: "2px solid #E2E8F0",
                overflow: "hidden",
                boxShadow: "0 10px 25px -5px rgba(0,0,0,0.06)",
                userSelect: "none",
                touchAction: "none"
              }}
            >
              {/* Garment Base Image at Natural Aspect Ratio */}
              <img
                src={currentGarmentImg}
                alt="Garment Preview"
                onLoad={(e) => {
                  if (e.target.naturalWidth && e.target.naturalHeight) {
                    const aspect = e.target.naturalHeight / e.target.naturalWidth;
                    setImgAspectBySide(prev => ({ ...prev, [currentEditingSide]: aspect }));
                  }
                }}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  padding: "1.5rem",
                  pointerEvents: "none"
                }}
              />

              {/* 1" Grid Overlay */}
              {showGrid && unitsPerInch > 4 && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    backgroundImage:
                      `repeating-linear-gradient(0deg, rgba(37,99,235,0.22) 0 1px, transparent 1px ${unitsPerInch}px),` +
                      `repeating-linear-gradient(90deg, rgba(37,99,235,0.22) 0 1px, transparent 1px ${unitsPerInch}px)`
                  }}
                />
              )}

              {/* Restricted Printable Area Box Overlay */}
              {printAreaBounds && (
                <div
                  style={{
                    position: "absolute",
                    left: `${printAreaBounds.left}px`,
                    top: `${printAreaBounds.top}px`,
                    width: `${printAreaBounds.width}px`,
                    height: `${printAreaBounds.height}px`,
                    border: "2px dashed #2563EB",
                    backgroundColor: "rgba(37, 99, 235, 0.04)",
                    borderRadius: "6px",
                    pointerEvents: "none",
                    zIndex: 4
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: "6px",
                      left: "8px",
                      backgroundColor: "rgba(37, 99, 235, 0.88)",
                      color: "#FFFFFF",
                      fontSize: "10px",
                      fontWeight: 800,
                      padding: "2px 7px",
                      borderRadius: "4px",
                      letterSpacing: "0.02em",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.15)"
                    }}
                  >
                    Printable Area{currentCalibration?.printArea?.widthIn ? ` (${currentCalibration.printArea.widthIn}" × ${currentCalibration.printArea.heightIn}")` : ""}
                  </span>
                </div>
              )}

              {/* Positioned Logos Layer */}
              {containerW > 0 && currentLogos.map((logo, idx) => {
                const l = layouts[logo.id];
                if (!l || l.logoW <= 0) return null;
                const isSelected = selectedLogo?.id === logo.id;
                const isDragging = draggingLogoId === logo.id;

                return (
                  <div
                    key={logo.id}
                    onPointerDown={(e) => handleLogoPointerDown(e, logo)}
                    style={{
                      position: "absolute",
                      left: `${l.logoLeft}px`,
                      top: `${l.logoTop}px`,
                      width: `${l.logoW}px`,
                      height: `${l.logoH}px`,
                      transform: logo.rotationDeg ? `rotate(${logo.rotationDeg}deg)` : undefined,
                      cursor: isDragging ? "grabbing" : "grab",
                      zIndex: isSelected ? 20 : 10,
                      touchAction: "none"
                    }}
                  >
                    <img
                      src={logo.imageUrl}
                      alt={logo.label || `Logo ${idx + 1}`}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        pointerEvents: "none",
                        userSelect: "none"
                      }}
                    />

                    {/* Active/Inactive selection boundary */}
                    <div
                      style={{
                        position: "absolute",
                        inset: "-3px",
                        borderRadius: "4px",
                        border: isSelected ? "2px dashed #2563EB" : "1.5px dashed rgba(148,163,184,0.6)",
                        pointerEvents: "none",
                        opacity: isDragging ? 0.3 : 1,
                        transition: "opacity 0.15s ease"
                      }}
                    />

                    {/* Numbered Badge */}
                    <span
                      style={{
                        position: "absolute",
                        top: "-8px",
                        left: "-8px",
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        backgroundColor: isSelected ? "#2563EB" : "#475569",
                        color: "#FFFFFF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "10px",
                        fontWeight: 800,
                        pointerEvents: "none",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                      }}
                    >
                      {idx + 1}
                    </span>
                  </div>
                );
              })}

              {/* Floating Top-Left "Drag logo to place" Badge */}
              {containerW > 0 && currentLogos.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "12px",
                    left: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    backgroundColor: "rgba(15,23,42,0.68)",
                    color: "#FFFFFF",
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "5px 12px",
                    borderRadius: "999px",
                    backdropFilter: "blur(4px)",
                    pointerEvents: "none"
                  }}
                >
                  <Move size={12} />
                  <span>{currentLogos.length > 1 ? "Drag any logo to place" : "Drag logo to place"}</span>
                </div>
              )}

              {/* Empty state pill */}
              {containerW > 0 && currentLogos.length === 0 && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "20px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    backgroundColor: "rgba(15,23,42,0.7)",
                    color: "#FFFFFF",
                    fontSize: "12px",
                    fontWeight: 600,
                    padding: "6px 14px",
                    borderRadius: "999px",
                    backdropFilter: "blur(4px)",
                    pointerEvents: "none"
                  }}
                >
                  No artwork on this side yet — click &ldquo;+ Add another logo&rdquo;
                </div>
              )}

              {/* Bottom-Left 6-Inch Ruler */}
              {unitsPerInch > 6 && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "12px",
                    left: "12px",
                    pointerEvents: "none"
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-end",
                      height: "22px",
                      width: `${unitsPerInch * 6}px`,
                      backgroundColor: "rgba(255,255,255,0.9)",
                      borderRadius: "4px",
                      padding: "0 2px",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
                      border: "1px solid #CBD5E1"
                    }}
                  >
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          borderLeft: "1px solid #1E293B",
                          height: "100%",
                          position: "relative"
                        }}
                      >
                        <span style={{ position: "absolute", top: "-1px", left: "2px", fontSize: "9px", fontWeight: 700, color: "#1E293B" }}>
                          {i}&quot;
                        </span>
                      </div>
                    ))}
                    <div style={{ borderLeft: "1px solid #1E293B", height: "100%" }} />
                  </div>
                </div>
              )}

              {/* Bottom-Right Scale Indicator Badge */}
              {unitsPerInch > 0 && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "12px",
                    right: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    backgroundColor: isTrueToScale ? "#10B981" : "#F59E0B",
                    color: "#FFFFFF",
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "5px 12px",
                    borderRadius: "999px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                    pointerEvents: "none"
                  }}
                >
                  <Ruler size={13} />
                  <span>{isTrueToScale ? "True to scale" : "Estimated scale"}</span>
                  <span style={{ opacity: 0.6 }}>·</span>
                  <span>{printMethod === "screenprint" ? "Screen Print" : printMethod === "embroidery" ? "Embroidery" : printMethod === "dtg" ? "DTG" : "Vinyl"}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Artwork Card & Placement Card */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            
            {/* 1. Artwork Card - Exact Replica of Screenshot 3 */}
            <div
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "14px",
                border: "1px solid #E2E8F0",
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 800, margin: 0, color: "#0F172A" }}>
                  {currentEditingSide.charAt(0).toUpperCase() + currentEditingSide.slice(1)} Artwork
                </h3>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  {maxAllowedLogoSizeIn && (
                    <span style={{ fontSize: "0.72rem", backgroundColor: "#FEF3C7", color: "#92400E", border: "1px solid #FCD34D", padding: "2px 8px", borderRadius: "100px", fontWeight: 700 }}>
                      Max Size: {maxAllowedLogoSizeIn}&quot;
                    </span>
                  )}
                  <span style={{ fontSize: "0.8rem", color: "#64748B", fontWeight: 500 }}>
                    {currentLogos.length} logo{currentLogos.length === 1 ? "" : "s"}
                  </span>
                </div>
              </div>

              {/* Maximum Size Limit Alert */}
              {sizeWarning && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.6rem 0.85rem",
                  backgroundColor: "#FEF2F2",
                  border: "1px solid #FCA5A5",
                  borderRadius: "8px",
                  color: "#B91C1C",
                  fontSize: "0.8rem",
                  fontWeight: 600
                }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                  <span>{sizeWarning}</span>
                </div>
              )}

              {/* Logos List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {currentLogos.map((logo, idx) => {
                  const isSelected = selectedLogo?.id === logo.id;

                  return (
                    <div
                      key={logo.id}
                      onClick={() => setSelectedLogoId(logo.id)}
                      style={{
                        borderRadius: "12px",
                        border: isSelected ? "2px solid #3B82F6" : "1px solid #E2E8F0",
                        backgroundColor: isSelected ? "#EFF6FF" : "#FFFFFF",
                        padding: "0.85rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.6rem",
                        cursor: "pointer",
                        transition: "all 0.15s ease"
                      }}
                    >
                      {/* Top Row: Badge, Name, Trash */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1 }}>
                          <span
                            style={{
                              width: "20px",
                              height: "20px",
                              borderRadius: "50%",
                              backgroundColor: "#2563EB",
                              color: "#FFFFFF",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "11px",
                              fontWeight: 800,
                              flexShrink: 0
                            }}
                          >
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            value={logo.label || `Logo ${idx + 1}`}
                            onChange={(e) => handleUpdateLogo(logo.id, { label: e.target.value })}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              border: "none",
                              backgroundColor: "transparent",
                              fontWeight: 700,
                              fontSize: "0.9rem",
                              color: "#0F172A",
                              outline: "none",
                              width: "100%"
                            }}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveLogo(logo.id);
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#94A3B8",
                            cursor: "pointer",
                            padding: "0.2rem",
                            display: "flex",
                            alignItems: "center"
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Bottom Row: Thumbnail + 3 Pill Number Fields */}
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }} onClick={(e) => e.stopPropagation()}>
                        {/* Square Thumbnail */}
                        <div
                          style={{
                            width: "50px",
                            height: "50px",
                            borderRadius: "8px",
                            border: "1px solid #CBD5E1",
                            backgroundColor: "#FFFFFF",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "hidden",
                            flexShrink: 0
                          }}
                        >
                          <img
                            src={logo.imageUrl}
                            alt="thumb"
                            style={{ width: "100%", height: "100%", objectFit: "contain", padding: "2px" }}
                          />
                        </div>

                        {/* 3 Number Fields: W", H", ROTATE */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.4rem", flex: 1 }}>
                          {/* Width */}
                          <label style={{ display: "flex", flexDirection: "column", gap: "0.15rem", textAlign: "center" }}>
                            <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#64748B" }}>
                              W&quot;{maxAllowedLogoSizeIn ? ` (≤${maxAllowedLogoSizeIn}&quot;)` : ""}
                            </span>
                            <input
                              type="number"
                              step="0.25"
                              min="0.5"
                              max={maxAllowedLogoSizeIn || undefined}
                              value={logo.widthIn}
                              onChange={(e) => handleUpdateLogo(logo.id, { widthIn: parseFloat(e.target.value) || 0 })}
                              style={{
                                height: "30px",
                                width: "100%",
                                borderRadius: "6px",
                                border: "1px solid #CBD5E1",
                                backgroundColor: "#FFFFFF",
                                textAlign: "center",
                                fontWeight: 700,
                                fontSize: "0.85rem",
                                color: "#0F172A"
                              }}
                            />
                          </label>

                          {/* Height */}
                          <label style={{ display: "flex", flexDirection: "column", gap: "0.15rem", textAlign: "center" }}>
                            <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#64748B" }}>
                              H&quot;{maxAllowedLogoSizeIn ? ` (≤${maxAllowedLogoSizeIn}&quot;)` : ""}
                            </span>
                            <input
                              type="number"
                              step="0.25"
                              min="0.5"
                              max={maxAllowedLogoSizeIn || undefined}
                              value={logo.heightIn}
                              onChange={(e) => handleUpdateLogo(logo.id, { heightIn: parseFloat(e.target.value) || 0 })}
                              style={{
                                height: "30px",
                                width: "100%",
                                borderRadius: "6px",
                                border: "1px solid #CBD5E1",
                                backgroundColor: "#FFFFFF",
                                textAlign: "center",
                                fontWeight: 700,
                                fontSize: "0.85rem",
                                color: "#0F172A"
                              }}
                            />
                          </label>

                          {/* Rotate */}
                          <label style={{ display: "flex", flexDirection: "column", gap: "0.15rem", textAlign: "center" }}>
                            <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#64748B", display: "flex", alignItems: "center", justifyContent: "center", gap: "2px" }}>
                              ROTATE ↻
                            </span>
                            <input
                              type="number"
                              step="1"
                              value={logo.rotationDeg || 0}
                              onChange={(e) => handleUpdateLogo(logo.id, { rotationDeg: parseInt(e.target.value) || 0 })}
                              style={{
                                height: "30px",
                                width: "100%",
                                borderRadius: "6px",
                                border: "1px solid #CBD5E1",
                                backgroundColor: "#FFFFFF",
                                textAlign: "center",
                                fontWeight: 700,
                                fontSize: "0.85rem",
                                color: "#0F172A"
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Another Logo Button */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,application/pdf"
                style={{ display: "none" }}
                onChange={(e) => handleAddLogoFile(e.target.files[0])}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!!uploadingLogoSide}
                style={{
                  width: "100%",
                  padding: "0.65rem",
                  borderRadius: "999px",
                  border: "1px solid #CBD5E1",
                  backgroundColor: "#FFFFFF",
                  color: "#0F172A",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.4rem",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                }}
              >
                {uploadingLogoSide ? (
                  <>
                    <Loader2 size={16} className="animate-spin" style={{ color: "#2563EB" }} />
                    <span>Uploading artwork...</span>
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    <span>Add {currentLogos.length > 0 ? "another " : ""}logo</span>
                  </>
                )}
              </button>
            </div>

            {/* 2. Placement (from collar) Card - Positioned Directly Below Artwork */}
            <div
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "14px",
                border: "1px solid #E2E8F0",
                padding: "1rem 1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.85rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
              }}
            >
              {/* Card Title & 1" Grid Toggle */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0F172A" }}>
                  Placement (from collar)
                  {selectedLogo && currentLogos.length > 1 && (
                    <span style={{ color: "#64748B", fontWeight: 500, marginLeft: "0.4rem" }}>
                      — {selectedLogo.label || "Selected Logo"}
                    </span>
                  )}
                </span>

                <button
                  type="button"
                  onClick={() => setShowGrid(prev => !prev)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    padding: "0.3rem 0.65rem",
                    borderRadius: "999px",
                    border: showGrid ? "1px solid #2563EB" : "1px solid #CBD5E1",
                    backgroundColor: showGrid ? "#EFF6FF" : "#FFFFFF",
                    color: showGrid ? "#2563EB" : "#64748B",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                >
                  <Grid3x3 size={13} />
                  <span>1&quot; grid</span>
                </button>
              </div>

              {/* Placement Presets (Left Chest, Right Chest, Centre Chest, Full Front, Jumbo Front) */}
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                {currentEditingSide === "front" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => applyPresetOffsets(-3.5, 8, 4)}
                      style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem", fontWeight: 600, borderRadius: "6px", border: "1px solid #CBD5E1", backgroundColor: "#FFFFFF", color: "#334155", cursor: "pointer" }}
                    >
                      Left Chest
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetOffsets(3.5, 8, 4)}
                      style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem", fontWeight: 600, borderRadius: "6px", border: "1px solid #CBD5E1", backgroundColor: "#FFFFFF", color: "#334155", cursor: "pointer" }}
                    >
                      Right Chest
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetOffsets(0, 8, 10)}
                      style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem", fontWeight: 600, borderRadius: "6px", border: "1px solid #CBD5E1", backgroundColor: "#FFFFFF", color: "#334155", cursor: "pointer" }}
                    >
                      Centre Chest
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetOffsets(0, 10, 11)}
                      style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem", fontWeight: 600, borderRadius: "6px", border: "1px solid #CBD5E1", backgroundColor: "#FFFFFF", color: "#334155", cursor: "pointer" }}
                    >
                      Full Front
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetOffsets(0, 12, 14)}
                      style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem", fontWeight: 600, borderRadius: "6px", border: "1px solid #CBD5E1", backgroundColor: "#FFFFFF", color: "#334155", cursor: "pointer" }}
                    >
                      Jumbo Front
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => applyPresetOffsets(0, 3, 11)}
                      style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem", fontWeight: 600, borderRadius: "6px", border: "1px solid #CBD5E1", backgroundColor: "#FFFFFF", color: "#334155", cursor: "pointer" }}
                    >
                      Back Yoke
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetOffsets(0, 10, 12)}
                      style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem", fontWeight: 600, borderRadius: "6px", border: "1px solid #CBD5E1", backgroundColor: "#FFFFFF", color: "#334155", cursor: "pointer" }}
                    >
                      Full Back
                    </button>
                  </>
                )}
              </div>

              {/* Exact Inch Coordinates Inputs */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "#64748B", fontWeight: 600 }}>
                  <span style={{ whiteSpace: "nowrap" }}>From centre</span>
                  <input
                    type="number"
                    step="0.25"
                    value={selectedLogo?.offsetXIn !== undefined ? selectedLogo.offsetXIn : 0}
                    onChange={(e) => handleOffsetChange("offsetXIn", e.target.value)}
                    style={{
                      width: "100%",
                      height: "32px",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E1",
                      padding: "0 0.5rem",
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      color: "#0F172A",
                      textAlign: "center"
                    }}
                  />
                  <span>&quot;</span>
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "#64748B", fontWeight: 600 }}>
                  <span style={{ whiteSpace: "nowrap" }}>Below collar</span>
                  <input
                    type="number"
                    step="0.25"
                    value={selectedLogo?.offsetYIn !== undefined ? selectedLogo.offsetYIn : 8}
                    onChange={(e) => handleOffsetChange("offsetYIn", e.target.value)}
                    style={{
                      width: "100%",
                      height: "32px",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E1",
                      padding: "0 0.5rem",
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      color: "#0F172A",
                      textAlign: "center"
                    }}
                  />
                  <span>&quot;</span>
                </label>
              </div>

              {/* Measurement Info & Actions Bar */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", borderTop: "1px solid #F1F5F9", paddingTop: "0.75rem" }}>
                <div style={{ fontSize: "0.78rem", color: "#475569" }}>
                  <span style={{ fontWeight: 700, color: "#0F172A" }}>
                    Logo at print size:
                  </span>{" "}
                  {selectedLogo ? `${selectedLogo.widthIn || 6}" × ${selectedLogo.heightIn || 5}"` : "—"}
                  {maxAllowedLogoSizeIn && (
                    <span style={{ color: "#2563EB", fontWeight: 700, marginLeft: "0.5rem" }}>
                      (Max allowed: {maxAllowedLogoSizeIn}&quot;)
                    </span>
                  )}
                  {printAreaBounds && currentCalibration?.printArea && (
                    <span style={{ color: "#64748B", fontWeight: 600, marginLeft: "0.5rem" }}>
                      · Restricted to {currentCalibration.printArea.widthIn}&quot; × {currentCalibration.printArea.heightIn}&quot; box
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={handleExportMockup}
                    disabled={exportingMockup || currentLogos.length === 0}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #CBD5E1",
                      borderRadius: "6px",
                      color: "#0F172A",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      padding: "0.35rem 0.75rem"
                    }}
                  >
                    <Download size={13} />
                    <span>{exportingMockup ? "Exporting..." : "Export PNG"}</span>
                  </button>
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
                    <span>Add {totalQuantity} Garments to Cart (${pricingSummary.grandTotal.toFixed(2)})</span>
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
