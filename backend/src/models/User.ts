import { query } from '../config/database'

export interface DbUser {
  id:          string
  phone:       string
  email?:      string
  name:        string
  role:        'user' | 'admin' | 'business'
  created_at:  string
  updated_at:  string
  preferences: Record<string, unknown>
}

export const UserModel = {
  async findByPhone(phone: string): Promise<DbUser | null> {
    try {
      const result = await query<DbUser>(
        'SELECT * FROM users WHERE phone = $1',
        [phone],
      )
      return result.rows[0] ?? null
    } catch {
      return null
    }
  },

  async findById(id: string): Promise<DbUser | null> {
    try {
      const result = await query<DbUser>(
        'SELECT * FROM users WHERE id = $1',
        [id],
      )
      return result.rows[0] ?? null
    } catch {
      return null
    }
  },

  async create(data: {
    phone:  string
    name:   string
    email?: string
    role?:  'user' | 'admin' | 'business'
  }): Promise<DbUser> {
    const result = await query<DbUser>(
      `INSERT INTO users (phone, name, email, role, preferences)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        data.phone,
        data.name,
        data.email ?? null,
        data.role  ?? 'user',
        JSON.stringify({ notifications: { push: true, sms: true, email: false, whatsapp: true }, theme: 'dark', language: 'en' }),
      ],
    )
    return result.rows[0]
  },

  async update(id: string, data: Partial<{ name: string; email: string; preferences: unknown }>): Promise<DbUser | null> {
    const fields: string[] = []
    const values: unknown[] = []
    let i = 1

    if (data.name         !== undefined) { fields.push(`name = $${i++}`);         values.push(data.name) }
    if (data.email        !== undefined) { fields.push(`email = $${i++}`);        values.push(data.email) }
    if (data.preferences  !== undefined) { fields.push(`preferences = $${i++}`);  values.push(JSON.stringify(data.preferences)) }

    if (fields.length === 0) return null

    fields.push(`updated_at = NOW()`)
    values.push(id)

    const result = await query<DbUser>(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values,
    )
    return result.rows[0] ?? null
  },
}
