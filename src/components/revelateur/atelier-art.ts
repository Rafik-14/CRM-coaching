/**
 * Le Révélateur — the atelier, drawn. Eight SVG illustrations, one per part of the test, with slow
 * motion (a beam drawing in, a plinth rising, a compass needle settling…). Pure DOM, no library:
 * light enough to stay smooth on ordinary laptops and phones.
 *
 * createAtelier(root) mounts into an empty element and returns show(i) / pulse() / destroy().
 */

type Art = { svg: string; init?: (el: HTMLElement) => void; tick?: (el: HTMLElement, t: number, age: number) => void };
type Pt = [number, number];

const NV = "#172536";
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
const pts = (a: Pt[]) => a.map((p) => p.map((z) => z.toFixed(1)).join(",")).join(" ");

function defs(k: string) {
  const radial = (
    [
      ["Nv", "#53698a", "#172536", "#0c1520"],
      ["Gd", "#faecc6", "#c79e50", "#7a581c"],
      ["Iv", "#ffffff", "#efe7d9", "#c9bca5"],
      ["Tl", "#5fb0ae", "#0f6b6b", "#073c3c"],
    ] as const
  )
    .map(
      ([n, a, b, c]) =>
        `<radialGradient id="r${n}${k}" cx=".34" cy=".3" r=".8"><stop offset="0" stop-color="${a}"/><stop offset=".55" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></radialGradient>`,
    )
    .join("");
  return `<defs>
<linearGradient id="nv${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d425c"/><stop offset="1" stop-color="#111b28"/></linearGradient>
<linearGradient id="gd${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#efd9a3"/><stop offset=".5" stop-color="#c79e50"/><stop offset="1" stop-color="#8c6824"/></linearGradient>
<linearGradient id="iv${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffdf9"/><stop offset="1" stop-color="#e4d9c6"/></linearGradient>
<linearGradient id="gl${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".9"/><stop offset="1" stop-color="#9fc4ca" stop-opacity=".55"/></linearGradient>
<linearGradient id="cs${k}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>
<radialGradient id="sh${k}"><stop offset="0" stop-color="#172536" stop-opacity=".26"/><stop offset="1" stop-color="#172536" stop-opacity="0"/></radialGradient>
<radialGradient id="glow${k}"><stop offset="0" stop-color="#f3d9a2" stop-opacity=".75"/><stop offset="1" stop-color="#f3d9a2" stop-opacity="0"/></radialGradient>
${radial}</defs>`;
}
const shade = (k: string, cx: number, cy: number, rx: number, ry: number) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#sh${k})"/>`;
const svg = (k: string, body: string) => `<svg viewBox="0 0 600 600" aria-hidden="true" focusable="false">${defs(k)}${body}</svg>`;

/** Smooth path through points (Catmull-Rom to Bézier). */
function smooth(P: Pt[]) {
  let d = `M${P[0][0]},${P[0][1]}`;
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[i - 1] ?? P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] ?? p2;
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
  }
  return d;
}
const q = <T extends Element>(el: HTMLElement, s: string) => el.querySelector<T>(s);

