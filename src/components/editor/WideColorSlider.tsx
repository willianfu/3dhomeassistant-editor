import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";

type WideColorSliderProps = {
  ariaLabel: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  background: string;
  className?: string;
  onValueChange: (value: number) => void;
  onValueCommit: (value: number) => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function WideColorSlider({
  ariaLabel,
  min,
  max,
  step = 1,
  value,
  background,
  className,
  onValueChange,
  onValueCommit,
}: WideColorSliderProps) {
  const [draft, setDraft] = useState(value);
  const draftRef = useRef(value);

  useEffect(() => {
    setDraft(value);
    draftRef.current = value;
  }, [value]);

  const updateDraft = (nextValue: number) => {
    const next = clamp(nextValue, min, max);
    draftRef.current = next;
    setDraft(next);
    onValueChange(next);
  };

  const commitDraft = () => onValueCommit(draftRef.current);
  const ratio = max === min ? 0 : (draft - min) / (max - min);

  return (
    <div
      className={cn(
        "relative h-[74px] overflow-hidden rounded-[18px] border border-white/10 shadow-inner",
        className,
      )}
      style={{ background }}
    >
      <div className="pointer-events-none absolute inset-y-2 w-px bg-white/70 shadow-[0_0_0_1px_rgba(0,0,0,0.2)]" style={{ left: `${ratio * 100}%` }} />
      <div
        className="pointer-events-none absolute bottom-2 top-2 w-4 -translate-x-1/2 rounded-full border border-white/90 bg-white/20 shadow-lg backdrop-blur-sm"
        style={{ left: `${ratio * 100}%` }}
      />
      <input
        aria-label={ariaLabel}
        type="range"
        min={min}
        max={max}
        step={step}
        value={draft}
        className="absolute inset-0 size-full cursor-ew-resize opacity-0"
        onChange={(event) => updateDraft(Number(event.target.value))}
        onPointerUp={commitDraft}
        onTouchEnd={commitDraft}
        onKeyUp={commitDraft}
      />
    </div>
  );
}
