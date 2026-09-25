"use client";

import React, { useState, useEffect, useMemo } from "react";
import { X, Plus, Minus, Check, MessageSquare, ChefHat } from "lucide-react";
import {
  MenuItem,
  ModifierGroup,
  ModifierOption,
  SelectedModifier,
} from "../types";
import { useCart } from "../context/CartContext";

import { CartItem } from "../types";

interface ModifierModalProps {
  item: MenuItem | null;
  editingCartItem?: CartItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ModifierModal({
  item,
  editingCartItem,
  isOpen,
  onClose,
}: ModifierModalProps) {
  const { addToCart, updateCartItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selections, setSelections] = useState<
    Record<string, ModifierOption[]>
  >({});
  const [activeIdx, setActiveIdx] = useState(0);
  const [note, setNote] = useState("");

  // Reset/Initialize default selections when item opens
  useEffect(() => {
    if (!item) return;
    setActiveIdx(0);

    if (editingCartItem) {
      setQuantity(editingCartItem.quantity || 1);
      setNote(editingCartItem.note || "");

      const init: Record<string, ModifierOption[]> = {};
      const allGroups: ModifierGroup[] = [];
      const collect = (groups?: ModifierGroup[]) => {
        groups?.forEach((g) => {
          allGroups.push(g);
          g.options?.forEach((o) => {
            if (o.modifierGroups) collect(o.modifierGroups);
          });
        });
      };
      collect(item.modifierGroups);

      editingCartItem.selectedModifiers?.forEach((sm) => {
        const group = allGroups.find(
          (g) => g.id === sm.groupId || g.name === sm.groupName,
        );
        if (group) {
          const opt = group.options?.find(
            (o) => o.id === sm.optionId || o.name === sm.optionName,
          );
          if (opt) {
            if (!init[group.id]) init[group.id] = [];
            const count = sm.quantity || 1;
            for (let i = 0; i < count; i++) {
              init[group.id].push(opt);
            }
          }
        }
      });
      setSelections(init);
    } else {
      setQuantity(1);
      setNote("");

      const init: Record<string, ModifierOption[]> = {};
      const initGroup = (g: ModifierGroup) => {
        if (!g || !g.options) return;
        const defs = g.options.filter((o) => o.isDefault);
        const selected =
          defs.length > 0
            ? defs
            : g.required && g.maxSelection === 1 && g.options.length > 0
              ? [g.options[0]]
              : [];
        init[g.id] = selected;

        // Recurse nested groups
        selected.forEach((opt) => {
          if (opt.modifierGroups) {
            opt.modifierGroups.forEach(initGroup);
          }
        });
      };

      item.modifierGroups?.forEach(initGroup);
      setSelections(init);
    }
  }, [item, editingCartItem, isOpen]);

  // Auto-scroll active tab into view
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      const activeTabEl = document.getElementById(`mod-tab-${activeIdx}`);
      if (activeTabEl) {
        activeTabEl.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [activeIdx, isOpen]);

  // Lock background scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const activeGroup = useMemo(
    () => item?.modifierGroups?.[activeIdx] ?? null,
    [item, activeIdx],
  );

  // Recursively collect all active modifier groups (including nested groups for selected options)
  const allActiveGroups = useMemo(() => {
    if (!item || !item.modifierGroups) return [];
    const result: ModifierGroup[] = [];
    const visited = new Set<string>();

    const collect = (groups: ModifierGroup[]) => {
      groups.forEach((g) => {
        if (!g || visited.has(g.id)) return;
        visited.add(g.id);
        result.push(g);

        const selectedOpts = selections[g.id] ?? [];
        selectedOpts.forEach((opt) => {
          if (opt.modifierGroups && opt.modifierGroups.length > 0) {
            collect(opt.modifierGroups);
          }
        });
      });
    };

    collect(item.modifierGroups);
    return result;
  }, [item, selections]);

  if (!isOpen || !item) return null;

