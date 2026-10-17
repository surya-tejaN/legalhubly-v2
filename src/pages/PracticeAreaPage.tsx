import { useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
import FindLawyers from "@/pages/client/FindLawyers";
import { PRACTICE_AREAS } from "@/lib/practiceAreas";
import { practiceAreaToSlug, setPageMeta, slugToPracticeArea } from "@/lib/pageMeta";

/**
 * SEO landing for /chicago/:slug — keeps the URL (no redirect) and shows Find Lawyers UI.
 */
export default function PracticeAreaPage() {
  const { slug = "" } = useParams();
  const practiceArea = slugToPracticeArea(slug, PRACTICE_AREAS);

  useEffect(() => {
    if (!practiceArea) return;
    const path = `/chicago/${practiceAreaToSlug(practiceArea)}`;
    const title = `Chicago ${practiceArea} Lawyers | Legalhubly`;
    const description =
      `Find verified Chicago ${practiceArea} attorneys on Legalhubly. Browse profiles, ratings, and websites. AI match · free to start.`;
    setPageMeta({
      title,
      description,
      path,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: title,
        description,
        url: `https://www.legalhubly.com${path}`,
        isPartOf: { "@id": "https://www.legalhubly.com/#website" },
        about: {
          "@type": "LegalService",
          name: `${practiceArea} in Chicago`,
          areaServed: {
            "@type": "City",
            name: "Chicago",
            containedInPlace: { "@type": "State", name: "Illinois" },
          },
        },
      },
    });
  }, [practiceArea]);

  if (!practiceArea) {
    return <Navigate to="/client/find-lawyers" replace />;
  }

  return <FindLawyers seoPracticeArea={practiceArea} />;
}
