// monitor-termux.js
const { spawn } = require("child_process");
const pidusage = require("pidusage");
const cron = require("node-cron");

const MAX_CPU = 70;                 // % CPU child process
const MAX_MEM = 510 * 1024 * 1024;  // 510 MB
const CHECK_INTERVAL = 1000;        // 1 detik

let child;
let monitor;

// Fungsi spawn index.js
function startChild() {
  child = spawn("node", ["index.js"], { stdio: "inherit" });
  console.log(`🚀 Started index.js with PID: ${child.pid}`);

  // Monitoring loop
  monitor = setInterval(async () => {
    try {
      const stats = await pidusage(child.pid);
      const cpuProcess = stats.cpu;
      const memProcess = stats.memory;

      console.log(
        `Child CPU: ${cpuProcess.toFixed(1)}% | MEM: ${(memProcess / 1024 / 1024).toFixed(1)} MB`
      );

      if (cpuProcess > MAX_CPU || memProcess > MAX_MEM) {
        console.log("⚠️ Limit terlampaui! Menghentikan proses...");
        child.kill("SIGKILL");
      }
    } catch (err) {
      console.log("Proses tidak ditemukan. Respawn...");
      clearInterval(monitor);
      startChild();
    }
  }, CHECK_INTERVAL);

  // Respawn otomatis saat exit
  child.on("exit", (code, signal) => {
    console.log(`index.js exited with code ${code}, signal ${signal}`);
    clearInterval(monitor);
    startChild();
  });
}

// Restart setiap jam 3 pagi WIB menggunakan node-cron
cron.schedule("0 3 * * *", () => {
  console.log("🔄 Cron job: Restart index.js jam 3 pagi WIB");
  if (child) {
    child.kill("SIGKILL"); // respawn otomatis di startChild
  }
}, {
  timezone: "Asia/Jakarta" // WIB
});

// Start pertama kali
startChild();