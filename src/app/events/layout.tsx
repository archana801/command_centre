import "./events.css";
import Link from "next/link";

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="events-root">
      <div className="topbar">
        <div className="logo">
          <img src="/kmak-wordmark.png" alt="KMAK Fitness" className="logo-mark" />
          <span className="logo-os">OS</span>
          <small>Events</small>
        </div>
        <div className="site-sel" title="Back to KMAK OS">
          <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>
            ← KMAK OS
          </Link>
        </div>
      </div>
      <div className="shell">
        <nav className="side" aria-label="Events sections">
          <Link className="sb" href="/events">
            <span className="dot" style={{ background: "var(--brand)" }} />
            Overview
          </Link>
          <Link className="sb" href="/events/new">
            <span className="dot" style={{ background: "#64d8cb" }} />
            New event
          </Link>
          <Link className="sb" href="/events/activity">
            <span className="dot" style={{ background: "var(--blue)" }} />
            Activity log
          </Link>
        </nav>
        <main className="main">{children}</main>
      </div>
    </div>
  );
}
