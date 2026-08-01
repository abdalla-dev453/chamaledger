import { useState } from "react";
import { Check, Copy, ShieldCheck, UserX, UserCheck } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useMembers } from "../hooks/useMembers";
import { formatDate } from "../utils/formatters";
import GlassCard from "../components/ui/GlassCard";
import StatusChip from "../components/ui/StatusChip";
import Table from "../components/ui/Table";

function InviteCard({ groupId, index }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(groupId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied by the browser; the ID is still visible to copy manually.
    }
  }

  return (
    <GlassCard index={index} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-display text-lg font-semibold">Invite new members</p>
        <p className="mt-1 text-sm text-white/55">
          Share this Group ID — new members enter it when they create their account.
        </p>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="flex flex-none items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-mono text-sm text-white transition-colors hover:bg-white/15"
      >
        {groupId}
        {copied ? <Check className="h-4 w-4 text-[var(--color-gain-400)]" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
      </button>
    </GlassCard>
  );
}

function MemberRoleControl({ member, onUpdateMember }) {
  const [saving, setSaving] = useState(false);

  async function toggleRole() {
    setSaving(true);
    try {
      const next = member.role === "treasurer" ? "member" : "treasurer";
      await onUpdateMember(member.id, { role: next });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive() {
    setSaving(true);
    try {
      await onUpdateMember(member.id, { is_active: !member.is_active });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        onClick={toggleRole}
        disabled={saving}
        title={member.role === "treasurer" ? "Demote to member" : "Promote to treasurer"}
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
      >
        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={toggleActive}
        disabled={saving}
        title={member.is_active ? "Deactivate member" : "Reactivate member"}
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
      >
        {member.is_active ? <UserX className="h-4 w-4" aria-hidden="true" /> : <UserCheck className="h-4 w-4" aria-hidden="true" />}
      </button>
    </div>
  );
}

export default function MembersPage() {
  const user = useAuthStore((s) => s.user);
  const isTreasurer = user?.role === "treasurer";
  const { members, status, error, updateMember } = useMembers(user?.group_id);

  const columns = [
    {
      key: "member",
      header: "Member",
      render: (row) => (
        <div>
          <p className="font-medium text-white">{row.full_name}</p>
          <p className="text-xs text-white/45">{row.phone_number}</p>
        </div>
      ),
    },
    { key: "role", header: "Role", render: (row) => <span className="capitalize text-white/70">{row.role}</span> },
    { key: "joined_on", header: "Joined", render: (row) => formatDate(row.joined_on) },
    { key: "status", header: "Status", render: (row) => <StatusChip status={row.is_active ? "active" : "closed"} /> },
    ...(isTreasurer
      ? [{ key: "actions", header: "", align: "right", render: (row) => <MemberRoleControl member={row} onUpdateMember={updateMember} /> }]
      : []),
  ];

  return (
    <div className="pb-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-plum-300)]">Your circle</p>
      <h1 className="mt-1 font-display text-3xl font-semibold">Members</h1>

      {isTreasurer && <div className="mt-6"><InviteCard groupId={user.group_id} index={0} /></div>}

      {error && <p className="mt-6 text-sm text-[var(--color-rose-300)]">{error}</p>}

      <GlassCard index={1} className="mt-6">
        <div className="overflow-x-auto">
          <Table
            columns={columns}
            rows={members}
            caption="Group members and their roles"
            isLoading={status === "loading"}
            emptyMessage="No members yet."
          />
        </div>
      </GlassCard>
    </div>
  );
}