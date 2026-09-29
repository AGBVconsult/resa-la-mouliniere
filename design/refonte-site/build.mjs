// Assemble la maquette en un seul fichier HTML autonome (polices, icônes et scripts intégrés).
// Usage : node design/refonte-site/build.mjs
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const src = (p) => join(root, "src", p);
const read = (p) => readFileSync(src(p), "utf8");

const fonts = [
  { family: "Bodoni Moda", style: "normal", weight: "400 900", file: "bodoni-moda-roman.woff2" },
  { family: "Bodoni Moda", style: "italic", weight: "400 900", file: "bodoni-moda-italic.woff2" },
  { family: "Karla", style: "normal", weight: "200 800", file: "karla-roman.woff2" },
  { family: "Karla", style: "italic", weight: "200 800", file: "karla-italic.woff2" },
];

const fontFaces = fonts
  .map(({ family, style, weight, file }) => {
    const b64 = readFileSync(src(`assets/fonts/${file}`)).toString("base64");
    return `@font-face{font-family:"${family}";font-style:${style};font-weight:${weight};font-display:swap;src:url(data:font/woff2;base64,${b64}) format("woff2");}`;
  })
  .join("\n");

const iconDir = src("assets/icons");
const icons = readdirSync(iconDir)
  .filter((f) => f.endsWith(".svg"))
  .map((f) => {
    const svg = readFileSync(join(iconDir, f), "utf8");
    const viewBox = svg.match(/viewBox="([^"]+)"/)[1];
    const inner = svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
    return `<symbol id="i-${f.replace(".svg", "")}" viewBox="${viewBox}" fill="currentColor">${inner}</symbol>`;
  });

const logo = read("assets/logo-coquille.svg");
const logoViewBox = logo.match(/viewBox="([^"]+)"/)[1];
const logoPath = logo.match(/<path d="([^"]+)"/)[1];
const logoSymbol = `<symbol id="logo-coquille" viewBox="${logoViewBox}" fill="currentColor"><path fill-rule="evenodd" d="${logoPath}"/></symbol>`;

const sprite = `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden">${logoSymbol}${icons.join("")}</svg>`;

const css = read("styles.css").replace("/*@FONTS*/", fontFaces);
const js = ["menu.js", "i18n.js", "app.js"].map(read).join("\n\n");

const html = read("template.html")
  .replace("<!-- @styles -->", () => `<style>\n${css}\n</style>`)
  .replace("<!-- @sprite -->", () => sprite)
  .replace("<!-- @scripts -->", () => `<script>\n${js}\n</script>`);

writeFileSync(join(root, "index.html"), html);
console.log(`index.html écrit (${(html.length / 1024).toFixed(0)} Ko)`);
