import { NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

export async function GET(req: Request) {
  try {
    const targetChatId = process.env.TARGET_CHAT_ID;
    if (targetChatId) {
      await sendWhatsAppMessage(targetChatId, "💉 *תזכורת חשובה:* היום יום חמישי - לא לשכוח לקחת את הזריקה השבועית שלך! הרבה בריאות 💪");
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
