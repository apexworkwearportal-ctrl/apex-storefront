"use client";

import { useEffect, useState, Suspense } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, updateDoc, setDoc, doc } from "firebase/firestore";
import { AlertCircle, Eye, EyeOff, Search, Edit3, CheckCircle2, Download, Upload, Plus, Filter, X, ArrowRight, Table, Settings, Play, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

// Utility CSV parser with full support for quotes, commas, and escapes
function parseCSV(text) {
  const lines = [];
  let curLine = [];
  let curVal = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        curVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      curLine.push(curVal.trim());
      curVal = "";
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      curLine.push(curVal.trim());
      if (curLine.some(cell => cell.length > 0)) {
        lines.push(curLine);
      }
      curLine = [];
      curVal = "";
    } else {
      curVal += char;
    }
  }
  if (curVal || curLine.length > 0) {
    curLine.push(curVal.trim());
    if (curLine.some(cell => cell.length > 0)) {
      lines.push(curLine);
    }
  }

  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].map(h => h.replace(/^"|"$/g, '').trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const rowObj = {};
    const cells = lines[i];
    let hasData = false;
    headers.forEach((header, idx) => {
      const val = cells[idx] !== undefined ? cells[idx].replace(/^"|"$/g, '').trim() : "";
      rowObj[header] = val;
      if (val) hasData = true;
    });
    if (hasData) rows.push(rowObj);
  }
  return { headers, rows };
}

