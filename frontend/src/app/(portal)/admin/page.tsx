"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { CurrentUser, ShortUrl } from "@/types";
import { Users, Link2, ShieldCheck } from "lucide-react";

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    admin: "bg-red-100 text-red-700",
    moderator: "bg-yellow-100 text-yellow-700",
    user: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${colors[role] ?? "bg-gray-100 text-gray-600"}`}>
      {role}
    </span>
  );
}

export default function AdminPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<CurrentUser[]>([]);
  const [shorts, setShorts] = useState<ShortUrl[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingShorts, setLoadingShorts] = useState(true);
  const [roleUpdating, setRoleUpdating] = useState<number | null>(null);

  useEffect(() => {
    if (me?.role === "admin") {
      api.users.list().then(setUsers).finally(() => setLoadingUsers(false));
    } else {
      setLoadingUsers(false);
    }
    api.shorts.list().then(setShorts).finally(() => setLoadingShorts(false));
  }, [me]);

  async function changeRole(userId: number, role: string) {
    setRoleUpdating(userId);
    try {
      await api.users.setRole(userId, role);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: role as CurrentUser["role"] } : u));
    } finally {
      setRoleUpdating(null);
    }
  }

  if (me?.role !== "admin") {
    return (
      <div className="text-center py-16">
        <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" aria-hidden="true" />
        <p className="text-gray-500">Nur für Administratoren zugänglich.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Verwaltung</h1>

      {/* Users */}
      <section aria-labelledby="users-heading">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-gray-500" aria-hidden="true" />
          <h2 id="users-heading" className="text-lg font-semibold text-gray-900">Benutzer</h2>
        </div>
        {loadingUsers ? (
          <p className="text-sm text-gray-500">Wird geladen…</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm" aria-label="Benutzerliste">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Benutzer</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">E-Mail</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Rolle</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3" aria-label="Aktionen" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className={!u.is_active ? "opacity-50" : ""}>
                    <td className="px-4 py-3 font-medium text-gray-900">{u.display_name}</td>
                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                    <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                    <td className="px-4 py-3 text-gray-400">{u.is_active ? "Aktiv" : "Inaktiv"}</td>
                    <td className="px-4 py-3">
                      {u.id !== me.id && u.is_active && (
                        <select
                          value={u.role}
                          disabled={roleUpdating === u.id}
                          onChange={(e) => changeRole(u.id, e.target.value)}
                          aria-label={`Rolle von ${u.display_name} ändern`}
                          className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-brand-500 outline-none"
                        >
                          <option value="user">user</option>
                          <option value="moderator">moderator</option>
                          <option value="admin">admin</option>
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Short URLs */}
      <section aria-labelledby="shorts-heading">
        <div className="flex items-center gap-2 mb-4">
          <Link2 className="w-5 h-5 text-gray-500" aria-hidden="true" />
          <h2 id="shorts-heading" className="text-lg font-semibold text-gray-900">Kurz-URLs</h2>
        </div>
        {loadingShorts ? (
          <p className="text-sm text-gray-500">Wird geladen…</p>
        ) : shorts.length === 0 ? (
          <p className="text-sm text-gray-400">Keine Kurz-URLs vorhanden.</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm" aria-label="Kurz-URL-Liste">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Kurz-URL</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Ziel</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Aufrufe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {shorts.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3">
                      <a href={s.short_url} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline font-mono text-xs">
                        /s/{s.vanity_slug ?? s.code}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {s.target_type} #{s.target_id}
                    </td>
                    <td className="px-4 py-3 text-gray-400">{s.visit_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
