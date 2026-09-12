export async function sendWhatsAppMessage(chatId: string, message: string) {
  const idInstance = process.env.GREEN_API_ID_INSTANCE;
  const apiToken = process.env.GREEN_API_API_TOKEN;
  const baseUrl = process.env.GREEN_API_BASE_URL || "https://api.green-api.com";

  if (!idInstance || !apiToken) {
    console.error("Green API credentials missing");
    return null;
  }

  const url = `${baseUrl}/waInstance${idInstance}/sendMessage/${apiToken}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chatId,
      message
    })
  });

  if (!response.ok) {
    console.error(`Green API error: ${await response.text()}`);
    return null;
  }
  return response.json();
}
