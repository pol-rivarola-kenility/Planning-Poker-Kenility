import { NextRequest, NextResponse } from 'next/server'

interface UpdatePayload {
  baseUrl: string
  email?: string
  token: string
  updates: { jiraKey: string; storyPoints: number }[]
}

// Jira Cloud typically uses customfield_10016 for Story Points.
// Some instances use story_points or customfield_10028 (next-gen).
// We attempt the most common field first and fall back.
const STORY_POINTS_FIELDS = ['story_points', 'customfield_10016', 'customfield_10028']

async function updateIssue(
  baseUrl: string,
  authHeader: string,
  jiraKey: string,
  storyPoints: number
): Promise<{ key: string; success: boolean; error?: string }> {
  // Try each field name until one works
  for (const field of STORY_POINTS_FIELDS) {
    const url = `${baseUrl}/rest/api/3/issue/${jiraKey}`
    const body = JSON.stringify({ fields: { [field]: storyPoints } })

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: authHeader,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body,
      signal: AbortSignal.timeout(10000),
    })

    if (res.status === 204) {
      // Success — Jira returns 204 No Content on successful update
      return { key: jiraKey, success: true }
    }

    if (res.status === 400) {
      // Field probably doesn't exist — try the next one
      continue
    }

    if (res.status === 401) {
      return { key: jiraKey, success: false, error: 'Unauthorized — check credentials' }
    }

    if (res.status === 403) {
      return { key: jiraKey, success: false, error: 'Forbidden — no permission to edit this issue' }
    }

    if (res.status === 404) {
      return { key: jiraKey, success: false, error: `Issue ${jiraKey} not found` }
    }
  }

  return { key: jiraKey, success: false, error: 'Could not find Story Points field on this Jira instance' }
}

export async function POST(req: NextRequest) {
  let body: UpdatePayload

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { baseUrl, email, token, updates } = body

  if (!baseUrl || !token || !Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json({ error: 'baseUrl, token and updates[] are required' }, { status: 400 })
  }

  const cleanBase = baseUrl.replace(/\/$/, '')
  const authHeader = email
    ? `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`
    : `Bearer ${token}`

  const results = await Promise.all(
    updates.map(({ jiraKey, storyPoints }) =>
      updateIssue(cleanBase, authHeader, jiraKey, storyPoints)
    )
  )

  const failed = results.filter(r => !r.success)
  const succeeded = results.filter(r => r.success)

  return NextResponse.json({
    succeeded: succeeded.length,
    failed: failed.length,
    results,
  })
}
