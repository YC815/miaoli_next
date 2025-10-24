-- Schema backup from Miaoli Next
-- Generated at: 2025-10-24T04:22:29.545Z

-- Table: Category
CREATE TABLE public."Category" (
  id text NOT NULL,
  name text NOT NULL,
  "isActive" boolean NOT NULL DEFAULT true,
  "sortOrder" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL
);

CREATE UNIQUE INDEX "Category_name_key" ON public."Category" USING btree (name);

ALTER TABLE public."Category" ADD CONSTRAINT "Category_pkey" PRIMARY KEY (id);

-- Table: CustomItem
CREATE TABLE public."CustomItem" (
  id text NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  units jsonb NOT NULL,
  "defaultUnit" text NOT NULL,
  "isActive" boolean NOT NULL DEFAULT true,
  "isHidden" boolean NOT NULL DEFAULT false,
  "sortOrder" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" text NOT NULL
);

CREATE UNIQUE INDEX "CustomItem_name_category_key" ON public."CustomItem" USING btree (name, category);

ALTER TABLE public."CustomItem" ADD CONSTRAINT "CustomItem_pkey" PRIMARY KEY (id);
ALTER TABLE public."CustomItem" ADD CONSTRAINT "CustomItem_createdBy_fkey" FOREIGN KEY (createdBy) REFERENCES "User"(id);

-- Table: Disbursement
CREATE TABLE public."Disbursement" (
  id text NOT NULL,
  "recipientPhone" text,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" text NOT NULL,
  "serialNumber" text NOT NULL DEFAULT ''::text,
  "recipientAddress" text,
  "recipientUnitId" text,
  "recipientUnitName" text NOT NULL
);

CREATE UNIQUE INDEX "Disbursement_serialNumber_key" ON public."Disbursement" USING btree ("serialNumber");

ALTER TABLE public."Disbursement" ADD CONSTRAINT "Disbursement_pkey" PRIMARY KEY (id);
ALTER TABLE public."Disbursement" ADD CONSTRAINT "Disbursement_userId_fkey" FOREIGN KEY (userId) REFERENCES "User"(id);
ALTER TABLE public."Disbursement" ADD CONSTRAINT "Disbursement_recipientUnitId_fkey" FOREIGN KEY (recipientUnitId) REFERENCES "RecipientUnit"(id);

-- Table: DisbursementItem
CREATE TABLE public."DisbursementItem" (
  id text NOT NULL,
  "disbursementId" text NOT NULL,
  "itemCategory" text NOT NULL,
  "itemName" text NOT NULL,
  "itemUnit" text NOT NULL,
  quantity integer NOT NULL DEFAULT 1
);

ALTER TABLE public."DisbursementItem" ADD CONSTRAINT "DisbursementItem_pkey" PRIMARY KEY (id);
ALTER TABLE public."DisbursementItem" ADD CONSTRAINT "DisbursementItem_disbursementId_fkey" FOREIGN KEY (disbursementId) REFERENCES "Disbursement"(id);

-- Table: DonationItem
CREATE TABLE public."DonationItem" (
  id text NOT NULL,
  "donationId" text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  "expiryDate" timestamp without time zone,
  "isStandard" boolean NOT NULL DEFAULT false,
  "itemCategory" text NOT NULL,
  "itemName" text NOT NULL,
  "itemUnit" text NOT NULL,
  notes text,
  "isHandled" boolean NOT NULL DEFAULT false
);

ALTER TABLE public."DonationItem" ADD CONSTRAINT "DonationItem_pkey" PRIMARY KEY (id);
ALTER TABLE public."DonationItem" ADD CONSTRAINT "DonationItem_donationId_fkey" FOREIGN KEY (donationId) REFERENCES "DonationRecord"(id);

-- Table: DonationRecord
CREATE TABLE public."DonationRecord" (
  id text NOT NULL,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" text NOT NULL,
  "donorId" text,
  "serialNumber" text NOT NULL DEFAULT ''::text
);

