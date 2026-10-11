import { useEffect, useMemo, useRef, useState } from 'react'
import { getPortfolioState } from '../lib/calculations'
import { isSupabaseConfigured } from '../lib/supabase'
import { initializeUserPortfolio, loadUserPortfolio, saveUserPortfolio } from '../lib/portfolioRepository'
import type { PortfolioState } from '../types/portfolio'

const STORAGE_KEY = 'portfolio-tracker-demo-state'

function loadDemoState(): PortfolioState {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return getPortfolioState()

  try {
    return JSON.parse(stored) as PortfolioState
  } catch {
    return getPortfolioState()
  }
}

export function usePortfolio(userId?: string, email = '') {
  const [portfolio, setPortfolio] = useState<PortfolioState>(getPortfolioState)
  const [loading, setLoading] = useState(Boolean(userId))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const readyRef = useRef(false)
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    let active = true
    readyRef.current = false
    setError('')

    if (userId) {
      setLoading(true)
      void initializeUserPortfolio(userId, email)
        .then(() => loadUserPortfolio(userId))
        .then((loadedPortfolio) => {
          if (!active) return
          setPortfolio(loadedPortfolio)
          readyRef.current = true
          setLoading(false)
        })
        .catch((loadError: unknown) => {
          if (!active) return
          setError(loadError instanceof Error ? loadError.message : 'Could not load your portfolio.')
          setLoading(false)
        })
    } else {
      setLoading(false)
      if (!isSupabaseConfigured) setPortfolio(loadDemoState())
      else setPortfolio(getPortfolioState())
      readyRef.current = true
    }

    return () => {
      active = false
    }
  }, [email, userId])

  useEffect(() => {
    if (!readyRef.current) return

    if (userId) {
      const timeout = window.setTimeout(() => {
        setSaving(true)
        setError('')
        saveQueueRef.current = saveQueueRef.current
          .catch(() => undefined)
          .then(() => saveUserPortfolio(userId, portfolio))
          .then(() => setSaving(false))
          .catch((saveError: unknown) => {
            setError(saveError instanceof Error ? saveError.message : 'Could not save your portfolio.')
            setSaving(false)
          })
      }, 400)
      return () => window.clearTimeout(timeout)
    }

    if (!isSupabaseConfigured) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio))
    }
  }, [portfolio, userId])

  return useMemo(() => ({ portfolio, setPortfolio, loading, saving, error }), [portfolio, loading, saving, error])
}
