import { NextResponse } from 'next/server';
import { checkDatabaseConnection } from '@/lib/prisma';

export async function GET() {
  try {
    const isDatabaseHealthy = await checkDatabaseConnection();

    if (!isDatabaseHealthy) {
      return NextResponse.json(
        {
          status: 'unhealthy',
          database: 'disconnected',
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'error',
        database: 'unknown',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
