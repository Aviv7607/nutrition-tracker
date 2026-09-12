import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

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

    const totalCal = meals.reduce((sum: number, m: any) => sum + m.calories, 0);
    const totalPro = meals.reduce((sum: number, m: any) => sum + m.protein, 0);
    const avgCal = Math.round(totalCal / (meals.length > 0 ? 7 : 1));
    const avgPro = Math.round(totalPro / (meals.length > 0 ? 7 : 1));

    const apiKey = process.env.GEMINI_API_KEY;
    const prompt = `
      You are an elite AI nutrition coach.
      Analyze the user's last 7 days.
      
      Total meals logged: ${meals.length}
      Average daily calories: ${avgCal}
      Average daily protein: ${avgPro}g
      
      Weight progression: ${weightLogs.map((w: any) => w.weight).join(' -> ')}
      
      Provide a comprehensive summary of their week in Hebrew (3-4 sentences).
      Give them specific praise and one strategic adjustment for the upcoming week.
    `;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    const tip = data.candidates?.[0]?.content?.parts?.[0]?.text || "שבוע מעולה עבר עלינו! בואו נתכונן לשבוע הבא.";

    let message = `🏆 *סיכום שבועי - המאמן האישי* 🏆\n\n`;
    message += `📊 *ממוצעים שבועיים:*\n`;
    message += `קלוריות (ממוצע ליום): ${avgCal}\n`;
    message += `חלבון (ממוצע ליום): ${avgPro}g\n`;
    if (weightLogs.length > 1) {
      const first = weightLogs[0].weight;
      const last = weightLogs[weightLogs.length - 1].weight;
      message += `משקל: מ-${first} ל-${last} ק"ג\n`;
    }
    message += `\n💡 *סיכום שבועי:*\n${tip}\n\nשבוע טוב ומבורך! 🙏`;

    const targetChatId = process.env.TARGET_CHAT_ID;
    if (targetChatId) {
      await sendWhatsAppMessage(targetChatId, message);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
