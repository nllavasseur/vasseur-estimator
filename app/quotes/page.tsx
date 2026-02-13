"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { loadAll, remove, setActiveId, statusColor, QuoteStatus, Estimate } from "../../lib/estimateStore";

const BRAND = {
  bg: "#CBB08A",
  border: "#8B5A2B",
  ink: "#1f2937",
  green: "#546B3C",
  amber: "#B57B2A",
};

function fmtMoney(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export default function QuotesPage() {
  const [refresh, setRefresh] = useState(0);
  const all = useMemo(() => loadAll(), [refresh]);

  const [filter, setFilter] = useState<QuoteStatus | "all">("all");

  const filtered = useMemo(() => {
    if (filter === "all") return all;
    return all.filter((q) => q.status === filter);
  }, [all, filter]);

  function setStatus(id: string, status: QuoteStatus) {
    const items = loadAll();
    const idx = items.findIndex((x) => x.id === id);
    if (idx < 0) return;
    items[idx] = { ...items[idx], status, updatedAt: new Date().toISOString() };
    localStorage.setItem("vasseur_estimates_v1", JSON.stringify(items));
    setRefresh((n) => n + 1);
  }

  return (
    <div style={{ minHeight: "100vh", background: BRAND.bg, padding: 16 }}>
      <div
        style={{
          width: "min(920px, 96vw)",
          margin: "0 auto",
          background: "rgba(255,255,255,0.86)",
          borderRadius: 18,
          border: `2px solid ${BRAND.border}`,
          boxShadow: "0 12px 30px rgba(0,0,0,0.15)",
          padding: 18,
          backdropFilter: "blur(6px)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 1000, color: BRAND.ink }}>Saved Quotes</div>
            <div style={{ color: "#6b6b6b", fontSize: 13, marginTop: 2 }}>
              Tap a quote to open it back on the estimator page.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Link href="/" style={{ textDecoration: "none" }}>
              <span style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.14)", fontWeight: 900, background: "rgba(255,255,255,0.92)", color: BRAND.ink }}>
                ← Estimator
              </span>
            </Link>
            <Link href="/calendar" style={{ textDecoration: "none" }}>
              <span style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.14)", fontWeight: 900, background: "rgba(255,255,255,0.92)", color: BRAND.ink }}>
                Calendar
              </span>
            </Link>
          </div>
        </div>

        <div style={{ height: 12 }} />

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(["all", "pending", "sold", "void"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                border: "1px solid rgba(0,0,0,0.14)",
                background: filter === k ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.92)",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              {k === "all" ? "All" : k[0].toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ height: 14 }} />

        {filtered.length === 0 ? (
          <div style={{ color: "#6b6b6b", fontSize: 14 }}>No saved quotes yet.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
            {filtered.map((q) => {
              const c = statusColor(q.status);
              return (
                <div
                  key={q.id}
                  style={{
                    borderRadius: 16,
                    border: `2px solid ${c.border}`,
                    background: c.bg,
                    padding: 12,
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setActiveId(q.id);
                      window.location.href = "/";
                    }}
                    style={{
                      textAlign: "left",
                      background: "transparent",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 1000, color: BRAND.ink }}>{q.title}</div>
                    <div style={{ fontSize: 12, color: "#4b5563", marginTop: 2 }}>
                      {q.customer?.address ? q.customer.address : "—"} • {Math.round(q.totals?.totalLf || 0)} LF • {fmtMoney(q.totals?.total || 0)}
                    </div>
                    <div style={{ fontSize: 12, color: "#4b5563", marginTop: 2 }}>
                      Status: <b style={{ color: c.text }}>{q.status.toUpperCase()}</b>
                      {q.customer?.phone ? ` • ${q.customer.phone}` : ""}
                      {q.customer?.email ? ` • ${q.customer.email}` : ""}
                    </div>
                  </button>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <select
                      value={q.status}
                      onChange={(e) => setStatus(q.id, e.target.value as any)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 12,
                        border: "1px solid rgba(0,0,0,0.16)",
                        fontWeight: 900,
                        background: "rgba(255,255,255,0.92)",
                      }}
                    >
                      <option value="pending">Pending</option>
                      <option value="sold">Sold</option>
                      <option value="void">Void</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => {
                        if (!confirm("Delete this quote?")) return;
                        remove(q.id);
                        setRefresh((n) => n + 1);
                      }}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 12,
                        border: "1px solid rgba(0,0,0,0.16)",
                        fontWeight: 900,
                        background: "rgba(255,255,255,0.92)",
                        cursor: "pointer",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
