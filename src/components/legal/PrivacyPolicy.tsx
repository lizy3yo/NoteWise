"use client";

export default function PrivacyPolicy() {
  return (
    <div className="prose prose-gray dark:prose-invert max-w-none">
      <div className="space-y-6 text-gray-700 dark:text-gray-300 leading-relaxed">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Last updated: {new Date().toLocaleDateString()}</p>
          <p className="text-lg">
            At NoteWise, we're committed to protecting your privacy and being transparent about how we handle your data. 
            This Privacy Policy explains how we collect, use, and safeguard your information.
          </p>
        </div>

        <section>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">1. Information We Collect</h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white">Account Information</h4>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Name and email address</li>
                <li>Account credentials (encrypted passwords)</li>
                <li>Profile preferences and settings</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white">Study Materials</h4>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Documents you upload (PDF, DOCX, TXT files)</li>
                <li>Text content extracted from your files</li>
                <li>AI-generated summaries and flashcards</li>
                <li>Your study progress and interaction data</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white">Usage Information</h4>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>How you interact with our platform</li>
                <li>Features you use and time spent studying</li>
                <li>Device information and browser type</li>
                <li>IP address and general location data</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">2. How We Use Your Information</h3>
          
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white">Core Services</h4>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Process your study materials with AI to generate summaries</li>
                <li>Create personalized flashcards from your content</li>
                <li>Track your learning progress and provide insights</li>
                <li>Maintain your account and provide customer support</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white">Platform Improvement</h4>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Improve our AI algorithms and accuracy</li>
                <li>Develop new features and study tools</li>
                <li>Analyze usage patterns to enhance user experience</li>
                <li>Ensure platform security and prevent abuse</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">3. AI Processing and Your Content</h3>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
            <p className="text-blue-800 dark:text-blue-300 font-medium">Important: How We Handle Your Study Materials</p>
          </div>
          <div className="space-y-3">
            <p><strong>Content Processing:</strong> We use AI to analyze your uploaded materials to provide summaries and generate flashcards.</p>
            <p><strong>Data Security:</strong> Your content is processed securely and is not used to train external AI models.</p>
            <p><strong>Retention:</strong> We retain your materials only as long as necessary to provide our services or as required by law.</p>
            <p><strong>No Sharing:</strong> We don't share your study materials or generated content with third parties for their commercial purposes.</p>
          </div>
        </section>

        <section>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">4. Information Sharing and Disclosure</h3>
          <p>We may share your information only in these limited circumstances:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>Service Providers:</strong> Trusted partners who help us operate our platform (cloud storage, AI processing)</li>
            <li><strong>Legal Requirements:</strong> When required by law or to protect our rights and users' safety</li>
            <li><strong>Business Transfers:</strong> In the event of a merger or acquisition (with continued privacy protection)</li>
            <li><strong>With Your Consent:</strong> Any other sharing will require your explicit permission</li>
          </ul>
        </section>

        <section>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">5. Data Security</h3>
          <div className="space-y-3">
            <p><strong>Encryption:</strong> We use industry-standard encryption for data in transit and at rest.</p>
            <p><strong>Access Controls:</strong> Strict access controls limit who can view your information.</p>
            <p><strong>Regular Audits:</strong> We regularly review and update our security practices.</p>
            <p><strong>Incident Response:</strong> We have procedures in place to respond to any security incidents.</p>
          </div>
        </section>

        <section>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">6. Your Privacy Rights</h3>
          <div className="space-y-3">
            <p><strong>Access:</strong> You can view and download your account information and study materials.</p>
            <p><strong>Correction:</strong> You can update or correct your personal information at any time.</p>
            <p><strong>Deletion:</strong> You can delete your account and associated data (some data may be retained for legal purposes).</p>
            <p><strong>Portability:</strong> You can export your study materials and generated content.</p>
            <p><strong>Opt-out:</strong> You can opt out of non-essential communications.</p>
          </div>
        </section>

        <section>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">7. Cookies and Tracking</h3>
          <div className="space-y-3">
            <p><strong>Essential Cookies:</strong> Required for basic platform functionality and security.</p>
            <p><strong>Analytics:</strong> Help us understand how users interact with our platform (anonymized data).</p>
            <p><strong>Preferences:</strong> Remember your settings and preferences for a better experience.</p>
            <p>You can control cookie settings through your browser, though this may affect platform functionality.</p>
          </div>
        </section>

        <section>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">8. International Data Transfers</h3>
          <p>
            Your information may be processed in countries other than your own. We ensure appropriate safeguards 
            are in place to protect your data according to this Privacy Policy and applicable laws.
          </p>
        </section>

        <section>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">9. Children's Privacy</h3>
          <p>
            NoteWise is designed for users 13 years and older. We don't knowingly collect personal information 
            from children under 13. If we become aware of such collection, we'll delete the information promptly.
          </p>
        </section>

        <section>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">10. Data Retention</h3>
          <div className="space-y-3">
            <p><strong>Account Data:</strong> Retained while your account is active and for a reasonable period after deletion.</p>
            <p><strong>Study Materials:</strong> Retained as long as you use our services or as required by law.</p>
            <p><strong>Usage Data:</strong> Typically retained for up to 2 years for analytics and improvement purposes.</p>
          </div>
        </section>

        <section>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">11. Changes to This Policy</h3>
          <p>
            We may update this Privacy Policy periodically. We'll notify you of significant changes via email 
            or platform notifications. We encourage you to review this policy regularly.
          </p>
        </section>

        <section>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">12. Contact Us</h3>
          <p>
            If you have questions about this Privacy Policy or how we handle your data, please contact us:
          </p>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mt-2">
            <p><strong>Privacy Officer:</strong> privacy@notewise.com</p>
            <p><strong>General Support:</strong> support@notewise.com</p>
            <p><strong>Data Protection Requests:</strong> data-protection@notewise.com</p>
          </div>
        </section>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-8">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            By using NoteWise, you acknowledge that you have read and understood this Privacy Policy and 
            consent to the collection and use of your information as described herein.
          </p>
        </div>
      </div>
    </div>
  );
}