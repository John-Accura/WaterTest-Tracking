import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "../../../../../auth";
import { db } from "@/lib/db";
import { enquiries } from "@/lib/schema";
import { EnquiryForm } from "@/components/enquiry-form";
import { deleteEnquiry, updateEnquiry } from "@/app/actions/enquiries";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export default async function EnquiryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const enquiryId = Number(id);
  if (!Number.isFinite(enquiryId)) notFound();

  const session = await auth();
  const user = session!.user;
  const isAdmin = user.role === "admin";

  const filter = isAdmin
    ? eq(enquiries.id, enquiryId)
    : and(eq(enquiries.id, enquiryId), eq(enquiries.agentId, Number(user.id)));

  const [row] = await db.select().from(enquiries).where(filter).limit(1);
  if (!row) notFound();

  const update = updateEnquiry.bind(null, enquiryId);
  const remove = deleteEnquiry.bind(null, enquiryId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Edit enquiry #{row.id}</h1>
          <p className="text-sm text-muted-foreground">
            Created by {row.agentName} on {new Date(row.createdAt).toLocaleString()}
          </p>
        </div>
        <form action={remove}>
          <Button type="submit" variant="destructive" size="sm">
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </form>
      </div>
      <EnquiryForm
        action={update}
        defaultValues={{
          dateOfEnquiry: row.dateOfEnquiry,
          customerName: row.customerName,
          mobileNumber: row.mobileNumber,
          district: row.district,
          area: row.area ?? "",
          pinCode: row.pinCode ?? "",
          waterSource: row.waterSource,
          status: row.status,
          assignedTechnician: row.assignedTechnician ?? "",
          sampleCollectionDate: row.sampleCollectionDate ?? "",
          receivedAtLabDate: row.receivedAtLabDate ?? "",
          resultDate: row.resultDate ?? "",
          paymentMode: row.paymentMode ?? "",
          remarks: row.remarks ?? "",
        }}
      />
    </div>
  );
}
