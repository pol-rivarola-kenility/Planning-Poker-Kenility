import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    defaultProject: process.env.JIRA_DEFAULT_PROJECT || '',
  })
}
