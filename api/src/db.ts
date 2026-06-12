export interface User {
  id: string
  email: string
  created_at: string
}

export interface LoginToken {
  token: string
  email: string
  expires_at: string
  created_at: string
}

export type QuestionType =
  | 'short_text'
  | 'multiple_choice'
  | 'rating_1_5'
  | 'long_text'
  | 'single_select'
  | 'date'

export interface Question {
  id: string
  type: QuestionType
  title: string
  description?: string
  required: boolean
  properties?: {
    options?: string[]
    placeholder?: string
    min_label?: string
    max_label?: string
  }
}

export interface Survey {
  id: string
  user_id: string
  title: string
  description: string | null
  primary_color: string
  logo_url: string | null
  questions: Question[]
  created_at: string
  updated_at: string
  response_count?: number
}

export interface SurveyRow {
  id: string
  user_id: string
  title: string
  description: string | null
  primary_color: string
  logo_url: string | null
  questions: string // JSON text
  created_at: string
  updated_at: string
  response_count?: number
}

export interface ResponseRow {
  id: string
  survey_id: string
  answers: string // JSON text
  submitted_at: string
}

export interface SurveyResponse {
  id: string
  survey_id: string
  answers: Record<string, unknown>
  submitted_at: string
}

// Helpers to parse rows
export function parseSurveyRow(row: SurveyRow): Survey {
  return {
    ...row,
    questions: JSON.parse(row.questions || '[]') as Question[],
  }
}

export function parseResponseRow(row: ResponseRow): SurveyResponse {
  return {
    ...row,
    answers: JSON.parse(row.answers || '{}') as Record<string, unknown>,
  }
}
