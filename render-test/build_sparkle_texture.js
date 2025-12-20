const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

// ---------- SAFETY ----------
if (!process.env.RUN_RENDER) {
  console.log("RUN_RENDER not set. Worker idle.");
  process.exit(0);
}

// ---------- PATHS ----------
const OUT = path.join(__dirname, "effects", "sparkle_loop.mp4");

if (!fs.existsSync(path.dirname(OUT))) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
}

// ---------- BUILD SPARKLE ----------
const ffmpegCmd = `
ffmpeg -y \
-f lavfi -i color=white:s=2048x2048:d=4 \
-filter_complex "
noise=alls=25:allf=t,
eq=contrast=2.8:brightness=-0.1,
curves=master='0/0 0.4/0.1 1/1',
format=rgb24
" \
-r 30 \
-movflags +faststart \
"${OUT}"
`.replace(/\n/g, " ");


console.log("Building sparkle texture…");

exec(ffmpegCmd, async (err, stdout, stderr) => {
  if (err) {
    console.error(stderr);
    process.exit(1);
  }

  if (!fs.existsSync(OUT)) {
    console.error("Sparkle build failed: output missing");
    process.exit(1);
  }

  console.log("Sparkle texture created:", OUT);

  // ---------- R2 UPLOAD ----------
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });

  const buffer = fs.readFileSync(OUT);
  const key = `effects/sparkle_loop_${Date.now()}_${crypto
    .randomBytes(4)
    .toString("hex")}.mp4`;

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: "video/mp4",
    })
  );

  const publicUrl = `${process.env.R2_PUBLIC_BASE}/${key}`;

  console.log("🎉 UPLOAD SUCCESS");
  console.log("DOWNLOAD LINK:", publicUrl);

  process.exit(0);
});
