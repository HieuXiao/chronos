// Regenerates the app icons from src-tauri/icons/app-icon.svg, keeping only
// the sizes a Windows build uses (the generator also makes macOS, iOS,
// Android and Store icons).
import { execSync } from "node:child_process";
import { copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const icons = join(root, "src-tauri", "icons");
const source = join(icons, "app-icon.svg");
const KEEP = ["32x32.png", "128x128.png", "128x128@2x.png", "icon.png", "icon.ico"];

const tmp = mkdtempSync(join(tmpdir(), "chronos-icons-"));
try {
  execSync(`npx tauri icon "${source}" -o "${tmp}"`, { cwd: root, stdio: "inherit" });
  for (const file of KEEP) copyFileSync(join(tmp, file), join(icons, file));
  copyFileSync(source, join(root, "public", "favicon.svg"));
  console.log(`\nĐã cập nhật icon: ${KEEP.join(", ")} và public/favicon.svg`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
