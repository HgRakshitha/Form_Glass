import { type Context, Hono } from 'hono'
import { cors } from 'hono/cors'
import { sign, verify } from 'hono/jwt'
import type { Question, ResponseRow, SurveyRow } from './db'
import { parseResponseRow, parseSurveyRow } from './db'

interface CustomEnv extends Env {
  JWT_SECRET?: string
}

const app = new Hono<{ Bindings: CustomEnv }>()

// Enable CORS
app.use('*', cors())

// Helper to get JWT Secret
const getJwtSecret = (env: CustomEnv) => {
  // If not configured in environment, fallback to a local development key
  return env.JWT_SECRET || 'local-development-secret-key-987654321'
}

// Authentication Middleware Helper
async function authenticate(
  c: Context<{ Bindings: CustomEnv }>,
): Promise<{ userId: string; email: string } | null> {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }
  const token = authHeader.split(' ')[1]
  if (!token) {
    return null
  }
  try {
    const secret = getJwtSecret(c.env)
    const payload = await verify(token, secret, 'HS256')
    if (payload && typeof payload.sub === 'string' && typeof payload.email === 'string') {
      return { userId: payload.sub, email: payload.email }
    }
  } catch (err) {
    console.error('JWT Verification Error:', err)
  }
  return null
}

// Global error handler
app.onError((err, c) => {
  console.error('API Error:', err)
  return c.json({ error: 'Internal Server Error', message: err.message }, 500)
})

// 1. Health check
app.get('/api/health', (c) => c.json({ status: 'ok' }))

// 2. Authentication: Request Magic Link
app.post('/api/auth/send-link', async (c) => {
  const { email } = await c.req.json<{ email: string }>()
  if (!email?.includes('@')) {
    return c.json({ error: 'Invalid email address' }, 400)
  }

  // Generate verification token
  const token = crypto.randomUUID()
  const expiresAt = Date.now() + 15 * 60 * 1000 // 15 minutes in ms

  // Save token to DB
  await c.env.DB.prepare('INSERT INTO login_tokens (token, email, expires_at) VALUES (?, ?, ?)')
    .bind(token, email.trim().toLowerCase(), expiresAt)
    .run()

  // Dynamically determine the frontend origin from the request headers
  const origin = c.req.header('Origin') || 'http://localhost:5173'
  const magicLink = `${origin}/login/verify?token=${token}`
  console.log('\n========================================================')
  console.log(`[AUTH] Magic Link requested for ${email}`)
  console.log(`[AUTH] URL: ${magicLink}`)
  console.log('========================================================\n')

  // Security: only return devMagicLink in response JSON if running in local development mode.
  // We identify local development if the request origin is localhost/127.0.0.1 or JWT_SECRET is not configured.
  const isLocalDev =
    origin.includes('localhost') || origin.includes('127.0.0.1') || !c.env.JWT_SECRET

  return c.json({
    status: 'ok',
    message: 'Magic link generated successfully.',
    ...(isLocalDev ? { devMagicLink: magicLink } : {}),
  })
})

// 3. Authentication: Verify Magic Link and retrieve JWT
app.post('/api/auth/verify', async (c) => {
  const { token } = await c.req.json<{ token: string }>()
  if (!token) {
    return c.json({ error: 'Token is required' }, 400)
  }

  // Find token
  const dbToken = await c.env.DB.prepare('SELECT * FROM login_tokens WHERE token = ?')
    .bind(token)
    .first<{ token: string; email: string; expires_at: number }>()

  if (!dbToken) {
    return c.json({ error: 'Invalid or expired magic link' }, 400)
  }

  // Check expiration
  if (dbToken.expires_at < Date.now()) {
    // Clean up expired token
    await c.env.DB.prepare('DELETE FROM login_tokens WHERE token = ?').bind(token).run()
    return c.json({ error: 'Magic link has expired' }, 400)
  }

  const email = dbToken.email

  // Check if user exists
  let user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?')
    .bind(email)
    .first<{ id: string; email: string }>()

  if (!user) {
    // Create new user
    const userId = crypto.randomUUID()
    await c.env.DB.prepare('INSERT INTO users (id, email) VALUES (?, ?)').bind(userId, email).run()
    user = { id: userId, email }
  }

  // Delete verified token
  await c.env.DB.prepare('DELETE FROM login_tokens WHERE token = ?').bind(token).run()

  // Generate JWT token (expires in 7 days)
  const secret = getJwtSecret(c.env)
  const jwtPayload = {
    sub: user.id,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
  }
  const jwtToken = await sign(jwtPayload, secret, 'HS256')

  return c.json({
    token: jwtToken,
    user: {
      id: user.id,
      email: user.email,
    },
  })
})