  const toggleOption = (g: ModifierGroup, opt: ModifierOption) => {
    const cur = selections[g.id] ?? [];
    const has = cur.some((o) => o.id === opt.id);
    let next: ModifierOption[];

    if (g.maxSelection === 1) {
      next = has && !g.required ? [] : [opt];
    } else if (has) {
      next = cur.filter((o) => o.id !== opt.id);
    } else if (cur.length < g.maxSelection) {
      next = [...cur, opt];
    } else {
      return; // Reached limit
    }

    const newSelections = { ...selections, [g.id]: next };

    // Initialize defaults for sub-groups of newly selected options
    const initNested = (o: ModifierOption) => {
      if (o.modifierGroups) {
        o.modifierGroups.forEach((subG) => {
          if (newSelections[subG.id] === undefined) {
            const defs = subG.options.filter((so) => so.isDefault);
            newSelections[subG.id] =
              defs.length > 0
                ? defs
                : subG.required &&
                    subG.maxSelection === 1 &&
                    subG.options.length > 0
                  ? [subG.options[0]]
                  : [];
            newSelections[subG.id].forEach(initNested);
          }
        });
      }
    };

    next.forEach(initNested);
    setSelections(newSelections);
  };

  const handleIncrementCounter = (g: ModifierGroup, opt: ModifierOption) => {
    const cur = selections[g.id] ?? [];
    if (cur.length < g.maxSelection) {
      const next = [...cur, opt];
      const newSelections = { ...selections, [g.id]: next };

      const initNested = (o: ModifierOption) => {
        if (o.modifierGroups) {
          o.modifierGroups.forEach((subG) => {
            if (newSelections[subG.id] === undefined) {
              const defs = subG.options.filter((so) => so.isDefault);
              newSelections[subG.id] =
                defs.length > 0
                  ? defs
                  : subG.required &&
                      subG.maxSelection === 1 &&
                      subG.options.length > 0
                    ? [subG.options[0]]
                    : [];
              newSelections[subG.id].forEach(initNested);
            }
          });
        }
      };

      initNested(opt);
      setSelections(newSelections);
    }
  };

  const handleDecrementCounter = (g: ModifierGroup, opt: ModifierOption) => {
    const cur = selections[g.id] ?? [];
    const idx = cur.findLastIndex((o) => o.id === opt.id);
    if (idx !== -1) {
      const next = [...cur];
      next.splice(idx, 1);
      setSelections({ ...selections, [g.id]: next });
    }
  };

  const isSelected = (groupId: string, optionId: string) =>
    (selections[groupId] ?? []).some((o) => o.id === optionId);

  // Validate selections against min/max constraints
  const isValid = () =>
    allActiveGroups.every((g) => {
      const count = (selections[g.id] ?? []).length;
      return count >= g.minSelection && count <= g.maxSelection;
    });

  const getLivePrice = () => {
    let modSum = 0;
    allActiveGroups.forEach((g) => {
      const selectedOpts = selections[g.id] ?? [];
      selectedOpts.forEach((o) => {
        modSum += o.price;
      });
    });
    return (item.price + modSum) * quantity;
  };

