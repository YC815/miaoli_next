import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get current month start and end dates
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-based (0 = January, 8 = September)
    
    // Start of current month (e.g., September 1st, 2025 00:00:00)
    const monthStart = new Date(currentYear, currentMonth, 1);
    
    // Start of next month (e.g., October 1st, 2025 00:00:00)
    const monthEnd = new Date(currentYear, currentMonth + 1, 1);

    console.log('📅 Month range:', {
      monthStart: monthStart.toISOString(),
      monthEnd: monthEnd.toISOString(),
      currentMonth: currentMonth + 1, // Display as 1-based
      currentYear
    });

    // Get monthly donation count (number of donation records created this month)
    const monthlyDonations = await prisma.donationRecord.count({
      where: {
        createdAt: {
          gte: monthStart,
          lt: monthEnd,
        },
      },
    });

    // Get monthly distribution count (number of disbursement records created this month)
    const monthlyDistributions = await prisma.disbursement.count({
      where: {
        createdAt: {
          gte: monthStart,
          lt: monthEnd,
        },
      },
    });

    return NextResponse.json({
      monthlyDonations,
      monthlyDistributions,
      month: currentMonth + 1, // Return 1-based month for display
      year: currentYear,
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}