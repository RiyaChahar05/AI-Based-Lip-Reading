const express = require("express");
const cors = require("cors");
const fs = require('fs');
const multer = require("multer");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
// ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Basic request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Multer Storage (Save videos into uploads/)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed (video/*).'));
    }
  }
});

// Detect ffmpeg path at startup (allow env override)
function detectFfmpeg() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  try {
    const spawnSync = require('child_process').spawnSync;
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    const r = spawnSync(cmd, ["ffmpeg"], { encoding: 'utf8' });
    if (r.status === 0) {
      const line = (r.stdout || '').split(/\r?\n/).find(Boolean);
      if (line) return line.trim();
    }
  } catch (e) {
    // ignore
  }
  return 'ffmpeg';
}
const ffmpegPathGlobal = detectFfmpeg();
console.log('Using ffmpeg at:', ffmpegPathGlobal);

// Test Route
app.get("/", (req, res) => {
  res.send("LipRead AI Backend Running...");
});

// Friendly message for GET on predict-video so users don't get 404/"Cannot GET"
app.get('/predict-video', (req, res) => {
  res.send(`This endpoint accepts POST requests to upload a video file (field name: file).\n
Example curl (PowerShell):\n
curl.exe -X POST -F "file=@C:\\path\\to\\your_video.mp4" http://localhost:5000/predict-video`);
});

// Diagnostic route to show ffmpeg path and version (good for debugging)
app.get('/ffmpeg-info', (req, res) => {
  const spawnSync = require('child_process').spawnSync;
  const ffPath = process.env.FFMPEG_PATH || ffmpegPathGlobal;
  let version = null;
  try {
    const r = spawnSync(ffPath, ['-version'], { encoding: 'utf8' });
    if (r.status === 0) version = (r.stdout || '').split(/\r?\n/)[0] || null;
    else version = (r.stderr || r.stdout).slice(0, 200);
  } catch (e) {
    version = String(e.message);
  }
  res.json({ ffmpeg_path: ffPath, ffmpeg_version: version });
});

// Upload Video Route

// Upload Video Route (just saves video)
app.post("/upload-video", upload.single("file"), (req, res) => {
  console.log("Video uploaded:", req.file);
  res.json({
    status: "success",
    message: "Video uploaded successfully",
    filename: req.file.filename,
    filepath: `/uploads/${req.file.filename}`
  });
});

