import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TitleListJsonLd } from "@/components/json-ld";
import { TitleExplorer } from "@/components/title-explorer";
import { getTitles, sortTitles } from "@/lib/titles";
import type { OrderType } from "@/lib/types";

export const revalidate = 3600;
export const dynamicParams = false;

const COPY: Record<OrderType, { heading: string; blurb: string; description: string }> = {
  story: {
    heading: "MCU story order",
    blurb: "Every title arranged by where it falls in the in-universe timeline.",
    description:
      "The complete Marvel Cinematic Universe watch list in story (chronological) order, with importance ratings, runtimes, and a progress tracker.",
  },
  release: {
    heading: "MCU release order",
    blurb: "Every title in the order it originally arrived, from Iron Man onward.",
    description:
      "The complete Marvel Cinematic Universe watch list in release order, with importance ratings, runtimes, and a progress tracker.",
  },
};

export function generateStaticParams() {
  return [{ order: "story" }, { order: "release" }];
}

export async function generateMetadata(props: PageProps<"/watch-order/[order]">): Promise<Metadata> {
  const { order } = await props.params;
  if (order !== "story" && order !== "release") return {};
  return {
    title: COPY[order].heading,
    description: COPY[order].description,
    alternates: { canonical: `/watch-order/${order}` },
  };
}

export default async function WatchOrderPage(props: PageProps<"/watch-order/[order]">) {
  const { order } = await props.params;
  if (order !== "story" && order !== "release") notFound();

  const titles = await getTitles();
  const copy = COPY[order];
  const mcu = sortTitles(titles.filter((t) => t.universe === "mcu"), order);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{copy.heading}</h1>
        <p className="max-w-2xl text-muted">{copy.blurb} Tick titles off as you go.</p>
      </header>
      <TitleExplorer titles={titles} initialOrder={order} orderBasePath="/watch-order" />
      <TitleListJsonLd name={copy.heading} titles={mcu} />
    </div>
  );
}
