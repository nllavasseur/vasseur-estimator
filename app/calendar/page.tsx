"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { loadAll, setActiveId, statusColor } from "../../lib/estimateStore";

const BRAND = {
  bg: "#CBB08A",
  border: "#8B5A2B",
  ink: "#1f2937",
};

type CalJob = {
  id: string;
  title: string;
  status: "pending" | "sold" | "void";
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD (exclusive)
};

function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

export default function CalendarPage() {
  // Minimal in-app calendar (no external libs)
  // Next step later: assign dates to quotes; for now, this uses a small demo list + you can edit it.
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [jobs, setJobs] = useState<CalJob[]>(() => {
    // If you later add date fields to Estimate, we will derive jobs from saved estimates.
    // For now, a simple local list.
    return [
      { id: "demo1", title: "Pending — Example", status: "pending", start: isoDate(new Date()), end: isoDate(addDays(new Date(), 2)) },
    ];
  });

  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);

  const days = useMemo(() => {
    const firstDayIdx = new Date(monthStart).getDay(); // 0..6
    const gridStart = addDays(monthStart, -firstDayIdx);
    const arr: Date[] = [];
    for (let i = 0; i < 42; i++) arr.push(addDays(gridStart, i));
    return arr;
  }, [monthStart]);

  function inRange(day: string, start: string, endExclusive: string) {
    return day >= start && day < endExclusive;
  }

  return (
    <div style={{ minHeight: "100vh", background: BRAND.bg, padding: 16 }}>
      <div
        style={{
          width: "min(980px, 96vw)",
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
            <div style={{ fontSize: 22, fontWeight: 1000, color: BRAND.ink }}>Calendar</div>
            <div style={{ color: "#6b6b6b", fontSize: 13, marginTop: 2 }}>
              Blocks are clickable. Next step: attach dates to saved quotes.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/" style={{ textDecoration: "none" }}>
              <span style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.14)", fontWeight: 900, background: "rgba(255,255,255,0.92)", color: BRAND.ink }}>
                ← Estimator
              </span>
            </Link>
            <Link href="/quotes" style={{ textDecoration: "none" }}>
              <span style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.14)", fontWeight: 900, background: "rgba(255,255,255,0.92)", color: BRAND.ink }}>
                Quotes
              </span>
            </Link>
          </div>
        </div>

        <div style={{ height: 12 }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => setMonth((m) => startOfMonth(new Date(m.getFullYear(), m.getMonth() - 1, 1)))}
              style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.14)", fontWeight: 900, background: "rgba(255,255,255,0.92)", cursor: "pointer" }}
            >
              ← Prev
            </button>
            <button
              type="button"
              onClick={() => setMonth(startOfMonth(new Date()))}
              style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.14)", fontWeight: 900, background: "rgba(255,255,255,0.92)", cursor: "pointer" }}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setMonth((m) => startOfMonth(new Date(m.getFullYear(), m.getMonth() + 1, 1)))}
              style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.14)", fontWeight: 900, background: "rgba(255,255,255,0.92)", cursor: "pointer" }}
            >
              Next →
            </button>
          </div>

          <div style={{ fontWeight: 1000, color: BRAND.ink }}>
            {month.toLocaleString(undefined, { month: "long", year: "numeric" })}
          </div>
        </div>

        <div style={{ height: 12 }} />

        {/* Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} style={{ fontSize: 12, fontWeight: 900, color: "#374151", paddingLeft: 6 }}>
              {d}
            </div>
          ))}

          {days.map((d) => {
            const dayIso = isoDate(d);
            const inMonth = d.getMonth() === month.getMonth();
            const dayJobs = jobs.filter((j) => inRange(dayIso, j.start, j.end));

            return (
              <div
                key={dayIso}
                style={{
                  minHeight: 92,
                  borderRadius: 14,
                  border: "1px solid rgba(0,0,0,0.10)",
                  background: inMonth ? "rgba(255,255,255,0.78)" : "rgba(255,255,255,0.50)",
                  padding: 8,
                  overflow: "hidden",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div style={{ fontWeight: 1000, color: inMonth ? BRAND.ink : "#6b7280" }}>{d.getDate()}</div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>{dayIso.slice(5)}</div>
                </div>

                <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 6 }}>
                  {dayJobs.slice(0, 2).map((j) => {
                    const c = statusColor(j.status);
                    return (
                      <button
                        key={j.id}
                        type="button"
                        onClick={() => {
                          alert(`Open job: ${j.title}\n\nNext step: link to a saved quote.`);
                        }}
                        style={{
                          textAlign: "left",
                          borderRadius: 12,
                          border: `1px solid ${c.border}`,
                          background: c.bg,
                          padding: "6px 8px",
                          fontWeight: 900,
                          fontSize: 12,
                          color: c.text,
                          cursor: "pointer",
                        }}
                      >
                        {j.title}
                      </button>
                    );
                  })}

                  {dayJobs.length > 2 ? (
                    <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 900 }}>
                      +{dayJobs.length - 2} more
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ height: 16 }} />

        <div style={{ borderRadius: 16, border: "1px solid rgba(0,0,0,0.10)", background: "rgba(255,255,255,0.75)", padding: 14 }}>
          <div style={{ fontWeight: 1000, color: BRAND.ink }}>Next</div>
          <div style={{ fontSize: 13, color: "#6b6b6b", marginTop: 4 }}>
            When you’re ready, we’ll add <b>Start date / End date</b> to each saved quote and the calendar will render those automatically.
          </div>
        </div>
      </div>
    </div>
  );
}
