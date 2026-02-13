// lib/estimatestore.ts
// Simple localStorage-backed store for Estimates ("quotes").
// No server keys yet; later you can swap the implementation to your backend.

export type QuoteStatus = "pending" | "sold" | "void";

export type Segment = { id: string; name: string; lengthFt: number };

export type Customer = {
  name: string;
  phone: string;
  email: string;
  address: string;
};

export type Estimate = {
  id: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  status: QuoteStatus;

  // Display fields
  title: string; // e.g. "Smith — 164 LF"
  notes: string;

  customer: Customer;

  // Inputs
  segments: Segment[];
  corners: number;
  heightFt: number;
  material: "wood" | "vinyl" | "chain";
  woodType: "pt" | "cedar" | "cedartone";
  postSize: "4x4" | "6x6";
  slope: boolean;
  rocky: boolean;
  gatesWalk: number;
  gatesDouble: number;

  // Pricing config (lightweight)
  materialMarkupPct: number; // 0.2 => +20%
  equipmentFee: number;
  deliveryFee: number;
  disposalFee: number;

  // Output snapshot
  totals: {
    totalLf: number;
    laborHours: number;
    laborCost: number;
    materialCost: number;
    total: number;
  };
};

const KEY = "vasseur_estimates_v1";
const ACTIVE_KEY = "vasseur_active_estimate_id_v1";

function safeParse<T>(s: string | null, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export function uid(prefix = "q") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

export function loadAll(): Estimate[] {
  if (typeof window === "undefined") return [];
  return safeParse<Estimate[]>(localStorage.getItem(KEY), []);
}

export function saveAll(items: Estimate[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function upsert(est: Estimate) {
  const all = loadAll();
  const idx = all.findIndex((x) => x.id === est.id);
  if (idx >= 0) all[idx] = est;
  else all.unshift(est);
  saveAll(all);
}

export function remove(id: string) {
  const all = loadAll().filter((x) => x.id !== id);
  saveAll(all);
  const active = getActiveId();
  if (active === id) setActiveId("");
}

export function getById(id: string): Estimate | null {
  const all = loadAll();
  return all.find((x) => x.id === id) || null;
}

export function setActiveId(id: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_KEY, id);
}

export function getActiveId(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(ACTIVE_KEY) || "";
}

export function statusColor(status: QuoteStatus) {
  // used for hue/background in Quotes + Calendar
  if (status === "sold") return { bg: "rgba(84, 107, 60, 0.15)", border: "#546B3C", text: "#2F3E1E" };
  if (status === "void") return { bg: "rgba(200, 60, 60, 0.14)", border: "#C83C3C", text: "#6B1E1E" };
  return { bg: "rgba(181, 123, 42, 0.14)", border: "#B57B2A", text: "#6B4A1A" };
}