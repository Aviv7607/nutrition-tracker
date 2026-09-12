import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    // Check if settings exist
    const current = await prisma.settings.findFirst();
    let settings;
    
    if (current) {
      settings = await prisma.settings.update({ data });
    } else {
      settings = await prisma.settings.create({ data });
    }

    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
