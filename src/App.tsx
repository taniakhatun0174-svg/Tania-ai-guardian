import { useState } from 'react'
import './App.css'
import GuardianWorkspace from './GuardianWorkspace'

const guardianImages = ['life','truth','scam','voice','family','emergency','phone-number','face-video','fake-job','payment','shopping','website-link','social-media','document','privacy','cyber-help'];

type Feature = {
  id: number
  en: string
  bn: string
  desc: string
  icon: string
  group: string
}

const features: Feature[] = [
  { id: 1, en: 'Life Guardian', bn: 'লাইফ গার্ডিয়ান', desc: 'দৈনন্দিন জীবনের ঝুঁকি বুঝতে ও নিরাপদ সিদ্ধান্ত নিতে সাহায্য করবে।', icon: '🛡️', group: 'MAIN GUARDIANS' },
  { id: 2, en: 'Truth Guardian', bn: 'ট্রুথ গার্ডিয়ান', desc: 'তথ্য, দাবি ও সন্দেহজনক খবর যাচাই করতে সাহায্য করবে।', icon: '🔎', group: 'MAIN GUARDIANS' },
  { id: 3, en: 'Scam Guardian', bn: 'স্ক্যাম গার্ডিয়ান', desc: 'প্রতারণামূলক SMS, মেসেজ, লিংক ও অফারের ঝুঁকি বিশ্লেষণ করবে।', icon: '🚨', group: 'MAIN GUARDIANS' },
  { id: 4, en: 'Voice Guardian', bn: 'ভয়েস গার্ডিয়ান', desc: 'সন্দেহজনক ভয়েস ও সম্ভাব্য AI-নকল কণ্ঠের লক্ষণ পরীক্ষা করবে।', icon: '🎙️', group: 'MAIN GUARDIANS' },
  { id: 5, en: 'Family Guardian', bn: 'ফ্যামিলি গার্ডিয়ান', desc: 'পরিবারের সদস্যদের ডিজিটাল নিরাপত্তায় সহায়তা করবে।', icon: '👨‍👩‍👧', group: 'MAIN GUARDIANS' },
  { id: 6, en: 'Emergency SOS', bn: 'ইমার্জেন্সি SOS', desc: 'জরুরি পরিস্থিতিতে প্রয়োজনীয় সহায়তা ও যোগাযোগের পথ দেখাবে।', icon: '🆘', group: 'MAIN GUARDIANS' },
  { id: 7, en: 'Phone Number Guardian', bn: 'ফোন নম্বর গার্ডিয়ান', desc: 'ফোন নম্বরের রিপোর্ট, পরিচিত ঝুঁকির তথ্য ও সন্দেহজনক আচরণ দেখাবে।', icon: '📱', group: 'SPECIAL PROTECTION' },
  { id: 8, en: 'Face & Video Guardian', bn: 'ফেস ও ভিডিও গার্ডিয়ান', desc: 'ছবি ও ভিডিওতে সম্ভাব্য সম্পাদনা বা Deepfake-এর লক্ষণ পরীক্ষা করবে।', icon: '🎭', group: 'SPECIAL PROTECTION' },
  { id: 9, en: 'Fake Job Guardian', bn: 'ফেক জব গার্ডিয়ান', desc: 'ভুয়া চাকরি, নিয়োগ বিজ্ঞপ্তি ও আবেদন ফি-র প্রতারণা শনাক্তে সহায়তা করবে।', icon: '💼', group: 'SPECIAL PROTECTION' },
  { id: 10, en: 'Payment Guardian', bn: 'পেমেন্ট গার্ডিয়ান', desc: 'বিকাশ, নগদ, রকেটসহ ডিজিটাল লেনদেনের প্রতারণার ঝুঁকি বুঝতে সাহায্য করবে।', icon: '💳', group: 'SPECIAL PROTECTION' },
  { id: 11, en: 'Shopping Guardian', bn: 'শপিং গার্ডিয়ান', desc: 'ভুয়া অনলাইন দোকান, পেজ, পণ্য ও অগ্রিম পেমেন্টের ঝুঁকি পরীক্ষা করবে।', icon: '🛍️', group: 'SPECIAL PROTECTION' },
  { id: 12, en: 'Website & Link Guardian', bn: 'ওয়েবসাইট ও লিংক গার্ডিয়ান', desc: 'সন্দেহজনক ওয়েবসাইট ও Phishing লিংকের লক্ষণ পরীক্ষা করবে।', icon: '🌐', group: 'SPECIAL PROTECTION' },
  { id: 13, en: 'Social Media Guardian', bn: 'সোশ্যাল মিডিয়া গার্ডিয়ান', desc: 'সন্দেহজনক প্রোফাইল, পেজ ও সামাজিক যোগাযোগের মেসেজ বিশ্লেষণ করবে।', icon: '👥', group: 'SPECIAL PROTECTION' },
  { id: 14, en: 'Document Guardian', bn: 'ডকুমেন্ট গার্ডিয়ান', desc: 'চাকরির চিঠি, রসিদ ও নথিতে সম্ভাব্য জালিয়াতির লক্ষণ পরীক্ষা করবে।', icon: '📄', group: 'SPECIAL PROTECTION' },
  { id: 15, en: 'Privacy Guardian', bn: 'প্রাইভেসি গার্ডিয়ান', desc: 'OTP, পাসওয়ার্ড ও ব্যক্তিগত তথ্য সুরক্ষায় সহায়তা করবে।', icon: '🔐', group: 'SPECIAL PROTECTION' },
  { id: 16, en: 'Cyber Help Center', bn: 'সাইবার হেল্প সেন্টার', desc: 'প্রতারণার শিকার হলে করণীয় ও অভিযোগ জানানোর পথ দেখাবে।', icon: '🧭', group: 'SPECIAL PROTECTION' },
]

