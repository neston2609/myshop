import { cpSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const standaloneDir = join(root, ".next", "standalone");

if (!existsSync(standaloneDir)) {
  console.log("Standalone output not found; skipping asset copy.");
  process.exit(0);
}

const copies = [
  [join(root, ".next", "static"), join(standaloneDir, ".next", "static")],
  [join(root, "public"), join(standaloneDir, "public")],
  [join(root, "node_modules", "pdfkit", "js", "data"), join(standaloneDir, "node_modules", "pdfkit", "js", "data")],
];

for (const [source, destination] of copies) {
  if (!existsSync(source)) continue;
  rmSync(destination, { force: true, recursive: true });
  cpSync(source, destination, { recursive: true });
}

console.log("Copied standalone static assets.");
