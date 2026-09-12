import React, { useState } from "react";
import { X, ArrowRight, CheckCircle2, ShieldCheck, Cpu } from "lucide-react";
import { Logo } from "../icons/Logo";
import { AiClient } from "../types";

interface OnboardingModalProps {
  isOpen: boolean;
  detectedClients: AiClient[];
  onComplete: () => void;
  onSkip: () => void;
  isStandalone?: boolean;
  onRescan?: () => Promise<void>;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  detectedClients,
  onComplete,
  onSkip,
  isStandalone = false,
  onRescan,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isScanning, setIsScanning] = useState(false);
  const [scanDone, setScanDone] = useState(false);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const runScan = async () => {
    setIsScanning(true);
    if (onRescan) {
      try {
        await onRescan();
      } catch {}
    }
    setTimeout(() => {
      setIsScanning(false);
      setScanDone(true);
    }, 600);
  };

  return (
    <div
      className={
        isStandalone
          ? "w-full flex-1 flex items-center justify-center p-4 bg-[#07080B] select-none"
          : "absolute top-[46px] inset-x-0 bottom-0 bg-[#07080B] z-40 flex items-center justify-center p-4 select-none"
      }
    >
      <div className="w-full max-w-[440px] bg-[#0E1015] border border-[#1E222D] rounded-2xl shadow-2xl overflow-hidden flex flex-col justify-between animate-in fade-in zoom-in-95 duration-200">
        {/* Top Hero Banner */}
        <div className="h-44 w-full bg-[#090B10] border-b border-[#1E222D] relative subtle-grid flex flex-col items-center justify-center">
          <button
            onClick={onSkip}
            className="absolute top-3 right-3 w-6 h-6 rounded-md flex items-center justify-center text-[#8A90A2] hover:text-white hover:bg-[#161922] transition-colors"
          >
            <X size={14} />
          </button>

          {/* Central Squircle Logo with official Omni MCP logo */}
          <div className="w-20 h-20 rounded-2xl bg-[#0B0F19] border border-[#22304A] p-2.5 shadow-2xl flex items-center justify-center relative group">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-[#38BDF8]/10 to-[#818CF8]/10 pointer-events-none"></div>
            <Logo size={54} className="relative z-10" />
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 min-h-[170px] flex flex-col justify-between">
          {currentStep === 1 && (
            <div className="space-y-2.5">
              <span className="text-[10px] font-mono text-zinc-300 bg-zinc-800/80 border border-zinc-700/60 px-2.5 py-0.5 rounded-full inline-block">
                Phase 01 • Architecture
              </span>
              <h2 className="text-base font-semibold text-white tracking-tight">
                Welcome to Omni MCP
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                The local gateway to configure, monitor, and sync Model Context Protocol servers across your AI clients with zero config friction.
              </p>
              <div className="flex items-center space-x-2 pt-1">
                <span className="text-[10px] font-mono text-zinc-400 bg-zinc-850 border border-zinc-750 px-2 py-0.5 rounded-md">
                  stdio
                </span>
                <span className="text-[10px] font-mono text-zinc-400 bg-zinc-850 border border-zinc-750 px-2 py-0.5 rounded-md">
                  sse / stream
                </span>
                <span className="text-[10px] font-mono text-zinc-400 bg-zinc-850 border border-zinc-750 px-2 py-0.5 rounded-md">
                  local vault
                </span>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-2.5">
              <span className="text-[10px] font-mono text-zinc-300 bg-zinc-800/80 border border-zinc-700/60 px-2.5 py-0.5 rounded-full inline-block">
                Phase 02 • Permissions
              </span>
              <h2 className="text-base font-semibold text-white tracking-tight">
                System File & Bridge Access
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Omni MCP requests local read and write permission to manage MCP configuration files and run background processes safely.
              </p>
              <div className="flex items-center space-x-2 pt-1 text-xs text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-[11px] text-zinc-400">All actions strictly stay local on your machine.</span>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-2.5">
              <span className="text-[10px] font-mono text-zinc-300 bg-zinc-800/80 border border-zinc-700/60 px-2.5 py-0.5 rounded-full inline-block">
                Phase 03 • Discovery
              </span>
              <h2 className="text-base font-semibold text-white tracking-tight">
                Scan AI Clients on PC
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Automatically scan your system directories to locate installed AI editors.
              </p>

              {!scanDone ? (
                <button
                  onClick={runScan}
                  disabled={isScanning}
                  className="w-full py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-200 border border-zinc-700/80 flex items-center justify-center space-x-2 transition-all active:scale-95 shadow-sm"
                >
                  <Cpu className={`w-3.5 h-3.5 text-zinc-300 ${isScanning ? "animate-spin" : ""}`} />
                  <span>{isScanning ? "Scanning machine..." : "Run Deep Scan"}</span>
                </button>
              ) : (
                <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1.5">
                  {detectedClients.length > 0 ? (
                    detectedClients.map((c) => (
                      <div key={c.id} className="flex items-center justify-between text-xs">
                        <span className="text-zinc-200 font-medium">{c.name}</span>
                        <span className="text-emerald-400 flex items-center space-x-1 text-[10px] font-mono">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Found</span>
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-[11px] font-mono text-zinc-400 text-center py-1">
                      No AI clients detected yet.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-2.5">
              <span className="text-[10px] font-mono text-[#10B981] bg-[#0C1E17] border border-[#153B2D] px-2 py-0.5 rounded-full inline-block">
                Phase 04 • Ready
              </span>
              <h2 className="text-base font-semibold text-white tracking-tight">
                Omni MCP Daemon Connected
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                The Omni MCP daemon is active and running locally. You can deploy pre-packaged MCP servers or plug custom repositories anytime.
              </p>
              <div className="flex items-center space-x-2 pt-1 text-emerald-400 text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>All detected AI clients synchronized</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls (Origin UI Style) */}
        <div className="h-14 px-5 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between shrink-0">
          {/* Carousel Dots */}
          <div className="flex items-center space-x-1.5">
            {[1, 2, 3, 4].map((step) => (
              <button
                key={step}
                onClick={() => setCurrentStep(step)}
                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  currentStep === step ? "bg-white w-3" : "bg-zinc-700 hover:bg-zinc-500"
                }`}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onSkip}
              className="text-xs font-mono text-zinc-400 hover:text-white transition-colors"
            >
              Skip
            </button>
            <button
              onClick={handleNext}
              className="h-8 px-4 rounded-full bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs flex items-center space-x-1.5 shadow-sm transition-all active:scale-95 group"
            >
              <span>{currentStep === 4 ? "Complete" : "Next"}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-150" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
