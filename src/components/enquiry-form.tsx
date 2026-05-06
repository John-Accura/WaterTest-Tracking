"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { DISTRICTS, PAYMENT_MODES, STATUSES, WATER_SOURCES } from "@/lib/constants";

type Values = {
  dateOfEnquiry: string;
  customerName: string;
  mobileNumber: string;
  district: string;
  area: string;
  pinCode: string;
  waterSource: string;
  status: string;
  assignedTechnician: string;
  sampleCollectionDate: string;
  receivedAtLabDate: string;
  resultDate: string;
  paymentMode: string;
  remarks: string;
};

const empty: Values = {
  dateOfEnquiry: new Date().toISOString().slice(0, 10),
  customerName: "",
  mobileNumber: "",
  district: "",
  area: "",
  pinCode: "",
  waterSource: "",
  status: "Confirmed",
  assignedTechnician: "",
  sampleCollectionDate: "",
  receivedAtLabDate: "",
  resultDate: "",
  paymentMode: "",
  remarks: "",
};

export function EnquiryForm({
  action,
  defaultValues,
}: {
  action: (formData: FormData) => Promise<{ ok: boolean; error?: string } | void>;
  defaultValues?: Partial<Values>;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const v = { ...empty, ...defaultValues };

  async function onSubmit(formData: FormData) {
    setPending(true);
    try {
      const result = await action(formData);
      if (result && !result.ok) {
        toast.error(result.error ?? "Could not save");
        return;
      }
      toast.success("Saved");
      router.push("/enquiries");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Date of enquiry" name="dateOfEnquiry" type="date" defaultValue={v.dateOfEnquiry} required />
          <Field label="Customer name" name="customerName" defaultValue={v.customerName} required />
          <Field label="Mobile number" name="mobileNumber" defaultValue={v.mobileNumber} required />

          <SelectField label="District" name="district" defaultValue={v.district} options={DISTRICTS} required />
          <Field label="Area" name="area" defaultValue={v.area} />
          <Field label="Pin code" name="pinCode" defaultValue={v.pinCode} />

          <SelectField label="Water source" name="waterSource" defaultValue={v.waterSource} options={WATER_SOURCES} required />
          <SelectField label="Status" name="status" defaultValue={v.status} options={STATUSES} required />
          <Field label="Assigned technician" name="assignedTechnician" defaultValue={v.assignedTechnician} />

          <Field label="Sample collection date" name="sampleCollectionDate" type="date" defaultValue={v.sampleCollectionDate} />
          <Field label="Received at lab date" name="receivedAtLabDate" type="date" defaultValue={v.receivedAtLabDate} />
          <Field label="Result date" name="resultDate" type="date" defaultValue={v.resultDate} />

          <SelectField label="Payment mode" name="paymentMode" defaultValue={v.paymentMode} options={PAYMENT_MODES} />

          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="remarks">Remarks / notes / location link</Label>
            <Textarea id="remarks" name="remarks" defaultValue={v.remarks} rows={3} />
          </div>

          <div className="md:col-span-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-rose-600"> *</span>}
      </Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} required={required} />
    </div>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: readonly string[];
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-rose-600"> *</span>}
      </Label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
