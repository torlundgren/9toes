import { Link } from "react-router-dom";

export default function Privacy() {
  return (
    <div className="site">
      <div className="site-shell">
        <nav className="site-nav">
          <Link to="/" className="wordmark" aria-label="9Toes home">
            <span className="wordmark-num">9</span>
            <span>toes</span>
            <span className="wordmark-dot" aria-hidden />
          </Link>
          <div className="nav-links">
            <Link to="/support">Support</Link>
            <Link to="/play" className="play-cta">
              Play →
            </Link>
          </div>
        </nav>
      </div>

      <article className="doc">
        <div className="doc-eyebrow">§ Privacy</div>
        <h1>
          Privacy <em>policy.</em>
        </h1>
        <div className="doc-date">Effective May 19, 2026</div>

        <p>
          9Toes is a single-player and pass-and-play strategy game. We&apos;ve
          designed it to need as little of your information as possible.
          We&apos;ll keep this page short because there isn&apos;t much to say.
        </p>

        <h2>What we collect</h2>
        <p>
          <strong>Nothing personal.</strong> 9Toes does not collect, transmit,
          or share personal data. There are no user accounts, no logins, and no
          analytics SDKs running in the app.
        </p>

        <h2>What we store on your device</h2>
        <p>
          The app stores your preferences and game statistics locally on your
          device, using browser <em>localStorage</em> on the web and the
          equivalent <em>UserDefaults</em> store on iOS. This data never leaves
          your device unless you explicitly copy it elsewhere (for example, via
          iCloud backup, which is governed by Apple&apos;s privacy policy).
        </p>
        <p>Specifically, we store:</p>
        <ul>
          <li>Your theme and board preferences.</li>
          <li>
            Your win/loss/draw counts against the AI, and total points earned.
          </li>
        </ul>
        <p>
          You can clear this data at any time by clearing your browser&apos;s
          site data, or by uninstalling the iOS app.
        </p>

        <h2>Children</h2>
        <p>
          9Toes is suitable for all ages and is categorized as a family game.
          Because we collect no personal information, the app is compliant with
          children&apos;s privacy regulations (including COPPA and GDPR-K) by
          design.
        </p>

        <h2>Third parties</h2>
        <p>
          We do not share data with third parties, because there is no data to
          share.
        </p>

        <h2>Changes</h2>
        <p>
          If we ever change this policy, we&apos;ll update the date above and
          note the change in our release notes. Material changes will be
          announced on the App Store version history.
        </p>

        <h2>Contact</h2>
        <p>
          Questions? Write to{" "}
          <a href="mailto:hello@9toes.app">hello@9toes.app</a>.
        </p>

        <p style={{ marginTop: 48 }}>
          <Link to="/">← Back to 9toes</Link>
        </p>
      </article>
    </div>
  );
}
