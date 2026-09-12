import { NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

export async function GET(req: Request) {
  try {
    const targetChatId = process.env.TARGET_CHAT_ID;
    if (targetChatId) {
      await sendWhatsAppMessage(targetChatId, "💧 תזכורת מהמאמן: הגיע הזמן לשתות כוס מים! אל תשכח לשמור על רוויה, זה קריטי לתהליך שלך.");
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
