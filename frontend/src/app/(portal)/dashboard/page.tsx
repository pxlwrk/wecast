import type { Metadata } from "next";

export const metadata: Metadata = { title: "Übersicht" };

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Übersicht</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Podcast-Sendungen", value: "–", href: "/podcasts" },
          { label: "Videos", value: "–", href: "/videos" },
          { label: "Kurz-URLs", value: "–", href: "/admin" },
        ].map((card) => (
          <a
            key={card.label}
            href={card.href}
            className="block bg-white border border-gray-200 rounded-xl p-6 hover:border-brand-300 hover:shadow-sm transition-all"
          >
            <p className="text-3xl font-bold text-brand-700">{card.value}</p>
            <p className="mt-1 text-sm text-gray-500">{card.label}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
