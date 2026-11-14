import React, { useRef, useState } from 'react';
import { ArrowUpRight, Loader2, RotateCcw, Send, Sparkles } from 'lucide-react';
import type { ChatMessage, InvestigatorPriorityAction } from '../types/asset';

const STARTER_PROMPTS = [
  'Which assets lack manufacturer data and have overdue inspections?',
  'Generate a prioritized 30-day data remediation plan',
  'Which Bridge Sensors and Subway Signals are highest risk right now?',
];

interface InvestigatorPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
  disabled: boolean;
  onSendQuery: (question: string) => void;
  onResetChat: () => void;
  onSelectAssetId: (assetId: string) => void;
}

function renderFormattedText(
  text: string,
  onSelectAssetId: (assetId: string) => void
): React.ReactNode {
  const lines = text.split('\n');
  return (
    <div className="space-y-2 text-sm leading-relaxed text-slate-200">
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={lineIdx} className="h-1" />;

        const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ');
        const cleanLine = isBullet ? trimmed.slice(2) : trimmed;

        // Parse **bold** and NYC-XXX-XXXX asset IDs
        const parts = cleanLine.split(/(\*\*[^*]+\*\*|NYC-[A-Z]{3}-\d{4})/g);

        const renderedParts = parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={pIdx} className="font-semibold text-slate-50">
                {part.slice(2, -2)}
              </strong>
            );
          }
          if (/^NYC-[A-Z]{3}-\d{4}$/.test(part)) {
            return (
              <button
                key={pIdx}
                type="button"
                onClick={() => onSelectAssetId(part)}
                className="inline-flex items-center gap-0.5 font-mono text-xs font-medium text-cyan-300 underline decoration-cyan-500/40 underline-offset-2 hover:text-cyan-200 cursor-pointer"
                title={`Inspect ${part} in Remediation Queue`}
              >
                {part}
              </button>
            );
          }
          return <React.Fragment key={pIdx}>{part}</React.Fragment>;
        });

        if (isBullet) {
          return (
            <div key={lineIdx} className="flex items-start gap-2.5 pl-1">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-cyan-400" aria-hidden="true" />
              <div>{renderedParts}</div>
            </div>
          );
        }

        return <p key={lineIdx}>{renderedParts}</p>;
      })}
    </div>
  );
}

export const InvestigatorPanel: React.FC<InvestigatorPanelProps> = ({
  messages,
  isLoading,
  disabled,
  onSendQuery,
  onResetChat,
  onSelectAssetId,
}) => {
  const [input, setInput] = useState('');
  const feedEndRef = useRef<HTMLDivElement | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading || disabled) return;
    setInput('');
    onSendQuery(trimmed);
    setTimeout(() => {
      feedEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 80);
  };

  const handleChipClick = (prompt: string) => {
    if (isLoading || disabled) return;
    onSendQuery(prompt);
  };

  return (
    <section
      id="investigator"
      aria-label="Gemini AI Infrastructure Investigator"
      className="rounded-xl border border-slate-800/90 bg-[#0E1523] p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-400" aria-hidden="true" />
            <h2 className="text-base font-semibold text-slate-100">
              Gemini AI Infrastructure Investigator
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            Natural-language audit & fleet intelligence grounded directly in your active asset dataset
          </p>
        </div>

        {messages.length > 0 && (
          <button
            type="button"
            onClick={onResetChat}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            New Audit Thread
          </button>
        )}
      </div>

      {/* Starter Prompt Chips */}
      <div className="mt-4">
        <p className="text-[11px] font-medium text-slate-400 mb-2">
          Executive Audit Prompts
        </p>
        <div className="flex flex-wrap gap-2">
          {STARTER_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={isLoading || disabled}
              onClick={() => handleChipClick(prompt)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-[#0A101B] px-3 py-2 text-xs font-medium text-slate-200 hover:border-cyan-500/50 hover:text-cyan-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              <span>{prompt}</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-cyan-400 shrink-0" aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>

      {/* Conversation Feed */}
      <div className="mt-4 max-h-[420px] overflow-y-auto rounded-lg border border-slate-800/80 bg-[#090E18] p-4 space-y-5">
        {messages.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm font-medium text-slate-300">
              Ready to audit the active asset inventory
            </p>
            <p className="mt-1 text-xs text-slate-400 max-w-xl mx-auto">
              Select one of the executive prompts above or ask any question about metadata gaps, overdue inspections, OEM exposure, or category condition risk.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={
                msg.role === 'user'
                  ? 'ml-auto max-w-3xl rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-3'
                  : 'space-y-3 border-b border-slate-800/60 pb-4 last:border-b-0 last:pb-0'
              }
            >
              <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400 mb-1">
                <span className="font-medium text-slate-300">
                  {msg.role === 'user' ? 'Executive Query' : 'CivicPulse AI Analyst'}
                </span>
                <span className="font-mono tabular-nums">{msg.timestamp}</span>
              </div>

              {msg.error ? (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300">
                  {msg.error}
                </div>
              ) : msg.role === 'user' ? (
                <p className="text-sm text-slate-100">{msg.content}</p>
              ) : (
                <>
                  {renderFormattedText(msg.content, onSelectAssetId)}

                  {msg.referencedAssetIds && msg.referencedAssetIds.length > 0 && (
                    <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-slate-400">Referenced Assets:</span>
                      {msg.referencedAssetIds.slice(0, 10).map((id) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => onSelectAssetId(id)}
                          className="font-mono text-[11px] font-medium text-cyan-300 hover:text-cyan-200 underline decoration-cyan-500/40 underline-offset-2 cursor-pointer"
                        >
                          {id}
                        </button>
                      ))}
                    </div>
                  )}

                  {msg.priorityActions && msg.priorityActions.length > 0 && (
                    <div className="mt-3 rounded-lg border border-slate-800 bg-[#0E1523] divide-y divide-slate-800/80">
                      <div className="px-3.5 py-2 text-[11px] font-semibold text-slate-300">
                        Recommended Operational Actions
                      </div>
                      {msg.priorityActions.map((act: InvestigatorPriorityAction, i: number) => (
                        <div
                          key={i}
                          className="px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 text-xs"
                        >
                          <div>
                            <div className="font-medium text-slate-100">{act.title}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {act.impact}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-300 shrink-0 font-mono">
                            <span>{act.owner}</span>
                            <span aria-hidden="true">·</span>
                            <span className="text-cyan-300">{act.timeframe}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex items-center gap-2.5 text-xs text-cyan-300 py-2">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>Analyzing active dataset records with Gemini...</span>
          </div>
        )}
        <div ref={feedEndRef} />
      </div>

      {/* Query Form */}
      <form onSubmit={handleSubmit} className="mt-3 flex flex-col sm:flex-row gap-2.5">
        <label htmlFor="investigator-query" className="sr-only">
          Ask Gemini about the active infrastructure dataset
        </label>
        <input
          id="investigator-query"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={disabled || isLoading}
          placeholder={
            disabled
              ? 'Load the 500-asset NYC sample or upload a CSV to start investigating...'
              : 'Ask about metadata gaps, overdue inspections, or request a remediation plan...'
          }
          className="flex-1 rounded-lg border border-slate-700/90 bg-[#0A101B] px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || isLoading || !input.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-500 px-5 py-2.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
        >
          <Send className="h-3.5 w-3.5" aria-hidden="true" />
          Run Audit Query
        </button>
      </form>
    </section>
  );
};
