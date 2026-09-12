import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay } from 'date-fns';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { calculateTargets } from '@/lib/nutrition';

export async function GET(req: Request) {
  try {
    const today = new Date();
    const meals = await prisma.meal.findMany({
      where: {
        date: {
          gte: startOfDay(today),
          lte: endOfDay(today)
        }
      }
    });

    const settings = await prisma.settings.findFirst();
    const weightLog = await prisma.weightLog.findFirst({ orderBy: { date: 'desc' } });

    if (!settings || !weightLog) {
      return NextResponse.json({ error: "Missing settings" }, { status: 400 });
    }

    const targets = calculateTargets(
      weightLog.weight, settings.height, settings.age, settings.gender,
      settings.activityLevel, settings.targetDeficit, settings.proteinPerKg
    );

    const totalCal = meals.reduce((sum: number, m: any) => sum + m.calories, 0);
    const totalPro = meals.reduce((sum: number, m: any) => sum + m.protein, 0);

    const apiKey = process.env.GEMINI_API_KEY;
    const prompt = `
      You are an elite AI nutrition coach.
      Analyze the user's meals for today.
      Target Calories: ${Math.round(targets.dailyCalorieTarget)}
      Target Protein: ${Math.round(targets.targetProtein)}g
      
      Consumed Calories: ${totalCal}
      Consumed Protein: ${totalPro}
      
      Number of meals: ${meals.length}
      
      Provide a short, punchy summary of their day in Hebrew (up to 3 sentences).
      Give them a compliment and a quick tip for tomorrow. Use emojis.
    `;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    const tip = data.candidates?.[0]?.content?.parts?.[0]?.text || "כל הכבוד על היום! תמשיך ככה מחר 💪";

    let message = `🌙 *סיכום יום מהמאמן האישי* 🌙\n\n`;
    message += `📊 *הנתונים שלך להיום:*\n`;
    message += `קלוריות: ${totalCal} / ${Math.round(targets.dailyCalorieTarget)}\n`;
    message += `חלבון: ${totalPro}g / ${Math.round(targets.targetProtein)}g\n\n`;
    message += `💡 *הטיפ היומי:*\n${tip}`;

    const targetChatId = process.env.TARGET_CHAT_ID;
    if (targetChatId) {
      await sendWhatsAppMessage(targetChatId, message);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
