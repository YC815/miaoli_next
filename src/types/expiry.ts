export interface ExpiryDonationRecord {
  donationId: string;
  serialNumber: string | null;
  quantity: number;
  expiryDate: string;
}

export interface ExpiryItemDetail {
  itemStockId: string;
  itemName: string;
  itemCategory: string;
  itemUnit: string;
  totalStock: number;
  soonestExpiry: string | null;
  daysUntilExpiry: number | null;
  donationRecords: ExpiryDonationRecord[];
}
