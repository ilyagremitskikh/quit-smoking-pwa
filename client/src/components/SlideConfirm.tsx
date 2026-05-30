import { useEffect, useRef, useState } from "react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import { hapticLight, hapticSuccess, hapticTick } from "../lib/haptics.js";

const EDGE_PX = 4;
const THUMB_PX = 54;
const CONFIRM_THRESHOLD = 88;
const RESET_DELAY_MS = 520;

interface SlideConfirmProps {
  label: ReactNode;
  completeLabel: ReactNode;
  hint: string;
  tone: "mint" | "amber";
  disabled?: boolean;
  className?: string;
  thumbIcon: ReactNode;
  labelIcon?: ReactNode;
  onConfirm: () => void | Promise<void>;
}

type SlideStyle = CSSProperties & {
  "--slide-accent": string;
  "--slide-accent-2": string;
  "--slide-accent-soft": string;
  "--slide-accent-ink": string;
};

const toneVars: Record<SlideConfirmProps["tone"], SlideStyle> = {
  mint: {
    "--slide-accent": "#16a36b",
    "--slide-accent-2": "#1fb978",
    "--slide-accent-soft": "#dff3e9",
    "--slide-accent-ink": "#0f7a50"
  },
  amber: {
    "--slide-accent": "#d89426",
    "--slide-accent-2": "#e8b558",
    "--slide-accent-soft": "#f8edd8",
    "--slide-accent-ink": "#9a6415"
  }
};

export function SlideConfirm({
  label,
  completeLabel,
  hint,
  tone,
  disabled,
  className = "",
  thumbIcon,
  labelIcon,
  onConfirm
}: SlideConfirmProps) {
  const [value, setValue] = useState(0);
  const [status, setStatus] = useState<"idle" | "dragging" | "complete" | "resetting">("idle");
  const [maxTravel, setMaxTravel] = useState(0);
  const [rippleKey, setRippleKey] = useState(0);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const rangeRef = useRef<HTMLInputElement | null>(null);
  const switchRef = useRef<HTMLInputElement | null>(null);
  const activeRef = useRef(false);
  const confirmedRef = useRef(false);
  const tickedRef = useRef(false);
  const valueRef = useRef(0);
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    switchRef.current?.setAttribute("switch", "");
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) {
      return;
    }

    const update = () => {
      const width = track.getBoundingClientRect().width;
      setMaxTravel(Math.max(0, width - THUMB_PX - EDGE_PX * 2));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  useEffect(
    () => () => {
      clearResetTimer();
    },
    []
  );

  useEffect(() => {
    if (disabled && status !== "complete") {
      reset(false);
    }
  }, [disabled, status]);

  function clearResetTimer() {
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  }

  function setSliderValue(next: number) {
    const clamped = Math.max(0, Math.min(100, next));
    valueRef.current = clamped;
    setValue(clamped);
  }

  function begin() {
    if (disabled || activeRef.current || confirmedRef.current || status === "complete") {
      return;
    }
    clearResetTimer();
    activeRef.current = true;
    tickedRef.current = false;
    setStatus("dragging");
    hapticLight();
  }

  function handleInput(event: FormEvent<HTMLInputElement>) {
    if (disabled || confirmedRef.current) {
      return;
    }
    if (!activeRef.current) {
      begin();
    }
    const next = event.currentTarget.valueAsNumber;
    setSliderValue(Number.isFinite(next) ? next : 0);
    if (next >= 90 && !tickedRef.current) {
      tickedRef.current = true;
      triggerSwitch();
      hapticTick();
    }
  }

  function release() {
    if (!activeRef.current || confirmedRef.current) {
      return;
    }
    activeRef.current = false;
    if (valueRef.current >= CONFIRM_THRESHOLD) {
      confirm();
      return;
    }
    reset(true);
  }

  function confirm() {
    confirmedRef.current = true;
    tickedRef.current = true;
    setSliderValue(100);
    setStatus("complete");
    setRippleKey((key) => key + 1);
    triggerSwitch();
    hapticSuccess();
    void Promise.resolve(onConfirm()).finally(() => {
      resetTimerRef.current = window.setTimeout(() => reset(true), RESET_DELAY_MS);
    });
  }

  function reset(animated: boolean) {
    activeRef.current = false;
    confirmedRef.current = false;
    tickedRef.current = false;
    clearResetTimer();
    setStatus(animated ? "resetting" : "idle");
    setSliderValue(0);
    if (animated) {
      resetTimerRef.current = window.setTimeout(() => {
        setStatus("idle");
        resetTimerRef.current = null;
      }, 320);
    }
  }

  function triggerSwitch() {
    const input = switchRef.current;
    if (!input) {
      return;
    }
    input.checked = !input.checked;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  const progress = value / 100;
  const travel = Math.round(maxTravel * progress);
  const fillWidth = Math.round(THUMB_PX + travel);
  const isComplete = status === "complete";
  const visualLabel = isComplete ? completeLabel : label;

  return (
    <div
      className={[
        "slide-confirm",
        `slide-confirm-${tone}`,
        status === "dragging" ? "is-dragging" : "",
        status === "complete" ? "is-complete" : "",
        status === "resetting" ? "is-resetting" : "",
        disabled ? "is-disabled" : "",
        className
      ].join(" ")}
      style={toneVars[tone]}
    >
      <div ref={trackRef} className="slide-confirm-track">
        <div className="slide-confirm-fill" style={{ width: `${fillWidth}px` }} />
        <div className="slide-confirm-label">
          {labelIcon ? <span className="slide-confirm-label-icon">{labelIcon}</span> : null}
          <span>{visualLabel}</span>
          {!isComplete ? (
            <span className="slide-confirm-chevrons" aria-hidden="true">
              <span>›</span>
              <span>›</span>
              <span>›</span>
            </span>
          ) : null}
        </div>
        <div className="slide-confirm-thumb" style={{ transform: `translateX(${travel}px)` }}>
          <span className="slide-confirm-thumb-icon">{thumbIcon}</span>
        </div>
        {rippleKey > 0 ? (
          <span
            key={rippleKey}
            className="slide-confirm-ripple"
            style={{ left: `${EDGE_PX + travel + THUMB_PX / 2}px` }}
            aria-hidden="true"
          />
        ) : null}
        <input
          ref={rangeRef}
          aria-label={typeof label === "string" ? label : "Подтвердить действием"}
          className="slide-confirm-range"
          type="range"
          min="0"
          max="100"
          step="1"
          value={value}
          disabled={disabled || isComplete}
          onPointerDown={begin}
          onTouchStart={begin}
          onMouseDown={begin}
          onInput={handleInput}
          onChange={handleInput}
          onPointerUp={release}
          onPointerCancel={release}
          onTouchEnd={release}
          onMouseUp={release}
          onBlur={release}
        />
        <input ref={switchRef} type="checkbox" tabIndex={-1} aria-hidden="true" className="slide-confirm-switch" />
      </div>
      <p className="slide-confirm-hint">{hint}</p>
    </div>
  );
}
