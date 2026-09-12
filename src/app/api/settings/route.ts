import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    let settings = await prisma.settings.findFirst();
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          gender: "male",
          age: 29,
          height: 177,
          activityLevel: 1.55,
          targetDeficit: 500,
          proteinPerKg: 2.0
        }
      });
    }
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const data = await req.json();
    let settings = await prisma.settings.findFirst();
    
    if (settings) {
      settings = await prisma.settings.update({
        where: { id: settings.id },
        data: {
          gender: data.gender ?? settings.gender,
          age: Number(data.age ?? settings.age),
          height: Number(data.height ?? settings.height),
          activityLevel: Number(data.activityLevel ?? settings.activityLevel),
          targetDeficit: Number(data.targetDeficit ?? settings.targetDeficit),
          proteinPerKg: Number(data.proteinPerKg ?? settings.proteinPerKg),
        }
      });
    }
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
