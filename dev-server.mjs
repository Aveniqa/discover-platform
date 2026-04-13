import { spawn } from "child_process";
import path from "path";

const nodeDir = path.dirname(process.execPath);
const env = {
  ...process.env,
  PATH: [nodeDir, "/usr/local/bin", "/usr/bin", "/bin"].join(":")
};

const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start"], {
  env,
  stdio: "inherit",
  cwd: "/Users/aveniqa/Documents/discovery-platform"
});
child.on("exit", (code) => process.exit(code ?? 1));
