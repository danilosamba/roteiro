// Gera os ícones PNG a partir de public/icon.svg (o iPhone não aceita SVG na tela inicial).
import sharp from "sharp";
import { readFileSync } from "node:fs";

// versão quadrada, sem cantos arredondados: o iOS e o Android arredondam sozinhos
const svg = readFileSync("public/icon.svg", "utf8").replace(/ rx="112"/, "");
for (const [file, size] of [["apple-touch-icon.png", 180], ["icon-192.png", 192], ["icon-512.png", 512]]) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(`public/${file}`);
  console.log("ok", file);
}
