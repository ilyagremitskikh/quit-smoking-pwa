import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

interface HoldButtonProps {
  children: ReactNode;
  holdMs: number;
  disabled?: boolean;
  className?: string;
  fillClassName?: string;
  onConfirm: () => void | Promise<void>;
}

export function HoldButton({
  children,
  holdMs,
  disabled,
  className = "",
  fillClassName = "bg-emerald-700/25",
  onConfirm
}: HoldButtonProps) {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const startRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const confirmedRef = useRef(false);

  useEffect(() => () => stopFrame(), []);

  function stopFrame() {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }

  function begin() {
    if (disabled) {
      return;
    }
    confirmedRef.current = false;
    startRef.current = performance.now();
    setHolding(true);
    setProgress(0);
    tick();
  }

  function tick() {
    const startedAt = startRef.current;
    if (startedAt === null) {
      return;
    }
    const nextProgress = Math.min(1, (performance.now() - startedAt) / holdMs);
    setProgress(nextProgress);
    if (nextProgress >= 1 && !confirmedRef.current) {
      confirmedRef.current = true;
      end(true);
      void onConfirm();
      return;
    }
    frameRef.current = window.requestAnimationFrame(tick);
  }

  function end(confirmed = false) {
    stopFrame();
    startRef.current = null;
    setHolding(false);
    if (!confirmed) {
      setProgress(0);
    }
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={begin}
      onPointerUp={() => end()}
      onPointerCancel={() => end()}
      onPointerLeave={() => end()}
      className={[
        "tap-button relative isolate overflow-hidden select-none disabled:cursor-not-allowed disabled:opacity-60",
        holding ? "hold-active" : "",
        className
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 -z-10 transition-[width] duration-75 ${fillClassName}`}
        style={{ width: `${Math.round(progress * 100)}%` }}
      />
      {children}
    </button>
  );
}
