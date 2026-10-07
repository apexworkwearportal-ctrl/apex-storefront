"use client";

import { useEffect, useState } from "react";
import { 
  DEFAULT_MEGA_MENU, 
  AVAILABLE_ICONS, 
  getMegaMenuIcon, 
  buildMegaMenuFromCategories 
} from "@/lib/mega-menu";
import { 
  Save, 
  RefreshCw, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Link as LinkIcon, 
  Eye, 
  EyeOff,
  Sliders,
  ExternalLink
} from "lucide-react";

export default function AdminMegaMenuManager({ categories = [], onCategoriesUpdated }) {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [expandedIndex, setExpandedIndex] = useState(0);

  // Fetch initial mega menu configuration
  const fetchMegaMenu = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/mega-menu");
      const data = await res.json();
      if (data.menu && Array.isArray(data.menu)) {
        setMenuItems(data.menu);
      } else {
        setMenuItems(DEFAULT_MEGA_MENU);
      }
    } catch (err) {
      console.error("Failed to load mega menu:", err);
      setMenuItems(DEFAULT_MEGA_MENU);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMegaMenu();
  }, []);

  // Save current configuration
  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      const res = await fetch("/api/admin/mega-menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: menuItems })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "Mega Menu successfully saved and updated live on storefront!" });
      } else {
        setMessage({ type: "error", text: data.error || "Failed to save mega menu." });
      }
    } catch (err) {
      console.error("Save mega menu error:", err);
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  // Auto-sync from real Firestore categories
  const handleAutoSync = () => {
    if (confirm("This will regenerate the mega menu based on the categories currently in the database. Any custom spotlight banners will be reset to defaults. Continue?")) {
      const generated = buildMegaMenuFromCategories(categories);
      setMenuItems(generated);
      setMessage({ type: "info", text: "Mega menu regenerated from database categories. Click 'Save Changes' to apply." });
    }
  };

  // Reorder Top Items
  const moveItem = (index, direction) => {
    const newItems = [...menuItems];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;
    setMenuItems(newItems);
    setExpandedIndex(targetIndex);
  };

  // Update Top Item Field
  const updateItemField = (index, field, value) => {
    const newItems = [...menuItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setMenuItems(newItems);
  };

  // Toggle Item Enabled
  const toggleItemEnabled = (index) => {
    const newItems = [...menuItems];
    newItems[index] = { ...newItems[index], enabled: newItems[index].enabled !== false ? false : true };
    setMenuItems(newItems);
  };

  // Remove Top Item
  const removeItem = (index) => {
    if (confirm(`Remove "${menuItems[index]?.name}" from the header mega menu?`)) {
      const newItems = menuItems.filter((_, i) => i !== index);
      setMenuItems(newItems);
    }
  };

  // Add a new Category to Mega Menu
  const handleAddCategory = (rootCatId) => {
    const existing = categories.find(c => c.id === rootCatId);
    if (!existing) return;

    // Find child categories
    const childSubs = categories.filter(c => c.parentId === rootCatId);
    const subList = childSubs.map(sub => ({
      name: sub.name,
      href: `/products?category=${sub.id}`,
      desc: sub.description || `Explore ${sub.name}`
    }));

    const newItem = {
      id: existing.id,
      name: existing.name,
      badge: "",
      iconName: "Folder",
      href: `/products?category=${existing.id}`,
      enabled: true,
      subcategories: subList,
      spotlight: {
        title: `Explore ${existing.name}`,
        desc: existing.description || "High quality custom printing.",
        cta: `Shop ${existing.name}`,
        href: `/products?category=${existing.id}`,
        bgGradient: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
        accentColor: "#f97316"
      }
    };

    setMenuItems([...menuItems, newItem]);
    setExpandedIndex(menuItems.length);
  };

  // Subcategory management inside a category
  const addSubcategory = (catIndex) => {
    const newItems = [...menuItems];
    const cat = newItems[catIndex];
    const subs = cat.subcategories ? [...cat.subcategories] : [];
    subs.push({
      name: "New Subcategory",
      href: `/products?category=${cat.id}`,
      desc: "High quality custom print products"
    });
    newItems[catIndex] = { ...cat, subcategories: subs };
    setMenuItems(newItems);
  };

  const updateSubcategory = (catIndex, subIndex, field, value) => {
    const newItems = [...menuItems];
    const cat = newItems[catIndex];
    const subs = [...cat.subcategories];
    subs[subIndex] = { ...subs[subIndex], [field]: value };
    newItems[catIndex] = { ...cat, subcategories: subs };
    setMenuItems(newItems);
  };

  const removeSubcategory = (catIndex, subIndex) => {
    const newItems = [...menuItems];
    const cat = newItems[catIndex];
    const subs = cat.subcategories.filter((_, i) => i !== subIndex);
    newItems[catIndex] = { ...cat, subcategories: subs };
    setMenuItems(newItems);
  };

  // Populate all real subcategories from DB for this category
  const populateSubcategoriesFromDB = (catIndex) => {
    const cat = menuItems[catIndex];
    const childSubs = categories.filter(c => c.parentId === cat.id);
    if (childSubs.length === 0) {
      alert(`No child categories found in database with parentId: "${cat.id}"`);
      return;
    }

    const subList = [];
    childSubs.forEach(sub => {
      subList.push({
        name: sub.name,
        href: `/products?category=${sub.id}`,
        desc: sub.description || `Explore ${sub.name}`
      });
      // Also add level 3 leaves if any
      const leafs = categories.filter(c => c.parentId === sub.id);
      leafs.forEach(leaf => {
        subList.push({
          name: leaf.name,
          href: `/products?category=${leaf.id}`,
          desc: leaf.description || `${leaf.name} print product options`
        });
      });
    });

    const newItems = [...menuItems];
    newItems[catIndex] = { ...cat, subcategories: subList };
    setMenuItems(newItems);
  };

  // Update Spotlight
  const updateSpotlight = (catIndex, field, value) => {
    const newItems = [...menuItems];
    const cat = newItems[catIndex];
    const spotlight = cat.spotlight ? { ...cat.spotlight, [field]: value } : { [field]: value };
    newItems[catIndex] = { ...cat, spotlight };
    setMenuItems(newItems);
  };

  // Available root categories not yet in menu
  const availableRoots = categories.filter(c => !c.parentId && !menuItems.some(m => m.id === c.id));

  if (loading) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "#64748B" }}>
        <RefreshCw className="animate-spin" size={24} style={{ margin: "0 auto 1rem", color: "#2563EB" }} />
        <p>Loading Mega Menu settings...</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Banner Actions */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "1rem",
        backgroundColor: "#FFFFFF",
        padding: "1.25rem 1.5rem",
        borderRadius: "12px",
        border: "1px solid #E2E8F0",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)"
      }}>
        <div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0F172A", margin: 0 }}>
            Header Mega Menu Navigation
          </h2>
          <p style={{ color: "#64748B", fontSize: "0.85rem", margin: "0.25rem 0 0 0" }}>
            Customize the top navigation categories, badges, icons, dropdown subcategories, and spotlight banners.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button
            onClick={handleAutoSync}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.55rem 1rem",
              backgroundColor: "#F1F5F9",
              color: "#334155",
              border: "1px solid #CBD5E1",
              borderRadius: "8px",
              fontSize: "0.825rem",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            <RefreshCw size={15} /> Auto-Sync from Database
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.55rem 1.25rem",
              backgroundColor: "#2563EB",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(37, 99, 235, 0.3)"
            }}
          >
            {saving ? <RefreshCw className="animate-spin" size={15} /> : <Save size={15} />}
            {saving ? "Saving..." : "Save Mega Menu"}
          </button>
        </div>
      </div>

      {/* Message Banner */}
      {message.text && (
        <div style={{
          padding: "0.85rem 1.25rem",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          fontWeight: 600,
          fontSize: "0.85rem",
          backgroundColor: message.type === "success" ? "#ECFDF5" : (message.type === "error" ? "#FEF2F2" : "#EFF6FF"),
          color: message.type === "success" ? "#065F46" : (message.type === "error" ? "#991B1B" : "#1E40AF"),
          border: `1px solid ${message.type === "success" ? "#A7F3D0" : (message.type === "error" ? "#FECACA" : "#BFDBFE")}`
        }}>
          {message.type === "success" ? <CheckCircle2 size={18} /> : (message.type === "error" ? <AlertCircle size={18} /> : <Sparkles size={18} />)}
          <span>{message.text}</span>
        </div>
      )}

      {/* Menu Categories List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {menuItems.map((item, idx) => {
          const Icon = getMegaMenuIcon(item.iconName || item.icon);
          const isExpanded = expandedIndex === idx;
          const isEnabled = item.enabled !== false;

          return (
            <div
              key={item.id || idx}
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "12px",
                border: isExpanded ? "2px solid #3B82F6" : "1px solid #E2E8F0",
                overflow: "hidden",
                boxShadow: "0 1px 4px rgba(0, 0, 0, 0.03)",
                opacity: isEnabled ? 1 : 0.6
              }}
            >
              {/* Category Header Row */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "1rem 1.25rem",
                backgroundColor: isExpanded ? "#F8FAFC" : "#FFFFFF",
                cursor: "pointer",
                gap: "1rem"
              }}
              onClick={() => setExpandedIndex(isExpanded ? null : idx)}
              >
                {/* Left: Reorder & Icon & Title */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }} onClick={(e) => e.stopPropagation()}>
                    <button
                      disabled={idx === 0}
                      onClick={() => moveItem(idx, -1)}
                      style={{ background: "none", border: "none", cursor: idx === 0 ? "default" : "pointer", padding: "1px", opacity: idx === 0 ? 0.3 : 0.8 }}
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      disabled={idx === menuItems.length - 1}
                      onClick={() => moveItem(idx, 1)}
                      style={{ background: "none", border: "none", cursor: idx === menuItems.length - 1 ? "default" : "pointer", padding: "1px", opacity: idx === menuItems.length - 1 ? 0.3 : 0.8 }}
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>

                  <div style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    backgroundColor: "#EFF6FF",
                    color: "#2563EB",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}>
                    <Icon size={18} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "#0F172A" }}>
                        {item.name || "Untitled Category"}
                      </span>
                      {item.badge && (
                        <span style={{
                          backgroundColor: item.badge === "HOT" ? "#EF4444" : "#2563EB",
                          color: "white",
                          fontSize: "0.65rem",
                          fontWeight: 800,
                          padding: "0.15rem 0.45rem",
                          borderRadius: "10px"
                        }}>
                          {item.badge}
                        </span>
                      )}
                      {!isEnabled && (
                        <span style={{ backgroundColor: "#E2E8F0", color: "#64748B", fontSize: "0.7rem", fontWeight: 700, padding: "0.15rem 0.45rem", borderRadius: "6px" }}>
                          Hidden
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "#64748B" }}>
                      ID: <code style={{ backgroundColor: "#F1F5F9", padding: "0.1rem 0.3rem", borderRadius: "4px" }}>{item.id}</code> · {item.subcategories?.length || 0} Subcategories
                    </span>
                  </div>
                </div>

                {/* Right: Quick actions */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }} onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => toggleItemEnabled(idx)}
                    title={isEnabled ? "Disable Category" : "Enable Category"}
                    style={{
                      padding: "0.35rem 0.6rem",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E1",
                      backgroundColor: isEnabled ? "#ECFDF5" : "#F8FAFC",
                      color: isEnabled ? "#059669" : "#94A3B8",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.3rem"
                    }}
                  >
                    {isEnabled ? <Eye size={14} /> : <EyeOff size={14} />}
                    {isEnabled ? "Active" : "Hidden"}
                  </button>

                  <button
                    onClick={() => removeItem(idx)}
                    title="Remove from Menu"
                    style={{
                      padding: "0.35rem 0.5rem",
                      borderRadius: "6px",
                      border: "1px solid #FECACA",
                      backgroundColor: "#FEF2F2",
                      color: "#EF4444",
                      cursor: "pointer"
                    }}
                  >
                    <Trash2 size={14} />
                  </button>

                  <button
                    onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                    style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer", padding: "0.25rem" }}
                  >
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                </div>
              </div>

              {/* Expanded Category Editor */}
              {isExpanded && (
                <div style={{ padding: "1.5rem", borderTop: "1px solid #E2E8F0", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  {/* Category Main Settings */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "0.35rem" }}>
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={item.name || ""}
                        onChange={(e) => updateItemField(idx, "name", e.target.value)}
                        style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "0.85rem" }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "0.35rem" }}>
                        Category Slug / ID
                      </label>
                      <input
                        type="text"
                        value={item.id || ""}
                        onChange={(e) => updateItemField(idx, "id", e.target.value)}
                        style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "0.85rem" }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "0.35rem" }}>
                        Destination URL
                      </label>
                      <input
                        type="text"
                        value={item.href || `/products?category=${item.id}`}
                        onChange={(e) => updateItemField(idx, "href", e.target.value)}
                        placeholder={`/products?category=${item.id}`}
                        style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "0.85rem" }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "0.35rem" }}>
                        Badge (Optional)
                      </label>
                      <input
                        type="text"
                        value={item.badge || ""}
                        onChange={(e) => updateItemField(idx, "badge", e.target.value.toUpperCase())}
                        placeholder="e.g. HOT, POPULAR, NEW"
                        style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "0.85rem" }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "0.35rem" }}>
                        Icon
                      </label>
                      <select
                        value={item.iconName || "Folder"}
                        onChange={(e) => updateItemField(idx, "iconName", e.target.value)}
                        style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "0.85rem", backgroundColor: "white" }}
                      >
                        {AVAILABLE_ICONS.map(ic => (
                          <option key={ic.id} value={ic.id}>{ic.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Subcategories Editor */}
                  <div style={{
                    backgroundColor: "#F8FAFC",
                    padding: "1.25rem",
                    borderRadius: "8px",
                    border: "1px solid #E2E8F0"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
                      <div>
                        <h4 style={{ fontSize: "0.9rem", fontWeight: 800, color: "#0F172A", margin: 0 }}>
                          Dropdown Subcategories ({item.subcategories?.length || 0})
                        </h4>
                        <span style={{ fontSize: "0.75rem", color: "#64748B" }}>
                          These items appear in the two-column grid inside the mega menu dropdown.
                        </span>
                      </div>

                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          type="button"
                          onClick={() => populateSubcategoriesFromDB(idx)}
                          style={{
                            padding: "0.35rem 0.75rem",
                            borderRadius: "6px",
                            border: "1px solid #CBD5E1",
                            backgroundColor: "#FFFFFF",
                            color: "#334155",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            cursor: "pointer"
                          }}
                        >
                          Pull Subcategories from Database
                        </button>
                        <button
                          type="button"
                          onClick={() => addSubcategory(idx)}
                          style={{
                            padding: "0.35rem 0.75rem",
                            borderRadius: "6px",
                            backgroundColor: "#2563EB",
                            color: "white",
                            border: "none",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem"
                          }}
                        >
                          <Plus size={13} /> Add Subcategory
                        </button>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      {item.subcategories?.map((sub, sIdx) => (
                        <div
                          key={sIdx}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1.5fr 1.5fr 2fr auto",
                            gap: "0.75rem",
                            alignItems: "center",
                            backgroundColor: "#FFFFFF",
                            padding: "0.6rem 0.75rem",
                            borderRadius: "6px",
                            border: "1px solid #E2E8F0"
                          }}
                        >
                          <input
                            type="text"
                            value={sub.name || ""}
                            onChange={(e) => updateSubcategory(idx, sIdx, "name", e.target.value)}
                            placeholder="Subcategory Name"
                            style={{ padding: "0.4rem 0.6rem", borderRadius: "4px", border: "1px solid #CBD5E1", fontSize: "0.8rem" }}
                          />
                          <input
                            type="text"
                            value={sub.href || ""}
                            onChange={(e) => updateSubcategory(idx, sIdx, "href", e.target.value)}
                            placeholder="/products?category=sub-id"
                            style={{ padding: "0.4rem 0.6rem", borderRadius: "4px", border: "1px solid #CBD5E1", fontSize: "0.8rem" }}
                          />
                          <input
                            type="text"
                            value={sub.desc || ""}
                            onChange={(e) => updateSubcategory(idx, sIdx, "desc", e.target.value)}
                            placeholder="Short description text..."
                            style={{ padding: "0.4rem 0.6rem", borderRadius: "4px", border: "1px solid #CBD5E1", fontSize: "0.8rem" }}
                          />
                          <button
                            type="button"
                            onClick={() => removeSubcategory(idx, sIdx)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#EF4444",
                              cursor: "pointer",
                              padding: "0.25rem"
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Spotlight Banner Editor */}
                  <div style={{
                    backgroundColor: "#0F172A",
                    color: "white",
                    padding: "1.25rem",
                    borderRadius: "8px"
                  }}>
                    <h4 style={{ fontSize: "0.9rem", fontWeight: 800, color: "#38BDF8", marginBottom: "0.75rem" }}>
                      Right-Side Spotlight Feature Card
                    </h4>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, color: "#94A3B8", marginBottom: "0.25rem" }}>
                          Banner Title
                        </label>
                        <input
                          type="text"
                          value={item.spotlight?.title || ""}
                          onChange={(e) => updateSpotlight(idx, "title", e.target.value)}
                          style={{ width: "100%", padding: "0.45rem 0.65rem", borderRadius: "4px", border: "1px solid #334155", backgroundColor: "#1E293B", color: "white", fontSize: "0.8rem" }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, color: "#94A3B8", marginBottom: "0.25rem" }}>
                          CTA Button Text
                        </label>
                        <input
                          type="text"
                          value={item.spotlight?.cta || "Explore Now"}
                          onChange={(e) => updateSpotlight(idx, "cta", e.target.value)}
                          style={{ width: "100%", padding: "0.45rem 0.65rem", borderRadius: "4px", border: "1px solid #334155", backgroundColor: "#1E293B", color: "white", fontSize: "0.8rem" }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, color: "#94A3B8", marginBottom: "0.25rem" }}>
                          CTA Destination Link
                        </label>
                        <input
                          type="text"
                          value={item.spotlight?.href || item.href || `/products?category=${item.id}`}
                          onChange={(e) => updateSpotlight(idx, "href", e.target.value)}
                          style={{ width: "100%", padding: "0.45rem 0.65rem", borderRadius: "4px", border: "1px solid #334155", backgroundColor: "#1E293B", color: "white", fontSize: "0.8rem" }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, color: "#94A3B8", marginBottom: "0.25rem" }}>
                          Accent Color
                        </label>
                        <input
                          type="text"
                          value={item.spotlight?.accentColor || "#f97316"}
                          onChange={(e) => updateSpotlight(idx, "accentColor", e.target.value)}
                          style={{ width: "100%", padding: "0.45rem 0.65rem", borderRadius: "4px", border: "1px solid #334155", backgroundColor: "#1E293B", color: "white", fontSize: "0.8rem" }}
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: "0.75rem" }}>
                      <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, color: "#94A3B8", marginBottom: "0.25rem" }}>
                        Banner Description
                      </label>
                      <textarea
                        rows={2}
                        value={item.spotlight?.desc || ""}
                        onChange={(e) => updateSpotlight(idx, "desc", e.target.value)}
                        style={{ width: "100%", padding: "0.45rem 0.65rem", borderRadius: "4px", border: "1px solid #334155", backgroundColor: "#1E293B", color: "white", fontSize: "0.8rem" }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Category Section */}
      <div style={{
        backgroundColor: "#FFFFFF",
        padding: "1.25rem 1.5rem",
        borderRadius: "12px",
        border: "1px dashed #CBD5E1",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "1rem"
      }}>
        <div>
          <h3 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0F172A", margin: 0 }}>
            Add Category from Database
          </h3>
          <span style={{ fontSize: "0.8rem", color: "#64748B" }}>
            Select any root-level catalog category to include in the top header navigation.
          </span>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          {availableRoots.length > 0 ? (
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleAddCategory(e.target.value);
                  e.target.value = "";
                }
              }}
              style={{
                padding: "0.55rem 1rem",
                borderRadius: "8px",
                border: "1px solid #CBD5E1",
                backgroundColor: "white",
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "#0F172A"
              }}
            >
              <option value="">+ Select a Category to Add...</option>
              {availableRoots.map(r => (
                <option key={r.id} value={r.id}>{r.name} ({r.id})</option>
              ))}
            </select>
          ) : (
            <span style={{ fontSize: "0.8rem", color: "#64748B", fontWeight: 600 }}>
              All database root categories are already in the mega menu.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
