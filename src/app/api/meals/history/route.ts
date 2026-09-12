import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';

export async function GET() {
  try {
    const today = new Date();
    const last7Days = Array.from({ length: 7 }).map((_, i) => subDays(today, 6 - i));
    
    const history = [];

    for (const day of last7Days) {
      const meals = await prisma.meal.findMany({
        where: {
          date: {
            gte: startOfDay(day),
            lte: endOfDay(day)
          }
        }
      });
      
      const calories = meals.reduce((sum: number, m: any) => sum + m.calories, 0);
      const protein = meals.reduce((sum: number, m: any) => sum + m.protein, 0);
      
      history.push({
        date: format(day, 'yyyy-MM-dd'),
        displayDate: format(day, 'dd/MM'),
        calories,
        protein
      });
    }

    return NextResponse.json(history);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
