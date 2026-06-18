import { NextResponse } from 'next/server';
import { prisma } from '@/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') || 'PENDING';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '15');
    const skip = (page - 1) * limit;

    const where = {
      verificationStatus: statusFilter === 'ALL' ? undefined : statusFilter as any
    };

    const [incidents, total] = await Promise.all([
      prisma.incident.findMany({
        where,
        include: {
          cctv: true,
          verifiedByUser: true,
          resolvedByUser: true,
        },
        orderBy: { detectedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.incident.count({ where }),
    ]);

    const formattedLogs = incidents.map(inc => ({
      id: inc.id,
      date: inc.detectedAt.toISOString(),
      cam: inc.cctv.name,
      location: inc.location || inc.cctv.roadSegment || 'Unknown Location',
      confidence: Math.round(inc.confidenceScore * 100),
      status: inc.verificationStatus,
      operator: inc.resolvedByUser?.name || inc.verifiedByUser?.name || 'System-AI',
    }));

    return NextResponse.json({
      logs: formattedLogs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}
