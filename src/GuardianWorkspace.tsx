import LiveVoice from './LiveVoice'
import { useRef, useState, type ChangeEvent } from 'react'

type GuardianFeature = {
  id: number
  en: string
  bn: string
  desc: string
  icon: string
}

type Props = {
  feature: GuardianFeature
  english: boolean
  onClose: () => void
}

export default function GuardianWorkspace({ feature, english, onClose }: Props) {
  const [message, setMessage] = useState('')
  const [imageData, setImageData] = useState('')
  const [videoData, setVideoData] = useState('')
  const [audioData, setAudioData] = useState('')
  const [fileName, setFileName] = useState('')
  const [analysis, setAnalysis] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const clearMedia = () => {
    setImageData('')
    setVideoData('')
    setAudioData('')
    setFileName('')
    setError('')
    setAnalysis('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError('')
    setAnalysis('')
    setImageData('')
    setVideoData('')
    setAudioData('')

    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')
    const isAudio = file.type.startsWith('audio/')

    if (!isImage && !isVideo && !isAudio) {
      setError(english ? 'Unsupported file type.' : 'এই ফাইলটি সমর্থিত নয়।')
      return
    }

    const limit = isImage ? 6 : isVideo ? 12 : 8
    if (file.size > limit * 1024 * 1024) {
      setError(english
        ? `File must be within ${limit} MB.`
        : `ফাইল ${limit} MB-এর মধ্যে রাখুন।`)
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const data = String(reader.result || '')
      if (isImage) setImageData(data)
      else if (isVideo) setVideoData(data)
      else setAudioData(data)
      setFileName(file.name)
    }
    reader.onerror = () => setError(english ? 'File could not be read.' : 'ফাইলটি পড়া যায়নি।')
    reader.readAsDataURL(file)
  }

  const toggleVoice = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const w = window as any;
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError(english ? 'Voice typing is not supported. Try Android Chrome.' : 'এই ব্রাউজারে ভয়েস টাইপিং সমর্থিত নয়।');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = english ? 'en-US' : 'bn-BD';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onstart = () => { setListening(true); setError(''); };
      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results).slice(event.resultIndex).map((item: any) => item[0].transcript).join(' ');
        if (transcript.trim()) setMessage(previous => `${previous}${previous ? ' ' : ''}${transcript}`);
      };
      recognition.onerror = (event: any) => {
        setListening(false);
        setError((english ? 'Voice error: ' : 'ভয়েস সমস্যা: ') + (event?.error || 'unknown'));
      };
      recognition.onend = () => setListening(false);
      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setListening(false);
      setError((english ? 'Could not start voice: ' : 'ভয়েস চালু হয়নি: ') + (err?.message || 'unknown'));
    }
  };

  const analyze = async () => {
    if (!message.trim() && !imageData && !videoData && !audioData) {
      setError(english ? 'Write something or attach a file first.' : 'বিশ্লেষণের জন্য লেখা অথবা ফাইল দিন।')
      return
    }

    setLoading(true)
    setError('')
    setAnalysis('')

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          featureId: feature.id,
          message,
          imageData: imageData || undefined,
          videoData: videoData || undefined,
          audioData: audioData || undefined,
          language: english ? 'en' : 'bn'
        })
      })

      const result = await response.json()
      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Analysis failed.')
      }
      setAnalysis(result.analysis || '')
    } catch (err) {
      setError(err instanceof Error
        ? err.message
        : (english ? 'Connection failed. Check the AI server.' : 'AI সার্ভারের সঙ্গে সংযোগ হচ্ছে না।'))
    } finally {
      setLoading(false)
    }
  }

  const speak = () => {
    if (!analysis || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(analysis)
    utterance.lang = english ? 'en-US' : 'bn-BD'
    utterance.rate = 0.92
    window.speechSynthesis.speak(utterance)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="feature-modal workspace-modal" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose} aria-label="Close">×</button>

        <div className={`modal-art art-${feature.id}`}>{feature.icon}</div>
        <span className="section-kicker">TANIA AI GUARDIAN · FEATURE {String(feature.id).padStart(2, '0')}</span>
        <h2>{english ? feature.en : feature.bn}</h2>
        <p>{feature.desc}</p>

        <div className="workspace-label">
          {english ? 'Describe the situation or ask your question' : 'আপনার সমস্যা লিখুন অথবা প্রশ্ন করুন'}
        </div>
        <textarea
          className="guardian-input"
          value={message}
          onChange={e => setMessage(e.target.value)}
          maxLength={5000}
          placeholder={english ? 'Paste a message, link, offer or describe your situation...' : 'মেসেজ, লিংক, অফার পেস্ট করুন অথবা আপনার পরিস্থিতি লিখুন...'}
        />
        <div className="workspace-count">{message.length}/5000</div>

        <div className="workspace-actions">
          <button className="workspace-secondary" onClick={toggleVoice}>
            {listening ? '■ ' + (english ? 'Stop voice' : 'কথা বলা বন্ধ') : '🎙️ ' + (english ? 'Speak' : 'কথা বলুন')}
          </button>
          <label className="workspace-secondary upload-label">
            📎 {english ? 'Attach media' : 'ছবি / ভিডিও / অডিও দিন'}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,audio/*"
              onChange={chooseFile}
              hidden
            />
          </label>
        </div>

        <LiveVoice english={english} feature={feature} />
          {fileName && (
          <div className="workspace-file">
            📄 {fileName}
            <button type="button" className="workspace-secondary" onClick={clearMedia}>
              × {english ? "Remove file" : "ফাইল মুছুন"}
            </button>
          </div>
        )}
        {imageData && <img className="workspace-preview" src={imageData} alt="Selected upload" />}
        {videoData && <video className="workspace-preview" src={videoData} controls />}
        {audioData && <audio className="workspace-audio" src={audioData} controls />}

        {error && <p className="workspace-error">{error}</p>}

        <button className="modal-done workspace-analyze" onClick={analyze} disabled={loading}>
          {loading
            ? (english ? 'Analyzing...' : 'বিশ্লেষণ হচ্ছে...')
            : (english ? 'Analyze with AI' : 'AI দিয়ে বিশ্লেষণ করুন')}
        </button>

        {analysis && (
          <div className="workspace-result">
            <div className="workspace-result-title">
              <strong>{english ? 'AI ANALYSIS RESULT' : 'AI বিশ্লেষণের ফলাফল'}</strong>
              <button className="workspace-secondary" onClick={speak}>🔊 {english ? 'Listen' : 'উত্তর শুনুন'}</button>
            </div>
            <div className="workspace-analysis">{analysis}</div>
          </div>
        )}
        <p className="workspace-disclaimer">
          {english
            ? 'AI guidance is not guaranteed proof. Verify important information independently.'
            : 'AI-এর বিশ্লেষণ সহায়ক তথ্য, শতভাগ প্রমাণ নয়। গুরুত্বপূর্ণ তথ্য নিজে যাচাই করুন।'}
        </p>
      </section>
    </div>
  )
}
