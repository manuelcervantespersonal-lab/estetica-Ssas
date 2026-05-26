import { Resend } from 'resend'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { to, subject, html } = await request.json()

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos: to, subject, html' },
        { status: 400 }
      )
    }

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

    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Email enviado correctamente'
    })

  } catch (error: any) {
    console.error('Error al enviar email:', error)
    return NextResponse.json(
      { error: error.message || 'Error desconocido al enviar email' },
      { status: 500 }
    )
  }
}