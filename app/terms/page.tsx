export const metadata = {
  title: 'Terms of Service',
}

export default function TermsPage() {
  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <h1>Terms of Service</h1>
      <p>
        These terms describe general rules for using this application. By using
        the service you agree to comply with applicable laws and not to misuse
        the service or attempt to access other users' accounts or data.
      </p>

      <p>
        The service is provided "as is" and may change over time. To the extent
        permitted by law, the application owner disclaims warranties and limits
        liability where allowed. This page is a brief, informative summary and
        not a substitute for legal advice.
      </p>

      <p>
        When configuring Google OAuth, provide this page URL as the Terms of
        Service link in the Google Cloud Console. Replace the domain with your
        production domain when the app is deployed (for example:
        https://yourdomain.com/terms).
      </p>
    </div>
  );
}
