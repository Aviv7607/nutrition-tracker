import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay } from 'date-fns';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get('date'); // YYYY-MM-DD
  
  try {
    let whereClause = {};
    if (dateStr) {
      const date = new Date(dateStr);
      whereClause = {
        date: {
          gte: startOfDay(date),
          lte: endOfDay(date)
        }
      };
    }

    const meals = await prisma.meal.findMany({
      where: whereClause,
      orderBy: { date: 'asc' }
    });
    return NextResponse.json(meals);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const meal = await prisma.meal.create({
      data: {
        name: data.name,
        calories: Number(data.calories),
        protein: Number(data.protein),
        carbs: Number(data.carbs),
        fat: Number(data.fat),
        source: data.source || 'manual',
        date: data.date ? new Date(data.date) : new Date()
      }
    });
    return NextResponse.json(meal);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
