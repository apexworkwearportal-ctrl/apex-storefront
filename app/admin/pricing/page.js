"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import {
  Save, Loader2, Plus, Trash2, CheckCircle2, DollarSign, Percent,
  Settings2, Calculator, Sliders, Play, TrendingUp, Tag, Printer, RefreshCw
} from "lucide-react";

// ─── Calculator Tab ─────────────────────────────────────────────────────────
function CalculatorTab({ sitewiseSettings }) {
  const [baseCost, setBaseCost] = useState(10);
  const [quantity, setQuantity] = useState(50);
  const [setupCharge, setSetupCharge] = useState(sitewiseSettings?.defaultSetupCharge || 0);
  const [overrideMarkup, setOverrideMarkup] = useState("");
  const [result, setResult] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [loadingCats, setLoadingCats] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const snap = await getDocs(collection(db, "categories"));
        const list = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        setCategories(list.filter(c => c.useCustomMarkup));
      } catch (e) {
        console.error("Failed to load categories", e);
      } finally {
        setLoadingCats(false);
      }
    };
    fetchCategories();
  }, []);

  const calculate = () => {
    const numBase = parseFloat(baseCost) || 0;
    const numQty = parseInt(quantity) || 1;
    const numSetup = parseFloat(setupCharge) || 0;

    let appliedMarkup = 30;
    let source = "Sitewise Default";

    if (selectedCategory) {
      const cat = categories.find(c => c.id === selectedCategory);
      if (cat && cat.useCustomMarkup) {
        appliedMarkup = parseFloat(cat.markupPercent) || 30;
        source = `Category: ${cat.name}`;
      }
    } else if (overrideMarkup !== "") {
      appliedMarkup = parseFloat(overrideMarkup) || 30;
      source = "Manual Override";
    } else {
      const s = sitewiseSettings;
      if (s?.globalMarkupType === "tiers" && s?.quantityTiers?.length > 0) {
        const tier = s.quantityTiers.find(t => numQty >= parseInt(t.minQty) && numQty <= parseInt(t.maxQty));
        if (tier) {
          appliedMarkup = parseFloat(tier.markupPercent) || 30;
          source = `Tier (${tier.minQty}–${tier.maxQty} units)`;
        } else {
          appliedMarkup = parseFloat(s?.defaultMarkupPercent) || 30;
          source = "Sitewise Default (no matching tier)";
        }
      } else {
        appliedMarkup = parseFloat(s?.defaultMarkupPercent) || 30;
      }
    }

    const markupAmt = numBase * (appliedMarkup / 100);
    const finalPrice = numBase + markupAmt + numSetup;
    const totalRevenue = finalPrice * numQty;
    const totalCost = numBase * numQty;
    const totalProfit = totalRevenue - totalCost - numSetup;
    const marginPct = ((finalPrice - numBase) / finalPrice) * 100;

    setResult({ appliedMarkup, source, markupAmt, finalPrice, totalRevenue, totalCost, totalProfit, marginPct, numBase, numQty, numSetup });
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "2rem" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div className="card">
          <h2 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Calculator size={18} /> Price Simulator Inputs
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label className="label">Base Cost (API / Supplier Price) — $ CAD</label>
              <input type="number" step="0.01" className="input" value={baseCost} onChange={e => setBaseCost(e.target.value)} />
              <span style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))" }}>Raw cost from SinaLite or catalog API</span>
            </div>
            <div>
              <label className="label">Order Quantity</label>
              <input type="number" className="input" value={quantity} onChange={e => setQuantity(e.target.value)} />
            </div>
            <div>
              <label className="label">Setup / Fixed Charge ($ CAD)</label>
              <input type="number" step="0.01" className="input" value={setupCharge} onChange={e => setSetupCharge(e.target.value)} />
            </div>
            <div style={{ borderTop: "1px dashed hsl(var(--border-hsl))", paddingTop: "1rem" }}>
              <label className="label">Test Against Category Markup</label>
              {loadingCats ? (
                <p style={{ fontSize: "0.8rem", color: "hsl(var(--muted-hsl))" }}>Loading categories...</p>
              ) : (
                <select className="input" value={selectedCategory} onChange={e => { setSelectedCategory(e.target.value); setOverrideMarkup(""); }}>
                  <option value="">— Use sitewise / manual override —</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.markupPercent}%)</option>
                  ))}
                </select>
              )}
            </div>
            {!selectedCategory && (
              <div>
                <label className="label">Manual Markup Override (%)</label>
                <input
                  type="number" step="0.1" className="input" placeholder="Leave blank to use sitewise"
                  value={overrideMarkup} onChange={e => setOverrideMarkup(e.target.value)}
                />
              </div>
            )}
            <button onClick={calculate} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.5rem" }}>
              <Play size={16} /> Calculate Price
            </button>
          </div>
        </div>
      </div>

      <div>
        {result ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div className="card" style={{ borderColor: "hsl(var(--accent-hsl))", backgroundColor: "hsl(var(--accent-hsl) / 0.04)" }}>
              <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "hsl(var(--accent-hsl))", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                Markup Source
              </p>
              <p style={{ fontWeight: 800, fontSize: "1rem" }}>{result.source}</p>
              <p style={{ fontSize: "0.85rem", color: "hsl(var(--muted-hsl))", marginTop: "0.15rem" }}>Applied markup: <strong>{result.appliedMarkup}%</strong></p>
            </div>

            <div className="card">
              <h3 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: "1rem" }}>Per-Unit Price Breakdown</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.9rem" }}>
                {[
                  { label: "Base Cost", val: `$${result.numBase.toFixed(2)}`, muted: true },
                  { label: `Markup (${result.appliedMarkup}%)`, val: `+$${result.markupAmt.toFixed(2)}`, color: "#059669" },
                  { label: "Setup Charge", val: `+$${result.numSetup.toFixed(2)}`, muted: true },
                ].map(row => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed hsl(var(--border-hsl))", paddingBottom: "0.4rem" }}>
                    <span style={{ color: row.muted ? "hsl(var(--muted-hsl))" : undefined }}>{row.label}</span>
                    <span style={{ fontWeight: 700, color: row.color }}>{row.val}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 900, fontSize: "1.1rem", color: "hsl(var(--accent-hsl))" }}>
                  <span>Selling Price</span>
                  <span>${result.finalPrice.toFixed(2)} CAD</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                  <span style={{ color: "hsl(var(--muted-hsl))" }}>Gross Margin</span>
                  <span style={{ fontWeight: 700, color: result.marginPct > 20 ? "#059669" : "#D97706" }}>{result.marginPct.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div className="card" style={{ backgroundColor: "hsl(var(--secondary-hsl) / 0.25)" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: "1rem" }}>Order Totals ({result.numQty} units)</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.9rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "hsl(var(--muted-hsl))" }}>Total Revenue</span>
                  <span style={{ fontWeight: 700 }}>${result.totalRevenue.toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "hsl(var(--muted-hsl))" }}>Total Base Cost</span>
                  <span style={{ fontWeight: 700 }}>-${result.totalCost.toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "1rem", color: "#059669", borderTop: "1px solid hsl(var(--border-hsl))", paddingTop: "0.5rem" }}>
                  <span>Estimated Profit</span>
                  <span>${result.totalProfit.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="card" style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", padding: "3rem", textAlign: "center" }}>
            <TrendingUp size={48} style={{ opacity: 0.25, strokeWidth: 1.5 }} />
            <p style={{ color: "hsl(var(--muted-hsl))", fontWeight: 500 }}>
              Fill in the inputs and click <strong>Calculate Price</strong> to see the full breakdown.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Category Markup Row ─────────────────────────────────────────────────────
function CategoryMarkupRow({ cat, onSave, saving }) {
  const [enabled, setEnabled] = useState(!!cat.useCustomMarkup);
  const [pct, setPct] = useState(cat.markupPercent ?? 30);

  return (
    <div style={{
      padding: "0.85rem",
      border: "1px solid hsl(var(--border-hsl))",
      borderRadius: "var(--radius-sm)",
      backgroundColor: enabled ? "hsl(var(--accent-hsl) / 0.04)" : "transparent",
      display: "flex",
      flexDirection: "column",
      gap: "0.5rem"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input type="checkbox" id={`cat-${cat.id}`} checked={enabled} onChange={e => setEnabled(e.target.checked)} />
          <label htmlFor={`cat-${cat.id}`} style={{ fontWeight: 700, fontSize: "0.9rem", cursor: "pointer" }}>
            {cat.name}
          </label>
          {cat.parentId && (
            <span style={{ fontSize: "0.7rem", color: "hsl(var(--muted-hsl))", backgroundColor: "hsl(var(--secondary-hsl))", padding: "0.1rem 0.4rem", borderRadius: "3px" }}>
              sub-cat
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onSave(cat, pct, enabled)}
          disabled={saving}
          style={{
            padding: "0.3rem 0.65rem", fontSize: "0.75rem", fontWeight: 700,
            border: "1px solid hsl(var(--border-hsl))", borderRadius: "4px",
            backgroundColor: "transparent", cursor: saving ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", gap: "0.25rem", color: "hsl(var(--primary-hsl))"
          }}
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          Save
        </button>
      </div>
      {enabled && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            type="number" step="0.1" className="input" value={pct}
            onChange={e => setPct(e.target.value)} style={{ maxWidth: "120px" }}
          />
          <span style={{ fontSize: "0.8rem", color: "hsl(var(--muted-hsl))" }}>% markup for all products in this category</span>
        </div>
      )}
    </div>
  );
}

// ─── Markups Tab ─────────────────────────────────────────────────────────────
function MarkupsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [globalMarkupType, setGlobalMarkupType] = useState("percentage");
  const [defaultMarkupPercent, setDefaultMarkupPercent] = useState(30);
  const [defaultSetupCharge, setDefaultSetupCharge] = useState(0);
  const [quantityTiers, setQuantityTiers] = useState([
    { minQty: 1, maxQty: 25, markupPercent: 45 },
    { minQty: 26, maxQty: 100, markupPercent: 35 },
    { minQty: 101, maxQty: 500, markupPercent: 25 },
    { minQty: 501, maxQty: 99999, markupPercent: 20 }
  ]);
  const [categories, setCategories] = useState([]);
  const [catSaving, setCatSaving] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [pricingSnap, catSnap] = await Promise.all([
          getDoc(doc(db, "settings", "pricing")),
          getDocs(collection(db, "categories"))
        ]);
        if (pricingSnap.exists()) {
          const d = pricingSnap.data();
          if (d.globalMarkupType) setGlobalMarkupType(d.globalMarkupType);
          if (d.defaultMarkupPercent !== undefined) setDefaultMarkupPercent(d.defaultMarkupPercent);
          if (d.defaultSetupCharge !== undefined) setDefaultSetupCharge(d.defaultSetupCharge);
          if (d.quantityTiers?.length) setQuantityTiers(d.quantityTiers);
        }
        const catList = [];
        catSnap.forEach(d => catList.push({ id: d.id, ...d.data() }));
        setCategories(catList.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)));
      } catch (err) {
        setError("Failed to load settings.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const addTierRow = () => {
    const last = quantityTiers[quantityTiers.length - 1];
    const newMin = last ? last.maxQty + 1 : 1;
    setQuantityTiers(prev => [...prev, { minQty: newMin, maxQty: newMin + 50, markupPercent: 20 }]);
  };

  const removeTierRow = idx => setQuantityTiers(prev => prev.filter((_, i) => i !== idx));

  const handleTierChange = (idx, field, val) => {
    setQuantityTiers(prev => prev.map((t, i) => i === idx ? { ...t, [field]: parseFloat(val) || 0 } : t));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError("");
    try {
      await setDoc(doc(db, "settings", "pricing"), {
        globalMarkupType,
        defaultMarkupPercent: parseFloat(defaultMarkupPercent) || 0,
        defaultSetupCharge: parseFloat(defaultSetupCharge) || 0,
        quantityTiers,
        updatedAt: new Date()
      }, { merge: true });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCategory = async (cat, markupPct, useCustom) => {
    setCatSaving(cat.id);
    try {
      await setDoc(doc(db, "categories", cat.id), {
        useCustomMarkup: useCustom,
        markupPercent: parseFloat(markupPct) || 0
      }, { merge: true });
      setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, useCustomMarkup: useCustom, markupPercent: parseFloat(markupPct) || 0 } : c));
    } catch (err) {
      alert("Failed to save category markup: " + err.message);
    } finally {
      setCatSaving(null);
    }
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: "4rem", color: "hsl(var(--muted-hsl))" }}>Loading markup settings...</div>;
  }

  return (
    <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {success && (
        <div className="card" style={{ borderColor: "hsl(var(--success-hsl))", backgroundColor: "hsl(var(--success-hsl) / 0.05)", padding: "1rem 1.5rem", color: "hsl(var(--success-hsl))", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <CheckCircle2 size={18} /> Sitewise pricing rules saved!
        </div>
      )}
      {error && (
        <div className="card" style={{ borderColor: "hsl(var(--destructive-hsl))", padding: "1rem 1.5rem", color: "hsl(var(--destructive-hsl))", fontWeight: 600 }}>{error}</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "2rem" }}>
        {/* Left: Sitewise Settings */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="card">
            <h2 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Settings2 size={18} /> Global Formula Type
            </h2>
            <p style={{ fontSize: "0.85rem", color: "hsl(var(--muted-hsl))", marginBottom: "1rem" }}>
              How the default sitewise markup is applied over API base costs.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              {[
                { val: "percentage", label: "Flat Markup %", desc: "Fixed % across all quantities" },
                { val: "tiers", label: "Quantity Tiers", desc: "Higher qty = lower markup rate" }
              ].map(opt => (
                <label key={opt.val} style={{
                  padding: "1rem", borderRadius: "var(--radius-md)", cursor: "pointer",
                  border: globalMarkupType === opt.val ? "2px solid hsl(var(--accent-hsl))" : "1px solid hsl(var(--border-hsl))",
                  backgroundColor: globalMarkupType === opt.val ? "hsl(var(--accent-hsl) / 0.05)" : "white",
                  display: "flex", flexDirection: "column", gap: "0.5rem"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <input type="radio" name="markupType" checked={globalMarkupType === opt.val} onChange={() => setGlobalMarkupType(opt.val)} />
                    <span style={{ fontWeight: 800, fontSize: "0.95rem" }}>{opt.label}</span>
                  </div>
                  <span style={{ fontSize: "0.8rem", color: "hsl(var(--muted-hsl))" }}>{opt.desc}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 800 }}>Default Values</h2>
            <div>
              <label className="label">Default Sitewise Markup (%)</label>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input type="number" step="0.1" className="input" value={defaultMarkupPercent} onChange={e => setDefaultMarkupPercent(e.target.value)} required />
                <Percent size={18} style={{ color: "hsl(var(--muted-hsl))" }} />
              </div>
              <span style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))", marginTop: "0.25rem", display: "block" }}>
                E.g. 30% → $10.00 base cost = $13.00 selling price
              </span>
            </div>
            <div>
              <label className="label">Fixed Setup Charge ($ CAD)</label>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input type="number" step="0.01" className="input" value={defaultSetupCharge} onChange={e => setDefaultSetupCharge(e.target.value)} />
                <DollarSign size={18} style={{ color: "hsl(var(--muted-hsl))" }} />
              </div>
            </div>
          </div>

          {globalMarkupType === "tiers" && (
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div>
                  <h2 style={{ fontSize: "1.2rem", fontWeight: 800 }}>Quantity Tier Table</h2>
                  <p style={{ fontSize: "0.8rem", color: "hsl(var(--muted-hsl))" }}>Dynamic markups by quantity range.</p>
                </div>
                <button type="button" onClick={addTierRow} className="btn btn-outline" style={{ padding: "0.4rem 0.85rem", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <Plus size={14} /> Add Tier
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {quantityTiers.map((tier, idx) => (
                  <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "0.75rem", alignItems: "center", backgroundColor: "hsl(var(--secondary-hsl) / 0.2)", padding: "0.75rem", borderRadius: "var(--radius-sm)" }}>
                    {[["minQty", "Min Qty"], ["maxQty", "Max Qty"], ["markupPercent", "Markup %"]].map(([field, lbl]) => (
                      <div key={field}>
                        <label className="label" style={{ fontSize: "0.7rem" }}>{lbl}</label>
                        <input type="number" className="input" value={tier[field]} step={field === "markupPercent" ? "0.1" : "1"} onChange={e => handleTierChange(idx, field, e.target.value)} />
                      </div>
                    ))}
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

          <button type="submit" className="btn btn-primary" disabled={saving} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.5rem" }}>
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? "Saving..." : "Save Sitewise Rules"}
          </button>
        </div>

        {/* Right: Category Markups */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="card">
            <h2 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Tag size={18} /> Category Markup Overrides
            </h2>
            <p style={{ fontSize: "0.85rem", color: "hsl(var(--muted-hsl))", marginBottom: "1.25rem" }}>
              Enable custom markups per category — these override the sitewise default for all products within that category.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {categories.length === 0 ? (
                <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.85rem", textAlign: "center", padding: "1.5rem 0" }}>
                  No categories found.
                </p>
              ) : (
                categories.map(cat => (
                  <CategoryMarkupRow key={cat.id} cat={cat} onSave={handleSaveCategory} saving={catSaving === cat.id} />
                ))
              )}
            </div>
          </div>

          <div className="card" style={{ backgroundColor: "hsl(var(--secondary-hsl) / 0.3)" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "1rem" }}>Pricing Hierarchy</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.85rem" }}>
              {[
                { n: "1", label: "Product Override", desc: "Custom markup set on individual product", border: "hsl(var(--accent-hsl))" },
                { n: "2", label: "Category Override", desc: "Category markup enabled in right column", border: "hsl(var(--primary-hsl))" },
                { n: "3", label: "Sitewise Default", desc: "Global fallback — configured in left column", border: "hsl(var(--success-hsl))" },
              ].map(r => (
                <div key={r.n} style={{ padding: "0.75rem", backgroundColor: "white", borderRadius: "var(--radius-sm)", borderLeft: `4px solid ${r.border}` }}>
                  <p style={{ fontWeight: 800 }}>{r.n}. {r.label}</p>
                  <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.8rem", marginTop: "0.2rem" }}>{r.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

// ─── Custom Print Costing Tab ───────────────────────────────────────────────
function CustomPrintCostingTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [colorClickCharge, setColorClickCharge] = useState("0.08");
  const [grayscaleClickCharge, setGrayscaleClickCharge] = useState("0.02");
  const [markupMultiplier, setMarkupMultiplier] = useState("2.0");

  // Interactive Live Calculation Test Inputs
  const [testQty, setTestQty] = useState(500);
  const [testImposition, setTestImposition] = useState(2);
  const [testCostPerM, setTestCostPerM] = useState(40);
  const [testSides, setTestSides] = useState(2);
  const [testMode, setTestMode] = useState("color");
  const [testBasePrice, setTestBasePrice] = useState(10);

  useEffect(() => {
    fetch("/api/admin/custom-print-settings")
      .then(r => r.json())
      .then(data => {
        if (data.colorClickCharge !== undefined) setColorClickCharge(String(data.colorClickCharge));
        if (data.grayscaleClickCharge !== undefined) setGrayscaleClickCharge(String(data.grayscaleClickCharge));
        if (data.markupMultiplier !== undefined) setMarkupMultiplier(String(data.markupMultiplier));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e?.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError("");

    try {
      const res = await fetch("/api/admin/custom-print-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          colorClickCharge: parseFloat(colorClickCharge) || 0.08,
          grayscaleClickCharge: parseFloat(grayscaleClickCharge) || 0.02,
          markupMultiplier: parseFloat(markupMultiplier) || 2.0
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data.error || "Failed to save settings.");
      }
    } catch (err) {
      setError(err.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const qtyNum = Math.max(1, parseInt(testQty) || 1);
  const impNum = Math.max(1, parseFloat(testImposition) || 1);
  const costPerMNum = Math.max(0, parseFloat(testCostPerM) || 0);
  const sidesNum = Math.max(1, parseFloat(testSides) || 1);
  const basePriceNum = Math.max(0, parseFloat(testBasePrice) || 0);
  const activeClickCharge = testMode === "color" ? (parseFloat(colorClickCharge) || 0.08) : (parseFloat(grayscaleClickCharge) || 0.02);
  const activeMultiplier = Math.max(1, parseFloat(markupMultiplier) || 2.0);

  const clicks = qtyNum / impNum;
  const paperCost = (sidesNum * (costPerMNum / 1000)) * clicks;
  const clickCost = clicks * activeClickCharge;
  const totalCost = paperCost + clickCost;
  const finalPrice = basePriceNum + (totalCost * activeMultiplier);
  const unitPrice = finalPrice / qtyNum;

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "3rem", color: "hsl(var(--muted-hsl))" }}>
        Loading Custom Print Costing Settings...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {success && (
        <div className="card" style={{ borderColor: "hsl(var(--success-hsl))", backgroundColor: "hsl(var(--success-hsl) / 0.05)", padding: "1rem 1.5rem", color: "hsl(var(--success-hsl))", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <CheckCircle2 size={18} /> Custom Print pricing engine settings saved successfully!
        </div>
      )}

      {error && (
        <div className="card" style={{ borderColor: "hsl(var(--destructive-hsl))", padding: "1rem 1.5rem", color: "hsl(var(--destructive-hsl))", fontWeight: 600 }}>{error}</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "2rem" }}>
        {/* Left: Global Custom Print Click & Multiplier Settings */}
        <form onSubmit={handleSave} className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Printer size={18} /> Global Custom Print Engine Parameters
            </h2>
            <p style={{ fontSize: "0.85rem", color: "hsl(var(--muted-hsl))", marginTop: "0.25rem" }}>
              These click charges and markup multipliers apply automatically across all custom print products.
            </p>
          </div>

          <div>
            <label className="label">Click Colour Charge ($/click)*</label>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input
                type="number"
                step="0.001"
                className="input"
                value={colorClickCharge}
                onChange={e => setColorClickCharge(e.target.value)}
                required
              />
              <DollarSign size={18} style={{ color: "hsl(var(--muted-hsl))" }} />
            </div>
            <span style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))", marginTop: "0.25rem", display: "block" }}>
              Cost per click for full colour digital press passes (e.g. $0.08 / click)
            </span>
          </div>

          <div>
            <label className="label">Grayscale Click Charge ($/click)*</label>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input
                type="number"
                step="0.001"
                className="input"
                value={grayscaleClickCharge}
                onChange={e => setGrayscaleClickCharge(e.target.value)}
                required
              />
              <DollarSign size={18} style={{ color: "hsl(var(--muted-hsl))" }} />
            </div>
            <span style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))", marginTop: "0.25rem", display: "block" }}>
              Cost per click for black & white / grayscale digital press passes (e.g. $0.02 / click)
            </span>
          </div>

          <div>
            <label className="label">Markup Multiplier (e.g. 2.0x)*</label>
            <input
              type="number"
              step="0.05"
              className="input"
              value={markupMultiplier}
              onChange={e => setMarkupMultiplier(e.target.value)}
              required
            />
            <span style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))", marginTop: "0.25rem", display: "block" }}>
              Multiplied against Total Job Cost: Price = Base Price + (Cost × Multiplier)
            </span>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.5rem", marginTop: "0.5rem", width: "fit-content" }}
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? "Saving..." : "Save Custom Print Settings"}
          </button>
        </form>

        {/* Right: Interactive Simulator Sandbox */}
        <div style={{
          backgroundColor: "#F0FDF4",
          border: "2px solid #86EFAC",
          borderRadius: "12px",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#166534" }}>
            <Calculator size={20} />
            <h3 style={{ fontSize: "1.1rem", fontWeight: 900, margin: 0 }}>
              Live Formula Simulator & Validator
            </h3>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "#166534" }}>Test Qty</label>
              <input type="number" className="input" value={testQty} onChange={e => setTestQty(e.target.value)} style={{ fontSize: "0.85rem", height: "36px" }} />
            </div>

            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "#166534" }}>Imposition</label>
              <input type="number" className="input" value={testImposition} onChange={e => setTestImposition(e.target.value)} style={{ fontSize: "0.85rem", height: "36px" }} />
            </div>

            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "#166534" }}>Paper Cost/M ($)</label>
              <input type="number" step="0.01" className="input" value={testCostPerM} onChange={e => setTestCostPerM(e.target.value)} style={{ fontSize: "0.85rem", height: "36px" }} />
            </div>

            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "#166534" }}>Sides / Pages</label>
              <input type="number" className="input" value={testSides} onChange={e => setTestSides(e.target.value)} style={{ fontSize: "0.85rem", height: "36px" }} />
            </div>

            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "#166534" }}>Print Mode</label>
              <select className="input" value={testMode} onChange={e => setTestMode(e.target.value)} style={{ fontSize: "0.85rem", height: "36px" }}>
                <option value="color">Colour (${parseFloat(colorClickCharge || 0.08).toFixed(3)})</option>
                <option value="bw">B&W (${parseFloat(grayscaleClickCharge || 0.02).toFixed(3)})</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "#166534" }}>Base Price ($)</label>
              <input type="number" step="0.01" className="input" value={testBasePrice} onChange={e => setTestBasePrice(e.target.value)} style={{ fontSize: "0.85rem", height: "36px" }} />
            </div>
          </div>

          {/* Breakdown results */}
          <div style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "8px",
            border: "1px solid #BBF7D0",
            padding: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.6rem"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
              <span style={{ color: "#64748B" }}>Clicks ({qtyNum} ÷ {impNum}):</span>
              <strong style={{ color: "#0F172A" }}>{clicks.toFixed(2)} Clicks</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
              <span style={{ color: "#64748B" }}>Click Cost ({clicks.toFixed(2)} × ${activeClickCharge.toFixed(3)}):</span>
              <strong style={{ color: "#0F172A" }}>${clickCost.toFixed(2)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
              <span style={{ color: "#64748B" }}>Paper Cost ({sidesNum} × ${costPerMNum}/M ÷ 1000 × {clicks.toFixed(2)}):</span>
              <strong style={{ color: "#0F172A" }}>${paperCost.toFixed(2)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", borderTop: "1px dashed #CBD5E1", paddingTop: "0.4rem" }}>
              <span style={{ color: "#EA580C", fontWeight: 700 }}>Total Job Cost:</span>
              <strong style={{ color: "#EA580C" }}>${totalCost.toFixed(2)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.15rem", fontWeight: 900, borderTop: "1.5px solid #2563EB", paddingTop: "0.5rem" }}>
              <span style={{ color: "#2563EB" }}>Customer Price:</span>
              <span style={{ color: "#2563EB" }}>${finalPrice.toFixed(2)} CAD</span>
            </div>
            <span style={{ fontSize: "0.75rem", color: "#166534", fontWeight: 700, textAlign: "right" }}>
              ${unitPrice.toFixed(2)} / unit • Multiplier: {activeMultiplier}x
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
function AdminPricingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get("tab") || "calculator";

  const [sitewiseSettings, setSitewiseSettings] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "pricing"));
        if (snap.exists()) setSitewiseSettings(snap.data());
      } catch (e) {
        console.error("Failed to load sitewise settings", e);
      }
    };
    load();
  }, []);

  const tabs = [
    { key: "calculator", label: "Calculator & Formulas", icon: Calculator },
    { key: "custom-print", label: "Custom Print Costing", icon: Printer },
    { key: "markups", label: "Site & Category Markups", icon: Sliders }
  ];

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", color: "hsl(var(--accent-hsl))", letterSpacing: "0.05em", display: "block", marginBottom: "0.25rem" }}>
          Costing & Revenue Engine
        </span>
        <h1 style={{ fontSize: "2rem", fontWeight: 900, marginBottom: "0.25rem", color: "hsl(var(--primary-hsl))", letterSpacing: "-0.02em" }}>
          {activeTab === "calculator" 
            ? "Price Calculator & Formula Tester" 
            : activeTab === "custom-print" 
              ? "Custom Print Product Costing Engine" 
              : "Sitewise & Category Markup Rules"}
        </h1>
        <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.95rem" }}>
          {activeTab === "calculator"
            ? "Simulate selling prices with real markup formulas before applying them."
            : activeTab === "custom-print"
              ? "Configure click charges, imposition, paper cost per M, and markup multipliers for custom print products."
              : "Configure global markup percentages and per-category overrides."}
        </p>
      </div>

      <div style={{ marginBottom: "2rem" }}>
        <div className="apple-segmented-control">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => router.push(`/admin/pricing?tab=${tab.key}`)}
                className={`apple-segmented-item ${active ? "active" : ""}`}
                style={{
                  padding: "0.55rem 1.15rem",
                  fontSize: "0.85rem"
                }}
              >
                <Icon size={16} /> {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "calculator" && <CalculatorTab sitewiseSettings={sitewiseSettings} />}
      {activeTab === "custom-print" && <CustomPrintCostingTab />}
      {activeTab === "markups" && <MarkupsTab />}
    </div>
  );
}

export default function AdminPricingPage() {
  return (
    <Suspense fallback={
      <div style={{ textAlign: "center", padding: "4rem", color: "hsl(var(--muted-hsl))" }}>
        Loading pricing tools...
      </div>
    }>
      <AdminPricingContent />
    </Suspense>
  );
}