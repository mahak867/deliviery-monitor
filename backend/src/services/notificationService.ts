/**
 * Notification service — send push/SMS/email notifications
 */
import nodemailer from 'nodemailer'
import { NotificationModel } from '../models/Notification'
import { logger } from '../config/logger'

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST ?? 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT ?? '587', 10),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

// ── Persisted in-app notification ────────────────────────────────────────────

export async function createNotification(opts: {
  userId:      string
  shipmentId?: string
  type:        string
  title:       string
  message:     string
}): Promise<void> {
  try {
    await NotificationModel.create(opts)
  } catch (err) {
    logger.error('createNotification error', { error: err })
  }
}

// ── Email notification ────────────────────────────────────────────────────────

export async function sendEmailNotification(opts: {
  to:      string
  subject: string
  html:    string
}): Promise<void> {
  if (!process.env.SMTP_USER) {
    logger.debug('SMTP not configured — skipping email')
    return
  }
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM ?? 'TrackAll <noreply@trackall.in>',
      ...opts,
    })
    logger.info('Email sent', { to: opts.to, subject: opts.subject })
  } catch (err) {
    logger.error('sendEmail error', { error: err })
  }
}

// ── SMS via Twilio ────────────────────────────────────────────────────────────

export async function sendSmsNotification(opts: {
  to:   string
  body: string
}): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken  = process.env.TWILIO_AUTH_TOKEN
  const from       = process.env.TWILIO_PHONE_NUMBER

  if (!accountSid || !authToken || !from) {
    logger.debug('Twilio not configured — skipping SMS')
    return
  }

  try {
    const twilio = (await import('twilio')).default
    const client = twilio(accountSid, authToken)
    await client.messages.create({ to: `+91${opts.to}`, from, body: opts.body })
    logger.info('SMS sent', { to: opts.to })
  } catch (err) {
    logger.error('sendSms error', { error: err })
  }
}

// ── Status change notification ────────────────────────────────────────────────

export async function notifyStatusChange(opts: {
  userId:        string
  shipmentId:    string
  trackingNumber: string
  status:        string
  courier:       string
  userEmail?:    string
  userPhone?:    string
  userName?:     string
}): Promise<void> {
  const { userId, shipmentId, trackingNumber, status, courier, userEmail, userPhone, userName = 'Customer' } = opts

  const statusMessages: Record<string, { title: string; message: string }> = {
    out_for_delivery: {
      title:   '🛵 Out for Delivery!',
      message: `Your ${courier} shipment (${trackingNumber}) is out for delivery. Expect it today!`,
    },
    delivered: {
      title:   '✅ Delivered!',
      message: `Your ${courier} shipment (${trackingNumber}) has been delivered. Enjoy!`,
    },
    delayed: {
      title:   '⚠️ Delivery Delayed',
      message: `Your ${courier} shipment (${trackingNumber}) has been delayed. We'll update you soon.`,
    },
    failed_delivery: {
      title:   '🚫 Delivery Attempt Failed',
      message: `Delivery attempt failed for ${trackingNumber}. A re-delivery will be scheduled.`,
    },
  }

  const notifData = statusMessages[status]
  if (!notifData) return

  await createNotification({
    userId,
    shipmentId,
    type:    status === 'delivered' ? 'delivered' : status === 'delayed' ? 'delay_alert' : 'status_update',
    title:   notifData.title,
    message: notifData.message,
  })

  if (userEmail) {
    await sendEmailNotification({
      to:      userEmail,
      subject: notifData.title,
      html:    `<p>Hi ${userName},</p><p>${notifData.message}</p><p>— TrackAll</p>`,
    })
  }

  if (userPhone) {
    await sendSmsNotification({ to: userPhone, body: notifData.message })
  }
}
