"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { RefreshCw, Play, Clock, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";

export default function AdminSyncPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [error, setError] = useState("");

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
