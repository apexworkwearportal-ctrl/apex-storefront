"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Ruler, Check, AlertCircle, Crosshair, Wand2, X, Info, RotateCcw, CheckCircle2 } from "lucide-react";

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
 * 2-Step Interactive Admin Garment Photo Scale & Collar Calibration Dialog (Pure JS/JSX)
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
  const dragStartRef = useRef({ x: 0, y: 0, a: { x: 0, y: 0 }, b: { x: 0, y: 0 } });
  const [frameW, setFrameW] = useState(0);
  const [step, setStep] = useState("scale"); // 'scale' or 'collar'
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

  const [dragging, setDragging] = useState(null); // 'a' or 'b' or 'anchor'
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
      b: { ...lineB }
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
        </div>

        {/* Body Workspace Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "1.5rem", padding: "1.5rem" }}>
          
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

              {/* Collar Anchor Target */}
              {anchor && frameH > 0 && (
                <div
                  onPointerDown={(e) => step === "collar" && handlePointerDown("anchor", e)}
                  style={{
                    position: "absolute",
                    left: `${anchor.x}%`,
                    top: `${anchor.y}%`,
                    transform: "translate(-50%, -50%)",
                    color: step === "collar" ? "#ef4444" : "rgba(239, 68, 68, 0.7)",
                    pointerEvents: step === "collar" ? "auto" : "none",
                    cursor: step === "collar" ? "grab" : "default"
                  }}
                >
                  <Crosshair size={28} style={{ strokeWidth: 2.5 }} />
                </div>
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
                : "Click or drag the red crosshair target onto the high point of the shoulder at collar center."
              }
            </p>
          </div>

          {/* Right Column: Controls & Configuration */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {step === "scale" ? (
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
            ) : (
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

                <button type="button" onClick={() => setStep("scale")} className="btn btn-outline" style={{ width: "100%", padding: "0.6rem" }}>
                  ← Back to scale measurement
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
