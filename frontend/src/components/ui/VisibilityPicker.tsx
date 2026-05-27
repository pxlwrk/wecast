"use client";

import { useState } from "react";
import { Globe, Users, Lock, Link2, X, ChevronDown, ChevronUp } from "lucide-react";
import type { Visibility } from "@/types";

interface VisibilityOption {
  value: Visibility;
  label: string;
  desc: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}

const OPTIONS: VisibilityOption[] = [
  {
    value:     "public",
    label:     "Öffentlich",
    desc:      "Auf der Startseite sichtbar – kein Login erforderlich",
    icon:      Globe,
    iconBg:    "bg-emerald-100 dark:bg-emerald-900/30",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    value:     "internal",
    label:     "Alle Mitarbeiter",
    desc:      "Sichtbar für alle angemeldeten Nutzer",
    icon:      Users,
    iconBg:    "bg-blue-100 dark:bg-blue-900/30",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    value:     "restricted",
    label:     "Bestimmte Abteilungen",
    desc:      "Nur für ausgewählte Active Directory-Gruppen",
    icon:      Lock,
    iconBg:    "bg-amber-100 dark:bg-amber-900/30",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  {
    value:     "unlisted",
    label:     "Nur per direktem Link",
    desc:      "Nicht in Listen gezeigt – Zugang nur über den direkten Link",
    icon:      Link2,
    iconBg:    "bg-zinc-100 dark:bg-zinc-800",
    iconColor: "text-zinc-600 dark:text-zinc-400",
  },
];

interface Props {
  value: Visibility;
  allowedGroups: string[];
  onChange: (visibility: Visibility, allowedGroups: string[]) => void;
  className?: string;
}

/**
 * Visibility picker with optional AD-group restriction input.
 */
export default function VisibilityPicker({ value, allowedGroups, onChange, className = "" }: Props) {
  const [open, setOpen]       = useState(false);
  const [groupInput, setGroupInput] = useState("");

  const selected = OPTIONS.find((o) => o.value === value) ?? OPTIONS[1];
  const Icon = selected.icon;

  function select(opt: VisibilityOption) {
    onChange(opt.value, opt.value === "restricted" ? allowedGroups : []);
    setOpen(false);
  }

  function addGroup() {
    const dn = groupInput.trim();
    if (!dn || allowedGroups.includes(dn)) return;
    onChange(value, [...allowedGroups, dn]);
    setGroupInput("");
  }

  function removeGroup(dn: string) {
    onChange(value, allowedGroups.filter((g) => g !== dn));
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <label className="label">Sichtbarkeit</label>

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                   bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700
                   hover:border-brand-400 dark:hover:border-brand-600
                   focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
                   transition-colors"
      >
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${selected.iconBg}`}>
          <Icon className={`w-3.5 h-3.5 ${selected.iconColor}`} aria-hidden="true" />
        </span>
        <span className="flex-1 text-left font-medium text-zinc-900 dark:text-zinc-100">
          {selected.label}
        </span>
        {open
          ? <ChevronUp  className="w-4 h-4 text-zinc-400 flex-shrink-0" aria-hidden="true" />
          : <ChevronDown className="w-4 h-4 text-zinc-400 flex-shrink-0" aria-hidden="true" />}
      </button>

      {/* Dropdown */}
      {open && (
        <ul
          role="listbox"
          aria-label="Sichtbarkeit auswählen"
          className="card divide-y divide-zinc-100 dark:divide-zinc-800 shadow-lg overflow-hidden"
        >
          {OPTIONS.map((opt) => {
            const OptionIcon = opt.icon;
            const isSelected = opt.value === value;
            return (
              <li key={opt.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => select(opt)}
                  className={[
                    "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                    isSelected
                      ? "bg-brand-50 dark:bg-brand-900/20"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
                  ].join(" ")}
                >
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${opt.iconBg}`}>
                    <OptionIcon className={`w-4 h-4 ${opt.iconColor}`} aria-hidden="true" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isSelected ? "text-brand-700 dark:text-brand-300" : "text-zinc-900 dark:text-zinc-100"}`}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">{opt.desc}</p>
                  </div>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-brand-600 flex-shrink-0" aria-hidden="true" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Description of selected */}
      <p className="text-xs text-zinc-500">{selected.desc}</p>

      {/* AD group input (only for restricted) */}
      {value === "restricted" && (
        <div className="space-y-2 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10
                        border border-amber-200 dark:border-amber-800">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
            Active Directory-Gruppen
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Tragen Sie den vollständigen Distinguished Name (DN) der Gruppen ein.
            Admins haben immer Zugang.
          </p>

          {/* Group tags */}
          {allowedGroups.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {allowedGroups.map((dn) => (
                <span
                  key={dn}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg
                             bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300
                             text-xs font-mono"
                >
                  {dn}
                  <button
                    type="button"
                    onClick={() => removeGroup(dn)}
                    aria-label={`${dn} entfernen`}
                    className="hover:text-red-600 transition-colors"
                  >
                    <X className="w-3 h-3" aria-hidden="true" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Add group input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={groupInput}
              onChange={(e) => setGroupInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addGroup())}
              placeholder="CN=Abteilung,OU=Gruppen,DC=company,DC=com"
              className="input flex-1 text-xs font-mono"
              aria-label="Gruppen-DN eingeben"
            />
            <button
              type="button"
              onClick={addGroup}
              disabled={!groupInput.trim()}
              className="btn-secondary text-xs px-3 flex-shrink-0"
            >
              Hinzufügen
            </button>
          </div>

          {allowedGroups.length === 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-500 italic">
              Keine Gruppen eingetragen – alle angemeldeten Nutzer haben Zugang.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Visibility badge (for display in lists) ───────────────────────────────────

interface BadgeProps {
  visibility: Visibility;
  size?: "xs" | "sm";
}

export function VisibilityBadge({ visibility, size = "xs" }: BadgeProps) {
  const cfg: Record<Visibility, { label: string; icon: React.ElementType; cls: string }> = {
    public:     { label: "Öffentlich",     icon: Globe, cls: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:ring-emerald-800" },
    internal:   { label: "Intern",         icon: Users, cls: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:ring-blue-800" },
    restricted: { label: "Eingeschränkt",  icon: Lock,  cls: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-800" },
    unlisted:   { label: "Nur per Link",   icon: Link2, cls: "bg-zinc-100 text-zinc-600 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-700" },
  };
  const { label, icon: BadgeIcon, cls } = cfg[visibility] ?? cfg.internal;
  const sz = size === "xs" ? "text-xs px-2 py-0.5" : "text-sm px-2.5 py-1";

  return (
    <span className={`inline-flex items-center gap-1 font-medium rounded-full ring-1 ${sz} ${cls}`}>
      <BadgeIcon className="w-3 h-3" aria-hidden="true" />
      {label}
    </span>
  );
}
