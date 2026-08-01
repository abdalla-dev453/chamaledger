import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { CircleDollarSign, Eye, EyeOff, AlertCircle, Users, UserPlus } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { isValidKenyanPhone } from "../utils/phoneSanitizer";

const CYCLE_FREQUENCIES = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

function FieldLabel({ children, htmlFor }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-white/70">
      {children}
    </label>
  );
}

const inputClasses =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-[var(--color-plum-400)] focus:bg-white/[0.07]";

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
    <div className="thread-glow flex min-h-screen items-center justify-center bg-[var(--color-ink-950)] px-4 py-10 text-white">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-plum-400)] to-[var(--color-plum-600)]">
            <CircleDollarSign className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-semibold">ChamaLedger</h1>
          <p className="mt-1 text-sm text-white/55">Your circle's savings, loans, and ledger — in one place.</p>
        </div>

        <div className="glass-panel rounded-3xl p-6 sm:p-8">
          <div role="tablist" aria-label="Authentication mode" className="mb-6 flex rounded-full bg-white/5 p-1">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              onClick={() => {
                setMode("login");
                setFormError(null);
              }}
              className={`flex-1 rounded-full py-2 text-sm font-semibold transition-colors ${
                mode === "login" ? "bg-white/10 text-white" : "text-white/50"
              }`}
            >
              Log in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              onClick={() => {
                setMode("register");
                setFormError(null);
              }}
              className={`flex-1 rounded-full py-2 text-sm font-semibold transition-colors ${
                mode === "register" ? "bg-white/10 text-white" : "text-white/50"
              }`}
            >
              Create account
            </button>
          </div>

          {formError && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2 rounded-xl bg-[var(--color-rose-500)]/15 px-3.5 py-3 text-sm text-[var(--color-rose-300)]"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
              {formError}
            </div>
          )}

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4" noValidate>
              <div>
                <FieldLabel htmlFor="login-phone">Phone number</FieldLabel>
                <input id="login-phone" name="phone_number" type="tel" placeholder="0712 345 678" required className={inputClasses} />
              </div>
              <div>
                <FieldLabel htmlFor="login-password">Password</FieldLabel>
                <div className="relative">
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    className={`${inputClasses} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-white/40 hover:text-white/70"
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
                className="w-full rounded-xl bg-gradient-to-br from-[var(--color-plum-400)] to-[var(--color-plum-600)] py-3 text-sm font-semibold text-white shadow-lg shadow-black/30 transition-opacity disabled:opacity-60"
              >
                {submitting ? "Signing in…" : "Log in"}
              </motion.button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4" noValidate>
              <div>
                <FieldLabel htmlFor="reg-name">Full name</FieldLabel>
                <input id="reg-name" name="full_name" type="text" required className={inputClasses} />
              </div>
              <div>
                <FieldLabel htmlFor="reg-phone">Phone number</FieldLabel>
                <input id="reg-phone" name="phone_number" type="tel" placeholder="0712 345 678" required className={inputClasses} />
              </div>
              <div>
                <FieldLabel htmlFor="reg-password">Password</FieldLabel>
                <input id="reg-password" name="password" type="password" required minLength={8} className={inputClasses} />
              </div>

              <div role="radiogroup" aria-label="Group setup" className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  role="radio"
                  aria-checked={joinType === "create"}
                  onClick={() => setJoinType("create")}
                  className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-colors ${
                    joinType === "create"
                      ? "border-[var(--color-plum-400)] bg-[var(--color-plum-500)]/15 text-white"
                      : "border-white/10 text-white/50"
                  }`}
                >
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  Start a group
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={joinType === "join"}
                  onClick={() => setJoinType("join")}
                  className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-colors ${
                    joinType === "join"
                      ? "border-[var(--color-plum-400)] bg-[var(--color-plum-500)]/15 text-white"
                      : "border-white/10 text-white/50"
                  }`}
                >
                  <Users className="h-4 w-4" aria-hidden="true" />
                  Join a group
                </button>
              </div>

              {joinType === "create" ? (
                <div className="space-y-4 rounded-xl bg-white/[0.03] p-4">
                  <div>
                    <FieldLabel htmlFor="group-name">Group name</FieldLabel>
                    <input id="group-name" name="group_name" type="text" placeholder="Malkia Women Sacco" required className={inputClasses} />
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
                      <FieldLabel htmlFor="cycle-frequency">Cycle</FieldLabel>
                      <select id="cycle-frequency" name="cycle_frequency" defaultValue="monthly" className={inputClasses}>
                        {CYCLE_FREQUENCIES.map((f) => (
                          <option key={f.value} value={f.value} className="bg-[var(--color-ink-900)]">
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <p className="text-xs text-white/40">You'll be set up as this group's treasurer.</p>
                </div>
              ) : (
                <div className="rounded-xl bg-white/[0.03] p-4">
                  <FieldLabel htmlFor="group-id">Group ID</FieldLabel>
                  <input
                    id="group-id"
                    name="group_id"
                    type="text"
                    placeholder="Ask your treasurer for this"
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
                className="w-full rounded-xl bg-gradient-to-br from-[var(--color-plum-400)] to-[var(--color-plum-600)] py-3 text-sm font-semibold text-white shadow-lg shadow-black/30 transition-opacity disabled:opacity-60"
              >
                {submitting ? "Creating account…" : "Create account"}
              </motion.button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}