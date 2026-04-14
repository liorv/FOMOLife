export const metadata = {
  title: 'Terms of Service',
}

export default function TermsPage() {
  return (
    <div style={{ padding: 24 }}>
      <h1>Terms of Service</h1>
      <p>
        These Terms of Service govern your use of the application. By using the
        service you agree to the collection and use of information as described
        in the Privacy Policy. Use the app responsibly and do not attempt to
        access other users' data without permission.
      </p>
      <p>
        When configuring Google OAuth, use this page URL as your Terms of
        Service link in the Google Cloud Console. Replace the deployed domain
        below when your app is live (for example: https://yourdomain.com/terms).
      </p>
    </div>
  );
}
