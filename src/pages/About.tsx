import { Link } from "react-router-dom";
import Logo from "@/components/Logo";

export default function About() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container max-w-3xl py-16 space-y-8">
        <Link to="/" className="inline-flex">
          <Logo withWordmark wordmarkClassName="text-xl font-bold" />
        </Link>
        <div>
          <h1 className="font-serif text-3xl text-foreground">About Legalhubly</h1>
          <p className="text-sm text-muted-foreground mt-2">
            AI-powered legal marketplace for Chicago
          </p>
        </div>
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
      </div>
    </main>
  );
}
