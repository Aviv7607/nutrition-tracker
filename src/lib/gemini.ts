export async function parseMealWithGemini(text: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const prompt = `
    Analyze the following meal text and extract the nutritional information.
    Provide the response strictly as a JSON object with the following keys:
    - name: string (short descriptive name of the food)
    - calories: number
    - protein: number (in grams)
    - carbs: number (in grams)
    - fat: number (in grams)
    
    Meal text: "${text}"
    
    If the text doesn't look like food, return realistic estimates of 0. 
    Provide meal_name in Hebrew.
  `;

  return callGemini(apiKey, prompt);
}

export async function parseMealFromImage(base64Image: string, mimeType: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const prompt = `
    Analyze the food in this image and extract the nutritional information.
    Provide the response strictly as a JSON object with the following keys:
    - name: string (short descriptive name of the food in Hebrew)
    - calories: number
    - protein: number (in grams)
    - carbs: number (in grams)
    - fat: number (in grams)
    
    If there is no food in the image, return realistic estimates of 0.
  `;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType, data: base64Image } }
        ]
      }],
      systemInstruction: {
        parts: [{ text: "You are a professional nutritionist. Always return valid JSON only, without any markdown formatting blocks like ```json." }]
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${await response.text()}`);
  }

  const data = await response.json();
  const rawText = data.candidates[0].content.parts[0].text;
  
  const cleanedText = rawText.replace(/```json\n/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleanedText);
}

async function callGemini(apiKey: string, prompt: string) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: "You are a nutrition macro expert." }]
      },
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        response_mime_type: "application/json"
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${await response.text()}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  return JSON.parse(rawText);
}
