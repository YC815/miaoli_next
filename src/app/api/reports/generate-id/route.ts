import { NextResponse } from 'next/server';
import { generateReportId } from '@/lib/serialNumber';

export async function POST() {
  try {
    const reportId = await generateReportId();
    return NextResponse.json({ reportId });
  } catch (error) {
    console.error('Error generating report ID:', error);
    return NextResponse.json(
      { error: '無法生成報表ID' },
      { status: 500 }
    );
  }
}