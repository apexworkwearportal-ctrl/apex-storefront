"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { X, AlertTriangle, ShieldCheck, FileCheck, ExternalLink, FileText, Image as ImageIcon, AlertOctagon, CheckCircle2, RefreshCw } from "lucide-react";
import { computeGuides, describeSize, describeIn, analyzeArtworkPreflight } from "@/lib/proof-geometry";

/**
 * Customer Interactive Print Proof & Preflight Inspection Modal
 *
 * Fix 1 — PDF preview: uses <iframe> with themed fallback card when cross-origin blocks rendering.
 * Fix 2 — Artwork frame: always uses the product's exact aspect ratio as the viewport frame.
 *          Uploaded artwork is placed inside via position:absolute + object-fit:contain so it never
 *          distorts the frame (e.g. a square logo inside a 3.5"×2" business card appears correctly
 *          centered within the card shape, not stretching everything to a square).
 */
function loadPdfJsEngine() {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.js";
    return Promise.resolve(window.pdfjsLib);
  }

  return new Promise((resolve, reject) => {
    let script = document.getElementById("pdfjs-lib-engine-script");
    if (!script) {
      script = document.createElement("script");
      script.id = "pdfjs-lib-engine-script";
      script.src = "/pdfjs/pdf.min.js";
      script.onload = () => {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.js";
          resolve(window.pdfjsLib);
        } else {
          reject(new Error("PDF engine failed to initialize"));
        }
      };
      script.onerror = () => reject(new Error("Failed to load PDF engine"));
      document.head.appendChild(script);
    } else {
      const checkInterval = setInterval(() => {
        if (window.pdfjsLib) {
          clearInterval(checkInterval);
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.js";
          resolve(window.pdfjsLib);
        }
      }, 50);
      setTimeout(() => {
        clearInterval(checkInterval);
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.js";
          resolve(window.pdfjsLib);
        } else {
          reject(new Error("Timeout waiting for PDF engine"));
        }
      }, 5000);
    }
  });
}

