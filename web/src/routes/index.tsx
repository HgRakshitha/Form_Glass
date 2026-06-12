import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  Clipboard,
  Clock,
  Edit3,
  ExternalLink,
  FileSpreadsheet,
  Heart,
  HelpCircle,
  Layers,
  Palette,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../AuthContext'

export const Route = createFileRoute('/')({
  component: Home,
})

interface Survey {
  id: string
  title: string
  description: string | null
  primary_color: string
  logo_url: string | null
  questions: unknown[]
  created_at: string
  updated_at: string
  response_count?: number
}

function Home() {
  const { user, loading: authLoading, apiFetch } = useAuth()
  const navigate = useNavigate()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Wizard States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newSurveyTitle, setNewSurveyTitle] = useState('')
  const [newSurveyDesc, setNewSurveyDesc] = useState('')
  const [newSurveyTemplate, setNewSurveyTemplate] = useState<'blank' | 'customer_feedback'>('blank')

  // Custom Deletion States
  const [surveyToDelete, setSurveyToDelete] = useState<Survey | null>(null)
  const [deleteConfirmLoading, setDeleteConfirmLoading] = useState(false)

  // biome-ignore lint/correctness/useExhaustiveDependencies: fetch surveys when user session initializes
  useEffect(() => {
    if (user) {
      fetchSurveys()
    }
  }, [user])

  const fetchSurveys = async () => {
    setLoading(true)
    try {
      const data = await apiFetch('/api/surveys')
      setSurveys(data.surveys || [])
    } catch (err) {
      console.error('Failed to load surveys:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSurveySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSurveyTitle.trim()) return
    setCreateLoading(true)
    try {
      let questions: unknown[] = []
      if (newSurveyTemplate === 'customer_feedback') {
        questions = [
          {
            id: crypto.randomUUID().split('-')[0],
            type: 'short_text',
            title: 'What is your name?',
            required: true,
            properties: { placeholder: 'Jane Doe' },
          },
          {
            id: crypto.randomUUID().split('-')[0],
            type: 'multiple_choice',
            title: 'How did you hear about us?',
            required: false,
            properties: {
              options: ['Search Engine', 'Social Media', 'Word of Mouth', 'Other'],
            },
          },
          {
            id: crypto.randomUUID().split('-')[0],
            type: 'rating_1_5',
            title: 'How would you rate our platform interface?',
            required: true,
            properties: { min_label: 'Poor', max_label: 'Amazing' },
          },
        ]
      }

      const data = await apiFetch('/api/surveys', {
        method: 'POST',
        body: JSON.stringify({
          title: newSurveyTitle.trim(),
          description: newSurveyDesc.trim() || null,
          primary_color: '#4f46e5',
          questions,
        }),
      })
      setIsCreateModalOpen(false)
      setNewSurveyTitle('')
      setNewSurveyDesc('')
      setNewSurveyTemplate('blank')
      navigate({ to: '/surveys/$id/edit', params: { id: data.survey.id } })
    } catch (err) {
      console.error('Failed to create survey:', err)
    } finally {
      setCreateLoading(false)
    }
  }

  const confirmDeleteSurvey = async () => {
    if (!surveyToDelete) return
    setDeleteConfirmLoading(true)
    try {
      await apiFetch(`/api/surveys/${surveyToDelete.id}`, {
        method: 'DELETE',
      })
      setSurveys(surveys.filter((s) => s.id !== surveyToDelete.id))
      setSurveyToDelete(null)
    } catch (err) {
      console.error('Failed to delete survey:', err)
    } finally {
      setDeleteConfirmLoading(false)
    }
  }

  const copyLink = (surveyId: string) => {
    const link = `${window.location.origin}/s/${surveyId}`
    navigator.clipboard.writeText(link)
    setCopiedId(surveyId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (authLoading) {
    return (
      <div className="loading-wrapper" style={{ height: '80vh' }}>
        <div className="spinner" />
        <p>Syncing session...</p>
      </div>
    )
  }

  // Dashboard View (Authenticated)
  if (user) {
    const totalSurveys = surveys.length
    const totalResponses = surveys.reduce((sum, s) => sum + (s.response_count || 0), 0)
    const totalQuestions = surveys.reduce((sum, s) => sum + s.questions.length, 0)
    const activeThemes = new Set(surveys.map((s) => s.primary_color)).size

    return (
      <div className="dashboard-container animate-slide-in">
        {/* Welcome Hero Area */}
        <div className="dashboard-welcome-banner">
          <div className="banner-glow-effect" />
          <div style={{ position: 'relative', zIndex: 2 }}>
            <h1 className="dashboard-welcome-title">Welcome back, {user.email.split('@')[0]}</h1>
            <p className="dashboard-welcome-subtitle">
              Manage your corporate survey builder, configure branded themes, and review real-time
              feedback data.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            disabled={createLoading}
            className="btn btn-primary create-survey-hero-btn"
            style={{ display: 'flex', alignItems: 'center', gap: 8, zIndex: 2 }}
          >
            {createLoading ? (
              <span className="spinner" style={{ width: 16, height: 16, borderWidth: '2px' }} />
            ) : (
              <>
                <Plus size={18} />
                <span>Create New Survey</span>
              </>
            )}
          </button>
        </div>

        {/* Global Analytics Overview Panel */}
        <div className="stats-overview-grid">
          <div className="glass-card stat-card-modern">
            <div className="stat-card-glow color-purple" />
            <div className="stat-card-inner">
              <span className="stat-card-label">Total Surveys</span>
              <span className="stat-card-value">{totalSurveys}</span>
            </div>
            <div className="stat-card-icon" style={{ color: 'rgb(139, 92, 246)' }}>
              <Layers size={22} />
            </div>
          </div>

          <div className="glass-card stat-card-modern">
            <div className="stat-card-glow color-emerald" />
            <div className="stat-card-inner">
              <span className="stat-card-label">Responses Collected</span>
              <span className="stat-card-value">{totalResponses}</span>
            </div>
            <div className="stat-card-icon" style={{ color: 'rgb(16, 185, 129)' }}>
              <FileSpreadsheet size={22} />
            </div>
          </div>

          <div className="glass-card stat-card-modern">
            <div className="stat-card-glow color-blue" />
            <div className="stat-card-inner">
              <span className="stat-card-label">Total Questions</span>
              <span className="stat-card-value">{totalQuestions}</span>
            </div>
            <div className="stat-card-icon" style={{ color: 'rgb(59, 130, 246)' }}>
              <HelpCircle size={22} />
            </div>
          </div>

          <div className="glass-card stat-card-modern">
            <div className="stat-card-glow color-rose" />
            <div className="stat-card-inner">
              <span className="stat-card-label">Active Visual Themes</span>
              <span className="stat-card-value">{activeThemes}</span>
            </div>
            <div className="stat-card-icon" style={{ color: 'rgb(244, 63, 94)' }}>
              <Palette size={22} />
            </div>
          </div>
        </div>

        {/* Surveys List Section */}
        <div className="dashboard-section-header">
          <h2 style={{ fontSize: '1.4rem', fontWeight: 600 }}>Your Live Forms</h2>
          <span className="badge-count">{totalSurveys} total</span>
        </div>

        {loading ? (
          <div className="loading-wrapper" style={{ height: '40vh' }}>
            <div className="spinner" />
            <p>Loading surveys...</p>
          </div>
        ) : surveys.length === 0 ? (
          <div className="glass-card empty-state-card">
            <div className="empty-state-icon-bg">
              <Layers size={36} />
            </div>
            <h2 style={{ fontSize: '1.75rem', marginBottom: 12 }}>No surveys yet</h2>
            <p
              style={{
                color: 'var(--text-secondary)',
                marginBottom: 32,
                fontSize: '0.95rem',
                lineHeight: 1.6,
                maxWidth: 500,
                margin: '0 auto 32px auto',
              }}
            >
              Create your very first branded survey and start collecting feedback from respondents
              instantly. Set custom logos, primary colors, and question structures.
            </p>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              disabled={createLoading}
              className="btn btn-primary"
            >
              {createLoading ? 'Building Starter...' : 'Build your first survey'}
            </button>
          </div>
        ) : (
          <div className="dashboard-grid">
            {surveys.map((survey) => {
              const borderAccentColor = survey.primary_color || 'var(--accent)'
              const responseBadgeColor =
                (survey.response_count || 0) > 0
                  ? 'rgba(16, 185, 129, 0.15)'
                  : 'rgba(255,255,255,0.04)'
              const responseBadgeText =
                (survey.response_count || 0) > 0 ? 'var(--success)' : 'var(--text-muted)'

              return (
                <div
                  key={survey.id}
                  className="glass-card survey-card-premium"
                  style={
                    {
                      '--card-accent': borderAccentColor,
                    } as React.CSSProperties
                  }
                >
                  <div className="card-accent-indicator" />

                  <div className="survey-card-header">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 className="survey-title-premium" title={survey.title}>
                        {survey.title}
                      </h3>
                      <span className="survey-id-tag">ID: {survey.id}</span>
                    </div>
                    {survey.logo_url ? (
                      <div className="survey-card-logo-container">
                        <img src={survey.logo_url} alt="Logo" className="survey-card-logo" />
                      </div>
                    ) : (
                      <div
                        className="survey-card-logo-fallback"
                        style={{ backgroundColor: borderAccentColor }}
                      >
                        {(survey.title[0] ?? '').toUpperCase()}
                      </div>
                    )}
                  </div>

                  <p className="survey-desc-premium">
                    {survey.description || 'No description provided.'}
                  </p>

                  <div className="survey-card-badges">
                    <span className="badge-pill">
                      <HelpCircle size={13} />
                      <span>{survey.questions.length} questions</span>
                    </span>
                    <span
                      className="badge-pill"
                      style={{ background: responseBadgeColor, color: responseBadgeText }}
                    >
                      <FileSpreadsheet size={13} />
                      <span style={{ fontWeight: (survey.response_count || 0) > 0 ? 600 : 400 }}>
                        {survey.response_count || 0} responses
                      </span>
                    </span>
                  </div>

                  <div className="survey-card-footer">
                    <div className="updated-timestamp">
                      <Clock size={12} />
                      <span>
                        {new Date(survey.updated_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyLink(survey.id)}
                      className="btn btn-secondary btn-sm copy-link-btn"
                      title="Copy Public URL"
                    >
                      <Clipboard size={13} />
                      <span>{copiedId === survey.id ? 'Copied!' : 'Copy URL'}</span>
                    </button>
                  </div>

                  <div className="survey-card-actions">
                    <Link
                      to="/surveys/$id/edit"
                      params={{ id: survey.id }}
                      className="btn btn-primary btn-sm edit-btn-premium"
                    >
                      <Edit3 size={14} />
                      <span>Edit & Analytics</span>
                    </Link>
                    <a
                      href={`/s/${survey.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary btn-sm action-icon-only-btn"
                      title="Open Public Survey Page"
                    >
                      <ExternalLink size={14} />
                    </a>
                    <button
                      type="button"
                      onClick={() => setSurveyToDelete(survey)}
                      className="btn btn-secondary btn-sm delete-btn-premium"
                      title="Delete Survey"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* SURVEY CREATION MODAL */}
        {isCreateModalOpen && (
          <div className="custom-modal-overlay">
            <div className="custom-modal-content">
              <div className="custom-modal-header">
                <h3 className="custom-modal-title">Create New Survey</h3>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="action-icon-btn"
                  style={{ fontSize: '1.2rem', padding: 4 }}
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleCreateSurveySubmit}>
                <div
                  className="custom-modal-body"
                  style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
                >
                  <div className="form-group">
                    <label
                      htmlFor="new-survey-title"
                      className="form-label"
                      style={{ fontWeight: 600 }}
                    >
                      Survey Title
                    </label>
                    <input
                      id="new-survey-title"
                      type="text"
                      required
                      placeholder="e.g. Q3 Product Feedback"
                      value={newSurveyTitle}
                      onChange={(e) => setNewSurveyTitle(e.target.value)}
                      className="input-text"
                    />
                  </div>
                  <div className="form-group">
                    <label
                      htmlFor="new-survey-desc"
                      className="form-label"
                      style={{ fontWeight: 600 }}
                    >
                      Description (Optional)
                    </label>
                    <textarea
                      id="new-survey-desc"
                      placeholder="Describe the purpose of this survey..."
                      value={newSurveyDesc}
                      onChange={(e) => setNewSurveyDesc(e.target.value)}
                      className="textarea-input"
                      style={{ minHeight: 80 }}
                    />
                  </div>
                  <div className="form-group">
                    <span className="form-label" style={{ fontWeight: 600 }}>
                      Starting Template
                    </span>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 12,
                        marginTop: 4,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setNewSurveyTemplate('blank')}
                        className={`glass-card ${newSurveyTemplate === 'blank' ? 'active' : ''}`}
                        style={{
                          padding: 16,
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                          border:
                            newSurveyTemplate === 'blank'
                              ? '1px solid var(--accent)'
                              : '1px solid var(--border-color)',
                          background:
                            newSurveyTemplate === 'blank'
                              ? 'var(--accent-light)'
                              : 'rgba(255,255,255,0.02)',
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            color: 'var(--text-primary)',
                          }}
                        >
                          Blank Canvas
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Start completely fresh with no questions.
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewSurveyTemplate('customer_feedback')}
                        className={`glass-card ${newSurveyTemplate === 'customer_feedback' ? 'active' : ''}`}
                        style={{
                          padding: 16,
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                          border:
                            newSurveyTemplate === 'customer_feedback'
                              ? '1px solid var(--accent)'
                              : '1px solid var(--border-color)',
                          background:
                            newSurveyTemplate === 'customer_feedback'
                              ? 'var(--accent-light)'
                              : 'rgba(255,255,255,0.02)',
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            color: 'var(--text-primary)',
                          }}
                        >
                          Customer Feedback
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Pre-filled with standard feedback fields.
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="custom-modal-actions">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    {createLoading ? (
                      <span
                        className="spinner"
                        style={{ width: 14, height: 14, borderWidth: '2px' }}
                      />
                    ) : (
                      'Create Survey'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {surveyToDelete && (
          <div className="custom-modal-overlay">
            <div className="custom-modal-content" style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
              <div className="custom-modal-header">
                <h3 className="custom-modal-title" style={{ color: 'var(--error)' }}>
                  Delete Survey
                </h3>
                <button
                  type="button"
                  onClick={() => setSurveyToDelete(null)}
                  className="action-icon-btn"
                  style={{ fontSize: '1.2rem', padding: 4 }}
                >
                  ✕
                </button>
              </div>
              <div className="custom-modal-body">
                <p style={{ marginBottom: 12 }}>
                  Are you sure you want to delete <strong>{surveyToDelete.title}</strong>?
                </p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  This action will permanently delete the survey and all of its responses. This
                  cannot be undone.
                </p>
              </div>
              <div className="custom-modal-actions">
                <button
                  type="button"
                  onClick={() => setSurveyToDelete(null)}
                  className="btn btn-secondary"
                  disabled={deleteConfirmLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteSurvey}
                  disabled={deleteConfirmLoading}
                  className="btn btn-primary"
                  style={{
                    backgroundColor: 'var(--error)',
                    borderColor: 'var(--error)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  {deleteConfirmLoading ? (
                    <span
                      className="spinner"
                      style={{ width: 14, height: 14, borderWidth: '2px' }}
                    />
                  ) : (
                    'Delete Permanently'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Landing Page View (Unauthenticated)
  return (
    <div className="landing-root">
      <div className="landing-hero animate-slide-in">
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 16px',
            borderRadius: 100,
            background: 'var(--accent-light)',
            color: 'var(--accent)',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: 28,
            border: '1px solid rgba(99, 102, 241, 0.2)',
          }}
        >
          <Sparkles size={14} />
          <span>Form builder with glassmorphism aesthetics</span>
        </div>
        <h1 className="hero-title">Build Surveys That Match Your Visual Identity</h1>
        <p className="hero-subtitle">
          An intuitive, beautiful dashboard to create and publish branded feedback loops. Bring your
          own brand colors, logo, and custom flows in seconds.
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <Link
            to="/login"
            className="btn btn-primary"
            style={{ padding: '14px 28px', fontSize: '1rem' }}
          >
            Get Started For Free
          </Link>
          <a
            href="#features"
            className="btn btn-secondary"
            style={{ padding: '14px 28px', fontSize: '1rem' }}
          >
            Learn More
          </a>
        </div>
      </div>

      <div
        id="features"
        style={{ maxWidth: 1000, margin: '80px auto 120px auto', padding: '0 24px' }}
      >
        <h2
          style={{
            textAlign: 'center',
            fontSize: '2rem',
            marginBottom: 48,
            fontFamily: 'var(--font-display)',
          }}
        >
          Design Loops Designed to Convert
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 32,
          }}
        >
          <div className="glass-card" style={{ padding: 32 }}>
            <div style={{ color: 'var(--accent)', marginBottom: 16 }}>
              <Palette size={28} />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: 12 }}>Bespoke Themes</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Choose your colors, inject your company logo, and render questions directly styled to
              your corporate identity.
            </p>
          </div>

          <div className="glass-card" style={{ padding: 32 }}>
            <div style={{ color: 'var(--accent)', marginBottom: 16 }}>
              <Sparkles size={28} />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: 12 }}>Step-by-Step Flow</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Interactive Typeform-like step animations keep respondents focused and boost
              submission rates.
            </p>
          </div>

          <div className="glass-card" style={{ padding: 32 }}>
            <div style={{ color: 'var(--accent)', marginBottom: 16 }}>
              <FileSpreadsheet size={28} />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: 12 }}>Live Analytics</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              View raw answers, response metrics, satisfaction scores, and export your collected
              responses to CSV anytime.
            </p>
          </div>
        </div>
      </div>

      <footer
        style={{
          borderTop: '1px solid var(--border-color)',
          padding: 40,
          textAlign: 'center',
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
        }}
      >
        <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <span>Made with</span>
          <Heart size={12} style={{ color: 'var(--error)' }} />
          <span>using React, Hono, and Cloudflare D1.</span>
        </p>
      </footer>
    </div>
  )
}
