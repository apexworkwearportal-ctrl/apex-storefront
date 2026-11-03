"use client";

import { useState, useEffect } from "react";
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
  const [overrideWarning, setOverrideWarning] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  // Resolve active URL/filename
  const activeUrl = fileUrl || artworkUrl || (typeof artworkFile === "string" ? artworkFile : artworkFile?.url) || "";
  const activeFileName = (typeof artworkFile === "object" && artworkFile?.name) ? artworkFile.name : fileName;

  // Parse finished size:
  // 1. Props finishedWidthIn / finishedHeightIn are authoritative (set by parent from selected option).
  // 2. As a secondary fallback, try to parse productSpecs.Size string (e.g. "8.5\" x 11\"").
  //    This covers any other caller that doesn't pass explicit dimension props.
  let resolvedWidth = Number(finishedWidthIn) || 3.5;
  let resolvedHeight = Number(finishedHeightIn) || 2.0;

  if (resolvedWidth === 3.5 && resolvedHeight === 2.0 && productSpecs && typeof productSpecs === "object") {
    // Check if any value in productSpecs has a dimension string (e.g. "8.5\" x 11\"", "24 x 36")
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

  // Detect file type
  const lowerUrl = activeUrl.toLowerCase();
  const lowerName = activeFileName.toLowerCase();
  const isPdf = lowerUrl.includes(".pdf") || lowerName.endsWith(".pdf");
  const isImage = !isPdf;

  // The proof frame aspect ratio includes bleed on all sides
  const mediaW = resolvedWidth + bleedIn * 2;
  const mediaH = resolvedHeight + bleedIn * 2;
  const frameAspectRatio = `${mediaW} / ${mediaH}`;

  useEffect(() => {
    setApproved(false);
    setOverrideWarning(false);
    setIframeError(false);
    setIframeLoaded(false);
    setImageDimensions({ width: 0, height: 0 });

    if (activeUrl && isImage) {
      const img = new Image();
      img.onload = () => {
        setImageDimensions({
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height
        });
      };
      img.src = activeUrl;
    }
  }, [activeUrl, isOpen, isImage]);

  const preflight = analyzeArtworkPreflight({
    imageWidthPx: imageDimensions.width,
    imageHeightPx: imageDimensions.height,
    finishedWidthIn: resolvedWidth,
    finishedHeightIn: resolvedHeight,
    bleedIn,
    fileName: activeFileName
  });

  if (!isOpen) return null;

  const guides = computeGuides({ finishedWidthIn: resolvedWidth, finishedHeightIn: resolvedHeight, bleedIn, safeInsetIn });

  const handleConfirm = () => {
    if (!approved) return;
    const approvalData = {
      fileUrl: activeUrl,
      fileName: activeFileName,
      approvedAt: new Date().toISOString(),
      finishedSize: `${resolvedWidth}" × ${resolvedHeight}"`,
      preflight: {
        pixelDimensions: imageDimensions.width > 0 ? `${imageDimensions.width} × ${imageDimensions.height}` : null,
        effectiveDpi: preflight?.effectiveDpi || null,
        hasWarnings: preflight?.hasWarnings || false,
        hasErrors: preflight?.hasErrors || false,
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
              {/* Product frame — aspect ratio locked to product dimensions */}
              <div style={{
                position: "relative",
                aspectRatio: frameAspectRatio,
                maxWidth: "100%",
                maxHeight: "340px",
                width: `min(100%, calc(340px * (${mediaW} / ${mediaH})))`,
                height: "auto",
                backgroundColor: "#ffffff",
                boxShadow: "0 10px 35px rgba(0,0,0,0.65)",
                flexShrink: 0
              }}>

                {/* Artwork canvas container — clips artwork strictly to the bleed canvas */}
                <div style={{
                  position: "absolute",
                  inset: 0,
                  overflow: "hidden",
                  backgroundColor: "#ffffff"
                }}>
                  {/* Image artwork — contained inside the product frame */}
                  {isImage && (
                    <img
                      src={activeUrl}
                      alt="Uploaded Artwork"
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        objectPosition: "center"
                      }}
                    />
                  )}

                  {/* PDF artwork — iframe with graceful fallback */}
                  {isPdf && (
                    <div style={{ position: "absolute", inset: 0 }}>
                      {!iframeError ? (
                        <>
                          {/* Loading shimmer */}
                          {!iframeLoaded && (
                            <div style={{
                              position: "absolute", inset: 0, zIndex: 1,
                              display: "flex", flexDirection: "column",
                              alignItems: "center", justifyContent: "center",
                              backgroundColor: "#f8fafc", gap: "0.6rem"
                            }}>
                              <FileText size={32} style={{ color: "#7C3AED", opacity: 0.7 }} />
                              <p style={{ fontSize: "0.72rem", color: "#64748B", fontWeight: 700 }}>Loading PDF preview…</p>
                            </div>
                          )}
                          <iframe
                            src={`${activeUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                            title="PDF Proof Preview"
                            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none", backgroundColor: "white" }}
                            onLoad={() => setIframeLoaded(true)}
                            onError={() => setIframeError(true)}
                          />
                        </>
                      ) : (
                        /* Cross-origin fallback card */
                        <div style={{
                          position: "absolute", inset: 0,
                          display: "flex", flexDirection: "column",
                          alignItems: "center", justifyContent: "center",
                          gap: "0.65rem", padding: "1.25rem", textAlign: "center",
                          backgroundColor: "#f8fafc"
                        }}>
                          <FileText size={36} style={{ color: "#7C3AED" }} />
                          <div>
                            <p style={{ fontWeight: 800, fontSize: "0.85rem", color: "#1e293b", marginBottom: "0.2rem" }}>PDF Artwork Attached</p>
                            <p style={{ fontSize: "0.68rem", color: "#64748B", wordBreak: "break-all", maxWidth: "180px" }}>{activeFileName}</p>
                          </div>
                          <a href={activeUrl} target="_blank" rel="noopener noreferrer"
                            className="btn btn-outline"
                            style={{ fontSize: "0.72rem", padding: "0.3rem 0.65rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                            <ExternalLink size={11} /> Open PDF to Inspect
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Cut Line overlay (Red) — z-index above artwork */}
                <div style={{
                  position: "absolute",
                  left: guides.cut.left, top: guides.cut.top,
                  width: guides.cut.width, height: guides.cut.height,
                  border: "2px solid #e11d48",
                  boxShadow: "0 0 0 1px rgba(255,255,255,0.85)",
                  pointerEvents: "none",
                  zIndex: 10
                }}>
                  <span style={{
                    position: "absolute",
                    top: 0,
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    backgroundColor: "#e11d48",
                    color: "white",
                    fontSize: "0.62rem",
                    fontWeight: 800,
                    padding: "0.15rem 0.5rem",
                    borderRadius: "4px",
                    whiteSpace: "nowrap",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
                    zIndex: 20
                  }}>
                    Cut Edge: {describeSize(resolvedWidth, resolvedHeight)}
                  </span>
                </div>

                {/* Safe Area overlay (Green dashed) — z-index above artwork */}
                <div style={{
                  position: "absolute",
                  left: guides.safe.left, top: guides.safe.top,
                  width: guides.safe.width, height: guides.safe.height,
                  border: "2px dashed #15803d",
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.85)",
                  pointerEvents: "none",
                  zIndex: 10
                }}>
                  <span style={{
                    position: "absolute",
                    bottom: 0,
                    left: "50%",
                    transform: "translate(-50%, 50%)",
                    backgroundColor: "#15803d",
                    color: "white",
                    fontSize: "0.62rem",
                    fontWeight: 800,
                    padding: "0.15rem 0.5rem",
                    borderRadius: "4px",
                    whiteSpace: "nowrap",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
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
            {isImage && imageDimensions.width > 0 && (
              <div style={{ marginTop: "1rem" }}>
                {preflight.hasErrors ? (
                  <div style={{
                    padding: "1rem 1.25rem",
                    backgroundColor: "#FEF2F2",
                    border: "2px solid #EF4444",
                    borderRadius: "var(--radius-md)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.6rem"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#B91C1C" }}>
                      <AlertOctagon size={20} style={{ flexShrink: 0 }} />
                      <h4 style={{ margin: 0, fontWeight: 900, fontSize: "0.95rem" }}>
                        Action Required: Artwork Quality / Dimension Mismatch
                      </h4>
                    </div>

                    <p style={{ margin: 0, fontSize: "0.82rem", color: "#7F1D1D", lineHeight: 1.5 }}>
                      We detected critical print specification issues with your file. If printed as-is, your order may look blurry, stretched, or have clipped edges.
                    </p>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.25rem" }}>
                      {preflight.issues.map((issue, idx) => (
                        <div key={idx} style={{
                          padding: "0.65rem 0.85rem",
                          backgroundColor: "#FFFFFF",
                          border: `1px solid ${issue.type === "error" ? "#FCA5A5" : "#FDE68A"}`,
                          borderRadius: "var(--radius-sm)",
                          fontSize: "0.8rem"
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 800, color: issue.type === "error" ? "#B91C1C" : "#92400E", marginBottom: "0.2rem" }}>
                            {issue.type === "error" ? <AlertOctagon size={14} /> : <AlertTriangle size={14} />}
                            {issue.title}
                          </div>
                          <p style={{ margin: "0 0 0.25rem 0", color: "#374151", lineHeight: 1.45 }}>{issue.message}</p>
                          <p style={{ margin: 0, fontWeight: 600, color: "#1D4ED8" }}>💡 {issue.recommendation}</p>
                        </div>
                      ))}
                    </div>

                    {/* Override warning check if user still insists on approving */}
                    <div style={{
                      marginTop: "0.5rem",
                      padding: "0.75rem",
                      backgroundColor: "#FFFBEB",
                      border: "1px dashed #F59E0B",
                      borderRadius: "var(--radius-sm)"
                    }}>
                      <label style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", cursor: "pointer", fontSize: "0.8rem", color: "#78350F" }}>
                        <input
                          type="checkbox"
                          checked={overrideWarning}
                          onChange={(e) => {
                            setOverrideWarning(e.target.checked);
                            if (!e.target.checked) setApproved(false);
                          }}
                          style={{ marginTop: "2px", accentColor: "#DC2626" }}
                        />
                        <span>
                          <strong>I understand the risk:</strong> I acknowledge the low resolution / dimension mismatch and accept that the print may be pixelated, cropped, or have unprinted borders.
                        </span>
                      </label>
                    </div>
                  </div>
                ) : preflight.hasWarnings ? (
                  <div style={{
                    padding: "0.85rem 1.15rem",
                    backgroundColor: "#FFFBEB",
                    border: "1.5px solid #F59E0B",
                    borderRadius: "var(--radius-md)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.4rem"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#92400E" }}>
                      <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                      <h4 style={{ margin: 0, fontWeight: 800, fontSize: "0.9rem" }}>
                        Print Quality Advisory
                      </h4>
                    </div>
                    {preflight.issues.map((issue, idx) => (
                      <p key={idx} style={{ margin: 0, fontSize: "0.8rem", color: "#78350F", lineHeight: 1.45 }}>
                        {issue.message} <strong>Tip:</strong> {issue.recommendation}
                      </p>
                    ))}
                  </div>
                ) : (
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
                      <strong>Artwork Verified:</strong> Dimensions &amp; aspect ratio match the required size ({imageDimensions.width} × {imageDimensions.height} px, ~{preflight.effectiveDpi} DPI). High resolution suitable for 300 DPI print.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Artwork specs */}
            <div style={{ marginTop: "1.1rem", padding: "0.85rem 1rem", backgroundColor: "hsl(var(--secondary-hsl) / 0.3)", borderRadius: "var(--radius-sm)", fontSize: "0.85rem" }}>
              <p style={{ fontWeight: 700, marginBottom: "0.2rem" }}>Artwork Details</p>
              <p style={{ color: "hsl(var(--muted-hsl))" }}>
                File: <strong>{activeFileName}</strong> &bull; Finished Size: <strong>{describeSize(resolvedWidth, resolvedHeight)}</strong> &bull; Bleed Area: <strong>{describeSize(mediaW, mediaH)}</strong>
              </p>
            </div>

            {/* Approval checkbox */}
            <div style={{
              marginTop: "1.4rem",
              padding: "1rem",
              border: `2px solid ${preflight.hasErrors && !overrideWarning ? "rgba(239, 68, 68, 0.4)" : "hsl(var(--accent-hsl) / 0.4)"}`,
              backgroundColor: preflight.hasErrors && !overrideWarning ? "#FEF2F2" : "hsl(var(--accent-hsl) / 0.05)",
              borderRadius: "var(--radius-md)",
              opacity: preflight.hasErrors && !overrideWarning ? 0.65 : 1
            }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", cursor: preflight.hasErrors && !overrideWarning ? "not-allowed" : "pointer" }}>
                <input
                  type="checkbox"
                  checked={approved}
                  disabled={preflight.hasErrors && !overrideWarning}
                  onChange={(e) => setApproved(e.target.checked)}
                  style={{ width: "20px", height: "20px", marginTop: "0.15rem", accentColor: "hsl(var(--accent-hsl))" }}
                />
                <div style={{ fontSize: "0.9rem", lineHeight: "1.5" }}>
                  <span style={{ fontWeight: 800, color: "hsl(var(--primary-hsl))" }}>
                    I have inspected and approve this print proof for production.
                  </span>
                  <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.8rem", marginTop: "0.2rem" }}>
                    {preflight.hasErrors && !overrideWarning ? (
                      <span style={{ color: "#B91C1C", fontWeight: 700 }}>
                        ⚠️ Please change your file or check the risk acknowledgment checkbox above before approving.
                      </span>
                    ) : (
                      <>
                        By checking this box, you confirm all text, logos, and bleed edges inside the cut &amp; safe lines are aligned correctly.
                        {isPdf && " For PDFs, please open the file to verify before approving."}
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
