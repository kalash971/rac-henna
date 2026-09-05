import "server-only";
import { unstable_cache } from "next/cache";
import { MongoClient, ObjectId, type Collection, type Db } from "mongodb";
import {
  type Enquiry,
  type EnquiryStatus,
  type GalleryItem,
  sortEnquiries,
} from "./records";

// Re-exported so server callers have one import for queries and their shapes.
export {
  ENQUIRY_STATUSES,
  type Enquiry,
  type EnquiryStatus,
  type GalleryItem,
} from "./records";

/**
 * MongoDB. Every caller tolerates an absent MONGODB_URI, because the public
 * site must keep working with no database configured at all.
 */
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "rac_henna";

/* ------------------------------------------------------- documents ----- */

type EnquiryDoc = {
  _id: ObjectId;
  name: string;
  phone: string;
  occasion: string;
  eventDate: string;
  area: string | null;
  notes: string | null;
  status: EnquiryStatus;
  adminNotes: string | null;
  sourceIp: string | null;
  createdAt: Date;
};

type GalleryDoc = {
  _id: ObjectId;
  url: string;
  publicId: string;
  category: string;
  label: string;
  sort: number;
  published: boolean;
  createdAt: Date;
};

type ThrottleDoc = { _id: ObjectId; bucket: string; key: string; at: Date };

/* ---------------------------------------------------------- client ----- */

/**
 * Cached at module scope, which on Vercel survives every warm invocation of
 * the same function instance. Reconnecting per request is what exhausts an
 * Atlas cluster's connection limit.
 */
let connection: Promise<MongoClient> | null = null;

function connect(connectionString: string) {
  const client = new MongoClient(connectionString, {
    // A serverless instance serves one request at a time, so a large pool buys
    // nothing and costs connection slots.
    maxPoolSize: 5,
    minPoolSize: 0,
    maxIdleTimeMS: 30_000,
    // Fail fast on a bad URI instead of hanging the request for 30 seconds.
    serverSelectionTimeoutMS: 8_000,
  });
  return client.connect();
}

/** Indexes, created once per instance. Mongo has no schema to migrate. */
let indexes: Promise<unknown> | null = null;

function ensureIndexes(db: Db) {
  return Promise.all([
    db
      .collection<GalleryDoc>("gallery")
      .createIndexes([{ key: { sort: 1, _id: 1 } }, { key: { published: 1, sort: 1 } }]),
    db
      .collection<EnquiryDoc>("enquiries")
      .createIndexes([{ key: { status: 1, eventDate: 1 } }, { key: { createdAt: -1 } }]),
    db.collection<ThrottleDoc>("throttle").createIndexes([
      { key: { bucket: 1, key: 1, at: 1 } },
      // A TTL index retires old rows by itself — no cleanup query, no cron.
      { key: { at: 1 }, expireAfterSeconds: 86_400 },
    ]),
  ]);
}

async function database() {
  if (!uri) return null;
  connection ??= connect(uri);

  let client: MongoClient;
  try {
    client = await connection;
  } catch (error) {
    connection = null; // let the next request try again
    throw error;
  }

  const db = client.db(dbName);
  // Index creation must never be the reason a page fails to render.
  indexes ??= ensureIndexes(db).catch(() => null);
  return db;
}

async function enquiryCollection(): Promise<Collection<EnquiryDoc> | null> {
  const db = await database();
  return db ? db.collection<EnquiryDoc>("enquiries") : null;
}

async function galleryCollection(): Promise<Collection<GalleryDoc> | null> {
  const db = await database();
  return db ? db.collection<GalleryDoc>("gallery") : null;
}

/** ObjectId.isValid accepts any 12-character string, so check the hex shape. */
function objectId(id: string) {
  return /^[a-f\d]{24}$/i.test(id) ? new ObjectId(id) : null;
}

/* ------------------------------------------------------- enquiries ----- */

