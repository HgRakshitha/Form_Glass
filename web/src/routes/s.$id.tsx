import { createFileRoute, Link } from '@tanstack/react-router'
import { AlertCircle, Check, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/s/$id')({
  component: PublicSurvey,
})

interface Question {
  id: string
  type: string
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

interface Survey {
  id: string
  title: string
  description: string | null
  primary_color: string
  logo_url: string | null
  questions: Question[]
}

function PublicSurvey() {
  const { id } = Route.useParams()

  const [survey, setSurvey] = useState<Survey | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Step navigation: -1 = welcome, 0..N-1 = questions, N = completed
  const [currentStep, setCurrentStep] = useState(-1)

  // Answers state: questionId -> value
  const [answers, setAnswers] = useState<Record<string, string | number | string[]>>({})
  const [submitLoading, setSubmitLoading] = useState(false)
  const [validationError, setValidationError] = useState('')

  useEffect(() => {
    const fetchSurvey = async () => {
      setLoading(true)
      try {
        // Use standard fetch directly because it does not require authorization headers
        const res = await fetch(`/api/public/surveys/${id}`)
        if (!res.ok) {
          throw new Error(res.status === 404 ? 'Survey not found' : 'Failed to load survey')
        }
        const data = await res.json()
        setSurvey(data.survey)
      } catch (err) {
        console.error(err)
        const errorMsg =
          err instanceof Error ? err.message : 'Failed to load survey. Please check the URL.'
        setError(errorMsg)
      } finally {
        setLoading(false)
      }
    }

    fetchSurvey()
  }, [id])

  const handleStart = () => {
    if (survey && survey.questions.length > 0) {
      setCurrentStep(0)
    } else {
      setCurrentStep(0) // Will immediately show empty or thank you if no questions
    }
  }

  const handleNext = () => {
    if (!survey) return

    // Check validation for current step
    const currentQuestion = survey.questions[currentStep]
    if (currentQuestion) {
      const answer = answers[currentQuestion.id]
      const isEmpty =
        answer === undefined ||
        answer === null ||
        answer === '' ||
        (Array.isArray(answer) && answer.length === 0)

      if (currentQuestion.required && isEmpty) {
        setValidationError('This question is required. Please fill in an answer before moving on.')
        return
      }
    }

    setValidationError('')
    if (currentStep < survey.questions.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      submitSurvey()
    }
  }

  const handlePrev = () => {
    setValidationError('')
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    } else if (currentStep === 0) {
      setCurrentStep(-1)
    }
  }

