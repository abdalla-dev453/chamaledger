import { motion, useReducedMotion } from "framer-motion";

/** Shared cascading-entrance glass panel used for every card across the app. */
export default function GlassCard({
  children,
  index = 0,
  className = "",
  as = "section",
  hoverEffect = false,
}) {
  const reduceMotion = useReducedMotion();
  const MotionTag = motion[as] ?? motion.section;

  const motionProps = reduceMotion
    ? { initial: { opacity: 1, y: 0 }, animate: { opacity: 1, y: 0 } }
    : {
        initial: { opacity: 0, y: 15 },
        animate: { opacity: 1, y: 0 },
        transition: {
          duration: 0.4,
          delay: index * 0.06,
          ease: [0.22, 1, 0.36, 1],
        },
      };

  return (
    <MotionTag
      {...motionProps}
      className={`rounded-2xl border backdrop-blur-xl transition-colors duration-200 
        /* Light Theme Styles */
        border-slate-200/80 bg-white/70 text-slate-900 shadow-xl shadow-slate-200/50 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)]
        
        /* Dark Theme Styles */
        dark:border-slate-800/80 dark:bg-slate-900/50 dark:text-slate-100 dark:shadow-slate-950/40 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] 
        
        p-6 
        ${
          hoverEffect
            ? "transition-all duration-300 hover:border-slate-300 hover:bg-white/90 hover:shadow-2xl dark:hover:border-slate-700 dark:hover:bg-slate-900/70 dark:hover:shadow-emerald-950/10"
            : ""
        } ${className}`}
    >
      {children}
    </MotionTag>
  );
}