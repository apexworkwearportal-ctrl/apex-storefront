"use client";

import { useEffect, useState, Suspense } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, updateDoc, setDoc, doc, deleteDoc } from "firebase/firestore";
import { AlertCircle, Eye, EyeOff, Search, Edit3, CheckCircle2, Download, Plus, Filter, X, Table, Settings, RefreshCw, Trash2, Sparkles, Shirt, Ruler } from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

function ApparelCatalogContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [categories, setCategories] = useState([]);
  const [seeding, setSeeding] = useState(false);

  const fetchApparelProducts = async () => {
    setLoading(true);
    try {
      // Fetch categories
      const catSnapshot = await getDocs(collection(db, "categories"));
      const catList = [];
      catSnapshot.forEach(d => {
        catList.push({ id: d.id, ...d.data() });
      });
      setCategories(catList);

      // Fetch from dedicated 'apparel_products' collection
      const snapshot = await getDocs(collection(db, "apparel_products"));
      const list = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });

      // Sort client-side by name
      list.sort((a, b) => {
        const nameA = a.name || "";
        const nameB = b.name || "";
        return nameA.localeCompare(nameB);
      });

      setProducts(list);
    } catch (err) {
      console.error("Error loading apparel products:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const colRef = collection(db, "apparel_products");
        const snapshot = await getDocs(colRef);
        const list = [];
        snapshot.forEach(docSnap => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        if (active) {
          setProducts(list);
        }
      } catch (err) {
        console.error("Error loading apparel products:", err);
      } finally {
        if (active) setLoading(false);
      }
    }
    init();
    return () => { active = false; };
  }, []);

  const handleToggleVisibility = async (productId, currentVisibility) => {
    try {
      const productRef = doc(db, "apparel_products", productId);
      await updateDoc(productRef, { isVisible: !currentVisibility });
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, isVisible: !currentVisibility } : p));
    } catch (err) {
      console.error("Failed to update apparel visibility:", err);
    }
  };

  const handleDeleteApparelProduct = async (productId, productName) => {
    if (!confirm(`Are you sure you want to delete apparel product "${productName}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, "apparel_products", productId));
      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch (err) {
      console.error("Failed to delete apparel product:", err);
      alert("Failed to delete product: " + err.message);
    }
  };

  // Seed standard apparel starter items if collection is empty
  const handleSeedApparelSamples = async () => {
    if (!confirm("This will seed standard apparel items (Hoodie, T-Shirt, Polo, Jacket, Cap) into the apparel_products collection. Proceed?")) {
      return;
    }
    setSeeding(true);
    try {
      const sampleItems = [
        {
          id: "apparel-heavyweight-hoodie",
          name: "Apex Heavyweight Workwear Hoodie",
          sku: "APX-HD-100",
          shortDescription: "Ultra-durable 400 GSM fleece hoodie with reinforced double-stitched pockets.",
          longDescription: "Engineered for rugged trade work and premium corporate workwear. Features double-lined hood, heavy-duty ribbed cuffs, and soft brushed interior fleece. Ideal for custom chest and back embroidery or screen printing.",
          categoryId: categories[0]?.id || "apparel",
          pricing: { startingPrice: 38.50, basePrice: 38.50 },
          isApparel: true,
          minimumOrderQuantity: 12,
          useCustomMarkup: false,
          markupPercent: 35,
          isVisible: true,
          images: ["https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=800&auto=format&fit=crop"],
          garmentViews: {
            front: {
              image: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=800&auto=format&fit=crop",
              calibration: { isCalibrated: true, left: 32, top: 28, width: 36, height: 42 }
            },
            back: {
              image: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=800&auto=format&fit=crop",
              calibration: { isCalibrated: false }
            }
          },
          options: [
            {
              name: "Size",
              choices: [
                { name: "S", priceUpcharge: 0 },
                { name: "M", priceUpcharge: 0 },
                { name: "L", priceUpcharge: 0 },
                { name: "XL", priceUpcharge: 0 },
                { name: "2XL", priceUpcharge: 3.50 },
                { name: "3XL", priceUpcharge: 5.00 }
              ]
            },
            {
              name: "Color",
              choices: [
                { name: "Black", priceUpcharge: 0 },
                { name: "Navy Blue", priceUpcharge: 0 },
                { name: "Heather Grey", priceUpcharge: 0 },
                { name: "Forest Green", priceUpcharge: 0 }
              ]
            }
          ],
          createdAt: new Date()
        },
        {
          id: "apparel-performance-polo",
          name: "Apex Pro Performance Pique Polo",
          sku: "APX-PL-200",
          shortDescription: "Moisture-wicking breathable athletic pique polo with rib-knit collar.",
          longDescription: "Premium 100% micro-polyester polo designed for corporate branding and team uniforms. Stain-resistant, anti-microbial fabric with UV 30+ sun protection.",
          categoryId: categories[0]?.id || "apparel",
          pricing: { startingPrice: 26.00, basePrice: 26.00 },
          isApparel: true,
          minimumOrderQuantity: 12,
          useCustomMarkup: false,
          markupPercent: 35,
          isVisible: true,
          images: ["https://images.unsplash.com/photo-1581655353564-df123a1eb820?q=80&w=800&auto=format&fit=crop"],
          garmentViews: {
            front: {
              image: "https://images.unsplash.com/photo-1581655353564-df123a1eb820?q=80&w=800&auto=format&fit=crop",
              calibration: { isCalibrated: true, left: 35, top: 25, width: 30, height: 35 }
            }
          },
          options: [
            {
              name: "Size",
              choices: [
                { name: "S", priceUpcharge: 0 },
                { name: "M", priceUpcharge: 0 },
                { name: "L", priceUpcharge: 0 },
                { name: "XL", priceUpcharge: 0 },
                { name: "2XL", priceUpcharge: 3.00 }
              ]
            },
            {
              name: "Color",
              choices: [
                { name: "Classic Navy", priceUpcharge: 0 },
                { name: "Jet Black", priceUpcharge: 0 },
                { name: "Pure White", priceUpcharge: 0 },
                { name: "Steel Grey", priceUpcharge: 0 }
              ]
            }
          ],
          createdAt: new Date()
        },
        {
          id: "apparel-classic-tee",
          name: "Apex Ultra-Cotton Workwear T-Shirt",
          sku: "APX-TS-300",
          shortDescription: "Heavyweight 6.0 oz ring-spun cotton crewneck t-shirt.",
          longDescription: "Comfortable, pre-shrunk 100% cotton tee built for trade crews, promotional events, and staff wear. Features taped neck and shoulders with seamless rib collar.",
          categoryId: categories[0]?.id || "apparel",
          pricing: { startingPrice: 14.50, basePrice: 14.50 },
          isApparel: true,
          minimumOrderQuantity: 24,
          useCustomMarkup: false,
          markupPercent: 35,
          isVisible: true,
          images: ["https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=800&auto=format&fit=crop"],
          garmentViews: {
            front: {
              image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=800&auto=format&fit=crop",
              calibration: { isCalibrated: true, left: 30, top: 25, width: 40, height: 45 }
            }
          },
          options: [
            {
              name: "Size",
              choices: [
                { name: "S", priceUpcharge: 0 },
                { name: "M", priceUpcharge: 0 },
                { name: "L", priceUpcharge: 0 },
                { name: "XL", priceUpcharge: 0 },
                { name: "2XL", priceUpcharge: 2.50 },
                { name: "3XL", priceUpcharge: 4.00 }
              ]
            },
            {
              name: "Color",
              choices: [
                { name: "Black", priceUpcharge: 0 },
                { name: "Navy", priceUpcharge: 0 },
                { name: "White", priceUpcharge: 0 },
                { name: "Safety Orange", priceUpcharge: 0 },
                { name: "Safety Green", priceUpcharge: 0 }
              ]
            }
          ],
          createdAt: new Date()
        }
      ];

      for (const item of sampleItems) {
        await setDoc(doc(db, "apparel_products", item.id), item);
      }

      await fetchApparelProducts();
    } catch (err) {
      console.error("Seeding error:", err);
      alert("Failed to seed apparel samples: " + err.message);
    } finally {
      setSeeding(false);
    }
  };

  const handleExport = () => {
    try {
      const dataStr = JSON.stringify(products, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const exportFileDefaultName = `apex-apparel-export-${new Date().toISOString().slice(0, 10)}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export apparel products: " + err.message);
    }
  };

  // Filter products by search and category
  const filteredProducts = products.filter(p => {
    const nameLower = (p.name || "").toLowerCase();
    const skuLower = (p.sku || "").toLowerCase();
    const shortDescLower = (p.shortDescription || "").toLowerCase();
    const longDescLower = (p.longDescription || "").toLowerCase();
    const nameMatch = nameLower.includes(searchQuery.toLowerCase()) || 
                      skuLower.includes(searchQuery.toLowerCase()) ||
                      shortDescLower.includes(searchQuery.toLowerCase()) ||
                      longDescLower.includes(searchQuery.toLowerCase()) ||
                      p.id.includes(searchQuery);
                      
    const catVal = p.categoryId || "";
    const catMatch = filterCategory === "all" || 
                     catVal.toLowerCase().trim() === filterCategory.toLowerCase().trim() ||
                     (categories.find(c => c.id === filterCategory)?.name || "").toLowerCase().trim() === catVal.toLowerCase().trim();
                     
    return nameMatch && catMatch;
  });

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", color: "hsl(var(--accent-hsl))", letterSpacing: "0.05em", display: "block", marginBottom: "0.25rem" }}>
            Dedicated Apparel Module
          </span>
          <h1 style={{ fontSize: "2rem", fontWeight: 900, marginBottom: "0.25rem", color: "hsl(var(--primary-hsl))", letterSpacing: "-0.02em" }}>
            Apparel & Garments Catalog
          </h1>
          <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.95rem", fontWeight: 500 }}>
            Manage custom apparel products, garment views, calibration print boundaries, sizing matrices, and decoration settings.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link href="/admin/apparel/new" className="btn btn-primary" style={{ padding: "0.6rem 1.25rem", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Plus size={16} /> Add Apparel Product
          </Link>
          <button onClick={handleExport} className="btn btn-outline" style={{ padding: "0.6rem 1.25rem", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Download size={16} /> Export
          </button>
          {products.length === 0 && (
            <button 
              onClick={handleSeedApparelSamples} 
              disabled={seeding}
              className="btn btn-outline" 
              style={{ padding: "0.6rem 1.25rem", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
            >
              <Sparkles size={16} /> {seeding ? "Seeding..." : "Seed Sample Apparel"}
            </button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card" style={{ padding: "1rem 1.25rem", marginBottom: "2rem", display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center", border: "1px solid hsl(var(--border-hsl))" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: "260px" }}>
          <input
            className="input"
            placeholder="Search apparel by name, SKU, descriptions, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: "2.5rem" }}
          />
          <Search size={18} style={{
            position: "absolute",
            left: "0.85rem",
            top: "50%",
            transform: "translateY(-50%)",
            color: "hsl(var(--foreground-hsl) / 0.4)"
          }} />
        </div>

        {/* Category select */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Filter size={16} style={{ color: "hsl(var(--muted-hsl))" }} />
          <select
            className="input"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{ width: "200px" }}
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main product table */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "300px", color: "hsl(var(--muted-hsl))" }}>
          Loading apparel catalog...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "4rem", color: "hsl(var(--muted-hsl))", border: "1px solid hsl(var(--border-hsl))" }}>
          <Shirt size={48} style={{ strokeWidth: 1.5, marginBottom: "1rem", color: "hsl(var(--accent-hsl))", display: "inline-block" }} />
          <p style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem", color: "hsl(var(--foreground-hsl))" }}>
            No apparel products found.
          </p>
          <p style={{ fontSize: "0.875rem", marginBottom: "1.5rem" }}>
            Get started by creating a new apparel product or generating starter sample items.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
            <Link href="/admin/apparel/new" className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
              <Plus size={16} /> Create New Apparel Product
            </Link>
            <button onClick={handleSeedApparelSamples} disabled={seeding} className="btn btn-outline" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
              <Sparkles size={16} /> {seeding ? "Seeding Samples..." : "Seed Starter Apparel Items"}
            </button>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: "auto", border: "1px solid hsl(var(--border-hsl))" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.95rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid hsl(var(--border-hsl))", backgroundColor: "hsl(var(--secondary-hsl) / 0.2)" }}>
                <th style={{ padding: "1rem 1.5rem", fontWeight: 700, color: "hsl(var(--muted-hsl))" }}>APPAREL PRODUCT</th>
                <th style={{ padding: "1rem 1.5rem", fontWeight: 700, color: "hsl(var(--muted-hsl))" }}>GARMENT VIEWS & CALIBRATION</th>
                <th style={{ padding: "1rem 1.5rem", fontWeight: 700, color: "hsl(var(--muted-hsl))" }}>SIZING & OPTIONS</th>
                <th style={{ padding: "1rem 1.5rem", fontWeight: 700, color: "hsl(var(--muted-hsl))" }}>CATEGORY</th>
                <th style={{ padding: "1rem 1.5rem", fontWeight: 700, color: "hsl(var(--muted-hsl))" }}>BASE PRICE</th>
                <th style={{ padding: "1rem 1.5rem", fontWeight: 700, color: "hsl(var(--muted-hsl))" }}>MOQ</th>
                <th style={{ padding: "1rem 1.5rem", fontWeight: 700, color: "hsl(var(--muted-hsl))" }}>VISIBILITY</th>
                <th style={{ padding: "1rem 1.5rem", fontWeight: 700, color: "hsl(var(--muted-hsl))" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(product => {
                const displayCategory = categories.find(c => c.id === product.categoryId)?.name || product.categoryId || "Apparel";
                const isFrontCalibrated = product.garmentViews?.front?.calibration?.isCalibrated;
                const isBackCalibrated = product.garmentViews?.back?.calibration?.isCalibrated;

                return (
                  <tr key={product.id} className="table-row" style={{ borderBottom: "1px solid hsl(var(--border-hsl))", transition: "background 0.2s ease" }}>
                    {/* Product Info & Thumb */}
                    <td style={{ padding: "1.25rem 1.5rem", minWidth: "240px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        {product.images?.[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            style={{ width: "42px", height: "42px", objectFit: "cover", borderRadius: "6px", border: "1px solid hsl(var(--border-hsl))" }}
                          />
                        ) : (
                          <div style={{ width: "42px", height: "42px", borderRadius: "6px", backgroundColor: "hsl(var(--secondary-hsl))", display: "flex", alignItems: "center", justifyContent: "center", color: "hsl(var(--muted-hsl))" }}>
                            <Shirt size={20} />
                          </div>
                        )}
                        <div>
                          <p style={{ fontWeight: 800, color: "hsl(var(--foreground-hsl))", margin: 0, fontSize: "0.95rem" }}>
                            {product.name}
                          </p>
                          <p style={{ fontSize: "0.8rem", color: "hsl(var(--muted-hsl))", marginTop: "0.15rem", margin: 0 }}>
                            SKU: {product.sku || "N/A"} • ID: {product.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Garment Views & Calibration */}
                    <td style={{ padding: "1.25rem 1.5rem" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                        <div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
                          <span style={{
                            fontSize: "0.7rem",
                            fontWeight: 750,
                            padding: "0.15rem 0.45rem",
                            borderRadius: "4px",
                            backgroundColor: isFrontCalibrated ? "hsl(var(--success-hsl) / 0.12)" : "rgba(239, 68, 68, 0.1)",
                            color: isFrontCalibrated ? "hsl(var(--success-hsl))" : "hsl(var(--destructive-hsl))"
                          }}>
                            Front {isFrontCalibrated ? "Calibrated ✓" : "Uncalibrated ✗"}
                          </span>
                          {product.garmentViews?.back?.image && (
                            <span style={{
                              fontSize: "0.7rem",
                              fontWeight: 750,
                              padding: "0.15rem 0.45rem",
                              borderRadius: "4px",
                              backgroundColor: isBackCalibrated ? "hsl(var(--success-hsl) / 0.12)" : "hsl(var(--secondary-hsl))",
                              color: isBackCalibrated ? "hsl(var(--success-hsl))" : "hsl(var(--muted-hsl))"
                            }}>
                              Back {isBackCalibrated ? "✓" : "–"}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))" }}>
                          Interactive 2D/3D Mockup Visualizer
                        </span>
                      </div>
                    </td>

                    {/* Sizing & Option Groups */}
                    <td style={{ padding: "1.25rem 1.5rem", maxWidth: "220px" }}>
                      {product.options && product.options.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                          <span style={{ fontSize: "0.825rem", fontWeight: 700, color: "hsl(var(--foreground-hsl))" }}>
                            {product.options.length} Option Matrix Group{product.options.length > 1 ? "s" : ""}
                          </span>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                            {product.options.map((grp, gIdx) => (
                              <span key={gIdx} style={{
                                fontSize: "0.7rem",
                                padding: "0.1rem 0.4rem",
                                borderRadius: "3px",
                                backgroundColor: "hsl(var(--secondary-hsl))",
                                color: "hsl(var(--muted-hsl))"
                              }}>
                                {grp.name} ({grp.choices?.length || 0})
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: "0.8rem", color: "hsl(var(--muted-hsl))" }}>
                          Base sizing only
                        </span>
                      )}
                    </td>

                    {/* Category */}
                    <td style={{ padding: "1.25rem 1.5rem" }}>
                      <span style={{
                        display: "inline-block",
                        backgroundColor: "hsl(var(--secondary-hsl) / 0.6)",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        padding: "0.25rem 0.6rem",
                        borderRadius: "var(--radius-sm)",
                        color: "hsl(var(--foreground-hsl))"
                      }}>
                        {displayCategory}
                      </span>
                    </td>

                    {/* Base Price */}
                    <td style={{ padding: "1.25rem 1.5rem", fontWeight: 800, color: "hsl(var(--primary-hsl))" }}>
                      ${parseFloat(product.pricing?.startingPrice || product.pricing?.basePrice || 0).toFixed(2)} CAD
                    </td>

                    {/* MOQ */}
                    <td style={{ padding: "1.25rem 1.5rem", fontWeight: 700, fontSize: "0.85rem", color: "hsl(var(--muted-hsl))" }}>
                      {product.minimumOrderQuantity || 12} units
                    </td>

                    {/* Visibility Toggle */}
                    <td style={{ padding: "1.25rem 1.5rem" }}>
                      <button
                        onClick={() => handleToggleVisibility(product.id, product.isVisible)}
                        className="btn"
                        style={{
                          padding: "0.4rem 0.75rem",
                          fontSize: "0.8rem",
                          backgroundColor: product.isVisible ? "hsl(var(--success-hsl) / 0.1)" : "hsl(var(--secondary-hsl))",
                          color: product.isVisible ? "hsl(var(--success-hsl))" : "hsl(var(--muted-hsl))",
                          border: "1px solid transparent"
                        }}
                      >
                        {product.isVisible ? (
                          <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}><Eye size={14} /> Visible</span>
                        ) : (
                          <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}><EyeOff size={14} /> Hidden</span>
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "1.25rem 1.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <Link
                          href={`/admin/apparel/${product.id}`}
                          className="btn btn-outline"
                          style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                        >
                          <Edit3 size={14} /> Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDeleteApparelProduct(product.id, product.name)}
                          className="btn"
                          title="Delete apparel product"
                          style={{
                            padding: "0.4rem 0.6rem",
                            fontSize: "0.8rem",
                            backgroundColor: "rgba(239, 68, 68, 0.1)",
                            color: "hsl(var(--destructive-hsl))",
                            border: "1px solid rgba(239, 68, 68, 0.2)",
                            cursor: "pointer",
                            borderRadius: "var(--radius-sm)"
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AdminApparelPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh", color: "hsl(var(--muted-hsl))" }}>
        Loading apparel catalog...
      </div>
    }>
      <ApparelCatalogContent />
    </Suspense>
  );
}
