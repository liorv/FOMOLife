export const metadata = {
  title: 'Privacy Policy',
}

export default function PrivacyPage() {
  return (
    <div style={{ padding: 24 }}>
      <h1>Privacy Policy</h1>
      <p>
        This is a short privacy notice for the application. We collect only the
        minimal data required to provide the service (for example, name and
        email when you sign in with Google). We do not sell personal data. Data
        is used to authenticate you and store your app data. For questions email
        the app owner.
      </p>
      <p>
        When configuring Google OAuth, use this page URL as your Privacy Policy
        link in the Google Cloud Console. Replace the deployed domain below when
        your app is live (for example: https://yourdomain.com/privacy).
      </p>
    </div>
  );
}
