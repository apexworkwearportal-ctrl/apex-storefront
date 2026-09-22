"use client";

import { useEffect, useState } from "react";
import { 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Lock, 
  Eye, 
  EyeOff, 
  Save, 
  Copy, 
  Check,
  ShieldCheck,
  Zap,
  Globe
} from "lucide-react";

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const [settings, setSettings] = useState({
    enabled: true,
    mode: "test",
    testPublishableKey: "",
    testSecretKey: "",
    testSecretKeyMasked: "",
    livePublishableKey: "",
    liveSecretKey: "",
    liveSecretKeyMasked: "",
    webhookSecret: "",
    webhookSecretMasked: "",
    hasTestSecretKey: false,
    hasLiveSecretKey: false,
    hasWebhookSecret: false,
    hasEnvKeys: false
  });

  const [testResult, setTestResult] = useState(null);
  const [message, setMessage] = useState(null);

  const [autoSubmitSinalite, setAutoSubmitSinalite] = useState(false);
  const [loadingFulfillment, setLoadingFulfillment] = useState(true);
  const [savingFulfillment, setSavingFulfillment] = useState(false);

  const [sinaliteClientId, setSinaliteClientId] = useState("");
  const [sinaliteClientSecret, setSinaliteClientSecret] = useState("");
  const [sinaliteUseLive, setSinaliteUseLive] = useState(false);

  useEffect(() => {
    fetchStripeSettings();
    fetchFulfillmentSettings();
  }, []);

  const fetchFulfillmentSettings = async () => {
    setLoadingFulfillment(true);
    try {
      const res = await fetch("/api/admin/fulfillment-settings");
      const data = await res.json();
      if (res.ok) {
        setAutoSubmitSinalite(!!data.autoSubmitSinalite);
        setSinaliteClientId(data.clientId || "");
        setSinaliteClientSecret(data.clientSecretMasked || "");
        setSinaliteUseLive(!!data.useLiveApi);
      }
    } catch (err) {
      console.error("Error loading fulfillment settings:", err);
    } finally {
      setLoadingFulfillment(false);
    }
  };

  const handleToggleAutoSubmit = async () => {
    const nextVal = !autoSubmitSinalite;
    setAutoSubmitSinalite(nextVal);
    setSavingFulfillment(true);
    try {
      const res = await fetch("/api/admin/fulfillment-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          autoSubmitSinalite: nextVal,
          clientId: sinaliteClientId,
          clientSecret: sinaliteClientSecret,
          useLiveApi: sinaliteUseLive
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: data.message || "Fulfillment mode updated!" });
      } else {
        setAutoSubmitSinalite(!nextVal);
        alert("Failed to update setting: " + data.error);
      }
    } catch (err) {
      setAutoSubmitSinalite(!nextVal);
      alert("Error saving setting: " + err.message);
    } finally {
      setSavingFulfillment(false);
    }
  };

  const handleSaveFulfillmentCredentials = async (e) => {
    if (e) e.preventDefault();
    setSavingFulfillment(true);
    try {
      const res = await fetch("/api/admin/fulfillment-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          autoSubmitSinalite,
          clientId: sinaliteClientId,
          clientSecret: sinaliteClientSecret,
          useLiveApi: sinaliteUseLive
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "SinaLite API credentials and settings saved!" });
        fetchFulfillmentSettings();
      } else {
        alert("Failed to save SinaLite credentials: " + data.error);
      }
    } catch (err) {
      alert("Error saving credentials: " + err.message);
    } finally {
      setSavingFulfillment(false);
    }
  };

  const fetchStripeSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stripe-settings");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load settings");

      setSettings(prev => ({
        ...prev,
        ...data,
        testSecretKey: data.testSecretKeyMasked || "",
        liveSecretKey: data.liveSecretKeyMasked || "",
        webhookSecret: data.webhookSecretMasked || ""
      }));
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/stripe-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save settings");

      setMessage({ type: "success", text: "Stripe connection settings saved successfully!" });
      fetchStripeSettings();
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    const activeSecretKey = settings.mode === "live" ? settings.liveSecretKey : settings.testSecretKey;

    try {
      const res = await fetch("/api/admin/stripe-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test",
          secretKey: activeSecretKey
        })
      });

      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  const webhookUrl = typeof window !== "undefined" ? `${window.location.origin}/api/webhooks/stripe` : "/api/webhooks/stripe";

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh", color: "#64748B" }}>
        <RefreshCw className="animate-spin" size={24} style={{ color: "#2563EB", marginRight: "0.5rem" }} />
        Loading Stripe Gateway Settings...
      </div>
    );
  }

  const isModeLive = settings.mode === "live";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem", maxWidth: "960px" }}>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", color: "#2563EB", letterSpacing: "0.05em", display: "block", marginBottom: "0.25rem" }}>
            Payment Gateways & Checkout
          </span>
          <h1 style={{ fontSize: "1.85rem", fontWeight: 900, color: "#0F172A", margin: 0, letterSpacing: "-0.02em" }}>
            Stripe Integration Settings
          </h1>
          <p style={{ color: "#64748B", fontSize: "0.9rem", marginTop: "0.25rem" }}>
            Connect your Stripe account to process credit card payments for custom apparel & print products.
          </p>
        </div>

        {/* Enable / Disable Gateway Toggle */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "0.6rem 1rem",
          backgroundColor: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
        }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0F172A" }}>
            Stripe Gateway Status:
          </span>
          <button
            type="button"
            onClick={() => setSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
            style={{
              padding: "0.35rem 0.85rem",
              borderRadius: "20px",
              border: "none",
              fontSize: "0.75rem",
              fontWeight: 800,
              cursor: "pointer",
              backgroundColor: settings.enabled ? "#10B981" : "#94A3B8",
              color: "white",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem"
            }}
          >
            {settings.enabled ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {settings.enabled ? "ENABLED" : "DISABLED"}
          </button>
        </div>
      </div>

      {/* Alert Messages */}
      {message && (
        <div style={{
          padding: "1rem 1.25rem",
          borderRadius: "8px",
          backgroundColor: message.type === "success" ? "#ECFDF5" : "#FEF2F2",
          border: message.type === "success" ? "1px solid #A7F3D0" : "1px solid #FCA5A5",
          color: message.type === "success" ? "#065F46" : "#991B1B",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          fontSize: "0.9rem",
          fontWeight: 600
        }}>
          {message.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>

        {/* Environment Mode Selector */}
        <div className="card" style={{ padding: "1.5rem", backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0F172A", margin: 0 }}>
                Environment Mode
              </h3>
              <p style={{ fontSize: "0.8rem", color: "#64748B", margin: 0, marginTop: "0.2rem" }}>
                Switch between Stripe Sandbox (Test Keys) and Production (Live Payments).
              </p>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", backgroundColor: "#F1F5F9", padding: "4px", borderRadius: "8px" }}>
              <button
                type="button"
                onClick={() => setSettings(prev => ({ ...prev, mode: "test" }))}
                style={{
                  padding: "0.45rem 1rem",
                  borderRadius: "6px",
                  border: "none",
                  fontSize: "0.8rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  backgroundColor: !isModeLive ? "#2563EB" : "transparent",
                  color: !isModeLive ? "white" : "#64748B"
                }}
              >
                Test Mode (Sandbox)
              </button>

              <button
                type="button"
                onClick={() => setSettings(prev => ({ ...prev, mode: "live" }))}
                style={{
                  padding: "0.45rem 1rem",
                  borderRadius: "6px",
                  border: "none",
                  fontSize: "0.8rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  backgroundColor: isModeLive ? "#10B981" : "transparent",
                  color: isModeLive ? "white" : "#64748B"
                }}
              >
                Live Mode (Production)
              </button>
            </div>
          </div>

          <div style={{
            padding: "0.75rem 1rem",
            backgroundColor: isModeLive ? "#ECFDF5" : "#EFF6FF",
            borderRadius: "8px",
            border: isModeLive ? "1px solid #A7F3D0" : "1px solid #BFDBFE",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.8rem",
            color: isModeLive ? "#065F46" : "#1E40AF"
          }}>
            <ShieldCheck size={16} />
            <span>
              Active Mode: <strong>{isModeLive ? "LIVE PRODUCTION" : "TEST SANDBOX"}</strong> — {isModeLive ? "Real credit cards will be charged." : "Transactions use Stripe test card numbers."}
            </span>
          </div>
        </div>

        {/* API Keys Configuration Card */}
        <div className="card" style={{ padding: "1.75rem", backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", borderBottom: "1px solid #E2E8F0", paddingBottom: "0.85rem" }}>
            <CreditCard size={20} style={{ color: "#2563EB" }} />
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0F172A", margin: 0 }}>
              {isModeLive ? "Live API Credentials" : "Test API Credentials"}
            </h3>
          </div>

          {/* Publishable Key Input */}
          <div>
            <label className="label" style={{ fontWeight: 700, fontSize: "0.85rem", color: "#0F172A", marginBottom: "0.4rem", display: "block" }}>
              Publishable Key ({isModeLive ? "pk_live_..." : "pk_test_..."})
            </label>
            <input
              type="text"
              className="input"
              placeholder={isModeLive ? "pk_live_51..." : "pk_test_51..."}
              value={isModeLive ? settings.livePublishableKey : settings.testPublishableKey}
              onChange={(e) => {
                const val = e.target.value;
                setSettings(prev => isModeLive ? { ...prev, livePublishableKey: val } : { ...prev, testPublishableKey: val });
              }}
              style={{ width: "100%", fontFamily: "monospace", fontSize: "0.85rem" }}
            />
            <span style={{ fontSize: "0.75rem", color: "#64748B", marginTop: "0.25rem", display: "block" }}>
              Used on the frontend for Stripe Elements / Checkout initialization.
            </span>
          </div>

          {/* Secret Key Input */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
              <label className="label" style={{ fontWeight: 700, fontSize: "0.85rem", color: "#0F172A", margin: 0 }}>
                Secret Key ({isModeLive ? "sk_live_..." : "sk_test_..."})
              </label>
              <button
                type="button"
                onClick={() => setShowSecretKey(!showSecretKey)}
                style={{ background: "none", border: "none", color: "#2563EB", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem" }}
              >
                {showSecretKey ? <EyeOff size={14} /> : <Eye size={14} />}
                {showSecretKey ? "Hide Key" : "Show Key"}
              </button>
            </div>

            <input
              type={showSecretKey ? "text" : "password"}
              className="input"
              placeholder={isModeLive ? "sk_live_51..." : "sk_test_51..."}
              value={isModeLive ? settings.liveSecretKey : settings.testSecretKey}
              onChange={(e) => {
                const val = e.target.value;
                setSettings(prev => isModeLive ? { ...prev, liveSecretKey: val } : { ...prev, testSecretKey: val });
              }}
              style={{ width: "100%", fontFamily: "monospace", fontSize: "0.85rem" }}
            />
            <span style={{ fontSize: "0.75rem", color: "#64748B", marginTop: "0.25rem", display: "block" }}>
              Stored encrypted in Firestore. Never exposed to customer browser clients.
            </span>
          </div>

          {/* Webhook Secret Input */}
          <div>
            <label className="label" style={{ fontWeight: 700, fontSize: "0.85rem", color: "#0F172A", marginBottom: "0.4rem", display: "block" }}>
              Stripe Webhook Signing Secret (whsec_...)
            </label>
            <input
              type={showSecretKey ? "text" : "password"}
              className="input"
              placeholder="whsec_..."
              value={settings.webhookSecret}
              onChange={(e) => setSettings(prev => ({ ...prev, webhookSecret: e.target.value }))}
              style={{ width: "100%", fontFamily: "monospace", fontSize: "0.85rem" }}
            />
            <span style={{ fontSize: "0.75rem", color: "#64748B", marginTop: "0.25rem", display: "block" }}>
              Used to verify signature payloads sent by Stripe to <code style={{ backgroundColor: "#F1F5F9", padding: "2px 5px", borderRadius: "4px" }}>/api/webhooks/stripe</code>.
            </span>
          </div>

          {/* Connection Test Action */}
          <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="btn btn-outline"
              style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              {testing ? <RefreshCw className="animate-spin" size={16} /> : <Zap size={16} style={{ color: "#F59E0B" }} />}
              {testing ? "Verifying Keys..." : "Test Stripe Connection"}
            </button>

            {testResult && (
              <div style={{
                fontSize: "0.8rem",
                fontWeight: 700,
                color: testResult.success ? "#059669" : "#DC2626",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem"
              }}>
                {testResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                {testResult.success ? `Connected! Currency: ${testResult.currency}` : testResult.error}
              </div>
            )}
          </div>
        </div>

        {/* Webhook URL Endpoint Instructions */}
        <div className="card" style={{ padding: "1.5rem", backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0F172A", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Globe size={18} style={{ color: "#2563EB" }} /> Webhook Listener Setup
          </h3>
          <p style={{ fontSize: "0.85rem", color: "#64748B", margin: 0 }}>
            In your <strong>Stripe Dashboard → Developers → Webhooks</strong>, add an endpoint for the following URL and select <code style={{ backgroundColor: "#F1F5F9", padding: "2px 5px", borderRadius: "4px" }}>checkout.session.completed</code> event:
          </p>

          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: "6px",
            padding: "0.6rem 1rem"
          }}>
            <span style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "#0F172A", fontWeight: 600 }}>
              {webhookUrl}
            </span>
            <button
              type="button"
              onClick={handleCopyWebhook}
              className="btn btn-outline"
              style={{ padding: "0.3rem 0.65rem", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.3rem" }}
            >
              {copiedWebhook ? <Check size={14} style={{ color: "#10B981" }} /> : <Copy size={14} />}
              {copiedWebhook ? "Copied!" : "Copy URL"}
            </button>
          </div>
        </div>

        {/* SinaLite Webhook Endpoint Card */}
        <div className="card" style={{ padding: "1.5rem", backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0F172A", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Globe size={18} style={{ color: "#10B981" }} /> SinaLite Order & Proof Webhook URL
          </h3>
          <p style={{ fontSize: "0.85rem", color: "#64748B", margin: 0 }}>
            Enter this endpoint in your <strong>SinaLite Account Settings → Webhook Configuration</strong> to automatically receive job proof review files (<code style={{ backgroundColor: "#F1F5F9", padding: "2px 5px", borderRadius: "4px" }}>reviewURL</code>), tracking numbers, and fulfillment status updates:
          </p>

          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: "6px",
            padding: "0.6rem 1rem"
          }}>
            <span style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "#0F172A", fontWeight: 600 }}>
              {typeof window !== "undefined" ? `${window.location.origin}/api/webhooks/sinalite` : "/api/webhooks/sinalite"}
            </span>
            <button
              type="button"
              onClick={() => {
                const url = `${window.location.origin}/api/webhooks/sinalite`;
                navigator.clipboard.writeText(url);
                alert("SinaLite Webhook URL copied to clipboard!");
              }}
              className="btn btn-outline"
              style={{ padding: "0.3rem 0.65rem", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.3rem" }}
            >
              <Copy size={14} /> Copy SinaLite Webhook URL
            </button>
          </div>
        </div>

        {/* Custom Apparel Shipping Classes Manager */}
        <ApparelShippingManager />

        {/* SinaLite Fulfillment Submission Mode Card */}
        <div className="card" style={{ padding: "1.75rem", backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", color: "#2563EB", letterSpacing: "0.05em", display: "block", marginBottom: "0.25rem" }}>
                Print Wholesale Fulfillment Settings
              </span>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0F172A", margin: 0 }}>
                SinaLite API Submission Mode
              </h3>
              <p style={{ color: "#64748B", fontSize: "0.85rem", marginTop: "0.25rem" }}>
                Configure whether paid print orders automatically post to SinaLite API upon checkout, or stay held in <em>Pending Submission</em> for manual review by Admin.
              </p>
            </div>

            <button
              type="button"
              onClick={handleToggleAutoSubmit}
              disabled={savingFulfillment || loadingFulfillment}
              style={{
                padding: "0.5rem 1.15rem",
                borderRadius: "24px",
                border: "none",
                fontSize: "0.8rem",
                fontWeight: 800,
                cursor: savingFulfillment ? "wait" : "pointer",
                backgroundColor: autoSubmitSinalite ? "#10B981" : "#F59E0B",
                color: "white",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                transition: "all 0.2s ease"
              }}
            >
              {autoSubmitSinalite ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {autoSubmitSinalite ? "AUTOMATIC SUBMISSION (ENABLED)" : "MANUAL REVIEW MODE (DISABLED)"}
            </button>
          </div>

          <div style={{
            padding: "1rem",
            backgroundColor: autoSubmitSinalite ? "#ECFDF5" : "#FFFBEB",
            borderRadius: "8px",
            border: autoSubmitSinalite ? "1px solid #A7F3D0" : "1px solid #FCD34D",
            fontSize: "0.85rem",
            color: autoSubmitSinalite ? "#065F46" : "#92400E"
          }}>
            {autoSubmitSinalite ? (
              <p style={{ margin: 0, fontWeight: 600 }}>
                ⚡ <strong>AUTOMATIC MODE ENABLED:</strong> Print orders will automatically post directly to SinaLite backend API upon checkout completion.
              </p>
            ) : (
              <p style={{ margin: 0, fontWeight: 600 }}>
                🛑 <strong>MANUAL REVIEW MODE (RECOMMENDED):</strong> Print orders will enter status <em>Pending Submission</em>. Admin can review product options and click <strong>"Send Order to SinaLite"</strong> in Admin Orders to transmit when ready.
              </p>
            )}
          </div>

          {/* SinaLite OAuth API Credentials Form */}
          <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h4 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0F172A", margin: 0 }}>
              🔑 SinaLite API Access Keys (OAuth Credentials)
            </h4>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label className="label">SinaLite Client ID</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. 5f89a... or Client ID"
                  value={sinaliteClientId}
                  onChange={(e) => setSinaliteClientId(e.target.value)}
                  style={{ fontSize: "0.85rem", fontFamily: "monospace" }}
                />
              </div>

              <div>
                <label className="label">SinaLite Client Secret</label>
                <input
                  type="password"
                  className="input"
                  placeholder="e.g. 64-character secret key"
                  value={sinaliteClientSecret}
                  onChange={(e) => setSinaliteClientSecret(e.target.value)}
                  style={{ fontSize: "0.85rem", fontFamily: "monospace" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0F172A" }}>API Endpoint Target:</span>
                <button
                  type="button"
                  onClick={() => setSinaliteUseLive(!sinaliteUseLive)}
                  style={{
                    padding: "0.3rem 0.75rem",
                    borderRadius: "6px",
                    border: "1px solid #CBD5E1",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    backgroundColor: sinaliteUseLive ? "#EF4444" : "#3B82F6",
                    color: "white"
                  }}
                >
                  {sinaliteUseLive ? "🔴 LIVE API (liveapi.sinalite.com)" : "🧪 TEST SANDBOX (api.sinaliteuppy.com)"}
                </button>
              </div>

              <button
                type="button"
                onClick={handleSaveFulfillmentCredentials}
                disabled={savingFulfillment}
                className="btn btn-primary"
                style={{ padding: "0.5rem 1.25rem", fontSize: "0.85rem", backgroundColor: "#2563EB", color: "white" }}
              >
                {savingFulfillment ? "Saving Credentials..." : "Save SinaLite Credentials"}
              </button>
            </div>
          </div>
        </div>

        {/* Save Settings Form Submit CTA */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary"
            style={{
              padding: "0.75rem 2rem",
              fontSize: "0.95rem",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              backgroundColor: "#2563EB",
              color: "white"
            }}
          >
            {saving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
            {saving ? "Saving Configuration..." : "Save Stripe Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ApparelShippingManager() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/apparel-shipping")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.classes)) setClasses(data.classes);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/apparel-shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classes })
      });
      const data = await res.json();
      if (res.ok) {
        alert("Apparel shipping classes saved successfully!");
      } else {
        alert("Error saving shipping classes: " + data.error);
      }
    } catch (err) {
      alert("Failed to save shipping classes: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const addClass = () => {
    setClasses(prev => [
      ...prev,
      {
        id: `class-${Date.now()}`,
        name: "New Apparel Shipping Class",
        basePrice: 12.99,
        perItemPrice: 2.00,
        deliveryDays: "3-5 days",
        active: true
      }
    ]);
  };

  const updateClass = (id, field, value) => {
    setClasses(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const deleteClass = (id) => {
    setClasses(prev => prev.filter(c => c.id !== id));
  };

  if (loading) return null;

  return (
    <div className="card" style={{ padding: "1.75rem", backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E2E8F0", paddingBottom: "0.85rem" }}>
        <div>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0F172A", margin: 0 }}>
            Custom Apparel Shipping Classes
          </h3>
          <p style={{ fontSize: "0.8rem", color: "#64748B", margin: 0, marginTop: "0.2rem" }}>
            Shown to customers on frontend checkout when ordering custom apparel only. (If Print products are in cart, SinaLite print shipping rates apply and apparel shipping is free).
          </p>
        </div>

        <button
          type="button"
          onClick={addClass}
          className="btn btn-outline"
          style={{ padding: "0.45rem 0.85rem", fontSize: "0.8rem", fontWeight: 700 }}
        >
          + Add Shipping Class
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {classes.map((cls) => (
          <div
            key={cls.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1.5fr 1fr 1fr 1.2fr auto",
              gap: "0.75rem",
              alignItems: "center",
              padding: "0.85rem",
              backgroundColor: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "8px"
            }}
          >
            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748B" }}>Class Title</label>
              <input
                type="text"
                className="input"
                value={cls.name}
                onChange={(e) => updateClass(cls.id, "name", e.target.value)}
                style={{ fontSize: "0.85rem", width: "100%" }}
              />
            </div>

            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748B" }}>Base Rate ($)</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={cls.basePrice}
                onChange={(e) => updateClass(cls.id, "basePrice", parseFloat(e.target.value) || 0)}
                style={{ fontSize: "0.85rem", width: "100%" }}
              />
            </div>

            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748B" }}>Per Addl Item ($)</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={cls.perItemPrice}
                onChange={(e) => updateClass(cls.id, "perItemPrice", parseFloat(e.target.value) || 0)}
                style={{ fontSize: "0.85rem", width: "100%" }}
              />
            </div>

            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748B" }}>Delivery Estimate</label>
              <input
                type="text"
                className="input"
                value={cls.deliveryDays}
                onChange={(e) => updateClass(cls.id, "deliveryDays", e.target.value)}
                style={{ fontSize: "0.85rem", width: "100%" }}
              />
            </div>

            <button
              type="button"
              onClick={() => deleteClass(cls.id)}
              style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", padding: "6px", marginTop: "1rem" }}
              title="Remove Shipping Class"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary"
          style={{ padding: "0.5rem 1.25rem", fontSize: "0.85rem", fontWeight: 700, backgroundColor: "#10B981", color: "white" }}
        >
          {saving ? "Saving Classes..." : "Save Apparel Shipping Classes"}
        </button>
      </div>
    </div>
  );
}