export default function PrintProofModal({
  isOpen,
  onClose,
  fileUrl,
  artworkUrl,
  artworkFile,
  fileName = "artwork.pdf",
  productName,
  productSpecs,
  finishedWidthIn = 3.5,
  finishedHeightIn = 2.0,
  bleedIn = 0.125,
  safeInsetIn = 0.0625,
  onApproveProof,
  onApprove
}) {
  const [approved, setApproved] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [measuredPageIn, setMeasuredPageIn] = useState(null);

  // Multi-page PDF extraction states
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pdfNumPages, setPdfNumPages] = useState(1);
  const [activeSheet, setActiveSheet] = useState(0); // 0 = Front, 1 = Back
  const [pdfRendering, setPdfRendering] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);

  // Resolve active URL/filename
  const activeUrl = fileUrl || artworkUrl || (typeof artworkFile === "string" ? artworkFile : artworkFile?.url) || "";
  const activeFileName = (typeof artworkFile === "object" && artworkFile?.name) ? artworkFile.name : fileName;

  // Parse finished size:
  let resolvedWidth = Number(finishedWidthIn) || 3.5;
  let resolvedHeight = Number(finishedHeightIn) || 2.0;

  if (resolvedWidth === 3.5 && resolvedHeight === 2.0 && productSpecs && typeof productSpecs === "object") {
    const candidates = [
      productSpecs.Size,
      productSpecs.size,
      ...Object.values(productSpecs)
    ];
    for (const val of candidates) {
      if (typeof val === "string") {
        const m = val.match(/(\d+(?:\.\d+)?)\s*["\u201d\u2019']?\s*[xX\u00d7]\s*(\d+(?:\.\d+)?)/);
        if (m) {
          const w = parseFloat(m[1]);
          const h = parseFloat(m[2]);
          if (w > 0 && h > 0) {
            resolvedWidth = w;
            resolvedHeight = h;
            break;
          }
        }
      }
    }
  }

  // Expected sheet size including standard bleed
  const targetSheetW = resolvedWidth + (bleedIn * 2);
  const targetSheetH = resolvedHeight + (bleedIn * 2);
  const targetSheetAspect = targetSheetW / targetSheetH;
  const trimAspect = resolvedWidth / resolvedHeight;

  // Detect file type
  const lowerUrl = activeUrl.toLowerCase();
  const lowerName = activeFileName.toLowerCase();
  const isPdf = lowerUrl.includes(".pdf") || lowerName.endsWith(".pdf");
  const isImage = !isPdf;

  useEffect(() => {
    setApproved(false);
    setIframeError(false);
    setIframeLoaded(false);
    setImageDimensions({ width: 0, height: 0 });
    setMeasuredPageIn(null);

    if (activeUrl && isImage) {
      const img = new Image();
      img.onload = () => {
        const nw = img.naturalWidth || img.width;
        const nh = img.naturalHeight || img.height;
        setImageDimensions({ width: nw, height: nh });

        const aspect = nw / nh;
        const matchesSheetAspect = Math.abs(aspect - targetSheetAspect) < 0.05;
        const matchesTrimAspect = Math.abs(aspect - trimAspect) < 0.05;

        const wAt300 = nw / 300;
        const hAt300 = nh / 300;
        const isBleedAt300 = wAt300 >= resolvedWidth + 0.08 && hAt300 >= resolvedHeight + 0.08;

        const hasBleed = matchesSheetAspect || isBleedAt300 || (!matchesTrimAspect && aspect > 0);

        setMeasuredPageIn({
          w: hasBleed ? targetSheetW : resolvedWidth,
          h: hasBleed ? targetSheetH : resolvedHeight,
          hasBleed: hasBleed
        });
      };
      img.src = activeUrl;
    }
  }, [activeUrl, isOpen, isImage, resolvedWidth, resolvedHeight, bleedIn, targetSheetW, targetSheetH, targetSheetAspect, trimAspect]);

  const frameW = targetSheetW;
  const frameH = targetSheetH;
  const dynamicAspectRatio = `${frameW} / ${frameH}`;
  const fileHasBleed = measuredPageIn?.hasBleed !== false;

  const guides = useMemo(() => {
    const cutW = resolvedWidth;
    const cutH = resolvedHeight;
    const cutX = (frameW - cutW) / 2;
    const cutY = (frameH - cutH) / 2;

    const safeW = Math.max(0, cutW - safeInsetIn * 2);
    const safeH = Math.max(0, cutH - safeInsetIn * 2);
    const safeX = cutX + safeInsetIn;
    const safeY = cutY + safeInsetIn;

    return {
      cut: {
        left: `${(cutX / frameW) * 100}%`,
        top: `${(cutY / frameH) * 100}%`,
        width: `${(cutW / frameW) * 100}%`,
        height: `${(cutH / frameH) * 100}%`
      },
      safe: {
        left: `${(safeX / frameW) * 100}%`,
        top: `${(safeY / frameH) * 100}%`,
        width: `${(safeW / frameW) * 100}%`,
        height: `${(safeH / frameH) * 100}%`
      }
    };
  }, [frameW, frameH, resolvedWidth, resolvedHeight, safeInsetIn]);

  // Load PDF Document when modal opens with a PDF file
  useEffect(() => {
    let isCancelled = false;
    if (!isOpen || !activeUrl || !isPdf) {
      setPdfDoc(null);
      setPdfNumPages(1);
      setActiveSheet(0);
      return;
    }

    async function loadPdfDocument() {
      setPdfRendering(true);
      setPdfError("");
      try {
        const pdfjs = await loadPdfJsEngine();
        if (!pdfjs) throw new Error("PDF engine not available");

        const loadingTask = pdfjs.getDocument({ url: activeUrl });
        const doc = await loadingTask.promise;
        if (isCancelled) return;

        setPdfDoc(doc);
        setPdfNumPages(doc.numPages || 1);
        setActiveSheet(0);
      } catch (err) {
        if (!isCancelled) {
          console.error("PDF load error:", err);
          setPdfError(err.message || "Failed to load PDF file");
        }
      } finally {
        if (!isCancelled) setPdfRendering(false);
      }
    }

    loadPdfDocument();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, activeUrl, isPdf]);

  // Render the selected PDF page (Front = Page 1, Back = Page 2, etc.) to canvas
  useEffect(() => {
    if (!isOpen || !pdfDoc || !isPdf || !canvasRef.current) return;
    let isCancelled = false;

    async function renderPage() {
      setPdfRendering(true);
      try {
        const pageNum = Math.min(Math.max(1, activeSheet + 1), pdfDoc.numPages);
        const page = await pdfDoc.getPage(pageNum);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const naturalViewport = page.getViewport({ scale: 1, rotation: 0 });
        const containerWidth = canvas.parentElement?.clientWidth || 700;
        const scale = containerWidth / naturalViewport.width;
        const viewport = page.getViewport({ scale: Math.max(scale, 0.5), rotation: 0 });

        const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;
        canvas.width = Math.round(viewport.width * dpr);
        canvas.height = Math.round(viewport.height * dpr);
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.objectFit = "contain";

        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {}
        }

        const renderTask = page.render({
          canvasContext: ctx,
          viewport: viewport
        });
        renderTaskRef.current = renderTask;

        await renderTask.promise;

        if (!isCancelled) {
          const pageWIn = naturalViewport.width / 72;
          const pageHIn = naturalViewport.height / 72;
          const hasBleed = (pageWIn >= resolvedWidth + 0.1) && (pageHIn >= resolvedHeight + 0.1);
          setMeasuredPageIn({ w: pageWIn, h: pageHIn, hasBleed });
          setImageDimensions({
            width: Math.round(naturalViewport.width * (300 / 72)),
            height: Math.round(naturalViewport.height * (300 / 72))
          });
        }
      } catch (err) {
        if (err?.name !== "RenderingCancelledException") {
          console.error("PDF render page error:", err);
        }
      } finally {
        if (!isCancelled) setPdfRendering(false);
      }
    }

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [isOpen, pdfDoc, activeSheet, isPdf]);

  const preflight = analyzeArtworkPreflight({
    imageWidthPx: imageDimensions.width,
    imageHeightPx: imageDimensions.height,
    finishedWidthIn: resolvedWidth,
    finishedHeightIn: resolvedHeight,
    bleedIn,
    fileName: activeFileName
  });

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!approved) return;
    const hasAnyWarnings = Boolean(preflight?.hasWarnings || preflight?.hasErrors || (preflight?.issues && preflight.issues.length > 0));
    const approvalData = {
      fileUrl: activeUrl,
      fileName: activeFileName,
      approvedAt: new Date().toISOString(),
      finishedSize: `${resolvedWidth}" × ${resolvedHeight}"`,
      hasWarnings: hasAnyWarnings,
      warningsCount: preflight?.issues?.length || 0,
      preflight: {
        pixelDimensions: imageDimensions.width > 0 ? `${imageDimensions.width} × ${imageDimensions.height}` : null,
        effectiveDpi: preflight?.effectiveDpi || null,
        hasWarnings: hasAnyWarnings,
        hasErrors: false,
        issues: preflight?.issues || []
      }
    };
    if (typeof onApproveProof === "function") onApproveProof(approvalData);
    else if (typeof onApprove === "function") onApprove(approvalData);
    onClose();
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.78)",
      backdropFilter: "blur(6px)",
      zIndex: 1100,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "1.5rem"
    }}>
      <div className="card" style={{
        width: "100%", maxWidth: "780px", maxHeight: "94vh", overflowY: "auto",
        backgroundColor: "white",
        borderRadius: "var(--radius-lg)",
        padding: "2rem",
        position: "relative",
        boxShadow: "0 20px 50px rgba(0,0,0,0.4)"
      }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: "1px solid hsl(var(--border-hsl))", paddingBottom: "1rem" }}>
          <div>
            <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", color: "hsl(var(--accent-hsl))", letterSpacing: "0.05em" }}>
              Live Print Proof Inspection
            </span>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 900, color: "hsl(var(--primary-hsl))", display: "flex", alignItems: "center", gap: "0.5rem", margin: "0.2rem 0 0 0" }}>
              <ShieldCheck size={22} style={{ color: "#16a34a" }} /> Inspect Artwork Print Proof
            </h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {activeUrl && (
              <a href={activeUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline"
                style={{ fontSize: "0.75rem", padding: "0.3rem 0.65rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                <ExternalLink size={13} /> Open Full Size
              </a>
            )}
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(var(--muted-hsl))", padding: "0.4rem" }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {!activeUrl ? (
          <div style={{ padding: "3rem 1.5rem", textAlign: "center", color: "hsl(var(--muted-hsl))" }}>
            <AlertTriangle size={40} style={{ margin: "0 auto 0.75rem auto", color: "#D97706" }} />
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800 }}>No Artwork File Available</h3>
            <p style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>Upload your print-ready file to inspect bleed margins and cut lines.</p>
            <button type="button" onClick={onClose} className="btn btn-primary" style={{ marginTop: "1rem" }}>Close</button>
          </div>
        ) : (
          <>
            {/* Legend */}
            <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1rem", fontSize: "0.8rem", flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <div style={{ width: "12px", height: "12px", backgroundColor: "#e11d48", borderRadius: "2px" }} />
                <span><strong>Red:</strong> Cut Line ({describeSize(resolvedWidth, resolvedHeight)})</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <div style={{ width: "12px", height: "12px", border: "2px dashed #15803d", borderRadius: "2px" }} />
                <span><strong>Green Dashed:</strong> Safe Margin</span>
              </div>
              <div style={{ marginLeft: "auto", fontSize: "0.75rem", color: "hsl(var(--muted-hsl))" }}>
                Bleed: {describeIn(bleedIn)} &bull; Safe: {describeIn(safeInsetIn)}
              </div>
            </div>

            {/* Sheet Selector for Multi-Page PDF (Front / Back) */}
            {isPdf && pdfNumPages >= 2 && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "hsl(var(--muted-hsl))", marginRight: "0.25rem" }}>
                  Inspecting Page:
                </span>
                <button
                  type="button"
                  onClick={() => setActiveSheet(0)}
                  style={{
                    padding: "0.35rem 1rem",
                    fontSize: "0.8rem",
                    fontWeight: 800,
                    borderRadius: "6px",
                    border: "1.5px solid",
                    borderColor: activeSheet === 0 ? "hsl(var(--accent-hsl))" : "hsl(var(--border-hsl))",
                    backgroundColor: activeSheet === 0 ? "hsl(var(--accent-hsl))" : "#ffffff",
                    color: activeSheet === 0 ? "#ffffff" : "hsl(var(--foreground-hsl))",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                >
                  Front (Page 1)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSheet(1)}
                  style={{
                    padding: "0.35rem 1rem",
                    fontSize: "0.8rem",
                    fontWeight: 800,
                    borderRadius: "6px",
                    border: "1.5px solid",
                    borderColor: activeSheet === 1 ? "hsl(var(--accent-hsl))" : "hsl(var(--border-hsl))",
                    backgroundColor: activeSheet === 1 ? "hsl(var(--accent-hsl))" : "#ffffff",
                    color: activeSheet === 1 ? "#ffffff" : "hsl(var(--foreground-hsl))",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                >
                  Back (Page 2)
                </button>
                {pdfNumPages > 2 && Array.from({ length: pdfNumPages - 2 }).map((_, i) => {
                  const pIdx = i + 2;
                  return (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => setActiveSheet(pIdx)}
                      style={{
                        padding: "0.35rem 0.85rem",
                        fontSize: "0.8rem",
                        fontWeight: 800,
                        borderRadius: "6px",
                        border: "1.5px solid",
                        borderColor: activeSheet === pIdx ? "hsl(var(--accent-hsl))" : "hsl(var(--border-hsl))",
                        backgroundColor: activeSheet === pIdx ? "hsl(var(--accent-hsl))" : "#ffffff",
                        color: activeSheet === pIdx ? "#ffffff" : "hsl(var(--foreground-hsl))",
                        cursor: "pointer",
                        transition: "all 0.15s ease"
                      }}
                    >
                      Page {pIdx + 1}
                    </button>
                  );
                })}
              </div>
            )}

            {/*
              ════════════════════════════════════════════════════
              PROOF VIEWPORT — dark bg
              Inside is the PRODUCT FRAME with a fixed aspect-ratio
              matching the print product dimensions (incl. bleed).
              Artwork is positioned absolutely inside and contained,
              so a square image never distorts a landscape card frame.
              Guides are expressed as % of the product frame.
              ════════════════════════════════════════════════════
            */}
            <div style={{
              width: "100%",
              backgroundColor: "#0f172a",
              borderRadius: "var(--radius-md)",
              border: "1px solid hsl(var(--border-hsl))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "2.75rem 2rem",
              overflow: "hidden"
            }}>
              {/* Product frame — dynamically matching actual rendered artwork aspect ratio */}
              <div style={{
                position: "relative",
                aspectRatio: dynamicAspectRatio,
                maxWidth: "100%",
                maxHeight: "360px",
                width: `min(100%, calc(360px * (${frameW} / ${frameH})))`,
                height: "auto",
                backgroundColor: fileHasBleed ? "#ffffff" : "#F8FAFC",
                backgroundImage: !fileHasBleed ? "repeating-linear-gradient(45deg, #F1F5F9, #F1F5F9 10px, #E2E8F0 10px, #E2E8F0 20px)" : undefined,
                boxShadow: "0 10px 35px rgba(0,0,0,0.65)",
                flexShrink: 0,
                overflow: "hidden"
              }}>
                {/* Missing bleed indicator badge if file has no bleed */}
                {!fileHasBleed && (
                  <div style={{
                    position: "absolute",
                    top: "6px",
                    left: "6px",
                    fontSize: "0.62rem",
                    fontWeight: 800,
                    color: "#B45309",
                    backgroundColor: "rgba(254, 243, 199, 0.95)",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    zIndex: 5,
                    pointerEvents: "none",
                    border: "1px dashed #F59E0B"
                  }}>
                    Bleed Area ({describeIn(bleedIn)} Margin)
                  </div>
                )}

                {/* Artwork canvas container — displays full artwork uncropped */}
                <div style={{
                  position: "absolute",
                  left: fileHasBleed ? 0 : guides.cut.left,
                  top: fileHasBleed ? 0 : guides.cut.top,
                  width: fileHasBleed ? "100%" : guides.cut.width,
                  height: fileHasBleed ? "100%" : guides.cut.height,
                  overflow: "hidden",
                  backgroundColor: "#ffffff",
                  boxShadow: !fileHasBleed ? "0 0 10px rgba(0,0,0,0.15)" : "none"
                }}>
                  {/* Image artwork — full bleed or placed inside cut box */}
                  {isImage && (
                    <img
                      src={activeUrl}
                      alt="Uploaded Artwork"
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "fill",
                        objectPosition: "center"
                      }}
                    />
                  )}

                  {/* PDF artwork — exact page rasterized to high-res canvas */}
                  {isPdf && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {pdfRendering && (
                        <div style={{
                          position: "absolute", inset: 0, zIndex: 5,
                          display: "flex", flexDirection: "column",
                          alignItems: "center", justifyContent: "center",
                          backgroundColor: "rgba(248, 250, 252, 0.85)", gap: "0.6rem"
                        }}>
                          <RefreshCw size={28} className="animate-spin" style={{ color: "hsl(var(--accent-hsl))" }} />
                          <p style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 700 }}>
                            Extracting {activeSheet === 0 ? "Front Page" : activeSheet === 1 ? "Back Page" : `Page ${activeSheet + 1}`}…
                          </p>
                        </div>
                      )}

                      {pdfError ? (
                        <div style={{
                          position: "absolute", inset: 0,
                          display: "flex", flexDirection: "column",
                          alignItems: "center", justifyContent: "center",
                          gap: "0.65rem", padding: "1.25rem", textAlign: "center",
                          backgroundColor: "#f8fafc"
                        }}>
                          <FileText size={36} style={{ color: "#7C3AED" }} />
                          <div>
                            <p style={{ fontWeight: 800, fontSize: "0.85rem", color: "#1e293b", marginBottom: "0.2rem" }}>PDF Attached</p>
                            <p style={{ fontSize: "0.68rem", color: "#64748B", wordBreak: "break-all", maxWidth: "200px" }}>{activeFileName}</p>
                          </div>
                          <a href={activeUrl} target="_blank" rel="noopener noreferrer"
                            className="btn btn-outline"
                            style={{ fontSize: "0.72rem", padding: "0.3rem 0.65rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                            <ExternalLink size={11} /> Open PDF Directly
                          </a>
                        </div>
                      ) : (
                        <canvas
                          ref={canvasRef}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "fill",
                            display: "block"
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Cut Line overlay (Red) — matching exact print cut line and Image 2 styling */}
                <div style={{
                  position: "absolute",
                  left: guides.cut.left, top: guides.cut.top,
                  width: guides.cut.width, height: guides.cut.height,
                  border: "1px solid #e11d48",
                  boxShadow: "0 0 0 1px rgba(255,255,255,0.92)",
                  pointerEvents: "none",
                  zIndex: 10
                }}>
                  <span style={{
                    position: "absolute",
                    top: 0,
                    left: "50%",
                    transform: "translate(-50%, -100%)",
                    backgroundColor: "#ffffff",
                    color: "#e11d48",
                    border: "1px solid rgba(225, 29, 72, 0.45)",
                    borderBottom: "none",
                    borderRadius: "4px 4px 0 0",
                    fontSize: "0.62rem",
                    fontWeight: 900,
                    padding: "0.15rem 0.55rem",
                    whiteSpace: "nowrap",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
                    zIndex: 20
                  }}>
                    Cut Edge: {describeSize(resolvedWidth, resolvedHeight)}
                  </span>
                </div>

                {/* Safe Area overlay (Green dashed) — matching Image 2 styling */}
                <div style={{
                  position: "absolute",
                  left: guides.safe.left, top: guides.safe.top,
                  width: guides.safe.width, height: guides.safe.height,
                  border: "1px dashed #15803d",
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.92)",
                  pointerEvents: "none",
                  zIndex: 10
                }}>
                  <span style={{
                    position: "absolute",
                    bottom: 0,
                    left: "50%",
                    transform: "translate(-50%, 100%)",
                    backgroundColor: "#ffffff",
                    color: "#15803d",
                    border: "1px solid rgba(21, 128, 61, 0.45)",
                    borderTop: "none",
                    borderRadius: "0 0 4px 4px",
                    fontSize: "0.62rem",
                    fontWeight: 900,
                    padding: "0.15rem 0.55rem",
                    whiteSpace: "nowrap",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
                    zIndex: 20
                  }}>
                    Safe Area ({describeIn(safeInsetIn)} inset)
                  </span>
                </div>
              </div>
            </div>

            {/* PDF note */}
            {isPdf && (
              <div style={{
                marginTop: "0.75rem",
                padding: "0.6rem 0.85rem",
                backgroundColor: "#fefce8",
                border: "1px solid #fde68a",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.78rem", color: "#92400e",
                display: "flex", alignItems: "flex-start", gap: "0.5rem"
              }}>
                <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: "1px", color: "#d97706" }} />
                <span>
                  <strong>PDF files</strong> may not render inline due to browser security policies. Use{" "}
                  <a href={activeUrl} target="_blank" rel="noopener noreferrer"
                    style={{ color: "#7C3AED", textDecoration: "underline" }}>Open Full Size</a>{" "}
                  to verify your artwork, bleed ({describeIn(bleedIn)}), and safe area ({describeIn(safeInsetIn)} inset from cut) before approving.
                </span>
              </div>
            )}

            {/* Preflight Quality & Dimension Check Panel */}
            <div style={{ marginTop: "1rem" }}>
              {preflight.issues && preflight.issues.length > 0 ? (
                <div style={{
                  padding: "0.85rem 1.15rem",
                  backgroundColor: "#FFFBEB",
                  border: "1.5px solid #F59E0B",
                  borderRadius: "var(--radius-md)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#92400E" }}>
                    <AlertTriangle size={18} style={{ flexShrink: 0, color: "#D97706" }} />
                    <h4 style={{ margin: 0, fontWeight: 800, fontSize: "0.9rem" }}>
                      Artwork Preflight Advisory
                    </h4>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "#78350F", lineHeight: 1.45 }}>
                    Please review the print notices below before approving. You may proceed and approve with this file, or close this window to upload a revised file.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginTop: "0.2rem" }}>
                    {preflight.issues.map((issue, idx) => (
                      <div key={idx} style={{
                        padding: "0.5rem 0.75rem",
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #FDE68A",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "0.78rem"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontWeight: 800, color: "#92400E", marginBottom: "0.15rem" }}>
                          <AlertTriangle size={13} style={{ color: "#D97706" }} />
                          {issue.title}
                        </div>
                        <p style={{ margin: "0 0 0.2rem 0", color: "#4B5563", lineHeight: 1.4 }}>{issue.message}</p>
                        <p style={{ margin: 0, fontWeight: 600, color: "#1D4ED8" }}>💡 {issue.recommendation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (imageDimensions.width > 0 || isPdf) ? (
                <div style={{
                  padding: "0.75rem 1rem",
                  backgroundColor: "#F0FDF4",
                  border: "1px solid #86EFAC",
                  borderRadius: "var(--radius-md)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  fontSize: "0.82rem",
                  color: "#166534"
                }}>
                  <CheckCircle2 size={18} style={{ color: "#16A34A", flexShrink: 0 }} />
                  <span>
                    <strong>Artwork Verified:</strong> Dimensions &amp; aspect ratio match the required size. Suitable for commercial print.
                  </span>
                </div>
              ) : null}
            </div>

            {/* Artwork specs */}
            <div style={{ marginTop: "1.1rem", padding: "0.85rem 1rem", backgroundColor: "hsl(var(--secondary-hsl) / 0.3)", borderRadius: "var(--radius-sm)", fontSize: "0.85rem" }}>
              <p style={{ fontWeight: 700, marginBottom: "0.2rem" }}>Artwork Details</p>
              <p style={{ color: "hsl(var(--muted-hsl))" }}>
                File: <strong>{activeFileName}</strong> &bull; Finished Size: <strong>{describeSize(resolvedWidth, resolvedHeight)}</strong> &bull; Full Sheet (incl. bleed): <strong>{describeSize(frameW, frameH)}</strong>
              </p>
            </div>

            {/* Approval checkbox */}
            <div style={{
              marginTop: "1.25rem",
              padding: "1rem",
              border: "2px solid hsl(var(--accent-hsl) / 0.4)",
              backgroundColor: "hsl(var(--accent-hsl) / 0.05)",
              borderRadius: "var(--radius-md)"
            }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={approved}
                  onChange={(e) => setApproved(e.target.checked)}
                  style={{ width: "20px", height: "20px", marginTop: "0.15rem", accentColor: "hsl(var(--accent-hsl))", cursor: "pointer" }}
                />
                <div style={{ fontSize: "0.9rem", lineHeight: "1.5" }}>
                  <span style={{ fontWeight: 800, color: "hsl(var(--primary-hsl))" }}>
                    I have inspected and approve this print proof for production.
                  </span>
                  <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.8rem", marginTop: "0.2rem" }}>
                    {preflight.issues && preflight.issues.length > 0 ? (
                      <span style={{ color: "#92400E", fontWeight: 600 }}>
                        I acknowledge the print advisory notices above and confirm I want this artwork printed as shown.
                      </span>
                    ) : (
                      <>
                        By checking this box, you confirm all text, logos, and bleed edges inside the cut &amp; safe lines are aligned correctly.
                        {isPdf && " For PDFs, please verify alignment before approving."}
                      </>
                    )}
                  </p>
                </div>
              </label>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.5rem" }}>
              <button type="button" onClick={onClose} className="btn btn-outline">Cancel</button>
              <button type="button" onClick={handleConfirm} disabled={!approved} className="btn btn-primary"
                style={{ padding: "0.75rem 1.75rem", opacity: approved ? 1 : 0.5, cursor: approved ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <FileCheck size={18} /> Confirm &amp; Approve Proof
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
