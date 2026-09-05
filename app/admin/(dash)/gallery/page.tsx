import { requireAdmin } from "@/lib/auth";
import { cloudinaryConfigured } from "@/lib/cloudinary";
import { type GalleryItem, listGallery } from "@/lib/db";
import { DataError } from "../data-error";
import GalleryManager from "./manager";

export default async function GalleryPage() {
  await requireAdmin();
  const uploadsReady = cloudinaryConfigured();

  let items: GalleryItem[];
  try {
    items = await listGallery();
  } catch (error) {
    return (
      <>
        <h1 className="font-display text-4xl text-ivory">Gallery</h1>
        <DataError
          retry="/admin/gallery"
          detail={error instanceof Error ? error.message : undefined}
        />
      </>
    );
  }

  return (
    <>
      <h1 className="font-display text-4xl text-ivory">Gallery</h1>
      <p className="mt-2 text-sm text-muted">
        Photos shown on the site, in this order. Unpublished ones stay here but are hidden
        from visitors.
      </p>

      {!uploadsReady && (
        <p className="mt-6 rounded-2xl border border-danger/40 bg-danger/10 p-4 text-sm text-ivory">
          Cloudinary is not configured, so uploads will fail. Set{" "}
          <code className="text-gold">CLOUDINARY_CLOUD_NAME</code>,{" "}
          <code className="text-gold">CLOUDINARY_API_KEY</code> and{" "}
          <code className="text-gold">CLOUDINARY_API_SECRET</code>. They are all on the
          Cloudinary dashboard home page.
        </p>
      )}

      <GalleryManager items={items} />
    </>
  );
}
