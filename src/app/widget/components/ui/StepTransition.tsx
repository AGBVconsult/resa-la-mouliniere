"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

interface StepTransitionProps {
  children: ReactNode;
  direction?: "forward" | "backward";
  className?: string;
}

export function StepTransition({
  children,
  direction = "forward",
  className = "",
}: StepTransitionProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={`h-full flex flex-col ${className}`}>{children}</div>;
  }

  const xInitial = direction === "forward" ? 20 : -20;
  const xExit = direction === "forward" ? -20 : 20;

  return (
    <motion.div
      initial={{ opacity: 0, x: xInitial }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: xExit }}
      transition={{
        duration: 0.25,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className={`h-full flex flex-col ${className}`}
    >
      {children}
    </motion.div>
  );
}
