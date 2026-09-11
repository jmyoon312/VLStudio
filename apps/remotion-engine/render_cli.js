#!/usr/bin/env node
import path from "path";
import fs from "fs";
import http from "http";
import { fileURLToPath } from "url";
import { bundle } from "@remotion/bundler";
import { selectComposition, renderMedia } from "@remotion/renderer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper: Lightweight HTTP range-supporting server for local media
function createMediaServer() {
  const fileMap = new Map();

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    const fileId = url.searchParams.get("id");
    const filePath = fileMap.get(fileId);

    if (!filePath || !fs.existsSync(filePath)) {
      res.writeHead(404, { "Access-Control-Allow-Origin": "*" });
      res.end("Not found");
      return;
    }

    const stat = fs.statSync(filePath);
    const total = stat.size;
    const range = req.headers.range;

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".mp3": "audio/mpeg",
      ".wav": "audio/wav",
      ".m4a": "audio/mp4",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
    };
    const contentType = mimeTypes[ext] || "application/octet-stream";

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Accept-Ranges", "bytes");

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const partialstart = parts[0];
      const partialend = parts[1];
      const start = parseInt(partialstart, 10);
      const end = partialend ? parseInt(partialend, 10) : total - 1;
      const chunksize = end - start + 1;

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${total}`,
        "Content-Length": chunksize,
        "Content-Type": contentType,
      });

      const file = fs.createReadStream(filePath, { start, end });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        "Content-Length": total,
        "Content-Type": contentType,
      });
      fs.createReadStream(filePath).pipe(res);
    }
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      resolve({
        server,
        registerFile: (filePath) => {
          if (!filePath) return null;
          const id = "media_" + Math.random().toString(36).substring(2, 10);
          fileMap.set(id, path.resolve(filePath));
          return `http://127.0.0.1:${port}/?id=${id}`;
        },
      });
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  let propsPath = null;
  let outputPath = null;
  let compositionId = "ViraShortComposition";
  let durationInFrames = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--props" && args[i + 1]) {
      propsPath = args[i + 1];
      i++;
    } else if ((args[i] === "--output" || args[i] === "--out") && args[i + 1]) {
      outputPath = args[i + 1];
      i++;
    } else if (args[i] === "--composition" && args[i + 1]) {
      compositionId = args[i + 1];
      i++;
    } else if ((args[i] === "--durationInFrames" || args[i] === "--duration") && args[i + 1]) {
      durationInFrames = parseInt(args[i + 1], 10);
      i++;
    }
  }

  if (!outputPath) {
    console.error(JSON.stringify({
      success: false,
      error: "Missing required argument: --output <output_path>",
    }));
    process.exit(1);
  }

  let inputProps = {};
  if (propsPath && fs.existsSync(propsPath)) {
    try {
      const raw = fs.readFileSync(propsPath, "utf-8");
      inputProps = JSON.parse(raw);
    } catch (e) {
      console.error(JSON.stringify({
        success: false,
        error: `Failed to parse props file: ${e.message}`,
      }));
      process.exit(1);
    }
  }

  // Start local media server to serve local files securely to Chromium
  const mediaServer = await createMediaServer();

  if (inputProps.videoSource && fs.existsSync(inputProps.videoSource)) {
    inputProps.videoSource = mediaServer.registerFile(inputProps.videoSource);
    console.log(`[MediaServer] Video mapped to: ${inputProps.videoSource}`);
  }
  if (inputProps.imageSource && fs.existsSync(inputProps.imageSource)) {
    inputProps.imageSource = mediaServer.registerFile(inputProps.imageSource);
  }
  if (inputProps.audioSource && fs.existsSync(inputProps.audioSource)) {
    inputProps.audioSource = mediaServer.registerFile(inputProps.audioSource);
  }
  if (inputProps.finalMixedAudio && fs.existsSync(inputProps.finalMixedAudio)) {
    inputProps.finalMixedAudio = mediaServer.registerFile(inputProps.finalMixedAudio);
    console.log(`[MediaServer] FinalMixedAudio mapped to: ${inputProps.finalMixedAudio}`);
  }
  if (inputProps.ambientAudioSource && fs.existsSync(inputProps.ambientAudioSource)) {
    inputProps.ambientAudioSource = mediaServer.registerFile(inputProps.ambientAudioSource);
  }
  if (inputProps.bgmSource && fs.existsSync(inputProps.bgmSource)) {
    inputProps.bgmSource = mediaServer.registerFile(inputProps.bgmSource);
  }

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`[Remotion Bridge] Bundling entry point: ${path.join(__dirname, "src/index.ts")}`);
  const bundleLocation = await bundle({
    entryPoint: path.join(__dirname, "src/index.ts"),
    webpackOverride: (config) => config,
  });

  console.log(`[Remotion Bridge] Selecting composition: ${compositionId}`);
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: compositionId,
    inputProps,
  });

  if (durationInFrames) {
    composition.durationInFrames = durationInFrames;
  }

  console.log(`[Remotion Bridge] Rendering ${composition.durationInFrames} frames (${composition.fps}fps, ${composition.width}x${composition.height}) to ${outputPath}...`);

  const startTime = Date.now();
  try {
    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: "h264",
      outputLocation: outputPath,
      inputProps,
      chromiumOptions: {
        disableWebSecurity: true,
        gl: "angle",
      },
      onProgress: ({ progress }) => {
        const pct = Math.round(progress * 100);
        if (pct % 25 === 0) {
          console.log(`[Remotion Render Progress] ${pct}%`);
        }
      },
    });

    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
    const stats = fs.statSync(outputPath);

    console.log(`[Remotion Bridge] ✅ Render complete in ${elapsedSeconds}s! File size: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);
    console.log(JSON.stringify({
      success: true,
      output_path: outputPath,
      file_size_bytes: stats.size,
      elapsed_seconds: parseFloat(elapsedSeconds),
      duration_frames: composition.durationInFrames,
    }));
  } finally {
    mediaServer.server.close();
  }
}

main().catch((err) => {
  console.error(JSON.stringify({
    success: false,
    error: err.message || String(err),
    stack: err.stack,
  }));
  process.exit(1);
});
