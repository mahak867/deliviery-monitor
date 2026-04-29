import Joi from 'joi'
import { Request, Response, NextFunction } from 'express'

export function validate(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body, { abortEarly: false, stripUnknown: true })
    if (error) {
      const details = error.details.map((d) => d.message).join(', ')
      res.status(422).json({ success: false, error: `Validation error: ${details}` })
      return
    }
    next()
  }
}

// ── Schemas ───────────────────────────────────────────────────────────────────

export const sendOtpSchema = Joi.object({
  phone: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .required()
    .messages({ 'string.pattern.base': 'Phone must be a valid 10-digit Indian mobile number' }),
})

export const loginSchema = Joi.object({
  phone: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
  otp:   Joi.string().length(6).pattern(/^\d{6}$/).required(),
})

export const registerSchema = Joi.object({
  phone: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
  name:  Joi.string().min(2).max(60).required(),
  email: Joi.string().email().optional(),
  otp:   Joi.string().length(6).pattern(/^\d{6}$/).required(),
})

export const addShipmentSchema = Joi.object({
  trackingNumber: Joi.string().trim().min(5).max(50).required(),
  courier:        Joi.string().optional(),
})

export const searchSchema = Joi.object({
  q:       Joi.string().trim().min(1).max(100).required(),
  status:  Joi.string().optional(),
  courier: Joi.string().optional(),
  page:    Joi.number().integer().min(1).optional(),
  limit:   Joi.number().integer().min(1).max(50).optional(),
})