const ART: ((reduce: boolean) => Art)[] = [
  /* 1 · prism: one beam in, five colours out */
  () => {
    const k = "a", A: Pt = [270, 150], B: Pt = [195, 400], C: Pt = [345, 400], o: Pt = [70, -26];
    const A2: Pt = [A[0] + o[0], A[1] + o[1]], B2: Pt = [B[0] + o[0], B[1] + o[1]], C2: Pt = [C[0] + o[0], C[1] + o[1]];
    const rays = ["#b8862f", "#d4a866", "#8fb3b3", "#3f8a8a", "#0f6b6b"]
      .map((c, i) => `<line class="rv-draw ray" pathLength="1" style="--d:${1.7 + i * 0.12}s" x1="384" y1="268" x2="590" y2="${168 + i * 46}" stroke="${c}" stroke-width="2.6" stroke-linecap="round"/>`)
      .join("");
    return {
      svg: svg(k, `<circle class="rv-fadein" cx="320" cy="270" r="170" fill="url(#glow${k})" style="--d:.4s"/>${shade(k, 310, 462, 200, 30)}
<ellipse cx="310" cy="430" rx="150" ry="34" fill="url(#nv${k})"/><rect x="160" y="412" width="300" height="18" fill="url(#nv${k})"/><rect x="160" y="412" width="300" height="18" fill="url(#cs${k})"/><ellipse cx="310" cy="412" rx="150" ry="34" fill="#2b3f58" stroke="#fff" stroke-opacity=".35" stroke-width=".8"/>
<line class="rv-draw" pathLength="1" style="--d:.2s" x1="10" y1="302" x2="246" y2="288" stroke="#b8862f" stroke-width="2.6" stroke-linecap="round"/>
<g stroke="${NV}" stroke-opacity=".3" stroke-dasharray="4 5" fill="none"><polyline points="${pts([A2, B2, C2])}"/></g>
<line x1="${A[0]}" y1="${A[1]}" x2="${A2[0]}" y2="${A2[1]}" stroke="${NV}" stroke-opacity=".7"/>
<polygon points="${pts([A, C, C2, A2])}" fill="url(#gl${k})" stroke="${NV}" stroke-width="1.3" stroke-linejoin="round"/>
<line class="rv-draw" pathLength="1" style="--d:1.1s" x1="246" y1="288" x2="384" y2="268" stroke="#d4a866" stroke-opacity=".75" stroke-width="2" stroke-linecap="round"/>
<polygon points="${pts([A, B, C])}" fill="url(#gl${k})" fill-opacity=".85" stroke="${NV}" stroke-width="1.5" stroke-linejoin="round"/>
<line x1="263" y1="182" x2="213" y2="386" stroke="#fff" stroke-opacity=".75" stroke-width="3" stroke-linecap="round"/>${rays}`),
      tick: (el, t) => el.querySelectorAll(".ray").forEach((r, i) => r.setAttribute("opacity", (0.62 + 0.38 * Math.sin(t * 1.1 + i * 0.9)).toFixed(3))),
    };
  },

  /* 2 · plinths: one rises to its own height */
  () => {
    const k = "b", X = [120, 180, 240, 300, 360, 420, 480], BY = [425, 437, 446, 452, 446, 437, 425], H = [95, 150, 115, 250, 105, 160, 85];
    const F = ["iv", "nv", "iv", "gd", "nv", "iv", "nv"] as const, TOP = { iv: "#fffaf1", nv: "#34496a", gd: "#efd9a6" }, w = 52;
    const cyl = (i: number) =>
      `<g${i === 3 ? ' id="rise"' : ""}>${shade(k, X[i] + 8, BY[i] + 4, w * 0.9, w * 0.22)}<ellipse cx="${X[i]}" cy="${BY[i]}" rx="${w / 2}" ry="${w * 0.17}" fill="url(#${F[i]}${k})"/><rect class="body" x="${X[i] - w / 2}" y="${BY[i] - H[i]}" width="${w}" height="${H[i]}" fill="url(#${F[i]}${k})"/><rect class="body" x="${X[i] - w / 2}" y="${BY[i] - H[i]}" width="${w}" height="${H[i]}" fill="url(#cs${k})"/><ellipse class="cap" cx="${X[i]}" cy="${BY[i] - H[i]}" rx="${w / 2}" ry="${w * 0.17}" fill="${TOP[F[i]]}" stroke="#fff" stroke-opacity=".5" stroke-width=".8"/></g>`;
    return {
      svg: svg(k, `${shade(k, 300, 470, 230, 28)}${[0, 6, 1, 5, 2, 4, 3].map(cyl).join("")}`),
      tick: (el, _t, age) => {
        const h = 90 + (250 - 90) * easeOut(Math.min(1, age / 2.8)), g = q<SVGGElement>(el, "#rise");
        if (!g) return;
        g.querySelectorAll(".body").forEach((r) => { r.setAttribute("y", String(452 - h)); r.setAttribute("height", String(h)); });
        g.querySelector(".cap")?.setAttribute("cy", String(452 - h));
      },
    };
  },

  /* 3 · page: words being written */
  () => {
    const k = "c", Q1: Pt = [170, 340], Q2: Pt = [420, 302], Q3: Pt = [475, 380], Q4: Pt = [222, 420], L: [Pt, Pt][] = [];
    const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], W = [0.86, 0.7, 0.82, 0.5, 0.76, 0.42];
    for (let j = 0; j < 6; j++) {
      const t = (j + 1) / 7.2, l = lerp(Q1, Q4, t), r = lerp(Q2, Q3, t);
      L.push([lerp(l, r, 0.09), lerp(l, r, 0.09 + W[j] * 0.82)]);
    }
    return {
      svg: svg(k, `${shade(k, 320, 470, 220, 26)}
<polygon points="140,352 430,307 498,392 202,446" fill="#2b3f58"/><polygon points="202,446 498,392 498,410 202,464" fill="url(#nv${k})"/><polygon points="202,446 498,392 498,410 202,464" fill="url(#cs${k})"/>
<polygon points="${pts([Q1, Q2, Q3, Q4].map((p): Pt => [p[0] + 6, p[1] + 7]))}" fill="#0d1520" opacity=".28"/>
<polygon points="${pts([Q1, Q2, Q3, Q4])}" fill="url(#iv${k})" stroke="${NV}" stroke-opacity=".5" stroke-width=".9"/>
${L.map(([a, b]) => `<line class="wl" pathLength="1" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${NV}" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="1" stroke-dashoffset="1"/>`).join("")}
<g id="pen"><line x1="0" y1="0" x2="78" y2="-128" stroke="url(#gd${k})" stroke-width="9" stroke-linecap="round"/><line x1="0" y1="0" x2="12" y2="-20" stroke="${NV}" stroke-width="3" stroke-linecap="round"/></g>`),
      tick: (el, t, age) => {
        const cyc = age % 9, pen = q<SVGGElement>(el, "#pen");
        let px = L[0][0][0], py = L[0][0][1];
        el.querySelectorAll(".wl").forEach((l, j) => {
          const s = cyc - 0.3 - j * 1.15, p = Math.max(0, Math.min(1, s)) * (cyc > 8.4 ? Math.max(0, 1 - (cyc - 8.4) / 0.6) : 1);
          l.setAttribute("stroke-dashoffset", (1 - p).toFixed(3));
          if (s >= 0 && s <= 1.15) { const [a, b] = L[j], m = Math.min(1, p); px = a[0] + (b[0] - a[0]) * m; py = a[1] + (b[1] - a[1]) * m; }
        });
        if (cyc > 7.2) [px, py] = L[5][1];
        pen?.setAttribute("transform", `translate(${px.toFixed(1)},${(py - 2 + Math.sin(t * 6) * 1.2).toFixed(1)})`);
      },
    };
  },

  /* 4 · two spheres, and what passes between them */
  () => {
    const k = "d";
    return {
      svg: svg(k, `${shade(k, 205, 448, 115, 20)}${shade(k, 412, 442, 92, 16)}
<path id="arc" class="rv-fadein" style="--d:.6s" d="M205,228 Q308,70 412,270" fill="none" stroke="#b8862f" stroke-width="1.4" stroke-dasharray="2 7" stroke-linecap="round"/>
<g id="sa"><circle cx="205" cy="330" r="100" fill="url(#rNv${k})"/><ellipse cx="172" cy="290" rx="26" ry="16" fill="#fff" opacity=".2" transform="rotate(-30 172 290)"/></g>
<g id="sb"><circle cx="412" cy="352" r="80" fill="url(#rGd${k})"/><ellipse cx="388" cy="322" rx="20" ry="12" fill="#fff" opacity=".45" transform="rotate(-30 388 322)"/></g>
<circle id="spk2" r="16" fill="url(#glow${k})"/><circle id="spk" r="5.5" fill="#b8862f"/>`),
      tick: (el, t) => {
        const path = q<SVGPathElement>(el, "#arc");
        if (!path) return;
        const pt = path.getPointAtLength(((1 - Math.cos(t * 0.75)) / 2) * path.getTotalLength());
        for (const s of ["#spk", "#spk2"]) { const c = q<SVGCircleElement>(el, s); c?.setAttribute("cx", pt.x.toFixed(1)); c?.setAttribute("cy", pt.y.toFixed(1)); }
        q(el, "#sa")?.setAttribute("transform", `translate(0,${(Math.sin(t * 0.8) * 4).toFixed(2)})`);
        q(el, "#sb")?.setAttribute("transform", `translate(0,${(Math.sin(t * 0.8 + 1.4) * 4).toFixed(2)})`);
      },
    };
  },

  /* 5 · balance: stones holding steady */
  () => {
    const k = "e", S: [number, number, string, number][] = [[150, 46, "Nv", 0], [118, 38, "Iv", 6], [94, 32, "Tl", -5], [70, 26, "Iv", 4], [42, 18, "Gd", -2]];
    let y = 418, prev = 0, out = "";
    S.forEach(([rx, ry, c, dx]) => {
      if (prev) y = y - prev - ry + 9;
      out += `<ellipse cx="${300 + dx}" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#r${c}${k})"/><ellipse cx="${300 + dx - rx * 0.3}" cy="${y - ry * 0.45}" rx="${rx * 0.32}" ry="${ry * 0.22}" fill="#fff" opacity="${c === "Nv" ? 0.12 : 0.35}"/>`;
      prev = ry;
    });
    return {
      svg: svg(k, `${shade(k, 300, 462, 190, 26)}<g id="stack">${out}</g>`),
      tick: (el, t) => q(el, "#stack")?.setAttribute("transform", `rotate(${(Math.sin(t * 0.8) * 1.3).toFixed(3)} 300 456)`),
    };
  },

  /* 6 · one thread through every arch */
  () => {
    const k = "f", s = [1, 0.8, 0.64, 0.51, 0.41], cx = [228, 298, 350, 392, 424], by = [462, 414, 377, 347, 323];
    const arch = (i: number) => {
      const R = 130 * s[i];
      return `${shade(k, cx[i] - R, by[i] + 2, 22 * s[i], 6 * s[i])}${shade(k, cx[i] + R, by[i] + 2, 22 * s[i], 6 * s[i])}<path d="M${cx[i] - R},${by[i]} A${R},${R} 0 0 1 ${cx[i] + R},${by[i]}" fill="none" stroke="url(#${i % 2 ? "gd" : "nv"}${k})" stroke-width="${16 * s[i]}"/>`;
    };
    const P: Pt[] = [[110, 452]];
    for (let i = 0; i < 5; i++) P.push([cx[i] + (i % 2 ? 16 : -16), by[i] - 130 * s[i] * 0.52]);
    P.push([500, 290]);
    return {
      svg: svg(k, `${shade(k, 320, 470, 230, 26)}${[4, 3, 2, 1].map(arch).join("")}<path id="thr" d="${smooth(P)}" fill="none" stroke="url(#gd${k})" stroke-width="3.2" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>${arch(0)}`),
      tick: (el, _t, age) => q(el, "#thr")?.setAttribute("stroke-dashoffset", (1 - easeOut(Math.min(1, age / 4.2))).toFixed(4)),
    };
  },

  /* 7 · an iris bringing things into focus */
  (reduce) => {
    const k = "g", c = 300, R = 150;
    return {
      svg: svg(k, `${shade(k, 300, 498, 150, 18)}<clipPath id="ic${k}"><circle cx="${c}" cy="${c}" r="${R}"/></clipPath>
<circle cx="${c}" cy="${c}" r="${R}" fill="#f3e3bf"/><circle cx="${c}" cy="${c}" r="${R * 0.8}" fill="url(#glow${k})"/>
<g id="blades" clip-path="url(#ic${k})">${Array.from({ length: 8 }, (_, i) => `<polygon fill="${i % 2 ? "#24364e" : "#1a293b"}" stroke="#efe4cf" stroke-opacity=".55" stroke-width="1"/>`).join("")}</g>
<circle cx="${c}" cy="${c}" r="${R}" fill="none" stroke="url(#gd${k})" stroke-width="18"/><circle cx="${c}" cy="${c}" r="${R + 12}" fill="none" stroke="${NV}" stroke-width="1.2"/>
${Array.from({ length: 8 }, (_, i) => { const a = (i * Math.PI) / 4 + 0.2; return `<circle cx="${c + Math.cos(a) * R}" cy="${c + Math.sin(a) * R}" r="2.6" fill="${NV}"/>`; }).join("")}`),
      tick: (el, t) => {
        const o = reduce ? 0.7 : 0.5 + 0.5 * Math.sin(t * 0.5), r = 26 + 70 * o, tw = o * 0.7;
        const V: Pt[] = Array.from({ length: 8 }, (_, i) => { const a = (i * Math.PI) / 4 + tw; return [c + Math.cos(a) * r, c + Math.sin(a) * r]; });
        const n = (a: Pt, b: Pt): Pt => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); return [dx / l, dy / l]; };
        el.querySelectorAll("#blades polygon").forEach((p, i) => {
          const v = V[i], d1 = n(V[(i + 7) % 8], v), d2 = n(v, V[(i + 1) % 8]);
          p.setAttribute("points", pts([v, [v[0] + d1[0] * 3 * R, v[1] + d1[1] * 3 * R], [v[0] + d2[0] * 3 * R, v[1] + d2[1] * 3 * R]]));
        });
      },
    };
  },

  /* 8 · a compass needle settling */
  () => {
    const k = "h", c = 300;
    const ticks = Array.from({ length: 72 }, (_, i) => {
      const a = (i * 5 * Math.PI) / 180, m = i % 18 === 0, r1 = 158, r2 = m ? 140 : i % 2 ? 152 : 148;
      return `<line x1="${c + Math.sin(a) * r1}" y1="${c - Math.cos(a) * r1}" x2="${c + Math.sin(a) * r2}" y2="${c - Math.cos(a) * r2}" stroke="${m ? "#b8862f" : NV}" stroke-opacity="${m ? 1 : 0.55}" stroke-width="${m ? 2.2 : 1}"/>`;
    }).join("");
    const letters = ([["N", 0], ["E", 90], ["S", 180], ["O", 270]] as const)
      .map(([l, d]) => { const a = (d * Math.PI) / 180; return `<text x="${c + Math.sin(a) * 118}" y="${c - Math.cos(a) * 118 + 7}" text-anchor="middle" font-family="var(--font-heading),Montserrat,sans-serif" font-size="19" font-weight="600" fill="${l === "N" ? "#a8822f" : NV}">${l}</text>`; })
      .join("");
    const cross = [0, 45, 90, 135].map((d) => { const a = (d * Math.PI) / 180; return `<line x1="${c - Math.sin(a) * 100}" y1="${c + Math.cos(a) * 100}" x2="${c + Math.sin(a) * 100}" y2="${c - Math.cos(a) * 100}"/>`; }).join("");
    return {
      svg: svg(k, `${shade(k, 300, 500, 180, 22)}<circle cx="${c}" cy="${c}" r="182" fill="url(#nv${k})"/><circle cx="${c}" cy="${c}" r="182" fill="url(#cs${k})" opacity=".6"/><circle cx="${c}" cy="${c}" r="168" fill="url(#iv${k})"/><circle cx="${c}" cy="${c}" r="164" fill="none" stroke="url(#gd${k})" stroke-width="2"/>
${ticks}${letters}<g stroke="${NV}" stroke-opacity=".12">${cross}</g>
<g id="nd"><polygon points="300,158 313,300 287,300" fill="url(#gd${k})"/><polygon points="287,300 313,300 300,442" fill="url(#nv${k})"/><line x1="300" y1="158" x2="300" y2="442" stroke="#fff" stroke-opacity=".3"/></g>
<circle cx="${c}" cy="${c}" r="11" fill="url(#rGd${k})" stroke="${NV}" stroke-width="1"/><path d="M175,230 A140,140 0 0 1 300,150" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="5" stroke-linecap="round"/>`),
      tick: (el, t, age) => {
        const a = 160 * Math.exp(-age * 0.55) * Math.cos(age * 2.4) + Math.sin(t * 0.7) * 1.2;
        q(el, "#nd")?.setAttribute("transform", `rotate(${a.toFixed(2)} 300 300)`);
      },
    };
  },
];

