import { useEffect, useRef, useState } from 'react'
import { GoogleGenAI, Modality } from '@google/genai'

type Feature = {
  id: number
  en: string
  bn: string
  desc: string
}

type Props = {
  english: boolean
  feature: Feature
}

const MODEL = 'gemini-3.8-live'

function encodePcm(input: Float32Array, sampleRate: number) {
  const ratio = sampleRate / 16000
  const length = Math.floor(input.length / ratio)
  const pcm = new Int16Array(length)

  for (let i = 0; i < length; i++) {
    const position = i * ratio
    const left = Math.floor(position)
    const right = Math.min(left + 1, input.length - 1)
    const fraction = position - left
    let sample = input[left] + (input[right] - input[left]) * fraction
    sample = Math.max(-1, Math.min(1, sample))
    pcm[i] = sample < 0 ? sample * 32768 : sample * 32767
  }

  const bytes = new Uint8Array(pcm.buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}

export default function LiveVoice({ english, feature }: Props) {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'live'>('idle')
  const [error, setError] = useState('')
  const [transcript, setTranscript] = useState('')

  const sessionRef = useRef<any>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const contextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const playbackRef = useRef<Set<AudioBufferSourceNode>>(new Set())
  const nextPlayTimeRef = useRef(0)

  const addTranscript = (speaker: string, value: string) => {
    const text = value.trim()
    if (text) {
      setTranscript(previous =>
        previous + (previous ? '\n' : '') + speaker + ': ' + text
      )
    }
  }

  const clearPlayback = () => {
    playbackRef.current.forEach(source => {
      try { source.stop() } catch {}
    })
    playbackRef.current.clear()
    nextPlayTimeRef.current = 0
  }

  const releaseMedia = () => {
    processorRef.current?.disconnect()
    micSourceRef.current?.disconnect()
    gainRef.current?.disconnect()

    processorRef.current = null
    micSourceRef.current = null
    gainRef.current = null

    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null

    clearPlayback()

    const context = contextRef.current
    contextRef.current = null
    if (context && context.state !== 'closed') {
      void context.close().catch(() => {})
    }
  }

  const stop = () => {
    const session = sessionRef.current
    sessionRef.current = null

    try {
      session?.sendRealtimeInput({ audioStreamEnd: true })
      session?.close()
    } catch {}

    releaseMedia()
    setStatus('idle')
  }

  const playAudio = (data: string) => {
    const context = contextRef.current
    if (!context || !data) return

    try {
      const raw = atob(data)
      const samples = new Int16Array(Math.floor(raw.length / 2))

      for (let i = 0; i < samples.length; i++) {
        samples[i] = raw.charCodeAt(i * 2) |
          (raw.charCodeAt(i * 2 + 1) << 8)
      }

      if (!samples.length) return

      const buffer = context.createBuffer(1, samples.length, 24000)
      const channel = buffer.getChannelData(0)

      for (let i = 0; i < samples.length; i++) {
        channel[i] = samples[i] / 32768
      }

      const source = context.createBufferSource()
      source.buffer = buffer
      source.connect(context.destination)

      const startAt = Math.max(context.currentTime, nextPlayTimeRef.current)
      source.start(startAt)
      nextPlayTimeRef.current = startAt + buffer.duration

      playbackRef.current.add(source)
      source.onended = () => playbackRef.current.delete(source)
    } catch {
      setError(english ? 'Audio playback failed.' : 'AI-এর অডিও চালানো যায়নি।')
    }
  }

  const start = async () => {
    setStatus('connecting')
    setError('')
    setTranscript('')

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Microphone is not supported in this browser.')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      streamRef.current = stream

      const context = new AudioContext()
      contextRef.current = context
      await context.resume()

      const tokenResponse = await fetch(
        '/api/live-token',
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }
      )

      const tokenResult = await tokenResponse.json()
      if (!tokenResponse.ok || !tokenResult.ok || !tokenResult.token) {
        throw new Error(tokenResult.error || 'Live Voice token failed.')
      }

      const ai = new GoogleGenAI({
        apiKey: tokenResult.token,
        httpOptions: { apiVersion: 'v1beta' }
      })

      const session = await ai.live.connect({
        model: MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Achernar' }
            }
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: {
            parts: [{
              text:
                `You are TANIA AI GUARDIAN, a calm and helpful live voice safety assistant. ` +
                `Current feature: ${feature.en} (${feature.bn}). ` +
                `Understand Bengali (Bangladesh) and English. Respond in the same language ` +
                `the user speaks and switch naturally when they switch languages. ` +
                `Use a gentle, warm, soft female voice. Keep answers clear and practical. ` +
                `Never claim that an uncertain risk assessment is guaranteed proof. ` +
                `Feature context: ${feature.desc}`
            }]
          }
        },
        callbacks: {
          onopen: () => setStatus('live'),

          onmessage: event => {
            const content = event.serverContent
            if (!content) return

            if (content.interrupted) clearPlayback()

            if (content.inputTranscription?.text) {
              addTranscript(english ? 'You' : 'আপনি', content.inputTranscription.text)
            }

            if (content.outputTranscription?.text) {
              addTranscript('TANIA AI', content.outputTranscription.text)
            }

            content.modelTurn?.parts?.forEach(part => {
              const audio = part.inlineData
              if (audio?.data && audio.mimeType?.startsWith('audio/pcm')) {
                playAudio(audio.data)
              }
            })
          },

          onerror: event => {
            setError(event.message || (english ? 'Live Voice connection error.' : 'লাইভ ভয়েস সংযোগে সমস্যা হয়েছে।'))
            stop()
          },

          onclose: () => {
            sessionRef.current = null
            releaseMedia()
            setStatus('idle')
          }
        }
      })

      sessionRef.current = session

      const micSource = context.createMediaStreamSource(stream)
      const processor = context.createScriptProcessor(4096, 1, 1)
      const gain = context.createGain()
      gain.gain.value = 0

      processor.onaudioprocess = event => {
        const liveSession = sessionRef.current
        if (!liveSession) return

        try {
          const input = event.inputBuffer.getChannelData(0)
          const data = encodePcm(input, context.sampleRate)

          liveSession.sendRealtimeInput({
            audio: {
              data,
              mimeType: 'audio/pcm;rate=16000'
            }
          })
        } catch {
          setError(english ? 'Could not send microphone audio.' : 'মাইক্রোফোনের অডিও পাঠানো যায়নি।')
        }
      }

      micSource.connect(processor)
      processor.connect(gain)
      gain.connect(context.destination)

      micSourceRef.current = micSource
      processorRef.current = processor
      gainRef.current = gain
      setStatus('live')

    } catch (err) {
      releaseMedia()
      setStatus('idle')
      setError(
        err instanceof Error
          ? err.message
          : (english ? 'Could not start Live Voice.' : 'লাইভ ভয়েস চালু করা যায়নি।')
      )
    }
  }

  useEffect(() => {
    return () => {
      try { sessionRef.current?.close() } catch {}
      sessionRef.current = null
      releaseMedia()
    }
  }, [])

  return (
    <>
      <button
        type="button"
        className="workspace-secondary"
        onClick={status === 'live' ? stop : start}
        disabled={status === 'connecting'}
      >
        {status === 'connecting'
          ? (english ? 'Connecting...' : 'সংযোগ হচ্ছে...')
          : status === 'live'
            ? (english ? '■ Stop Live Voice' : '■ লাইভ ভয়েস বন্ধ করুন')
            : (english ? '🎧 Live Voice Conversation' : '🎧 সরাসরি কথা বলুন')}
      </button>

      {(status !== 'idle' || error || transcript) && (
        <div style={{
          marginTop: 12,
          padding: 14,
          borderRadius: 14,
          border: '1px solid rgba(65,210,190,0.35)',
          background: 'rgba(8,25,42,0.9)',
          color: '#e9f7f7'
        }}>
          <strong>
            {status === 'connecting'
              ? (english ? 'Connecting to TANIA AI...' : 'TANIA AI-এর সঙ্গে সংযোগ হচ্ছে...')
              : status === 'live'
                ? (english ? '● Live — Speak now. You can interrupt AI.' : '● লাইভ চালু — কথা বলুন, AI-কে মাঝপথে থামাতে পারবেন।')
                : (english ? 'Live Voice stopped' : 'লাইভ ভয়েস বন্ধ')}
          </strong>

          {error && <p style={{ color: '#ffaaaa', marginTop: 8 }}>{error}</p>}

          {transcript && (
            <div style={{
              marginTop: 10,
              maxHeight: 180,
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.6,
              fontSize: 14
            }}>
              {transcript}
            </div>
          )}
        </div>
      )}
    </>
  )
}
