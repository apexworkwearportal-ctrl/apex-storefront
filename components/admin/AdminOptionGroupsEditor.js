"use client";

import { Plus, Trash2 } from "lucide-react";
import { OPTION_KINDS, getDefaultChoiceIndex } from "@/lib/custom-print-pricing";

const KIND_HELP = {
  flat: "Adds a fixed dollar amount to the order, regardless of quantity.",
  percent: "Adds a percentage of the order subtotal (setup + cost × markup), plus an optional flat amount. Good for lamination.",
  inner_paper: "Replaces the paper cost per 1000 sheets used for the inner pages. Leave 'Paper $/1000' blank to keep the size's regular paper.",
  cover: "Booklets only. Leave 'Cover stock $/1000' blank for a self cover ($0). Otherwise the cover is priced per 1000 sheets, one cover sheet per booklet, and 4 pages move from the inside to the cover."
};

const emptyChoice = (kind, first) => {
  const base = { name: "", priceUpcharge: 0, isDefault: first };
  if (kind === "percent") return { ...base, percent: 0 };
  if (kind === "inner_paper" || kind === "cover") return { name: "", costPerM: "", isDefault: first };
  return base;
};

const firstChoice = kind => {
  if (kind === "cover") return { ...emptyChoice(kind, true), name: "Self Cover" };
  if (kind === "inner_paper") return { ...emptyChoice(kind, true), name: "Regular Paper" };
  return emptyChoice(kind, true);
};

/**
 * Editor for the "Additional Custom Options" groups of a custom print product.
 * `groups` / `setGroups` is the product's `options` array.
 */
