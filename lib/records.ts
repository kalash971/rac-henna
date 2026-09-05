/**
 * Row shapes shared by the server and the dashboard's client components.
 *
 * Separate from lib/db.ts because that module is `server-only`: a client
 * component importing a runtime value from it drags the database driver into
 * the browser bundle, which the build refuses outright.
 *
 * Ids are strings — MongoDB's ObjectId is not serialisable across the
 * server/client boundary, so the queries convert on the way out.
 */

export const ENQUIRY_STATUSES = ["new", "contacted", "booked", "closed"] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

export type Enquiry = {
  id: string;
  name: string;
  phone: string;
  occasion: string;
  /** ISO `YYYY-MM-DD`, stored as a string so no timezone can shift the day. */
  eventDate: string;
  area: string | null;
  notes: string | null;
  status: EnquiryStatus;
  adminNotes: string | null;
  createdAt: string;
};

export type GalleryItem = {
  id: string;
  url: string;
  /** Cloudinary public_id, needed to delete the file itself. */
  publicId: string;
  category: string;
  label: string;
  sort: number;
  published: boolean;
};

/** Unanswered first, then soonest event. */
const STATUS_RANK: Record<EnquiryStatus, number> = {
  new: 0,
  contacted: 1,
  booked: 2,
  closed: 3,
};

/**
 * Orders the dashboard list.
 *
 * ponytail: sorted in JS rather than in an aggregation pipeline, because a
 * solo artist's enquiries number in the dozens. Move it into the query if this
 * ever has to paginate.
 */
export function sortEnquiries(enquiries: Enquiry[]) {
  return [...enquiries].sort(
    (a, b) =>
      STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
      a.eventDate.localeCompare(b.eventDate) ||
      b.createdAt.localeCompare(a.createdAt)
  );
}
