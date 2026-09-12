import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { weight } = await req.json();
    
    if (!weight) {
      return NextResponse.json({ error: 'Missing weight' }, { status: 400 });
    }

    const log = await prisma.weightLog.create({
      data: {
        weight: parseFloat(weight),
        date: new Date().toISOString()
      }
    });

    return NextResponse.json({ success: true, log });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
