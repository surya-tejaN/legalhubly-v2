import { Link } from "react-router-dom";
import PublicPage from "@/components/PublicPage";

export default function About() {
  return (
    <PublicPage title="About Legalhubly" subtitle="AI-powered legal marketplace for Chicago">
        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground">Legalhubly</strong> helps people find the right
            Chicago lawyer faster. Describe your legal issue in plain language, get matched to the
            right practice area, then connect with verified attorneys — view profiles, compare
            ratings, visit their website, or message them.
          </p>
          <p>
            Simple, fast, and free to start. We currently focus on Chicago, Illinois so every match
            is local and relevant.
          </p>
          <p>
            Follow updates on{" "}
            <a
              href="https://www.linkedin.com/company/legalhubly"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              LinkedIn
            </a>
            .
          </p>
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              <span className="text-foreground font-medium">Describe your issue</span> — no jargon
              needed
            </li>
            <li>
              <span className="text-foreground font-medium">AI matches you instantly</span> — practice
              area + top lawyers
            </li>
            <li>
              <span className="text-foreground font-medium">Connect with your lawyer</span> —
              profiles, ratings, website, book
            </li>
          </ol>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/client/find-lawyers"
            className="text-sm font-medium text-accent hover:underline"
          >
            Find a Chicago lawyer
          </Link>
          <a
            href="https://www.linkedin.com/company/legalhubly"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:underline"
          >
            LinkedIn
          </a>
          <Link to="/contact" className="text-sm text-muted-foreground hover:underline">
            Contact
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:underline">
            Home
          </Link>
        </div>
    </PublicPage>
  );
}
