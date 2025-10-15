export interface DonationItem {
  id: string;
  itemName: string;
  itemCategory: string;
  itemUnit: string;
  quantity: number;
  expiryDate: string | null;
  isStandard: boolean;
  notes: string | null;
}

export interface DonationRecord {
  id: string;
  serialNumber: string;
  donorId: string | null;
  donor: {
    id: string;
    name: string;
    phone: string | null;
    address: string | null;
  } | null;
  createdAt: string;
  user: {
    id: string;
    nickname: string | null;
  };
  donationItems: DonationItem[];
}

// For ReceiptModal usage
export interface DonationRecordWithDisplay extends DonationRecord {
  selected: boolean;
  items: string;
  date: string;
}