CREATE UNIQUE INDEX "DonationRecord_serialNumber_key" ON public."DonationRecord" USING btree ("serialNumber");

ALTER TABLE public."DonationRecord" ADD CONSTRAINT "DonationRecord_pkey" PRIMARY KEY (id);
ALTER TABLE public."DonationRecord" ADD CONSTRAINT "DonationRecord_userId_fkey" FOREIGN KEY (userId) REFERENCES "User"(id);
ALTER TABLE public."DonationRecord" ADD CONSTRAINT "DonationRecord_donorId_fkey" FOREIGN KEY (donorId) REFERENCES "Donor"(id);

-- Table: Donor
CREATE TABLE public."Donor" (
  id text NOT NULL,
  name text NOT NULL,
  phone text,
  "taxId" text,
  address text,
  "isActive" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL
);

CREATE UNIQUE INDEX "Donor_name_key" ON public."Donor" USING btree (name);

ALTER TABLE public."Donor" ADD CONSTRAINT "Donor_pkey" PRIMARY KEY (id);

-- Table: InventoryChangeReason
CREATE TABLE public."InventoryChangeReason" (
  id text NOT NULL,
  reason text NOT NULL,
  "changeType" USER-DEFINED NOT NULL,
  "isActive" boolean NOT NULL DEFAULT true,
  "sortOrder" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL
);

ALTER TABLE public."InventoryChangeReason" ADD CONSTRAINT "InventoryChangeReason_pkey" PRIMARY KEY (id);

-- Table: InventoryLog
CREATE TABLE public."InventoryLog" (
  id text NOT NULL,
  "itemStockId" text NOT NULL,
  "changeType" USER-DEFINED NOT NULL,
  "changeAmount" integer NOT NULL,
  "newQuantity" integer NOT NULL,
  reason text NOT NULL,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" text NOT NULL,
  "previousQuantity" integer NOT NULL
);

ALTER TABLE public."InventoryLog" ADD CONSTRAINT "InventoryLog_pkey" PRIMARY KEY (id);
ALTER TABLE public."InventoryLog" ADD CONSTRAINT "InventoryLog_userId_fkey" FOREIGN KEY (userId) REFERENCES "User"(id);
ALTER TABLE public."InventoryLog" ADD CONSTRAINT "InventoryLog_itemStockId_fkey" FOREIGN KEY (itemStockId) REFERENCES "ItemStock"(id);

-- Table: ItemCondition
CREATE TABLE public."ItemCondition" (
  id text NOT NULL,
  condition text NOT NULL,
  quantity integer NOT NULL,
  notes text,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "donationItemId" text,
  "disbursementItemId" text
);

ALTER TABLE public."ItemCondition" ADD CONSTRAINT "ItemCondition_pkey" PRIMARY KEY (id);
ALTER TABLE public."ItemCondition" ADD CONSTRAINT "ItemCondition_disbursementItemId_fkey" FOREIGN KEY (disbursementItemId) REFERENCES "DisbursementItem"(id);
ALTER TABLE public."ItemCondition" ADD CONSTRAINT "ItemCondition_donationItemId_fkey" FOREIGN KEY (donationItemId) REFERENCES "DonationItem"(id);

-- Table: ItemStock
CREATE TABLE public."ItemStock" (
  id text NOT NULL,
  "itemName" text NOT NULL,
  "itemCategory" text NOT NULL,
  "itemUnit" text NOT NULL,
  "totalStock" integer NOT NULL,
  "safetyStock" integer NOT NULL DEFAULT 0,
  "isStandard" boolean NOT NULL DEFAULT false,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL
);

CREATE UNIQUE INDEX "ItemStock_itemName_itemCategory_key" ON public."ItemStock" USING btree ("itemName", "itemCategory");

ALTER TABLE public."ItemStock" ADD CONSTRAINT "ItemStock_pkey" PRIMARY KEY (id);

