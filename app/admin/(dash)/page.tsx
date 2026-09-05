import { requireAdmin } from "@/lib/auth";
import { type Enquiry, listEnquiries } from "@/lib/db";
import { DataError } from "./data-error";
import EnquiryBoard from "./enquiries";

export default async function EnquiriesPage() {
  // Checked again at the data boundary, not only in the layout.
  await requireAdmin();

  let enquiries: Enquiry[];
  try {
    enquiries = await listEnquiries();
  } catch (error) {
    return (
      <>
        <h1 className="font-display text-4xl text-ivory">Enquiries</h1>
        <DataError retry="/admin" detail={error instanceof Error ? error.message : undefined} />
      </>
    );
  }

  return (
    <>
      <h1 className="font-display text-4xl text-ivory">Enquiries</h1>
      <p className="mt-2 text-sm text-muted">
        Everything sent through the booking form. Newest unanswered first, then by event date.
      </p>
      <EnquiryBoard enquiries={enquiries} />
    </>
  );
}
