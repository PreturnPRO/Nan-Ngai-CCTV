// Upload a local .mp4 to Cloudinary and point a camera at it.
//
// Usage (from the frontend dir):
//   npx tsx scripts/set-camera-video.ts <path-to-video.mp4> "<camera name>"
//
// Examples:
//   npx tsx scripts/set-camera-video.ts ./my-crash.mp4 "Silom Bypass - Cam 16"
//   npx tsx scripts/set-camera-video.ts "C:\clips\crash.mp4" "Phaya Thai"   (matches by partial name)
//   npx tsx scripts/set-camera-video.ts ./my-crash.mp4 --all               (every camera)
import { v2 as cloudinary } from 'cloudinary';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// Minimal .env loader (frontend has no dotenv dep). Strips surrounding quotes.
function loadEnv(file: string) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const val = m[2].trim().replace(/^["']|["']$/g, '');
    if (!(m[1] in process.env)) process.env[m[1]] = val;
  }
}
loadEnv('.env');
loadEnv('../backend/.env'); // CLOUDINARY_URL

const prisma = new PrismaClient();

const cu = process.env.CLOUDINARY_URL || '';
const cm = cu.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
if (!cm) throw new Error('CLOUDINARY_URL missing/malformed (expected in backend/.env)');
cloudinary.config({ api_key: cm[1], api_secret: cm[2], cloud_name: cm[3], secure: true });

async function main() {
  const [videoPath, nameArg] = process.argv.slice(2);
  if (!videoPath || !nameArg) {
    throw new Error('Usage: npx tsx scripts/set-camera-video.ts <video.mp4> "<camera name>" | --all');
  }
  if (!fs.existsSync(videoPath)) throw new Error(`File not found: ${videoPath}`);

  // Pick target cameras.
  const cams =
    nameArg === '--all'
      ? await prisma.cCTV.findMany({ select: { id: true, name: true } })
      : await prisma.cCTV.findMany({
          where: { name: { contains: nameArg, mode: 'insensitive' } },
          select: { id: true, name: true },
        });

  if (cams.length === 0) throw new Error(`No camera matched "${nameArg}". Run with an exact/partial name or --all.`);

  console.log(`Uploading ${path.basename(videoPath)} to Cloudinary…`);
  const res = await cloudinary.uploader.upload(videoPath, {
    resource_type: 'video',
    folder: 'custom_clips',
    public_id: path.parse(videoPath).name,
    overwrite: true,
  });
  console.log('Cloudinary URL:', res.secure_url);

  for (const cam of cams) {
    await prisma.cCTV.update({
      where: { id: cam.id },
      data: { accidentVideoUrl: res.secure_url, hasAccidentVideo: true },
    });
    console.log('  updated:', cam.name);
  }
  console.log(`\nDone. Set the video on ${cams.length} camera(s). Reload the app to see it.`);
}

main()
  .catch(e => {
    console.error('\nError:', e.message || e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
