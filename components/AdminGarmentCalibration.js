"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Ruler, Check, AlertCircle, Crosshair, Wand2, X, Info, RotateCcw, CheckCircle2, Square, Maximize2, ShieldAlert } from "lucide-react";

const REFERENCE_KINDS = [
  { id: "chest", label: "Chest width (laid flat, pit to pit)", help: "The size-chart chest width. Measure straight across, 1\" below the armholes.", axis: "horizontal" },
  { id: "length", label: "Body length (HPS to hem)", help: "Size-chart body length: highest point of the shoulder straight down to the bottom hem.", axis: "vertical" },
  { id: "shoulder", label: "Shoulder to shoulder", help: "Seam to seam across the top of the garment.", axis: "horizontal" },
  { id: "fullWidth", label: "Sleeve tip to sleeve tip", help: "The full width of the garment as it lies in the photo.", axis: "horizontal" },
  { id: "custom", label: "Something else in the photo", help: "A ruler, a tape measure, or a known object (e.g. 11\" paper) laid on the garment.", axis: "free" },
];

const KIND_DEFAULTS = {
  chest: { a: { x: 20, y: 35 }, b: { x: 80, y: 35 }, refIn: 22 },
  length: { a: { x: 50, y: 15 }, b: { x: 50, y: 85 }, refIn: 29 },
  shoulder: { a: { x: 28, y: 18 }, b: { x: 72, y: 18 }, refIn: 18 },
  fullWidth: { a: { x: 5, y: 25 }, b: { x: 95, y: 25 }, refIn: 38 },
  custom: { a: { x: 25, y: 55 }, b: { x: 75, y: 55 }, refIn: 11 },
};

const CHECKER =
  "linear-gradient(45deg,#e2e8f0 25%,transparent 25%)," +
  "linear-gradient(-45deg,#e2e8f0 25%,transparent 25%)," +
  "linear-gradient(45deg,transparent 75%,#e2e8f0 75%)," +
  "linear-gradient(-45deg,transparent 75%,#e2e8f0 75%)";

/**
 * 3-Step Interactive Admin Garment Photo Scale, Collar & Optional Printable Area Calibration Dialog (Pure JS/JSX)
 */
