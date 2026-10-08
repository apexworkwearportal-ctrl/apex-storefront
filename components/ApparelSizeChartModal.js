"use client";

import { X, Ruler, Info, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ApparelSizeChartModal({
  isOpen,
  onClose,
  productName = "Custom Apparel",
  fit = "Semi-fitted",
  sizeChart = null
}) {
  if (!isOpen) return null;

  const defaultTable = [
    { size: "S", chest: "36 - 38\"", length: "28\"", sleeve: "15.5\"" },
    { size: "M", chest: "40 - 42\"", length: "29\"", sleeve: "17\"" },
    { size: "L", chest: "44 - 46\"", length: "30\"", sleeve: "18.5\"" },
    { size: "XL", chest: "48 - 50\"", length: "31\"", sleeve: "20\"" },
    { size: "2XL", chest: "52 - 54\"", length: "32\"", sleeve: "21.5\"" },
    { size: "3XL", chest: "56 - 58\"", length: "33\"", sleeve: "23\"" },
  ];

  const tableData = (sizeChart?.tableData && sizeChart.tableData.length > 0)
    ? sizeChart.tableData
    : defaultTable;

  const isImageOrPdf = (sizeChart?.type === "image" || sizeChart?.type === "pdf") && !!sizeChart?.url;

  return (
    <AnimatePresence>
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(15, 23, 42, 0.7)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "1.25rem"
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "16px",
            maxWidth: "680px",
            width: "100%",
            maxHeight: "90vh",
            overflowY: "auto",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            border: "1px solid #E2E8F0",
            display: "flex",
            flexDirection: "column"
          }}
        >
          {/* Header */}
          <div style={{
            padding: "1.5rem 1.75rem",
            borderBottom: "1px solid #F1F5F9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            backgroundColor: "#F8FAFC"
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.2rem 0.6rem",
                  borderRadius: "100px",
                  backgroundColor: "rgba(37, 99, 235, 0.1)",
                  color: "#2563EB",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.03em"
                }}>
                  <Ruler size={13} /> Size & Measurement Guide
                </span>
                {fit && (
                  <span style={{
                    padding: "0.2rem 0.6rem",
                    borderRadius: "100px",
                    backgroundColor: "#F1F5F9",
                    color: "#475569",
                    fontSize: "0.75rem",
                    fontWeight: 600
                  }}>
                    Fit: {fit}
                  </span>
                )}
              </div>
              <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#0F172A", margin: 0 }}>
                {productName} Sizing Chart
              </h2>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: "#64748B",
                cursor: "pointer",
                padding: "0.4rem",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#E2E8F0"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: "1.75rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {isImageOrPdf ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center" }}>
                {sizeChart.type === "pdf" ? (
                  <div style={{ textAlign: "center", padding: "2rem", backgroundColor: "#F8FAFC", borderRadius: "12px", border: "1px dashed #CBD5E1", width: "100%" }}>
                    <p style={{ fontWeight: 600, color: "#0F172A", marginBottom: "0.75rem" }}>Official Manufacturer Size Specification PDF</p>
                    <a
                      href={sizeChart.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                      style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.6rem 1.25rem", fontSize: "0.9rem" }}
                    >
                      <ExternalLink size={16} /> Open PDF Size Chart
                    </a>
                  </div>
                ) : (
                  <div style={{ width: "100%", borderRadius: "8px", overflow: "hidden", border: "1px solid #E2E8F0" }}>
                    <img
                      src={sizeChart.url}
                      alt="Size Chart"
                      style={{ width: "100%", height: "auto", display: "block" }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div>
                <table style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.9rem",
                  textAlign: "left"
                }}>
                  <thead>
                    <tr style={{ backgroundColor: "#F8FAFC", borderBottom: "2px solid #E2E8F0" }}>
                      <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#0F172A" }}>Size</th>
                      <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#0F172A" }}>Chest (Pit to Pit)</th>
                      <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#0F172A" }}>Body Length (HPS)</th>
                      <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#0F172A" }}>Sleeve Length</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.map((row, idx) => (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: "1px solid #F1F5F9",
                          backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC"
                        }}
                      >
                        <td style={{ padding: "0.75rem 1rem", fontWeight: 800, color: "#2563EB" }}>{row.size}</td>
                        <td style={{ padding: "0.75rem 1rem", color: "#334155" }}>{row.chest || "—"}</td>
                        <td style={{ padding: "0.75rem 1rem", color: "#334155" }}>{row.length || "—"}</td>
                        <td style={{ padding: "0.75rem 1rem", color: "#334155" }}>{row.sleeve || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* How to measure tips */}
            <div style={{
              backgroundColor: "#EFF6FF",
              borderRadius: "12px",
              padding: "1rem 1.25rem",
              border: "1px solid #DBEAFE",
              display: "flex",
              gap: "0.75rem",
              alignItems: "flex-start"
            }}>
              <Info size={20} style={{ color: "#2563EB", flexShrink: 0, marginTop: "0.15rem" }} />
              <div style={{ fontSize: "0.825rem", color: "#1E40AF", lineHeight: 1.5 }}>
                <p style={{ fontWeight: 700, marginBottom: "0.3rem" }}>How to Measure for Best Fit:</p>
                <ul style={{ margin: 0, paddingLeft: "1.2rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                  <li><strong>Chest Width:</strong> Measure flat across the garment, 1 inch below armholes.</li>
                  <li><strong>Body Length:</strong> Measure from highest point of shoulder (HPS) straight down to bottom hem.</li>
                  <li>Measurements are provided in inches and may vary by up to 0.75&quot; due to manufacturing tolerances.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: "1rem 1.75rem",
            borderTop: "1px solid #F1F5F9",
            backgroundColor: "#F8FAFC",
            display: "flex",
            justifyContent: "flex-end"
          }}>
            <button
              onClick={onClose}
              className="btn btn-primary"
              style={{ padding: "0.5rem 1.5rem", fontSize: "0.9rem" }}
            >
              Got It, Close Guide
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
