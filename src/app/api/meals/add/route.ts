import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseMealWithGemini } from '@/lib/gemini';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { calculateTargets } from '@/lib/nutrition';
import { startOfDay, endOfDay } from 'date-fns';

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 });
    }

    // Parse with Gemini
    const mealData = await parseMealWithGemini(text);

    // Save to database
    const meal = await prisma.meal.create({
      data: {
        name: mealData.name,
        originalText: text,
        calories: mealData.calories,
        protein: mealData.protein,
        carbs: mealData.carbs,
        fat: mealData.fat,
        source: 'web'
      }
    });

    // Get today's stats for WhatsApp reply
    const today = new Date();
    const mealsToday = await prisma.meal.findMany({
      where: {
        date: {
          gte: startOfDay(today),
          lte: endOfDay(today)
        }
      }
    });

    const settings = await prisma.settings.findFirst();
    const weightLog = await prisma.weightLog.findFirst({ orderBy: { date: 'desc' } });
    
    let replyText = `🥗 נרשמה ארוחה (הוזנה מהאתר): ${meal.name}\n🔥 קלוריות: ${meal.calories}\n💪 חלבון: ${meal.protein}g`;

    if (settings && weightLog) {
      const targets = calculateTargets(
        weightLog.weight, settings.height, settings.age, settings.gender,
        settings.activityLevel, settings.targetDeficit, settings.proteinPerKg
      );

      const totalCal = mealsToday.reduce((s: number, m: any) => s + m.calories, 0);
      const totalPro = mealsToday.reduce((s: number, m: any) => s + m.protein, 0);

      replyText += `\n\n📊 סיכום יומי:\nקלוריות: ${totalCal} / ${Math.round(targets.dailyCalorieTarget)}\nחלבון: ${totalPro} / ${Math.round(targets.targetProtein)}`;
    }

    // Send WhatsApp notification
    const targetChatId = process.env.TARGET_CHAT_ID;
    if (targetChatId) {
      await sendWhatsAppMessage(targetChatId, replyText);
    }

    return NextResponse.json({ success: true, meal });
  } catch (error: any) {
    console.error("Error adding manual meal:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
