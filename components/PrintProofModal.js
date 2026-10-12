"use client";

import { useState, useEffect } from "react";
import { X, CheckCircle2, AlertTriangle, Eye, ShieldCheck, FileCheck, ExternalLink } from "lucide-react";
import { computeGuides, describeSize, describeIn } from "@/lib/proof-geometry";

/**
 * Customer Interactive Print Proof & Preflight Inspection Modal (Pure JS/JSX)
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

  // Resolve active URL from any provided prop format
  const activeUrl = fileUrl || artworkUrl || (typeof artworkFile === "string" ? artworkFile : artworkFile?.url) || "";
  const activeFileName = (typeof artworkFile === "object" && artworkFile?.name) ? artworkFile.name : fileName;

  // Attempt to parse width and height dynamically if productSpecs contains Size
  let resolvedWidth = finishedWidthIn;
  let resolvedHeight = finishedHeightIn;
  if (productSpecs && typeof productSpecs === "object") {
    const sizeStr = String(productSpecs.Size || productSpecs.size || productSpecs["Sides / Pages"] || "");
    const match = sizeStr.match(/(\d+(?:\.\d+)?)\s*["']?\s*[xX×]\s*(\d+(?:\.\d+)?)/);
    if (match) {
      resolvedWidth = parseFloat(match[1]);
      resolvedHeight = parseFloat(match[2]);
    }
  }

  const isPdf = activeUrl.toLowerCase().includes(".pdf") || activeFileName.toLowerCase().endsWith(".pdf");

  useEffect(() => {
    setApproved(false);
  }, [activeUrl, isOpen]);

  if (!isOpen) return null;

  const guides = computeGuides({
    finishedWidthIn: resolvedWidth,
    finishedHeightIn: resolvedHeight,
    bleedIn,
    safeInsetIn
  });

  const handleConfirm = () => {
    if (!approved) return;
    const approvalData = {
      fileUrl: activeUrl,
      fileName: activeFileName,
      approvedAt: new Date().toISOString(),
      finishedSize: `${resolvedWidth}" × ${resolvedHeight}"`
    };
    if (typeof onApproveProof === "function") {
      onApproveProof(approvalData);
    } else if (typeof onApprove === "function") {
      onApprove(approvalData);
    }
    onClose();
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.75)",
      backdropFilter: "blur(6px)",
      zIndex: 1100,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "1.5rem"
    }}>
      <div className="card" style={{
        width: "100%",
        maxWidth: "760px",
        maxHeight: "92vh",
        overflowY: "auto",
        backgroundColor: "white",
        borderRadius: "var(--radius-lg)",
        padding: "2rem",
        position: "relative",
        boxShadow: "0 20px 40px rgba(0,0,0,0.3)"
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: "1px solid hsl(var(--border-hsl))", paddingBottom: "1rem" }}>
          <div>
            <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", color: "hsl(var(--accent-hsl))", letterSpacing: "0.05em" }}>
              Live Print Proof Inspection
            </span>
            <h2 style={{ fontSize: "1.35rem", fontWeight: 900, color: "hsl(var(--primary-hsl))", display: "flex", alignItems: "center", gap: "0.5rem", margin: "0.2rem 0 0 0" }}>
              <ShieldCheck size={22} style={{ color: "hsl(var(--success-hsl))" }} /> Inspect Artwork Print Proof
            </h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {activeUrl && (
              <a
                href={activeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline"
                style={{ fontSize: "0.75rem", padding: "0.3rem 0.65rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
              >
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
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "hsl(var(--primary-hsl))" }}>No Artwork File Available</h3>
            <p style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
              Please select or upload your print-ready file to inspect bleed margins and cut lines.
            </p>
            <button type="button" onClick={onClose} className="btn btn-primary" style={{ marginTop: "1rem" }}>
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Legend */}
            <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1rem", fontSize: "0.8rem", flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <div style={{ width: "12px", height: "12px", backgroundColor: "#e11d48", borderRadius: "2px" }} />
                <span><strong>Red Line:</strong> Cut Line ({describeSize(resolvedWidth, resolvedHeight)})</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <div style={{ width: "12px", height: "12px", border: "2px dashed #15803d", borderRadius: "2px" }} />
                <span><strong>Green Dashed Line:</strong> Safe Margin Area</span>
              </div>
              <div style={{ marginLeft: "auto", fontSize: "0.75rem", color: "hsl(var(--muted-hsl))" }}>
                Bleed: {describeIn(bleedIn)}
              </div>
            </div>

            {/* Proof Preview Viewport */}
            <div style={{
              position: "relative",
              width: "100%",
              minHeight: "360px",
              backgroundColor: "#0f172a",
              borderRadius: "var(--radius-md)",
              border: "1px solid hsl(var(--border-hsl))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "2rem",
              overflow: "hidden"
            }}>
              {/* Artwork Container */}
              <div style={{
                position: "relative",
                maxWidth: "100%",
                maxHeight: "350px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                backgroundColor: "white",
                display: "inline-block"
              }}>
                {isPdf ? (
                  <div style={{ width: "420px", maxWidth: "100%", height: "280px", position: "relative", backgroundColor: "#ffffff" }}>
                    <object
                      data={activeUrl}
                      type="application/pdf"
                      style={{ width: "100%", height: "100%", border: "none" }}
                    >
                      <div style={{ padding: "2.5rem 1.5rem", textAlign: "center", color: "#64748B" }}>
                        <p style={{ fontWeight: 700, marginBottom: "0.5rem" }}>PDF Proof Document</p>
                        <p style={{ fontSize: "0.75rem", marginBottom: "1rem" }}>{activeFileName}</p>
                        <a
                          href={activeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-primary"
                          style={{ fontSize: "0.8rem", padding: "0.4rem 0.85rem" }}
                        >
                          View PDF In Browser <ExternalLink size={12} />
                        </a>
                      </div>
                    </object>
                  </div>
                ) : (
                  <img
                    src={activeUrl}
                    alt="Uploaded Artwork Proof"
                    style={{ display: "block", maxWidth: "100%", maxHeight: "320px", objectFit: "contain" }}
                  />
                )}

                {/* Overlaid Cut Line (Red) */}
                <div style={{
                  position: "absolute",
                  left: guides.cut.left,
                  top: guides.cut.top,
                  width: guides.cut.width,
                  height: guides.cut.height,
                  border: "2px solid #e11d48",
                  boxShadow: "0 0 0 1px rgba(255,255,255,0.9)",
                  pointerEvents: "none"
                }}>
                  <span style={{
                    position: "absolute",
                    top: "-18px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    backgroundColor: "#e11d48",
                    color: "white",
                    fontSize: "0.65rem",
                    fontWeight: 800,
                    padding: "0.1rem 0.4rem",
                    borderRadius: "3px",
                    whiteSpace: "nowrap"
                  }}>
                    Cut Edge: {describeSize(resolvedWidth, resolvedHeight)}
                  </span>
                </div>

                {/* Overlaid Safe Area Line (Green) */}
                <div style={{
                  position: "absolute",
                  left: guides.safe.left,
                  top: guides.safe.top,
                  width: guides.safe.width,
                  height: guides.safe.height,
                  border: "2px dashed #15803d",
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.9)",
                  pointerEvents: "none"
                }}>
                  <span style={{
                    position: "absolute",
                    bottom: "-18px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    backgroundColor: "#15803d",
                    color: "white",
                    fontSize: "0.65rem",
                    fontWeight: 800,
                    padding: "0.1rem 0.4rem",
                    borderRadius: "3px",
                    whiteSpace: "nowrap"
                  }}>
                    Safe Area ({describeIn(safeInsetIn)} Inset)
                  </span>
                </div>
              </div>
            </div>

            {/* File Specs Summary */}
            <div style={{ marginTop: "1.25rem", padding: "0.85rem 1rem", backgroundColor: "hsl(var(--secondary-hsl) / 0.3)", borderRadius: "var(--radius-sm)", fontSize: "0.85rem" }}>
              <p style={{ fontWeight: 700 }}>Artwork Details:</p>
              <p style={{ color: "hsl(var(--muted-hsl))", marginTop: "0.2rem" }}>
                File: <strong>{activeFileName}</strong> • Finished Size: <strong>{describeSize(resolvedWidth, resolvedHeight)}</strong> • Bleed: <strong>{describeIn(bleedIn)}</strong>
              </p>
            </div>

            {/* Mandatory Customer Approval Checkbox */}
            <div style={{ marginTop: "1.5rem", padding: "1rem", border: "2px solid hsl(var(--accent-hsl) / 0.4)", backgroundColor: "hsl(var(--accent-hsl) / 0.05)", borderRadius: "var(--radius-md)" }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={approved}
                  onChange={(e) => setApproved(e.target.checked)}
                  style={{ width: "20px", height: "20px", marginTop: "0.15rem", accentColor: "hsl(var(--accent-hsl))" }}
                />
                <div style={{ fontSize: "0.9rem", lineHeight: "1.5" }}>
                  <span style={{ fontWeight: 800, color: "hsl(var(--primary-hsl))" }}>
                    I have inspected and approve this print proof for production.
                  </span>
                  <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.8rem", marginTop: "0.2rem" }}>
                    By checking this box, you confirm that all text, logos, and bleed edges inside the cut & safe lines are aligned correctly.
                  </p>
                </div>
              </label>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.5rem" }}>
              <button type="button" onClick={onClose} className="btn btn-outline">Cancel</button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!approved}
                className="btn btn-primary"
                style={{ padding: "0.75rem 1.75rem", opacity: approved ? 1 : 0.5, cursor: approved ? "pointer" : "not-allowed" }}
              >
                <FileCheck size={18} /> Confirm & Approve Proof
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
