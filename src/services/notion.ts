import { Client } from '@notionhq/client'
import { NOTION_API_VERSION, NOTION_API_BASE } from '../config'
import type { NotionPageInfo } from '../types'
import { logStep, logSuccess, logError } from '../utils/logger'

function getClient(token: string) {
  return new Client({
    auth: token,
    baseUrl: NOTION_API_BASE,
    notionVersion: NOTION_API_VERSION as '2022-06-28' | '2025-09-03',
  })
}

function extractTitle(page: Record<string, unknown>): string {
  const props = page.properties as Record<string, unknown> | undefined
  if (!props) return 'Tanpa Judul'

  const titleProp = props.Name ?? props.title
  if (!titleProp) return 'Tanpa Judul'

  const titleObj = titleProp as { title?: Array<{ plain_text?: string }> }
  if (titleObj.title && Array.isArray(titleObj.title)) {
    return titleObj.title.map((t) => t.plain_text ?? '').join('') || 'Tanpa Judul'
  }

  return 'Tanpa Judul'
}

export async function createChildPage(
  token: string,
  parentPageId: string,
  title: string,
  content: string
): Promise<NotionPageInfo> {
  logStep('NOTION', `Membuat page: ${title}`)
  const notion = getClient(token)

  const paragraphs = content.split('\n').filter((line) => line.trim().length > 0)

  const children = paragraphs.map((paragraph) => ({
    type: 'paragraph' as const,
    paragraph: {
      rich_text: [{ type: 'text' as const, text: { content: paragraph } }],
    },
  }))

  const response = await notion.pages.create({
    parent: { page_id: parentPageId },
    properties: {
      title: {
        title: [{ text: { content: title } }],
      },
    },
    children: children.length > 0
      ? children
      : [
          {
            type: 'paragraph' as const,
            paragraph: {
              rich_text: [{ type: 'text' as const, text: { content: content } }],
            },
          },
        ],
  })

  const res = response as Record<string, unknown>

  logSuccess('NOTION', `Page created: ${res.id as string}`)
  return {
    id: res.id as string,
    title,
    createdTime: (res.created_time as string) ?? new Date().toISOString(),
    url: (res.url as string) ?? '',
  }
}

export async function listChildPages(
  token: string,
  parentPageId: string
): Promise<NotionPageInfo[]> {
  const notion = getClient(token)

  const response = await notion.blocks.children.list({
    block_id: parentPageId,
    page_size: 100,
  })

  const pages: NotionPageInfo[] = []

  for (const block of response.results) {
    const b = block as Record<string, unknown>
    if (b.type === 'child_page') {
      const childPage = b.child_page as { title?: string }
      pages.push({
        id: b.id as string,
        title: childPage?.title ?? 'Tanpa Judul',
        createdTime: (b.created_time as string) ?? '',
        url: '',
      })
    }
  }

  return pages
}

export async function readPageContent(
  token: string,
  pageId: string
): Promise<{ title: string; content: string }> {
  const notion = getClient(token)

  const page = await notion.pages.retrieve({ page_id: pageId })
  const pageRecord = page as Record<string, unknown>
  const title = extractTitle(pageRecord)

  const blocks = await notion.blocks.children.list({
    block_id: pageId,
    page_size: 100,
  })

  const lines: string[] = []
  for (const block of blocks.results) {
    const b = block as Record<string, unknown>
    const blockType = b.type as string

    if (blockType === 'paragraph') {
      const para = b.paragraph as {
        rich_text?: Array<{ plain_text?: string }>
      }
      if (para.rich_text) {
        lines.push(para.rich_text.map((t) => t.plain_text ?? '').join(''))
      }
    } else if (blockType === 'heading_1') {
      const h = b.heading_1 as {
        rich_text?: Array<{ plain_text?: string }>
      }
      if (h.rich_text) {
        lines.push('# ' + h.rich_text.map((t) => t.plain_text ?? '').join(''))
      }
    } else if (blockType === 'heading_2') {
      const h = b.heading_2 as {
        rich_text?: Array<{ plain_text?: string }>
      }
      if (h.rich_text) {
        lines.push('## ' + h.rich_text.map((t) => t.plain_text ?? '').join(''))
      }
    } else if (blockType === 'heading_3') {
      const h = b.heading_3 as {
        rich_text?: Array<{ plain_text?: string }>
      }
      if (h.rich_text) {
        lines.push('### ' + h.rich_text.map((t) => t.plain_text ?? '').join(''))
      }
    } else if (blockType === 'bulleted_list_item') {
      const li = b.bulleted_list_item as {
        rich_text?: Array<{ plain_text?: string }>
      }
      if (li.rich_text) {
        lines.push('- ' + li.rich_text.map((t) => t.plain_text ?? '').join(''))
      }
    } else if (blockType === 'numbered_list_item') {
      const li = b.numbered_list_item as {
        rich_text?: Array<{ plain_text?: string }>
      }
      if (li.rich_text) {
        lines.push('1. ' + li.rich_text.map((t) => t.plain_text ?? '').join(''))
      }
    } else if (blockType === 'to_do') {
      const td = b.to_do as {
        rich_text?: Array<{ plain_text?: string }>
        checked?: boolean
      }
      if (td.rich_text) {
        const check = td.checked ? '☑' : '☐'
        lines.push(check + ' ' + td.rich_text.map((t) => t.plain_text ?? '').join(''))
      }
    } else if (blockType === 'code') {
      const code = b.code as {
        rich_text?: Array<{ plain_text?: string }>
        language?: string
      }
      if (code.rich_text) {
        lines.push('```' + (code.language ?? ''))
        lines.push(code.rich_text.map((t) => t.plain_text ?? '').join(''))
        lines.push('```')
      }
    } else if (blockType === 'divider') {
      lines.push('---')
    }
  }

  return { title, content: lines.join('\n') }
}

export async function deletePage(
  token: string,
  pageId: string
): Promise<boolean> {
  const notion = getClient(token)

  await notion.pages.update({
    page_id: pageId,
    in_trash: true,
  })

  return true
}

export async function appendPageContent(
  token: string,
  pageId: string,
  content: string
): Promise<boolean> {
  logStep('NOTION', `Menambah isi ke page: ${pageId}`)
  const notion = getClient(token)

  const paragraphs = content.split('\n').filter((line) => line.trim().length > 0)

  const children = paragraphs.map((paragraph) => ({
    type: 'paragraph' as const,
    paragraph: {
      rich_text: [{ type: 'text' as const, text: { content: paragraph } }],
    },
  }))

  if (children.length === 0) {
    children.push({
      type: 'paragraph' as const,
      paragraph: {
        rich_text: [{ type: 'text' as const, text: { content: content } }],
      },
    })
  }

  await notion.blocks.children.append({
    block_id: pageId,
    children,
  })

  logSuccess('NOTION', `Isi ditambahkan ke page: ${pageId}`)
  return true
}
