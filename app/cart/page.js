"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2, Upload, AlertCircle, ShoppingCart, Loader2, ArrowRight, MapPin, DollarSign, FileText } from "lucide-react";
import { motion } from "framer-motion";

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
  const [state, setState] = useState("");
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
      setState(selected.state || "");
      setZip(selected.zip || "");
      setCountry(selected.country || "CA");
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

  // Math totals
  const subtotal = cart.reduce((acc, item) => acc + (parseFloat(item.price) * item.quantity), 0);
  const shipping = selectedRate ? parseFloat(selectedRate.price) : 0;
  
  const taxRate = state ? (["ON", "ONTARIO"].includes(state.toUpperCase().trim()) ? 0.13 : (["NS", "NOVA SCOTIA", "NB", "NEW BRUNSWICK", "NL", "NEWFOUNDLAND", "PE", "PRINCE EDWARD ISLAND"].includes(state.toUpperCase().trim()) ? 0.15 : 0.05)) : 0;
  const tax = (subtotal + shipping) * taxRate;
  const grandTotal = subtotal + shipping + tax;

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

      <main style={{ maxWidth: "1200px", margin: "2.5rem auto", padding: "0 1.5rem", width: "100%" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 900, marginBottom: "2rem" }}>Shopping Cart</h1>

        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "2.5rem" }} className="cart-grid">
          {/* Left Column: Cart items and artwork uploads */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            style={{ display: "flex", flexDirection: "column", gap: "2rem" }}
          >
            
            {/* Cart Items List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {cart.map((item) => (
                <div key={item.id} className="card" style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: "1.5rem", padding: "1.5rem" }}>
                  <img
                    src={item.images?.[0] || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=600&auto=format&fit=crop"}
                    alt={item.name}
                    style={{ width: "80px", height: "80px", objectFit: "contain", border: "1px solid hsl(var(--border-hsl))", padding: "0.25rem", borderRadius: "var(--radius-sm)", backgroundColor: "white" }}
                  />
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                      <div>
                        <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>{item.name}</h3>
                        <p style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))", marginTop: "0.15rem", lineHeight: "1.4" }}>
                          {item.optionSummary}
                        </p>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} style={{ color: "hsl(var(--destructive-hsl))", background: "none", border: "none", cursor: "pointer", padding: "0.25rem" }} aria-label="Remove from cart">
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
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
                      <span style={{ fontWeight: 800, color: "hsl(var(--accent-hsl))" }}>
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
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.25rem" }}>
                          <FileText size={16} /> Artwork Files (PDF/Images)
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
                          <AlertCircle size={14} /> Artwork file required for print processing.
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                          {item.artworkFiles.map((file, idx) => (
                            <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "hsl(var(--secondary-hsl) / 0.3)", padding: "0.4rem 0.75rem", borderRadius: "4px", fontSize: "0.8rem" }}>
                              <a href={file.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline", color: "hsl(var(--accent-hsl))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "250px" }}>
                                {file.name || `artwork-${idx + 1}`}
                              </a>
                              <button onClick={() => handleRemoveArtwork(item.id, idx)} style={{ background: "none", border: "none", color: "hsl(var(--destructive-hsl))", cursor: "pointer", display: "flex", alignItems: "center" }} aria-label="Remove artwork">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Shipping Address Card */}
            <div className="card" style={{ padding: "2rem" }}>
              <h2 style={{ fontSize: "1.3rem", fontWeight: 700, borderBottom: "1px solid hsl(var(--border-hsl))", paddingBottom: "0.5rem", marginBottom: "1.5rem" }}>
                Delivery Address
              </h2>

              {/* Saved Address Pre-fill Dropdown */}
              {user && userData?.addresses && userData.addresses.length > 0 && (
                <div style={{ marginBottom: "1.5rem" }}>
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
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label className="label">First Name</label>
                    <input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                  </div>
                  <div>
                    <label className="label">Last Name</label>
                    <input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
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

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label className="label">City</label>
                    <input className="input" value={city} onChange={(e) => setCity(e.target.value)} required />
                  </div>
                  <div>
                    <label className="label">Province/State</label>
                    <input className="input" placeholder="ON" value={state} onChange={(e) => setState(e.target.value)} required />
                  </div>
                  <div>
                    <label className="label">Postal/ZIP Code</label>
                    <input className="input" placeholder="M5V 1A1" value={zip} onChange={(e) => setZip(e.target.value)} required />
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
            style={{ display: "flex", flexDirection: "column", gap: "2rem" }}
          >
            
            {/* Shipping Rates list card */}
            {shippingRates.length > 0 && (
              <div className="card" style={{ padding: "2rem" }}>
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
                        cursor: "pointer",
                        borderColor: selectedRate?.serviceName === rate.serviceName ? "hsl(var(--accent-hsl))" : "hsl(var(--border-hsl))",
                        backgroundColor: selectedRate?.serviceName === rate.serviceName ? "hsl(var(--accent-hsl) / 0.03)" : "transparent"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <input
                          type="radio"
                          name="shipping_rate"
                          checked={selectedRate?.serviceName === rate.serviceName}
                          onChange={() => setSelectedRate(rate)}
                          style={{ cursor: "pointer" }}
                        />
                        <div style={{ textAlign: "left" }}>
                          <p style={{ fontWeight: 700, fontSize: "0.9rem" }}>{rate.serviceName}</p>
                          <p style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))" }}>Delivery: {rate.deliveryDays} business days</p>
                        </div>
                      </div>
                      <span style={{ fontWeight: 800 }}>${parseFloat(rate.price).toFixed(2)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {ratesError && (
              <div className="card" style={{ borderColor: "hsl(var(--destructive-hsl))", backgroundColor: "hsl(var(--destructive-hsl) / 0.05)", padding: "1rem", color: "hsl(var(--destructive-hsl))", fontSize: "0.85rem", fontWeight: 500 }}>
                {ratesError}
              </div>
            )}

            {/* Totals Summary Card */}
            <div className="card" style={{ padding: "2rem" }}>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, borderBottom: "1px solid hsl(var(--border-hsl))", paddingBottom: "0.5rem", marginBottom: "1.25rem" }}>
                Order Summary
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.95rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "hsl(var(--muted-hsl))" }}>Subtotal</span>
                  <span style={{ fontWeight: 600 }}>${subtotal.toFixed(2)} CAD</span>
                </div>
                
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