function ProductsContent() {
  const searchParams = useSearchParams();
  const initialAttention = searchParams.get("attention") === "true";

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAttention, setFilterAttention] = useState(initialAttention);
  const [filterCategory, setFilterCategory] = useState("all");
  const [categories, setCategories] = useState([]);

  // Advanced Import Modal States
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStep, setImportStep] = useState(1); // 1: File, 2: Key & Mapping, 3: Preview, 4: Results
  const [importFile, setImportFile] = useState(null);
  const [fileHeaders, setFileHeaders] = useState([]);
  const [fileRows, setFileRows] = useState([]);
  
  // Matching Key & Strategy Config
  const [matchTarget, setMatchTarget] = useState("sku"); // "id", "sku", "name"
  const [matchColumn, setMatchColumn] = useState("");
  const [importMode, setImportMode] = useState("update_and_create"); // "update_and_create", "update_only", "create_only"

  // Column Mapping
  const [columnMapping, setColumnMapping] = useState({
    id: "",
    sku: "",
    name: "",
    shortDescription: "",
    longDescription: "",
    categoryId: "",
    startingPrice: "",
    image: "",
    images: "",
    isVisible: "",
    needsAttention: ""
  });

  const [importExecuting, setImportExecuting] = useState(false);
  const [importResults, setImportResults] = useState(null);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      // Fetch categories
      const catSnapshot = await getDocs(collection(db, "categories"));
      const catList = [];
      catSnapshot.forEach(d => {
        catList.push({ id: d.id, ...d.data() });
      });
      setCategories(catList);

      // Fetch products
      const snapshot = await getDocs(collection(db, "products"));
      const list = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      
      // Sort client-side by name
      list.sort((a, b) => {
        const nameA = a.name || a.sinalite?.name || "";
        const nameB = b.name || b.sinalite?.name || "";
        return nameA.localeCompare(nameB);
      });
      
      setProducts(list);
    } catch (err) {
      console.error("Error loading products:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleToggleVisibility = async (productId, currentVisibility) => {
    try {
      const productRef = doc(db, "products", productId);
      await updateDoc(productRef, { isVisible: !currentVisibility });
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, isVisible: !currentVisibility } : p));
    } catch (err) {
      console.error("Failed to update visibility:", err);
    }
  };

  // Filter products
  const filteredProducts = products.filter(p => {
    const nameLower = (p.name || p.sinalite?.name || "").toLowerCase();
    const skuLower = (p.sku || p.sinalite?.sku || "").toLowerCase();
    const shortDescLower = (p.shortDescription || "").toLowerCase();
    const longDescLower = (p.longDescription || "").toLowerCase();
    const nameMatch = nameLower.includes(searchQuery.toLowerCase()) || 
                      skuLower.includes(searchQuery.toLowerCase()) ||
                      shortDescLower.includes(searchQuery.toLowerCase()) ||
                      longDescLower.includes(searchQuery.toLowerCase()) ||
                      p.id.includes(searchQuery);
                      
    const attentionMatch = !filterAttention || p.needsAttention;
    
    // Resolve category name/id to match selector
    const catVal = p.categoryOverride || p.categoryId || p.sinalite?.category || "";
    const catMatch = filterCategory === "all" || 
                     catVal.toLowerCase().trim() === filterCategory.toLowerCase().trim() ||
                     (categories.find(c => c.id === filterCategory)?.name || "").toLowerCase().trim() === catVal.toLowerCase().trim();
                     
    return nameMatch && attentionMatch && catMatch;
  });

  const handleExport = () => {
    try {
      const dataStr = JSON.stringify(products, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `apex-products-export-${new Date().toISOString().slice(0,10)}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export products: " + err.message);
    }
  };

  // File Select & Initial Auto-Mapping Parser
  const handleFileSelected = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target.result;
        let headers = [];
        let rows = [];

        if (file.name.toLowerCase().endsWith('.json')) {
          const parsed = JSON.parse(content);
          const dataArr = Array.isArray(parsed) ? parsed : (parsed.products || [parsed]);
          if (dataArr.length === 0) throw new Error("JSON file contains no products.");
          
          const headerSet = new Set();
          dataArr.forEach(item => {
            if (item && typeof item === 'object') {
              Object.keys(item).forEach(k => headerSet.add(k));
            }
          });
          headers = Array.from(headerSet);
          rows = dataArr;
        } else {
          // CSV Parsing
          const csvResult = parseCSV(content);
          headers = csvResult.headers;
          rows = csvResult.rows;
        }

        if (headers.length === 0 || rows.length === 0) {
          alert("The selected file is empty or could not be parsed.");
          return;
        }

        setImportFile(file);
        setFileHeaders(headers);
        setFileRows(rows);

        // Auto-detect column mapping
        const initialMapping = {
          id: "",
          sku: "",
          name: "",
          shortDescription: "",
          longDescription: "",
          categoryId: "",
          startingPrice: "",
          image: "",
          images: "",
          isVisible: "",
          needsAttention: ""
        };

        headers.forEach(h => {
          const lowerH = h.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (lowerH === 'id' || lowerH === 'productid') initialMapping.id = h;
          else if (lowerH === 'sku' || lowerH === 'skucode' || lowerH === 'productsku') initialMapping.sku = h;
          else if (lowerH === 'name' || lowerH === 'productname' || lowerH === 'title') initialMapping.name = h;
          else if (lowerH === 'shortdescription' || lowerH === 'shortdesc' || lowerH === 'summary') initialMapping.shortDescription = h;
          else if (lowerH === 'longdescription' || lowerH === 'longdesc' || lowerH === 'description' || lowerH === 'specs' || lowerH === 'details') initialMapping.longDescription = h;
          else if (lowerH === 'category' || lowerH === 'categoryid' || lowerH === 'cat') initialMapping.categoryId = h;
          else if (lowerH === 'price' || lowerH === 'startingprice' || lowerH === 'baseprice') initialMapping.startingPrice = h;
          else if (['images', 'gallery', 'productimages', 'imageurls', 'photos', 'galleryimages'].includes(lowerH)) initialMapping.images = h;
          else if (['image', 'storefrontimage', 'mainimage', 'productimage', 'imageurl', 'img', 'photo', 'coverimage', 'thumbnail'].includes(lowerH)) initialMapping.image = h;
          else if (lowerH === 'isvisible' || lowerH === 'visible' || lowerH === 'active') initialMapping.isVisible = h;
          else if (lowerH === 'needsattention' || lowerH === 'attention') initialMapping.needsAttention = h;
        });

        // Auto match column selection
        const autoMatch = initialMapping.sku || initialMapping.id || initialMapping.name || headers[0];
        setMatchColumn(autoMatch);
        setMatchTarget(initialMapping.sku ? "sku" : initialMapping.id ? "id" : "name");
        setColumnMapping(initialMapping);
        setImportStep(2);
      } catch (err) {
        console.error("File parse error:", err);
        alert("Failed to parse file: " + err.message);
      }
    };

    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    setImportExecuting(true);
    setImportStep(4);
    let updatedCount = 0;
    let createdCount = 0;
    let failCount = 0;
    const errors = [];

    for (let i = 0; i < fileRows.length; i++) {
      const row = fileRows[i];
      
      const valId = columnMapping.id ? String(row[columnMapping.id] || '').trim() : '';
      const valSku = columnMapping.sku ? String(row[columnMapping.sku] || '').trim() : '';
      const valName = columnMapping.name ? String(row[columnMapping.name] || '').trim() : '';
      const valShortDesc = columnMapping.shortDescription ? String(row[columnMapping.shortDescription] || '').trim() : '';
      const valLongDesc = columnMapping.longDescription ? String(row[columnMapping.longDescription] || '').trim() : '';
      const valCategory = columnMapping.categoryId ? String(row[columnMapping.categoryId] || '').trim() : '';
      const valPrice = columnMapping.startingPrice ? String(row[columnMapping.startingPrice] || '').trim() : '';
      const valImage = columnMapping.image ? String(row[columnMapping.image] || '').trim() : '';
      const valImagesRaw = columnMapping.images ? String(row[columnMapping.images] || '').trim() : '';
      const valIsVisible = columnMapping.isVisible ? String(row[columnMapping.isVisible] || '').trim() : '';
      const valNeedsAttention = columnMapping.needsAttention ? String(row[columnMapping.needsAttention] || '').trim() : '';

      // Parse gallery images list
      let parsedImages = [];
      if (valImagesRaw) {
        if (valImagesRaw.startsWith("[") && valImagesRaw.endsWith("]")) {
          try {
            parsedImages = JSON.parse(valImagesRaw);
          } catch (e) {
            parsedImages = valImagesRaw.split(/[,;\n|]+/).map(s => s.trim()).filter(Boolean);
          }
        } else {
          parsedImages = valImagesRaw.split(/[,;\n|]+/).map(s => s.trim()).filter(Boolean);
        }
      }

      if (valImage && !parsedImages.includes(valImage)) {
        parsedImages.unshift(valImage);
      }

      const mainImage = valImage || parsedImages[0] || "";

      const matchVal = matchColumn ? String(row[matchColumn] || '').trim() : '';

      if (!matchVal) {
        failCount++;
        errors.push(`Row ${i + 1}: Match column "${matchColumn}" is empty.`);
        continue;
      }

      let existing = null;
      if (matchTarget === 'id') {
        existing = products.find(p => p.id === matchVal);
      } else if (matchTarget === 'sku') {
        existing = products.find(p => (p.sku || p.sinalite?.sku || '').toLowerCase() === matchVal.toLowerCase());
      } else if (matchTarget === 'name') {
        existing = products.find(p => (p.name || p.sinalite?.name || '').toLowerCase() === matchVal.toLowerCase());
      }

      try {
        if (existing) {
          if (importMode === 'create_only') {
            continue;
          }

          const docRef = doc(db, "products", existing.id);
          const updatePayload = {};

          if (valName) updatePayload.name = valName;
          if (valSku) updatePayload.sku = valSku;
          if (valShortDesc) updatePayload.shortDescription = valShortDesc;
          if (valLongDesc) updatePayload.longDescription = valLongDesc;
          if (valLongDesc || valShortDesc) updatePayload.description = valLongDesc || valShortDesc;
          if (valCategory) updatePayload.categoryOverride = valCategory;
          if (valPrice !== '') {
            updatePayload["pricing.startingPriceOverride"] = parseFloat(valPrice) || 0;
          }
          if (mainImage) {
            updatePayload.image = mainImage;
            updatePayload.imageUrl = mainImage;
            updatePayload.storefrontImage = mainImage;
          }
          if (parsedImages.length > 0) {
            updatePayload.images = parsedImages;
          }
          if (valIsVisible !== '') {
            updatePayload.isVisible = valIsVisible === 'true' || valIsVisible === '1' || valIsVisible === 'yes';
          }
          if (valNeedsAttention !== '') {
            updatePayload.needsAttention = valNeedsAttention === 'true' || valNeedsAttention === '1' || valNeedsAttention === 'yes';
          }

          await updateDoc(docRef, updatePayload);
          updatedCount++;
        } else {
          if (importMode === 'update_only') {
            continue;
          }

          const newRef = doc(collection(db, "products"));
          const targetDocId = valId || newRef.id;
          const targetRef = doc(db, "products", targetDocId);

          const newPayload = {
            id: targetDocId,
            isCustom: true,
            name: valName || matchVal,
            sku: valSku || (matchTarget === 'sku' ? matchVal : `SKU-${targetDocId.slice(0, 6)}`),
            shortDescription: valShortDesc || "",
            longDescription: valLongDesc || "",
            description: valLongDesc || valShortDesc || "",
            categoryId: valCategory || (categories[0]?.id || ""),
            pricing: {
              startingPrice: parseFloat(valPrice) || 0
            },
            image: mainImage,
            imageUrl: mainImage,
            storefrontImage: mainImage,
            images: parsedImages.length > 0 ? parsedImages : (mainImage ? [mainImage] : []),
            isVisible: valIsVisible !== '' ? (valIsVisible === 'true' || valIsVisible === '1' || valIsVisible === 'yes') : true,
            needsAttention: valNeedsAttention !== '' ? (valNeedsAttention === 'true' || valNeedsAttention === '1' || valNeedsAttention === 'yes') : false,
            createdAt: new Date()
          };

          await setDoc(targetRef, newPayload);
          createdCount++;
        }
      } catch (err) {
        console.error(`Import row ${i + 1} error:`, err);
        failCount++;
        errors.push(`Row ${i + 1} (${matchVal}): ${err.message}`);
      }
    }

    setImportResults({
      updatedCount,
      createdCount,
      failCount,
      errors
    });
    setImportExecuting(false);
    fetchProducts();
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    setImportStep(1);
    setImportFile(null);
    setFileHeaders([]);
    setFileRows([]);
    setImportResults(null);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", color: "hsl(var(--accent-hsl))", letterSpacing: "0.05em", display: "block", marginBottom: "0.25rem" }}>
            Store Catalog
          </span>
          <h1 style={{ fontSize: "2rem", fontWeight: 900, marginBottom: "0.25rem", color: "hsl(var(--primary-hsl))", letterSpacing: "-0.02em" }}>
            Product Catalog List
          </h1>
          <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.95rem", fontWeight: 500 }}>
            Manage synced items, configure short & long descriptions, and edit visibility toggles.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link href="/admin/products/new" className="btn btn-primary" style={{ padding: "0.6rem 1.25rem", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Plus size={16} /> Add Custom Product
          </Link>
          <button onClick={handleExport} className="btn btn-outline" style={{ padding: "0.6rem 1.25rem", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Download size={16} /> Export
          </button>
          <button 
            onClick={() => setShowImportModal(true)} 
            className="btn btn-outline" 
            style={{ padding: "0.6rem 1.25rem", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
          >
            <Upload size={16} /> Advanced Import
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card" style={{ padding: "1rem 1.25rem", marginBottom: "2rem", display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center", border: "1px solid hsl(var(--border-hsl))" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: "260px" }}>
          <input
            className="input"
            placeholder="Search by name, SKU, short/long description, or ID..."
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

        {/* Needs Attention Filter Toggle */}
        <button
          onClick={() => setFilterAttention(!filterAttention)}
          className="btn"
          style={{
            padding: "0.6rem 1.25rem",
            fontSize: "0.85rem",
            backgroundColor: filterAttention ? "hsl(var(--accent-hsl))" : "white",
            color: filterAttention ? "white" : "hsl(var(--foreground-hsl))",
            border: "1px solid hsl(var(--border-hsl))"
          }}
        >
          <AlertCircle size={16} /> Needs Attention
        </button>
      </div>

      {/* Main product table */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "300px", color: "hsl(var(--muted-hsl))" }}>
          Loading products catalog...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "4rem", color: "hsl(var(--muted-hsl))", border: "1px solid hsl(var(--border-hsl))" }}>
          No products match your filters.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: "auto", border: "1px solid hsl(var(--border-hsl))" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.95rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid hsl(var(--border-hsl))", backgroundColor: "hsl(var(--secondary-hsl) / 0.2)" }}>
                <th style={{ padding: "1rem 1.5rem", fontWeight: 700, color: "hsl(var(--muted-hsl))" }}>PRODUCT INFO</th>
                <th style={{ padding: "1rem 1.5rem", fontWeight: 700, color: "hsl(var(--muted-hsl))" }}>DESCRIPTIONS</th>
                <th style={{ padding: "1rem 1.5rem", fontWeight: 700, color: "hsl(var(--muted-hsl))" }}>CATEGORY</th>
                <th style={{ padding: "1rem 1.5rem", fontWeight: 700, color: "hsl(var(--muted-hsl))" }}>STARTING PRICE</th>
                <th style={{ padding: "1rem 1.5rem", fontWeight: 700, color: "hsl(var(--muted-hsl))" }}>STATUS</th>
                <th style={{ padding: "1rem 1.5rem", fontWeight: 700, color: "hsl(var(--muted-hsl))" }}>VISIBILITY</th>
                <th style={{ padding: "1rem 1.5rem", fontWeight: 700, color: "hsl(var(--muted-hsl))" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(product => (
                <tr key={product.id} className="table-row" style={{ borderBottom: "1px solid hsl(var(--border-hsl))", transition: "background 0.2s ease" }}>
                  {/* Name and SKU */}
                  <td style={{ padding: "1.25rem 1.5rem", minWidth: "220px" }}>
                    <p style={{ fontWeight: 700, color: "hsl(var(--foreground-hsl))" }}>{product.name || product.sinalite?.name}</p>
                    <p style={{ fontSize: "0.8rem", color: "hsl(var(--muted-hsl))", marginTop: "0.15rem" }}>
                      SKU: {product.sku || product.sinalite?.sku || "N/A"} • ID: {product.id}
                    </p>
                  </td>
                  {/* Descriptions Preview */}
                  <td style={{ padding: "1.25rem 1.5rem", maxWidth: "260px" }}>
                    <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "hsl(var(--foreground-hsl))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <span style={{ fontSize: "0.7rem", color: "hsl(var(--accent-hsl))", textTransform: "uppercase" }}>Short: </span>
                      {product.shortDescription || product.description || "N/A"}
                    </p>
                    <p style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: "0.2rem" }}>
                      <span style={{ fontSize: "0.7rem", color: "hsl(var(--primary-hsl))", textTransform: "uppercase" }}>Long: </span>
                      {product.longDescription || product.description || "N/A"}
                    </p>
                  </td>
                  {/* Category */}
                  <td style={{ padding: "1.25rem 1.5rem" }}>
                    <span style={{
                      display: "inline-block",
                      backgroundColor: "hsl(var(--secondary-hsl) / 0.5)",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      padding: "0.25rem 0.6rem",
                      borderRadius: "var(--radius-sm)",
                      color: "hsl(var(--muted-hsl))"
                    }}>
                      {categories.find(c => c.id === product.categoryId)?.name || product.categoryOverride || product.sinalite?.category || product.categoryId}
                    </span>
                  </td>
                  {/* Starting Price */}
                  <td style={{ padding: "1.25rem 1.5rem", fontWeight: 700, color: "hsl(var(--primary-hsl))" }}>
                    ${parseFloat(product.pricing?.startingPriceOverride || product.pricing?.startingPrice || 19.99).toFixed(2)} CAD
                  </td>
                  {/* Status Badges */}
                  <td style={{ padding: "1.25rem 1.5rem" }}>
                    {product.isCustom ? (
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        color: "hsl(var(--primary-hsl))",
                        fontSize: "0.7rem",
                        fontWeight: 800,
                        backgroundColor: "hsl(var(--primary-hsl) / 0.1)",
                        padding: "0.25rem 0.5rem",
                        borderRadius: "4px",
                        textTransform: "uppercase"
                      }}>
                        Custom Product
                      </span>
                    ) : product.needsAttention ? (
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        color: "hsl(var(--destructive-hsl))",
                        fontSize: "0.7rem",
                        fontWeight: 800,
                        backgroundColor: "hsl(var(--destructive-hsl) / 0.1)",
                        padding: "0.25rem 0.5rem",
                        borderRadius: "4px",
                        textTransform: "uppercase"
                      }}>
                        <AlertCircle size={12} /> Needs Info
                      </span>
                    ) : (
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        color: "hsl(var(--success-hsl))",
                        fontSize: "0.7rem",
                        fontWeight: 800,
                        backgroundColor: "hsl(var(--success-hsl) / 0.1)",
                        padding: "0.25rem 0.5rem",
                        borderRadius: "4px",
                        textTransform: "uppercase"
                      }}>
                        <CheckCircle2 size={12} /> Synced
                      </span>
                    )}
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
                  {/* Action */}
                  <td style={{ padding: "1.25rem 1.5rem" }}>
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="btn btn-outline"
                      style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}
                    >
                      <Edit3 size={14} /> Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ADVANCED IMPORT MODAL */}
      {showImportModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(6px)",
          zIndex: 1000,
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
            boxShadow: "0 20px 40px rgba(0,0,0,0.25)"
          }}>
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", borderBottom: "1px solid hsl(var(--border-hsl))", paddingBottom: "1rem" }}>
              <div>
                <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "hsl(var(--primary-hsl))" }}>
                  Product Import & Column Mapper
                </h2>
                <p style={{ fontSize: "0.85rem", color: "hsl(var(--muted-hsl))" }}>
                  Map CSV or JSON columns to update existing products or import new catalog items.
                </p>
              </div>
              <button 
                onClick={closeImportModal} 
                style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(var(--muted-hsl))", padding: "0.4rem" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Stepper Header */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", borderBottom: "1px solid hsl(var(--border-hsl))", paddingBottom: "1rem" }}>
              <div style={{ flex: 1, padding: "0.5rem", borderRadius: "var(--radius-sm)", backgroundColor: importStep === 1 ? "hsl(var(--accent-hsl) / 0.15)" : "hsl(var(--secondary-hsl) / 0.3)", color: importStep === 1 ? "hsl(var(--accent-hsl))" : "hsl(var(--muted-hsl))", fontWeight: 700, fontSize: "0.8rem", textAlign: "center" }}>
                1. Upload File
              </div>
              <div style={{ flex: 1, padding: "0.5rem", borderRadius: "var(--radius-sm)", backgroundColor: importStep === 2 ? "hsl(var(--accent-hsl) / 0.15)" : "hsl(var(--secondary-hsl) / 0.3)", color: importStep === 2 ? "hsl(var(--accent-hsl))" : "hsl(var(--muted-hsl))", fontWeight: 700, fontSize: "0.8rem", textAlign: "center" }}>
                2. Key & Mapping
              </div>
              <div style={{ flex: 1, padding: "0.5rem", borderRadius: "var(--radius-sm)", backgroundColor: importStep === 3 ? "hsl(var(--accent-hsl) / 0.15)" : "hsl(var(--secondary-hsl) / 0.3)", color: importStep === 3 ? "hsl(var(--accent-hsl))" : "hsl(var(--muted-hsl))", fontWeight: 700, fontSize: "0.8rem", textAlign: "center" }}>
                3. Preview & Run
              </div>
            </div>

            {/* STEP 1: FILE SELECTION */}
            {importStep === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", padding: "1rem 0" }}>
                <div style={{
                  border: "2px dashed hsl(var(--border-hsl))",
                  borderRadius: "var(--radius-md)",
                  padding: "3rem 1.5rem",
                  textAlign: "center",
                  position: "relative",
                  backgroundColor: "hsl(var(--secondary-hsl) / 0.15)",
                  cursor: "pointer"
                }}>
                  <input
                    type="file"
                    accept=".csv,.json"
                    onChange={handleFileSelected}
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      width: "100%",
                      height: "100%",
                      opacity: 0,
                      cursor: "pointer"
                    }}
                  />
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
                    <Upload size={36} style={{ color: "hsl(var(--accent-hsl))" }} />
                    <p style={{ fontWeight: 700, fontSize: "1.1rem" }}>Click or drop CSV / JSON file to import</p>
                    <p style={{ fontSize: "0.85rem", color: "hsl(var(--muted-hsl))" }}>
                      Supports spreadsheet CSV exports and JSON arrays of product objects.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: KEY MATCHING & COLUMN MAPPING */}
            {importStep === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {/* File info summary */}
                <div style={{ padding: "0.85rem 1rem", backgroundColor: "hsl(var(--secondary-hsl) / 0.3)", borderRadius: "var(--radius-sm)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem" }}>
                  <span>File: <strong>{importFile?.name}</strong> ({fileRows.length} rows detected)</span>
                  <button onClick={() => setImportStep(1)} style={{ background: "none", border: "none", color: "hsl(var(--accent-hsl))", fontWeight: 700, cursor: "pointer" }}>Change File</button>
                </div>

                {/* Match Key & Replacement Config */}
                <div className="card" style={{ backgroundColor: "hsl(var(--secondary-hsl) / 0.2)", padding: "1.25rem", border: "1px solid hsl(var(--border-hsl))" }}>
                  <h3 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Settings size={16} /> Key Matching & Update Strategy
                  </h3>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div>
                      <label className="label">Target System Key Field</label>
                      <select className="input" value={matchTarget} onChange={(e) => setMatchTarget(e.target.value)}>
                        <option value="sku">Product SKU (Recommended)</option>
                        <option value="id">Product ID (Database Document ID)</option>
                        <option value="name">Product Name</option>
                      </select>
                    </div>

                    <div>
                      <label className="label">Source Column to Match</label>
                      <select className="input" value={matchColumn} onChange={(e) => setMatchColumn(e.target.value)}>
                        <option value="">Select source column...</option>
                        {fileHeaders.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ marginTop: "1rem" }}>
                    <label className="label">Import Replacement Mode</label>
                    <select className="input" value={importMode} onChange={(e) => setImportMode(e.target.value)}>
                      <option value="update_and_create">Update Existing Products & Add New Products</option>
                      <option value="update_only">Update Existing Products Only (Skip New)</option>
                      <option value="create_only">Add New Products Only (Skip Existing)</option>
                    </select>
                  </div>
                </div>

                {/* Column Mapping Matrix */}
                <div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: "0.75rem" }}>Map Column Headers</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "280px", overflowY: "auto", paddingRight: "0.5rem" }}>
                    {[
                      { key: "sku", label: "SKU / Product Code" },
                      { key: "name", label: "Product Name" },
                      { key: "shortDescription", label: "Short Description (Summary)" },
                      { key: "longDescription", label: "Long Description (Detailed Specs)" },
                      { key: "categoryId", label: "Category / Category ID" },
                      { key: "startingPrice", label: "Starting Base Price ($ CAD)" },
                      { key: "image", label: "Main Storefront Image URL" },
                      { key: "images", label: "Gallery Images (Comma/Semicolon Separated URLs)" },
                      { key: "isVisible", label: "Is Visible (true/false/1/0)" },
                      { key: "needsAttention", label: "Needs Attention (true/false)" },
                      { key: "id", label: "Product Document ID" },
                    ].map(field => (
                      <div key={field.key} style={{ display: "grid", gridTemplateColumns: "1.2fr 1.5fr", gap: "1rem", alignItems: "center" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{field.label}</span>
                        <select
                          className="input"
                          value={columnMapping[field.key] || ""}
                          onChange={(e) => setColumnMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                          style={{ fontSize: "0.85rem", padding: "0.4rem 0.75rem" }}
                        >
                          <option value="">-- Do Not Import / Skip --</option>
                          {fileHeaders.map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
                  <button onClick={closeImportModal} className="btn btn-outline">Cancel</button>
                  <button onClick={() => setImportStep(3)} className="btn btn-primary" disabled={!matchColumn}>
                    Continue to Preview <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: PREVIEW & CONFIRM */}
            {importStep === 3 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: "0.5rem" }}>Import Mapping Preview</h3>
                  <p style={{ fontSize: "0.85rem", color: "hsl(var(--muted-hsl))" }}>
                    Previewing how the first 3 rows from your file will be converted into products:
                  </p>
                </div>

                <div style={{ overflowX: "auto", border: "1px solid hsl(var(--border-hsl))", borderRadius: "var(--radius-md)" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "left" }}>
                    <thead>
                      <tr style={{ backgroundColor: "hsl(var(--secondary-hsl) / 0.3)", borderBottom: "1px solid hsl(var(--border-hsl))" }}>
                        <th style={{ padding: "0.6rem 0.85rem" }}>Matching Key ({matchColumn})</th>
                        <th style={{ padding: "0.6rem 0.85rem" }}>Mapped Name</th>
                        <th style={{ padding: "0.6rem 0.85rem" }}>Storefront Image</th>
                        <th style={{ padding: "0.6rem 0.85rem" }}>Short Description</th>
                        <th style={{ padding: "0.6rem 0.85rem" }}>Long Description</th>
                        <th style={{ padding: "0.6rem 0.85rem" }}>Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fileRows.slice(0, 3).map((row, idx) => {
                        const imgUrl = columnMapping.image ? row[columnMapping.image] : (columnMapping.images ? row[columnMapping.images]?.split(/[,;\n|]+/)[0] : "");
                        return (
                          <tr key={idx} style={{ borderBottom: "1px solid hsl(var(--border-hsl))" }}>
                            <td style={{ padding: "0.6rem 0.85rem", fontWeight: 700 }}>{row[matchColumn] || <i>Empty</i>}</td>
                            <td style={{ padding: "0.6rem 0.85rem" }}>{row[columnMapping.name] || <i>Unchanged</i>}</td>
                            <td style={{ padding: "0.6rem 0.85rem" }}>
                              {imgUrl ? (
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                  <img src={imgUrl} alt="Preview" style={{ width: "24px", height: "24px", objectFit: "contain", borderRadius: "4px", backgroundColor: "#f8fafc" }} />
                                  <span style={{ fontSize: "0.75rem", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "hsl(var(--accent-hsl))" }}>{imgUrl}</span>
                                </div>
                              ) : (
                                <i>No Image Mapped</i>
                              )}
                            </td>
                            <td style={{ padding: "0.6rem 0.85rem", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {row[columnMapping.shortDescription] || <i>Unchanged</i>}
                            </td>
                            <td style={{ padding: "0.6rem 0.85rem", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {row[columnMapping.longDescription] || <i>Unchanged</i>}
                            </td>
                            <td style={{ padding: "0.6rem 0.85rem" }}>{row[columnMapping.startingPrice] ? `$${row[columnMapping.startingPrice]}` : <i>Unchanged</i>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{ padding: "1rem", backgroundColor: "hsl(var(--secondary-hsl) / 0.3)", borderRadius: "var(--radius-md)", fontSize: "0.85rem" }}>
                  <p style={{ fontWeight: 700 }}>Ready to run import:</p>
                  <ul style={{ paddingLeft: "1.25rem", marginTop: "0.25rem", color: "hsl(var(--foreground-hsl) / 0.8)" }}>
                    <li>Total rows to process: <strong>{fileRows.length}</strong></li>
                    <li>Matching Strategy: Match <strong>{matchTarget.toUpperCase()}</strong> against column <strong>"{matchColumn}"</strong></li>
                    <li>Mode: <strong>{importMode.replace(/_/g, ' ')}</strong></li>
                  </ul>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
                  <button onClick={() => setImportStep(2)} className="btn btn-outline">Back to Mapping</button>
                  <button onClick={handleExecuteImport} className="btn btn-primary" style={{ padding: "0.75rem 1.5rem" }}>
                    <Play size={16} /> Run Import Now
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: EXECUTING & RESULTS */}
            {importStep === 4 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", textAlign: "center", padding: "1.5rem 0" }}>
                {importExecuting ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
                    <RefreshCw size={36} style={{ animation: "spin 1.5s linear infinite", color: "hsl(var(--accent-hsl))" }} />
                    <h3 style={{ fontSize: "1.2rem", fontWeight: 800 }}>Importing Products into Database...</h3>
                    <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.9rem" }}>Updating matching items and creating new entries.</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", textAlign: "left" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: "hsl(var(--success-hsl))" }}>
                      <CheckCircle2 size={28} />
                      <h3 style={{ fontSize: "1.3rem", fontWeight: 800 }}>Import Execution Completed!</h3>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                      <div className="card" style={{ padding: "1rem", textAlign: "center", backgroundColor: "hsl(var(--success-hsl) / 0.1)" }}>
                        <p style={{ fontSize: "1.5rem", fontWeight: 900, color: "hsl(var(--success-hsl))" }}>{importResults?.updatedCount || 0}</p>
                        <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "hsl(var(--muted-hsl))" }}>Products Updated</p>
                      </div>
                      <div className="card" style={{ padding: "1rem", textAlign: "center", backgroundColor: "hsl(var(--primary-hsl) / 0.1)" }}>
                        <p style={{ fontSize: "1.5rem", fontWeight: 900, color: "hsl(var(--primary-hsl))" }}>{importResults?.createdCount || 0}</p>
                        <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "hsl(var(--muted-hsl))" }}>Products Created</p>
                      </div>
                      <div className="card" style={{ padding: "1rem", textAlign: "center", backgroundColor: "hsl(var(--destructive-hsl) / 0.1)" }}>
                        <p style={{ fontSize: "1.5rem", fontWeight: 900, color: "hsl(var(--destructive-hsl))" }}>{importResults?.failCount || 0}</p>
                        <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "hsl(var(--muted-hsl))" }}>Failed / Skipped</p>
                      </div>
                    </div>

                    {importResults?.errors && importResults.errors.length > 0 && (
                      <div>
                        <p style={{ fontWeight: 700, color: "hsl(var(--destructive-hsl))", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                          Execution Error Logs:
                        </p>
                        <ul style={{
                          listStyle: "none",
                          padding: "0.75rem",
                          backgroundColor: "rgba(0,0,0,0.05)",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "0.8rem",
                          maxHeight: "120px",
                          overflowY: "auto"
                        }}>
                          {importResults.errors.map((err, idx) => (
                            <li key={idx} style={{ color: "hsl(var(--destructive-hsl))", marginBottom: "0.25rem" }}>• {err}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
                      <button onClick={closeImportModal} className="btn btn-primary" style={{ padding: "0.75rem 2rem" }}>
                        Close & Refresh View
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default function AdminProductsPage() {
  return (
    <Suspense fallback={<div style={{ padding: "3rem", textAlign: "center", color: "hsl(var(--muted-hsl))" }}>Loading catalog interface...</div>}>
      <ProductsContent />
    </Suspense>
  );
}
