import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  Users,
  UserPlus,
  ArrowRight,
  Lock,
  Phone,
  User,
  Building2,
  DollarSign,
  Calendar,
} from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { isValidKenyanPhone } from "../utils/phoneSanitizer";

const CYCLE_FREQUENCIES = [
  { value: "weekly", label: "Weekly Cycle" },
  { value: "monthly", label: "Monthly Cycle" },
];

function FieldLabel({ children, htmlFor }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
      {children}
    </label>
  );
}

const inputClasses =
  "w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition-all duration-200 focus:border-emerald-500/80 focus:ring-2 focus:ring-emerald-500/20";

export default function LoginPage() {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [joinType, setJoinType] = useState("create"); // "create" | "join"
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname ?? "/";

  async function handleLogin(event) {
    event.preventDefault();
    setFormError(null);
    const form = new FormData(event.currentTarget);
    const phone = form.get("phone_number");

    if (!isValidKenyanPhone(phone)) {
      setFormError("Enter a valid Kenyan phone number, e.g. 0712 345 678.");
      return;
    }

    setSubmitting(true);
    try {
      await login({ phone_number: phone, password: form.get("password") });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setFormError(err.message || "Could not sign in. Check your details and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    setFormError(null);
    const form = new FormData(event.currentTarget);
    const phone = form.get("phone_number");

    if (!isValidKenyanPhone(phone)) {
      setFormError("Enter a valid Kenyan phone number, e.g. 0712 345 678.");
      return;
    }

    const payload = {
      full_name: form.get("full_name"),
      phone_number: phone,
      password: form.get("password"),
    };

    if (joinType === "create") {
      payload.group_name = form.get("group_name");
      payload.contribution_amount = Number(form.get("contribution_amount"));
      payload.cycle_frequency = form.get("cycle_frequency");
    } else {
      payload.group_id = form.get("group_id");
    }

    setSubmitting(true);
    try {
      await register(payload);
      navigate("/", { replace: true });
    } catch (err) {
      setFormError(err.message || "Could not create your account. Check your details and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#0B0F17] px-4 py-12 text-slate-100 selection:bg-emerald-500 selection:text-slate-950 font-sans overflow-hidden">
      
      {/* Visual Ambiance & Atmospheric Glows */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[150px]" />
      <div className="pointer-events-none absolute bottom-0 right-10 h-[400px] w-[400px] rounded-full bg-rose-500/10 blur-[150px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Brand Header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-300 flex items-center justify-center shadow-lg shadow-emerald-500/25 mb-4">
            <ShieldCheck className="h-8 w-8 text-slate-950" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white leading-none">
            CHAMA<span className="text-emerald-400">LEDGER</span>
          </h1>
          <p className="mt-2 text-xs font-medium text-slate-400 max-w-xs">
            Empowering women through secure group savings, revolving funds, and micro-loans.
          </p>
        </div>

        {/* Card Panel */}
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-black/50">
          
          {/* Toggle Tab Header */}
          <div role="tablist" aria-label="Authentication mode" className="mb-6 flex rounded-2xl bg-slate-950/80 p-1 border border-slate-800/80">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              onClick={() => {
                setMode("login");
                setFormError(null);
              }}
              className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition-all duration-200 ${
                mode === "login"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-md shadow-emerald-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              onClick={() => {
                setMode("register");
                setFormError(null);
              }}
              className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition-all duration-200 ${
                mode === "register"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-md shadow-emerald-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Form Error Alert */}
          {formError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              role="alert"
              className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300 font-medium"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 flex-none text-rose-400" aria-hidden="true" />
              <span>{formError}</span>
            </motion.div>
          )}

          {/* Login Form */}
          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4" noValidate>
              <div>
                <FieldLabel htmlFor="login-phone">Phone Number</FieldLabel>
                <div className="relative">
                  <input
                    id="login-phone"
                    name="phone_number"
                    type="tel"
                    placeholder="0712 345 678"
                    required
                    className={inputClasses}
                  />
                  <Phone className="absolute right-3.5 top-3 h-4 w-4 text-slate-600 pointer-events-none" />
                </div>
              </div>

              <div>
                <FieldLabel htmlFor="login-password">Security Password</FieldLabel>
                <div className="relative">
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    placeholder="••••••••"
                    className={`${inputClasses} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-500 hover:text-slate-300 transition"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={submitting}
                className="w-full mt-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:brightness-110 transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting ? "Authenticating..." : "Sign In to Ledger"}
                {!submitting && <ArrowRight className="h-4 w-4" />}
              </motion.button>
            </form>
          ) : (
            /* Registration Form */
            <form onSubmit={handleRegister} className="space-y-4" noValidate>
              <div>
                <FieldLabel htmlFor="reg-name">Full Official Name</FieldLabel>
                <div className="relative">
                  <input
                    id="reg-name"
                    name="full_name"
                    type="text"
                    placeholder="e.g. Amina Mohamed"
                    required
                    className={inputClasses}
                  />
                  <User className="absolute right-3.5 top-3 h-4 w-4 text-slate-600 pointer-events-none" />
                </div>
              </div>

              <div>
                <FieldLabel htmlFor="reg-phone">Phone Number</FieldLabel>
                <div className="relative">
                  <input
                    id="reg-phone"
                    name="phone_number"
                    type="tel"
                    placeholder="0712 345 678"
                    required
                    className={inputClasses}
                  />
                  <Phone className="absolute right-3.5 top-3 h-4 w-4 text-slate-600 pointer-events-none" />
                </div>
              </div>

              <div>
                <FieldLabel htmlFor="reg-password">Security Password</FieldLabel>
                <div className="relative">
                  <input
                    id="reg-password"
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    placeholder="Min 8 characters"
                    className={inputClasses}
                  />
                  <Lock className="absolute right-3.5 top-3 h-4 w-4 text-slate-600 pointer-events-none" />
                </div>
              </div>

              {/* Group Type Selector */}
              <div role="radiogroup" aria-label="Group setup" className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  role="radio"
                  aria-checked={joinType === "create"}
                  onClick={() => setJoinType("create")}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition-all duration-200 ${
                    joinType === "create"
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                      : "border-slate-800 bg-slate-950/40 text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  Start New Group
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={joinType === "join"}
                  onClick={() => setJoinType("join")}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition-all duration-200 ${
                    joinType === "join"
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                      : "border-slate-800 bg-slate-950/40 text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <Users className="h-4 w-4" aria-hidden="true" />
                  Join Existing Group
                </button>
              </div>

              {joinType === "create" ? (
                <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                  <div>
                    <FieldLabel htmlFor="group-name">Group / Chama Name</FieldLabel>
                    <div className="relative">
                      <input
                        id="group-name"
                        name="group_name"
                        type="text"
                        placeholder="e.g. Malkia Investment Circle"
                        required
                        className={inputClasses}
                      />
                      <Building2 className="absolute right-3.5 top-3 h-4 w-4 text-slate-600 pointer-events-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel htmlFor="contribution-amount">Contribution (KSh)</FieldLabel>
                      <input
                        id="contribution-amount"
                        name="contribution_amount"
                        type="number"
                        min="1"
                        step="1"
                        defaultValue={200}
                        required
                        className={inputClasses}
                      />
                    </div>
                    <div>
                      <FieldLabel htmlFor="cycle-frequency">Cycle Frequency</FieldLabel>
                      <select id="cycle-frequency" name="cycle_frequency" defaultValue="monthly" className={inputClasses}>
                        {CYCLE_FREQUENCIES.map((f) => (
                          <option key={f.value} value={f.value} className="bg-slate-900 text-slate-100">
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <p className="text-[11px] text-emerald-400 font-medium">
                    * Creating a group automatically registers you as the group's Treasurer.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                  <FieldLabel htmlFor="group-id">Group Identifier Code</FieldLabel>
                  <input
                    id="group-id"
                    name="group_id"
                    type="text"
                    placeholder="Provide group ID from your Treasurer"
                    required
                    className={inputClasses}
                  />
                </div>
              )}

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={submitting}
                className="w-full mt-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:brightness-110 transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting ? "Creating Profile..." : "Complete Registration"}
                {!submitting && <ArrowRight className="h-4 w-4" />}
              </motion.button>
            </form>
          )}

        </div>
      </motion.div>
    </div>
  );
}