"use client";

import React, { useState, useMemo } from "react";
import {
  MapPin,
  Phone,
  Clock,
  Search,
  ChefHat,
  Building2,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Info,
} from "lucide-react";

export interface BranchStore {
  _id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  openingHours?: string;
  isActive: boolean;
  qrCodePayload?: string;
}

interface StoreLandingViewProps {
  branches: BranchStore[];
  loading: boolean;
  onSelectStore: (store: BranchStore) => void;
}

export default function StoreLandingView({
  branches,
  loading,
  onSelectStore,
}: StoreLandingViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "open">("all");

  const filteredBranches = useMemo(() => {
    let list = branches;
    if (filterMode === "open") {
      list = list.filter((b) => b.isActive);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          (b.address && b.address.toLowerCase().includes(q)) ||
          (b.code && b.code.toLowerCase().includes(q))
      );
    }
    return list;
  }, [branches, filterMode, searchQuery]);

  return (
    <div className="min-h-screen bg-brand-bg text-neutral-900 font-sans select-none flex flex-col">
      {/* ── HEADER NAVIGATION ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 px-4 sm:px-6 py-3 flex items-center justify-between shadow-sm">
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-brand-primary rounded-xl flex items-center justify-center text-white shadow-md shadow-brand-primary/25 flex-shrink-0">
            <ChefHat size={18} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display font-medium text-[15px] text-neutral-800 tracking-tight">
              Chicken
            </span>
            <span className="font-display font-medium text-[10px] text-brand-primary tracking-[0.2em] mt-0.5">
              DELIGHT
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 bg-orange-50/60 border border-orange-100 px-3.5 py-1.5 rounded-xl text-xs text-neutral-700 font-medium">
          <Sparkles size={14} className="text-brand-primary animate-pulse" />
          <span>Select your nearest branch to view menu & order</span>
        </div>
      </header>

      {/* ── HERO BANNER ── */}
      <section className="bg-white border-b border-neutral-200 px-4 sm:px-6 py-10 sm:py-14">
        <div className="max-w-4xl mx-auto text-center space-y-3.5">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200/60 text-brand-primary text-xs font-bold uppercase tracking-wider">
            <Building2 size={13} />
            <span>Find Nearby Locations</span>
          </span>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-neutral-900 leading-tight">
            Order Fresh & Hot Meals From <span className="text-brand-primary">Chicken Delight</span> Near You
          </h1>

          <p className="text-xs sm:text-sm text-neutral-500 max-w-xl mx-auto leading-relaxed">
            Choose a location below to view branch-exclusive categories, daily specials, and place your delivery or pickup order.
          </p>

          {/* Search & Filter Bar */}
          <div className="max-w-xl mx-auto pt-3 flex flex-col sm:flex-row items-center gap-2.5">
            <div className="relative flex-1 w-full">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search store name, address, or branch code..."
                className="w-full bg-neutral-50 border border-neutral-200 focus:border-brand-primary focus:bg-white rounded-xl py-2.5 pl-10 pr-4 text-xs sm:text-sm text-neutral-800 placeholder-neutral-400 outline-none transition-all"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-xl border border-neutral-200/60 shrink-0">
              <button
                type="button"
                onClick={() => setFilterMode("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterMode === "all"
                    ? "bg-brand-primary text-white shadow-sm"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                All Stores ({branches.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("open")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterMode === "open"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                Open Now
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── STORES GRID SECTION ── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-200/80 mb-6">
          <div>
            <h2 className="text-sm sm:text-base font-black text-neutral-900 leading-snug">
              Available Restaurant Branches
            </h2>
            <p className="text-[11px] text-neutral-500 mt-0.5 font-medium">
              Showing {filteredBranches.length} stores ready for delivery & pickup
            </p>
          </div>
        </div>

        {loading ? (
          /* Loading Skeletons */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-white border border-neutral-200/80 rounded-2xl p-4 space-y-4 animate-pulse"
              >
                <div className="h-40 bg-neutral-100 rounded-xl" />
                <div className="h-4 bg-neutral-100 w-3/4 rounded-md" />
                <div className="h-3 bg-neutral-100/70 w-full rounded-md" />
                <div className="h-10 bg-neutral-100 rounded-xl" />
              </div>
            ))}
          </div>
        ) : filteredBranches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredBranches.map((branch, index) => {
              const isOpen = branch.isActive;
              const facadeImages = [
                "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600&auto=format&fit=crop&q=80",
              ];
              const cardImg = facadeImages[index % facadeImages.length];

              return (
                <div
                  key={branch._id}
                  className="group bg-white border border-neutral-200/80 hover:border-neutral-300 rounded-2xl overflow-hidden shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between"
                >
                  {/* Top Image Banner */}
                  <div className="relative h-40 w-full bg-neutral-100 overflow-hidden">
                    <img
                      src={cardImg}
                      alt={branch.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                    {/* Status Badge */}
                    <div className="absolute top-3 left-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider backdrop-blur-md shadow-sm border ${
                          isOpen
                            ? "bg-emerald-50/90 text-emerald-700 border-emerald-200"
                            : "bg-red-50/90 text-red-700 border-red-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isOpen ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                          }`}
                        />
                        {isOpen ? "Open Now" : "Closed"}
                      </span>
                    </div>

                    {/* Branch Code Badge */}
                    <div className="absolute top-3 right-3 bg-neutral-900/80 backdrop-blur-md text-white text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-md">
                      CODE: {branch.code || "STORE"}
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3.5">
                    <div>
                      <h3 className="text-sm font-black text-neutral-800 group-hover:text-brand-primary transition-colors leading-snug">
                        {branch.name}
                      </h3>

                      <div className="mt-2 space-y-1.5 text-[11px] text-neutral-600 font-medium">
                        <p className="flex items-start gap-1.5 leading-relaxed">
                          <MapPin size={13} className="text-brand-primary shrink-0 mt-0.5" />
                          <span>{branch.address || "Main City Center, AB"}</span>
                        </p>

                        {branch.phone && (
                          <p className="flex items-center gap-1.5">
                            <Phone size={13} className="text-neutral-400 shrink-0" />
                            <span>{branch.phone}</span>
                          </p>
                        )}

                        <p className="flex items-center gap-1.5 text-[10.5px] text-neutral-500">
                          <Clock size={12} className="text-neutral-400 shrink-0" />
                          <span>{branch.openingHours || "11:00 AM - 10:00 PM"}</span>
                        </p>
                      </div>
                    </div>

                    {/* Quick Specs */}
                    {/* <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-neutral-100 text-[10.5px]">
                      <div className="bg-neutral-50 p-2 rounded-xl border border-neutral-200/50 text-center">
                        <span className="text-neutral-400 block text-[8.5px] uppercase font-bold tracking-wider">Est. Delivery</span>
                        <span className="text-neutral-800 font-bold">30 - 45 mins</span>
                      </div>
                      <div className="bg-neutral-50 p-2 rounded-xl border border-neutral-200/50 text-center">
                        <span className="text-neutral-400 block text-[8.5px] uppercase font-bold tracking-wider">Min. Order</span>
                        <span className="text-neutral-800 font-bold">$15.00</span>
                      </div>
                    </div> */}

                    {/* Action Button */}
                    <button
                      type="button"
                      onClick={() => onSelectStore(branch)}
                      className="w-full py-2.5 px-4 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold shadow-md shadow-brand-primary/10 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>ORDER ONLINE</span>
                      <ArrowRight size={13} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty Search View */
          <div className="flex flex-col items-center justify-center p-12 bg-white border border-dashed border-neutral-300/80 rounded-2xl text-center space-y-2">
            <AlertCircle size={28} className="text-neutral-400" />
            <h4 className="text-xs font-bold text-neutral-700">
              No restaurant branches found
            </h4>
            <p className="text-[11px] text-neutral-400 max-w-sm">
              We couldn&apos;t find any stores matching &ldquo;{searchQuery}&rdquo;. Try adjusting your search query.
            </p>
          </div>
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-neutral-200/80 bg-white py-5 text-center text-xs text-neutral-500 font-medium">
        <p>© 2026 Chicken Delight. All rights reserved. Powered by RMS Platform.</p>
      </footer>
    </div>
  );
}
