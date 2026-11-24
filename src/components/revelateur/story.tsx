"use client";

import { useEffect, useRef, useState } from "react";
import Image, { type StaticImageData } from "next/image";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import portrait from "@/assets/site/apropos.webp";
import workshop from "@/assets/site/evenements-amphi.webp";
import board from "@/assets/site/methode-jeremy.webp";
import field from "@/assets/site/apropos-futsal.webp";
import { MONOGRAM_LETTERS, MONOGRAM_MARK, MONOGRAM_VIEWBOX } from "./monogram";

export type StoryTexts = {
  /** Validated opening lines (cahier des charges §2.1). */
  intro: readonly string[];
  welcome: { title: string; paragraphs: readonly string[]; closing: string };
  ownership: string;
};

/**
 * Le Révélateur — the story page. A navy screen where the JG® monogram draws itself, then Jérémy's
 * story in his own words (his « À propos » page) with the site's photos, the test explained with the
 * validated welcome texts, and the start. A floating button starts the test from anywhere.
 * The start closes a navy curtain; the test page opens behind it and lifts the same curtain.
 */
export function RevelateurStory({ texts }: { texts: StoryTexts }) {
  const router = useRouter();
  const root = useRef<HTMLDivElement>(null);
  const [opened, setOpened] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [count, setCount] = useState(0);
  const presents = texts.intro[0];
  const [title, subtitle, tagline, ready, meta] = texts.intro.slice(4);

  // The logo draws itself on navy, then the navy lifts. Skipped when motion is reduced.
  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce) {
      const t = window.setTimeout(() => setOpened(true), 0);
      return () => window.clearTimeout(t);
    }
    document.documentElement.classList.add("rs-locked");
    window.scrollTo(0, 0);
    const timers = [
      ...Array.from({ length: 21 }, (_, k) =>
        window.setTimeout(() => setCount(k * 5), k * 150),
      ),
      window.setTimeout(() => {
        setOpened(true);
        document.documentElement.classList.remove("rs-locked");
      }, 3600),
    ];
    return () => {
      timers.forEach(clearTimeout);
      document.documentElement.classList.remove("rs-locked");
    };
  }, []);

  // Scroll-driven motion: text lines rising, photos opening and drifting, the thread drawing itself.
  useEffect(() => {
    const el = root.current;
    if (!el || !opened) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const blocks = [...el.querySelectorAll<HTMLElement>("[data-r]")];
    blocks.forEach((b) =>
      b
        .querySelectorAll<HTMLElement>(".rs-ln > span")
        .forEach((s, i) => (s.style.transitionDelay = `${i * 95}ms`)),
    );
    if (reduce) {
      blocks.forEach((b) => b.classList.add("is-in"));
      return;
    }
    const hero = el.querySelector<HTMLElement>("[data-hero]"),
      cue = el.querySelector<HTMLElement>("[data-cue]");
    const expand = el.querySelector<HTMLElement>("[data-expand]"),
      frame = el.querySelector<HTMLElement>("[data-frame]");
    const fimg = frame?.querySelector<HTMLElement>("img"),
      cap = el.querySelector<HTMLElement>("[data-cap]"),
      shadeEl = el.querySelector<HTMLElement>("[data-shade]");
    const thread = el.querySelector<HTMLElement>("[data-thread]"),
      path = el.querySelector<SVGPathElement>("[data-thread-path]");
    const dots = [...el.querySelectorAll<SVGGElement>("[data-thread-dot]")],
      words = [...el.querySelectorAll<HTMLElement>("[data-k]")];
    const photos = [...el.querySelectorAll<HTMLElement>("[data-px]")],
      fab = el.querySelector<HTMLElement>("[data-fab]");
    const foot = el.querySelector<HTMLElement>("[data-foot]"),
      bar = el.querySelector<HTMLElement>("[data-progress]");
    const clamp = (v: number) => Math.max(0, Math.min(1, v));
    let raf = 0;
    const frameLoop = () => {
      const st = window.scrollY,
        H = window.innerHeight;
      blocks.forEach((b) => {
        if (
          !b.classList.contains("is-in") &&
          b.getBoundingClientRect().top < H * 0.86
        )
          b.classList.add("is-in");
      });
      if (hero) {
        hero.style.transform = `translateY(${st * 0.3}px)`;
        hero.style.opacity = String(1 - clamp(st / (H * 0.7)));
      }
      if (cue) cue.style.opacity = st > 20 ? "0" : "1";
      if (expand && frame) {
        const r = expand.getBoundingClientRect(),
          pe = clamp((H - r.top) / (H * 0.85)),
          iv = (1 - pe) * 10,
          ih = (1 - pe) * 42;
        frame.style.clipPath = `inset(${iv}% ${ih}% ${iv}% ${ih}% round 22px)`;
        if (fimg) fimg.style.transform = `scale(${1.3 - 0.3 * pe})`;
        if (cap) cap.style.opacity = pe > 0.9 ? "1" : "0";
        if (shadeEl) shadeEl.style.opacity = pe > 0.72 ? "1" : "0";
      }
      photos.forEach((p) => {
        if (!p.classList.contains("is-in")) return;
        const b = p.getBoundingClientRect(),
          c = (b.top + b.height / 2 - H / 2) / H,
          im = p.querySelector<HTMLElement>("img");
        if (im) im.style.translate = `0 ${c * -40}px`;
      });
      if (thread && path) {
        const tr = thread.getBoundingClientRect(),
          p = clamp((H * 0.7 - tr.top) / (tr.height * 0.85));
        path.style.strokeDashoffset = String(1 - p);
        dots.forEach((g, i) => (g.style.opacity = p > i / 4.4 ? "1" : "0"));
        words.forEach((k, i) =>
          k.classList.toggle("is-on", p > 0.15 + i * 0.22),
        );
      }
      const max = document.documentElement.scrollHeight - H;
      if (bar) bar.style.height = `${max > 0 ? (st / max) * 100 : 0}%`;
      if (fab && foot)
        fab.classList.toggle(
          "is-on",
          st > H * 0.6 && foot.getBoundingClientRect().top > H * 0.4,
        );
      raf = requestAnimationFrame(frameLoop);
    };
    raf = requestAnimationFrame(frameLoop);

    // Photos lean toward the cursor while hovered, and settle back when it leaves.
    const offs = photos.map((p) => {
      const move = (e: MouseEvent) => {
        const b = p.getBoundingClientRect();
        p.style.translate = `${(e.clientX - b.left - b.width / 2) * 0.05}px ${(e.clientY - b.top - b.height / 2) * 0.05}px`;
      };
      const out = () => (p.style.translate = "0 0");
      p.addEventListener("mousemove", move);
      p.addEventListener("mouseleave", out);
      return () => {
        p.removeEventListener("mousemove", move);
        p.removeEventListener("mouseleave", out);
      };
    });
    // The floating button leans toward the cursor too.
    const magnet = (e: MouseEvent) => {
      if (!fab?.classList.contains("is-on")) return;
      const b = fab.getBoundingClientRect(),
        dx = e.clientX - (b.left + b.width / 2),
        dy = e.clientY - (b.top + b.height / 2);
      fab.style.translate =
        Math.hypot(dx, dy) < 120 ? `${dx * 0.22}px ${dy * 0.22}px` : "0 0";
    };
    window.addEventListener("mousemove", magnet);
    return () => {
      cancelAnimationFrame(raf);
      offs.forEach((f) => f());
      window.removeEventListener("mousemove", magnet);
    };
  }, [opened]);

  const start = () => {
    if (leaving) return;
    setLeaving(true);
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    router.prefetch("/revelateur/experience");
    window.setTimeout(
      () => router.push("/revelateur/experience"),
      reduce ? 0 : 1350,
    );
  };

  const W = 1000,
    TH = 180,
    P: [number, number][] = [
      [40, TH * 0.72],
      [270, TH * 0.3],
      [500, TH * 0.64],
      [730, TH * 0.22],
      [960, TH * 0.5],
    ];
  const threadPath = P.slice(1).reduce((d, b, i) => {
    const a = P[i],
      mx = (a[0] + b[0]) / 2;
    return `${d} C${mx},${a[1]} ${mx},${b[1]} ${b[0]},${b[1]}`;
  }, `M${P[0][0]},${P[0][1]}`);

  return (
    <div ref={root} className="rs">
      <div className={cn("rs-loader", opened && "is-gone")} aria-hidden>
        <svg viewBox={MONOGRAM_VIEWBOX} className="rs-loader-logo">
          <path
            className="rs-logo-letters"
            d={MONOGRAM_LETTERS}
            pathLength={1}
            fillRule="evenodd"
          />
          <path className="rs-logo-mark" d={MONOGRAM_MARK} fillRule="evenodd" />
        </svg>
        <p className="rs-loader-presents">{presents}</p>
        <span className="rs-loader-count">
          {String(count).padStart(3, "0")}
        </span>
        <span className="rs-loader-name">Le Révélateur</span>
      </div>

      <section className="rs-hero">
        <div className="rs-wrap rs-hero-inner" data-hero data-r>
          <p className="rs-label rs-gold rs-fd">Jérémy Galéa · Méthode JG®</p>
          <h1 className="rs-big">
            <Lines
              lines={[
                "Je ne cherche pas à vous",
                "faire devenir quelqu’un",
                "d’autre.",
              ]}
            />
          </h1>
          <p className="rs-mid rs-soft rs-fd">
            Je cherche à comprendre ce qui est déjà là.
          </p>
        </div>
        <div className="rs-cue" data-cue>
          <span className="rs-label rs-soft">Faites défiler</span>
          <i />
        </div>
      </section>

      <section className="rs-expand" data-expand aria-label="Jérémy Galéa">
        <div className="rs-frame" data-frame>
          <Image
            src={portrait}
            alt="Jérémy Galéa, assis dans un fauteuil, souriant."
            fill
            priority
            sizes="(max-width: 600px) 100vw, 74vh"
            style={{ objectPosition: "50% 12%" }}
          />
          <div className="rs-shade" data-shade />
          <div className="rs-cap" data-cap>
            <p className="rs-label rs-gold-light">Jérémy Galéa</p>
            <p className="rs-mid">
              Formateur pour adultes et coach depuis plus de 10 ans.
            </p>
          </div>
        </div>
      </section>

      <section className="rs-wrap rs-row">
        <div className="rs-text" data-r>
          <p className="rs-label rs-soft rs-fd">Le constat</p>
          <p className="rs-mid">
            <Lines
              lines={["Des personnes brillantes,", "expérimentées, engagées."]}
            />
          </p>
          <p className="rs-mid rs-soft">
            <Lines
              lines={[
                "Ils savaient ce qu’ils valaient.",
                "Mais ils ne trouvaient pas les mots",
                "pour le rendre évident.",
              ]}
            />
          </p>
        </div>
        <Photo
          src={workshop}
          alt="Jérémy Galéa face à un groupe, lors d’une conférence."
          position="20% 38%"
        />
      </section>

      <section className="rs-thread" data-thread>
        <div className="rs-wrap rs-row rs-flip">
          <Photo
            src={board}
            alt="Jérémy Galéa au tableau, en séance."
            position="50% 22%"
          />
          <div className="rs-text" data-r>
            <p className="rs-label rs-soft rs-fd">Le regard</p>
            <p className="rs-big">
              {[
                "Je cherche les liens.",
                "Les constantes.",
                "Les corrélations.",
              ].map((l) => (
                <span key={l} className="rs-ln">
                  <span>
                    <span data-k className="rs-k">
                      {l}
                    </span>
                  </span>
                </span>
              ))}
            </p>
          </div>
        </div>
        <div className="rs-wrap">
          <svg
            className="rs-thread-svg"
            viewBox={`0 0 ${W} ${TH}`}
            preserveAspectRatio="none"
            aria-hidden
          >
            <path
              data-thread-path
              d={threadPath}
              pathLength={1}
              fill="none"
              stroke="#a8823f"
              strokeWidth="1.2"
              vectorEffect="non-scaling-stroke"
            />
            {P.map(([x, y]) => (
              <g key={x} data-thread-dot className="rs-thread-dot">
                <ellipse
                  cx={x}
                  cy={y}
                  rx="11"
                  ry="11"
                  fill="none"
                  stroke="rgba(168,130,63,.35)"
                  vectorEffect="non-scaling-stroke"
                />
                <ellipse cx={x} cy={y} rx="4.5" ry="4.5" fill="#172536" />
              </g>
            ))}
          </svg>
        </div>
      </section>

      <section className="rs-wrap rs-field">
        <Photo
          src={field}
          alt="Une équipe de futsal célèbre une victoire avec son trophée."
          wide
        />
        <div className="rs-under" data-r>
          <p className="rs-label rs-soft rs-fd">Sur le terrain</p>
          <p className="rs-mid">
            <Lines lines={["Deux univers différents,"]} />
            <Lines lines={["mais une même conviction."]} className="rs-soft" />
          </p>
        </div>
      </section>

      <section className="rs-wrap rs-solo">
        <div className="rs-text rs-center" data-r>
          <p className="rs-label rs-soft rs-fd">La conviction</p>
          <p className="rs-mid">
            <Lines lines={["Leur valeur était souvent déjà là."]} />
          </p>
          <p className="rs-mid rs-soft">
            <Lines
              lines={[
                "Elle avait simplement besoin d’être comprise,",
                "mise en cohérence et rendue lisible.",
              ]}
            />
          </p>
          <p className="rs-label rs-gold rs-fd">
            C’est de cette conviction qu’est née la Méthode JG®
          </p>
        </div>
      </section>

      {/* The test, with the validated welcome texts (dossier maître v2.0 §2). */}
      <section className="rs-wrap rs-test" aria-labelledby="rs-test-title">
        <div className="rs-text" data-r>
          <p className="rs-label rs-gold rs-fd">
            {title} · {subtitle}
          </p>
          <h2 id="rs-test-title" className="rs-big">
            <Lines lines={[texts.welcome.title]} />
          </h2>
          {texts.welcome.paragraphs.slice(0, 2).map((p) => (
            <p key={p} className="rs-mid rs-soft rs-fd">
              {p}
            </p>
          ))}
        </div>
        <dl className="rs-facts rs-fd" data-r>
          <div>
            <dt>30</dt>
            <dd>questions, une à la fois</dd>
          </div>
          <div>
            <dt>5</dt>
            <dd>dimensions de votre valeur</dd>
          </div>
          <div>
            <dt>9 min</dt>
            <dd>environ, à votre rythme</dd>
          </div>
          <div>
            <dt>1</dt>
            <dd>rapport personnalisé, envoyé par e-mail</dd>
          </div>
        </dl>
        <div className="rs-text" data-r>
          {texts.welcome.paragraphs.slice(3).map((p) => (
            <p key={p} className="rs-mid rs-fd">
              {p}
            </p>
          ))}
          <p className="rs-label rs-gold rs-fd">{texts.welcome.closing}</p>
        </div>
      </section>

      <section className="rs-foot" data-foot>
        <div className="rs-wrap rs-foot-inner" data-r>
          <p className="rs-mid rs-foot-quote">
            <Lines
              lines={[
                "Parfois, la réponse n’est pas de chercher davantage.",
                "Elle consiste simplement à regarder autrement",
                "ce qui était déjà là.",
              ]}
            />
          </p>
          <div className="rs-foot-meta rs-fd">
            <p className="rs-label rs-gold-light">
              {title} · {subtitle}
            </p>
            <p className="rs-foot-tagline">{tagline}</p>
            <p className="rs-label rs-foot-ready">{ready}</p>
            <p className="rs-label rs-foot-facts">{meta}</p>
            <button type="button" className="rs-start" onClick={start}>
              <span>Je commence l’expérience</span>
            </button>
          </div>
          <p className="rs-legal">{texts.ownership}</p>
        </div>
      </section>

      <div className="rs-progress" aria-hidden>
        <i data-progress />
      </div>
      <button
        type="button"
        className="rs-fab"
        data-fab
        onClick={start}
        aria-label="Commencer le test"
      >
        <svg className="rs-fab-ring" viewBox="0 0 104 104" aria-hidden>
          <defs>
            <path
              id="rs-circ"
              d="M52,52 m-37,0 a37,37 0 1,1 74,0 a37,37 0 1,1 -74,0"
            />
          </defs>
          <text>
            <textPath href="#rs-circ">
              COMMENCER LE TEST · LE RÉVÉLATEUR ·{" "}
            </textPath>
          </text>
        </svg>
        <span className="rs-fab-core" aria-hidden>
          ↗
        </span>
      </button>
      <div className={cn("rv-curtain is-up", leaving && "is-down")} aria-hidden>
        <span>Le Révélateur</span>
      </div>
    </div>
  );
}

/** Lines of text that rise one after another when their block scrolls into view. */
function Lines({ lines, className }: { lines: string[]; className?: string }) {
  return (
    <>
      {lines.map((l) => (
        <span key={l} className={cn("rs-ln", className)}>
          <span>{l}</span>
        </span>
      ))}
    </>
  );
}
function Photo({
  src,
  alt,
  position,
  wide,
}: {
  src: StaticImageData;
  alt: string;
  position?: string;
  wide?: boolean;
}) {
  return (
    <div className={cn("rs-ph", wide && "rs-ph-wide")} data-r data-px>
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 600px) 100vw, 50vw"
        style={{ objectPosition: position }}
      />
    </div>
  );
}
