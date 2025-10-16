export type ReceiptSealCategory = "ORG" | "CHAIRMAN" | "HANDLER";

export interface ReceiptSealAsset {
  id: string;
  name: string;
  category: ReceiptSealCategory;
  imageUrl: string;
  mimeType?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReceiptSealSelection {
  sealId?: string;
  /**
   * Base64 data URL of the seal image (PNG preferred).
   * When provided, this should take precedence over sealId for rendering.
   */
  imageDataUrl?: string;
  /**
   * Remote image URL for already stored seals.
   */
  imageUrl?: string;
  /**
   * Human readable label shown in the wizard summary.
   */
  name?: string;
}

export interface ReceiptItemDraft {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  notes?: string;
  /**
   * Optional references to source record metadata.
   */
  sourceRecordId?: string;
  sourceDonationItemId?: string;
}

export interface ReceiptDonorDraft {
  name: string;
  address?: string;
  phone?: string;
  taxId?: string;
}

export interface ReceiptDraft {
  /**
   * Donation record ids included in this receipt.
   */
  recordIds: string[];
  donor: ReceiptDonorDraft;
  items: ReceiptItemDraft[];
  /**
   * ISO string for the receipt date – defaults to today when not provided.
   */
  receiptDate: string;
  receiptNumber?: string;
  seals: Record<ReceiptSealCategory, ReceiptSealSelection>;
}

export interface ReceiptDraftSubmission extends ReceiptDraft {
  /**
   * Optional note from the user kept with the draft.
   */
  memo?: string;
}
