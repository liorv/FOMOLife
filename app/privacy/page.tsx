export const metadata = {
  title: 'Privacy Policy',
}

export default function PrivacyPage() {
  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <h1>Privacy Policy</h1>
      <p>
        This site collects and processes only the personal information necessary
        to provide the service (for example: name and email address used to
        authenticate and identify your account). This information is used to
        operate, maintain, and provide the features of the application.
      </p>

      <p>
        We may use third-party services for hosting and analytics. These
        providers have their own privacy policies and are responsible for their
        own processing. We do not sell personal information to third parties.
      </p>

      <p>
        If you have questions about privacy practices, contact the application
        owner. When using Google OAuth, provide this page URL as the Privacy
        Policy link in the Google Cloud Console. Replace the domain with your
        production domain when the app is deployed (for example:
        https://yourdomain.com/privacy).
      </p>
    </div>
  );
}
