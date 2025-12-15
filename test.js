// test.js
console.log("Server deploy test running...");

const { exec } = require("child_process");

exec("ffmpeg -version", (error, stdout, stderr) => {
  if (error) {
    console.error(`FFmpeg not found or error: ${error.message}`);
    process.exit(1);
  } else {
    console.log("FFmpeg version:\n", stdout);
  }
});