function toEnquiry(doc: EnquiryDoc): Enquiry {
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    phone: doc.phone,
    occasion: doc.occasion,
    eventDate: doc.eventDate,
    area: doc.area ?? null,
    notes: doc.notes ?? null,
    status: doc.status,
    adminNotes: doc.adminNotes ?? null,
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function insertEnquiry(input: {
  name: string;
  phone: string;
  occasion: string;
  eventDate: string;
  area: string | null;
  notes: string | null;
  ip: string | null;
}) {
  const collection = await enquiryCollection();
  if (!collection) return null;
  const result = await collection.insertOne({
    _id: new ObjectId(),
    name: input.name,
    phone: input.phone,
    occasion: input.occasion,
    eventDate: input.eventDate,
    area: input.area,
    notes: input.notes,
    status: "new",
    adminNotes: null,
    sourceIp: input.ip,
    createdAt: new Date(),
  });
  return result.insertedId.toHexString();
}

export async function listEnquiries() {
  const collection = await enquiryCollection();
  if (!collection) return [];
  const docs = await collection.find({}).sort({ createdAt: -1 }).limit(500).toArray();
  return sortEnquiries(docs.map(toEnquiry));
}

export async function setEnquiryStatus(id: string, status: EnquiryStatus) {
  const collection = await enquiryCollection();
  const _id = objectId(id);
  if (!collection || !_id) return;
  await collection.updateOne({ _id }, { $set: { status } });
}

export async function setEnquiryNotes(id: string, notes: string) {
  const collection = await enquiryCollection();
  const _id = objectId(id);
  if (!collection || !_id) return;
  await collection.updateOne({ _id }, { $set: { adminNotes: notes || null } });
}

export async function deleteEnquiry(id: string) {
  const collection = await enquiryCollection();
  const _id = objectId(id);
  if (!collection || !_id) return;
  await collection.deleteOne({ _id });
}

/* --------------------------------------------------------- gallery ----- */

function toGalleryItem(doc: GalleryDoc): GalleryItem {
  return {
    id: doc._id.toHexString(),
    url: doc.url,
    publicId: doc.publicId,
    category: doc.category,
    label: doc.label,
    sort: doc.sort,
    published: doc.published,
  };
}

export async function listGallery({ publishedOnly = false } = {}) {
  const collection = await galleryCollection();
  if (!collection) return [];
  const docs = await collection
    .find(publishedOnly ? { published: true } : {})
    .sort({ sort: 1, _id: 1 })
    .toArray();
  return docs.map(toGalleryItem);
}

export async function insertGalleryItem(input: {
  url: string;
  publicId: string;
  category: string;
  label: string;
}) {
  const collection = await galleryCollection();
  if (!collection) return;
  // New photos land at the end rather than jumping to the front of her grid.
  const last = await collection.find({}).sort({ sort: -1 }).limit(1).next();
  await collection.insertOne({
    _id: new ObjectId(),
    url: input.url,
    publicId: input.publicId,
    category: input.category,
    label: input.label,
    sort: (last?.sort ?? -1) + 1,
    published: true,
    createdAt: new Date(),
  });
}

export async function updateGalleryItem(
  id: string,
  patch: { category?: string; label?: string; published?: boolean }
) {
  const collection = await galleryCollection();
  const _id = objectId(id);
  if (!collection || !_id || Object.keys(patch).length === 0) return;
  await collection.updateOne({ _id }, { $set: patch });
}

/** Returns the Cloudinary public_id so the caller can delete the file too. */
export async function deleteGalleryItem(id: string) {
  const collection = await galleryCollection();
  const _id = objectId(id);
  if (!collection || !_id) return null;
  const doc = await collection.findOneAndDelete({ _id });
  return doc?.publicId ?? null;
}

/** Writes a whole new ordering in one round trip. */
export async function reorderGallery(orderedIds: string[]) {
  const collection = await galleryCollection();
  if (!collection || orderedIds.length === 0) return;

  const writes = orderedIds
    .map((id, index) => ({ _id: objectId(id), index }))
    .filter((entry): entry is { _id: ObjectId; index: number } => entry._id !== null)
    .map(({ _id, index }) => ({
      updateOne: { filter: { _id }, update: { $set: { sort: index } } },
    }));

  if (writes.length) await collection.bulkWrite(writes, { ordered: false });
}

/**
 * What the public page renders. Cached and tagged so the home page keeps its
 * static prerender; the admin actions call updateTag("gallery") after any
 * change, so an edit is live immediately without making every visit a query.
 *
 * (Cache Components are opt-in in this version and off here, so this is the
 * documented approach for caching a non-fetch data source.)
 */
export const getPublishedGallery = unstable_cache(
  async () => listGallery({ publishedOnly: true }),
  ["published-gallery"],
  { tags: ["gallery"], revalidate: 3600 }
);

/* -------------------------------------------------------- throttle ----- */

/**
 * Counts recent events for a key. Split from `record` below so the login can
 * count every attempt but only *charge* the failures — otherwise eight
 * successful sign-ins in a quarter of an hour would lock her out of her own
 * dashboard.
 *
 * Old rows are retired by the TTL index, so nothing here has to clean up.
 */
export async function countRecent(bucket: string, key: string, windowMinutes: number) {
  const db = await database();
  if (!db) return 0;
  return db.collection<ThrottleDoc>("throttle").countDocuments({
    bucket,
    key,
    at: { $gt: new Date(Date.now() - windowMinutes * 60_000) },
  });
}

export async function record(bucket: string, key: string) {
  const db = await database();
  if (!db) return;
  await db
    .collection<ThrottleDoc>("throttle")
    .insertOne({ _id: new ObjectId(), bucket, key, at: new Date() });
}
