export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-text-secondary">Last updated: March 5, 2026</p>

      <div className="mt-8 space-y-8 text-text-secondary leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-text-primary">1. Introduction</h2>
          <p className="mt-3">
            LyricLantern ("we", "our", or "us") operates the website lyriclantern.com (the "Service").
            This Privacy Policy explains how we collect, use, and protect your personal information when
            you use our Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">2. Information We Collect</h2>
          <p className="mt-3">We may collect the following types of information:</p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              <strong className="text-text-primary">Account Information:</strong> When you sign in with Google,
              we receive your name, email address, and profile picture from Google. We do not receive or store
              your Google password.
            </li>
            <li>
              <strong className="text-text-primary">Usage Data:</strong> We collect information about how you
              use the Service, such as which songs you view and vocabulary words you save.
            </li>
            <li>
              <strong className="text-text-primary">YouTube URLs:</strong> When you submit a YouTube URL for
              lyrics processing, we store the URL, video metadata, and the generated lyrics data.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">3. How We Use Your Information</h2>
          <p className="mt-3">We use the information we collect to:</p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>Provide and maintain the Service</li>
            <li>Save your vocabulary words and learning progress</li>
            <li>Display song view counts and popularity rankings</li>
            <li>Improve and optimize the Service</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">4. Data Storage and Security</h2>
          <p className="mt-3">
            Your data is stored securely using Supabase, a trusted cloud database provider. We implement
            appropriate technical and organizational measures to protect your personal information against
            unauthorized access, alteration, disclosure, or destruction.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">5. Third-Party Services</h2>
          <p className="mt-3">We use the following third-party services:</p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              <strong className="text-text-primary">Google OAuth:</strong> For user authentication.
              Subject to Google's <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-china-red hover:underline">Privacy Policy</a>.
            </li>
            <li>
              <strong className="text-text-primary">YouTube:</strong> For video playback.
              Subject to YouTube's <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer" className="text-china-red hover:underline">Terms of Service</a>.
            </li>
            <li>
              <strong className="text-text-primary">Supabase:</strong> For data storage and backend services.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">6. Cookies</h2>
          <p className="mt-3">
            We use essential cookies and local storage to maintain your authentication session.
            We do not use tracking cookies or third-party advertising cookies.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">7. Your Rights</h2>
          <p className="mt-3">You have the right to:</p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>Access the personal data we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your account and associated data</li>
            <li>Withdraw consent for data processing at any time</li>
          </ul>
          <p className="mt-3">
            To exercise any of these rights, please contact us at the email address below.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">8. Children's Privacy</h2>
          <p className="mt-3">
            Our Service is not directed to children under the age of 13. We do not knowingly collect
            personal information from children under 13. If you are a parent or guardian and believe
            your child has provided us with personal information, please contact us.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">9. Changes to This Policy</h2>
          <p className="mt-3">
            We may update this Privacy Policy from time to time. We will notify you of any changes by
            posting the new Privacy Policy on this page and updating the "Last updated" date.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">10. Contact Us</h2>
          <p className="mt-3">
            If you have any questions about this Privacy Policy, please contact us at{' '}
            <a href="mailto:info@lyriclantern.com" className="text-china-red hover:underline">
              info@lyriclantern.com
            </a>.
          </p>
        </section>

        <p className="mt-8 pt-6 border-t border-white/10 text-center text-xs">
          &copy; 2026 LyricLantern. All rights reserved.
        </p>
      </div>
    </div>
  );
}
