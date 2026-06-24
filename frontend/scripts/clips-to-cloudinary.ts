// One-time migration: upload the local /uploads demo clips to Cloudinary and
// repoint every CCTV.accidentVideoUrl at the Cloudinary URL, so the deployed
// app streams them from Cloudinary's video CDN instead of large static files.
//
// Run from the frontend dir:  npx tsx scripts/clips-to-cloudinary.ts
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
    const key = m[1];
    const val = m[2].trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadEnv('.env'); // DATABASE_URL / DIRECT_URL
loadEnv('../backend/.env'); // CLOUDINARY_URL

const prisma = new PrismaClient();

const cu = process.env.CLOUDINARY_URL || '';
const m = cu.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
if (!m) throw new Error('CLOUDINARY_URL missing/malformed (expected in backend/.env)');
cloudinary.config({ api_key: m[1], api_secret: m[2], cloud_name: m[3], secure: true });

async function main() {

  const cams = await prisma.cCTV.findMany({
    select: { id: true, accidentVideoUrl: true },
  });

  const cache = new Map<string, string>(); // local path -> cloudinary url
  let updated = 0;

  for (const cam of cams) {
    const url = cam.accidentVideoUrl;
    if (!url || url.startsWith('http')) continue; // none or already on cloud

    let cloudUrl = cache.get(url);
    if (!cloudUrl) {
      const filePath = path.join('public', url); // /uploads/x.mp4 -> public/uploads/x.mp4
      if (!fs.existsSync(filePath)) {
        console.log('SKIP (missing file):', filePath);
        continue;
      }
      const res = await cloudinary.uploader.upload(filePath, {
        resource_type: 'video',
        folder: 'demo_clips',
        public_id: path.parse(url).name,
        overwrite: true,
      });
      cloudUrl = res.secure_url;
      cache.set(url, cloudUrl);
      console.log('uploaded', url, '->', cloudUrl);
    }

    await prisma.cCTV.update({
      where: { id: cam.id },
      data: { accidentVideoUrl: cloudUrl },
    });
    updated++;
  }

  console.log(`\nDone. Updated ${updated} cameras, ${cache.size} clips uploaded.`);
}

main()
  .catch(e => {
    console.error(e.message || e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
