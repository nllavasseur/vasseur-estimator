"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Estimate,
  Segment,
  uid,
  upsert,
  getActiveId,
  setActiveId,
  getById,
} from "../lib/estimateStore";
function TwoColRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="twoCol">
      {/* each child lane gets min-width:0 so it can shrink */}
      {React.Children.map(children, (child) => (
        <div className="min0">{child}</div>
      ))}
    </div>
  );
}
// --- brand ---
const BRAND = {
  bg: "#CBB08A",
  border: "#8B5A2B",
  green: "#546B3C",
  amber: "#B57B2A",
  ink: "#1f2937",
};

function fmtMoney(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function toNumberSafe(v: string) {
  if (v.trim() === "") return NaN;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function sumLf(segments: Segment[]) {
  return segments.reduce((s, seg) => s + (Number.isFinite(seg.lengthFt) ? seg.lengthFt : 0), 0);
}

export default function Page() {
  // --- estimate state ---
  const [estimateId, setEstimateIdState] = useState<string>(() => getActiveId() || uid("est"));

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  });

  const [segments, setSegments] = useState<Segment[]>([]);
  const [corners, setCorners] = useState(0);
  const [heightFt, setHeightFt] = useState(6);
  const [material, setMaterial] = useState<"wood" | "vinyl" | "chain">("wood");
  const [woodType, setWoodType] = useState<"pt" | "cedar" | "cedartone">("pt");
  const [postSize, setPostSize] = useState<"4x4" | "6x6">("4x4");
  const [slope, setSlope] = useState(false);
  const [rocky, setRocky] = useState(false);
  const [gatesWalk, setGatesWalk] = useState(0);
  const [gatesDouble, setGatesDouble] = useState(0);

  // pricing constants (demo values, you can tune)
  const [materialMarkupPct, setMaterialMarkupPct] = useState(0.2);
  const [equipmentFee, setEquipmentFee] = useState(400);
  const [deliveryFee, setDeliveryFee] = useState(150);
  const [disposalFee, setDisposalFee] = useState(150);

  // --- "load active" when it exists ---
  React.useEffect(() => {
    const activeId = getActiveId();
    if (!activeId) return;
    const loaded = getById(activeId);
    if (!loaded) return;
    // hydrate
    setEstimateIdState(loaded.id);
    setTitle(loaded.title || "");
    setNotes(loaded.notes || "");
    setCustomer(loaded.customer);
    setSegments(loaded.segments || []);
    setCorners(loaded.corners || 0);
    setHeightFt(loaded.heightFt || 6);
    setMaterial(loaded.material || "wood");
    setWoodType(loaded.woodType || "pt");
    setPostSize(loaded.postSize || "4x4");
    setSlope(!!loaded.slope);
    setRocky(!!loaded.rocky);
    setGatesWalk(loaded.gatesWalk || 0);
    setGatesDouble(loaded.gatesDouble || 0);
    setMaterialMarkupPct(loaded.materialMarkupPct ?? 0.2);
    setEquipmentFee(loaded.equipmentFee ?? 400);
    setDeliveryFee(loaded.deliveryFee ?? 150);
    setDisposalFee(loaded.disposalFee ?? 150);
  }, []);

  // --- estimate math (simple, extend later with full takeoff rules) ---
  const totalLf = useMemo(() => sumLf(segments), [segments]);

  // labor hours calibration from your note: 36 hrs for 466 LF -> hours per LF
  const laborHours = useMemo(() => {
    if (totalLf <= 0) return 0;
    const base = (36 / 466) * totalLf;
    let mult = 1;
    if (heightFt >= 8) mult *= 1.2;
    if (slope) mult *= 1.15;
    if (rocky) mult *= 1.08;
    return base * mult + gatesWalk * 1.5 + gatesDouble * 3.0;
  }, [totalLf, heightFt, slope, rocky, gatesWalk, gatesDouble]);

  const laborCost = useMemo(() => {
    // you can replace crew rate later; placeholder 75/hr
    return laborHours * 75;
  }, [laborHours]);

  const materialCost = useMemo(() => {
    // placeholder base rates
    const baseRatePerLf =
      material === "vinyl" ? 42 :
      material === "chain" ? 28 :
      25;

    const woodMult =
      woodType === "pt" ? 1.0 :
      woodType === "cedar" ? 1.35 :
      1.6; // cedartone

    const postMult = postSize === "6x6" ? 1.2 : 1.0;

    const raw = totalLf * baseRatePerLf * (material === "wood" ? woodMult * postMult : 1);
    return raw * (1 + materialMarkupPct);
  }, [totalLf, material, woodType, postSize, materialMarkupPct]);

  const total = useMemo(() => {
    if (totalLf <= 0) return 0;
    return materialCost + laborCost + equipmentFee + deliveryFee + disposalFee;
  }, [totalLf, materialCost, laborCost, equipmentFee, deliveryFee, disposalFee]);

  function addSegment() {
    const nextIdx = segments.length;
    const letterA = String.fromCharCode(65 + nextIdx);
    const letterB = String.fromCharCode(66 + nextIdx);
    setSegments((prev) => [
      ...prev,
      { id: uid("seg"), name: `${letterA}-${letterB}`, lengthFt: NaN },
    ]);
  }

  function updateSegment(id: string, patch: Partial<Segment>) {
    setSegments((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function removeSegment(id: string) {
    setSegments((prev) => prev.filter((s) => s.id !== id));
  }

  function newEstimate(resetCustomer = false) {
    const newId = uid("est");
    setEstimateIdState(newId);
    setActiveId(newId);

    setTitle("");
    setNotes("");
    if (resetCustomer) setCustomer({ name: "", phone: "", email: "", address: "" });

    setSegments([]);
    setCorners(0);
    setHeightFt(6);
    setMaterial("wood");
    setWoodType("pt");
    setPostSize("4x4");
    setSlope(false);
    setRocky(false);
    setGatesWalk(0);
    setGatesDouble(0);
  }

  function save(status: Estimate["status"] = "pending") {
    const now = new Date().toISOString();
    const t = title.trim()
      ? title.trim()
      : `${customer.name || "Estimate"} — ${Math.round(totalLf)} LF`;

    const payload: Estimate = {
      id: estimateId,
      createdAt: now,
      updatedAt: now,
      status,
      title: t,
      notes,
      customer,
      segments,
      corners,
      heightFt,
      material,
      woodType,
      postSize,
      slope,
      rocky,
      gatesWalk,
      gatesDouble,
      materialMarkupPct,
      equipmentFee,
      deliveryFee,
      disposalFee,
      totals: {
        totalLf,
        laborHours,
        laborCost,
        materialCost,
        total,
      },
    };

    upsert(payload);
    setActiveId(payload.id);
    alert("Saved.");
  }

  function exportPdf() {
    // basic (works today). Later we can generate a real PDF.
    window.print();
  }

  const stickyH = 74;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: BRAND.bg,
        display: "flex",
        justifyContent: "center",
        padding: 16,
        paddingBottom: `calc(${stickyH}px + env(safe-area-inset-bottom) + 18px)`,
      }}
    >
      <div
        style={{
          width: "min(780px, 96vw)",
          background: "rgba(255,255,255,0.86)",
          borderRadius: 18,
          border: `2px solid ${BRAND.border}`,
          boxShadow: "0 12px 30px rgba(0,0,0,0.15)",
          padding: 18,
          backdropFilter: "blur(6px)",
        }}
      >
        {/* Top row: nav */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* replace with your real public/logo path (e.g. /logo.png) */}
            <img src="/logo.png" alt="Vasseur Fencing" style={{ height: 38, width: "auto" }} />
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.1, color: BRAND.ink }}>
                Vasseur Fencing
              </div>
              <div style={{ marginTop: 2, color: "#6b6b6b", fontSize: 13 }}>
                Custom is our standard.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select
              defaultValue=""
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return;
                window.location.href = v;
              }}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.14)",
                fontWeight: 900,
                background: "rgba(255,255,255,0.92)",
              }}
            >
              <option value="">Navigate…</option>
              <option value="/">Estimator</option>
              <option value="/quotes">Quotes</option>
              <option value="/calendar">Calendar</option>
            </select>

            <Link href="/quotes" style={{ textDecoration: "none" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.14)",
                  fontWeight: 900,
                  background: "rgba(255,255,255,0.92)",
                  color: BRAND.ink,
                }}
              >
                Saved
              </span>
            </Link>
          </div>
        </div>

        {/* Title + quick totals */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: BRAND.ink }}>
            Build an estimate
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{ padding: "6px 10px", borderRadius: 999, background: "rgba(0,0,0,0.06)", fontWeight: 900, fontSize: 12 }}>
              {Math.round(totalLf)} LF
            </span>
            <span style={{ padding: "6px 10px", borderRadius: 999, background: "rgba(0,0,0,0.06)", fontWeight: 900, fontSize: 12 }}>
              {heightFt}'
            </span>
            <span style={{ padding: "6px 10px", borderRadius: 999, background: "rgba(0,0,0,0.06)", fontWeight: 900, fontSize: 12 }}>
              {material.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Customer */}
        <div style={{ marginTop: 12, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(0,0,0,0.10)", borderRadius: 16, padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 900 }}>Customer</div>
              <div style={{ color: "#6b6b6b", fontSize: 13, marginTop: 2 }}>Contact info for the estimate.</div>
            </div>
            <div style={{ padding: "6px 10px", borderRadius: 999, background: "rgba(0,0,0,0.06)", fontWeight: 900, fontSize: 12 }}>
              {customer.name ? customer.name : "Not set"}
            </div>
          </div>

          <div style={{ height: 12 }} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 900, color: "#3a3a3a", marginBottom: 6 }}>Name</div>
              <input value={customer.name} onChange={(e) => setCustomer((p) => ({ ...p, name: e.target.value }))} placeholder="Customer name"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)", outline: "none", fontWeight: 700, background: "rgba(255,255,255,0.92)" }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 900, color: "#3a3a3a", marginBottom: 6 }}>Phone</div>
                <input value={customer.phone} onChange={(e) => setCustomer((p) => ({ ...p, phone: e.target.value }))} placeholder="(231) 260-0635" inputMode="tel"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)", outline: "none", fontWeight: 700, background: "rgba(255,255,255,0.92)" }} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 900, color: "#3a3a3a", marginBottom: 6 }}>Email</div>
                <input value={customer.email} onChange={(e) => setCustomer((p) => ({ ...p, email: e.target.value }))} placeholder="name@email.com" inputMode="email"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)", outline: "none", fontWeight: 700, background: "rgba(255,255,255,0.92)" }} />
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 900, color: "#3a3a3a", marginBottom: 6 }}>Address</div>
              <input value={customer.address} onChange={(e) => setCustomer((p) => ({ ...p, address: e.target.value }))} placeholder="Job site address"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)", outline: "none", fontWeight: 700, background: "rgba(255,255,255,0.92)" }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
              <a
                href={customer.phone ? `tel:${customer.phone.replace(/[^\d+]/g, "")}` : undefined}
                style={{
                  textDecoration: "none",
                  textAlign: "center",
                  padding: "12px 14px",
                  borderRadius: 999,
                  border: "none",
                  background: customer.phone ? BRAND.green : "rgba(0,0,0,0.10)",
                  color: customer.phone ? "white" : "#666",
                  fontWeight: 900,
                  pointerEvents: customer.phone ? "auto" : "none",
                }}
              >
                Call
              </a>

              <a
                href={customer.email ? `mailto:${customer.email}` : undefined}
                style={{
                  textDecoration: "none",
                  textAlign: "center",
                  padding: "12px 14px",
                  borderRadius: 999,
                  border: "none",
                  background: customer.email ? BRAND.amber : "rgba(0,0,0,0.10)",
                  color: customer.email ? "white" : "#666",
                  fontWeight: 900,
                  pointerEvents: customer.email ? "auto" : "none",
                }}
              >
                Email
              </a>
            </div>
          </div>
        </div>

        {/* Measurements */}
        <div style={{ marginTop: 12, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(0,0,0,0.10)", borderRadius: 16, padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div>
              <div style={{ fontWeight: 900 }}>Segments</div>
              <div style={{ color: "#6b6b6b", fontSize: 13, marginTop: 2 }}>Add lines like A–B, B–C, etc.</div>
            </div>
            <button
              type="button"
              onClick={addSegment}
              style={{
                border: "1px solid rgba(0,0,0,0.12)",
                background: "white",
                borderRadius: 999,
                padding: "8px 12px",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              + Add segment
            </button>
          </div>

          <div style={{ height: 10 }} />

          {segments.length === 0 ? (
            <div style={{ color: "#666", fontSize: 13, padding: "6px 2px" }}>
              No segments yet. Click <b>“Add segment”</b> to start.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {segments.map((s, idx) => (
                <div key={s.id}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 44px", gap: 10, alignItems: "center" }}>
                    <input
                      value={s.name}
                      placeholder="Segment (ex: A–B)"
                      onChange={(e) => updateSegment(s.id, { name: e.target.value })}
                      style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)", outline: "none", fontWeight: 800, background: "rgba(255,255,255,0.92)" }}
                    />

                    <input
                      value={Number.isFinite(s.lengthFt) ? String(s.lengthFt) : ""}
                      inputMode="decimal"
                      placeholder="ft"
                      onFocus={(e) => (e.target as HTMLInputElement).select()}
                      onChange={(e) => updateSegment(s.id, { lengthFt: toNumberSafe(e.target.value) })}
                      style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)", outline: "none", fontWeight: 900, textAlign: "right", background: "rgba(255,255,255,0.92)" }}
                    />

                    <button
                      type="button"
                      title="Remove"
                      onClick={() => removeSegment(s.id)}
                      style={{ height: 40, width: 44, borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)", background: "white", cursor: "pointer", fontWeight: 900 }}
                    >
                      ×
                    </button>
                  </div>

                  <div style={{ marginTop: 6, color: "#6b6b6b", fontSize: 12 }}>
                    {idx + 1}. {(s.name || "Unnamed")} — {Number.isFinite(s.lengthFt) ? s.lengthFt : 0} LF
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ height: 12 }} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 900, color: "#3a3a3a", marginBottom: 6 }}>Corners</div>
              <input
                type="number"
                value={corners}
                onFocus={(e) => (e.target as HTMLInputElement).select()}
                onChange={(e) => setCorners(Number(e.target.value || 0))}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)", outline: "none", fontWeight: 900, background: "rgba(255,255,255,0.92)" }}
              />
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 900, color: "#3a3a3a", marginBottom: 6 }}>Height</div>
              <select
                value={String(heightFt)}
                onChange={(e) => setHeightFt(Number(e.target.value))}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)", outline: "none", fontWeight: 900, background: "rgba(255,255,255,0.92)" }}
              >
                <option value="4">4 ft</option>
                <option value="5">5 ft</option>
                <option value="6">6 ft</option>
                <option value="8">8 ft</option>
              </select>
            </div>
          </div>

          <div style={{ height: 12 }} />

          <div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
  }}
