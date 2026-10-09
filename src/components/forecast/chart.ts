"use client";

import { useEffect, useRef, useState } from "react";

export function niceTicks(min: number, max: number, count = 5): number[] {
  if (min === max) max = min + 1;
  const rawStep = (max - min) / count;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= end + step / 2; v += step) ticks.push(Math.round(v));
  return ticks;
}

export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}

export function roundedTopBar(x: number, yTop: number, w: number, yBase: number, radius = 4): string {
  const h = yBase - yTop;
  if (h <= 0) return "";
  const r = Math.min(radius, w / 2, h);
  return [
    `M${x},${yBase}`,
    `V${yTop + r}`,
    `Q${x},${yTop} ${x + r},${yTop}`,
    `H${x + w - r}`,
    `Q${x + w},${yTop} ${x + w},${yTop + r}`,
    `V${yBase}`,
    "Z",
  ].join(" ");
}

export const AXIS_TEXT = "fill-zinc-500 text-[11px] tabular-nums dark:fill-zinc-400";
