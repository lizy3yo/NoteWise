// Privacy Policy Page – Tailored for NoteWise
// Reflects actual data flows and features in NoteWise platform

// styles are now included via student.css imported in the layout

export const metadata = {
  title: 'Privacy Policy | NoteWise'
};

export default function PrivacyPolicyPage() {
  const effectiveDate = 'November 25, 2024';
  return (
    <div className="privacy-policy-container">
      <main className="privacy-content">
        <header className="privacy-header">
          <h1 className="privacy-title">Privacy Policy</h1>
          <p className="effective-date">Effective Date: {effectiveDate}</p>
        </header>

        <nav aria-label="Table of contents" className="toc-container">
          <h2 className="toc-title">Table of Contents</h2>
          <ol className="toc-list">
            <li className="toc-item"><a href="#overview" className="toc-link">1. Overview</a></li>
            <li className="toc-item"><a href="#data-we-collect" className="toc-link">2. Data We Collect</a></li>
            <li className="toc-item"><a href="#how-we-use" className="toc-link">3. How We Use Your Data</a></li>
            <li className="toc-item"><a href="#legal-bases" className="toc-link">4. Legal Bases (If Applicable)</a></li>
            <li className="toc-item"><a href="#cookies" className="toc-link">5. Cookies & Tokens</a></li>
            <li className="toc-item"><a href="#sharing" className="toc-link">6. Data Sharing & Disclosure</a></li>
            <li className="toc-item"><a href="#retention" className="toc-link">7. Data Retention</a></li>
            <li className="toc-item"><a href="#security" className="toc-link">8. Security Measures</a></li>
            <li className="toc-item"><a href="#your-rights" className="toc-link">9. Your Rights & Choices</a></li>
            <li className="toc-item"><a href="#children" className="toc-link">10. Students & Younger Users</a></li>
            <li className="toc-item"><a href="#changes" className="toc-link">11. Changes to This Policy</a></li>
            <li className="toc-item"><a href="#contact" className="toc-link">12. Contact</a></li>
          </ol>
        </nav>

        <section id="overview" className="privacy-section">
          <h2 className="section-title">1. Overview</h2>
          <p className="privacy-paragraph">NoteWise is an AI-powered educational platform that helps students create, manage, and study learning materials including flashcards and AI-generated summaries. This Privacy Policy explains:</p>
          <ul className="privacy-list">
            <li>What information we collect from you</li>
            <li>How we use your personal data</li>
            <li>Your rights and choices regarding your data</li>
            <li>How we protect your information</li>
            <li>When and how we may share data</li>
          </ul>
          <p className="privacy-paragraph">By using the platform, you agree to this policy.</p>
        </section>

        <section id="data-we-collect" className="privacy-section">
          <h2 className="section-title">2. Data We Collect</h2>
          <h3 className="subsection-title">2.1 Account Information</h3>
          <ul className="privacy-list">
            <li>First & Last Name</li>
            <li>Email Address</li>
            <li>Profile Picture (uploaded to Cloudinary, a third-party image hosting service)</li>
            <li>Hashed Password (we never store plain text passwords)</li>
          </ul>
          <h3 className="subsection-title">2.2 Learning Content & Activity</h3>
          <ul className="privacy-list">
            <li><strong>Flashcards:</strong> Questions, answers, optional images, tags, and study statistics</li>
            <li><strong>AI-Generated Summaries:</strong> Summaries created from your uploaded documents (PDF, Word, text files)</li>
            <li><strong>Folders:</strong> Titles, descriptions, and organization settings</li>
            <li><strong>Uploaded Files:</strong> Documents you upload for AI summarization (processed and not permanently stored)</li>
            <li><strong>Study Performance:</strong> Progress tracking, review counts, correct/incorrect statistics, study streaks</li>
            <li><strong>Achievements:</strong> Earned badges and milestones based on your study activity</li>
            <li><strong>Favorites:</strong> Items you mark as favorites for quick access</li>
            <li><strong>Sharing Settings:</strong> Access permissions for shared content (public, link-based, or private)</li>
          </ul>
          <h3 className="subsection-title">2.3 Authentication & Session</h3>
          <ul className="privacy-list">
            <li>JWT access tokens (stored in httpOnly cookies)</li>
            <li>Refresh tokens (stored securely in the database; httpOnly cookie in browser)</li>
            <li>System logs for login, registration, token lifecycle (non-sensitive metadata)</li>
          </ul>
          <h3 className="subsection-title">2.4 AI Chatbot Interactions</h3>
          <ul className="privacy-list">
            <li><strong>Chat Messages:</strong> Your conversations with the NoteWise AI assistant</li>
            <li><strong>Chat Sessions:</strong> Saved chat histories (if you choose to save them)</li>
            <li><strong>File Uploads:</strong> Documents uploaded to the chatbot for analysis or summarization</li>
            <li><strong>AI Processing:</strong> Your content is processed by OpenAI&apos;s API to generate responses and summaries</li>
          </ul>
          <h3 className="subsection-title">2.5 Notifications & Preferences</h3>
          <ul className="privacy-list">
            <li>Notification preferences (study reminders, progress updates)</li>
            <li>Activity history and study session logs</li>
          </ul>
          <h3 className="subsection-title">2.6 Automatically Collected Data</h3>
          <p className="privacy-paragraph">Standard server logs may include IP addresses, browser type, and access times for diagnostic and security purposes. We do not use third-party analytics or tracking cookies for advertising.</p>
        </section>

        <section id="how-we-use" className="privacy-section">
          <h2 className="section-title">3. How We Use Your Data</h2>
          <p className="privacy-paragraph">We use your information for the following purposes:</p>
          <ul className="privacy-list">
            <li><strong>Account Management:</strong> Account creation, authentication, and profile management</li>
            <li><strong>Content Delivery:</strong> Creating, organizing, and displaying your study materials (flashcards and summaries)</li>
            <li><strong>AI Features:</strong> Processing your uploaded documents and chat messages through OpenAI&apos;s API to generate summaries, flashcards, and chatbot responses</li>
            <li><strong>Learning Enhancement:</strong> Spaced repetition scheduling, progress tracking, achievement tracking, and study streak monitoring</li>
            <li><strong>Notifications:</strong> Sending study reminders and progress updates based on your preferences</li>
            <li><strong>Image Hosting:</strong> Storing profile pictures and flashcard images via Cloudinary</li>
            <li><strong>Security:</strong> Secure session management via JWT access and refresh tokens</li>
            <li><strong>Platform Improvement:</strong> Analyzing usage patterns to improve features and user experience</li>
          </ul>
        </section>

        <section id="legal-bases" className="privacy-section">
          <h2 className="section-title">4. Legal Bases (If Applicable)</h2>
          <p className="privacy-paragraph">If operating in regions that require it (e.g., EU/EEA), our processing is based on:</p>
          <ul className="privacy-list">
            <li><strong>Contract Performance:</strong> Providing platform functionality and services you&apos;ve requested</li>
            <li><strong>Legitimate Interests:</strong> Security improvements, fraud prevention, and service optimization</li>
            <li><strong>Consent:</strong> Where explicitly requested for optional features (future implementations)</li>
            <li><strong>Legal Compliance:</strong> Meeting regulatory requirements and responding to legal requests</li>
          </ul>
        </section>

        <section id="cookies" className="privacy-section">
          <h2 className="section-title">5. Cookies & Tokens</h2>
          <ul className="privacy-list">
            <li><strong>Access Token:</strong> Short-lived, httpOnly, used for API authentication.</li>
            <li><strong>Refresh Token:</strong> Longer-lived, stored both as an httpOnly cookie and in the database for rotation and revocation.</li>
            <li><strong>No marketing / tracking cookies</strong> are used at this time.</li>
            <li>Cookies are set with <span className="code-inline">sameSite=&quot;strict&quot;</span> and <span className="code-inline">secure</span> in production.</li>
          </ul>
        </section>

        <section id="sharing" className="privacy-section">
          <h2 className="section-title">6. Data Sharing & Disclosure</h2>
          <p className="privacy-paragraph">We do not sell your personal data. Data may be shared only in these specific circumstances:</p>
          <ul className="privacy-list">
            <li><strong>Third-Party Service Providers:</strong>
              <ul className="privacy-list" style={{marginTop: '0.5rem', marginLeft: '1rem'}}>
                <li><strong>OpenAI:</strong> Your uploaded documents, chat messages, and content are processed through OpenAI&apos;s API to generate summaries, flashcards, and AI responses. OpenAI&apos;s data usage is governed by their privacy policy.</li>
                <li><strong>Cloudinary:</strong> Profile pictures and flashcard images are stored on Cloudinary&apos;s servers. Cloudinary&apos;s data handling is governed by their privacy policy.</li>
              </ul>
            </li>
            <li><strong>Legal Requirements:</strong> When required by law, court order, or valid legal process</li>
            <li><strong>Platform Security:</strong> When necessary to protect platform integrity, prevent fraud, or ensure user safety</li>
            <li><strong>User-Initiated Sharing:</strong> When you explicitly share flashcards, summaries, or folders using our sharing features:
              <ul className="privacy-list" style={{marginTop: '0.5rem', marginLeft: '1rem'}}>
                <li>Public access mode (visible to anyone with the link)</li>
                <li>Link-based sharing (accessible to anyone with the specific link)</li>
                <li>Private sharing (only you can access)</li>
              </ul>
            </li>
          </ul>
          <p className="privacy-paragraph"><strong>Important:</strong> When you share content publicly or via link, only the study materials you choose to share are exposed (e.g., flashcard questions/answers, summary content), not your password, email, or other private profile information.</p>
          <p className="privacy-paragraph"><strong>AI Processing Notice:</strong> Content you upload or send to our AI features is transmitted to OpenAI for processing. We recommend not uploading sensitive personal information to AI features.</p>
        </section>

        <section id="retention" className="privacy-section">
          <h2 className="section-title">7. Data Retention</h2>
          <p className="privacy-paragraph">We retain your data according to these policies:</p>
          <ul className="privacy-list">
            <li><strong>Active Accounts:</strong> Your account, profile, and study content persist while your account remains active</li>
            <li><strong>Study Materials:</strong> Flashcards, summaries, and folders are retained indefinitely while your account is active</li>
            <li><strong>Chat History:</strong> Saved chat sessions are retained until you delete them or close your account</li>
            <li><strong>Uploaded Files:</strong> Documents uploaded for AI processing are temporarily stored during processing and then deleted. We do not permanently store your uploaded files.</li>
            <li><strong>Session Tokens:</strong> JWT refresh tokens are retained until expiration or manual revocation (logout, password change)</li>
            <li><strong>Activity History:</strong> Study history and achievement data are retained for progress tracking purposes</li>
            <li><strong>Images:</strong> Profile pictures and flashcard images stored on Cloudinary remain until you delete them or close your account</li>
            <li><strong>System Logs:</strong> Server logs are retained for a limited period (typically 30-90 days) for security and debugging purposes</li>
            <li><strong>Account Deletion:</strong> Upon account deletion, your personal data and study content are permanently removed within 30 days, except where retention is required by law</li>
            <li><strong>Inactive Accounts:</strong> Accounts inactive for more than 2 years may be subject to data archival or deletion with prior notice</li>
          </ul>
        </section>

        <section id="security" className="privacy-section">
          <h2 className="section-title">8. Security Measures</h2>
          <p className="privacy-paragraph">We implement multiple layers of security to protect your data:</p>
          <ul className="privacy-list">
            <li><strong>Password Security:</strong> Password hashing with bcrypt (never stored in plain text)</li>
            <li><strong>Access Control:</strong> Role-based authorization and validation middleware</li>
            <li><strong>Token Management:</strong> JWT access & refresh token separation with httpOnly cookies</li>
            <li><strong>Cookie Security:</strong> Strict cookie attributes (sameSite, secure in production)</li>
            <li><strong>Input Validation:</strong> Comprehensive validation for email/password and schema constraints</li>
            <li><strong>Privilege Control:</strong> Least-privilege user roles (student/teacher/admin with whitelist)</li>
            <li><strong>Regular Updates:</strong> Continuous security monitoring and system updates</li>
          </ul>
          <p className="privacy-paragraph"><strong>Disclaimer:</strong> No system can be 100% secure; we continuously aim to improve defenses and follow industry best practices.</p>
        </section>

        <section id="your-rights" className="privacy-section">
          <h2 className="section-title">9. Your Rights & Choices</h2>
          <p className="privacy-paragraph">You have the following rights regarding your personal data (subject to region-specific laws):</p>
          <ul className="privacy-list">
            <li><strong>Access & Update:</strong> Access and update your profile information (name, email, profile picture) through your Profile page</li>
            <li><strong>Data Deletion:</strong> Delete your account and all associated data through your account settings or by contacting us</li>
            <li><strong>Content Management:</strong> Create, edit, or delete your flashcards, summaries, and folders at any time</li>
            <li><strong>Chat History:</strong> Delete individual chat sessions or clear all chat history through the chatbot interface</li>
            <li><strong>Privacy Control:</strong> Control who can access your content by setting items to private, public, or link-based sharing</li>
            <li><strong>Notification Preferences:</strong> Manage your notification settings for study reminders and progress updates</li>
            <li><strong>Session Management:</strong> Log out to revoke active sessions and invalidate refresh tokens</li>
            <li><strong>Image Management:</strong> Update or remove your profile picture and flashcard images at any time</li>
            <li><strong>Data Export:</strong> Request a copy of your data in a portable format by contacting us</li>
          </ul>
          <p className="privacy-paragraph">To exercise any of these rights, please contact us using the information in the Contact section.</p>
        </section>

        <section id="children" className="privacy-section">
          <h2 className="section-title">10. Students & Younger Users</h2>
          <p className="privacy-paragraph">The platform is designed for educational use. For younger users, please note:</p>
          <ul className="privacy-list">
            <li><strong>Educational Purpose:</strong> Platform designed specifically for learning and academic improvement</li>
            <li><strong>Guardian Responsibility:</strong> If local regulations require guardian consent for minors, institutions or guardians are responsible for ensuring compliance</li>
            <li><strong>Minimal Data Collection:</strong> We do not knowingly collect more data than necessary for learning functionality</li>
            <li><strong>Age-Appropriate Features:</strong> All features are designed with educational safety in mind</li>
            <li><strong>Institutional Use:</strong> Schools and educational institutions should ensure proper consent procedures are followed</li>
          </ul>
          <p className="privacy-paragraph">If you believe we have inadvertently collected data from a minor without proper consent, please contact us immediately.</p>
        </section>

        <section id="changes" className="privacy-section">
          <h2 className="section-title">11. Changes to This Policy</h2>
          <p className="privacy-paragraph">Material updates will be posted here with a revised effective date. Continued use after changes constitutes acceptance.</p>
        </section>

        <section id="contact" className="privacy-section">
          <h2 className="section-title">12. Contact</h2>
          <p className="privacy-paragraph">For privacy-related questions, requests, or concerns, you can reach us through:</p>
          <ul className="privacy-list">
            <li><strong>Email:</strong> <a className="privacy-link" href="mailto:not3wis3@gmail.com">not3wis3@gmail.com</a></li>
            <li><strong>Subject Line:</strong> Please include &quot;Privacy Request&quot; or &quot;Privacy Policy&quot; in your email subject for faster processing</li>
            <li><strong>Response Time:</strong> We aim to respond to privacy inquiries within 5-7 business days</li>
            <li><strong>Required Information:</strong> Please include your email address associated with your NoteWise account for verification purposes</li>
          </ul>
          <p className="privacy-paragraph">For general support inquiries unrelated to privacy, please use the Help & Support section in your account.</p>
        </section>

        <footer className="privacy-footer">
          <p>Last updated: {effectiveDate}. This document is provided for transparency and does not constitute legal advice.</p>
        </footer>
      </main>
    </div>
  );
}