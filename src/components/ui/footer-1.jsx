import React from "react";
import { Hexagon } from "lucide-react";
import { Button } from "./button";

export const Footer = ({
  logoSrc,
  logoAlt,
  description,
  columns,
  socialLinks,
  copyright = `© ${new Date().getFullYear()} Ruixen. All Rights Reserved.`,
}) => {
  return (
    <footer className="w-full bg-transparent border-t border-white/5 relative z-10">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-8 md:gap-0">
          {/* Logo + Description + Social */}
          <div className="flex flex-col gap-4 md:w-1/3">
          <a href="#" className="flex items-center gap-2 mb-2 group">
            <div className="p-2 rounded-xl bg-violet-500/20 border border-violet-500/30 group-hover:bg-violet-500/30 transition-colors">
              <Hexagon className="w-6 h-6 text-violet-400" />
            </div>
            <span className="text-2xl font-bold text-main tracking-tight">IntDoc.ai</span>
          </a>
            <p className="text-muted">{description}</p>
            <div className="flex space-x-4 mt-2">
              {socialLinks.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="text-muted hover:text-main"
                >
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex flex-wrap gap-8 md:w-2/3">
            {columns.map((col) => (
              <div key={col.title} className="flex flex-col space-y-2 min-w-[120px]">
                <h4 className="text-main font-semibold">{col.title}</h4>
                {col.links.map(({ label, href, badge }) => (
                  <a
                    key={label}
                    href={href}
                    className="text-muted hover:text-main flex items-center gap-1 transition-colors"
                  >
                    {label}
                    {badge && (
                      <span className="bg-violet-500/20 text-violet-400 text-xs px-2 py-0.5 rounded border border-violet-500/30">
                        {badge}
                      </span>
                    )}
                  </a>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 border-t border-glass-border pt-6 flex flex-col md:flex-row justify-between items-center text-sm text-muted">
          <p>{copyright}</p>
          <div className="flex space-x-4 mt-2 md:mt-0">
            <a href="#" className="hover:text-main transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-main transition-colors">
              Terms of Service
            </a>
            <a href="#" className="hover:text-main transition-colors">
              Cookie Settings
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
