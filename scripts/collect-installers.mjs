// Copies the installers made by `tauri build` from deep inside
// src-tauri/target/release/bundle/ into ./release/ at the project root,
// under readable names: "Chronos Setup 0.1.0.exe" and "Chronos 0.1.0.msi".
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join, relative } from "node:path";

const root = join(import.meta.dirname, "..");
const bundle = join(root, "src-tauri", "target", "release", "bundle");
const out = join(root, "release");

// [bundle folder, pattern of the generated name, readable name for a version]
const sources = [
  ["nsis", /^Chronos_(.+?)_x64-setup\.exe$/, (v) => `Chronos Setup ${v}.exe`],
  ["msi", /^Chronos_(.+?)_x64_.+\.msi$/, (v) => `Chronos ${v}.msi`],
];

if (!existsSync(bundle)) {
  console.error(`Chưa có bản build: không thấy ${relative(root, bundle)}. Chạy "npm run release".`);
  process.exit(1);
}

// Start clean so old versions don't pile up.
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const copied = [];
for (const [dir, pattern, rename] of sources) {
  const from = join(bundle, dir);
  if (!existsSync(from)) continue;
  for (const file of readdirSync(from)) {
    const match = pattern.exec(file);
    if (!match) continue;
    const name = rename(match[1]);
    copyFileSync(join(from, file), join(out, name));
    copied.push(name);
  }
}

if (copied.length === 0) {
  console.error("Không tìm thấy file cài đặt nào trong bản build.");
  process.exit(1);
}
console.log(`\nFile cài đặt đã được chép vào ${out}:`);
for (const file of copied) console.log(`  - ${file}`);
