import { useState, useRef, useCallback } from 'react'

/**
 * Browser speech recognition hook (Web Speech API).
 * Free, real-time, no API key needed. Works in Chrome/Edge.
 * Returns { start, stop, listening, transcript }.
 */
export function useSpeechRecognition({ onResult, onEnd } = {}) {
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef(null)
  const finalRef = useRef('')

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setListening(false)
  }, [])

  const start = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      onResult?.('[Speech recognition is not supported in this browser. Use Chrome or Edge.]')
      return
    }
    stop()
    finalRef.current = ''

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalRef.current += (finalRef.current ? ' ' : '') + transcript
        } else {
          interim += transcript
        }
      }
      onResult?.(finalRef.current + (interim ? ' ' + interim : ''))
    }

    recognition.onerror = (event) => {
      if (event.error !== 'aborted') {
        console.warn('Speech recognition error:', event.error)
      }
    }

    recognition.onend = () => {
      setListening(false)
      recognitionRef.current = null
      onEnd?.(finalRef.current)
    }

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }, [stop, onResult, onEnd])

  return { start, stop, listening }
}
