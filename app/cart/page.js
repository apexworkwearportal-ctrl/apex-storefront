"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2, Upload, AlertCircle, ShoppingCart, Loader2, ArrowRight, MapPin, DollarSign, FileText, Ticket, Tag, Check, X, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

import { COUNTRIES, CANADIAN_PROVINCES, US_STATES, normalizeCountryCode, normalizeStateCode } from "@/lib/location-data";

export default function CartPage() {
  const { cart, updateQuantity, removeFromCart, cartCount } = useCart();
  const { user, userData } = useAuth();
  const router = useRouter();

  // Address form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [suite, setSuite] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("ON");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("CA");

  // Fulfillment & Checkout states
  const [fulfillmentMethod, setFulfillmentMethod] = useState("shipping"); // "shipping" | "pickup"
  const [shippingRates, setShippingRates] = useState([]);
  const [loadingRates, setLoadingRates] = useState(false);
  const [ratesError, setRatesError] = useState("");
  const [selectedRate, setSelectedRate] = useState(null);
  
  const [uploadingItemIds, setUploadingItemIds] = useState({}); // { [itemId]: boolean }
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  // Promo Code states
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [promoSuccess, setPromoSuccess] = useState("");

  // Pre-fill email from auth on load
  useEffect(() => {
    if (user) {
      setEmail(user.email || "");
      if (userData?.name) {
        const parts = userData.name.split(" ");
        setFirstName(parts[0] || "");
        setLastName(parts.slice(1).join(" ") || "");
      }
    }
  }, [user, userData]);

  const handleSavedAddressSelect = (addrId) => {
    const selected = (userData?.addresses || []).find(a => a.id === addrId);
    if (selected) {
      const parts = userData.name?.split(" ") || ["", ""];
      setFirstName(parts[0] || "");
      setLastName(parts.slice(1).join(" ") || "");
      setPhone(selected.phone || "");
      setAddress(selected.addressLine1 || "");
      setSuite(selected.addressLine2 || "");
      setCity(selected.city || "");
      const normCountry = normalizeCountryCode(selected.country);
      setCountry(normCountry);
      setState(normalizeStateCode(selected.state, normCountry));
      setZip(selected.zip || "");
    }
  };

  const handleUploadArtwork = async (itemId, file) => {
    if (!file) return;
    
    setUploadingItemIds(prev => ({ ...prev, [itemId]: true }));
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload artwork.");
      }

      // Add to item in cart context
      const cartItem = cart.find(i => i.id === itemId);
      if (cartItem) {
        const currentArt = cartItem.artworkFiles || [];
        cartItem.artworkFiles = [...currentArt, { name: data.name, url: data.url }];
        // Trigger a force re-render in cart context (modifying quantity is a simple way or we can trigger it)
        updateQuantity(itemId, cartItem.quantity);
      }
    } catch (e) {
      alert("Upload failed: " + e.message);
    } finally {
      setUploadingItemIds(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const handleRemoveArtwork = (itemId, fileIdx) => {
    const cartItem = cart.find(i => i.id === itemId);
    if (cartItem) {
      cartItem.artworkFiles = (cartItem.artworkFiles || []).filter((_, idx) => idx !== fileIdx);
      updateQuantity(itemId, cartItem.quantity);
    }
  };

  const handleCalculateShipping = async (e) => {
    e.preventDefault();
    if (!address || !city || !state || !zip || !phone || !email) {
      setRatesError("Please complete all shipping address fields first.");
      return;
    }

    setLoadingRates(true);
    setRatesError("");
    setShippingRates([]);
    setSelectedRate(null);

    try {
      const res = await fetch("/api/shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map(i => ({
            productId: i.productId,
            name: i.name,
            quantity: i.quantity || 1,
            isCustom: Boolean(i.isCustom),
            isApparel: Boolean(i.isApparel),
            category: i.category || i.categoryId || "",
            categoryId: i.categoryId || "",
            selectedOptionMap: i.selectedOptionMap || {},
            options: i.selectedOptionMap || i.options || {},
            sidesPages: i.sidesPages || null,
            customPrintSizes: i.customPrintSizes || null
          })),
          shippingAddress: {
            ShipFName: firstName,
            ShipLName: lastName,
            ShipPhone: phone,
            ShipEmail: email,
            ShipAddr: address,
            ShipAddr2: suite,
            ShipCity: city,
            ShipState: state,
            ShipZip: zip,
            ShipCountry: country,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to query shipping rates.");
      }

      setShippingRates(data);
      if (data.length > 0) {
        setSelectedRate(data[0]); // Select first option by default
      }
    } catch (err) {
      console.error(err);
      setRatesError(err.message || "Failed to calculate shipping. Please verify postal code format.");
    } finally {
      setLoadingRates(false);
    }
  };

  // Promo code apply & remove handlers
  const handleApplyPromo = async (e) => {
    if (e) e.preventDefault();
    if (!promoCodeInput.trim()) return;

    setPromoLoading(true);
    setPromoError("");
    setPromoSuccess("");

    try {
      // Lightweight items for promo validation: only send fields needed for validation
      const sanitizedItems = cart.map(item => ({
        productId: item.productId,
        name: item.name,
        price: parseFloat(item.price) || 0,
        quantity: parseInt(item.quantity) || 1,
        categoryId: item.categoryId || item.category || null,
        category: item.category || null,
        isApparel: Boolean(item.isApparel),
        isCustom: Boolean(item.isCustom)
      }));

      const res = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: promoCodeInput.trim(),
          items: sanitizedItems,
          subtotal: subtotal,
          email: email || user?.email || "",
          userId: user ? user.uid : null,
        }),
      });

      let data;
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || `Promo validation failed (HTTP ${res.status})`);
      }

      if (!res.ok || !data.valid) {
        throw new Error(data.error || "Invalid promo code");
      }

      setAppliedPromo(data.promo);
      setPromoSuccess(data.message || `Promo code "${data.promo.code}" applied!`);
    } catch (err) {
      setPromoError(err.message || "Failed to apply promo code");
      setAppliedPromo(null);
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCodeInput("");
    setPromoError("");
    setPromoSuccess("");
  };

  // Math totals
  const pickupOnlyItems = cart.filter(i => i.fulfillmentOption === "pickup_only");
  const shippingOnlyItems = cart.filter(i => i.fulfillmentOption === "shipping_only");
  const hasPickupOnly = pickupOnlyItems.length > 0;
  const hasShippingOnly = shippingOnlyItems.length > 0;
  const hasFulfillmentConflict = hasPickupOnly && hasShippingOnly;

  // Auto-sync fulfillment method if restricted by cart items
  useEffect(() => {
    if (hasPickupOnly && !hasShippingOnly && fulfillmentMethod !== "pickup") {
      setFulfillmentMethod("pickup");
      setSelectedRate({ serviceName: "Store Pickup (Free)", price: 0 });
      setRatesError("");
    } else if (hasShippingOnly && !hasPickupOnly && fulfillmentMethod !== "shipping") {
      setFulfillmentMethod("shipping");
      setSelectedRate(shippingRates.length > 0 ? shippingRates[0] : null);
      setRatesError("");
    }
  }, [hasPickupOnly, hasShippingOnly, fulfillmentMethod, shippingRates]);

  const isPickup = fulfillmentMethod === "pickup";
  const subtotal = cart.reduce((acc, item) => acc + (parseFloat(item.price) * item.quantity), 0);
  const discountAmount = appliedPromo ? parseFloat(appliedPromo.discountAmount || 0) : 0;
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const shipping = isPickup ? 0 : (selectedRate ? parseFloat(selectedRate.price) : 0);
  
  // For pickup, facility is in Ontario (13% HST). For shipping, use destination province.
  const effectiveProvince = isPickup ? "ON" : state;
  const taxRate = effectiveProvince ? (["ON", "ONTARIO"].includes(effectiveProvince.toUpperCase().trim()) ? 0.13 : (["NS", "NOVA SCOTIA", "NB", "NEW BRUNSWICK", "NL", "NEWFOUNDLAND", "PE", "PRINCE EDWARD ISLAND"].includes(effectiveProvince.toUpperCase().trim()) ? 0.15 : 0.05)) : 0.13;
  const tax = (discountedSubtotal + shipping) * taxRate;
  const grandTotal = discountedSubtotal + shipping + tax;

  const handleCheckout = async () => {
    if (hasFulfillmentConflict) {
      setCheckoutError("Cart contains items that can only be picked up and items that can only be delivered. Please order them separately.");
      return;
    }

    if (hasPickupOnly && !isPickup) {
      setCheckoutError("One or more items in your cart are marked for In-Store Pickup only. Please select Store Pickup.");
      return;
    }

    if (hasShippingOnly && isPickup) {
      setCheckoutError("One or more items in your cart are marked for Courier Delivery only. Please select Courier Shipping.");
      return;
    }

    if (cart.some(item => !item.artworkFiles || item.artworkFiles.length === 0)) {
      setCheckoutError("Please upload at least one artwork file (PDF/Image) for all items before checking out.");
      return;
    }

    if (!firstName || !lastName || !phone || !email) {
      setCheckoutError("Please enter your name, phone number, and email address.");
      return;
    }

    if (!isPickup && !selectedRate) {
      setCheckoutError("Please calculate and select a shipping method before checking out.");
      return;
    }

    if (!isPickup && (!address || !city || !state || !zip)) {
      setCheckoutError("Please complete your delivery address fields.");
      return;
    }

    setCheckoutLoading(true);
    setCheckoutError("");

    try {
      const activeRate = isPickup ? { serviceName: "Store Pickup (Free)", price: 0 } : selectedRate;
      
      // Sanitize cart items before sending to ensure no oversized base64 data URLs
      const sanitizedCheckoutItems = cart.map(item => {
        const cleanImages = (item.images || []).map(img => {
          if (typeof img === "string" && img.startsWith("data:image/")) {
            return item.artworkFiles?.[0]?.url || "";
          }
          return img;
        }).filter(Boolean);

        const cleanMockupSnapshots = item.mockupSnapshots ? Object.fromEntries(
          Object.entries(item.mockupSnapshots).map(([k, v]) => [
            k,
            (typeof v === "string" && v.startsWith("data:image/"))
              ? (item.artworkFiles?.[0]?.url || "")
              : v
          ])
        ) : null;

        return {
          ...item,
          images: cleanImages.length > 0 ? cleanImages : [item.artworkFiles?.[0]?.url || ""].filter(Boolean),
          mockupSnapshots: cleanMockupSnapshots
        };
      });

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: sanitizedCheckoutItems,
          isPickup,
          fulfillmentMethod,
          shippingAddress: {
            ShipFName: firstName,
            ShipLName: lastName,
            ShipPhone: phone,
            ShipEmail: email,
            ShipAddr: isPickup ? "1515 Britannia Rd E, Unit 14-15" : address,
            ShipAddr2: isPickup ? "" : suite,
            ShipCity: isPickup ? "Mississauga" : city,
            ShipState: isPickup ? "ON" : state,
            ShipZip: isPickup ? "L4W 4K1" : zip,
            ShipCountry: isPickup ? "CA" : country,
            ShipMethod: isPickup ? "Store Pickup (Free)" : (selectedRate?.serviceName || "Standard Courier"),
          },
          selectedShippingRate: activeRate,
          userId: user ? user.uid : null,
          promoCode: appliedPromo || null,
        }),
      });

      let data;
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || `Checkout failed (HTTP ${res.status})`);
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to initialize checkout.");
      }

      // Redirect to success route or Stripe session url
      router.push(data.url);
    } catch (e) {
      console.error(e);
      setCheckoutError(e.message || "Failed to initialize checkout session.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (cartCount === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <Header />
        <main style={{ flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "4rem 2rem" }}>
          <div style={{ textAlign: "center", maxWidth: "420px" }}>
            <ShoppingCart size={64} style={{ strokeWidth: 1, color: "hsl(var(--muted-hsl))", marginBottom: "1.5rem", display: "inline-block" }} />
            <h2 style={{ fontSize: "1.5rem" }}>Your shopping cart is empty</h2>
            <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.9rem", marginTop: "0.5rem", marginBottom: "2rem" }}>
              Go configure business cards, brochures, or yard signs to check prices and order.
            </p>
            <Link href="/" className="btn btn-primary" style={{ display: "inline-flex" }}>
              Explore Products
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Header />

      <main style={{ maxWidth: "1200px", margin: "2rem auto", padding: "0 1rem", width: "100%" }}>
        <h1 style={{ fontSize: "clamp(1.5rem, 4vw, 2rem)", fontWeight: 900, marginBottom: "1.5rem" }}>Shopping Cart & Checkout</h1>

        <div className="cart-grid">
          {/* Left Column: Cart items and artwork uploads */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}
          >
            
            {/* Cart Items List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {cart.map((item) => (
                <div key={item.id} className="card checkout-card-padding" style={{ padding: "1.5rem" }}>
                  <div className="cart-item-card-inner" style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: "1.25rem", alignItems: "start" }}>
                    <img
                      src={item.images?.[0] || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=600&auto=format&fit=crop"}
                      alt={item.name}
                      className="cart-item-img"
                      style={{ width: "80px", height: "80px", objectFit: "contain", border: "1px solid hsl(var(--border-hsl))", padding: "0.25rem", borderRadius: "var(--radius-sm)", backgroundColor: "white", flexShrink: 0 }}
                    />
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem" }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <h3 style={{ fontSize: "1.05rem", fontWeight: 700, wordBreak: "break-word" }}>{item.name}</h3>
                          <p style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))", marginTop: "0.15rem", lineHeight: "1.4", wordBreak: "break-word" }}>
                            {item.optionSummary}
                          </p>
                        </div>
                        <button onClick={() => removeFromCart(item.id)} style={{ color: "hsl(var(--destructive-hsl))", background: "none", border: "none", cursor: "pointer", padding: "0.25rem", flexShrink: 0 }} aria-label="Remove from cart">
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem", flexWrap: "wrap", gap: "0.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Qty:</span>
                          {item.isApparel ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <div style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.35rem",
                                padding: "0.3rem 0.65rem",
                                borderRadius: "var(--radius-sm)",
                                backgroundColor: "hsl(var(--secondary-hsl) / 0.4)",
                                border: "1px solid hsl(var(--border-hsl))",
                                fontSize: "0.85rem",
                                fontWeight: 700,
                                color: "hsl(var(--foreground-hsl))",
                              }}>
                                <svg width="11" height="13" viewBox="0 0 11 13" fill="none" style={{ flexShrink: 0, opacity: 0.6 }} aria-hidden="true">
                                  <rect x="1" y="5" width="9" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                                  <path d="M3.5 5V3.5a2 2 0 1 1 4 0V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                </svg>
                                {item.quantity}
                              </div>
                              <span style={{ fontSize: "0.72rem", color: "hsl(var(--muted-hsl))", lineHeight: 1.3 }}>
                                Fixed MOQ
                              </span>
                            </div>
                          ) : (
                            <input
                              type="number"
                              className="input"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                              style={{ width: "70px", padding: "0.3rem 0.5rem", fontSize: "0.85rem" }}
                            />
                          )}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                          {item.originalPrice && item.originalPrice > item.price && (
                            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.15rem" }}>
                              <span style={{ fontSize: "0.75rem", textDecoration: "line-through", color: "hsl(var(--muted-hsl))" }}>
                                ${(parseFloat(item.originalPrice) * item.quantity).toFixed(2)}
                              </span>
                              {item.saleDiscountPercent && (
                                <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "#DC2626", backgroundColor: "#FEE2E2", padding: "0.1rem 0.35rem", borderRadius: "3px" }}>
                                  -{item.saleDiscountPercent}%
                                </span>
                              )}
                            </div>
                          )}
                          <span style={{ fontWeight: 800, color: item.originalPrice && item.originalPrice > item.price ? "#DC2626" : "hsl(var(--accent-hsl))", fontSize: "1rem" }}>
                            ${(parseFloat(item.price) * item.quantity).toFixed(2)} CAD
                          </span>
                          {item.embroiderySetupFee && parseFloat(item.embroiderySetupFee) > 0 && (
                            <span style={{ fontSize: "0.72rem", color: "#7C3AED", fontWeight: 700, marginTop: "0.15rem" }}>
                              Incl. ${parseFloat(item.embroiderySetupFee).toFixed(2)} Embroidery Setup Fee
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Artwork Upload Form Subcard */}
                      <div style={{
                        marginTop: "1rem",
                        borderTop: "1px dashed hsl(var(--border-hsl))",
                        paddingTop: "1rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.75rem"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                          <span style={{ fontSize: "0.825rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.25rem" }}>
                            <FileText size={15} /> Artwork Files (PDF/Images)
                          </span>
                          
                          <div style={{ position: "relative" }}>
                            <input
                              type="file"
                              accept=".pdf,image/png,image/jpeg,image/jpg"
                              disabled={uploadingItemIds[item.id]}
                              onChange={(e) => handleUploadArtwork(item.id, e.target.files[0])}
                              style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }}
                            />
                            <button className="btn btn-outline" style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.25rem" }} disabled={uploadingItemIds[item.id]}>
                              {uploadingItemIds[item.id] ? <Loader2 size={12} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} /> : <Upload size={12} />}
                              Upload PDF
                            </button>
                          </div>
                        </div>

                        {/* Uploaded files list */}
                        {(!item.artworkFiles || item.artworkFiles.length === 0) ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "hsl(var(--destructive-hsl))", fontSize: "0.8rem", fontWeight: 500, backgroundColor: "hsl(var(--destructive-hsl) / 0.05)", padding: "0.5rem", borderRadius: "4px" }}>
                            <AlertCircle size={14} style={{ flexShrink: 0 }} /> Artwork file required for print processing.
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            {item.artworkFiles.map((file, idx) => (
                              <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "hsl(var(--secondary-hsl) / 0.3)", padding: "0.4rem 0.75rem", borderRadius: "4px", fontSize: "0.8rem", gap: "0.5rem" }}>
                                <a href={file.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline", color: "hsl(var(--accent-hsl))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
                                  {file.name || `artwork-${idx + 1}`}
                                </a>
                                <button onClick={() => handleRemoveArtwork(item.id, idx)} style={{ background: "none", border: "none", color: "hsl(var(--destructive-hsl))", cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }} aria-label="Remove artwork">
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Fulfillment & Address Card */}
            <div className="card checkout-card-padding" style={{ padding: "2rem" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, borderBottom: "1px solid hsl(var(--border-hsl))", paddingBottom: "0.5rem", marginBottom: "1.25rem" }}>
                Fulfillment & Delivery
              </h2>

              {/* Fulfillment Method Selector */}
              {hasFulfillmentConflict && (
                <div style={{ padding: "0.85rem 1rem", backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: "8px", color: "#B91C1C", fontSize: "0.85rem", fontWeight: 600, marginBottom: "1rem" }}>
                  ⚠️ Conflict: Your cart contains items available only for in-store pickup ({pickupOnlyItems.map(i => i.name).join(", ")}) and items available only for courier shipping ({shippingOnlyItems.map(i => i.name).join(", ")}). Please remove one or place separate orders.
                </div>
              )}

              {hasPickupOnly && !hasFulfillmentConflict && (
                <div style={{ padding: "0.75rem 1rem", backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "8px", color: "#166534", fontSize: "0.82rem", fontWeight: 600, marginBottom: "1rem" }}>
                  🏬 In-Store Pickup Required: "{pickupOnlyItems.map(i => i.name).join(", ")}" is marked for In-Store Pickup only. Courier delivery is disabled.
                </div>
              )}

              {hasShippingOnly && !hasFulfillmentConflict && (
                <div style={{ padding: "0.75rem 1rem", backgroundColor: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: "8px", color: "#1E40AF", fontSize: "0.82rem", fontWeight: 600, marginBottom: "1rem" }}>
                  🚚 Courier Delivery Required: "{shippingOnlyItems.map(i => i.name).join(", ")}" is marked for Courier Shipping only. Store pickup is disabled.
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.5rem" }}>
                <button
                  type="button"
                  disabled={hasPickupOnly}
                  onClick={() => {
                    if (hasPickupOnly) return;
                    setFulfillmentMethod("shipping");
                    setSelectedRate(shippingRates.length > 0 ? shippingRates[0] : null);
                    setRatesError("");
                  }}
                  style={{
                    padding: "0.85rem 1rem",
                    borderRadius: "8px",
                    border: "2px solid",
                    borderColor: fulfillmentMethod === "shipping" ? "#2563EB" : "hsl(var(--border-hsl))",
                    backgroundColor: fulfillmentMethod === "shipping" ? "rgba(37, 99, 235, 0.08)" : "#FFFFFF",
                    color: fulfillmentMethod === "shipping" ? "#1D4ED8" : "hsl(var(--foreground-hsl))",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    cursor: hasPickupOnly ? "not-allowed" : "pointer",
                    opacity: hasPickupOnly ? 0.45 : 1,
                    transition: "all 0.15s ease"
                  }}
                  title={hasPickupOnly ? "Disabled because items in your cart require in-store pickup" : "Select Courier Shipping"}
                >
                  🚚 Courier Shipping
                </button>

                <button
                  type="button"
                  disabled={hasShippingOnly}
                  onClick={() => {
                    if (hasShippingOnly) return;
                    setFulfillmentMethod("pickup");
                    setSelectedRate({ serviceName: "Store Pickup (Free)", price: 0 });
                    setRatesError("");
                  }}
                  style={{
                    padding: "0.85rem 1rem",
                    borderRadius: "8px",
                    border: "2px solid",
                    borderColor: fulfillmentMethod === "pickup" ? "#16A34A" : "hsl(var(--border-hsl))",
                    backgroundColor: fulfillmentMethod === "pickup" ? "rgba(22, 163, 74, 0.08)" : "#FFFFFF",
                    color: fulfillmentMethod === "pickup" ? "#15803D" : "hsl(var(--foreground-hsl))",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    cursor: hasShippingOnly ? "not-allowed" : "pointer",
                    opacity: hasShippingOnly ? 0.45 : 1,
                    transition: "all 0.15s ease"
                  }}
                  title={hasShippingOnly ? "Disabled because items in your cart require courier delivery" : "Select Store Pickup"}
                >
                  🏬 Store Pickup (Free)
                </button>
              </div>

              {/* Pickup Notice Banner */}
              {isPickup ? (
                <div style={{
                  backgroundColor: "#F0FDF4",
                  border: "1px solid #86EFAC",
                  borderRadius: "8px",
                  padding: "1.25rem",
                  marginBottom: "1.5rem"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#166534", fontWeight: 800, fontSize: "0.95rem", marginBottom: "0.5rem" }}>
                    <CheckCircle2 size={18} style={{ color: "#16A34A" }} />
                    Free Store Pickup at Mississauga Facility
                  </div>
                  <p style={{ fontSize: "0.85rem", color: "#15803D", margin: "0 0 0.75rem 0", lineHeight: 1.5 }}>
                    Your order will be printed and packed for collection at our central location with zero shipping charges.
                  </p>
                  <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #BBF7D0", borderRadius: "6px", padding: "0.85rem", fontSize: "0.85rem", color: "#0F172A", lineHeight: 1.5 }}>
                    <div style={{ fontWeight: 700 }}>Apex Workwear & Print Facility</div>
                    <div>1515 Britannia Rd E, Unit 14-15, Mississauga, ON L4W 4K1</div>
                    <div style={{ color: "#2563EB", marginTop: "0.25rem", fontWeight: 600 }}>📞 (647) 570-1249</div>
                    <div style={{ fontSize: "0.78rem", color: "#64748B", marginTop: "0.35rem" }}>
                      Hours: Mon – Fri: 9:00 AM – 6:00 PM | Sat: 10:00 AM – 4:00 PM
                    </div>
                  </div>
                  <p style={{ fontSize: "0.78rem", color: "#166534", marginTop: "0.75rem", fontStyle: "italic", margin: "0.75rem 0 0 0" }}>
                    * We will notify you via email as soon as your items are ready for pickup.
                  </p>
                </div>
              ) : null}

              {/* Saved Address Pre-fill Dropdown (Only for Shipping) */}
              {!isPickup && user && userData?.addresses && userData.addresses.length > 0 && (
                <div style={{ marginBottom: "1.25rem" }}>
                  <label className="label">Populate Saved Address</label>
                  <select
                    className="input"
                    onChange={(e) => handleSavedAddressSelect(e.target.value)}
                    defaultValue=""
                  >
                    <option value="" disabled>Select address...</option>
                    {userData.addresses.map(addr => (
                      <option key={addr.id} value={addr.id}>{addr.name} - {addr.addressLine1}, {addr.city}</option>
                    ))}
                  </select>
                </div>
              )}

              <form onSubmit={handleCalculateShipping} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div className="form-row-2col">
                  <div>
                    <label className="label">First Name</label>
                    <input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                  </div>
                  <div>
                    <label className="label">Last Name</label>
                    <input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                  </div>
                </div>

                <div className="form-row-2col">
                  <div>
                    <label className="label">Phone Number</label>
                    <input className="input" placeholder="647-555-0199" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                  </div>
                  <div>
                    <label className="label">Email Address (for order updates)</label>
                    <input type="email" className="input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                </div>

                {!isPickup && (
                  <>
                    <div>
                      <label className="label">Street Address</label>
                      <input className="input" placeholder="123 Print Ave" value={address} onChange={(e) => setAddress(e.target.value)} required={!isPickup} />
                    </div>

                    <div>
                      <label className="label">Suite, Unit, Apt (Optional)</label>
                      <input className="input" placeholder="Suite 100" value={suite} onChange={(e) => setSuite(e.target.value)} />
                    </div>

                    <div className="form-row-2col">
                      <div>
                        <label className="label">Country</label>
                        <select
                          className="input"
                          value={country}
                          onChange={(e) => {
                            const newC = e.target.value;
                            setCountry(newC);
                            setState(newC === "CA" ? "ON" : "NY");
                          }}
                          required={!isPickup}
                        >
                          {COUNTRIES.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.name} ({c.code})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label">City</label>
                        <input className="input" placeholder="Toronto" value={city} onChange={(e) => setCity(e.target.value)} required={!isPickup} />
                      </div>
                    </div>

                    <div className="form-row-2col">
                      <div>
                        <label className="label">{country === "CA" ? "Province" : "State"}</label>
                        <select
                          className="input"
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          required={!isPickup}
                        >
                          {(country === "CA" ? CANADIAN_PROVINCES : US_STATES).map((st) => (
                            <option key={st.code} value={st.code}>
                              {st.code} - {st.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label">Postal / ZIP Code</label>
                        <input className="input" placeholder={country === "CA" ? "M5V 1A1" : "90210"} value={zip} onChange={(e) => setZip(e.target.value)} required={!isPickup} />
                      </div>
                    </div>

                    <button type="submit" className="btn btn-secondary" style={{ width: "100%", justifyContent: "center", marginTop: "0.5rem" }} disabled={loadingRates}>
                      {loadingRates ? (
                        <>
                          <Loader2 size={16} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} /> Estimating Shipping...
                        </>
                      ) : (
                        <>
                          <MapPin size={16} /> Calculate Shipping Costs
                        </>
                      )}
                    </button>
                  </>
                )}
              </form>
            </div>
          </motion.div>

          {/* Right Column: Checkout Rates and Summary Totals */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}
          >
            
            {/* Shipping Rates list card (Only for Delivery) */}
            {!isPickup && shippingRates.length > 0 && (
              <div className="card checkout-card-padding" style={{ padding: "2rem" }}>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700, borderBottom: "1px solid hsl(var(--border-hsl))", paddingBottom: "0.5rem", marginBottom: "1rem" }}>
                  Select Shipping Speed
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {shippingRates.map((rate, idx) => (
                    <label
                      key={idx}
                      className="card"
                      style={{
                        padding: "1rem",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "0.75rem",
                        flexWrap: "wrap",
                        cursor: "pointer",
                        borderColor: selectedRate?.serviceName === rate.serviceName ? "hsl(var(--accent-hsl))" : "hsl(var(--border-hsl))",
                        backgroundColor: selectedRate?.serviceName === rate.serviceName ? "hsl(var(--accent-hsl) / 0.05)" : "transparent"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", flex: "1 1 180px", minWidth: 0 }}>
                        <input
                          type="radio"
                          name="shipping_rate"
                          checked={selectedRate?.serviceName === rate.serviceName}
                          onChange={() => setSelectedRate(rate)}
                          style={{ cursor: "pointer", marginTop: "0.25rem" }}
                        />
                        <div style={{ textAlign: "left", minWidth: 0, flex: 1 }}>
                          <p style={{ fontWeight: 700, fontSize: "0.9rem", wordBreak: "break-word" }}>{rate.serviceName}</p>
                          <p style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))", marginTop: "0.15rem" }}>Delivery: {rate.deliveryDays} business days</p>
                        </div>
                      </div>
                      <div style={{ fontWeight: 850, fontSize: "1.05rem", color: "hsl(var(--accent-hsl))", whiteSpace: "nowrap", marginLeft: "auto" }}>
                        ${parseFloat(rate.price).toFixed(2)} <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "hsl(var(--muted-hsl))" }}>CAD</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {ratesError && (
              <div className="card checkout-card-padding" style={{ borderColor: "hsl(var(--destructive-hsl))", backgroundColor: "hsl(var(--destructive-hsl) / 0.05)", padding: "1rem", color: "hsl(var(--destructive-hsl))", fontSize: "0.85rem", fontWeight: 500 }}>
                {ratesError}
              </div>
            )}

            {/* Totals Summary Card */}
            <div className="card checkout-card-padding" style={{ padding: "2rem" }}>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, borderBottom: "1px solid hsl(var(--border-hsl))", paddingBottom: "0.5rem", marginBottom: "1.25rem" }}>
                Order Summary
              </h3>

              {/* Promo Code Input & Apply Box */}
              <div style={{ marginBottom: "1.25rem", paddingBottom: "1.25rem", borderBottom: "1px dashed hsl(var(--border-hsl))" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.5rem", color: "hsl(var(--foreground-hsl))" }}>
                  <Ticket size={15} style={{ color: "hsl(var(--accent-hsl))" }} /> Promo or Discount Code
                </label>

                {!appliedPromo ? (
                  <form onSubmit={handleApplyPromo} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. SAVE20"
                      value={promoCodeInput}
                      onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                      style={{
                        flex: "1 1 140px",
                        textTransform: "uppercase",
                        fontFamily: "monospace",
                        fontWeight: 700,
                        fontSize: "0.9rem",
                        padding: "0.45rem 0.75rem"
                      }}
                    />
                    <button
                      type="submit"
                      disabled={promoLoading || !promoCodeInput.trim()}
                      className="btn btn-secondary"
                      style={{ padding: "0.45rem 0.9rem", fontSize: "0.85rem", whiteSpace: "nowrap" }}
                    >
                      {promoLoading ? <Loader2 size={14} className="animate-spin" /> : "Apply"}
                    </button>
                  </form>
                ) : (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: "hsl(var(--success-hsl, 142 76% 36%) / 0.1)",
                    border: "1px solid hsl(var(--success-hsl, 142 76% 36%) / 0.3)",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "6px",
                    gap: "0.5rem"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
                      <CheckCircle2 size={16} style={{ color: "#16A34A", flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontWeight: 800, fontFamily: "monospace", fontSize: "0.9rem", color: "#15803D" }}>
                          {appliedPromo.code}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "#166534", marginLeft: "0.4rem" }}>
                          ({appliedPromo.discountType === "percentage" ? `${appliedPromo.discountValue}% OFF` : `$${appliedPromo.discountValue} OFF`})
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleRemovePromo}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#991B1B", padding: "0.2rem", flexShrink: 0 }}
                      title="Remove promo code"
                    >
                      <X size={15} />
                    </button>
                  </div>
                )}

                {promoSuccess && !appliedPromo && (
                  <p style={{ fontSize: "0.8rem", color: "#16A34A", marginTop: "0.4rem", fontWeight: 600 }}>
                    {promoSuccess}
                  </p>
                )}

                {promoError && (
                  <p style={{ fontSize: "0.8rem", color: "#DC2626", marginTop: "0.4rem", fontWeight: 500 }}>
                    {promoError}
                  </p>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.95rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "hsl(var(--muted-hsl))" }}>Subtotal</span>
                  <span style={{ fontWeight: 600 }}>${subtotal.toFixed(2)} CAD</span>
                </div>

                {appliedPromo && discountAmount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#16A34A" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontWeight: 600 }}>
                      <Tag size={14} /> Discount ({appliedPromo.code})
                    </span>
                    <span style={{ fontWeight: 700 }}>-${discountAmount.toFixed(2)} CAD</span>
                  </div>
                )}
                
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "hsl(var(--muted-hsl))" }}>Fulfillment / Shipping</span>
                  <span style={{ fontWeight: 600 }}>
                    {isPickup ? (
                      <span style={{ color: "#16A34A", fontWeight: 700 }}>Store Pickup (Free)</span>
                    ) : selectedRate ? (
                      `$${shipping.toFixed(2)}`
                    ) : (
                      <span style={{ fontSize: "0.8rem", color: "hsl(var(--muted-hsl))" }}>Calculate above</span>
                    )}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "hsl(var(--muted-hsl))" }}>GST/HST Sales Tax ({(taxRate * 100).toFixed(0)}%{isPickup ? " ON" : ""})</span>
                  <span style={{ fontWeight: 600 }}>${tax.toFixed(2)}</span>
                </div>

                <div style={{ borderTop: "1px solid hsl(var(--border-hsl))", paddingTop: "1rem", marginTop: "0.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 800, fontSize: "1.1rem" }}>Grand Total</span>
                  <span style={{ fontWeight: 900, fontSize: "1.5rem", color: "hsl(var(--accent-hsl))" }}>
                    ${grandTotal.toFixed(2)} CAD
                  </span>
                </div>
              </div>

              {checkoutError && (
                <div className="card" style={{ borderColor: "hsl(var(--destructive-hsl))", backgroundColor: "hsl(var(--destructive-hsl) / 0.05)", padding: "0.75rem 1rem", marginTop: "1rem", color: "hsl(var(--destructive-hsl))", fontSize: "0.85rem", fontWeight: 500 }}>
                  {checkoutError}
                </div>
              )}

              {/* Checkout Actions */}
              <div style={{ marginTop: "1.5rem" }}>
                <button
                  onClick={handleCheckout}
                  className="btn btn-primary"
                  style={{ width: "100%", padding: "0.85rem", fontSize: "1rem", justifyContent: "center" }}
                  disabled={checkoutLoading || cartCount === 0}
                >
                  {checkoutLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} /> Initializing Checkout...
                    </>
                  ) : (
                    <>
                      Proceed to Checkout <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
