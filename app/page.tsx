import { getPublishedGallery } from "@/lib/db";
import { type GalleryPhoto, placeholderGallery } from "@/lib/site";
import Nav from "@/components/nav";
import Scene from "@/components/scene";
import {
  Booking,
  Footer,
  Gallery,
  Hero,
  HowItWorks,
  Journey,
  Motion,
  Services,
  WhatsAppFab,
} from "@/components/sections";

/**
 * Real photographs when the dashboard has any, hand-drawn placeholders when it
 * does not — and placeholders again if the database is unreachable, because a
 * marketing page must not go blank over a failed query.
 */
async function galleryPhotos(): Promise<GalleryPhoto[]> {
  try {
    const rows = await getPublishedGallery();
    if (rows.length > 0) {
      return rows.map((row) => ({
        id: row.id,
        category: row.category,
        label: row.label,
        url: row.url,
      }));
    }
  } catch {
    /* fall through to the placeholders */
  }
  return placeholderGallery;
}

export default async function Home() {
  const photos = await galleryPhotos();

  return (
    <Motion>
      <Scene />
      <Nav />

      <main id="main">
        {/* Hero sits directly on the 3D mandala. */}
        <Hero />

        {/*
          Everything below is scrimmed over the scene, so body text keeps its
          contrast ratio and the mandala still shows through faintly.

          No backdrop-blur here: a full-viewport backdrop-filter over a moving
          canvas makes the compositor re-blur the entire screen every frame,
          which was costing more than the whole 3D scene. The scene is parked
          once this scrim is on screen anyway.
        */}
        <div className="relative bg-ink/[0.93]">
          <Services />
          <Gallery photos={photos} />
          <HowItWorks />
          <Journey />
          <Booking />
        </div>
      </main>

      <Footer />
      <WhatsAppFab />
    </Motion>
  );
}