// 4. Authentication: Get current user info
app.get('/api/auth/me', async (c) => {
  const user = await authenticate(c)
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  return c.json({ user })
})

// 5. Surveys: List user's own surveys
app.get('/api/surveys', async (c) => {
  const user = await authenticate(c)
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const { results } = await c.env.DB.prepare(
    `SELECT s.*, COUNT(r.id) as response_count 
     FROM surveys s 
     LEFT JOIN responses r ON s.id = r.survey_id 
     WHERE s.user_id = ? 
     GROUP BY s.id 
     ORDER BY s.created_at DESC`,
  )
    .bind(user.userId)
    .all<SurveyRow>()

  const surveys = results.map((row) => {
    const survey = parseSurveyRow(row)
    survey.response_count = Number(row.response_count || 0)
    return survey
  })
  return c.json({ surveys })
})

// 6. Surveys: Create a new survey
app.post('/api/surveys', async (c) => {
  const user = await authenticate(c)
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const body = await c.req.json<{
    title: string
    description?: string
    primary_color?: string
    logo_url?: string
    questions?: Question[]
  }>()

  const id = crypto.randomUUID().split('-')[0] // 8-char short readable unique slug
  const title = body.title || 'Untitled Survey'
  const description = body.description || ''
  const primaryColor = body.primary_color || '#4f46e5'
  const logoUrl = body.logo_url || ''
  const questionsStr = JSON.stringify(body.questions || [])

  await c.env.DB.prepare(
    'INSERT INTO surveys (id, user_id, title, description, primary_color, logo_url, questions) VALUES (?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(id, user.userId, title, description, primaryColor, logoUrl, questionsStr)
    .run()

  const newSurvey = {
    id,
    user_id: user.userId,
    title,
    description,
    primary_color: primaryColor,
    logo_url: logoUrl,
    questions: body.questions || [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  return c.json({ survey: newSurvey })
})

// 7. Surveys: Get a single survey details (owner only)
app.get('/api/surveys/:id', async (c) => {
  const user = await authenticate(c)
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const id = c.req.param('id')
  const surveyRow = await c.env.DB.prepare('SELECT * FROM surveys WHERE id = ?')
    .bind(id)
    .first<SurveyRow>()

  if (!surveyRow) {
    return c.json({ error: 'Survey not found' }, 404)
  }

  if (surveyRow.user_id !== user.userId) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  return c.json({ survey: parseSurveyRow(surveyRow) })
})

// 8. Surveys: Update a survey (owner only)
app.put('/api/surveys/:id', async (c) => {
  const user = await authenticate(c)
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const id = c.req.param('id')
  const surveyRow = await c.env.DB.prepare('SELECT * FROM surveys WHERE id = ?')
    .bind(id)
    .first<SurveyRow>()

  if (!surveyRow) {
    return c.json({ error: 'Survey not found' }, 404)
  }

  if (surveyRow.user_id !== user.userId) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const body = await c.req.json<{
    title: string
    description?: string
    primary_color?: string
    logo_url?: string
    questions: Question[]
  }>()

  const title = body.title || 'Untitled Survey'
  const description = body.description ?? null
  const primaryColor = body.primary_color || '#4f46e5'
  const logoUrl = body.logo_url ?? null
  const questionsStr = JSON.stringify(body.questions || [])
  const updatedAt = new Date().toISOString()

  await c.env.DB.prepare(
    'UPDATE surveys SET title = ?, description = ?, primary_color = ?, logo_url = ?, questions = ?, updated_at = ? WHERE id = ?',
  )
    .bind(title, description, primaryColor, logoUrl, questionsStr, updatedAt, id)
    .run()

  return c.json({
    survey: {
      id,
      user_id: user.userId,
      title,
      description,
      primary_color: primaryColor,
      logo_url: logoUrl,
      questions: body.questions,
      created_at: surveyRow.created_at,
      updated_at: updatedAt,
    },
  })
})

// 9. Surveys: Delete a survey (owner only)
app.delete('/api/surveys/:id', async (c) => {
  const user = await authenticate(c)
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const id = c.req.param('id')
  const surveyRow = await c.env.DB.prepare('SELECT * FROM surveys WHERE id = ?')
    .bind(id)
    .first<SurveyRow>()

  if (!surveyRow) {
    return c.json({ error: 'Survey not found' }, 404)
  }

  if (surveyRow.user_id !== user.userId) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  await c.env.DB.prepare('DELETE FROM responses WHERE survey_id = ?').bind(id).run()
  await c.env.DB.prepare('DELETE FROM surveys WHERE id = ?').bind(id).run()

  return c.json({ success: true })
})

// 10. Public: Get survey details (anonymous)
app.get('/api/public/surveys/:id', async (c) => {
  const id = c.req.param('id')
  const surveyRow = await c.env.DB.prepare('SELECT * FROM surveys WHERE id = ?')
    .bind(id)
    .first<SurveyRow>()

  if (!surveyRow) {
    return c.json({ error: 'Survey not found' }, 404)
  }

  // Parse questions, but strip out user_id and other owner-specific fields
  const survey = parseSurveyRow(surveyRow)
  return c.json({
    survey: {
      id: survey.id,
      title: survey.title,
      description: survey.description,
      primary_color: survey.primary_color,
      logo_url: survey.logo_url,
      questions: survey.questions,
    },
  })
})

// 11. Public: Submit response to a survey (anonymous)
app.post('/api/public/surveys/:id/responses', async (c) => {
  const id = c.req.param('id')
  const surveyExists = await c.env.DB.prepare('SELECT 1 FROM surveys WHERE id = ?').bind(id).first()

  if (!surveyExists) {
    return c.json({ error: 'Survey not found' }, 404)
  }

  const { answers } = await c.req.json<{ answers: Record<string, unknown> }>()
  if (!answers || typeof answers !== 'object') {
    return c.json({ error: 'Answers payload is required' }, 400)
  }

  const responseId = crypto.randomUUID()
  const answersStr = JSON.stringify(answers)

  await c.env.DB.prepare('INSERT INTO responses (id, survey_id, answers) VALUES (?, ?, ?)')
    .bind(responseId, id, answersStr)
    .run()

  return c.json({ success: true, responseId })
})

// 12. Responses: Retrieve responses for a survey (owner only)
app.get('/api/surveys/:id/responses', async (c) => {
  const user = await authenticate(c)
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const id = c.req.param('id')
  const surveyRow = await c.env.DB.prepare('SELECT user_id FROM surveys WHERE id = ?')
    .bind(id)
    .first<{ user_id: string }>()

  if (!surveyRow) {
    return c.json({ error: 'Survey not found' }, 404)
  }

  if (surveyRow.user_id !== user.userId) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const { results } = await c.env.DB.prepare(
    'SELECT * FROM responses WHERE survey_id = ? ORDER BY submitted_at DESC',
  )
    .bind(id)
    .all<ResponseRow>()

  const responses = results.map(parseResponseRow)
  return c.json({ responses })
})

export default app
