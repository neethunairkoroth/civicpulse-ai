import React from 'react';
import { Upload } from 'lucide-react';

interface TopBarProps {
  onTriggerUpload: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onTriggerUpload }) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#080D16]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-8 px-6 py-3.5">
        <a
          href="#overview"
          className="text-lg font-bold tracking-tight text-slate-50 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-sm"
        >
          CivicPulse AI
        </a>

        <nav
          aria-label="Primary sections"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-400"
        >
          <a
            href="#overview"
            className="hover:text-cyan-300 transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-sm"
          >
            Overview
          </a>
          <a
            href="#analytics"
            className="hover:text-cyan-300 transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-sm"
          >
            Category Analytics
          </a>
          <a
            href="#investigator"
            className="hover:text-cyan-300 transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-sm"
          >
            AI Investigator
          </a>
          <a
            href="#remediation"
            className="hover:text-cyan-300 transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-sm"
          >
            Remediation Queue
          </a>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onTriggerUpload}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            Import CSV
          </button>
        </div>
      </div>
    </header>
  );
};
