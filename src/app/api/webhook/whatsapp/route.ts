import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseMealWithGemini } from '@/lib/gemini';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { calculateTargets } from '@/lib/nutrition';
import { startOfDay, endOfDay } from 'date-fns';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Green-API webhook structure
    const senderData = body.senderData || {};
    const chatId = senderData.chatId;

    // Log the entire body for debugging
    console.log("Incoming Webhook:", JSON.stringify(body, null, 2));

    const targetChatId = process.env.TARGET_CHAT_ID;

    // Strict Isolation check
    if (chatId !== targetChatId) {
      return NextResponse.json({ status: 'ignored_wrong_chat' }, { status: 200 });
    }

    if (body.typeWebhook !== 'incomingMessageReceived') {
      return NextResponse.json({ status: 'ignored_not_incoming' }, { status: 200 });
    }

    const messageData = body.messageData || {};
    let textMessage = '';

    if (messageData.typeMessage === 'textMessage') {
      textMessage = messageData.textMessageData?.textMessage || '';
    } else if (messageData.typeMessage === 'extendedTextMessage') {
      textMessage = messageData.extendedTextMessageData?.text || '';
    }

    if (!textMessage.trim()) {
      return NextResponse.json({ status: 'no_text' }, { status: 200 });
    }

    // Process with Gemini
    const macroData = await parseMealWithGemini(textMessage);
    
    if (!macroData || typeof macroData.calories !== 'number') {
      console.error("Gemini failed to parse macros:", macroData);
      return NextResponse.json({ status: 'parse_error' }, { status: 200 });
    }

    // Save to DB
    const newMeal = await prisma.meal.create({
      data: {
        name: macroData.meal_name,
        calories: macroData.calories,
        protein: macroData.protein,
        carbs: macroData.carbs,
        fat: macroData.fat,
        source: 'whatsapp'
      }
    });

    // Get today's stats for the response
    const today = new Date();
    const start = startOfDay(today);
    const end = endOfDay(today);

    const todaysMeals = await prisma.meal.findMany({
      where: {
        date: { gte: start, lte: end }
      }
    });

    const consumedCalories = todaysMeals.reduce((sum: number, meal: any) => sum + meal.calories, 0);
    const consumedProtein = todaysMeals.reduce((sum: number, meal: any) => sum + meal.protein, 0);

    // Get settings & weight to calculate targets
    const settings = await prisma.settings.findFirst() || {
      gender: "male", age: 29, height: 177, activityLevel: 1.55, targetDeficit: 500, proteinPerKg: 2.0
    };
    
    const latestWeight = await prisma.weightLog.findFirst({
      orderBy: { date: 'desc' }
    });
    
    const weightKg = latestWeight ? latestWeight.weight : 110;

    const targets = calculateTargets(
      weightKg, settings.height, settings.age, settings.gender, 
      settings.activityLevel, settings.targetDeficit, settings.proteinPerKg
    );

    const remainingCalories = Math.round(targets.dailyCalorieTarget - consumedCalories);

    // Construct response message
    const responseText = `🥗 נרשמה ארוחה: ${newMeal.name}
• קלוריות: ${newMeal.calories}
• חלבון: ${newMeal.protein} גרם
• פחמימות: ${newMeal.carbs} גרם
• שומן: ${newMeal.fat} גרם

📊 סה"כ היום: ${Math.round(consumedCalories)} / ${Math.round(targets.dailyCalorieTarget)} קק"ל
נותרו: ${remainingCalories} קק"ל | חלבון: ${Math.round(consumedProtein)}/${Math.round(targets.targetProtein)} גרם`;

    await sendWhatsAppMessage(chatId, responseText);

    return NextResponse.json({ status: 'success', meal: newMeal }, { status: 200 });

  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ status: 'error', error: String(error) }, { status: 500 });
  }
}
