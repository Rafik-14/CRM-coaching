"use client";

import { useRef } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { illustrations, type IllustrationName } from "./registry";

const MAX_TILT = 10; // degrees
const PARALLAX = 10; // px the backdrop disc moves against the figure

/**
 * Gives a flat 3D render depth:
 * - the scene tilts toward the mouse (CSS perspective + rotateX/Y),
 * - the backdrop disc and the figure move by different amounts (parallax),
 * - the figure floats gently while its floor shadow breathes.
 * Motion is skipped for touch input and when the OS asks for reduced motion (see globals.css).
 */
export function Illustration3D({
  name,
  alt,
  height = 180,
  disc = true,
  priority,
  className,
}: {
  name: IllustrationName;
  /** Empty string when purely decorative. */
  alt: string;
  height?: number;
  disc?: boolean;
  priority?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const img = illustrations[name];
  const width = Math.round((img.width / img.height) * height);
  // Wide images (sofa) get a wider stage; the disc stays round.
  const stage = Math.max(width, height * 0.8);

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5; // -0.5 … 0.5
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--ry", `${(x * MAX_TILT * 2).toFixed(2)}deg`);
    el.style.setProperty("--rx", `${(-y * MAX_TILT * 2).toFixed(2)}deg`);
    el.style.setProperty("--px", `${(x * PARALLAX).toFixed(1)}px`);
    el.style.setProperty("--py", `${(y * PARALLAX).toFixed(1)}px`);
  }

  function reset() {
    const el = ref.current;
    if (!el) return;
    for (const v of ["--rx", "--ry", "--px", "--py"]) el.style.removeProperty(v);
  }

  return (
    <div
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={reset}
      className={cn("illu-root relative shrink-0 select-none", className)}
      style={{ width: stage, height: height * 1.08, perspective: 900 }}
    >
      <div className="illu-scene relative size-full">
        {disc && (
          <div
            aria-hidden
            className="illu-disc absolute left-1/2 rounded-full bg-primary/12 ring-1 ring-primary/20 dark:bg-primary/20 dark:ring-primary/30"
            style={{ width: height * 0.82, height: height * 0.82, bottom: height * 0.1 }}
          />
        )}
        <div
          aria-hidden
          className="illu-shadow absolute left-1/2 rounded-[50%] bg-black/25 blur-md dark:bg-black/70"
          style={{ width: Math.min(width, height) * 0.55, height: height * 0.06, bottom: height * 0.02 }}
        />
        <div className="illu-figure absolute inset-x-0 bottom-[3%] flex justify-center">
          <div className="illu-float">
            <Image
              src={img}
              alt={alt}
              height={height}
              width={width}
              priority={priority}
              // Files are pre-optimized (~25 KB, 640 px tall): serve as-is so they stay sharp at any size.
              unoptimized
              draggable={false}
              className="drop-shadow-[0_10px_14px_rgba(0,0,0,0.18)]"
              style={{ height, width }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