export const ATELIER_SCENES = ART.length;

/** Mounts the atelier into `root`. One scene at a time; the previous one lifts away when the next comes in. */
export function createAtelier(root: HTMLElement) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let cur = -1, el: HTMLElement | null = null, art: Art | null = null, enterAt = 0, raf = 0;
  let mx = 0, my = 0, px = 0, py = 0;
  const onMove = (e: MouseEvent) => { const r = root.getBoundingClientRect(); mx = (e.clientX - r.left) / r.width - 0.5; my = (e.clientY - r.top) / r.height - 0.5; };
  const onLeave = () => { mx = 0; my = 0; };
  root.addEventListener("mousemove", onMove);
  root.addEventListener("mouseleave", onLeave);

  const loop = (now: number) => {
    if (!document.hidden && el && art?.tick && !reduce) art.tick(el, now / 1000, (now - enterAt) / 1000);
    px += (mx - px) * 0.05; py += (my - py) * 0.05;
    if (!reduce) root.style.translate = `${(px * 16).toFixed(2)}px ${(py * 12).toFixed(2)}px`;
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  return {
    show(i: number) {
      if (i === cur || i < 0 || i >= ART.length) return;
      if (el) { const old = el; old.classList.add("leave"); window.setTimeout(() => old.remove(), 1000); }
      const a = ART[i](reduce), next = document.createElement("div");
      next.className = "rv-art enter";
      next.innerHTML = a.svg;
      root.appendChild(next);
      a.init?.(next);
      requestAnimationFrame(() => requestAnimationFrame(() => next.classList.remove("enter")));
      el = next; art = a; cur = i; enterAt = performance.now();
      a.tick?.(next, enterAt / 1000, reduce ? 99 : 0);
    },
    /** A small "breath" when an answer is chosen — the same for every answer. */
    pulse() {
      if (!el || reduce) return;
      el.classList.remove("pulse"); void el.offsetWidth; el.classList.add("pulse");
    },
    destroy() {
      cancelAnimationFrame(raf);
      root.removeEventListener("mousemove", onMove);
      root.removeEventListener("mouseleave", onLeave);
      root.innerHTML = "";
    },
  };
}
