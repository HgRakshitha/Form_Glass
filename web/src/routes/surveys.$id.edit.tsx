import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BarChart3,
  Calendar,
  CheckSquare,
  Clipboard,
  Download,
  Eye,
  FileText,
  HelpCircle,
  List,
  Palette,
  Plus,
  Settings,
  Star,
  Trash2,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../AuthContext'

export const Route = createFileRoute('/surveys/$id/edit')({
  component: SurveyEditor,
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
  created_at: string
  updated_at: string
}

interface ResponseItem {
  id: string
  survey_id: string
  answers: Record<string, unknown>
  submitted_at: string
}

const COLOR_PRESETS = [
  '#4f46e5', // Indigo
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f43f5e', // Rose
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#3b82f6', // Blue
  '#14b8a6', // Teal
  '#f97316', // Orange
  '#ec4899', // Pink
]

function SurveyEditor() {
  const { id } = Route.useParams()
  const { apiFetch } = useAuth()
  const navigate = useNavigate()

  const [survey, setSurvey] = useState<Survey | null>(null)
  const [responses, setResponses] = useState<ResponseItem[]>([])

  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [activeTab, setActiveTab] = useState<'questions' | 'branding' | 'responses'>('questions')
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false)
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null)

  const saveTimeoutRef = useRef<number | null>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount or ID changes
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [surveyData, responsesData] = await Promise.all([
          apiFetch(`/api/surveys/${id}`),
          apiFetch(`/api/surveys/${id}/responses`).catch(() => ({ responses: [] })),
        ])

        setSurvey(surveyData.survey)
        setResponses(responsesData.responses || [])

        if (surveyData.survey.questions.length > 0) {
          setSelectedQuestionId(surveyData.survey.questions[0]?.id ?? null)
        }
      } catch (err) {
        console.error('Failed to load editor data:', err)
        navigate({ to: '/' })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  // Auto-save changes helper
  const triggerAutoSave = (updatedSurvey: Survey) => {
    setSaveStatus('saving')
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = window.setTimeout(async () => {
      try {
        await apiFetch(`/api/surveys/${id}`, {
          method: 'PUT',
          body: JSON.stringify(updatedSurvey),
        })
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } catch (err) {
        console.error('Failed to save survey:', err)
        setSaveStatus('error')
      }
    }, 1000)
  }

  const handleUpdateSurvey = (updates: Partial<Survey>) => {
    if (!survey) return
    const updated = { ...survey, ...updates }
    setSurvey(updated)
    triggerAutoSave(updated)
  }

  const copyPublicLink = () => {
    const link = `${window.location.origin}/s/${id}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Add a new question
  const handleAddQuestion = (type: string) => {
    if (!survey) return

    const newId = crypto.randomUUID().split('-')[0] ?? ''
    let title = 'New Question'
    let properties: Record<string, string | string[]> = {}

    if (type === 'short_text') {
      title = 'Short Answer Question'
      properties = { placeholder: 'Type your answer here...' }
    } else if (type === 'multiple_choice') {
      title = 'Multiple Choice Question'
      properties = { options: ['Option 1', 'Option 2', 'Option 3'] }
    } else if (type === 'rating_1_5') {
      title = 'Rating Question'
      properties = { min_label: 'Poor', max_label: 'Excellent' }
    } else if (type === 'long_text') {
      title = 'Long Answer Question'
      properties = { placeholder: 'Type your detailed answer here...' }
    } else if (type === 'single_select') {
      title = 'Single Choice Question'
      properties = { options: ['Yes', 'No'] }
    } else if (type === 'date') {
      title = 'Select Date'
    }

    const newQuestion: Question = {
      id: newId,
      type,
      title,
      required: false,
      properties,
    }

    const updatedQuestions = [...survey.questions, newQuestion]
    handleUpdateSurvey({ questions: updatedQuestions })
    setSelectedQuestionId(newId)
  }

  // Request delete a question
  const handleDeleteQuestion = (q: Question, e: React.MouseEvent) => {
    e.stopPropagation()
    setQuestionToDelete(q)
  }

  // Confirm delete a question
  const confirmDeleteQuestion = () => {
    if (!survey || !questionToDelete) return

    const updatedQuestions = survey.questions.filter((q) => q.id !== questionToDelete.id)
    handleUpdateSurvey({ questions: updatedQuestions })

    if (selectedQuestionId === questionToDelete.id) {
      setSelectedQuestionId(updatedQuestions[0]?.id ?? null)
    }
    setQuestionToDelete(null)
  }

  // Move question in order
  const handleMoveQuestion = (index: number, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation()
    if (!survey) return

    const newQuestions = [...survey.questions]
    const targetIndex = direction === 'up' ? index - 1 : index + 1

    if (targetIndex < 0 || targetIndex >= newQuestions.length) return

    const temp = newQuestions[index]
    const targetQ = newQuestions[targetIndex]
    if (!temp || !targetQ) return

    newQuestions[index] = targetQ
    newQuestions[targetIndex] = temp

    handleUpdateSurvey({ questions: newQuestions })
  }

  // Edit fields of selected question
  const handleUpdateQuestion = (updates: Partial<Question>) => {
    if (!survey || !selectedQuestionId) return

    const updatedQuestions = survey.questions.map((q) => {
      if (q.id === selectedQuestionId) {
        return { ...q, ...updates } as Question
      }
      return q
    })

    handleUpdateSurvey({ questions: updatedQuestions })
  }

  // Edit question sub-properties
  const handleUpdateQuestionProperties = (
    propertiesUpdates: Record<string, string | string[] | undefined>,
  ) => {
    if (!survey || !selectedQuestionId) return

    const updatedQuestions = survey.questions.map((q) => {
      if (q.id === selectedQuestionId) {
        return {
          ...q,
          properties: {
            ...q.properties,
            ...propertiesUpdates,
          },
        }
      }
      return q
    })

    handleUpdateSurvey({ questions: updatedQuestions })
  }

  // CSV Exporter
  const exportResponsesCSV = () => {
    if (!survey || responses.length === 0) return

    // Headers: Response ID, Timestamp, and each Question Title
    const headers = [
      'Response ID',
      'Timestamp',
      ...survey.questions.map((q) => `"${q.title.replace(/"/g, '""')}"`),
    ]

    const rows = responses.map((resp) => {
      const rowData = [
        resp.id,
        new Date(resp.submitted_at).toLocaleString(),
        ...survey.questions.map((q) => {
          const ans = resp.answers[q.id]
          if (ans === undefined || ans === null) return '""'
          if (Array.isArray(ans)) return `"${ans.join(', ').replace(/"/g, '""')}"`
          return `"${String(ans).replace(/"/g, '""')}"`
        }),
      ]
      return rowData.join(',')
    })

    const csvContent = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute(
      'download',
      `${survey.title.toLowerCase().replace(/\s+/g, '_')}_responses.csv`,
    )
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Get question stats helper
  const getQuestionStats = (q: Question) => {
    const qResponses = responses
      .map((r) => r.answers[q.id])
      .filter((a) => a !== undefined && a !== null && a !== '')

    if (q.type === 'rating_1_5') {
      const numbers = qResponses.map(Number).filter((n) => !Number.isNaN(n))
      const avg =
        numbers.length > 0
          ? (numbers.reduce((s, v) => s + v, 0) / numbers.length).toFixed(1)
          : '0.0'
      return { total: qResponses.length, avg }
    }

    if (q.type === 'multiple_choice' || q.type === 'single_select') {
      const counts: Record<string, number> = {}
      for (const ans of qResponses) {
        if (Array.isArray(ans)) {
          for (const opt of ans) {
            const optStr = String(opt)
            counts[optStr] = (counts[optStr] || 0) + 1
          }
        } else if (ans !== undefined && ans !== null) {
          const ansStr = String(ans)
          counts[ansStr] = (counts[ansStr] || 0) + 1
        }
      }
      return { total: qResponses.length, counts }
    }

    return { total: qResponses.length }
  }

  if (loading) {
    return (
      <div className="loading-wrapper" style={{ height: '80vh' }}>
        <div className="spinner" />
        <p>Loading survey editor...</p>
      </div>
    )
  }

  if (!survey) {
    return (
      <div className="loading-wrapper" style={{ height: '80vh' }}>
        <AlertCircle size={40} className="text-danger" />
        <p>Survey not found.</p>
        <Link to="/" className="btn btn-primary">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  const selectedQuestion = survey.questions.find((q) => q.id === selectedQuestionId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 73px)' }}>
      {/* Editor Top Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          borderBottom: '1px solid var(--border-color)',
          background: 'rgba(9,9,11,0.5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/" className="action-icon-btn" title="Back to Dashboard">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{survey.title}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status:</span>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color:
                    saveStatus === 'saving'
                      ? 'var(--warning)'
                      : saveStatus === 'saved'
                        ? 'var(--success)'
                        : 'var(--text-muted)',
                }}
              >
                {saveStatus === 'saving' && 'Saving...'}
                {saveStatus === 'saved' && 'Saved'}
                {saveStatus === 'idle' && 'Saved'}
                {saveStatus === 'error' && 'Error saving!'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={copyPublicLink}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Clipboard size={14} />
            <span>{copied ? 'Copied Link!' : 'Copy Public Link'}</span>
          </button>

          <a
            href={`/s/${survey.id}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Eye size={14} />
            <span>Preview Form</span>
          </a>
        </div>
      </div>

      {/* Main Builder Layout Grid */}
      <div className="builder-layout">
        {/* PANEL 1: Left Questions Sidebar */}
        <div className="builder-sidebar">
          <div className="panel-header">
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Questions
            </h3>
            <span
              style={{
                fontSize: '0.75rem',
                background: 'rgba(255,255,255,0.06)',
                padding: '2px 6px',
                borderRadius: 4,
              }}
            >
              {survey.questions.length}
            </span>
          </div>

          <div className="questions-list">
            {survey.questions.map((q, idx) => (
              // biome-ignore lint/a11y/noStaticElementInteractions: outer container is interactive list item, but cannot be button due to nested action buttons
              // biome-ignore lint/a11y/useKeyWithClickEvents: handled by click event
              <div
                key={q.id}
                onClick={() => setSelectedQuestionId(q.id)}
                className={`question-item ${selectedQuestionId === q.id ? 'active' : ''}`}
                style={{ '--accent': survey.primary_color } as React.CSSProperties}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}
                >
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      fontWeight: 600,
                      width: 14,
                    }}
                  >
                    {idx + 1}
                  </span>
                  <div
                    style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    <div className="question-item-title">{q.title || 'Untitled question'}</div>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                      }}
                    >
                      {q.type.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="question-actions">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={(e) => handleMoveQuestion(idx, 'up', e)}
                    className="action-icon-btn"
                    title="Move Up"
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button
                    type="button"
                    disabled={idx === survey.questions.length - 1}
                    onClick={(e) => handleMoveQuestion(idx, 'down', e)}
                    className="action-icon-btn"
                    title="Move Down"
                  >
                    <ArrowDown size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteQuestion(q, e)}
                    className="action-icon-btn"
                    style={{ color: 'rgba(239, 68, 68, 0.7)' }}
                    title="Delete Question"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Questions Control Panel */}
          <div
            className="add-question-container"
            style={{
              padding: 16,
              borderTop: '1px solid var(--border-color)',
            }}
          >
            {isAddQuestionOpen && (
              <>
                {/* Click-away overlay */}
                {/* biome-ignore lint/a11y/noStaticElementInteractions: click-away helper */}
                {/* biome-ignore lint/a11y/useKeyWithClickEvents: handled by click event */}
                <div
                  onClick={() => setIsAddQuestionOpen(false)}
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 90,
                  }}
                />
                <div className="add-question-popover" style={{ zIndex: 100 }}>
                  <button
                    type="button"
                    onClick={() => {
                      handleAddQuestion('short_text')
                      setIsAddQuestionOpen(false)
                    }}
                    className="popover-menu-item"
                  >
                    <FileText size={14} /> <span>Short Text</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleAddQuestion('multiple_choice')
                      setIsAddQuestionOpen(false)
                    }}
                    className="popover-menu-item"
                  >
                    <CheckSquare size={14} /> <span>Multiple Choice</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleAddQuestion('rating_1_5')
                      setIsAddQuestionOpen(false)
                    }}
                    className="popover-menu-item"
                  >
                    <Star size={14} /> <span>Rating (1-5)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleAddQuestion('long_text')
                      setIsAddQuestionOpen(false)
                    }}
                    className="popover-menu-item"
                  >
                    <List size={14} /> <span>Long Text</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleAddQuestion('single_select')
                      setIsAddQuestionOpen(false)
                    }}
                    className="popover-menu-item"
                  >
                    <HelpCircle size={14} /> <span>Dropdown (Single Select)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleAddQuestion('date')
                      setIsAddQuestionOpen(false)
                    }}
                    className="popover-menu-item"
                  >
                    <Calendar size={14} /> <span>Date Selection</span>
                  </button>
                </div>
              </>
            )}
            <button
              type="button"
              onClick={() => setIsAddQuestionOpen(!isAddQuestionOpen)}
              className="btn btn-primary"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Plus size={16} />
              <span>Add Question</span>
            </button>
          </div>
        </div>

        {/* PANEL 2: Center Live Preview Canvas */}
        <div className="builder-canvas">
          <div className="canvas-inner">
            <div className="preview-badge">Live Branded Preview</div>

            {activeTab === 'responses' ? (
              // Short summary in canvas if on responses tab
              <div
                className="glass-card preview-card"
                style={{ '--accent': survey.primary_color } as React.CSSProperties}
              >
                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                  <BarChart3 size={32} style={{ color: 'var(--accent)' }} />
                </div>
                <h3 style={{ textAlign: 'center', fontSize: '1.25rem', marginBottom: 6 }}>
                  Analytics Active
                </h3>
                <p
                  style={{
                    textAlign: 'center',
                    color: 'var(--text-secondary)',
                    fontSize: '0.875rem',
                  }}
                >
                  Preview is hidden on the analytics/responses view. Navigate back to Questions or
                  Branding tabs to see interactive canvas.
                </p>
              </div>
            ) : (
              // Regular Survey Preview
              <div
                className="glass-card preview-card"
                style={{ '--accent': survey.primary_color } as React.CSSProperties}
              >
                {survey.logo_url && (
                  <img src={survey.logo_url} alt="Brand Logo" className="survey-logo-preview" />
                )}

                <h1 style={{ fontSize: '1.8rem', marginBottom: 8 }}>{survey.title}</h1>
                {survey.description && (
                  <p
                    style={{
                      color: 'var(--text-secondary)',
                      fontSize: '0.95rem',
                      marginBottom: 32,
                      lineHeight: 1.5,
                    }}
                  >
                    {survey.description}
                  </p>
                )}

                {survey.questions.length === 0 ? (
                  <div
                    style={{
                      padding: '40px 20px',
                      border: '1px dashed var(--border-color)',
                      borderRadius: 8,
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                    }}
                  >
                    Your survey is empty. Add questions from the left panel.
                  </div>
                ) : selectedQuestion ? (
                  <div className="preview-question-box animate-slide-in" key={selectedQuestion.id}>
                    <div className="preview-question-title">
                      <span>{selectedQuestion.title || 'Untitled question'}</span>
                      {selectedQuestion.required && <span className="required-star">*</span>}
                    </div>
                    {selectedQuestion.description && (
                      <p className="preview-question-desc">{selectedQuestion.description}</p>
                    )}

                    {/* Short Text Preview */}
                    {selectedQuestion.type === 'short_text' && (
                      <input
                        type="text"
                        placeholder={
                          selectedQuestion.properties?.placeholder || 'Type your answer here...'
                        }
                        className="input-text"
                        disabled
                      />
                    )}

                    {/* Long Text Preview */}
                    {selectedQuestion.type === 'long_text' && (
                      <textarea
                        placeholder={
                          selectedQuestion.properties?.placeholder ||
                          'Type your detailed answer here...'
                        }
                        className="textarea-input"
                        disabled
                      />
                    )}

                    {/* Multiple Choice Preview */}
                    {selectedQuestion.type === 'multiple_choice' && (
                      <div className="choices-container">
                        {(selectedQuestion.properties?.options || []).map((opt, i) => (
                          // biome-ignore lint/suspicious/noArrayIndexKey: preview choice keys require index to be unique when duplicate/blank options are present
                          <div key={opt + i} className="choice-item">
                            <span className="choice-letter">{String.fromCharCode(65 + i)}</span>
                            <span style={{ fontSize: '0.95rem' }}>{opt}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Single Select Preview */}
                    {selectedQuestion.type === 'single_select' && (
                      <select className="select-input" disabled>
                        <option value="">Select option...</option>
                        {(selectedQuestion.properties?.options || []).map((opt, i) => (
                          // biome-ignore lint/suspicious/noArrayIndexKey: select option keys require index to be unique when duplicate/blank options are present
                          <option key={opt + i} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    )}

                    {/* Rating Preview */}
                    {selectedQuestion.type === 'rating_1_5' && (
                      <div>
                        <div className="rating-container">
                          {[1, 2, 3, 4, 5].map((num) => (
                            <div key={num} className="rating-pill">
                              {num}
                            </div>
                          ))}
                        </div>
                        {(selectedQuestion.properties?.min_label ||
                          selectedQuestion.properties?.max_label) && (
                          <div className="rating-labels">
                            <span>{selectedQuestion.properties?.min_label || '1'}</span>
                            <span>{selectedQuestion.properties?.max_label || '5'}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Date Preview */}
                    {selectedQuestion.type === 'date' && (
                      <input type="date" className="input-text" disabled />
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        style={{ backgroundColor: 'var(--accent)' }}
                        disabled
                      >
                        Next Question
                      </button>
                    </div>
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
                    Select a question to preview and configure.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* PANEL 3: Right Editor Settings Tab Panel */}
        <div className="builder-editor">
          <div className="editor-tabs">
            <button
              type="button"
              onClick={() => setActiveTab('questions')}
              className={`editor-tab ${activeTab === 'questions' ? 'active' : ''}`}
              style={
                activeTab === 'questions' ? { borderBottomColor: survey.primary_color } : undefined
              }
            >
              <Settings
                size={14}
                style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-bottom' }}
              />
              Fields
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('branding')}
              className={`editor-tab ${activeTab === 'branding' ? 'active' : ''}`}
              style={
                activeTab === 'branding' ? { borderBottomColor: survey.primary_color } : undefined
              }
            >
              <Palette
                size={14}
                style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-bottom' }}
              />
              Theme
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('responses')}
              className={`editor-tab ${activeTab === 'responses' ? 'active' : ''}`}
              style={
                activeTab === 'responses' ? { borderBottomColor: survey.primary_color } : undefined
              }
            >
              <BarChart3
                size={14}
                style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-bottom' }}
              />
              Answers
            </button>
          </div>

          <div className="editor-content">
            {/* TAB: QUESTIONS CONFIG */}
            {activeTab === 'questions' &&
              (selectedQuestion ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                      Configure Field
                    </h3>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                      }}
                    >
                      {selectedQuestion.type.replace('_', ' ')}
                    </span>
                  </div>

                  {/* CARD 1: Label & Description */}
                  <div className="editor-section-card">
                    <div className="editor-section-title">Label & Description</div>

                    <div className="form-group">
                      <label htmlFor="q-label-input" className="form-label">
                        Question Label
                      </label>
                      <input
                        id="q-label-input"
                        type="text"
                        value={selectedQuestion.title}
                        onChange={(e) => handleUpdateQuestion({ title: e.target.value })}
                        className="input-text"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="q-desc-input" className="form-label">
                        Help Text / Description
                      </label>
                      <input
                        id="q-desc-input"
                        type="text"
                        value={selectedQuestion.description || ''}
                        onChange={(e) => handleUpdateQuestion({ description: e.target.value })}
                        placeholder="Optional clarifying instructions"
                        className="input-text"
                      />
                    </div>
                  </div>

                  {/* CARD 2: Settings & Constraints */}
                  <div className="editor-section-card">
                    <div className="editor-section-title">Settings & Constraints</div>

                    {/* Short Text Constraints */}
                    {selectedQuestion.type === 'short_text' && (
                      <div className="form-group">
                        <label htmlFor="q-placeholder-short" className="form-label">
                          Placeholder Text
                        </label>
                        <input
                          id="q-placeholder-short"
                          type="text"
                          value={selectedQuestion.properties?.placeholder || ''}
                          onChange={(e) =>
                            handleUpdateQuestionProperties({ placeholder: e.target.value })
                          }
                          className="input-text"
                        />
                      </div>
                    )}

                    {/* Long Text Constraints */}
                    {selectedQuestion.type === 'long_text' && (
                      <div className="form-group">
                        <label htmlFor="q-placeholder-long" className="form-label">
                          Placeholder Text
                        </label>
                        <input
                          id="q-placeholder-long"
                          type="text"
                          value={selectedQuestion.properties?.placeholder || ''}
                          onChange={(e) =>
                            handleUpdateQuestionProperties({ placeholder: e.target.value })
                          }
                          className="input-text"
                        />
                      </div>
                    )}

                    {/* Multiple Choice / Dropdown Constraints */}
                    {(selectedQuestion.type === 'multiple_choice' ||
                      selectedQuestion.type === 'single_select') && (
                      <div className="form-group">
                        <label
                          className="form-label"
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <span>Options</span>
                          <button
                            type="button"
                            onClick={() => {
                              const currentOptions = selectedQuestion.properties?.options || []
                              handleUpdateQuestionProperties({
                                options: [...currentOptions, `Option ${currentOptions.length + 1}`],
                              })
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                          >
                            <Plus size={10} /> Add
                          </button>
                        </label>

                        <div className="control-options-list">
                          {(selectedQuestion.properties?.options || []).map((opt, i) => (
                            // biome-ignore lint/suspicious/noArrayIndexKey: builder option list inputs require index keys to maintain focus while editing
                            <div key={opt + i} className="option-input-group">
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => {
                                  const currentOptions = [
                                    ...(selectedQuestion.properties?.options || []),
                                  ]
                                  currentOptions[i] = e.target.value
                                  handleUpdateQuestionProperties({ options: currentOptions })
                                }}
                                className="input-text"
                                style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const currentOptions = (
                                    selectedQuestion.properties?.options || []
                                  ).filter((_, idx) => idx !== i)
                                  handleUpdateQuestionProperties({ options: currentOptions })
                                }}
                                className="action-icon-btn"
                                style={{ color: 'var(--error)' }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Rating Constraints */}
                    {selectedQuestion.type === 'rating_1_5' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group">
                          <label htmlFor="rating-min-input" className="form-label">
                            Min Label
                          </label>
                          <input
                            id="rating-min-input"
                            type="text"
                            value={selectedQuestion.properties?.min_label || ''}
                            onChange={(e) =>
                              handleUpdateQuestionProperties({ min_label: e.target.value })
                            }
                            placeholder="e.g. Poor"
                            className="input-text"
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="rating-max-input" className="form-label">
                            Max Label
                          </label>
                          <input
                            id="rating-max-input"
                            type="text"
                            value={selectedQuestion.properties?.max_label || ''}
                            onChange={(e) =>
                              handleUpdateQuestionProperties({ max_label: e.target.value })
                            }
                            placeholder="e.g. Perfect"
                            className="input-text"
                          />
                        </div>
                      </div>
                    )}

                    {/* Required field checkbox (always at the bottom of the Settings & Constraints card) */}
                    <div
                      className="form-group"
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}
                    >
                      <input
                        id="required-checkbox"
                        type="checkbox"
                        checked={selectedQuestion.required}
                        onChange={(e) => handleUpdateQuestion({ required: e.target.checked })}
                        className="checkbox-input"
                      />
                      <label
                        htmlFor="required-checkbox"
                        className="checkbox-label"
                        style={{ userSelect: 'none', cursor: 'pointer' }}
                      >
                        Required field
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <p
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: '0.9rem',
                    textAlign: 'center',
                    marginTop: 40,
                  }}
                >
                  Add or select a question to edit its parameters.
                </p>
              ))}

            {/* TAB: BRANDING CONFIG */}
            {activeTab === 'branding' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Visual Identity</h3>

                <div className="form-group">
                  <span className="form-label" style={{ fontWeight: 600 }}>
                    General Survey Info
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Survey Title
                      </span>
                      <input
                        type="text"
                        value={survey.title}
                        onChange={(e) => handleUpdateSurvey({ title: e.target.value })}
                        className="input-text"
                        style={{ marginTop: 4 }}
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Description
                      </span>
                      <textarea
                        value={survey.description || ''}
                        onChange={(e) => handleUpdateSurvey({ description: e.target.value })}
                        className="textarea-input"
                        style={{ marginTop: 4, minHeight: 80 }}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <span className="form-label" style={{ fontWeight: 600 }}>
                    Primary Color Theme
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="presets-grid">
                      {COLOR_PRESETS.map((color) => (
                        <button
                          type="button"
                          key={color}
                          onClick={() => handleUpdateSurvey({ primary_color: color })}
                          className={`preset-color-btn ${survey.primary_color === color ? 'active' : ''}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                      <input
                        type="color"
                        value={survey.primary_color}
                        onChange={(e) => handleUpdateSurvey({ primary_color: e.target.value })}
                        style={{
                          width: 40,
                          height: 32,
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                        }}
                      />
                      <span style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>
                        {survey.primary_color.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="logo-url-input" className="form-label">
                    Corporate Logo URL
                  </label>
                  <input
                    id="logo-url-input"
                    type="url"
                    value={survey.logo_url || ''}
                    onChange={(e) => handleUpdateSurvey({ logo_url: e.target.value })}
                    placeholder="https://company.com/logo.png"
                    className="input-text"
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Paste a public URL link to your logo. SVG/PNG with transparent background fits
                    best.
                  </span>
                </div>
              </div>
            )}

            {/* TAB: RESPONSES & ANALYTICS */}
            {activeTab === 'responses' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Analytics</h3>

                  <button
                    type="button"
                    disabled={responses.length === 0}
                    onClick={exportResponsesCSV}
                    className="btn btn-secondary btn-sm"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 8px',
                      fontSize: '0.75rem',
                    }}
                  >
                    <Download size={12} /> CSV
                  </button>
                </div>

                <div className="analytics-grid">
                  <div className="glass-card analytics-stat-card">
                    <span className="analytics-number">{responses.length}</span>
                    <span className="analytics-label">Submissions</span>
                  </div>
                  <div className="glass-card analytics-stat-card">
                    <span className="analytics-number">{survey.questions.length}</span>
                    <span className="analytics-label">Questions</span>
                  </div>
                </div>

                {/* Question aggregates breakdown */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <h4
                    style={{
                      fontSize: '0.85rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Question Summaries
                  </h4>

                  {survey.questions.map((q, idx) => {
                    const stats = getQuestionStats(q)
                    return (
                      <div
                        key={q.id}
                        style={{
                          padding: 12,
                          borderRadius: 8,
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid var(--border-color)',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            marginBottom: 4,
                            display: 'flex',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '75%',
                            }}
                          >
                            {idx + 1}. {q.title}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {stats.total} responses
                          </span>
                        </div>

                        {q.type === 'rating_1_5' && 'avg' in stats && (
                          <div
                            style={{
                              marginTop: 8,
                              display: 'flex',
                              alignItems: 'baseline',
                              gap: 6,
                            }}
                          >
                            <span
                              style={{
                                fontSize: '1.4rem',
                                fontWeight: 700,
                                color: 'var(--accent)',
                              }}
                            >
                              {(stats as { total: number; avg: string }).avg}
                            </span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              average score out of 5
                            </span>
                          </div>
                        )}

                        {(q.type === 'multiple_choice' || q.type === 'single_select') &&
                          'counts' in stats && (
                            <div
                              style={{
                                marginTop: 8,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6,
                              }}
                            >
                              {Object.entries(
                                (stats as { total: number; counts: Record<string, number> }).counts,
                              ).map(([opt, count]) => {
                                const pct =
                                  stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
                                return (
                                  <div key={opt} style={{ fontSize: '0.8rem' }}>
                                    <div
                                      style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        marginBottom: 2,
                                      }}
                                    >
                                      <span>{opt}</span>
                                      <span>
                                        {count as number} ({pct}%)
                                      </span>
                                    </div>
                                    <div
                                      style={{
                                        width: '100%',
                                        height: 4,
                                        background: 'rgba(255,255,255,0.06)',
                                        borderRadius: 2,
                                        overflow: 'hidden',
                                      }}
                                    >
                                      <div
                                        style={{
                                          width: `${pct}%`,
                                          height: '100%',
                                          backgroundColor: survey.primary_color,
                                          borderRadius: 2,
                                        }}
                                      />
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}

                        {(q.type === 'short_text' ||
                          q.type === 'long_text' ||
                          q.type === 'date') && (
                          <div
                            style={{
                              marginTop: 8,
                              fontSize: '0.75rem',
                              color: 'var(--text-muted)',
                              fontStyle: 'italic',
                            }}
                          >
                            Collects text answers. Export CSV or see below for the complete response
                            list.
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Raw response table */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <h4
                    style={{
                      fontSize: '0.85rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Submission Log
                  </h4>
                  {responses.length === 0 ? (
                    <p
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                        fontStyle: 'italic',
                      }}
                    >
                      No responses logged yet.
                    </p>
                  ) : (
                    <div className="responses-table-container">
                      <table className="responses-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Responses</th>
                          </tr>
                        </thead>
                        <tbody>
                          {responses.map((resp) => {
                            const snippet = Object.values(resp.answers || {})
                              .map((v) => (Array.isArray(v) ? v.join(', ') : String(v)))
                              .filter(Boolean)
                              .join(' | ')

                            return (
                              <tr key={resp.id}>
                                <td style={{ fontSize: '0.75rem' }}>
                                  {new Date(resp.submitted_at).toLocaleDateString()}
                                </td>
                                <td style={{ fontSize: '0.75rem' }} title={snippet}>
                                  {snippet || 'Empty response'}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DELETE QUESTION CONFIRMATION MODAL */}
      {questionToDelete && (
        <div className="custom-modal-overlay">
          <div className="custom-modal-content" style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
            <div className="custom-modal-header">
              <h3 className="custom-modal-title" style={{ color: 'var(--error)' }}>
                Delete Question
              </h3>
              <button
                type="button"
                onClick={() => setQuestionToDelete(null)}
                className="action-icon-btn"
                style={{ fontSize: '1.2rem', padding: 4 }}
              >
                ✕
              </button>
            </div>
            <div className="custom-modal-body">
              <p style={{ marginBottom: 12 }}>Are you sure you want to delete this question?</p>
              <p
                style={{
                  fontSize: '0.9rem',
                  color: 'var(--text-primary)',
                  background: 'rgba(255,255,255,0.02)',
                  padding: 12,
                  borderRadius: 6,
                  border: '1px solid var(--border-color)',
                  fontStyle: 'italic',
                }}
              >
                "{questionToDelete.title || 'Untitled question'}"
              </p>
            </div>
            <div className="custom-modal-actions">
              <button
                type="button"
                onClick={() => setQuestionToDelete(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteQuestion}
                className="btn btn-primary"
                style={{
                  backgroundColor: 'var(--error)',
                  borderColor: 'var(--error)',
                }}
              >
                Delete Question
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