  const handleAddToCart = () => {
    if (!isValid()) return;

    const parentMap = new Map<string, { parentOptId: string; parentOptName: string }>();
    const collectParents = (groups: ModifierGroup[], parentOpt?: ModifierOption) => {
      groups.forEach((g) => {
        if (!g) return;
        if (parentOpt) {
          parentMap.set(g.id, { parentOptId: parentOpt.id, parentOptName: parentOpt.name });
        }
        const selectedOpts = selections[g.id] ?? [];
        selectedOpts.forEach((opt) => {
          if (opt.modifierGroups && opt.modifierGroups.length > 0) {
            collectParents(opt.modifierGroups, opt);
          }
        });
      });
    };
    if (item.modifierGroups) collectParents(item.modifierGroups);

    const selectedMods: SelectedModifier[] = [];

    allActiveGroups.forEach((g) => {
      const isRoot = item.modifierGroups?.some((rg) => rg.id === g.id) ?? false;
      const opts = selections[g.id] ?? [];

      const counts = opts.reduce((acc, o) => {
        acc[o.id] = (acc[o.id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const uniqueOpts = Array.from(
        new Set(opts.map((o) => o.id))
      ).map((id) => opts.find((o) => o.id === id)!);

      const parentInfo = parentMap.get(g.id);

      uniqueOpts.forEach((o) => {
        selectedMods.push({
          groupId: g.id,
          groupName: g.name,
          optionId: o.id,
          optionName: o.name,
          price: o.price,
          quantity: counts[o.id],
          isRoot,
          parentOptionId: parentInfo?.parentOptId,
          parentOptionName: parentInfo?.parentOptName,
        });
      });
    });

    if (editingCartItem) {
      updateCartItem(editingCartItem.id, item, selectedMods, quantity, note);
    } else {
      addToCart(item, selectedMods, quantity, note);
    }
    onClose();
  };

  // Render a modifier group recursively
  const renderModifierGroup = (g: ModifierGroup, pathName: string = "") => {
    const isRoot = item.modifierGroups?.some((rg) => rg.id === g.id);
    const displayName = pathName ? `${pathName} › ${g.name}` : g.name;
    const selectedCount = (selections[g.id] ?? []).length;

    return (
      <div
        key={g.id}
        className={`space-y-3.5 ${
          !isRoot
            ? "mt-4 p-3.5 rounded-xl border border-dashed border-orange-200 bg-orange-50/5 pl-4 border-l-4 border-l-brand-primary"
            : ""
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-1.5 border-b border-neutral-100">
          <div>
            <h4
              className={`font-bold tracking-wide ${
                isRoot
                  ? "text-xs text-neutral-800"
                  : "text-xs text-brand-primary"
              }`}
            >
              {displayName}
              {g.required && (
                <span className="text-red-500 ml-1 font-bold">*</span>
              )}
            </h4>
            <p className="text-[10px] text-neutral-400 font-medium mt-0.5">
              {g.required ? `Select at least ${g.minSelection}` : "Optional"}
              {g.maxSelection > 1 ? ` (Max ${g.maxSelection})` : ""}
            </p>
          </div>
          <span className="text-[10px] font-bold text-neutral-500 bg-neutral-100 px-2.5 py-0.5 rounded-full">
            {selectedCount} / {g.maxSelection}
          </span>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {g.displayType === "counter" ? (
            g.options.map((opt) => {
              const groupOpts = selections[g.id] ?? [];
              const count = groupOpts.filter((o) => o.id === opt.id).length;
              const totalGroupCount = groupOpts.length;
              const canAdd = totalGroupCount < g.maxSelection;
              const canRemove = count > 0;

              return (
                <div
                  key={opt.id}
                  className={`flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border text-left transition-all ${
                    count > 0
                      ? "border-brand-primary/80 bg-brand-primary/[0.04] ring-1 ring-brand-primary/30"
                      : "border-neutral-200/80 bg-white hover:bg-neutral-50/80 shadow-2xs"
                  }`}
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 pr-2">
                    {(opt.image || item.image) && (
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200/60 flex-shrink-0 shadow-2xs">
                        <img
                          src={
                            opt.image ||
                            item.image ||
                            "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=150&auto=format&fit=crop&q=60"
                          }
                          alt={opt.name}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=150&auto=format&fit=crop&q=60";
                          }}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] sm:text-xs font-bold text-neutral-800 truncate">
                        {opt.name}
                      </p>
                      {opt.price > 0 && (
                        <p className="text-[10.5px] font-black text-brand-primary mt-0.5">
                          +${opt.price.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Counter Controls */}
                  <div className="flex items-center gap-1.5 sm:gap-2 bg-white border border-neutral-200 rounded-xl p-1 flex-shrink-0 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => handleDecrementCounter(g, opt)}
                      disabled={!canRemove}
                      className={`w-6.5 h-6.5 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                        canRemove
                          ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-800 active:scale-90"
                          : "bg-neutral-50 text-neutral-300 cursor-not-allowed"
                      }`}
                    >
                      <Minus size={11} strokeWidth={2.5} />
                    </button>
                    <span className="w-4 text-center text-xs font-black text-neutral-900">
                      {count}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleIncrementCounter(g, opt)}
                      disabled={!canAdd}
                      className={`w-6.5 h-6.5 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                        canAdd
                          ? "bg-brand-primary hover:bg-brand-primary-hover text-white active:scale-90 shadow-xs"
                          : "bg-neutral-100 text-neutral-300 cursor-not-allowed"
                      }`}
                    >
                      <Plus size={11} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            g.options.map((opt) => {
              const sel = isSelected(g.id, opt.id);
              const isCard = g.displayType === "card";
              return (
                <div key={opt.id} className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => toggleOption(g, opt)}
                    className={`relative flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border text-left transition-all cursor-pointer active:scale-[0.99] w-full ${
                      sel
                        ? "border-brand-primary/80 bg-brand-primary/[0.04] shadow-2xs ring-1 ring-brand-primary/30"
                        : "border-neutral-200/80 bg-white hover:bg-neutral-50/80 shadow-2xs"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 pr-2">
                      {/* Checkbox / Radio Circle */}
                      <div
                        className={`w-4.5 h-4.5 border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          g.maxSelection === 1 ? "rounded-full" : "rounded-md"
                        } ${
                          sel
                            ? "bg-brand-primary border-brand-primary text-white scale-105"
                            : "border-neutral-300 bg-white"
                        }`}
                      >
                        {sel && <Check size={11} strokeWidth={3.5} />}
                      </div>

                      {/* Thumbnail Image */}
                      {(isCard || !!opt.image) && (
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200/60 flex-shrink-0 shadow-2xs">
                          <img
                            src={
                              opt.image ||
                              item.image ||
                              "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=150&auto=format&fit=crop&q=60"
                            }
                            alt={opt.name}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=150&auto=format&fit=crop&q=60";
                            }}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {/* Name */}
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-[12px] sm:text-xs font-bold leading-tight truncate ${
                            sel ? "text-neutral-900 font-extrabold" : "text-neutral-800"
                          }`}
                        >
                          {opt.name}
                        </p>
                      </div>
                    </div>

                    {/* Price Tag Pill on Right */}
                    {opt.price > 0 && (
                      <span
                        className={`text-[10.5px] font-black px-2.5 py-0.5 rounded-full flex-shrink-0 transition-colors ${
                          sel
                            ? "bg-brand-primary text-white"
                            : "bg-neutral-100 text-brand-primary border border-neutral-200/60"
                        }`}
                      >
                        +${opt.price.toFixed(2)}
                      </span>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Nested Modifier Groups */}
        {g.options.map((opt) => {
          const sel = isSelected(g.id, opt.id);
          if (sel && opt.modifierGroups && opt.modifierGroups.length > 0) {
            return (
              <div key={`child-of-${opt.id}`} className="space-y-3.5 pl-2">
                {opt.modifierGroups.map((childG) =>
                  renderModifierGroup(
                    childG,
                    isRoot ? opt.name : `${pathName} › ${opt.name}`,
                  ),
                )}
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:justify-end select-none">
      {/* Backdrop with backdrop-blur */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-md animate-fade-in"
      />

      {/* 
        Responsive Drawer Shell
        - Mobile: Slides up from bottom, rounded-t-[28px], h-[90vh], w-full
        - Desktop: Slides from right, rounded-l-2xl, h-full, max-w-[46rem]
      */}
      <div className="relative w-full md:max-w-[46rem] md:h-full bg-white rounded-t-[28px] md:rounded-t-none md:rounded-l-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row z-10 h-[90vh] animate-slide-up-mobile md:animate-drawer-slide-in">
        
        {/* Mobile Drag Handle Bar */}
        <div className="md:hidden w-12 h-1.5 bg-neutral-300 rounded-full mx-auto my-2.5 flex-shrink-0" />

        {/* LEFT COLUMN: Customizer Options */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden min-h-0">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-100 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8.5 h-8.5 bg-orange-50/80 border border-orange-100/60 rounded-xl flex items-center justify-center shadow-2xs">
                <ChefHat size={16} className="text-brand-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[9.5px] font-black text-neutral-400 uppercase tracking-widest leading-none">
                  {editingCartItem ? "Edit Customization" : "Customize Meal"}
                </p>
                <h3 className="text-sm font-black text-neutral-900 leading-tight mt-1 truncate max-w-[200px] sm:max-w-sm">
                  {item.name}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="text-[10px] font-black text-neutral-500 bg-neutral-100/80 px-2.5 py-1 rounded-lg border border-neutral-200/50">
                Group {activeIdx + 1} of {item.modifierGroups?.length ?? 1}
              </span>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700 transition-all cursor-pointer active:scale-90"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Modifier Tabs Indicator (Horizontal Scrollable list) */}
          {item.modifierGroups && item.modifierGroups.length > 0 && (
            <div className="flex overflow-x-auto no-scrollbar gap-2 px-5 py-2.5 border-b border-neutral-100/70 bg-neutral-50/70 flex-shrink-0 scroll-smooth">
              {item.modifierGroups.map((g, i) => {
                const active = i === activeIdx;
                const count = (selections[g.id] ?? []).length;
                return (
                  <button
                    key={g.id}
                    id={`mod-tab-${i}`}
                    onClick={() => setActiveIdx(i)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-[10.5px] font-extrabold transition-all cursor-pointer active:scale-95 ${
                      active
                        ? "bg-brand-primary border-brand-primary text-white shadow-md shadow-brand-primary/15 scale-[1.02]"
                        : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                    }`}
                  >
                    {g.name}
                    {count > 0 ? (
                      <span
                        className={`text-[8px] px-1.5 py-0.5 rounded-full font-black ${
                          active
                            ? "bg-white/20 text-white"
                            : "bg-brand-primary/10 text-brand-primary"
                        }`}
                      >
                        {count}
                      </span>
                    ) : (
                      g.required && (
                        <span className="text-red-500 ml-0.5 font-bold">*</span>
                      )
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Options Scrollable Panel */}
          <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0 space-y-4">
            {activeGroup ? (
              renderModifierGroup(activeGroup)
            ) : (
              <div className="flex items-center justify-center h-32 text-neutral-400 text-[10px] italic">
                No configurations required for this product.
              </div>
            )}

            {/* Note Area (Displayed below selections directly on mobile to save vertical scrolling) */}
            {activeIdx === (item.modifierGroups?.length ?? 1) - 1 && (
              <div className="md:hidden pt-4 border-t border-neutral-100 animate-fade-in">
                <label className="flex items-center gap-1.5 text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                  <MessageSquare size={10} />
                  Special Notes (Optional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="E.g. Sauce on the side, no onions..."
                  rows={2}
                  className="w-full bg-white border border-neutral-200 rounded-xl p-2.5 text-xs text-neutral-700 placeholder-neutral-400 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 resize-none transition-all"
                />
              </div>
            )}
          </div>

          {/* Navigation Tab Actions (Mobile inline pagination) */}
          {item.modifierGroups && item.modifierGroups.length > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-100 flex-shrink-0 bg-neutral-50/20 md:hidden">
              <button
                onClick={() => setActiveIdx(Math.max(0, activeIdx - 1))}
                disabled={activeIdx === 0}
                className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                  activeIdx === 0
                    ? "border-neutral-100 bg-neutral-50 text-neutral-300 cursor-not-allowed"
                    : "border-neutral-200 bg-white text-neutral-600 active:scale-95"
                }`}
              >
                Previous
              </button>
              <span className="text-[10px] font-bold text-neutral-400">
                Step {activeIdx + 1} of {item.modifierGroups.length}
              </span>
              <button
                onClick={() =>
                  setActiveIdx(
                    Math.min(
                      (item.modifierGroups?.length ?? 1) - 1,
                      activeIdx + 1,
                    ),
                  )
                }
                disabled={activeIdx === (item.modifierGroups?.length ?? 1) - 1}
                className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                  activeIdx === (item.modifierGroups?.length ?? 1) - 1
                    ? "border-neutral-100 bg-neutral-50 text-neutral-300 cursor-not-allowed"
                    : "border-neutral-200 bg-white text-neutral-600 active:scale-95"
                }`}
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* 
          RIGHT COLUMN: Selection Summary (Only displayed on Desktop)
          On mobile, we hide this column and integrate the Note and Quantity selectors directly 
          into a clean bottom drawer bar.
        */}
        <div className="hidden md:flex md:w-[35%] flex-col bg-neutral-50 p-5 justify-between overflow-hidden border-l border-neutral-200/50 flex-shrink-0">
          <div className="flex-1 flex flex-col min-h-0 space-y-4 mb-4">
            {/* Base Item description */}
            <div className="pb-3 border-b border-neutral-200 flex-shrink-0 flex gap-2.5">
              {item.image && (
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-white border border-neutral-200/60 flex-shrink-0">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="min-w-0">
                <h4 className="text-[11px] font-bold text-neutral-800 leading-none truncate">
                  {item.name}
                </h4>
                <p className="text-[10px] font-semibold text-brand-primary mt-1.5">
                  Base Price: ${item.price.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Summary details */}
            <div className="flex-1 overflow-y-auto min-h-0 space-y-3.5 pr-0.5 no-scrollbar">
              <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest sticky top-0 bg-neutral-50 pb-1 flex items-center justify-between">
                <span>Selections</span>
                <span className="bg-brand-primary-light text-brand-primary px-2 py-0.5 rounded-full text-[8.5px] font-extrabold border border-brand-primary/15">
                  {allActiveGroups.reduce(
                    (acc, g) => acc + (selections[g.id] ?? []).length,
                    0,
                  )}
                </span>
              </p>

              {allActiveGroups.map((g) => {
                const opts = selections[g.id] ?? [];
                if (!opts.length) return null;
                const counts = opts.reduce((acc, o) => {
                  acc[o.id] = (acc[o.id] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>);

                const uniqueOpts = Array.from(
                  new Set(opts.map((o) => o.id))
                ).map((id) => opts.find((o) => o.id === id)!);

                return (
                  <div key={g.id} className="space-y-1">
                    <p className="text-[8.5px] font-bold text-neutral-400 uppercase tracking-wider">
                      {g.name}
                    </p>
                    {uniqueOpts.map((o) => {
                      const qty = counts[o.id];
                      return (
                        <div
                          key={o.id}
                          className="flex items-center gap-1.5 text-brand-primary pl-1 text-[11px]"
                        >
                          <span className="font-bold">✓</span>
                          <span className="text-neutral-700 font-medium">
                            {o.name} {qty > 1 ? `(x${qty})` : ""}
                          </span>
                          {o.price > 0 && (
                            <span className="text-[9.5px] text-neutral-400 ml-auto">
                              +${(o.price * qty).toFixed(2)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {allActiveGroups.reduce(
                (acc, g) => acc + (selections[g.id] ?? []).length,
                0,
              ) === 0 && (
                <p className="text-[10px] text-neutral-400 italic">
                  No customization chosen yet.
                </p>
              )}
            </div>
          </div>

          {/* Desktop Instruction input and controls */}
          <div className="space-y-3.5 border-t border-neutral-200/80 pt-3.5 flex-shrink-0">
            <div>
              <label className="flex items-center gap-1 text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                <MessageSquare size={10} />
                Special Instructions
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="E.g. No onions, sauce on the side..."
                rows={2}
                className="w-full bg-white border border-neutral-200 rounded-lg p-2 text-xs text-neutral-700 placeholder-neutral-400 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 resize-none transition-all"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold text-neutral-600">
                Quantity
              </span>
              <div className="flex items-center gap-2.5 border border-neutral-200 bg-white rounded-lg px-2 py-0.5">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="text-neutral-500 hover:text-brand-primary transition-colors cursor-pointer p-0.5"
                >
                  <Minus size={10} />
                </button>
                <span className="text-xs font-extrabold text-neutral-800 w-3 text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="text-neutral-500 hover:text-brand-primary transition-colors cursor-pointer p-0.5"
                >
                  <Plus size={10} />
                </button>
              </div>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={!isValid()}
              className={`w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer ${
                isValid()
                  ? "bg-brand-primary text-white hover:bg-brand-primary-hover shadow-md shadow-brand-primary/15"
                  : "bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none"
              }`}
            >
              Add to Order&nbsp;·&nbsp;${getLivePrice().toFixed(2)}
            </button>
          </div>
        </div>

        {/* 
          MOBILE FIXED STICKY FOOTER ACTION BAR
          Includes the quantity adjustments and the main Add to Cart button in a clean bottom layout.
        */}
        <div className="md:hidden flex items-center justify-between gap-4 p-4 border-t border-neutral-100 bg-white flex-shrink-0 z-20">
          {/* Quantity selector */}
          <div className="flex items-center gap-3 border border-neutral-200 bg-neutral-50 rounded-xl px-3 py-2 flex-shrink-0">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="text-neutral-500 hover:text-brand-primary p-0.5 active:scale-90"
            >
              <Minus size={13} strokeWidth={2.5} />
            </button>
            <span className="text-xs font-black text-neutral-800 w-3 text-center">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="text-neutral-500 hover:text-brand-primary p-0.5 active:scale-90"
            >
              <Plus size={13} strokeWidth={2.5} />
            </button>
          </div>

          {/* Add to cart CTA */}
          <button
            onClick={handleAddToCart}
            disabled={!isValid()}
            className={`flex-1 py-3.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
              isValid()
                ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/15"
                : "bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200/50"
            }`}
          >
            Add to Bag&nbsp;·&nbsp;${getLivePrice().toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
}
