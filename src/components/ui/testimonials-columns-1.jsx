"use client";
import React from "react";
import { motion } from "motion/react";

/**
 * TestimonialsColumn - A vertically scrolling column of testimonials.
 * @param {string} className - Additional CSS classes.
 * @param {Array} testimonials - Array of testimonial objects.
 * @param {number} duration - Scroll duration in seconds.
 */
export const TestimonialsColumn = ({ className, testimonials = [], duration = 10 }) => {
  return (
    <div className={className}>
      <motion.div
        animate={{
          translateY: "-50%",
        }}
        transition={{
          duration: duration,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop",
        }}
        className="flex flex-col gap-6 pb-6"
      >
        {[0, 1].map((index) => (
          <React.Fragment key={index}>
            {testimonials.map((item, i) => (
              <div 
                className="p-12 rounded-3xl border shadow-xl shadow-primary/10 max-w-md w-full bg-panel backdrop-blur-md border-glass-border transform hover:scale-[1.02] transition-transform duration-300" 
                key={`${index}-${i}`}
              >
                <div className="text-main leading-relaxed text-xl font-bold mb-8">{item.text}</div>
                <div className="flex items-center gap-2 mt-5">
                  <img
                    width={40}
                    height={40}
                    src={item.image}
                    alt={item.name}
                    className="h-10 w-10 rounded-full object-cover border border-accent-blue/30"
                  />
                  <div className="flex flex-col">
                    <div className="font-medium tracking-tight leading-5 text-main">{item.name}</div>
                    <div className="leading-5 opacity-80 tracking-tight text-muted">{item.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </React.Fragment>
        ))}
      </motion.div>
    </div>
  );
};
