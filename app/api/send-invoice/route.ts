import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const { to, subject, html } = await request.json()

    // Validar que llegaron todos los datos
    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos: to, subject, html' },
        { status: 400 }
      )
    }

    // Validar que la API key existe
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'RESEND_API_KEY no está configurada' },
        { status: 500 }
      )
    }

    // Enviar el email
    const data = await resend.emails.send({
      from: 'Estética Pro <onboarding@resend.dev>', // Email verificado de Resend
      to: [to],
      subject: subject,
      html: html,
    })

    console.log('Email enviado exitosamente:', data)

    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Email enviado correctamente'
    })

  } catch (error: any) {
    console.error('Error al enviar email:', error)
    
    return NextResponse.json(
      { 
        error: error.message || 'Error desconocido al enviar email',
        details: error
      },
      { status: 500 }
    )
  }
}