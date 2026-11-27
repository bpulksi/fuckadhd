// Sacred-geometry SVG builders (Seed / Flower of Life). Pure strings, stroke = currentColor.
const SQ3 = Math.sqrt(3);
const f = (n) => Math.round(n * 100) / 100;

/** Centres of a hexagonal circle lattice within `rings` steps of the origin. */
function lattice(r, rings) {
  const pts = [];
  for (let i = -rings; i <= rings; i++) {
    for (let j = -rings; j <= rings; j++) {
      const x = r * (i + j / 2);
      const y = r * (j * SQ3 / 2);
      if (Math.hypot(x, y) <= rings * r + 0.01) pts.push([x, y]);
    }
  }
  return pts;
}

const circle = (x, y, r, extra = "") => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}"${extra}/>`;

function svg(viewBox, inner, cls = "geo-svg") {
  return `<svg class="${cls}" viewBox="${viewBox}" aria-hidden="true" focusable="false">${inner}</svg>`;
}

export function seedOfLife(r = 10) {
  const pts = lattice(r, 1);
  const s = 2 * r + 2;
  return svg(`${-s} ${-s} ${2 * s} ${2 * s}`, pts.map(([x, y]) => circle(x, y, r)).join("") + circle(0, 0, 2 * r));
}

export function flowerOfLife(r = 10, rings = 2, outerRings = 1) {
  const pts = lattice(r, rings);
  let inner = pts.map(([x, y]) => circle(x, y, r)).join("");
  for (let k = 0; k < outerRings; k++) inner += circle(0, 0, (rings + 1) * r + k * r * 0.35);
  const s = (rings + 1) * r + outerRings * r * 0.35 + 2;
  return svg(`${-s} ${-s} ${2 * s} ${2 * s}`, inner);
}

/** Flower whose circles draw themselves in (burst overlay). */
export function flowerDraw(r = 10) {
  const pts = lattice(r, 2);
  const inner = pts.map(([x, y], i) => circle(x, y, r, ` pathLength="100" style="--i:${i}"`)).join("")
    + circle(0, 0, 3 * r, ` pathLength="100" style="--i:${pts.length}"`);
  const s = 3 * r + 2;
  return svg(`${-s} ${-s} ${2 * s} ${2 * s}`, inner);
}

/** Seed of Life whose six petals move out on the in-breath (CSS drives --dx/--dy). */
export function seedBreath(r = 26) {
  let petals = "";
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI / 3) * k - Math.PI / 2;
    petals += circle(0, 0, r, ` class="petal" style="--dx:${f(Math.cos(a) * r)}px;--dy:${f(Math.sin(a) * r)}px"`);
  }
  const s = 2 * r + 4;
  return svg(`${-s} ${-s} ${2 * s} ${2 * s}`, `<g class="core">${circle(0, 0, r)}${circle(0, 0, 2 * r)}</g>${petals}`);
}

/** Circles only (no <svg> wrapper) centred at (cx, cy), for embedding in an existing SVG. */
export function seedCircles(cx, cy, r) {
  return lattice(r, 1).map(([x, y]) => circle(cx + x, cy + y, r)).join("") + circle(cx, cy, 2 * r);
}

const BUILDERS = {
  seed: () => seedOfLife(10),
  flower: () => flowerOfLife(10, 2, 2),
  "flower-draw": () => flowerDraw(10),
  "seed-breath": () => seedBreath(26)
};

/** Fill every [data-geo] element, the background, and [data-geo-svg] groups. */
export function mountGeometry(root = document) {
  root.querySelectorAll("[data-geo]").forEach((el) => {
    const build = BUILDERS[el.dataset.geo];
    if (build && !el.firstElementChild) el.innerHTML = build();
  });
  root.querySelectorAll("[data-geo-svg='seed']").forEach((g) => {
    g.innerHTML = seedCircles(110, 110, 34) + `<circle cx="110" cy="110" r="88"/>`;
    g.querySelectorAll("circle").forEach((c) => c.setAttribute("class", "geo-line"));
  });
  const bg = document.getElementById("bgGeometry");
  if (bg && !bg.firstElementChild) bg.innerHTML = flowerOfLife(10, 3, 3);
}
