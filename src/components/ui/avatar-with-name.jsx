"use client";

import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

/**
 * AvatarWithName - An interactive avatar component that reveals a name on hover.
 */
export function AvatarWithName({
  src,
  name,
  fallback,
  size = "md",
  direction = "bottom",
  className,
  nameClassName,
  motionClassName,
  onClick,
}) {
  const [isHovered, setIsHovered] = useState(false);

  const getInitials = (name = "") => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const sizeVariants = {
    sm: "h-10 w-10",
    md: "h-14 w-14", // Standard size for our dashboards
    lg: "h-20 w-20",
    xl: "h-28 w-28",
  };

  const nameSizeVariants = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-1.5",
    lg: "text-base px-4 py-2",
    xl: "text-lg px-5 py-2.5",
  };

  const directionVariants = {
    top: {
      initial: { y: 20, opacity: 0, filter: "blur(4px)" },
      animate: { y: -8, opacity: 1, filter: "blur(0px)" },
      exit: { y: 20, opacity: 0, filter: "blur(4px)" },
    },
    bottom: {
      initial: { y: -20, opacity: 0, filter: "blur(4px)" },
      animate: { y: 8, opacity: 1, filter: "blur(0px)" },
      exit: { y: -20, opacity: 0, filter: "blur(4px)" },
    },
    left: {
      initial: { x: 20, opacity: 0, filter: "blur(4px)" },
      animate: { x: -8, opacity: 1, filter: "blur(0px)" },
      exit: { x: 20, opacity: 0, filter: "blur(4px)" },
    },
    right: {
      initial: { x: -20, opacity: 0, filter: "blur(4px)" },
      animate: { x: 8, opacity: 1, filter: "blur(0px)" },
      exit: { x: -20, opacity: 0, filter: "blur(4px)" },
    },
  };

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        className={cn("cursor-pointer", motionClassName)}
      >
        <Avatar
          className={cn(
            sizeVariants[size],
            "ring-2 ring-[var(--accent-blue)]/30 shadow-lg transition-shadow hover:shadow-[var(--accent-blue)]/20"
          )}
        >
          <AvatarImage 
            src={src || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(name || 'User')}&backgroundColor=1c1c1c`} 
            alt={name} 
          />
          <AvatarFallback className="bg-[var(--bg-panel)] text-[var(--text-main)] font-semibold border border-[var(--glass-border)]">
            {fallback || getInitials(name)}
          </AvatarFallback>
        </Avatar>
      </motion.div>

      <AnimatePresence>
        {isHovered && name && (
          <motion.div
            initial={directionVariants[direction].initial}
            animate={directionVariants[direction].animate}
            exit={directionVariants[direction].exit}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 25,
              opacity: { duration: 0.2 },
              filter: { duration: 0.2 },
            }}
            className={cn(
              "absolute z-50 whitespace-nowrap rounded-lg backdrop-blur-md bg-[var(--bg-panel)] text-[var(--text-main)] shadow-xl border border-[var(--glass-border)] pointer-events-none",
              nameSizeVariants[size],
              positionClasses[direction],
              nameClassName
            )}
          >
            <span className="font-bold tracking-tight">{name}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
