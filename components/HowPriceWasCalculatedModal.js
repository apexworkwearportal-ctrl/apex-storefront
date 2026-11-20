"use client";

import React, { useEffect } from "react";
import { X, Calculator } from "lucide-react";

/**
 * Modal to display step-by-step breakdown of how a custom print product price was calculated.
 * Mirrors the exact UX and layout provided by the print pricing specification.
 */
export default function HowPriceWasCalculatedModal({ isOpen, onClose, breakdown }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "auto";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !breakdown) return null;

  const steps = breakdown.steps || [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem"
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "540px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid #E2E8F0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <h2
              style={{
                fontSize: "1.15rem",
                fontWeight: 700,
                color: "#0F172A",
                margin: 0
              }}
            >
              How this price was calculated
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "0.4rem",
              borderRadius: "6px",
              color: "#64748B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body - Scrollable Step Breakdown */}
        <div
          style={{
            padding: "1.5rem",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem"
          }}
        >
          {steps.map((item, index) => (
            <div key={index} style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              {/* Formula Badge Row */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    color: "#475569",
                    minWidth: "18px"
                  }}
                >
                  {item.number ?? index + 1}.
                </span>
                <span
                  style={{
                    backgroundColor: "#F1F5F9",
                    color: "#334155",
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    fontSize: "0.82rem",
                    padding: "0.3rem 0.65rem",
                    borderRadius: "6px",
                    fontWeight: 500,
                    letterSpacing: "-0.01em",
                    display: "inline-block",
                    maxWidth: "100%",
                    overflowWrap: "break-word"
                  }}
                >
                  {item.formula}
                </span>
              </div>

              {/* Explanation Text */}
              <div style={{ paddingLeft: "1.75rem" }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.88rem",
                    color: "#475569",
                    lineHeight: 1.55
                  }}
                >
                  {item.explanation}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "1rem 1.5rem",
            borderTop: "1px solid #E2E8F0",
            backgroundColor: "#F8FAFC",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "0.75rem", color: "#64748B" }}>Total Calculated Price</span>
            <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0F172A" }}>
              ${breakdown.finalPrice?.toFixed(2)} CAD
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-primary"
            style={{ padding: "0.5rem 1.25rem", fontSize: "0.85rem" }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
