import { useState, useRef, useCallback } from 'react'

/**
 * TTS hook: tries OpenAI server TTS first, falls back to browser SpeechSynthesis.
 * Returns { speak, stop, speaking }.
 */
function getInitialVoice() {
  try {
    const stored = localStorage.getItem('interviewai.user')
    if (stored) {
      const user = JSON.parse(stored)
      if (user.settings?.preferences?.voice) {
        return user.settings.preferences.voice
      }
    }
  } catch { /* ignore */ }
  return 'nova'
}

export function useSpeech() {
  const [speaking, setSpeaking] = useState(false)
  const [voice, setVoice] = useState(getInitialVoice)
  const audioRef = useRef(null)
  const utteranceRef = useRef(null)

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [])

  const speak = useCallback(async (text, sessionId, options = {}) => {
    if (!text) return
    stop()
    setSpeaking(true)

    const voiceToUse = options.voice || voice
    const language = options.language || 'en'

    // Try server TTS first
    if (sessionId) {
      try {
        const res = await fetch(`/api/v1/interviews/${sessionId}/tts`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice: voiceToUse }),
        })
        if (res.ok) {
          const blob = await res.blob()
          const url = URL.createObjectURL(blob)
          const audio = new Audio(url)
          audioRef.current = audio
          audio.onended = () => { URL.revokeObjectURL(url); setSpeaking(false); audioRef.current = null }
          audio.onerror = () => { URL.revokeObjectURL(url); setSpeaking(false); audioRef.current = null }
          await audio.play()
          return
        }
      } catch { /* fall through to browser TTS */ }
    }

    // Browser Speech Synthesis fallback
    if (!window.speechSynthesis) { setSpeaking(false); return }
    const utterance = new SpeechSynthesisUtterance(text.slice(0, 500))
    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.lang = language === 'fr' ? 'fr-FR' : 'en-US'
    utterance.onend = () => { setSpeaking(false); utteranceRef.current = null }
    utterance.onerror = () => { setSpeaking(false); utteranceRef.current = null }
    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }, [stop, voice])

  return { speak, stop, speaking, setVoice }
}
