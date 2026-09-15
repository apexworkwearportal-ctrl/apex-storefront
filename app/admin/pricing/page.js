"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Save, Loader2, Plus, Trash2, CheckCircle2, DollarSign, Percent, Settings2 } from "lucide-react";

export default function AdminPricingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [globalMarkupType, setGlobalMarkupType] = useState("percentage"); // "percentage" or "tiers"
  const [defaultMarkupPercent, setDefaultMarkupPercent] = useState(30);
  const [defaultSetupCharge, setDefaultSetupCharge] = useState(0);
  const [quantityTiers, setQuantityTiers] = useState([
    { minQty: 1, maxQty: 25, markupPercent: 45 },
    { minQty: 26, maxQty: 100, markupPercent: 35 },
    { minQty: 101, maxQty: 500, markupPercent: 25 },
    { minQty: 501, maxQty: 99999, markupPercent: 20 }
  ]);

  useEffect(() => {
    const fetchPricingSettings = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, "settings", "pricing");
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.globalMarkupType) setGlobalMarkupType(data.globalMarkupType);
          if (data.defaultMarkupPercent !== undefined) setDefaultMarkupPercent(data.defaultMarkupPercent);
          if (data.defaultSetupCharge !== undefined) setDefaultSetupCharge(data.defaultSetupCharge);
          if (data.quantityTiers && Array.isArray(data.quantityTiers)) setQuantityTiers(data.quantityTiers);
        }
      } catch (err) {
        console.error("Failed to load pricing settings:", err);
        setError("Failed to load pricing settings.");
      } finally {
        setLoading(false);
      }
    };

    fetchPricingSettings();
  }, []);

  const addTierRow = () => {
    const lastTier = quantityTiers[quantityTiers.length - 1];
    const newMin = lastTier ? lastTier.maxQty + 1 : 1;
    setQuantityTiers(prev => [
      ...prev,
      { minQty: newMin, maxQty: newMin + 50, markupPercent: 20 }
    ]);
  };

  const removeTierRow = (index) => {
    setQuantityTiers(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleTierChange = (index, field, value) => {
    setQuantityTiers(prev => prev.map((t, idx) => {
      if (idx === index) {
        return {
          ...t,
          [field]: parseFloat(value) || 0
        };
      }
      return t;
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError("");

    try {
      const docRef = doc(db, "settings", "pricing");
      const payload = {
        globalMarkupType,
        defaultMarkupPercent: parseFloat(defaultMarkupPercent) || 0,
        defaultSetupCharge: parseFloat(defaultSetupCharge) || 0,
        quantityTiers,
        updatedAt: new Date()
      };

      await setDoc(docRef, payload, { merge: true });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save pricing settings:", err);
      setError(err.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "4rem", color: "hsl(var(--muted-hsl))" }}>
        Loading pricing & markup settings...
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", color: "hsl(var(--accent-hsl))", letterSpacing: "0.05em", display: "block", marginBottom: "0.25rem" }}>
            Costing & Revenue Engine
          </span>
          <h1 style={{ fontSize: "2rem", fontWeight: 900, marginBottom: "0.25rem", color: "hsl(var(--primary-hsl))", letterSpacing: "-0.02em" }}>
            Sitewise Dynamic Markup & Pricing Rules
          </h1>
          <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.95rem", fontWeight: 500 }}>
            Configure global markup formulas over 3rd party API base costs. Overridden by Category or Product rules if set.
          </p>
        </div>
        <button
          onClick={handleSave}
          className="btn btn-primary"
          disabled={saving}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.5rem" }}
        >
          {saving ? <Loader2 size={18} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} /> : <Save size={18} />}
          {saving ? "Saving Pricing Settings..." : "Save Pricing Rules"}
        </button>
      </div>

      {success && (
        <div className="card" style={{ borderColor: "hsl(var(--success-hsl))", backgroundColor: "hsl(var(--success-hsl) / 0.05)", padding: "1rem 1.5rem", marginBottom: "1.5rem", color: "hsl(var(--success-hsl))", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <CheckCircle2 size={18} /> Sitewise pricing rules saved successfully!
        </div>
      )}

      {error && (
        <div className="card" style={{ borderColor: "hsl(var(--destructive-hsl))", backgroundColor: "hsl(var(--destructive-hsl) / 0.05)", padding: "1rem 1.5rem", marginBottom: "1.5rem", color: "hsl(var(--destructive-hsl))", fontWeight: 600 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "2rem" }}>
        {/* Left Column: Formulas & Rules */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Rule Type Selector */}
          <div className="card">
            <h2 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Settings2 size={18} /> Global Formula Type
            </h2>
            <p style={{ fontSize: "0.85rem", color: "hsl(var(--muted-hsl))", marginBottom: "1rem" }}>
              Choose how the default sitewise markup is applied over third-party API base costs.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <label
                style={{
                  padding: "1rem",
                  borderRadius: "var(--radius-md)",
                  border: globalMarkupType === "percentage" ? "2px solid hsl(var(--accent-hsl))" : "1px solid hsl(var(--border-hsl))",
                  backgroundColor: globalMarkupType === "percentage" ? "hsl(var(--accent-hsl) / 0.05)" : "white",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <input
                    type="radio"
                    name="markupType"
                    checked={globalMarkupType === "percentage"}
                    onChange={() => setGlobalMarkupType("percentage")}
                  />
                  <span style={{ fontWeight: 800, fontSize: "0.95rem" }}>Flat Markup %</span>
                </div>
                <span style={{ fontSize: "0.8rem", color: "hsl(var(--muted-hsl))" }}>
                  Applies a fixed percentage markup across all quantities.
                </span>
              </label>

              <label
                style={{
                  padding: "1rem",
                  borderRadius: "var(--radius-md)",
                  border: globalMarkupType === "tiers" ? "2px solid hsl(var(--accent-hsl))" : "1px solid hsl(var(--border-hsl))",
                  backgroundColor: globalMarkupType === "tiers" ? "hsl(var(--accent-hsl) / 0.05)" : "white",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <input
                    type="radio"
                    name="markupType"
                    checked={globalMarkupType === "tiers"}
                    onChange={() => setGlobalMarkupType("tiers")}
                  />
                  <span style={{ fontWeight: 800, fontSize: "0.95rem" }}>Quantity Tiers</span>
                </div>
                <span style={{ fontSize: "0.8rem", color: "hsl(var(--muted-hsl))" }}>
                  Higher quantity orders get lower markup rates (volume discounts).
                </span>
              </label>
            </div>
          </div>

          {/* Base Configuration */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 800 }}>Default Values</h2>

            <div>
              <label className="label">Default Sitewise Markup (% Over API Cost)</label>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="number"
                  step="0.1"
                  className="input"
                  value={defaultMarkupPercent}
                  onChange={(e) => setDefaultMarkupPercent(e.target.value)}
                  required
                />
                <Percent size={18} style={{ color: "hsl(var(--muted-hsl))" }} />
              </div>
              <span style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))", marginTop: "0.25rem", display: "block" }}>
                E.g. 30% markup means a $10.00 base cost sells for $13.00 CAD.
              </span>
            </div>

            <div>
              <label className="label">Fixed Setup Charge ($ CAD)</label>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={defaultSetupCharge}
                  onChange={(e) => setDefaultSetupCharge(e.target.value)}
                />
                <DollarSign size={18} style={{ color: "hsl(var(--muted-hsl))" }} />
              </div>
              <span style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))", marginTop: "0.25rem", display: "block" }}>
                Optional fixed charge added to calculated prices.
              </span>
            </div>
          </div>

          {/* Quantity Tier Matrix (If enabled) */}
          {globalMarkupType === "tiers" && (
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div>
                  <h2 style={{ fontSize: "1.2rem", fontWeight: 800 }}>Quantity Tier Table</h2>
                  <p style={{ fontSize: "0.8rem", color: "hsl(var(--muted-hsl))" }}>
                    Configure dynamic markups based on ordered quantity ranges.
                  </p>
                </div>
                <button type="button" onClick={addTierRow} className="btn btn-outline" style={{ padding: "0.4rem 0.85rem", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <Plus size={14} /> Add Tier
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {quantityTiers.map((tier, idx) => (
                  <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "0.75rem", alignItems: "center", backgroundColor: "hsl(var(--secondary-hsl) / 0.2)", padding: "0.75rem", borderRadius: "var(--radius-sm)" }}>
                    <div>
                      <label className="label" style={{ fontSize: "0.7rem" }}>Min Qty</label>
                      <input
                        type="number"
                        className="input"
                        value={tier.minQty}
                        onChange={(e) => handleTierChange(idx, "minQty", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="label" style={{ fontSize: "0.7rem" }}>Max Qty</label>
                      <input
                        type="number"
                        className="input"
                        value={tier.maxQty}
                        onChange={(e) => handleTierChange(idx, "maxQty", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="label" style={{ fontSize: "0.7rem" }}>Markup %</label>
                      <input
                        type="number"
                        step="0.1"
                        className="input"
                        value={tier.markupPercent}
                        onChange={(e) => handleTierChange(idx, "markupPercent", e.target.value)}
                      />
                    </div>
                    {quantityTiers.length > 1 && (
                      <button type="button" onClick={() => removeTierRow(idx)} className="btn btn-outline" style={{ padding: "0.5rem", color: "hsl(var(--destructive-hsl))", marginTop: "1rem" }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Pricing Hierarchy Explanation */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="card" style={{ backgroundColor: "hsl(var(--secondary-hsl) / 0.3)" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "1rem", color: "hsl(var(--primary-hsl))" }}>
              Pricing Rule Hierarchy
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", fontSize: "0.85rem", lineHeight: "1.5" }}>
              <div style={{ padding: "0.75rem", backgroundColor: "white", borderRadius: "var(--radius-sm)", borderLeft: "4px solid hsl(var(--accent-hsl))" }}>
                <p style={{ fontWeight: 800 }}>1. Product-Level Override</p>
                <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.8rem", marginTop: "0.2rem" }}>
                  If a product has custom markup rules configured in product editor, it takes top priority.
                </p>
              </div>

              <div style={{ padding: "0.75rem", backgroundColor: "white", borderRadius: "var(--radius-sm)", borderLeft: "4px solid hsl(var(--primary-hsl))" }}>
                <p style={{ fontWeight: 800 }}>2. Category-Level Override</p>
                <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.8rem", marginTop: "0.2rem" }}>
                  If no product rule exists, its category markup settings are used.
                </p>
              </div>

              <div style={{ padding: "0.75rem", backgroundColor: "white", borderRadius: "var(--radius-sm)", borderLeft: "4px solid hsl(var(--success-hsl))" }}>
                <p style={{ fontWeight: 800 }}>3. Sitewise Default (This Page)</p>
                <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.8rem", marginTop: "0.2rem" }}>
                  Serves as the global fallback formula for all third-party API and catalog prices.
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
