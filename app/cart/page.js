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

  // Shipping & Checkout states
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
            selectedOptionMap: i.selectedOptionMap,
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
      const res = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: promoCodeInput.trim(),
          items: cart,
          subtotal: subtotal,
          email: email || user?.email || "",
          userId: user ? user.uid : null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.valid) {
        throw new Error(data.error || "Invalid promo code");
      }

      setAppliedPromo(data.promo);
      setPromoSuccess(data.message || `Promo code "${data.promo.code}" applied!`);
    } catch (err) {
      setPromoError(err.message);
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
  const subtotal = cart.reduce((acc, item) => acc + (parseFloat(item.price) * item.quantity), 0);
  const discountAmount = appliedPromo ? parseFloat(appliedPromo.discountAmount || 0) : 0;
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const shipping = selectedRate ? parseFloat(selectedRate.price) : 0;
  
  const taxRate = state ? (["ON", "ONTARIO"].includes(state.toUpperCase().trim()) ? 0.13 : (["NS", "NOVA SCOTIA", "NB", "NEW BRUNSWICK", "NL", "NEWFOUNDLAND", "PE", "PRINCE EDWARD ISLAND"].includes(state.toUpperCase().trim()) ? 0.15 : 0.05)) : 0;
  const tax = (discountedSubtotal + shipping) * taxRate;
  const grandTotal = discountedSubtotal + shipping + tax;

  const handleCheckout = async () => {
    if (cart.some(item => !item.artworkFiles || item.artworkFiles.length === 0)) {
      setCheckoutError("Please upload at least one artwork file (PDF/Image) for all items before checking out.");
      return;
    }

    if (!selectedRate) {
      setCheckoutError("Please calculate and select a shipping method before checking out.");
      return;
    }

    setCheckoutLoading(true);
    setCheckoutError("");

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart,
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
          selectedShippingRate: selectedRate,
          userId: user ? user.uid : null,
          promoCode: appliedPromo || null,
        }),
      });

      const data = await res.json();
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
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Qty:</span>
                          <input
                            type="number"
                            className="input"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                            style={{ width: "70px", padding: "0.3rem 0.5rem", fontSize: "0.85rem" }}
                          />
                        </div>
                        <span style={{ fontWeight: 800, color: "hsl(var(--accent-hsl))", fontSize: "1rem" }}>
                          ${(parseFloat(item.price) * item.quantity).toFixed(2)} CAD
                        </span>
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

            {/* Shipping Address Card */}
            <div className="card checkout-card-padding" style={{ padding: "2rem" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, borderBottom: "1px solid hsl(var(--border-hsl))", paddingBottom: "0.5rem", marginBottom: "1.25rem" }}>
                Delivery Address
              </h2>

              {/* Saved Address Pre-fill Dropdown */}
              {user && userData?.addresses && userData.addresses.length > 0 && (
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
                    <label className="label">Email Address</label>
                    <input type="email" className="input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                </div>

                <div>
                  <label className="label">Street Address</label>
                  <input className="input" placeholder="123 Print Ave" value={address} onChange={(e) => setAddress(e.target.value)} required />
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
                      required
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
                    <input className="input" placeholder="Toronto" value={city} onChange={(e) => setCity(e.target.value)} required />
                  </div>
                </div>

                <div className="form-row-2col">
                  <div>
                    <label className="label">{country === "CA" ? "Province" : "State"}</label>
                    <select
                      className="input"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      required
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
                    <input className="input" placeholder={country === "CA" ? "M5V 1A1" : "90210"} value={zip} onChange={(e) => setZip(e.target.value)} required />
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
            
            {/* Shipping Rates list card */}
            {shippingRates.length > 0 && (
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
                  <span style={{ color: "hsl(var(--muted-hsl))" }}>Shipping</span>
                  <span style={{ fontWeight: 600 }}>
                    {selectedRate ? `$${shipping.toFixed(2)}` : <span style={{ fontSize: "0.8rem", color: "hsl(var(--muted-hsl))" }}>Calculate above</span>}
                  </span>
                </div>

                {state && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "hsl(var(--muted-hsl))" }}>GST/HST Sales Tax ({(taxRate * 100).toFixed(0)}%)</span>
                    <span style={{ fontWeight: 600 }}>${tax.toFixed(2)}</span>
                  </div>
                )}

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
