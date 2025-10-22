import { NextRequest, NextResponse } from 'next/server'

// Simple in-memory storage for development (replace with database in production)
// In production, integrate with: Mailchimp, ConvertKit, SendGrid, or custom database
const waitlistEmails: string[] = []

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Check for duplicate
    if (waitlistEmails.includes(email.toLowerCase())) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      )
    }

    // Store email (in production, save to database or email service)
    waitlistEmails.push(email.toLowerCase())
    console.log('Waitlist signup:', email)

    // TODO: In production, integrate with email service:
    // - Mailchimp API: Add to audience
    // - ConvertKit API: Add subscriber
    // - SendGrid: Add to list
    // - Database: Save to PostgreSQL/MongoDB

    // Example Mailchimp integration (commented out):
    /*
    const MAILCHIMP_API_KEY = process.env.MAILCHIMP_API_KEY
    const MAILCHIMP_LIST_ID = process.env.MAILCHIMP_LIST_ID
    const MAILCHIMP_DC = process.env.MAILCHIMP_DC // e.g., 'us1'

    const response = await fetch(
      `https://${MAILCHIMP_DC}.api.mailchimp.com/3.0/lists/${MAILCHIMP_LIST_ID}/members`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${MAILCHIMP_API_KEY}`,
        },
        body: JSON.stringify({
          email_address: email,
          status: 'subscribed',
          tags: ['waitlist'],
        }),
      }
    )

    if (!response.ok) {
      throw new Error('Failed to add to Mailchimp')
    }
    */

    return NextResponse.json(
      {
        success: true,
        message: 'Successfully joined waitlist'
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Waitlist API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve waitlist count (optional, for admin)
export async function GET() {
  return NextResponse.json({
    count: waitlistEmails.length,
    // Don't expose actual emails for privacy
  })
}
