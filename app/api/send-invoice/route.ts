import { Resend } from 'resend'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { to, subject, html } = await request.json()

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'RESEND_API_KEY no está configurada' },
        { status: 500 }
      )
    }

    const resend = new Resend(process.env.RESEND_API_KEY)

    const data = await resend.emails.send({
      from: 'Estética Pro <onboarding@resend.dev>',
      to: [to],
      subject: subject,
      html: html,
    })

    return NextResponse.json({ success: true, data })

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}