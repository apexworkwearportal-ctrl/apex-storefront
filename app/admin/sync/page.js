"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { RefreshCw, Play, Clock, CheckCircle2, AlertTriangle, AlertCircle, DollarSign, Loader2, ChevronDown, ChevronUp } from "lucide-react";

export default function AdminSyncPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [error, setError] = useState("");

  // Price calculation state
  const [calcPrices, setCalcPrices] = useState(false);
  const [priceCalcResult, setPriceCalcResult] = useState(null);
  const [priceCalcError, setPriceCalcError] = useState("");
  const [showPriceDetails, setShowPriceDetails] = useState(false);
  const [calcProgress, setCalcProgress] = useState({ current: 0, total: 0, currentName: "" });

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const q = query(
        collection(db, "syncLogs"),
        orderBy("startedAt", "desc"),
        limit(5)
      );
      const snapshot = await getDocs(q);
      const list = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setLogs(list);
    } catch (err) {
      console.error("Error fetching sync logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleSyncNow = async () => {
    setSyncing(true);
    setSyncResult(null);
    setError("");

    try {
      // Get ID token from Firebase auth client
      const idToken = await user.getIdToken();
      
      const res = await fetch("/api/admin/sync", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${idToken}`,
        },
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to trigger sync");
      }

      setSyncResult(data);
      // Refresh historical logs
      await fetchLogs();
    } catch (err) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during sync.");
    } finally {
      setSyncing(false);
    }
  };

  const handleCalcPrices = async () => {
    setCalcPrices(true);
    setPriceCalcResult(null);
    setPriceCalcError("");
    setShowPriceDetails(false);
    setCalcProgress({ current: 0, total: 0, currentName: "Initializing..." });

    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/admin/sync-prices", {
        method: "POST",
        headers: { "Authorization": `Bearer ${idToken}` }
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Price calculation failed");
      }

      if (!res.body) {
        throw new Error("No response body received from stream.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const currentResults = [];
      const stats = { total: 0, updated: 0, skipped: 0, failed: 0 };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            if (event.type === "init") {
              stats.total = event.total;
              setCalcProgress({ current: 0, total: event.total, currentName: "Preparing..." });
              setPriceCalcResult({ summary: { ...stats }, results: [] });
            } else if (event.type === "progress") {
              setCalcProgress({ current: event.current, total: event.total, currentName: event.product?.name || "" });
              if (event.product) {
                currentResults.push(event.product);
                if (event.product.status === "updated") stats.updated++;
                else if (event.product.status === "skipped") stats.skipped++;
                else if (event.product.status === "failed") stats.failed++;
              }
              setPriceCalcResult({
                summary: { ...stats },
                results: [...currentResults]
              });
            } else if (event.type === "complete") {
              setPriceCalcResult({
                summary: event.summary,
                results: event.results
              });
            } else if (event.type === "error") {
              throw new Error(event.error);
            }
          } catch (e) {
            if (e.message && !e.message.includes("JSON")) {
              throw e;
            }
          }
        }
      }
    } catch (err) {
      setPriceCalcError(err.message || "An unexpected error occurred.");
    } finally {
      setCalcPrices(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", marginBottom: "0.25rem" }}>SinaLite Sync Engine</h1>
          <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.95rem" }}>
            Trigger manual catalog updates and inspect execution logs.
          </p>
        </div>
        <button
          onClick={handleSyncNow}
          className="btn btn-primary"
          disabled={syncing}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.5rem" }}
        >
          <RefreshCw size={18} className={syncing ? "spin-animation" : ""} style={{
            animation: syncing ? "spin 1.5s linear infinite" : "none"
          }} />
          {syncing ? "Syncing Catalog..." : "Sync Now"}
        </button>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {/* Sync Status Banner */}
      {syncResult && (
        <div className="card" style={{
          borderColor: syncResult.status === "success" ? "hsl(var(--success-hsl))" : "hsl(var(--accent-hsl))",
          backgroundColor: syncResult.status === "success" ? "hsl(var(--success-hsl) / 0.05)" : "hsl(var(--accent-hsl) / 0.05)",
          padding: "1.5rem",
          marginBottom: "2rem"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            {syncResult.status === "success" ? (
              <CheckCircle2 size={24} style={{ color: "hsl(var(--success-hsl))" }} />
            ) : (
              <AlertTriangle size={24} style={{ color: "hsl(var(--accent-hsl))" }} />
            )}
            <h2 style={{ fontSize: "1.2rem", textTransform: "capitalize" }}>
              Sync completed: {syncResult.status.replace("_", " ")}
            </h2>
          </div>
          <p style={{ fontSize: "0.95rem", marginBottom: "0.5rem" }}>
            Processed <strong>{syncResult.productsProcessed}</strong> products. Failed <strong>{syncResult.productsFailed}</strong>.
          </p>
          {syncResult.errors && syncResult.errors.length > 0 && (
            <div style={{ marginTop: "1rem" }}>
              <p style={{ fontWeight: 600, color: "hsl(var(--destructive-hsl))", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                Error Logs:
              </p>
              <ul style={{
                listStyle: "none",
                padding: "0.5rem 0.75rem",
                backgroundColor: "rgba(0,0,0,0.05)",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.8rem",
                maxHeight: "150px",
                overflowY: "auto"
              }}>
                {syncResult.errors.map((err, idx) => (
                  <li key={idx} style={{ color: "hsl(var(--destructive-hsl))", marginBottom: "0.25rem" }}>• {err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="card" style={{
          borderColor: "hsl(var(--destructive-hsl))",
          backgroundColor: "hsl(var(--destructive-hsl) / 0.05)",
          padding: "1.5rem",
          marginBottom: "2rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem"
        }}>
          <AlertCircle size={24} style={{ color: "hsl(var(--destructive-hsl))" }} />
          <div>
            <h2 style={{ fontSize: "1.2rem", color: "hsl(var(--destructive-hsl))" }}>Sync failed</h2>
            <p style={{ fontSize: "0.95rem", color: "hsl(var(--foreground-hsl) / 0.8)" }}>{error}</p>
          </div>
        </div>
      )}

      {/* ─── Calculate Starting Prices Section ─────────────────────────── */}
      <div className="card" style={{ marginBottom: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <DollarSign size={18} /> Calculate Starting Prices
            </h2>
            <p style={{ fontSize: "0.85rem", color: "hsl(var(--muted-hsl))", maxWidth: "480px" }}>
              Fetches real base costs from the SinaLite pricing API for each synced product, applies your markup rules, and updates the &quot;Starting From&quot; price shown to customers. Products with a manual price override are skipped.
            </p>
          </div>
          <button
            onClick={handleCalcPrices}
            disabled={calcPrices}
            className="btn btn-outline"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.65rem 1.25rem", whiteSpace: "nowrap" }}
          >
            {calcPrices ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Play size={16} />}
            {calcPrices ? "Calculating..." : "Run Price Calculation"}
          </button>
        </div>

        {calcPrices && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", padding: "1rem", backgroundColor: "hsl(var(--secondary-hsl) / 0.25)", borderRadius: "var(--radius-sm)", border: "1px solid hsl(var(--border-hsl))" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.9rem" }}>
              <span style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Loader2 size={16} style={{ animation: "spin 1s linear infinite", color: "hsl(var(--accent-hsl))" }} />
                {calcProgress.total > 0
                  ? `Calculating prices (${calcProgress.current} of ${calcProgress.total} products completed)`
                  : "Initializing price calculation..."}
              </span>
              <span style={{ fontWeight: 800, color: "hsl(var(--accent-hsl))" }}>
                {calcProgress.total > 0 ? `${Math.round((calcProgress.current / calcProgress.total) * 100)}%` : "0%"}
              </span>
            </div>

            <div style={{ width: "100%", height: "8px", backgroundColor: "hsl(var(--border-hsl))", borderRadius: "9999px", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${calcProgress.total > 0 ? Math.min(100, Math.round((calcProgress.current / calcProgress.total) * 100)) : 0}%`,
                backgroundColor: "hsl(var(--accent-hsl))",
                transition: "width 0.2s ease"
              }} />
            </div>

            {calcProgress.currentName && (
              <p style={{ fontSize: "0.8rem", color: "hsl(var(--muted-hsl))", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                Currently processing: <strong>{calcProgress.currentName}</strong>
              </p>
            )}
          </div>
        )}

        {priceCalcError && (
          <div style={{ padding: "0.75rem 1rem", backgroundColor: "hsl(var(--destructive-hsl) / 0.05)", borderRadius: "var(--radius-sm)", color: "hsl(var(--destructive-hsl))", fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <AlertCircle size={16} /> {priceCalcError}
          </div>
        )}

        {priceCalcResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem" }}>
              {[
                { label: "Total Products", val: priceCalcResult.summary?.total ?? 0, color: undefined },
                { label: "Updated", val: priceCalcResult.summary?.updated ?? 0, color: "#059669" },
                { label: "Skipped (manual)", val: priceCalcResult.summary?.skipped ?? 0, color: "hsl(var(--muted-hsl))" },
                { label: "Failed", val: priceCalcResult.summary?.failed ?? 0, color: priceCalcResult.summary?.failed > 0 ? "hsl(var(--destructive-hsl))" : undefined },
              ].map(s => (
                <div key={s.label} style={{ backgroundColor: "hsl(var(--secondary-hsl) / 0.25)", borderRadius: "var(--radius-sm)", padding: "0.75rem 1rem", textAlign: "center" }}>
                  <p style={{ fontSize: "1.4rem", fontWeight: 900, color: s.color }}>{s.val}</p>
                  <p style={{ fontSize: "0.75rem", color: "hsl(var(--muted-hsl))", textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.label}</p>
                </div>
              ))}
            </div>

            {priceCalcResult.results?.length > 0 && (
              <div>
                <button
                  onClick={() => setShowPriceDetails(p => !p)}
                  style={{ display: "flex", alignItems: "center", gap: "0.35rem", background: "none", border: "none", cursor: "pointer", fontSize: "0.85rem", color: "hsl(var(--muted-hsl))", fontWeight: 600, padding: "0" }}
                >
                  {showPriceDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {showPriceDetails ? "Hide" : "Show"} per-product results ({priceCalcResult.results.length})
                </button>

                {showPriceDetails && (
                  <div style={{ marginTop: "0.5rem", maxHeight: "260px", overflowY: "auto", borderRadius: "var(--radius-sm)", border: "1px solid hsl(var(--border-hsl))" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                      <thead>
                        <tr style={{ backgroundColor: "hsl(var(--secondary-hsl) / 0.4)", position: "sticky", top: 0 }}>
                          {["Product", "Status", "Base Cost", "Markup %", "Starting Price"].map(h => (
                            <th key={h} style={{ padding: "0.5rem 0.75rem", textAlign: "left", fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", color: "hsl(var(--muted-hsl))" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {priceCalcResult.results.map((r, i) => (
                          <tr key={r.id} style={{ backgroundColor: i % 2 === 0 ? "transparent" : "hsl(var(--secondary-hsl) / 0.1)", borderTop: "1px solid hsl(var(--border-hsl) / 0.4)" }}>
                            <td style={{ padding: "0.45rem 0.75rem", fontWeight: 600 }}>{r.name}</td>
                            <td style={{ padding: "0.45rem 0.75rem" }}>
                              <span style={{
                                display: "inline-block", padding: "0.1rem 0.5rem", borderRadius: "9999px", fontSize: "0.7rem", fontWeight: 700,
                                backgroundColor: r.status === "updated" ? "hsl(var(--success-hsl) / 0.1)" : r.status === "skipped" ? "hsl(var(--secondary-hsl))" : "hsl(var(--destructive-hsl) / 0.1)",
                                color: r.status === "updated" ? "#059669" : r.status === "skipped" ? "hsl(var(--muted-hsl))" : "hsl(var(--destructive-hsl))"
                              }}>
                                {r.status}
                              </span>
                              {r.reason && <span style={{ color: "hsl(var(--muted-hsl))", marginLeft: "0.25rem", fontSize: "0.7rem" }}>{r.reason}</span>}
                            </td>
                            <td style={{ padding: "0.45rem 0.75rem", color: "hsl(var(--muted-hsl))" }}>{r.baseCost ? `$${r.baseCost}` : "—"}</td>
                            <td style={{ padding: "0.45rem 0.75rem", color: "hsl(var(--muted-hsl))" }}>{r.markupPercent ? `${r.markupPercent}%` : "—"}</td>
                            <td style={{ padding: "0.45rem 0.75rem", fontWeight: 800, color: "hsl(var(--accent-hsl))" }}>{r.startingPrice ? `$${r.startingPrice}` : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* History Log */}
      <h2 style={{ fontSize: "1.4rem", marginBottom: "1rem" }}>Run History</h2>
      {loadingLogs ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "hsl(var(--muted-hsl))" }}>
          Loading execution history...
        </div>
      ) : logs.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem", color: "hsl(var(--muted-hsl))" }}>
          No historical run logs found.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {logs.map((log) => {
            const start = new Date(log.startedAt?.seconds * 1000 || log.startedAt);
            const end = new Date(log.finishedAt?.seconds * 1000 || log.finishedAt);
            const durationSec = Math.round((end - start) / 1000);
            
            return (
              <div key={log.id} className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {log.status === "success" ? (
                      <CheckCircle2 size={20} style={{ color: "hsl(var(--success-hsl))" }} />
                    ) : log.status === "partial_success" ? (
                      <AlertTriangle size={20} style={{ color: "hsl(var(--accent-hsl))" }} />
                    ) : (
                      <AlertCircle size={20} style={{ color: "hsl(var(--destructive-hsl))" }} />
                    )}
                    <div style={{ textAlign: "left" }}>
                      <p style={{ fontWeight: 600, textTransform: "capitalize" }}>
                        Run {log.status.replace("_", " ")}
                      </p>
                      <p style={{ fontSize: "0.8rem", color: "hsl(var(--muted-hsl))" }}>
                        ID: {log.id}
                      </p>
                    </div>
                  </div>
                  
                  <div style={{ display: "flex", gap: "2rem", fontSize: "0.9rem" }}>
                    <div>
                      <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.75rem", textTransform: "uppercase" }}>Started At</p>
                      <p style={{ fontWeight: 500 }}>{start.toLocaleString()}</p>
                    </div>
                    <div>
                      <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.75rem", textTransform: "uppercase" }}>Duration</p>
                      <p style={{ fontWeight: 500 }}>{durationSec}s</p>
                    </div>
                    <div>
                      <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.75rem", textTransform: "uppercase" }}>Products</p>
                      <p style={{ fontWeight: 500 }}>
                        {log.productsProcessed} processed / {log.productsFailed} failed
                      </p>
                    </div>
                  </div>
                </div>

                {log.errors && log.errors.length > 0 && (
                  <div style={{ borderTop: "1px solid hsl(var(--border-hsl))", paddingTop: "0.75rem" }}>
                    <p style={{ fontWeight: 600, fontSize: "0.8rem", color: "hsl(var(--destructive-hsl))", marginBottom: "0.25rem" }}>
                      Errors ({log.errors.length}):
                    </p>
                    <ul style={{
                      listStyle: "none",
                      padding: "0.5rem",
                      backgroundColor: "hsl(var(--secondary-hsl) / 0.3)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "0.8rem",
                      maxHeight: "100px",
                      overflowY: "auto"
                    }}>
                      {log.errors.map((err, idx) => (
                        <li key={idx} style={{ color: "hsl(var(--destructive-hsl))", marginBottom: "0.2rem" }}>• {err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
