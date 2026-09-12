import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const logs = await prisma.weightLog.findMany({
      orderBy: { date: 'asc' }
    });
    return NextResponse.json(logs);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const log = await prisma.weightLog.create({
      data: {
        weight: Number(data.weight),
        date: data.date ? new Date(data.date) : new Date()
      }
    });
    return NextResponse.json(log);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
