import { NextRequest, NextResponse } from 'next/server'

interface JiraIssue {
  key: string
  fields: {
    summary: string
    description?: {
      type?: string
      content?: AdfNode[]
      [key: string]: unknown
    } | string | null
  }
}

interface AdfNode {
  type: string
  text?: string
  content?: AdfNode[]
}

function extractTextFromAdf(node: AdfNode): string {
  if (node.type === 'text' && node.text) return node.text
  if (node.content) return node.content.map(extractTextFromAdf).join('')
  return ''
}

function extractDescription(description: IssueFields['description']): string | null {
  if (!description) return null
  if (typeof description === 'string') return description

  // Atlassian Document Format (Jira Cloud)
  if (description.type === 'doc' && Array.isArray(description.content)) {
    return description.content.map(node => extractTextFromAdf(node as AdfNode)).join('\n').trim() || null
  }

  return null
}

type IssueFields = JiraIssue['fields']

export async function POST(req: NextRequest) {
  let body: { baseUrl?: string; email?: string; token?: string; jql?: string; maxResults?: number }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { baseUrl, email, token, jql, maxResults = 50 } = body

  if (!baseUrl || !token || !jql) {
    return NextResponse.json({ error: 'baseUrl, token, and jql are required' }, { status: 400 })
  }

  // Validate baseUrl is https
  const cleanBase = baseUrl.replace(/\/$/, '')
  if (!cleanBase.startsWith('https://') && !cleanBase.startsWith('http://')) {
    return NextResponse.json({ error: 'baseUrl must start with https://' }, { status: 400 })
  }

  // Build auth header
  // Jira Cloud: Basic auth with email:token
  // Jira Server/DC: Bearer token (PAT)
  const authHeader = email
    ? `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`
    : `Bearer ${token}`

  const url = `${cleanBase}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}&fields=summary,description`

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: authHeader,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      // 10 second timeout
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      if (response.status === 401) {
        return NextResponse.json({ error: 'Unauthorized — check your Jira credentials' }, { status: 401 })
      }
      if (response.status === 400) {
        return NextResponse.json({ error: `Invalid JQL query: ${errorText}` }, { status: 400 })
      }
      return NextResponse.json(
        { error: `Jira returned ${response.status}: ${errorText.slice(0, 200)}` },
        { status: 502 }
      )
    }

    const data = await response.json() as { issues?: JiraIssue[] }

    if (!data.issues) {
      return NextResponse.json({ tickets: [] })
    }

    const tickets = data.issues.map(issue => ({
      key: issue.key,
      summary: issue.fields.summary,
      description: extractDescription(issue.fields.description as IssueFields['description']),
      url: `${cleanBase}/browse/${issue.key}`,
    }))

    return NextResponse.json({ tickets })
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      return NextResponse.json({ error: 'Jira request timed out' }, { status: 504 })
    }
    console.error('[jira proxy error]', err)
    return NextResponse.json({ error: 'Failed to connect to Jira' }, { status: 502 })
  }
}
