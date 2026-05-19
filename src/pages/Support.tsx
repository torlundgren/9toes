import { Link } from "react-router-dom";

export default function Support() {
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
            <Link to="/privacy">Privacy</Link>
            <Link to="/play" className="play-cta">
              Play →
            </Link>
          </div>
        </nav>
      </div>

      <article className="doc">
        <div className="doc-eyebrow">§ Support</div>
        <h1>
          Help &amp; <em>contact.</em>
        </h1>
        <div className="doc-date">9Toes for iOS &amp; Web</div>

        <p>
          9Toes is a small game made by a small team. If you&apos;ve hit a bug,
          need a hand, or just want to tell us about a particularly cruel
          doubling cube moment, we&apos;d love to hear from you.
        </p>

        <h2>Get in touch</h2>
        <p>
          Email <a href="mailto:hello@9toes.app">hello@9toes.app</a>. We
          generally reply within a couple of business days.
        </p>

        <h2>How to play</h2>
        <p>
          <strong>The objective.</strong> Win the meta-board — that is, the
          large 3×3 grid composed of nine smaller boards. In <em>Classic</em>{" "}
          mode, that means winning three local boards in a row. In{" "}
          <em>Tic-Tac-Ku</em> mode, it means winning five local boards
          anywhere.
        </p>
        <p>
          <strong>The catch.</strong> The cell you play on dictates which local
          board your opponent must play in next. Played in the upper-right cell
          of your local board? Your opponent must play in the upper-right local
          board. If that board is already finished, they get to choose.
        </p>
        <p>
          <strong>The cube.</strong> At any point on your turn, if you&apos;re
          confident you&apos;re winning, you can offer to double. Your opponent
          either takes the cube and plays on for double the points, or passes
          and concedes the game at its current value. After a double is taken,
          only the player who took it can double again — and the stakes keep
          climbing.
        </p>

        <h2>Frequently asked</h2>
        <p>
          <strong>Does 9Toes work offline?</strong> Yes. The iOS app runs
          fully offline. The web version needs to load once and then works
          offline if your browser caches it.
        </p>
        <p>
          <strong>Is there multiplayer?</strong> Pass-and-play on a single
          device is supported today. Online multiplayer is on the long list.
        </p>
        <p>
          <strong>How do I report a bug?</strong> Email us with what device
          you&apos;re using and what you saw. A screenshot of the board state
          is a huge help.
        </p>
        <p>
          <strong>Where do my stats live?</strong> On your device only.
          Uninstalling clears them. See our{" "}
          <Link to="/privacy">privacy policy</Link> for details.
        </p>

        <p style={{ marginTop: 48 }}>
          <Link to="/">← Back to 9toes</Link>
        </p>
      </article>
    </div>
  );
}
