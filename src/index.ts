import { Hono } from 'hono'
import type { Env, TelegramUpdate } from './types'
import { handleWebhook } from './handlers/webhook'

const app = new Hono<{ Bindings: Env }>()

app.get('/', (c) => {
  return c.text('Telegram AI Assistant - Running')
})

app.post('/webhook', async (c) => {
  const secretToken = c.req.header('X-Telegram-Bot-Api-Secret-Token')

  if (secretToken !== c.env.TELEGRAM_SECRET_TOKEN) {
    return c.text('Unauthorized', 401)
  }

  const update: TelegramUpdate = await c.req.json()

  c.executionCtx.waitUntil(handleWebhook(update, c.env))

  return c.text('OK')
})

app.notFound((c) => {
  return c.text('Not Found', 404)
})

app.onError((err, c) => {
  console.error('App error:', err)
  return c.text('Internal Server Error', 500)
})

export default app