export default function AdminOptionGroupsEditor({ groups, setGroups }) {
  const update = (gIdx, fn) => setGroups(prev => prev.map((g, i) => (i === gIdx ? fn(g) : g)));

  const addGroup = () => setGroups(prev => [...prev, { name: "", kind: "flat", choices: [firstChoice("flat")] }]);
  const removeGroup = gIdx => setGroups(prev => prev.filter((_, i) => i !== gIdx));

  const changeKind = (gIdx, kind) => update(gIdx, g => ({
    ...g,
    kind,
    choices: [firstChoice(kind)]
  }));

  const addChoice = gIdx => update(gIdx, g => ({
    ...g,
    choices: [...g.choices, emptyChoice(g.kind || "flat", false)]
  }));

  const removeChoice = (gIdx, cIdx) => update(gIdx, g => {
    const wasDefault = !!g.choices[cIdx]?.isDefault;
    const choices = g.choices.filter((_, i) => i !== cIdx);
    if (wasDefault && choices.length > 0) choices[0] = { ...choices[0], isDefault: true };
    return { ...g, choices };
  });

  const setDefault = (gIdx, cIdx) => update(gIdx, g => ({
    ...g,
    choices: g.choices.map((c, i) => ({ ...c, isDefault: i === cIdx }))
  }));

  const changeChoice = (gIdx, cIdx, field, value) => update(gIdx, g => ({
    ...g,
    choices: g.choices.map((c, i) => {
      if (i !== cIdx) return c;
      if (field === "name") return { ...c, name: value };
      if (field === "costPerM") return { ...c, costPerM: value === "" ? "" : parseFloat(value) || 0 };
      return { ...c, [field]: parseFloat(value) || 0 };
    })
  }));

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <div>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0 }}>Additional Custom Options (Optional)</h2>
          <p style={{ fontSize: "0.8rem", color: "hsl(var(--muted-hsl))", margin: "0.2rem 0 0" }}>
            Extra selectors shown to the customer. Mark one choice per group as the default (pre-selected).
          </p>
        </div>
        <button type="button" onClick={addGroup} className="btn btn-outline" style={{ padding: "0.4rem 0.85rem", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <Plus size={14} /> Add Option Group
        </button>
      </div>

      {groups.length === 0 ? (
        <div style={{ textAlign: "center", padding: "1.5rem", border: "1px dashed hsl(var(--border-hsl))", borderRadius: "var(--radius-md)", color: "hsl(var(--muted-hsl))", fontSize: "0.85rem" }}>
          No extra options. Only the standard Custom Print engine variants (Sizes, Sides, Print Mode) will be used.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {groups.map((group, gIdx) => {
            const kind = group.kind || "flat";
            const defaultIdx = getDefaultChoiceIndex(group);
            return (
              <div key={gIdx} className="card" style={{ padding: "1rem", backgroundColor: "#F8FAFC", position: "relative" }}>
                <button type="button" onClick={() => removeGroup(gIdx)} style={{ position: "absolute", top: "0.75rem", right: "0.75rem", background: "none", border: "none", color: "#EF4444", cursor: "pointer" }}>
                  <Trash2 size={15} />
                </button>

                <div style={{ display: "flex", gap: "0.75rem", maxWidth: "85%", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: "180px" }}>
                    <label className="label">Option Group Name</label>
                    <input className="input" value={group.name} onChange={e => update(gIdx, g => ({ ...g, name: e.target.value }))} placeholder="e.g. Cover, Inner Paper, Lamination" required />
                  </div>
                  <div style={{ flex: 1, minWidth: "180px" }}>
                    <label className="label">Option Type</label>
                    <select className="input" value={kind} onChange={e => changeKind(gIdx, e.target.value)}>
                      {OPTION_KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
                    </select>
                  </div>
                </div>
                <p style={{ fontSize: "0.75rem", color: "#64748B", margin: "0 0 0.75rem" }}>{KIND_HELP[kind]}</p>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {group.choices.map((choice, cIdx) => {
                    const isDefault = cIdx === defaultIdx;
                    return (
                      <div key={cIdx} style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.72rem", fontWeight: 700, color: isDefault ? "#166534" : "#64748B", cursor: "pointer", minWidth: "78px" }}>
                          <input type="radio" name={`default-${gIdx}`} checked={isDefault} onChange={() => setDefault(gIdx, cIdx)} />
                          {isDefault ? "Default ✓" : "Default"}
                        </label>
                        <input
                          className="input"
                          value={choice.name}
                          onChange={e => changeChoice(gIdx, cIdx, "name", e.target.value)}
                          placeholder={kind === "cover" ? "e.g. Self Cover, 80lb Gloss Cover" : kind === "inner_paper" ? "e.g. Regular Paper, 100lb Silk" : "Choice name (e.g. Gloss Lamination)"}
                          style={{ flex: 2, minWidth: "160px" }}
                          required
                        />
                        {kind === "flat" && (
                          <Field prefix="+$" value={choice.priceUpcharge} onChange={v => changeChoice(gIdx, cIdx, "priceUpcharge", v)} placeholder="0.00" />
                        )}
                        {kind === "percent" && (
                          <>
                            <Field prefix="+" suffix="%" value={choice.percent ?? 0} onChange={v => changeChoice(gIdx, cIdx, "percent", v)} placeholder="0" />
                            <Field prefix="+$" value={choice.priceUpcharge} onChange={v => changeChoice(gIdx, cIdx, "priceUpcharge", v)} placeholder="0.00" />
                          </>
                        )}
                        {(kind === "inner_paper" || kind === "cover") && (
                          <Field
                            prefix="$"
                            suffix="/1000"
                            value={choice.costPerM ?? ""}
                            onChange={v => changeChoice(gIdx, cIdx, "costPerM", v)}
                            placeholder={kind === "cover" ? "blank = self cover" : "blank = size paper"}
                          />
                        )}
                        {group.choices.length > 1 && (
                          <button type="button" onClick={() => removeChoice(gIdx, cIdx)} style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer" }}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  <button type="button" onClick={() => addChoice(gIdx)} className="btn btn-outline" style={{ padding: "0.3rem 0.65rem", fontSize: "0.75rem", width: "fit-content", marginTop: "0.25rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <Plus size={12} /> Add Choice Row
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Field({ prefix, suffix, value, onChange, placeholder }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", flex: 1, minWidth: "130px" }}>
      {prefix && <span style={{ fontSize: "0.8rem", fontWeight: 700 }}>{prefix}</span>}
      <input type="number" step="0.01" min="0" className="input" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      {suffix && <span style={{ fontSize: "0.8rem", fontWeight: 700 }}>{suffix}</span>}
    </div>
  );
}
