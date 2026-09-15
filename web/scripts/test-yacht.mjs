import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = mkdtempSync(join(tmpdir(), "bgm-yacht-tests-"));
try {
  execFileSync(process.execPath, [join(root, "node_modules/typescript/bin/tsc"),
    "tests/yacht-achievements.test.ts", "tests/yacht-achievements.integration.test.ts", "--outDir", output, "--module", "commonjs",
    "--target", "ES2020", "--esModuleInterop", "--skipLibCheck", "--strict"], { cwd: root, stdio: "inherit" });
  execFileSync(process.execPath, ["--test", join(output, "tests/yacht-achievements.test.js"), join(output, "tests/yacht-achievements.integration.test.js")], { cwd: root, stdio: "inherit", env: { ...process.env, NODE_PATH: join(root, "node_modules") } });
} finally {
  rmSync(output, { recursive: true, force: true });
}