// Predict from Video Route
app.post("/predict-video", upload.single("file"), async (req, res) => {
  const modelRunner = require('./modelRunner');
  const fs = require('fs');
  // Use the detected global path, allow override from env
  const ffmpegPath = process.env.FFMPEG_PATH || ffmpegPathGlobal || 'ffmpeg';
  try {
    console.log('predict-video: file received ->', req.file ? { originalname: req.file.originalname, size: req.file.size } : null);
    if (!req.file) {
      return res.status(400).json({ error: 'No video uploaded. Use field "file" for video.' });
    }
    // Create session folder for extracted frames
    const sessionId = Date.now();
    const sessionDir = path.join(__dirname, 'uploads', `session-${sessionId}`);
    fs.mkdirSync(sessionDir, { recursive: true });

    // Extract frames from video using ffmpeg
    // Save as color_001.jpg, color_002.jpg, ...
    const videoPath = req.file.path;
    const framePattern = path.join(sessionDir, 'color_%03d.jpg');
    // Use conservative logging: hide banner and set loglevel to error
    const ffmpegArgs = ['-nostdin', '-y', '-i', videoPath, '-vf', 'fps=10,scale=112:112', '-hide_banner', '-loglevel', 'error', framePattern];
    const spawn = require('child_process').spawnSync;
    const ff = spawn(ffmpegPath, ffmpegArgs, { encoding: 'utf8' });
    if (ff.error) {
      console.error('ffmpeg spawn error:', ff.error);
      // try a Python fallback extractor before failing
      console.log('Attempting Python fallback extractor...');
      const venvPython = path.join(__dirname, '..', '.venv', 'Scripts', 'python.exe');
      let pythonCmd = 'python';
      if (fs.existsSync(venvPython)) pythonCmd = venvPython;
      const pyScript = path.join(__dirname, '..', 'model', 'extract_frames.py');
      try {
        const py = require('child_process').spawnSync(pythonCmd, [pyScript, '--video', videoPath, '--outdir', sessionDir, '--fps', '10', '--size', '112'], { encoding: 'utf8' });
        if (py.error) {
          console.error('Python extractor spawn error:', py.error);
          return res.status(500).json({ error: 'ffmpeg not found and Python fallback failed to run', details: py.error.message });
        }
        if (py.status !== 0) {
          console.error('Python extractor failed:', py.stderr || py.stdout);
          // surface stderr/stdout to help debugging
          return res.status(500).json({ error: 'Failed to extract frames using both ffmpeg and Python fallback', details: py.stderr || py.stdout });
        }
        console.log('Python extractor succeeded:', py.stdout);
      } catch (ex) {
        console.error('Python extractor exception:', ex);
        return res.status(500).json({ error: 'ffmpeg not found and Python extractor failed', details: ex.message });
      }
      // continue on success to run model prediction
    }
    if (ff.status !== 0) {
      console.error('ffmpeg failed:', ff.stderr);
      // will attempt python fallback when ffmpeg errors
      console.log('Attempting Python fallback extractor (ffmpeg failed)...');
      const venvPython = path.join(__dirname, '..', '.venv', 'Scripts', 'python.exe');
      let pythonCmd = 'python';
      if (fs.existsSync(venvPython)) pythonCmd = venvPython;
      const pyScript = path.join(__dirname, '..', 'model', 'extract_frames.py');
      try {
        const py = require('child_process').spawnSync(pythonCmd, [pyScript, '--video', videoPath, '--outdir', sessionDir, '--fps', '10', '--size', '112'], { encoding: 'utf8' });
        if (py.error) {
          console.error('Python extractor spawn error:', py.error);
          return res.status(500).json({ error: 'ffmpeg failed and Python fallback failed to run', details: py.error.message, ffmpeg_stderr: ff.stderr });
        }
        if (py.status !== 0) {
          console.error('Python extractor failed:', py.stderr || py.stdout);
          return res.status(500).json({ error: 'Failed to extract frames using both ffmpeg and Python fallback', details: py.stderr || py.stdout, ffmpeg_stderr: ff.stderr });
        }
        console.log('Python extractor succeeded:', py.stdout);
      } catch (ex) {
        console.error('Python extractor exception:', ex);
        return res.status(500).json({ error: 'ffmpeg failed and Python extractor failed', details: ex.message, ffmpeg_stderr: ff.stderr });
      }
      // continue on success to run model prediction
    }

    // Run sequence prediction on extracted frames
    try {
      const result = await modelRunner.predictSession(sessionDir);
      res.json({ status: 'success', prediction: result });
    } catch (err) {
      console.error('Model predict error', err);
      res.status(500).json({ status: 'error', message: err.message });
    }
  } catch (err) {
    console.error('Error in /predict-video:', err);
    res.status(500).json({ error: err.message });
  }
});

// Global error handler for multer and other errors
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File size limit exceeded' });
  }
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }
  return res.status(500).json({ error: err.message || 'Server error' });
});

// Prediction Route: accept single image upload or multiple files as a session
app.post("/predict", upload.array("files"), async (req, res) => {
    const fs = require('fs');
    const modelRunner = require('./modelRunner');
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded. Use field "files" for multiple images' });
    }

    // Create session folder
    const sessionId = Date.now();
    const sessionDir = path.join(__dirname, 'uploads', `session-${sessionId}`);
    fs.mkdirSync(sessionDir, { recursive: true });

    // Move files into session folder with standardized names color_001.jpg etc.
    for (let i = 0; i < req.files.length; i++) {
      const f = req.files[i];
      const ext = path.extname(f.filename) || path.extname(f.originalname);
      const dst = path.join(sessionDir, `color_${String(i+1).padStart(3, '0')}${ext}`);
      fs.renameSync(f.path, dst);
    }

    // Choose python path (prefer .venv if exists)
    const venvPython = path.join(__dirname, '..', '.venv', 'Scripts', 'python.exe');
    let pythonCmd = 'python';
    if (fs.existsSync(venvPython)) {
      pythonCmd = venvPython;
    }

    // If only one file was uploaded, run single-image prediction
    try {
      let result = null;
      if (req.files.length === 1) {
        const singlePath = path.join(sessionDir, 'color_001' + path.extname(req.files[0].originalname));
        result = await modelRunner.predictImage(singlePath);
      } else {
        result = await modelRunner.predictSession(sessionDir);
      }
      res.json({ status: 'success', prediction: result });
    } catch (err) {
      console.error('Model predict error', err);
      res.status(500).json({ status: 'error', message: err.message });
    }
  } catch (err) {
    console.error('Error in /predict:', err);
    res.status(500).json({ error: err.message });
  }
});

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const PORT = 5000;
// bind to IPv4 address explicitly to avoid IPv6/IPv4 mismatch on some Windows hosts
const HOST = '0.0.0.0'; // listen on all interfaces
app.listen(PORT, HOST, () => {
  console.log(`Backend server running at http://${HOST}:${PORT}`);
  console.log(`Uploads directory: ${uploadsDir}`);
});

// Health check
app.get('/health', (req, res) => res.json({ ok: true }));
