import { Link } from "react-router-dom";
import DoublingCube from "../components/DoublingCube";
import MiniBoard from "../components/MiniBoard";
import { sampleGame } from "../components/sampleGame";

export default function Landing() {
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
            <a href="#mechanic">Mechanic</a>
            <a href="#variants">Variants</a>
            <Link to="/support">Support</Link>
            <Link to="/play" className="play-cta">
              Play →
            </Link>
          </div>
        </nav>
      </div>

      <header className="site-shell">
        <section className="hero">
          <div className="hero-text">
            <div className="hero-no">No. 01 — A thinker&apos;s game</div>
            <h1>
              Nine boards.<br />
              <em>One meta.</em><br />
              Raised stakes.
            </h1>
            <p className="lead">
              9Toes is ultimate tic-tac-toe with a doubling cube borrowed from
              backgammon. Pick where your opponent plays next, then double the
              stakes when you smell blood.
            </p>
            <div className="hero-ctas">
              <Link to="/play" className="btn btn-primary">
                Play in browser <span className="arrow">→</span>
              </Link>
              <span className="appstore-badge" aria-label="Coming soon to the App Store">
                <span>
                  <span className="badge-eyebrow">Available on</span>
                  <span className="badge-text">
                    App Store <span className="badge-status">Soon</span>
                  </span>
                </span>
              </span>
            </div>
          </div>

          <div className="hero-visual" aria-hidden="false">
            <div className="board-stage">
              <MiniBoard boards={sampleGame} activeBoard={5} />
              <div className="cube-float">
                <DoublingCube />
              </div>
            </div>
          </div>
        </section>
      </header>

      {/* Strap line */}
      <div className="strap" aria-hidden>
        <div className="strap-track">
          <span>
            <span>Pick your board</span>
            <span className="star">✦</span>
            <span>Send them theirs</span>
            <span className="star">✦</span>
            <span>Win the meta</span>
            <span className="star">✦</span>
            <span>Double the stakes</span>
            <span className="star">✦</span>
            <span>Pick your board</span>
            <span className="star">✦</span>
            <span>Send them theirs</span>
            <span className="star">✦</span>
            <span>Win the meta</span>
            <span className="star">✦</span>
            <span>Double the stakes</span>
            <span className="star">✦</span>
          </span>
        </div>
      </div>

      <main className="site-shell">
        {/* Features */}
        <section className="section">
          <header className="section-head">
            <div>
              <div className="section-no">§ 02 / Features</div>
            </div>
            <div>
              <h2>
                Small board,<br />
                <em>large consequences.</em>
              </h2>
            </div>
          </header>
          <div className="features">
            <div className="feature">
              <span className="feature-num">01</span>
              <h3>Move dictates move</h3>
              <p>
                The cell you play sends your opponent to the matching board.
                Every move is half your turn and half theirs — plan three moves
                ahead or lose to someone who is.
              </p>
              <span className="feature-tag">Recursive · Tactical</span>
            </div>
            <div className="feature">
              <span className="feature-num">02</span>
              <h3>Double the stakes</h3>
              <p>
                When you&apos;re winning, offer the cube. Take it and you risk
                more; pass and you concede. A backgammon-borrowed mechanic that
                turns confidence into points.
              </p>
              <span className="feature-tag">Bluff · Pressure</span>
            </div>
            <div className="feature">
              <span className="feature-num">03</span>
              <h3>An opponent that talks</h3>
              <p>
                Three difficulty levels, from forgiving to ruthless — each with
                running commentary. The hard AI plays a known-good opening book
                and isn&apos;t shy about telling you why you blundered.
              </p>
              <span className="feature-tag">Easy · Medium · Hard</span>
            </div>
          </div>
        </section>

        {/* Cube explainer */}
        <section className="section" id="mechanic">
          <header className="section-head">
            <div>
              <div className="section-no">§ 03 / Mechanic</div>
            </div>
            <div>
              <h2>
                The cube.<br />
                <em>Click it.</em>
              </h2>
            </div>
          </header>
          <div className="cube-explainer">
            <div className="cube-explainer-text">
              <p>
                Each game starts at <strong>1×</strong>. When you think
                you&apos;re winning, offer to double. Your opponent either
                takes the cube — playing on for double points — or passes,
                handing you the game at its current value.
              </p>
              <p>
                Take a doubled cube and you own it: only you can double again.
                Now the stakes ratchet. <em>2, 4, 8, 16…</em> Games end fast
                when both players think they&apos;re right.
              </p>
              <div className="cube-list" aria-hidden>
                <span className="cube-pill active">1×</span>
                <span className="cube-pill">2×</span>
                <span className="cube-pill">4×</span>
                <span className="cube-pill">8×</span>
                <span className="cube-pill">16×</span>
                <span className="cube-pill">32×</span>
                <span className="cube-pill">64×</span>
              </div>
            </div>
            <div className="cube-explainer-stage">
              <div className="stage-grid" aria-hidden />
              <DoublingCube large />
              <span className="stage-hint">Tap to cycle</span>
            </div>
          </div>
        </section>

        {/* Variants */}
        <section className="section" id="variants">
          <header className="section-head">
            <div>
              <div className="section-no">§ 04 / Variants</div>
            </div>
            <div>
              <h2>
                Two ways<br />
                <em>to take the meta.</em>
              </h2>
            </div>
          </header>
          <div className="variants">
            <article className="variant">
              <span className="variant-tag">01</span>
              <h3>
                <em>Classic</em>
              </h3>
              <div className="variant-sub">Three-in-a-row</div>
              <p>
                Win a small board, claim it on the big one. Three boards in a
                row wins the game. The original ultimate tic-tac-toe — sharp,
                short, deadly.
              </p>
            </article>
            <article className="variant">
              <span className="variant-tag">02</span>
              <h3>
                Tic-Tac-<em>Ku</em>
              </h3>
              <div className="variant-sub">First to five</div>
              <p>
                Forget lines. The first player to win five of the nine local
                boards takes it. A slower burn that rewards positional play
                across the whole field.
              </p>
            </article>
          </div>
        </section>

        {/* Big CTA */}
        <section className="cta-block">
          <h2>
            Your <em>move.</em>
          </h2>
          <div className="cta-buttons">
            <Link to="/play" className="btn btn-primary">
              Play in browser <span className="arrow">→</span>
            </Link>
            <span className="appstore-badge" aria-label="Coming soon to the App Store">
              <span>
                <span className="badge-eyebrow">Available on</span>
                <span className="badge-text">
                  App Store <span className="badge-status">Soon</span>
                </span>
              </span>
            </span>
          </div>
        </section>
      </main>

      <footer className="site-shell">
        <div className="site-footer">
          <div className="footer-grid">
            <div>
              <Link to="/" className="wordmark" aria-label="9Toes home">
                <span className="wordmark-num">9</span>
                <span>toes</span>
                <span className="wordmark-dot" aria-hidden />
              </Link>
              <p
                style={{
                  marginTop: 16,
                  color: "var(--ink-soft)",
                  fontSize: 15,
                  maxWidth: 320,
                }}
              >
                A small game from Helmut Games. Built for people who think two
                moves ahead and then a third for luck.
              </p>
            </div>
            <div>
              <h4>Play</h4>
              <ul>
                <li>
                  <Link to="/play">In browser</Link>
                </li>
                <li>
                  <span style={{ color: "var(--ink-mute)" }}>
                    iOS — soon
                  </span>
                </li>
              </ul>
            </div>
            <div>
              <h4>Learn</h4>
              <ul>
                <li>
                  <a href="#mechanic">The cube</a>
                </li>
                <li>
                  <a href="#variants">Variants</a>
                </li>
              </ul>
            </div>
            <div>
              <h4>Etc.</h4>
              <ul>
                <li>
                  <Link to="/privacy">Privacy</Link>
                </li>
                <li>
                  <Link to="/support">Support</Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} Helmut Games</span>
            <span>Made with restraint and a doubling cube</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
