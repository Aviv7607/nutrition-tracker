import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { subDays, startOfDay, endOfDay } from 'date-fns';

export async function GET(req: Request) {
  try {
    const today = new Date();
    const lastWeek = subDays(today, 7);

    const meals = await prisma.meal.findMany({
      where: {
        date: {
          gte: startOfDay(lastWeek),
          lte: endOfDay(today)
        }
      }
    });

    const weightLogs = await prisma.weightLog.findMany({
      where: {
        date: {
          gte: startOfDay(lastWeek),
          lte: endOfDay(today)
        }
      },
      orderBy: { date: 'asc' }
    });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

    const prompt = `
      You are an elite, encouraging, and empathetic AI nutrition coach.
      Analyze the user's last 7 days of data.
      
      Total meals logged: ${meals.length}
      Average daily calories: ${meals.reduce((sum: number, m: any) => sum + m.calories, 0) / 7}
      Average daily protein: ${meals.reduce((sum: number, m: any) => sum + m.protein, 0) / 7}g
      
      Weight progression (if any): ${weightLogs.map((w: any) => w.weight).join(' -> ')}
      
      Provide a SINGLE short, punchy paragraph (up to 3 sentences) in Hebrew. 
      Give them one specific tip for improvement or maintenance based on their data. 
      Be very encouraging and use a friendly tone (use an emoji or two). 
      If they don't have enough data, just encourage them to keep logging!
    `;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    const data = await response.json();
    const tips = data.candidates?.[0]?.content?.parts?.[0]?.text || "תמשיך ככה! הדרך להצלחה מתחילה בהתמדה 💪";

    return NextResponse.json({ tips });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
