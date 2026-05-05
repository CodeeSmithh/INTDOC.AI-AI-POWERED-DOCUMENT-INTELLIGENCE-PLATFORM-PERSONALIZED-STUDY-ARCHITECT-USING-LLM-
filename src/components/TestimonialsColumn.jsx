"use client";
import React from "react";
import { motion } from "motion/react";

/**
 * TestimonialCard - A single testimonial card.
 */
const TestimonialCard = ({ text, image, name, role }) => (
  <div className="p-12 rounded-3xl border shadow-xl max-w-sm w-full bg-panel backdrop-blur-md border-glass-border transform hover:scale-[1.02] transition-transform duration-300 flex-shrink-0">
    <div className="text-main leading-relaxed text-lg">{text}</div>
    <div className="flex items-center gap-2 mt-5">
      <img
        width={40}
        height={40}
        src={image}
        alt={name}
        className="h-10 w-10 rounded-full object-cover border border-accent-blue/30"
      />
      <div className="flex flex-col">
        <div className="font-medium tracking-tight leading-5 text-main">{name}</div>
        <div className="leading-5 opacity-60 tracking-tight text-text-muted">{role}</div>
      </div>
    </div>
  </div>
);

/**
 * TestimonialsColumn - A vertically scrolling column of testimonials.
 * @param {string} className - Additional CSS classes.
 * @param {Array} testimonials - Array of testimonial objects { text, image, name, role }.
 * @param {number} duration - Animation duration in seconds (default: 10).
 */
export const TestimonialsColumn = (props) => {
  const { className, testimonials, duration = 10 } = props;
  
  return (
    <div className={className}>
      <motion.div
        initial={{ translateY: 0 }}
        animate={{
          translateY: "-50%",
        }}
        transition={{
          duration: duration,
          repeat: Infinity,
          ease: "linear",
        }}
        className="flex flex-col"
      >
        {testimonials.map(({ text, image, name, role }, i) => (
          <div key={`orig-${i}`} className="mb-6">
            <TestimonialCard text={text} image={image} name={name} role={role} />
          </div>
        ))}
        {testimonials.map(({ text, image, name, role }, i) => (
          <div key={`dup-${i}`} className="mb-6">
            <TestimonialCard text={text} image={image} name={name} role={role} />
          </div>
        ))}
      </motion.div>
    </div>
  );
};
