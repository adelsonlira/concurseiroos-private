import { existsSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

const assetsDirectory = resolve(process.cwd(), "public/assets");
if (!existsSync(assetsDirectory)) throw new Error("[pilot-diagnostic-build] diretório public/assets ausente");
const files = readdirSync(assetsDirectory);
const expectedPrefixes = [
  "q14-modelagem-dimensional-",
  "q185-alternativa-a-",
  "q185-alternativa-b-",
  "q185-alternativa-c-",
  "q185-alternativa-d-",
  "q185-alternativa-e-",
];
for (const prefix of expectedPrefixes) {
  const match = files.find((file) => file.startsWith(prefix) && file.endsWith(".png"));
  if (!match) throw new Error(`[pilot-diagnostic-build] asset não emitido: ${prefix}*.png`);
  if (statSync(resolve(assetsDirectory, match)).size <= 0) throw new Error(`[pilot-diagnostic-build] asset vazio: ${match}`);
}
console.log("[pilot-diagnostic-build] PASS — seis assets emitidos como URLs de produção.");
