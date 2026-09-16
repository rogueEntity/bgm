import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = mkdtempSync(join(tmpdir(), "bgm-yacht-tests-"));
try {
  const testFiles = ["yacht-achievements.test", "yacht-achievements.integration.test", "yacht-news.test"];
  const config = join(output, "tsconfig.json");
  writeFileSync(config, JSON.stringify({
    compilerOptions: {
      outDir: output, rootDir: root, module: "commonjs", target: "ES2020",
      esModuleInterop: true, skipLibCheck: true, strict: true,
      paths: { "@/*": [join(root, "src/*")] },
    },
    files: testFiles.map((name) => join(root, "tests", `${name}.ts`)),
  }));
  execFileSync(process.execPath, [join(root, "node_modules/typescript/bin/tsc"), "--project", config], { cwd: root, stdio: "inherit" });
  mkdirSync(join(output, "node_modules/@"), { recursive: true });
  symlinkSync(join(output, "src/features"), join(output, "node_modules/@/features"), "dir");
  execFileSync(process.execPath, ["--test", ...testFiles.map((name) => join(output, "tests", `${name}.js`))], { cwd: root, stdio: "inherit", env: { ...process.env, NODE_PATH: join(root, "node_modules") } });
} finally {
  rmSync(output, { recursive: true, force: true });
}
