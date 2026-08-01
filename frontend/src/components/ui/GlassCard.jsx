import { motion, useReducedMotion } from "framer-motion";

/** Shared cascading-entrance glass panel used for every card across the app. */
export default function GlassCard({ children, index = 0, className = "", as = "section" }) {
  const reduceMotion = useReducedMotion();
  const MotionTag = motion[as] ?? motion.section;

  const motionProps = reduceMotion
    ? { initial: { opacity: 1, y: 0 }, animate: { opacity: 1, y: 0 } }
    : {
        initial: { opacity: 0, y: 15 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] },
      };

  return (
    <MotionTag
      {...motionProps}
      className={`glass-panel rounded-3xl p-6 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset] ${className}`}
    >
      {children}
    </MotionTag>
  );
}