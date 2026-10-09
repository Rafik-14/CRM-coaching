// Starts the local PGlite Postgres server (dev only).
// Checks the port first: if another copy is already running, exit before opening the
// database files, because two PGlite processes on the same folder can corrupt it.
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import net from "node:net";

const PORT = 54320;
const DATA_DIR = "./.data/pglite";

const inUse = await new Promise((resolve) => {
  const socket = net.connect(PORT, "127.0.0.1");
  socket.once("connect", () => socket.end(() => resolve(true)));
  socket.once("error", () => resolve(false));
});

if (inUse) {
  console.error(
    `\n✖ Port ${PORT} is already in use: the local database is already running ` +
      `(another "npm run dev" or "npm run db:server"?). Stop it first.\n`,
  );
  process.exit(1);
}

mkdirSync(".data", { recursive: true });
// One command string (no args array) so Node doesn't warn about shell + args (DEP0190).
// A shell is still needed on Windows to resolve the pglite-server .cmd shim.
const child = spawn(`pglite-server --db=${DATA_DIR} --port=${PORT} --max-connections=10`, {
  stdio: "inherit",
  shell: true,
});
child.on("exit", (code) => process.exit(code ?? 0));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
