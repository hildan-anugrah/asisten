import { KV_TTL_SECONDS } from '../config'
import type { PendingFileInfo } from '../types'

const FILE_TTL = 300 // 5 menit
const PAGE_LIST_TTL = 3600 // 1 jam

export function buildKVKey(chatId: number, messageId: number): string {
  return `msg_${chatId}_${messageId}`
}

export function buildFileKey(chatId: number): string {
  return `file_${chatId}`
}

export async function saveToKV(
  kv: KVNamespace,
  chatId: number,
  messageId: number,
  value: string
): Promise<void> {
  const key = buildKVKey(chatId, messageId)
  await kv.put(key, value, { expirationTtl: KV_TTL_SECONDS })
}

export async function getFromKV(
  kv: KVNamespace,
  chatId: number,
  messageId: number
): Promise<string | null> {
  const key = buildKVKey(chatId, messageId)
  return kv.get(key)
}

export async function deleteFromKV(
  kv: KVNamespace,
  chatId: number,
  messageId: number
): Promise<void> {
  const key = buildKVKey(chatId, messageId)
  await kv.delete(key)
}

export async function saveFileInfo(
  kv: KVNamespace,
  chatId: number,
  info: PendingFileInfo
): Promise<void> {
  const key = buildFileKey(chatId)
  await kv.put(key, JSON.stringify(info), { expirationTtl: FILE_TTL })
}

export async function getFileInfo(
  kv: KVNamespace,
  chatId: number
): Promise<PendingFileInfo | null> {
  const key = buildFileKey(chatId)
  const data = await kv.get(key)
  if (!data) return null
  return JSON.parse(data) as PendingFileInfo
}

export async function deleteFileInfo(
  kv: KVNamespace,
  chatId: number
): Promise<void> {
  const key = buildFileKey(chatId)
  await kv.delete(key)
}

export function buildPageListKey(chatId: number): string {
  return `pagelist_${chatId}`
}

export async function savePageList(
  kv: KVNamespace,
  chatId: number,
  pageIds: string[]
): Promise<void> {
  const key = buildPageListKey(chatId)
  await kv.put(key, JSON.stringify(pageIds), { expirationTtl: PAGE_LIST_TTL })
}

export async function getPageList(
  kv: KVNamespace,
  chatId: number
): Promise<string[] | null> {
  const key = buildPageListKey(chatId)
  const data = await kv.get(key)
  if (!data) return null
  return JSON.parse(data) as string[]
}

export async function getPageIdByIndex(
  kv: KVNamespace,
  chatId: number,
  index: number
): Promise<string | null> {
  const pageIds = await getPageList(kv, chatId)
  if (!pageIds || index < 1 || index > pageIds.length) return null
  return pageIds[index - 1]
}

export async function deletePageList(
  kv: KVNamespace,
  chatId: number
): Promise<void> {
  const key = buildPageListKey(chatId)
  await kv.delete(key)
}
