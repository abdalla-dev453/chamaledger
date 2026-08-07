import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Check, 
  Copy, 
  ShieldCheck, 
  UserX, 
  UserCheck,
  Users,
  QrCode,
  ShieldAlert,
  UserCog
} from "lucide-react";
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
      // Clipboard access can be denied by the browser; fallback handled silently
    }
  }

  return (
    <GlassCard index={index} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-emerald-500/30 bg-emerald-950/10 p-6 backdrop-blur-xl shadow-lg shadow-emerald-900/10 relative overflow-hidden">
      {/* Background flare */}
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/20 blur-[50px] pointer-events-none" />
      
      <div className="flex items-start gap-4 z-10">
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mt-1">
          <QrCode className="h-6 w-6" />
        </div>
        <div>
          <h3 className="font-display text-lg font-bold text-white tracking-tight">Invite New Members</h3>
          <p className="mt-1 text-xs font-medium text-slate-400 max-w-sm leading-relaxed">
            Share this secure Group ID. New members will enter it during account creation to automatically join your ledger.
          </p>
        </div>
      </div>
      
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        type="button"
        onClick={handleCopy}
        className={`z-10 flex flex-none items-center gap-2.5 rounded-xl px-5 py-3 font-mono text-sm font-bold transition-all duration-300 shadow-md ${
          copied 
            ? "bg-emerald-500 text-slate-950 shadow-emerald-500/20" 
            : "bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700"
        }`}
      >
        {groupId}
        <AnimatePresence mode="wait">
          {copied ? (
            <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <Check className="h-4 w-4" aria-hidden="true" />
            </motion.div>
          ) : (
            <motion.div key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <Copy className="h-4 w-4 text-slate-400" aria-hidden="true" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
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
        title={member.role === "treasurer" ? "Demote to standard member" : "Promote to Treasurer"}
        className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-all duration-200 disabled:opacity-50 ${
          member.role === "treasurer"
            ? "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300"
            : "border-slate-700 bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-emerald-400 hover:border-emerald-500/50"
        }`}
      >
        {member.role === "treasurer" ? <ShieldAlert className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
      </button>
      
      <button
        type="button"
        onClick={toggleActive}
        disabled={saving}
        title={member.is_active ? "Deactivate member account" : "Reactivate member account"}
        className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-all duration-200 disabled:opacity-50 ${
          member.is_active
            ? "border-slate-700 bg-slate-800/50 text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/50"
            : "border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300"
        }`}
      >
        {member.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
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
      header: "Member Profile",
      render: (row) => (
        <div className="flex items-center gap-3 py-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-600 text-xs font-bold text-slate-200 shadow-inner">
            {row.full_name?.substring(0, 2).toUpperCase() || "MB"}
          </div>
          <div>
            <p className="font-bold text-slate-100">{row.full_name}</p>
            <p className="text-xs font-medium text-slate-400">{row.phone_number}</p>
          </div>
        </div>
      ),
    },
    { 
      key: "role", 
      header: "Role Level", 
      render: (row) => (
        row.role === "treasurer" 
          ? <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20"><ShieldCheck className="h-3.5 w-3.5"/> Treasurer</span>
          : <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 capitalize"><UserCog className="h-3.5 w-3.5"/> Member</span>
      ) 
    },
    { 
      key: "joined_on", 
      header: "Joined Date", 
      render: (row) => <span className="text-sm font-medium text-slate-300">{formatDate(row.joined_on)}</span> 
    },
    { 
      key: "status", 
      header: "Status", 
      render: (row) => <StatusChip status={row.is_active ? "active" : "closed"} /> 
    },
    ...(isTreasurer
      ? [{ key: "actions", header: "Management", align: "right", render: (row) => <MemberRoleControl member={row} onUpdateMember={updateMember} /> }]
      : []),
  ];

  return (
    <div className="relative min-h-screen text-slate-100 pb-12">
      {/* Atmospheric Glow */}
      <div className="pointer-events-none absolute top-10 left-1/4 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[120px]" />

      {/* Header */}
      <div className="border-b border-slate-800 pb-6 relative z-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-400 mb-2">
          <Users className="h-3.5 w-3.5" /> Group Directory
        </div>
        <h1 className="font-display text-3xl font-black text-white sm:text-4xl tracking-tight">Members & Roles</h1>
        <p className="mt-1 text-xs text-slate-400 font-medium">Manage your circle's directory, verify roles, and monitor account statuses.</p>
      </div>

      {isTreasurer && (
        <div className="mt-8 relative z-10">
          <InviteCard groupId={user.group_id} index={0} />
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300 font-medium shadow-lg">
          {error}
        </div>
      )}

      {/* Main Table */}
      <GlassCard index={1} className="mt-8 border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-xl relative z-10 shadow-2xl">
        <div className="overflow-x-auto">
          <Table
            columns={columns}
            rows={members}
            caption="Group members and their roles"
            isLoading={status === "loading"}
            emptyMessage="No members are currently listed in this group."
          />
        </div>
      </GlassCard>
    </div>
  );
}