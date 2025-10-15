"use client";

import React from "react";
import { DonorSelect } from "@/components/donation/DonorSelect";

interface Donor {
  id: string;
  name: string;
  phone: string | null;
  taxId: string | null;
  address: string | null;
}

interface DonorInfoStepProps {
  selectedDonorId: string | null;
  onDonorSelect: (donorId: string | null, donor: Donor | null) => void;
}

export function DonorInfoStep({ selectedDonorId, onDonorSelect }: DonorInfoStepProps) {
  return (
    <div className="space-y-6">
      <DonorSelect
        selectedDonorId={selectedDonorId}
        onDonorChange={onDonorSelect}
      />
    </div>
  );
}