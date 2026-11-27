type Props = {
  english: boolean
  onChoice: (choice: 'accepted' | 'declined') => void
  onClose?: () => void
}

export default function PrivacyConsent({ english, onChoice, onClose }: Props) {
  return (
    <main className="privacy-consent-screen">
      <section className="privacy-consent-card">
        <div className="privacy-consent-icon">🛡️</div>
        <h1>{english ? 'Your Privacy Matters' : 'আপনার গোপনীয়তা আমাদের কাছে গুরুত্বপূর্ণ'}</h1>
        <p>
          {english
            ? 'With your permission, we may use limited app-usage statistics to improve TANIA AI GUARDIAN. Optional ratings and feedback will only be sent when you choose to submit them.'
            : 'আপনার অনুমতি নিয়ে TANIA AI GUARDIAN উন্নত করার জন্য সীমিত অ্যাপ ব্যবহারের পরিসংখ্যান ব্যবহার করা হতে পারে। Rating ও Feedback কেবল আপনি নিজে পাঠালে জমা হবে।'}
        </p>
        <div className="privacy-consent-details">
          {english
            ? 'We will not collect your private messages, OTPs, passwords, PINs, photos, documents or AI analysis through this optional statistics feature.'
            : 'এই ঐচ্ছিক পরিসংখ্যান ব্যবস্থার মাধ্যমে আপনার ব্যক্তিগত মেসেজ, OTP, পাসওয়ার্ড, PIN, ছবি, ডকুমেন্ট বা AI Analysis সংগ্রহ করা হবে না।'}
        </div>
        <p className="privacy-consent-status">
          {english
            ? 'Important: This version does not send usage statistics to the server. Your choice is saved on this device only. Any future collection will require a clear notice before it starts.'
            : 'গুরুত্বপূর্ণ: এই সংস্করণে ব্যবহারের পরিসংখ্যান সার্ভারে পাঠানো হচ্ছে না। আপনার পছন্দ শুধু এই ডিভাইসে সংরক্ষিত হবে। ভবিষ্যতে তথ্য সংগ্রহ চালুর আগে স্পষ্টভাবে জানানো হবে।'}
        </p>
        <button className="privacy-accept" onClick={() => onChoice('accepted')}>
          {english ? 'I Agree' : 'হ্যাঁ, আমি সম্মতি দিচ্ছি'}
        </button>
        <button className="privacy-decline" onClick={() => onChoice('declined')}>
          {english ? 'I Do Not Agree' : 'না, আমি সম্মতি দিচ্ছি না'}
        </button>
        {onClose && (
          <button className="privacy-close" onClick={onClose}>
            {english ? 'Close' : 'বন্ধ করুন'}
          </button>
        )}
        <small>
          {english
            ? 'You can change your choice later from the app footer.'
            : 'অ্যাপের Footer থেকে পরে আপনার পছন্দ পরিবর্তন করতে পারবেন।'}
        </small>
      </section>
    </main>
  )
}
