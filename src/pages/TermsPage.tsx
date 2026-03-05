export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">Terms of Service</h1>
      <p className="mt-2 text-sm text-text-secondary">Last updated: March 5, 2026</p>

      <div className="mt-8 space-y-8 text-text-secondary leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-text-primary">1. Acceptance of Terms</h2>
          <p className="mt-3">
            By accessing or using LyricLantern ("the Service"), operated at lyriclantern.com,
            you agree to be bound by these Terms of Service. If you do not agree to these terms,
            please do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">2. Description of Service</h2>
          <p className="mt-3">
            LyricLantern is a language-learning platform that helps users learn Chinese through music.
            The Service provides synchronized lyrics with pinyin romanization and English translations
            for Chinese songs available on YouTube. Users can save vocabulary words and track their
            learning progress.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">3. User Accounts</h2>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>You may use certain features of the Service without creating an account.</li>
            <li>To access features such as saving vocabulary, you must sign in using Google authentication.</li>
            <li>You are responsible for maintaining the security of your account.</li>
            <li>You must provide accurate information when creating your account.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">4. Acceptable Use</h2>
          <p className="mt-3">You agree not to:</p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>Use the Service for any unlawful purpose</li>
            <li>Attempt to gain unauthorized access to the Service or its systems</li>
            <li>Interfere with or disrupt the Service or its infrastructure</li>
            <li>Use automated tools to scrape or extract data from the Service</li>
            <li>Upload or submit content that infringes on intellectual property rights</li>
            <li>Impersonate any person or entity</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">5. Intellectual Property</h2>
          <p className="mt-3">
            The LyricLantern name, logo, and original software code are our intellectual property.
            Song lyrics, music, and video content are the property of their respective copyright holders.
            The Service provides AI-generated translations and romanizations for educational purposes under
            fair use principles.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">6. YouTube Content</h2>
          <p className="mt-3">
            The Service embeds YouTube videos using the official YouTube embedded player. By using the
            Service, you also agree to be bound by YouTube's{' '}
            <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer" className="text-china-red hover:underline">
              Terms of Service
            </a>. We do not download, store, or redistribute any video or audio content from YouTube.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">7. AI-Generated Content</h2>
          <p className="mt-3">
            Lyrics translations, pinyin romanizations, and vocabulary definitions are generated using
            artificial intelligence. While we strive for accuracy, we do not guarantee that AI-generated
            content is completely accurate or error-free. The Service is intended as a learning aid and
            should not be relied upon as the sole source of language instruction.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">8. Limitation of Liability</h2>
          <p className="mt-3">
            The Service is provided "as is" and "as available" without warranties of any kind, either
            express or implied. We shall not be liable for any indirect, incidental, special, consequential,
            or punitive damages resulting from your use of or inability to use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">9. Service Availability</h2>
          <p className="mt-3">
            We strive to keep the Service available at all times but do not guarantee uninterrupted access.
            We reserve the right to modify, suspend, or discontinue the Service at any time without prior notice.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">10. Fees and Payments</h2>
          <p className="mt-3">
            The Service is currently provided free of charge. We reserve the right to introduce paid
            features or subscription plans in the future. Any such changes will be communicated in advance,
            and your continued use of paid features will constitute acceptance of the applicable fees.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">11. Termination</h2>
          <p className="mt-3">
            We reserve the right to suspend or terminate your access to the Service at our discretion,
            without notice, for conduct that we believe violates these Terms or is harmful to other users,
            us, or third parties. You may also delete your account at any time by contacting us.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">12. Changes to Terms</h2>
          <p className="mt-3">
            We may update these Terms from time to time. We will notify you of material changes by
            posting the updated Terms on the Service and updating the "Last updated" date. Your continued
            use of the Service after changes are posted constitutes your acceptance of the revised Terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">13. Governing Law</h2>
          <p className="mt-3">
            These Terms shall be governed by and construed in accordance with the laws of the United States,
            without regard to its conflict of law provisions.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-primary">14. Contact Us</h2>
          <p className="mt-3">
            If you have any questions about these Terms of Service, please contact us at{' '}
            <a href="mailto:airyanchow@gmail.com" className="text-china-red hover:underline">
              airyanchow@gmail.com
            </a>.
          </p>
        </section>
      </div>
    </div>
  );
}