  const handleAnswerChange = (qId: string, val: string | number | string[]) => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: val,
    }))
    setValidationError('')
  }

  // Multi-choice toggle answer helper
  const handleToggleOption = (qId: string, option: string) => {
    const currentAnswer = (answers[qId] as string[]) || []
    let updatedAnswer: string[]

    if (currentAnswer.includes(option)) {
      updatedAnswer = currentAnswer.filter((o) => o !== option)
    } else {
      updatedAnswer = [...currentAnswer, option]
    }

    handleAnswerChange(qId, updatedAnswer)
  }

  // Automatic progression for rating selection
  const handleRatingClick = (qId: string, rating: number) => {
    handleAnswerChange(qId, rating)

    // Short 250ms visual feedback delay before moving to next slide
    setTimeout(() => {
      if (survey && currentStep < survey.questions.length - 1) {
        setCurrentStep((prev) => prev + 1)
      } else {
        // Submit if it is the last question
        submitSurvey()
      }
    }, 250)
  }

  const submitSurvey = async () => {
    setSubmitLoading(true)
    try {
      const res = await fetch(`/api/public/surveys/${id}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answers }),
      })

      if (!res.ok) {
        throw new Error('Failed to submit response')
      }

      setCurrentStep(survey ? survey.questions.length : 0)
    } catch (err) {
      console.error(err)
      setValidationError('Failed to submit survey responses. Please try again.')
    } finally {
      setSubmitLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="loading-wrapper" style={{ height: '90vh' }}>
        <div className="spinner" />
        <p>Loading survey...</p>
      </div>
    )
  }

  if (error || !survey) {
    return (
      <div className="loading-wrapper" style={{ height: '90vh' }}>
        <AlertCircle size={40} className="text-danger" style={{ marginBottom: 12 }} />
        <h2>Survey Unavailable</h2>
        <p
          style={{
            color: 'var(--text-secondary)',
            maxWidth: 400,
            textAlign: 'center',
            marginBottom: 20,
          }}
        >
          {error || 'This survey could not be found or has been disabled by the owner.'}
        </p>
        <Link to="/" className="btn btn-secondary">
          Go to Homepage
        </Link>
      </div>
    )
  }

  const totalQuestions = survey.questions.length
  // Calculate progress percentage
  const progressPercent =
    totalQuestions > 0
      ? currentStep === -1
        ? 0
        : currentStep === totalQuestions
          ? 100
          : Math.round(((currentStep + 1) / totalQuestions) * 100)
      : 0

  const activeQuestion = survey.questions[currentStep]

  return (
    <div
      className="public-survey-wrapper"
      style={{ '--accent': survey.primary_color } as React.CSSProperties}
    >
      {/* Top progress bar indicator */}
      <div className="survey-progress-bar" style={{ width: `${progressPercent}%` }} />

      <div className="step-container">
        {/* WELCOME SLIDE */}
        {currentStep === -1 && (
          <div
            className="glass-card step-card animate-fade-scale"
            style={{ textAlign: 'center', padding: '50px 40px' }}
          >
            {survey.logo_url && (
              <img
                src={survey.logo_url}
                alt="Brand Logo"
                style={{
                  maxHeight: 60,
                  maxWidth: 180,
                  objectFit: 'contain',
                  margin: '0 auto 24px auto',
                  display: 'block',
                }}
              />
            )}

            <h1 style={{ fontSize: '2.2rem', marginBottom: 16, lineHeight: 1.2 }}>
              {survey.title}
            </h1>

            {survey.description && (
              <p
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: '1.05rem',
                  lineHeight: 1.6,
                  marginBottom: 40,
                  whiteSpace: 'pre-line',
                }}
              >
                {survey.description}
              </p>
            )}

            <div>
              {totalQuestions > 0 ? (
                <button
                  type="button"
                  onClick={handleStart}
                  className="btn btn-primary"
                  style={{ padding: '14px 32px', fontSize: '1.05rem', height: 50 }}
                >
                  <span>Start Survey</span>
                  <ChevronRight size={18} />
                </button>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  This survey does not have any questions.
                </p>
              )}
            </div>

            <div style={{ marginTop: 24, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Takes about {Math.max(1, Math.round(totalQuestions * 0.5))} min • Anonymous Submission
            </div>
          </div>
        )}

        {/* QUESTIONS STEP SLIDES */}
        {currentStep >= 0 && currentStep < totalQuestions && activeQuestion && (
          <div className="glass-card step-card animate-slide-in" key={activeQuestion.id}>
            {/* Step navigation and indicators */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                QUESTION {currentStep + 1} OF {totalQuestions}
              </span>
              {activeQuestion.required && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--error)',
                    background: 'rgba(239, 68, 68, 0.1)',
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontWeight: 500,
                  }}
                >
                  Required
                </span>
              )}
            </div>

            {/* Question labels */}
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: 8, lineHeight: 1.3 }}>
                {activeQuestion.title}
              </h2>
              {activeQuestion.description && (
                <p
                  style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.9rem',
                    lineHeight: 1.4,
                    marginBottom: 16,
                  }}
                >
                  {activeQuestion.description}
                </p>
              )}
            </div>

            {/* ERROR BANNER */}
            {validationError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: 12,
                  borderRadius: 8,
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#fca5a5',
                  fontSize: '0.85rem',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{validationError}</span>
              </div>
            )}

            {/* INPUT CONTROLS RENDERING */}
            <div
              style={{
                minHeight: 140,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              {/* Short Text Input */}
              {activeQuestion.type === 'short_text' && (
                <input
                  type="text"
                  value={answers[activeQuestion.id] || ''}
                  onChange={(e) => handleAnswerChange(activeQuestion.id, e.target.value)}
                  placeholder={activeQuestion.properties?.placeholder || 'Type your answer here...'}
                  className="input-text"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNext()
                  }}
                />
              )}

              {/* Long Text Input */}
              {activeQuestion.type === 'long_text' && (
                <textarea
                  value={answers[activeQuestion.id] || ''}
                  onChange={(e) => handleAnswerChange(activeQuestion.id, e.target.value)}
                  placeholder={
                    activeQuestion.properties?.placeholder || 'Type your detailed answer here...'
                  }
                  className="textarea-input"
                  style={{ minHeight: 120 }}
                />
              )}

              {/* Multiple Choice Options List */}
              {activeQuestion.type === 'multiple_choice' && (
                <div className="choices-container">
                  {(activeQuestion.properties?.options || []).map((opt, i) => {
                    const isSelected = ((answers[activeQuestion.id] as string[]) || []).includes(
                      opt,
                    )
                    return (
                      <button
                        type="button"
                        key={opt}
                        onClick={() => handleToggleOption(activeQuestion.id, opt)}
                        className={`choice-item ${isSelected ? 'selected' : ''}`}
                      >
                        <span className="choice-letter">{String.fromCharCode(65 + i)}</span>
                        <span style={{ fontSize: '0.95rem', fontWeight: isSelected ? 500 : 400 }}>
                          {opt}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Single Choice Dropdown */}
              {activeQuestion.type === 'single_select' && (
                <select
                  value={answers[activeQuestion.id] || ''}
                  onChange={(e) => handleAnswerChange(activeQuestion.id, e.target.value)}
                  className="select-input"
                >
                  <option value="">Choose an option...</option>
                  {(activeQuestion.properties?.options || []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              )}

              {/* 1-5 Rating Selectors */}
              {activeQuestion.type === 'rating_1_5' && (
                <div>
                  <div className="rating-container" style={{ justifyContent: 'center' }}>
                    {[1, 2, 3, 4, 5].map((num) => {
                      const isSelected = answers[activeQuestion.id] === num
                      return (
                        <button
                          type="button"
                          key={num}
                          onClick={() => handleRatingClick(activeQuestion.id, num)}
                          className={`rating-pill ${isSelected ? 'selected' : ''}`}
                        >
                          {num}
                        </button>
                      )
                    })}
                  </div>
                  {(activeQuestion.properties?.min_label ||
                    activeQuestion.properties?.max_label) && (
                    <div
                      className="rating-labels"
                      style={{ width: '100%', maxWidth: 288, margin: '8px auto 0 auto' }}
                    >
                      <span>{activeQuestion.properties?.min_label || '1'}</span>
                      <span>{activeQuestion.properties?.max_label || '5'}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Date Input Selector */}
              {activeQuestion.type === 'date' && (
                <input
                  type="date"
                  value={answers[activeQuestion.id] || ''}
                  onChange={(e) => handleAnswerChange(activeQuestion.id, e.target.value)}
                  className="input-text"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNext()
                  }}
                />
              )}
            </div>

            {/* Step actions: Back and Next buttons */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: '1px solid var(--border-color)',
                paddingTop: 24,
                marginTop: 12,
              }}
            >
              <button
                type="button"
                onClick={handlePrev}
                className="btn btn-secondary"
                style={{ padding: '10px 18px' }}
              >
                <ChevronLeft size={16} />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={submitLoading}
                className="btn btn-primary"
                style={{ padding: '10px 24px' }}
              >
                {submitLoading ? (
                  <span className="spinner" style={{ width: 16, height: 16, borderWidth: '2px' }} />
                ) : (
                  <>
                    <span>{currentStep === totalQuestions - 1 ? 'Submit Responses' : 'Next'}</span>
                    {currentStep === totalQuestions - 1 ? (
                      <Check size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* THANK YOU / COMPLETION SCREEN */}
        {currentStep === totalQuestions && (
          <div
            className="glass-card step-card animate-fade-scale"
            style={{ textAlign: 'center', padding: '60px 40px' }}
          >
            <div
              style={{
                display: 'inline-flex',
                padding: 16,
                borderRadius: 50,
                background: 'rgba(16, 185, 129, 0.1)',
                color: 'var(--success)',
                marginBottom: 24,
                border: '1px solid rgba(16, 185, 129, 0.2)',
              }}
            >
              <Check size={40} style={{ strokeWidth: 3 }} />
            </div>

            <h1 style={{ fontSize: '2rem', marginBottom: 12 }}>Response Submitted!</h1>

            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: '1rem',
                lineHeight: 1.5,
                marginBottom: 40,
              }}
            >
              Thank you for taking the time to fill in this survey. Your anonymous answers have been
              submitted successfully to the owner.
            </p>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 32 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 16 }}>
                Create your own branded interactive surveys on FormGlass
              </p>
              <Link
                to="/"
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', gap: 6 }}
              >
                <Sparkles size={14} style={{ color: 'var(--accent)' }} />
                <span>Build surveys with FormGlass</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
