import { NextRequest, NextResponse } from 'next/server';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

export async function POST(req: NextRequest) {
  try {
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY no está configurada.' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { message, patientName, appointmentDate } = body;

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'El campo message es requerido.' },
        { status: 400 }
      );
    }

    const systemInstruction = `
      Eres el motor de extracción de intenciones de NoShowShield para clínicas médicas.
      Analiza el mensaje entrante del paciente y clasifica su intención en uno de los siguientes valores exactos:
      - CONFIRM (Confirma asistencia)
      - CANCEL (Cancela cita)
      - RESCHEDULE (Pide reagendar)
      - UNKNOWN (Mensaje no relacionado o no claro)

      Responde ÚNICAMENTE en formato JSON válido con las claves:
      - intent: string (CONFIRM | CANCEL | RESCHEDULE | UNKNOWN)
      - confidence: number (entre 0.0 y 1.0)
      - reason: string (resumen breve del motivo)
    `;

    const userPrompt = `
      Nombre del Paciente: ${patientName || 'No especificado'}
      Fecha de Cita Actual: ${appointmentDate || 'No especificada'}
      Mensaje del Paciente: "${message}"
    `;

    // Probar modelos activos en v1beta
    const candidateModels = ['gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-3.6-flash'];
    let lastError = null;
    let parsedData = null;

    for (const model of candidateModels) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: { response_mime_type: 'application/json' }
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        parsedData = rawText ? JSON.parse(rawText) : null;
        break; // Éxito, salir del loop
      } else {
        lastError = await response.json();
      }
    }

    if (!parsedData) {
      console.error('Error REST Gemini API (Todos los modelos fallaron):', lastError);
      return NextResponse.json(
        { success: false, error: lastError?.error?.message || 'No se pudo conectar con los modelos de Gemini.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: parsedData,
    });

  } catch (error: any) {
    console.error('Error en Intent Parser:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}