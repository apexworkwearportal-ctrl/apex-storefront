"use client";

import { useState, useEffect } from "react";
import { X, CheckCircle2, AlertTriangle, Eye, ShieldCheck, FileCheck } from "lucide-react";
import { computeGuides, describeSize, describeIn } from "@/lib/proof-geometry";

/**
 * Customer Interactive Print Proof & Preflight Inspection Modal (Pure JS/JSX)
 */
export default function PrintProofModal({
  isOpen,
  onClose,
  fileUrl,
  artworkUrl,
  fileName = "artwork.pdf",
  finishedWidthIn = 3.5,
  finishedHeightIn = 2.0,
  bleedIn = 0.125,
  safeInsetIn = 0.0625,
  onApproveProof
}) {
  const [approved, setApproved] = useState(false);
  const [activeTab, setActiveTab] = useState("front"); // "front" or "back"
  const activeUrl = fileUrl || artworkUrl;

  useEffect(() => {
    setApproved(false);
  }, [activeUrl, isOpen]);

  if (!isOpen || !activeUrl) return null;

  const guides = computeGuides({ finishedWidthIn, finishedHeightIn, bleedIn, safeInsetIn });

  const handleConfirm = () => {
    if (!approved) return;
    onApproveProof({
      fileUrl,
      fileName,
      approvedAt: new Date().toISOString(),
      finishedSize: `${finishedWidthIn}" × ${finishedHeightIn}"`
    });
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
        maxWidth: "750px",
        maxHeight: "90vh",
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
            <h2 style={{ fontSize: "1.35rem", fontWeight: 900, color: "hsl(var(--primary-hsl))", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <ShieldCheck size={22} style={{ color: "hsl(var(--success-hsl))" }} /> Inspect Artwork Print Proof
            </h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(var(--muted-hsl))", padding: "0.4rem" }}>
            <X size={20} />
          </button>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1rem", fontSize: "0.8rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <div style={{ width: "12px", height: "12px", backgroundColor: "#e11d48", borderRadius: "2px" }} />
            <span><strong>Red Line:</strong> Cut Line ({describeSize(finishedWidthIn, finishedHeightIn)})</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <div style={{ width: "12px", height: "12px", border: "2px dashed #15803d", borderRadius: "2px" }} />
            <span><strong>Green Dashed Line:</strong> Safe Margin Area</span>
          </div>
        </div>

        {/* Proof Preview Viewport */}
        <div style={{
          position: "relative",
          width: "100%",
          minHeight: "360px",
          backgroundColor: "#f8fafc",
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
            maxHeight: "340px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
            backgroundColor: "white",
            display: "inline-block"
          }}>
            <img
              src={activeUrl}
              alt="Uploaded Artwork Proof"
              style={{ display: "block", maxWidth: "100%", maxHeight: "320px", objectFit: "contain" }}
            />

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
                Cut Edge: {describeSize(finishedWidthIn, finishedHeightIn)}
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
            File: <strong>{fileName}</strong> • Finished Size: <strong>{describeSize(finishedWidthIn, finishedHeightIn)}</strong> • Bleed: <strong>{describeIn(bleedIn)}</strong>
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
      </div>
    </div>
  );
}
