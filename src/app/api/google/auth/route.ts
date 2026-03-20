import { NextResponse } from 'next/server'
import { google } from 'googleapis'

function getEnv(name: string) {
  return process.env[name]?.trim()
}

function getOAuthClient() {
  return new google.auth.OAuth2(
    getEnv('GOOGLE_CLIENT_ID'),
    getEnv('GOOGLE_CLIENT_SECRET'),
    getEnv('GOOGLE_REDIRECT_URI')
  )
}

export async function GET() {
  const oauth2Client = getOAuthClient()

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly',
    ],
  })

  return NextResponse.redirect(url)
}
