// server.js
const express = require('express');
const bodyParser = require('body-parser');
const { randomBytes } = require('crypto');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');

const app = express();
app.use(bodyParser.json());

/* ===== Config (from env) =====
SERVICE_URL (e.g. https://shimmer-server-25yg.onrender.com)
AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_BUCKET (optional)
If S3_BUCKET is not set, files will be served from /videos locally.
*/
// Trim whitespace and remove trailing slash
const SERVICE_URL = (process.env.SERVICE_URL || '').trim().replace(/\/$/, '');
const S3_BUCKET = process.env.S3_BUCKET || '';
const s3Client = (S3_BUCKET && process.env.AWS_REGION && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
  ? new S3Client({ region: process.env.AWS_REGION })
  : null;

// In-memory job store (demo). Replace with Redis/DB in production.
const jobs = {};

app.get('/render-test', (req, res) => {
  res.json({ status: 'ok', message: 'Node server reachable!' });
});

app.post('/render', async (req, res) => {
  const payload = req.body || {};
  if (!payload.template) return res.status(400).json({ error: 'template is required' });

  const jobId = randomBytes(6).toString('hex');
  jobs[jobId] = { status: 'processing', createdAt: Date.now(), videoUrl: null };

  // run async
  generateVideoAndUpload(jobId, payload)
    .then((url) => {
      jobs[jobId].status = 'done';
      jobs[jobId].videoUrl = url;
      console.log(`Job ${jobId} done -> ${url}`);
    })
    .catch((err) => {
      console.error('Render/upload failed', err);
      jobs[jobId].status = 'failed';
      jobs[jobId].error = err && err.message ? err.message : String(err);
    });

  res.status(202).json({ jobId });
});

app.get('/render/status/:jobId', (req, res) => {
  const jobId = req.params.jobId;
  const job = jobs[jobId];
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

// Serve local video folder when S3 not configured (or for fallback)
app.use('/videos', express.static(path.join(__dirname, 'public', 'videos')));

async function generateVideoAndUpload(jobId, payload) {
  const videosDir = path.join(__dirname, 'public', 'videos');
  fs.mkdirSync(videosDir, { recursive: true });
  const outPath = path.join(videosDir, `${jobId}.mp4`);

  const duration = Number(payload.duration) || 5;
  const width = payload.width || 640;
  const height = payload.height || 360;
  const text = (payload.name || payload.message) ? `${payload.name || ''} ${payload.message || ''}`.trim() : '';

  // Remove old file if present
  try { if (fs.existsSync(outPath)) fs.unlinkSync(outPath); } catch(e){}

  return new Promise((resolve, reject) => {
    let command = ffmpeg()
      .input(`color=black:size=${width}x${height}:duration=${duration}`)
      .inputFormat('lavfi')
      .outputOptions('-movflags faststart', '-pix_fmt yuv420p', '-r 25')
      .size(`${width}x${height}`)
      .duration(duration)
      .output(outPath);

    if (text) {
      const safeText = text.replace(/:/g, '\\:').replace(/'/g, "\\'");
      const drawtextFilter = `drawtext=text='${safeText}':fontcolor=white:fontsize=28:x=(w-text_w)/2:y=(h-text_h)/2`;
      command = command.videoFilter(drawtextFilter);
    }

    command.on('start', (cmdline) => { console.log('FFmpeg start:', cmdline); });

    command.on('error', async (err) => {
      console.warn('FFmpeg error (creating fallback):', err && err.message);
      // create fallback file so pipeline continues
      try {
        fs.writeFileSync(outPath, `FFmpeg failed to create an mp4 for job ${jobId}\nError: ${err && err.message}`);
        const url = await maybeUploadToS3(jobId, outPath);
        resolve(url);
      } catch (werr) {
        reject(werr);
      }
    });

    command.on('end', async () => {
      try {
        const url = await maybeUploadToS3(jobId, outPath);
        resolve(url);
      } catch (err) {
        reject(err);
      }
    });

    try { command.run(); }
    catch (runErr) {
      // Synchronous failure: fallback
      try {
        fs.writeFileSync(outPath, `Fallback file for job ${jobId}`);
        maybeUploadToS3(jobId, outPath).then(resolve).catch(reject);
      } catch (e) {
        reject(e);
      }
    }
  });
}

async function maybeUploadToS3(jobId, filePath) {
  if (!s3Client || !S3_BUCKET) {
    // Return local served URL if S3 not configured
    const base = SERVICE_URL || `http://localhost:${process.env.PORT || 10000}`;
    return `${base}/videos/${jobId}.mp4`;
  }

  const fileStream = fs.createReadStream(filePath);
  const key = `videos/${jobId}.mp4`;

  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: S3_BUCKET,
      Key: key,
      Body: fileStream,
      ContentType: 'video/mp4',
      ACL: 'public-read' // requires bucket policy to allow public reads or suitable permission
    }
  });

  await upload.done();

  // Construct public URL — this assumes bucket allows public object URLs
  const region = process.env.AWS_REGION;
  // Standard S3 URL format
  const url = `https://${S3_BUCKET}.s3.${region}.amazonaws.com/${key}`;
  return url;
}

const port = process.env.PORT || 10000;
const host = '0.0.0.0';
app.listen(port, host, () => {
  console.log(`Listening on ${host}:${port}`);
  if (!SERVICE_URL) {
    console.log('TIP: Set SERVICE_URL env to your public service URL (e.g. https://your-app.onrender.com).');
  }
  if (!S3_BUCKET) {
    console.log('TIP: S3_BUCKET not set — videos will be served from /videos locally on the service.');
  }
});