-- Table: ReceiptSeal
CREATE TABLE public."ReceiptSeal" (
  id text NOT NULL,
  "imageData" text NOT NULL,
  "mimeType" text NOT NULL DEFAULT 'image/png'::text,
  "isActive" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL,
  "userId" text NOT NULL,
  nickname text NOT NULL
);

CREATE UNIQUE INDEX "ReceiptSeal_userId_key" ON public."ReceiptSeal" USING btree ("userId");

ALTER TABLE public."ReceiptSeal" ADD CONSTRAINT "ReceiptSeal_pkey" PRIMARY KEY (id);
ALTER TABLE public."ReceiptSeal" ADD CONSTRAINT "ReceiptSeal_userId_key" UNIQUE (userId);
ALTER TABLE public."ReceiptSeal" ADD CONSTRAINT "ReceiptSeal_userId_fkey" FOREIGN KEY (userId) REFERENCES "User"(id);

-- Table: RecipientUnit
CREATE TABLE public."RecipientUnit" (
  id text NOT NULL,
  name text NOT NULL,
  phone text,
  address text,
  "isActive" boolean NOT NULL DEFAULT true,
  "sortOrder" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL,
  "serviceCount" integer,
  "contactPerson" text
);

CREATE UNIQUE INDEX "RecipientUnit_name_key" ON public."RecipientUnit" USING btree (name);

ALTER TABLE public."RecipientUnit" ADD CONSTRAINT "RecipientUnit_pkey" PRIMARY KEY (id);

-- Table: SerialNumberCounter
CREATE TABLE public."SerialNumberCounter" (
  id text NOT NULL,
  type text NOT NULL,
  counter integer NOT NULL DEFAULT 0,
  prefix text NOT NULL,
  "updatedAt" timestamp without time zone NOT NULL,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "SerialNumberCounter_type_key" ON public."SerialNumberCounter" USING btree (type);

ALTER TABLE public."SerialNumberCounter" ADD CONSTRAINT "SerialNumberCounter_pkey" PRIMARY KEY (id);

-- Table: StandardItem
CREATE TABLE public."StandardItem" (
  id text NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  units jsonb NOT NULL,
  "defaultUnit" text NOT NULL,
  "isActive" boolean NOT NULL DEFAULT true,
  "sortOrder" integer NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX "StandardItem_name_category_key" ON public."StandardItem" USING btree (name, category);

ALTER TABLE public."StandardItem" ADD CONSTRAINT "StandardItem_pkey" PRIMARY KEY (id);

-- Table: Supply
CREATE TABLE public."Supply" (
  id text NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  quantity integer NOT NULL,
  "safetyStock" integer NOT NULL,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL,
  "isActive" boolean NOT NULL DEFAULT true,
  "sortOrder" integer NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT '個'::text
);

CREATE UNIQUE INDEX "Supply_name_category_key" ON public."Supply" USING btree (name, category);

ALTER TABLE public."Supply" ADD CONSTRAINT "Supply_pkey" PRIMARY KEY (id);

-- Table: Unit
CREATE TABLE public."Unit" (
  id text NOT NULL,
  name text NOT NULL,
  "isActive" boolean NOT NULL DEFAULT true,
  "sortOrder" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL
);

CREATE UNIQUE INDEX "Unit_name_key" ON public."Unit" USING btree (name);

ALTER TABLE public."Unit" ADD CONSTRAINT "Unit_pkey" PRIMARY KEY (id);

-- Table: User
CREATE TABLE public."User" (
  id text NOT NULL,
  "clerkId" text NOT NULL,
  email text NOT NULL,
  nickname text,
  role USER-DEFINED NOT NULL DEFAULT 'VOLUNTEER'::"Role",
  "isFirstLogin" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL,
  "lastLoginAt" timestamp without time zone
);

CREATE UNIQUE INDEX "User_clerkId_key" ON public."User" USING btree ("clerkId");
CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);

ALTER TABLE public."User" ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);