export default function AdminGarmentCalibration({
  isOpen = true,
  onClose,
  imageUrl,
  sideName = "Front View",
  initialCalibration = null,
  onSaveCalibration,
  onSave
}) {
  const frameRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0, a: { x: 0, y: 0 }, b: { x: 0, y: 0 }, printArea: { x: 0, y: 0, width: 0, height: 0 } });
  const [frameW, setFrameW] = useState(0);
  const [step, setStep] = useState("scale"); // 'scale', 'collar', or 'printArea'
  const [refKind, setRefKind] = useState(initialCalibration?.refKind || "chest");
  const [trueLengthIn, setTrueLengthIn] = useState(initialCalibration?.referenceInches || 22);
  const [sizeLabel, setSizeLabel] = useState(initialCalibration?.calSize || "M");

  // Keep a per-kind measurement store so switching kinds doesn't discard custom lines
  const [measurements, setMeasurements] = useState(() => ({
    chest: { a: initialCalibration?.lineStart || KIND_DEFAULTS.chest.a, b: initialCalibration?.lineEnd || KIND_DEFAULTS.chest.b, refIn: initialCalibration?.referenceInches || 22 },
    length: KIND_DEFAULTS.length,
    shoulder: KIND_DEFAULTS.shoulder,
    fullWidth: KIND_DEFAULTS.fullWidth,
    custom: KIND_DEFAULTS.custom,
    ...(initialCalibration?.refKind ? { [initialCalibration.refKind]: { a: initialCalibration.lineStart, b: initialCalibration.lineEnd, refIn: initialCalibration.referenceInches } } : {})
  }));

  // Handle coordinates in percentages (0 to 100)
  const [lineA, setLineA] = useState(() => initialCalibration?.lineStart || KIND_DEFAULTS.chest.a);
  const [lineB, setLineB] = useState(() => initialCalibration?.lineEnd || KIND_DEFAULTS.chest.b);
  const [anchor, setAnchor] = useState(() => initialCalibration?.anchor || { x: 50, y: 15 });

  // Optional Restricted Printable Area Box state
  const [hasPrintArea, setHasPrintArea] = useState(() => Boolean(initialCalibration?.hasPrintArea));
  const [printArea, setPrintArea] = useState(() => initialCalibration?.printArea || {
    x: 28,
    y: 22,
    width: 44,
    height: 48
  });

  // Optional Maximum Artwork / Logo Size Limit state
  const [hasMaxLogoSize, setHasMaxLogoSize] = useState(() => Boolean(initialCalibration?.hasMaxLogoSize || initialCalibration?.maxLogoSizeIn));
  const [maxLogoSizeIn, setMaxLogoSizeIn] = useState(() => initialCalibration?.maxLogoSizeIn || 5);

  const [dragging, setDragging] = useState(null); // 'a' or 'b' or 'anchor' or 'printArea' or 'printAreaResize'
  const [imgAspect, setImgAspect] = useState(1);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      if (entries[0]) {
        setFrameW(entries[0].contentRect.width);
      }
    });
    observer.observe(el);
    setFrameW(el.clientWidth);
    return () => observer.disconnect();
  }, []);

  if (isOpen === false || !imageUrl) return null;

  const currentKind = REFERENCE_KINDS.find(k => k.id === refKind) || REFERENCE_KINDS[0];

  // Frame height in pixels
  const frameH = frameW * (imgAspect || 1);

  // Exact Euclidean distance in pixels between Line A and Line B
  const dxPx = ((lineB.x - lineA.x) / 100) * frameW;
  const dyPx = ((lineB.y - lineA.y) / 100) * frameH;
  const lineDistancePx = Math.hypot(dxPx, dyPx);

  const refInNum = parseFloat(trueLengthIn) || 22;

  // Scale: pixels per real-world inch
  const scalePxPerInch = lineDistancePx > 0 && refInNum > 0 ? (lineDistancePx / refInNum) : 0;

  // Real-world physical dimensions of the garment photo
  const totalImageWidthIn = scalePxPerInch > 0 ? (frameW / scalePxPerInch) : 22;
  const totalImageHeightIn = scalePxPerInch > 0 ? (frameH / scalePxPerInch) : (22 * (imgAspect || 1));
  const framePpi = scalePxPerInch;

  // Printable area box dimensions in real-world inches
  const printAreaWidthIn = scalePxPerInch > 0 ? (((printArea.width / 100) * frameW) / scalePxPerInch) : 12;
  const printAreaHeightIn = scalePxPerInch > 0 ? (((printArea.height / 100) * frameH) / scalePxPerInch) : 14;

  const handlePrintAreaWidthInChange = (newInches) => {
    const val = parseFloat(newInches);
    if (!val || val <= 0 || scalePxPerInch <= 0 || frameW <= 0) return;
    const px = val * scalePxPerInch;
    const pct = Math.min(100 - printArea.x, Math.max(5, (px / frameW) * 100));
    setPrintArea(prev => ({ ...prev, width: pct }));
  };

  const handlePrintAreaHeightInChange = (newInches) => {
    const val = parseFloat(newInches);
    if (!val || val <= 0 || scalePxPerInch <= 0 || frameH <= 0) return;
    const px = val * scalePxPerInch;
    const pct = Math.min(100 - printArea.y, Math.max(5, (px / frameH) * 100));
    setPrintArea(prev => ({ ...prev, height: pct }));
  };

  const handleCenterPrintArea = () => {
    setPrintArea(prev => ({ ...prev, x: Math.max(0, 50 - prev.width / 2) }));
  };

  const applyPrintAreaPreset = (wIn, hIn, yPct = 22) => {
    if (scalePxPerInch <= 0 || frameW <= 0 || frameH <= 0) return;
    const wPx = wIn * scalePxPerInch;
    const hPx = hIn * scalePxPerInch;
    const wPct = Math.min(95, Math.max(5, (wPx / frameW) * 100));
    const hPct = Math.min(95, Math.max(5, (hPx / frameH) * 100));
    const xPct = Math.max(0, 50 - wPct / 2);
    setPrintArea({
      x: xPct,
      y: Math.min(100 - hPct, yPct),
      width: wPct,
      height: hPct
    });
    setHasPrintArea(true);
  };

  // Handle kind selection
  const handleSelectKind = (nextKindId) => {
    // Save current kind measurement
    setMeasurements(prev => ({
      ...prev,
      [refKind]: { a: lineA, b: lineB, refIn: trueLengthIn }
    }));

    setRefKind(nextKindId);
    const stored = measurements[nextKindId] || KIND_DEFAULTS[nextKindId] || KIND_DEFAULTS.chest;
    setLineA(stored.a);
    setLineB(stored.b);
    setTrueLengthIn(stored.refIn);
  };

  // Pointer drag logic
  const handlePointerDown = (handle, e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(handle);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      a: { ...lineA },
      b: { ...lineB },
      printArea: { ...printArea }
    };
  };

  const handlePointerMove = (e) => {
    if (!dragging || !frameRef.current) return;
    const rect = frameRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    if (dragging === "line") {
      const dxPct = ((e.clientX - dragStartRef.current.x) / rect.width) * 100;
      const dyPct = ((e.clientY - dragStartRef.current.y) / rect.height) * 100;

      const newAx = Math.max(0, Math.min(100, dragStartRef.current.a.x + dxPct));
      const newAy = Math.max(0, Math.min(100, dragStartRef.current.a.y + dyPct));
      const newBx = Math.max(0, Math.min(100, dragStartRef.current.b.x + dxPct));
      const newBy = Math.max(0, Math.min(100, dragStartRef.current.b.y + dyPct));

      setLineA({ x: newAx, y: newAy });
      setLineB({ x: newBx, y: newBy });
    } else if (dragging === "a") {
      if (currentKind.axis === "horizontal") {
        setLineA({ x, y });
        setLineB(prev => ({ ...prev, y }));
      } else if (currentKind.axis === "vertical") {
        setLineA({ x, y });
        setLineB(prev => ({ ...prev, x }));
      } else {
        // free axis (something else in photo): place point anywhere!
        setLineA({ x, y });
      }
    } else if (dragging === "b") {
      if (currentKind.axis === "horizontal") {
        setLineB({ x, y });
        setLineA(prev => ({ ...prev, y }));
      } else if (currentKind.axis === "vertical") {
        setLineB({ x, y });
        setLineA(prev => ({ ...prev, x }));
      } else {
        // free axis (something else in photo): place point anywhere!
        setLineB({ x, y });
      }
    } else if (dragging === "anchor") {
      setAnchor({ x, y });
    } else if (dragging === "printArea") {
      const dxPct = ((e.clientX - dragStartRef.current.x) / rect.width) * 100;
      const dyPct = ((e.clientY - dragStartRef.current.y) / rect.height) * 100;
      const orig = dragStartRef.current.printArea;
      const newX = Math.max(0, Math.min(100 - orig.width, orig.x + dxPct));
      const newY = Math.max(0, Math.min(100 - orig.height, orig.y + dyPct));
      setPrintArea(prev => ({ ...prev, x: newX, y: newY }));
    } else if (dragging === "printAreaResize") {
      const dxPct = ((e.clientX - dragStartRef.current.x) / rect.width) * 100;
      const dyPct = ((e.clientY - dragStartRef.current.y) / rect.height) * 100;
      const orig = dragStartRef.current.printArea;
      const newW = Math.max(5, Math.min(100 - orig.x, orig.width + dxPct));
      const newH = Math.max(5, Math.min(100 - orig.y, orig.height + dyPct));
      setPrintArea(prev => ({ ...prev, width: newW, height: newH }));
    }
  };

  const handlePointerUp = () => {
    setDragging(null);
  };

  const handleFrameClick = (e) => {
    if (step === "collar" && frameRef.current) {
      const rect = frameRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
      setAnchor({ x, y });
    }
  };

  const handleSnapToEdges = () => {
    if (currentKind.axis === "vertical") {
      setLineA({ x: lineA.x, y: 5 });
      setLineB({ x: lineA.x, y: 95 });
    } else {
      setLineA({ x: 5, y: lineA.y });
      setLineB({ x: 95, y: lineA.y });
    }
  };

  const handleResetLine = () => {
    const def = KIND_DEFAULTS[refKind] || KIND_DEFAULTS.chest;
    setLineA(def.a);
    setLineB(def.b);
    setTrueLengthIn(def.refIn);
  };

  const handleSave = () => {
    const boxWIn = scalePxPerInch > 0 ? ((((printArea.width / 100) * frameW) / scalePxPerInch)) : 12;
    const boxHIn = scalePxPerInch > 0 ? ((((printArea.height / 100) * frameH) / scalePxPerInch)) : 14;

    const calibrationPayload = {
      isCalibrated: true,
      scaleUnitsPerInch: scalePxPerInch,
      pxPerInch: scalePxPerInch,
      garmentWidthIn: totalImageWidthIn,
      garmentHeightIn: totalImageHeightIn,
      referenceInches: refInNum,
      refKind,
      calSize: sizeLabel,
      lineStart: lineA,
      lineEnd: lineB,
      anchor,
      anchorX: anchor ? anchor.x / 100 : 0.5,
      anchorY: anchor ? anchor.y / 100 : 0.2,
      // Optional Restricted Printable Area
      hasPrintArea: Boolean(hasPrintArea),
      printArea: hasPrintArea ? {
        x: Math.round(printArea.x * 10) / 10,
        y: Math.round(printArea.y * 10) / 10,
        width: Math.round(printArea.width * 10) / 10,
        height: Math.round(printArea.height * 10) / 10,
        widthIn: Math.round(boxWIn * 10) / 10,
        heightIn: Math.round(boxHIn * 10) / 10,
      } : null,
      // Optional Artwork Size Limitation
      hasMaxLogoSize: Boolean(hasMaxLogoSize),
      maxLogoSizeIn: hasMaxLogoSize ? (parseFloat(maxLogoSizeIn) || 5) : null,
      maxLogoWidthIn: hasMaxLogoSize ? (parseFloat(maxLogoSizeIn) || 5) : null,
      maxLogoHeightIn: hasMaxLogoSize ? (parseFloat(maxLogoSizeIn) || 5) : null,
      calibratedAt: new Date().toISOString()
    };

    if (onSaveCalibration) {
      onSaveCalibration(calibrationPayload);
    } else if (onSave) {
      onSave(calibrationPayload);
    }
    if (onClose) {
      onClose();
    }
  };

  // Convert percentage coordinates to frame pixels
  const ax = (lineA.x / 100) * frameW;
  const ay = (lineA.y / 100) * frameH;
  const bx = (lineB.x / 100) * frameW;
  const by = (lineB.y / 100) * frameH;

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(6px)",
        zIndex: 1100,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "2rem 1.5rem",
        overflowY: "auto"
      }}
    >
      <div className="card" style={{
        width: "100%",
        maxWidth: "960px",
        backgroundColor: "white",
        borderRadius: "var(--radius-lg)",
        padding: "0",
        overflow: "hidden",
        boxShadow: "0 25px 50px rgba(0,0,0,0.25)"
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.25rem 1.5rem", borderBottom: "1px solid hsl(var(--border-hsl))" }}>
          <div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "hsl(var(--primary-hsl))", display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
              <Ruler size={18} style={{ color: "hsl(var(--accent-hsl))" }} /> Calibrate photo scale — {sideName}
            </h2>
            <p style={{ fontSize: "0.8rem", color: "hsl(var(--muted-hsl))", marginTop: "0.2rem" }}>
              Teach this photo how big it is, so print sizes render true to life in every mockup.
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(var(--muted-hsl))" }}>
            <X size={20} />
          </button>
        </div>

        {/* 2-Step Wizard Tabs Bar */}
        <div style={{ display: "flex", borderBottom: "1px solid hsl(var(--border-hsl))", backgroundColor: "hsl(var(--secondary-hsl) / 0.15)" }}>
          <button
            type="button"
            onClick={() => setStep("scale")}
            style={{
              flex: 1,
              padding: "0.75rem",
              fontSize: "0.85rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              border: "none",
              borderBottom: step === "scale" ? "3px solid hsl(var(--primary-hsl))" : "none",
              backgroundColor: step === "scale" ? "white" : "transparent",
              color: step === "scale" ? "hsl(var(--primary-hsl))" : "hsl(var(--muted-hsl))",
              cursor: "pointer"
            }}
          >
            <span style={{ width: "20px", height: "20px", borderRadius: "50%", backgroundColor: step === "scale" ? "hsl(var(--primary-hsl))" : "#cbd5e1", color: "white", fontSize: "11px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>1</span>
            Measure the scale
            {scalePxPerInch > 0 && <Check size={14} style={{ color: "rgb(22, 163, 74)" }} />}
          </button>

          <button
            type="button"
            onClick={() => setStep("collar")}
            style={{
              flex: 1,
              padding: "0.75rem",
              fontSize: "0.85rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              border: "none",
              borderBottom: step === "collar" ? "3px solid hsl(var(--primary-hsl))" : "none",
              backgroundColor: step === "collar" ? "white" : "transparent",
              color: step === "collar" ? "hsl(var(--primary-hsl))" : "hsl(var(--muted-hsl))",
              cursor: "pointer"
            }}
          >
            <span style={{ width: "20px", height: "20px", borderRadius: "50%", backgroundColor: step === "collar" ? "hsl(var(--primary-hsl))" : "#cbd5e1", color: "white", fontSize: "11px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>2</span>
            Mark the collar
            {anchor && <Check size={14} style={{ color: "rgb(22, 163, 74)" }} />}
          </button>

          <button
            type="button"
            onClick={() => setStep("printArea")}
            style={{
              flex: 1,
              padding: "0.75rem",
              fontSize: "0.85rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              border: "none",
              borderBottom: step === "printArea" ? "3px solid hsl(var(--primary-hsl))" : "none",
              backgroundColor: step === "printArea" ? "white" : "transparent",
              color: step === "printArea" ? "hsl(var(--primary-hsl))" : "hsl(var(--muted-hsl))",
              cursor: "pointer"
            }}
          >
            <span style={{ width: "20px", height: "20px", borderRadius: "50%", backgroundColor: step === "printArea" ? "hsl(var(--primary-hsl))" : "#cbd5e1", color: "white", fontSize: "11px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>3</span>
            Printable area & limits
            {(hasPrintArea || hasMaxLogoSize) && <Check size={14} style={{ color: "rgb(22, 163, 74)" }} />}
          </button>
        </div>

        {/* Body Workspace Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "1.5rem", padding: "1.5rem" }}>
          
          {/* Left Column: Photo Canvas Viewport */}
          <div>
            <div
              ref={frameRef}
              onClick={handleFrameClick}
              style={{
                position: "relative",
                width: "100%",
                height: frameH > 0 ? frameH : 400,
                backgroundImage: CHECKER,
                backgroundSize: "16px 16px",
                borderRadius: "var(--radius-md)",
                border: "1px solid hsl(var(--border-hsl))",
                overflow: "hidden",
                userSelect: "none",
                cursor: step === "collar" ? "crosshair" : "default"
              }}
            >
              <img
                src={imageUrl}
                alt="Calibration Photo"
                onLoad={(e) => {
                  if (e.target.naturalWidth && e.target.naturalHeight) {
                    setImgAspect(e.target.naturalHeight / e.target.naturalWidth);
                  }
                }}
                style={{ width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }}
              />

              {/* Step 1: SVG Reference Measurement Line */}
              {step === "scale" && frameH > 0 && (
                <>
                  <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
                    <line x1={ax} y1={ay} x2={bx} y2={by} stroke="#ffffff" strokeWidth="6" opacity="0.8" strokeLinecap="round" />
                    <line x1={ax} y1={ay} x2={bx} y2={by} stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
                    {/* Interactive hit area line to drag entire line */}
                    <line
                      x1={ax} y1={ay} x2={bx} y2={by}
                      stroke="transparent"
                      strokeWidth="24"
                      style={{ pointerEvents: "stroke", cursor: "move" }}
                      onPointerDown={(e) => handlePointerDown("line", e)}
                    />
                  </svg>

                  {/* Handle A */}
                  <div
                    onPointerDown={(e) => handlePointerDown("a", e)}
                    style={{
                      position: "absolute",
                      left: ax,
                      top: ay,
                      width: "24px",
                      height: "24px",
                      marginLeft: "-12px",
                      marginTop: "-12px",
                      borderRadius: "50%",
                      backgroundColor: "#2563eb",
                      border: "3px solid white",
                      boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
                      cursor: "grab",
                      touchAction: "none"
                    }}
                  />

                  {/* Handle B */}
                  <div
                    onPointerDown={(e) => handlePointerDown("b", e)}
                    style={{
                      position: "absolute",
                      left: bx,
                      top: by,
                      width: "24px",
                      height: "24px",
                      marginLeft: "-12px",
                      marginTop: "-12px",
                      borderRadius: "50%",
                      backgroundColor: "#2563eb",
                      border: "3px solid white",
                      boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
                      cursor: "grab",
                      touchAction: "none"
                    }}
                  />

                  {/* Length Badge Pill in Middle of Line */}
                  <div
                    style={{
                      position: "absolute",
                      left: (ax + bx) / 2,
                      top: (ay + by) / 2 - 24,
                      transform: "translateX(-50%)",
                      backgroundColor: "#2563eb",
                      color: "white",
                      fontSize: "0.75rem",
                      fontWeight: 800,
                      padding: "0.15rem 0.6rem",
                      borderRadius: "999px",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                      pointerEvents: "none"
                    }}
                  >
                    {refInNum}&quot;
                  </div>
                </>
              )}

              {/* Step 2: Collar Anchor Target */}
              {step === "collar" && anchor && frameH > 0 && (
                <div
                  onPointerDown={(e) => handlePointerDown("anchor", e)}
                  style={{
                    position: "absolute",
                    left: `${anchor.x}%`,
                    top: `${anchor.y}%`,
                    transform: "translate(-50%, -50%)",
                    color: "#ef4444",
                    pointerEvents: "auto",
                    cursor: "grab"
                  }}
                >
                  <Crosshair size={28} style={{ strokeWidth: 2.5 }} />
                </div>
              )}

              {/* Step 3: Interactive Printable Area Box */}
              {step === "printArea" && frameH > 0 && (
                <>
                  {hasPrintArea ? (
                    <div
                      onPointerDown={(e) => handlePointerDown("printArea", e)}
                      style={{
                        position: "absolute",
                        left: `${printArea.x}%`,
                        top: `${printArea.y}%`,
                        width: `${printArea.width}%`,
                        height: `${printArea.height}%`,
                        border: "2px dashed #2563EB",
                        backgroundColor: "rgba(37, 99, 235, 0.14)",
                        borderRadius: "4px",
                        cursor: "move",
                        boxShadow: "0 0 0 1px rgba(255,255,255,0.7)",
                        userSelect: "none",
                        touchAction: "none"
                      }}
                    >
                      <div style={{ padding: "4px 8px", pointerEvents: "none" }}>
                        <span style={{ backgroundColor: "#2563EB", color: "white", fontSize: "10px", fontWeight: 800, padding: "2px 6px", borderRadius: "3px", display: "inline-block" }}>
                          Print Area: {printAreaWidthIn.toFixed(1)}&quot; × {printAreaHeightIn.toFixed(1)}&quot;
                        </span>
                      </div>

                      {/* Corner Resize Handle */}
                      <div
                        onPointerDown={(e) => handlePointerDown("printAreaResize", e)}
                        style={{
                          position: "absolute",
                          right: "-8px",
                          bottom: "-8px",
                          width: "18px",
                          height: "18px",
                          backgroundColor: "#2563EB",
                          border: "2px solid white",
                          borderRadius: "4px",
                          cursor: "nwse-resize",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                          touchAction: "none"
                        }}
                        title="Drag to resize box"
                      />
                    </div>
                  ) : (
                    <div style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(255,255,255,0.45)",
                      backdropFilter: "blur(2px)",
                      pointerEvents: "none"
                    }}>
                      <div style={{ backgroundColor: "white", padding: "0.75rem 1.25rem", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", border: "1px solid hsl(var(--border-hsl))", textAlign: "center" }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: "0.85rem", color: "#1E293B" }}>
                          Print Anywhere (Full Garment Allowed)
                        </p>
                        <p style={{ margin: "0.2rem 0 0", fontSize: "0.75rem", color: "#64748B" }}>
                          Select &quot;Restricted Printable Area Box&quot; on the right to limit client logo placement.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* 6-Inch Verification Ruler Bar Overlay */}
              {framePpi > 0 && (
                <div style={{ position: "absolute", bottom: "0.75rem", left: "0.75rem", pointerEvents: "none" }}>
                  <div style={{
                    display: "flex",
                    alignItems: "flex-end",
                    height: "24px",
                    width: `${framePpi * 6}px`,
                    backgroundColor: "rgba(255,255,255,0.9)",
                    borderRadius: "4px",
                    padding: "0 4px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                  }}>
                    {[0, 1, 2, 3, 4, 5].map(i => (
                      <div key={i} style={{ flex: 1, borderLeft: "1px solid #334155", height: "100%", position: "relative" }}>
                        <span style={{ position: "absolute", top: "0", left: "2px", fontSize: "9px", fontWeight: 700, color: "#334155" }}>{i}</span>
                      </div>
                    ))}
                    <div style={{ borderLeft: "1px solid #334155", height: "100%" }} />
                  </div>
                  <p style={{ fontSize: "10px", color: "#475569", fontWeight: 600, backgroundColor: "rgba(255,255,255,0.9)", padding: "2px 6px", borderRadius: "4px", display: "inline-block", marginTop: "2px" }}>
                    6&quot; ruler — check it against the garment photo
                  </p>
                </div>
              )}
            </div>

            <p style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))", marginTop: "0.6rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <Info size={14} />
              {step === "scale"
                ? "Drag the two blue handles onto the measurement line you know (e.g. chest width)."
                : step === "collar"
                ? "Click or drag the red crosshair target onto the high point of the shoulder at collar center."
                : "Drag or resize the blue box to define where customers can position artwork on this garment view."
              }
            </p>
          </div>

          {/* Right Column: Controls & Configuration */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {step === "scale" && (
              <>
                <div>
                  <label className="label">What are you measuring?</label>
                  <select
                    className="input"
                    value={refKind}
                    onChange={(e) => handleSelectKind(e.target.value)}
                    style={{ fontSize: "0.85rem" }}
                  >
                    {REFERENCE_KINDS.map(k => (
                      <option key={k.id} value={k.id}>{k.label}</option>
                    ))}
                  </select>
                  <p style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))", marginTop: "0.3rem" }}>{currentKind.help}</p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <label className="label">True length (in) *</label>
                    <input
                      type="number"
                      step="0.5"
                      className="input"
                      value={trueLengthIn}
                      onChange={(e) => setTrueLengthIn(e.target.value)}
                      placeholder="22"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Size in photo</label>
                    <input
                      className="input"
                      value={sizeLabel}
                      onChange={(e) => setSizeLabel(e.target.value)}
                      placeholder="M"
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button type="button" onClick={handleSnapToEdges} className="btn btn-outline" style={{ flex: 1, fontSize: "0.75rem", padding: "0.4rem" }}>
                    <Wand2 size={14} style={{ marginRight: "0.3rem" }} /> Snap to edges
                  </button>
                  <button type="button" onClick={handleResetLine} className="btn btn-outline" style={{ fontSize: "0.75rem", padding: "0.4rem" }}>
                    <RotateCcw size={14} />
                  </button>
                </div>

                {/* Calculation Result Card */}
                <div style={{ padding: "0.85rem", backgroundColor: "rgba(34, 197, 94, 0.08)", border: "1px solid rgba(34, 197, 94, 0.2)", borderRadius: "var(--radius-md)", fontSize: "0.8rem" }}>
                  <p style={{ fontWeight: 800, color: "rgb(22, 163, 74)" }}>
                    Scale: {scalePxPerInch.toFixed(1)} px per inch
                  </p>
                  <p style={{ color: "hsl(var(--foreground-hsl) / 0.8)", marginTop: "0.2rem" }}>
                    Garment in photo measures <strong>{totalImageWidthIn.toFixed(1)}&quot; wide &times; {totalImageHeightIn.toFixed(1)}&quot; tall</strong>.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setStep("collar")}
                  className="btn btn-primary"
                  style={{ width: "100%", padding: "0.75rem" }}
                >
                  Next: mark the collar →
                </button>
              </>
            )}

            {step === "collar" && (
              <>
                <div style={{ padding: "0.85rem", backgroundColor: "hsl(var(--secondary-hsl) / 0.3)", borderRadius: "var(--radius-md)", fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <p style={{ fontWeight: 800 }}>Collar Positioning Anchor</p>
                  <p style={{ color: "hsl(var(--muted-hsl))", lineHeight: "1.4" }}>
                    Marking the high point of shoulder/collar allows preset print locations (e.g. Left Chest 8&quot; down) to anchor consistently.
                  </p>
                </div>

                <div style={{ padding: "0.75rem", border: "1px solid hsl(var(--border-hsl))", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", fontWeight: 700, color: "hsl(var(--primary-hsl))" }}>
                  {anchor ? "Collar Marked ✓" : "Click on garment photo to place marker"}
                </div>

                <button
                  type="button"
                  onClick={() => setStep("printArea")}
                  className="btn btn-primary"
                  style={{ width: "100%", padding: "0.75rem" }}
                >
                  Next: printable area & limits (optional) →
                </button>

                <button type="button" onClick={() => setStep("scale")} className="btn btn-outline" style={{ width: "100%", padding: "0.5rem", fontSize: "0.8rem" }}>
                  ← Back to scale measurement
                </button>
              </>
            )}

            {step === "printArea" && (
              <>
                {/* 1. Printable Area Option Selector */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  <label className="label" style={{ fontWeight: 800, fontSize: "0.85rem", color: "hsl(var(--primary-hsl))" }}>
                    Artwork Placement Area (Optional)
                  </label>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", padding: "0.6rem", borderRadius: "6px", border: !hasPrintArea ? "2px solid #2563EB" : "1px solid hsl(var(--border-hsl))", backgroundColor: !hasPrintArea ? "#EFF6FF" : "transparent", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="printAreaChoice"
                        checked={!hasPrintArea}
                        onChange={() => setHasPrintArea(false)}
                        style={{ marginTop: "2px" }}
                      />
                      <div>
                        <span style={{ fontSize: "0.82rem", fontWeight: 700, display: "block" }}>Print Anywhere</span>
                        <span style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))" }}>Customer can place logo freely across the garment image.</span>
                      </div>
                    </label>

                    <label style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", padding: "0.6rem", borderRadius: "6px", border: hasPrintArea ? "2px solid #2563EB" : "1px solid hsl(var(--border-hsl))", backgroundColor: hasPrintArea ? "#EFF6FF" : "transparent", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="printAreaChoice"
                        checked={hasPrintArea}
                        onChange={() => setHasPrintArea(true)}
                        style={{ marginTop: "2px" }}
                      />
                      <div>
                        <span style={{ fontSize: "0.82rem", fontWeight: 700, display: "block" }}>Restricted Printable Area Box</span>
                        <span style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))" }}>Customer can only move their logo inside this designated box.</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Printable Box Dimensions & Presets if Active */}
                {hasPrintArea && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", padding: "0.75rem", backgroundColor: "hsl(var(--secondary-hsl) / 0.25)", borderRadius: "var(--radius-md)", border: "1px solid hsl(var(--border-hsl))" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                      <div>
                        <label style={{ fontSize: "0.75rem", fontWeight: 700, display: "block", marginBottom: "0.2rem" }}>Box Width (in)</label>
                        <input
                          type="number"
                          step="0.5"
                          min="1"
                          className="input"
                          value={Math.round(printAreaWidthIn * 10) / 10}
                          onChange={(e) => handlePrintAreaWidthInChange(e.target.value)}
                          style={{ fontSize: "0.85rem", padding: "0.35rem 0.5rem" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "0.75rem", fontWeight: 700, display: "block", marginBottom: "0.2rem" }}>Box Height (in)</label>
                        <input
                          type="number"
                          step="0.5"
                          min="1"
                          className="input"
                          value={Math.round(printAreaHeightIn * 10) / 10}
                          onChange={(e) => handlePrintAreaHeightInChange(e.target.value)}
                          style={{ fontSize: "0.85rem", padding: "0.35rem 0.5rem" }}
                        />
                      </div>
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                      <button type="button" onClick={() => applyPrintAreaPreset(12, 14, 22)} className="btn btn-outline" style={{ fontSize: "0.7rem", padding: "0.25rem 0.5rem" }}>
                        Chest (12&quot;×14&quot;)
                      </button>
                      <button type="button" onClick={() => applyPrintAreaPreset(4.5, 4.5, 20)} className="btn btn-outline" style={{ fontSize: "0.7rem", padding: "0.25rem 0.5rem" }}>
                        Pocket (4.5&quot;×4.5&quot;)
                      </button>
                      <button type="button" onClick={() => applyPrintAreaPreset(14, 18, 18)} className="btn btn-outline" style={{ fontSize: "0.7rem", padding: "0.25rem 0.5rem" }}>
                        Full Front (14&quot;×18&quot;)
                      </button>
                      <button type="button" onClick={handleCenterPrintArea} className="btn btn-outline" style={{ fontSize: "0.7rem", padding: "0.25rem 0.5rem" }}>
                        Center Horizontally
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. Separate Artwork Size Limitation */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", borderTop: "1px solid hsl(var(--border-hsl))", paddingTop: "0.75rem" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={hasMaxLogoSize}
                      onChange={(e) => setHasMaxLogoSize(e.target.checked)}
                    />
                    <span>Limit Maximum Logo / Artwork Size</span>
                  </label>

                  {hasMaxLogoSize ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", padding: "0.6rem", backgroundColor: "#FEF3C7", borderRadius: "6px", border: "1px solid #FCD34D" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#92400E" }}>Max size limit:</span>
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          max="30"
                          className="input"
                          value={maxLogoSizeIn}
                          onChange={(e) => setMaxLogoSizeIn(e.target.value)}
                          style={{ width: "70px", padding: "0.25rem", textAlign: "center", fontWeight: 800, fontSize: "0.9rem" }}
                        />
                        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#92400E" }}>inches</span>
                      </div>
                      <p style={{ margin: 0, fontSize: "0.72rem", color: "#B45309", lineHeight: 1.3 }}>
                        If customer tries to set logo size larger than {maxLogoSizeIn}&quot; (e.g. 6&quot;), frontend will show an error and constrain it to {maxLogoSizeIn}&quot;.
                      </p>
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: "0.75rem", color: "hsl(var(--muted-hsl))" }}>
                      No size limit active. Customers can scale logo to any desired dimensions.
                    </p>
                  )}
                </div>

                <button type="button" onClick={() => setStep("collar")} className="btn btn-outline" style={{ width: "100%", padding: "0.5rem", fontSize: "0.8rem" }}>
                  ← Back to collar anchor
                </button>
              </>
            )}

            {/* Bottom Actions */}
            <div style={{ paddingTop: "0.75rem", borderTop: "1px solid hsl(var(--border-hsl))", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={handleSave}
                className="btn btn-primary"
                style={{ width: "100%", padding: "0.75rem" }}
              >
                <CheckCircle2 size={16} /> Save Calibration
              </button>
              <button type="button" onClick={onClose} className="btn btn-outline" style={{ width: "100%", padding: "0.5rem", fontSize: "0.8rem" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
