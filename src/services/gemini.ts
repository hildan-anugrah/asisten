import { GEMINI_API_BASE, GEMINI_MODEL, SYSTEM_PROMPT } from '../config'
import type { GeminiResponse } from '../types'
import { logStep, logSuccess, logError } from '../utils/logger'

export async function analyzeWithGemini(
  apiKey: string,
  documentText: string
): Promise<string> {
  const url = `${GEMINI_API_BASE}/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`

  logStep('GEMINI', `Mengirim ${documentText.length} karakter ke AI...`)
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents: [
        {
          parts: [
            {
              text: `Analisis dokumen berikut:\n\n${documentText}`,
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    logError('GEMINI', `API error: ${response.status}`)
    throw new Error(`Gemini API error: ${response.status} - ${error}`)
  }

  const data: GeminiResponse = await response.json()

  if (data.error) {
    logError('GEMINI', data.error.message)
    throw new Error(`Gemini error: ${data.error.message}`)
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!text) {
    logError('GEMINI', 'No text in response')
    throw new Error('No text in Gemini response')
  }

  logSuccess('GEMINI', `Hasil: ${text.length} karakter`)
  return text
}
