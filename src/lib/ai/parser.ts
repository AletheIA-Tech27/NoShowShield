import { GoogleGenerativeAI } from '@google/generative-ai';

export interface IntentResult {
  intent: 'BOOK' | 'CANCEL' | 'RESCHEDULE' | 'OTHER';
  date: string | null;
  time: string | null;
  raw_summary: string;
}

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

export async function parseAppointmentIntent(message: string): Promise<IntentResult> {
  if (!apiKey) {
    console.error('[AI Parser] GEMINI_API_KEY no está configurada');
    return {
      intent: 'OTHER',
      date: null,
      time: null,
      raw_summary: 'API key no configurada',
    };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Try multiple models with fallback
  const models = ['gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-3.6-flash'];
  let lastError: any = null;

  for (const model of models) {
    try {
      const geminiModel = genAI.getGenerativeModel({
        model: model,
        systemInstruction: `Eres un asistente especializado en extracción de información de citas médicas. 
        Analiza el mensaje del paciente y extrae información estructurada sobre su intención.
        
        Clasifica la intención en una de estas categorías:
        - BOOK: El paciente quiere agendar una nueva cita
        - CANCEL: El paciente quiere cancelar una cita existente
        - RESCHEDULE: El paciente quiere cambiar/reagendar una cita existente
        - OTHER: Mensaje no relacionado con citas o no comprensible
        
        Extrae fecha y hora si están mencionadas en el mensaje.
        
        Responde ÚNICAMENTE en formato JSON válido con las claves exactas: intent, date, time, raw_summary`,
      });

      const prompt = `Mensaje del paciente: "${message}"
      
      Extrae la información relevante y responde en JSON.`;

      const result = await geminiModel.generateContent(prompt);
      const response = result.response.text();
      
      // Parse the JSON response
      const parsed: IntentResult = JSON.parse(response);
      return parsed;
    } catch (error) {
      lastError = error;
      console.error(`[AI Parser] Error with model ${model}:`, error);
    }
  }

  // If all models fail, return a default response
  console.error('[AI Parser] All models failed:', lastError);
  return {
    intent: 'OTHER',
    date: null,
    time: null,
    raw_summary: 'Error al procesar con IA',
  };
}