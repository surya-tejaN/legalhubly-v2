import { useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
import { PRACTICE_AREAS } from "@/lib/practiceAreas";
import { practiceAreaToSlug, setPageMeta, slugToPracticeArea } from "@/lib/pageMeta";

/**
 * SEO entry for /chicago/:slug — uses the existing Find Lawyers UI (same cards as before).
 */
export default function PracticeAreaPage() {
  const { slug = "" } = useParams();
  const practiceArea = slugToPracticeArea(slug, PRACTICE_AREAS);

  useEffect(() => {
    if (!practiceArea) return;
    const title = `Chicago ${practiceArea} Lawyers | Legalhubly`;
    const description =
      `Find verified Chicago ${practiceArea} attorneys on Legalhubly. Browse profiles, ratings, and websites. Free to start.`;
    setPageMeta({
      title,
      description,
      path: `/chicago/${practiceAreaToSlug(practiceArea)}`,
    });
  }, [practiceArea]);

  if (!practiceArea) {
    return <Navigate to="/client/find-lawyers" replace />;
  }

  // Same directory UI as before (avatar cards, Visit Website, Book, Profile)
  return (
    <Navigate
      to={`/client/find-lawyers?matched=${encodeURIComponent(practiceArea)}`}
      replace
    />
  );
}
