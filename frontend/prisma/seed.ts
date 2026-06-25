import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const VIDEO_FILES = [
  '/uploads/1.mp4',
  '/uploads/2.mp4',
  '/uploads/3.mp4',
  '/uploads/4.mp4',
];

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      password: adminPassword,
    },
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      password: adminPassword,
      role: 'ADMIN',
    },
  });
  console.log('Admin user ensured.');

  // Clean old data
  await prisma.incident.deleteMany();
  await prisma.cCTV.deleteMany();
  await prisma.trafficAidPost.deleteMany();
  await prisma.incidentHistory.deleteMany();
  await prisma.notificationLog.deleteMany();

  const LOCATIONS = [
    { name: 'Sukhumvit Rd', sector: 'Sector 7', roadSegment: 'Sukhumvit Soi 11', landmark: 'Nana BTS' },
    { name: 'Asok Intersection', sector: 'Sector 7', roadSegment: 'Asok Montri', landmark: 'Terminal 21' },
    { name: 'Rama IV', sector: 'Sector 7', roadSegment: 'Rama IV Road', landmark: 'Lumphini Park' },
    { name: 'Siam Square', sector: 'Sector 1', roadSegment: 'Rama I Road', landmark: 'Siam Paragon' },
    { name: 'Phaya Thai', sector: 'Sector 1', roadSegment: 'Phaya Thai Rd', landmark: 'Victory Monument' },
    { name: 'Silom Bypass', sector: 'Sector 2', roadSegment: 'Silom Road', landmark: 'Chong Nonsi BTS' },
    { name: 'Ekkamai South', sector: 'Sector 7', roadSegment: 'Ekkamai Rd', landmark: 'Gateway Ekkamai' },
    { name: 'Thong Lo', sector: 'Sector 7', roadSegment: 'Thong Lo Soi 10', landmark: 'J Avenue' },
    { name: 'Ploenchit Rd', sector: 'Sector 1', roadSegment: 'Ploenchit Road', landmark: 'Central Embassy' },
    { name: 'Pathum Wan', sector: 'Sector 1', roadSegment: 'Pathum Wan Intersection', landmark: 'MBK Center' },
  ];

  // Seed 4 Cameras
  const cctvs = [];
  for (let i = 0; i < 4; i++) {
    const loc = LOCATIONS[i % LOCATIONS.length];
    const videoUrl = VIDEO_FILES[i];

    const cctv = await prisma.cCTV.create({
      data: {
        name: `${loc.name} - Cam ${i + 1}`,
        rtspUrl: `rtsp://cam${i + 1}.traffic.local/stream`,
        latitude: 13.75 + (Math.random() * 0.1 - 0.05),
        longitude: 100.5 + (Math.random() * 0.1 - 0.05),
        status: 'Online',
        accidentVideoUrl: videoUrl,
        hasAccidentVideo: true,
        sector: loc.sector,
        roadSegment: loc.roadSegment,
        landmark: loc.landmark,
      }
    });
    cctvs.push(cctv);
  }
  console.log(`Seeded ${cctvs.length} CCTVs`);

  // Seed 3 TrafficAidPosts (Rescue/Traffic Posts) near the first CCTV location
  const baseLat = cctvs[0].latitude;
  const baseLng = cctvs[0].longitude;

  const posts = [
    {
      name: 'หน่วยกู้ภัยจราจรด่วนพิเศษ (Rescue Unit R-102)',
      address: `${cctvs[0].name} - 1.5 กม. ตะวันตก`,
      latitude: baseLat + 0.005,
      longitude: baseLng - 0.005,
      contactNumber: '191 / 02-123-4567',
      hasPoliceService: true,
      hasAmbulance: true,
      hasFireService: false,
      operatingHours: '24/7',
      additionalInfo: 'มีรถกู้ชีพเคลื่อนที่เร็วแสตนด์บาย 2 คัน',
      status: 'active'
    },
    {
      name: 'ศูนย์กู้ชีพเวียงพิงค์ (Viphing Rescue Station)',
      address: `${cctvs[0].name} - 3.8 กม. เหนือ`,
      latitude: baseLat + 0.025,
      longitude: baseLng + 0.010,
      contactNumber: '1669 / 02-999-1111',
      hasPoliceService: false,
      hasAmbulance: true,
      hasFireService: true,
      operatingHours: '24/7',
      additionalInfo: 'ทีมแพทย์ฉุกเฉินและรถดับเพลิงย่อยประจำการ',
      status: 'active'
    },
    {
      name: 'ป้อมตำรวจทางหลวง (Highway Patrol Station)',
      address: `${cctvs[0].name} - 0.8 กม. ตะวันออก`,
      latitude: baseLat - 0.002,
      longitude: baseLng + 0.007,
      contactNumber: '1193',
      hasPoliceService: true,
      hasAmbulance: false,
      hasFireService: false,
      operatingHours: '24/7',
      additionalInfo: 'สายตรวจทางหลวงประจำตู้บริการ',
      status: 'active'
    }
  ];

  for (const post of posts) {
    await prisma.trafficAidPost.create({ data: post });
  }
  console.log('Seeded TrafficAidPosts');

  // Seed some active incidents to trigger alerts
  const alertIndices: number[] = [];
  for (const idx of alertIndices) {
    if (cctvs[idx]) {
      const incident = await prisma.incident.create({
        data: {
          cctvId: cctvs[idx].id,
          verificationStatus: 'PENDING',
          severity: 'CRITICAL',
          confidenceScore: 0.95,
          imageUrl: cctvs[idx].accidentVideoUrl,
          location: cctvs[idx].roadSegment,
          latitude: cctvs[idx].latitude,
          longitude: cctvs[idx].longitude,
          notes: 'Automated AI detection of possible collision.',
        }
      });

      // Log to history
      await prisma.incidentHistory.create({
        data: {
          incidentId: incident.id,
          status: 'PENDING',
          notes: 'Incident automatically created by YOLO model detection',
        }
      });
    }
  }

  // Seed some resolved incidents for logs/historical data
  for (let i = 0; i < 3; i++) {
    const incident = await prisma.incident.create({
      data: {
        cctvId: cctvs[i].id,
        verificationStatus: 'APPROVED',
        severity: i % 2 === 0 ? 'MAJOR' : 'MINOR',
        confidenceScore: 0.88,
        location: cctvs[i].roadSegment,
        notes: 'Cleared by response team.',
        responseNeeded: true,
        responseInitiated: true,
        resolvedAt: new Date(),
        resolvedBy: admin.id,
      }
    });

    // Log to history
    await prisma.incidentHistory.create({
      data: {
        incidentId: incident.id,
        status: 'APPROVED',
        notes: 'Incident verified by admin',
      }
    });

    await prisma.incidentHistory.create({
      data: {
        incidentId: incident.id,
        status: 'RESOLVED',
        notes: 'Incident marked as resolved. Cleared by response team.',
      }
    });

    // Log to notification logs
    await prisma.notificationLog.create({
      data: {
        incidentId: incident.id,
        channel: 'CRS_API',
        recipient: 'http://crs-agency.gov/api/v1/alerts',
        status: 'SUCCESS',
        sentAt: new Date(),
      }
    });
  }

  console.log('Seeded Incidents, History, and Notification logs');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
