import { auth } from "../../../../../auth";
import { EnquiryForm } from "@/components/enquiry-form";
import { createEnquiry } from "@/app/actions/enquiries";

export default async function NewEnquiryPage() {
  const session = await auth();
  const user = session!.user;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">New enquiry</h1>
        <p className="text-sm text-muted-foreground">Logged as {user.name ?? user.email}</p>
      </div>
      <EnquiryForm action={createEnquiry} />
    </div>
  );
}