function App() {
  const [showWelcome, setShowWelcome] = useState(true)
  const [english, setEnglish] = useState(false)
  const [selected, setSelected] = useState<Feature | null>(null)
  const [search, setSearch] = useState('')

  const filtered = features.filter((f) =>
    `${f.en} ${f.bn} ${f.desc}`.toLowerCase().includes(search.toLowerCase())
  )

  const main = filtered.filter((f) => f.group === 'MAIN GUARDIANS')
  const special = filtered.filter((f) => f.group === 'SPECIAL PROTECTION')

  if (showWelcome) {
    return (
      <main className="welcome-screen">
        <img
          className="welcome-poster"
          src="/images/branding/tania-guardian-welcome.jpg"
          alt="TANIA AI GUARDIAN Welcome"
        />
        <button className="welcome-enter" onClick={() => setShowWelcome(false)}>
          প্রবেশ করুন
        </button>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="TANIA AI GUARDIAN home">
          <span className="brand-mark">✦</span>
          <span><strong>TANIA AI GUARDIAN</strong><small>FOUNDER: TANIA</small></span>
        </a>
        <button className="language-btn" onClick={() => setEnglish(!english)}>
          {english ? 'বাংলা' : 'ENGLISH'}
        </button>
      </header>

      <section className="hero">
        <div className="hero-glow" />
        <div className="hero-main">
          <div className="hero-visual">
            <img
              className="hero-welcome-image"
              src="/images/branding/tania-guardian-dashboard.png"
              alt="TANIA AI GUARDIAN-এর ১৬টি নিরাপত্তা ফিচার দেখাচ্ছেন একজন নারী"
            />
          </div>
          <div className="hero-copy">
            <div className="eyebrow"><span className="live-dot" /> YOUR DIGITAL SAFETY PARTNER</div>
            <h1>{english ? <>Your Safety.<br /><span>Our Mission.</span></> : <>আপনার নিরাপত্তা,<br /><span>আমাদের অঙ্গীকার।</span></>}</h1>
            <p>{english ? 'One intelligent place to help protect your digital life, family and decisions.' : 'আপনার ডিজিটাল জীবন, পরিবার ও নিরাপদ সিদ্ধান্তের জন্য এক বিশ্বস্ত সহকারী।'}</p>
          </div>
        </div>
        <div className="hero-stats">
          <div><strong>16</strong><span>{english ? 'Protection tools' : 'নিরাপত্তা ফিচার'}</span></div>
          <i />
          <div><strong>24/7</strong><span>{english ? 'Safety companion' : 'নিরাপত্তার সঙ্গী'}</span></div>
        </div>
      </section>

      <section className="tools-section">
        <div className="section-heading">
          <div><span className="section-kicker">EXPLORE PROTECTION</span><h2>{english ? 'Your Guardians' : 'আপনার গার্ডিয়ানসমূহ'}</h2></div>
          <span className="count-pill">16 TOOLS</span>
        </div>
        <label className="search-box">
          <span>⌕</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={english ? 'Search a safety feature...' : 'নিরাপত্তা ফিচার খুঁজুন...'} />
        </label>

        <div className="group-title"><span />{english ? 'MAIN GUARDIANS' : 'প্রধান গার্ডিয়ান'}<small>06</small></div>
        <div className="feature-grid">
          {main.map((f) => <button className="feature-card" key={f.id} onClick={() => setSelected(f)}>
            <span className={`feature-art art-${f.id}`}><img src={`/images/guardians/${guardianImages[f.id - 1]}.webp`} alt={english ? f.en : f.bn} /><i>✦</i></span>
            <span className="card-copy"><strong>{english ? f.en : f.bn}</strong><small>{english ? 'Explore protection' : 'বিস্তারিত দেখুন'}</small></span>
            <span className="card-arrow">↗</span>
          </button>)}
        </div>

        <div className="group-title second-group"><span />{english ? 'SPECIAL PROTECTION' : 'বিশেষ নিরাপত্তা'}<small>10</small></div>
        <div className="feature-grid">
          {special.map((f) => <button className="feature-card" key={f.id} onClick={() => setSelected(f)}>
            <span className={`feature-art art-${f.id}`}><img src={`/images/guardians/${guardianImages[f.id - 1]}.webp`} alt={english ? f.en : f.bn} /><i>✦</i></span>
            <span className="card-copy"><strong>{english ? f.en : f.bn}</strong><small>{english ? 'Explore protection' : 'বিস্তারিত দেখুন'}</small></span>
            <span className="card-arrow">↗</span>
          </button>)}
        </div>
        {filtered.length === 0 && <p className="empty-state">{english ? 'No matching feature found.' : 'কোনো ফিচার পাওয়া যায়নি।'}</p>}
      </section>

      <section className="trust-note">
        <span className="trust-icon">⬡</span>
        <div><strong>{english ? 'Safety with transparency' : 'স্বচ্ছতার সঙ্গে নিরাপত্তা'}</strong><p>{english ? 'AI results are guidance, not guaranteed proof. Verify important information independently.' : 'AI-এর ফলাফল সহায়ক তথ্য, শতভাগ প্রমাণ নয়। গুরুত্বপূর্ণ তথ্য নিজে যাচাই করুন।'}</p></div>
      </section>

      <footer><div className="footer-brand">✦ TANIA AI GUARDIAN <span>FOUNDER: TANIA</span></div><p>{english ? 'Built to help make the digital world safer.' : 'ডিজিটাল পৃথিবীকে আরও নিরাপদ করতে আমাদের যাত্রা।'}</p><small>© 2026 TANIA · TANIA AI GUARDIAN</small></footer>

      {selected && <GuardianWorkspace key={selected.id} feature={selected} english={english} onClose={() => setSelected(null)} />}
    </main>
  )
}

export default App
