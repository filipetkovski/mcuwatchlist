import type { Title } from "@/lib/types";

export function TitleListJsonLd({ name, titles }: { name: string; titles: Title[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: titles.length,
    itemListElement: titles.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": t.type === "movie" ? "Movie" : "TVSeries",
        name: t.title,
        datePublished: t.release_date,
      },
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
