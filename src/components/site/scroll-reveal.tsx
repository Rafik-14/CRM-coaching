"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * What appears on scroll: each block inside a page section (heading, text, image, card…), or, inside a list marked
 * data-reveal-children, each item one after the other. Blocks holding a form stay still, so a field or button never
 * moves under the pointer.
 */
const TARGETS =
  "#contenu section > div > :not([data-reveal-children], :has(form)), #contenu [data-reveal-children] > *";

/**
 * Text and blocks fade in and rise slightly when they scroll into view, once, on every page of the site.
 * Only blocks still below the screen are held back, so nothing visible on arrival flickers. Web Animations are used
 * (not classes or styles) so React's HTML is never touched; without JavaScript or with « reduce motion », everything
 * simply shows.
 */
export function ScrollReveal() {
  const pathname = usePathname();
  useEffect(() => {
    if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const waiting = new Map<Element, Animation>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          waiting.get(entry.target)?.play();
          waiting.delete(entry.target);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    for (const el of document.querySelectorAll(TARGETS)) {
      if (el.getBoundingClientRect().top < window.innerHeight) continue;
      // Blocks side by side in a grid come one after the other.
      const index = Array.prototype.indexOf.call(el.parentElement?.children ?? [], el);
      const animation = el.animate(
        [
          { opacity: 0, translate: "0 24px" },
          { opacity: 1, translate: "0 0" },
        ],
        { duration: 800, delay: Math.min(index, 5) * 110, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "backwards" },
      );
      animation.pause(); // held on its first frame (hidden) until the block comes into view
      waiting.set(el, animation);
      observer.observe(el);
    }
    return () => {
      observer.disconnect();
      for (const animation of waiting.values()) animation.cancel();
    };
  }, [pathname]);
  return null;
}