>
            <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, border: "1px solid rgba(0,0,0,0.10)", borderRadius: 14, padding: 12, background: "rgba(255,255,255,0.80)" }}>
              <div>
                <div style={{ fontWeight: 900 }}>Slope / steps</div>
                <div style={{ fontSize: 12, color: "#6b6b6b" }}>Labor multiplier</div>
              </div>
              <input type="checkbox" checked={slope} onChange={(e) => setSlope(e.target.checked)} />
            </label>

            <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, border: "1px solid rgba(0,0,0,0.10)", borderRadius: 14, padding: 12, background: "rgba(255,255,255,0.80)" }}>
              <div>
                <div style={{ fontWeight: 900 }}>Rocky soil</div>
                <div style={{ fontSize: 12, color: "#6b6b6b" }}>Adds labor</div>
              </div>
              <input type="checkbox" checked={rocky} onChange={(e) => setRocky(e.target.checked)} />
            </label>
          </div>
        </div>

        {/* Config */}
        <div style={{ marginTop: 12, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(0,0,0,0.10)", borderRadius: 16, padding: 14 }}>
          <div style={{ fontWeight: 900 }}>Fence configuration</div>
          <div style={{ color: "#6b6b6b", fontSize: 13, marginTop: 2 }}>Material, wood type, post size, gates.</div>

          <div style={{ height: 12 }} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 900, color: "#3a3a3a", marginBottom: 6 }}>Material</div>
              <select value={material} onChange={(e) => setMaterial(e.target.value as any)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)", outline: "none", fontWeight: 900, background: "rgba(255,255,255,0.92)" }}>
                <option value="wood">Wood</option>
                <option value="vinyl">Vinyl</option>
                <option value="chain">Chain link</option>
              </select>
            </div>

            {material === "wood" ? (
              <div>
                <div style={{ fontSize: 12, fontWeight: 900, color: "#3a3a3a", marginBottom: 6 }}>Wood type</div>
                <select value={woodType} onChange={(e) => setWoodType(e.target.value as any)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)", outline: "none", fontWeight: 900, background: "rgba(255,255,255,0.92)" }}>
                  <option value="pt">Pressure-treated</option>
                  <option value="cedar">Cedar</option>
                  <option value="cedartone">CedarTone</option>
                </select>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 12, fontWeight: 900, color: "#3a3a3a", marginBottom: 6 }}>Post size</div>
                <select disabled value={postSize}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)", fontWeight: 900, background: "rgba(0,0,0,0.06)" }}>
                  <option value="4x4">4×4</option>
                  <option value="6x6">6×6</option>
                </select>
              </div>
            )}
          </div>

          {material === "wood" ? (
            <>
              <div style={{ height: 12 }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 900, color: "#3a3a3a", marginBottom: 6 }}>Post size</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                  <button type="button" onClick={() => setPostSize("4x4")}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 14,
                      border: "1px solid rgba(0,0,0,0.12)",
                      fontWeight: 900,
                      background: postSize === "4x4" ? BRAND.green : "rgba(255,255,255,0.92)",
                      color: postSize === "4x4" ? "white" : BRAND.ink,
                      cursor: "pointer",
                    }}>
                    4×4
                  </button>

                  <button type="button" onClick={() => setPostSize("6x6")}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 14,
                      border: "1px solid rgba(0,0,0,0.12)",
                      fontWeight: 900,
                      background: postSize === "6x6" ? BRAND.green : "rgba(255,255,255,0.92)",
                      color: postSize === "6x6" ? "white" : BRAND.ink,
                      cursor: "pointer",
                    }}>
                    6×6
                  </button>
                </div>
              </div>
            </>
          ) : null}

          <div style={{ height: 12 }} />

          {/* Gates - keep separate rows so bubbles don't overlap */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 900, color: "#3a3a3a", marginBottom: 6 }}>Walk gates</div>
              <input type="number" value={gatesWalk} onFocus={(e) => (e.target as HTMLInputElement).select()} onChange={(e) => setGatesWalk(Number(e.target.value || 0))}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)", outline: "none", fontWeight: 900, background: "rgba(255,255,255,0.92)" }} />
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 900, color: "#3a3a3a", marginBottom: 6 }}>Double gates</div>
              <input type="number" value={gatesDouble} onFocus={(e) => (e.target as HTMLInputElement).select()} onChange={(e) => setGatesDouble(Number(e.target.value || 0))}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)", outline: "none", fontWeight: 900, background: "rgba(255,255,255,0.92)" }} />
            </div>
          </div>
        </div>

        {/* Totals */}
        <div style={{ marginTop: 12, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(0,0,0,0.10)", borderRadius: 16, padding: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
            <div style={{ color: "#444", fontWeight: 800 }}>Labor hours</div>
            <div style={{ fontWeight: 900 }}>{laborHours.toFixed(1)}</div>

            <div style={{ color: "#444", fontWeight: 800 }}>Labor cost</div>
            <div style={{ fontWeight: 900 }}>{fmtMoney(laborCost)}</div>

            <div style={{ color: "#444", fontWeight: 800 }}>Material cost</div>
            <div style={{ fontWeight: 900 }}>{fmtMoney(materialCost)}</div>

            <div style={{ color: "#444", fontWeight: 800 }}>Equipment</div>
            <div style={{ fontWeight: 900 }}>{fmtMoney(equipmentFee)}</div>

            <div style={{ color: "#444", fontWeight: 800 }}>Delivery</div>
            <div style={{ fontWeight: 900 }}>{fmtMoney(deliveryFee)}</div>

            <div style={{ color: "#444", fontWeight: 800 }}>Disposal</div>
            <div style={{ fontWeight: 900 }}>{fmtMoney(disposalFee)}</div>

            <div style={{ color: "#222", fontWeight: 1000, marginTop: 6 }}>Total</div>
            <div style={{ fontWeight: 1000, marginTop: 6 }}>{fmtMoney(total)}</div>
          </div>

          <div style={{ height: 10 }} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
            <button type="button" onClick={exportPdf}
              style={{ width: "100%", padding: "12px 14px", borderRadius: 999, border: "1px solid rgba(0,0,0,0.14)", background: "rgba(255,255,255,0.92)", fontWeight: 1000, cursor: "pointer" }}>
              Export PDF (print)
            </button>

            <a
              href={customer.phone ? `sms:${customer.phone.replace(/[^\d+]/g, "")}?&body=${encodeURIComponent(`Vasseur Fencing estimate: ${fmtMoney(total)}`)}` : undefined}
              style={{
                textDecoration: "none",
                textAlign: "center",
                padding: "12px 14px",
                borderRadius: 999,
                border: "none",
                background: customer.phone ? BRAND.amber : "rgba(0,0,0,0.10)",
                color: customer.phone ? "white" : "#666",
                fontWeight: 1000,
                pointerEvents: customer.phone ? "auto" : "none",
              }}
            >
              Text total
            </a>
          </div>
        </div>
      </div>

      {/* FIXED ACTION BAR */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          display: "flex",
          justifyContent: "center",
          padding: `8px 10px calc(env(safe-area-inset-bottom) + 8px)`,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: "min(780px, 96vw)",
            background: "rgba(255,255,255,0.96)",
            border: `2px solid ${BRAND.border}`,
            boxShadow: "0 -8px 20px rgba(0,0,0,0.14)",
            borderRadius: 14,
            padding: "8px 10px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 8,
            pointerEvents: "auto",
          }}
        >
          <button
            type="button"
            onClick={() => save("pending")}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 999,
              border: "none",
              background: BRAND.green,
              color: "white",
              fontWeight: 1000,
              cursor: "pointer",
            }}
          >
            Save
          </button>

          <button
            type="button"
            onClick={() => {
              // Save as new
              const newId = uid("est");
              setEstimateIdState(newId);
              setActiveId(newId);
              save("pending");
            }}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 999,
              border: "none",
              background: BRAND.amber,
              color: "white",
              fontWeight: 1000,
              cursor: "pointer",
            }}
          >
            Save as new
          </button>

          <button
            type="button"
            onClick={() => newEstimate(false)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 999,
              border: "1px solid rgba(0,0,0,0.14)",
              background: "rgba(255,255,255,0.90)",
              fontWeight: 1000,
              cursor: "pointer",
            }}
          >
            New / reset
          </button>
        </div>
      </div>
    </div>
  );
}
