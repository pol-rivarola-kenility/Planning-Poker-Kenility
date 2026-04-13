import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    baseUrl: process.env.JIRA_BASE_URL || '',
    email: process.env.JIRA_EMAIL || '',
    hasToken: !!process.env.JIRA_TOKEN,
    defaultProject: process.env.JIRA_DEFAULT_PROJECT || '',
  })
}
