export interface ExpiryItemDetail {
  id: string;
  itemName: string;
  itemCategory: string;
  itemUnit: string;
  quantity: number;
  expiryDate: string | null;
  daysUntilExpiry: number | null;
  isHandled: boolean;
  serialNumber: string | null;
  donationId: string | null;
}

export interface ExpiryPagination {
  page: number;
  pageSize: number;
  totalExpiring: number;
  totalExpired: number;
  totalPagesExpiring: number;
  totalPagesExpired: number;
}
