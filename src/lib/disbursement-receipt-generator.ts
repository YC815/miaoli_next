import { jsPDF } from "jspdf";

export interface DisbursementReceiptItem {
  name: string;
  unit: string;
  quantity: number;
}

export interface DisbursementReceiptPayload {
  recipientUnitName: string;
  serviceCount?: number | null;
  issuedAt: Date;
  items: DisbursementReceiptItem[];
  handlerSealImage?: string | null;
  chairmanSealImage?: string | null;
  notes?: string;
}

export class DisbursementReceiptGenerator {
  private pdf: jsPDF;
  private fontLoaded = false;

  constructor() {
    this.pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      putOnlyUsedFonts: true,
      compress: true,
    });

    this.pdf.setFont("helvetica", "normal");
  }

  private async ensureChineseFont(): Promise<void> {
    if (this.fontLoaded) return;

    try {
      const response = await fetch("/fonts/TW-Kai-98_1.ttf");
      if (!response.ok) {
        throw new Error(`Unable to fetch font file: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const fontBytes = new Uint8Array(arrayBuffer);
      let binary = "";
      const chunkSize = 8192;
      for (let i = 0; i < fontBytes.length; i += chunkSize) {
        const chunk = fontBytes.subarray(i, Math.min(i + chunkSize, fontBytes.length));
        binary += String.fromCharCode(...chunk);
      }
      const base64Font = btoa(binary);

      this.pdf.addFileToVFS("TW-Kai-98_1.ttf", base64Font);
      this.pdf.addFont("TW-Kai-98_1.ttf", "TW-Kai", "normal");
      this.fontLoaded = true;
    } catch (error) {
      console.warn("Failed to load CJK font, fallback to helvetica:", error);
      this.fontLoaded = false;
    }
  }

  private setFont(size: number): void {
    if (this.fontLoaded) {
      try {
        this.pdf.setFont("TW-Kai", "normal");
      } catch (error) {
        console.warn("Fallback to helvetica font:", error);
        this.fontLoaded = false;
        this.pdf.setFont("helvetica", "normal");
      }
    } else {
      this.pdf.setFont("helvetica", "normal");
    }
    this.pdf.setFontSize(size);
  }

  private drawTitle(): number {
    const topMargin = 20;
    this.setFont(18);
    this.pdf.text("社團法人苗栗縣社會福利促進協會物資領取單", 105, topMargin, {
      align: "center",
    });
    return topMargin + 12;
  }

  private drawRecipientInfo(payload: DisbursementReceiptPayload, startY: number): number {
    const marginX = 20;
    const lineHeight = 8;

    this.setFont(11);
    const serviceCountText =
      payload.serviceCount !== null && payload.serviceCount !== undefined
        ? String(payload.serviceCount)
        : "______";

    this.pdf.text(`領取單位名稱：${payload.recipientUnitName || "____________________"}`, marginX, startY);
    this.pdf.text(`服務人數：${serviceCountText}`, 140, startY);

    const year = payload.issuedAt.getFullYear();
    const month = payload.issuedAt.getMonth() + 1;
    const day = payload.issuedAt.getDate();

    this.pdf.text(
      `年：${year}    月：${month}    日：${day}`,
      marginX,
      startY + lineHeight
    );

    return startY + lineHeight * 2 + 4;
  }

  private drawItemsTable(items: DisbursementReceiptItem[], startY: number): number {
    const marginX = 20;
    const headerHeight = 10;
    const rowHeight = 9;

    this.setFont(11);
    this.pdf.setLineWidth(0.5);

    const columns = [
      { label: "項目", width: 110 },
      { label: "數量", width: 60 },
    ];

    let currentX = marginX;
    columns.forEach((column) => {
      this.pdf.rect(currentX, startY, column.width, headerHeight);
      this.pdf.text(column.label, currentX + column.width / 2, startY + headerHeight / 2 + 1, {
        align: "center",
      });
      currentX += column.width;
    });

    let currentY = startY + headerHeight;
    items.forEach((item) => {
      currentX = marginX;
      const rowValues = [
        item.name,
        `${item.quantity} ${item.unit}`.trim(),
      ];

      columns.forEach((column, index) => {
        this.pdf.rect(currentX, currentY, column.width, rowHeight);
        this.pdf.text(rowValues[index] || "", currentX + 2, currentY + rowHeight / 2 + 1);
        currentX += column.width;
      });
      currentY += rowHeight;
    });

    return currentY + 6;
  }

  private drawNotesArea(notes: string | undefined, startY: number): number {
    const marginX = 20;
    const areaHeight = 25;
    const width = 170;

    this.pdf.rect(marginX, startY, width, areaHeight);
    this.setFont(11);
    this.pdf.text("註記：", marginX + 2, startY + 7);
    if (notes) {
      const lines = this.pdf.splitTextToSize(notes, width - 8);
      this.pdf.text(lines, marginX + 2, startY + 14);
    }

    return startY + areaHeight + 8;
  }

  private drawSignatureArea(
    payload: DisbursementReceiptPayload,
    startY: number
  ): void {
    const marginX = 20;
    const width = 170;
    const cellWidth = width / 3;
    const cellHeight = 40;
    const labels = [
      "物資收取單位簽章",
      "物資共享站承辦人簽章",
      "物資共享站理事長簽章",
    ];

    this.pdf.setLineWidth(0.5);
    for (let i = 0; i < labels.length; i++) {
      const cellX = marginX + cellWidth * i;
      this.pdf.rect(cellX, startY, cellWidth, cellHeight);
      this.setFont(10);
      this.pdf.text(labels[i], cellX + 2, startY + 6);
    }

    const sealSize = 26;
    if (payload.handlerSealImage) {
      try {
        this.pdf.addImage(
          payload.handlerSealImage,
          this.getImageFormat(payload.handlerSealImage),
          marginX + cellWidth + (cellWidth - sealSize) / 2,
          startY + 12,
          sealSize,
          sealSize
        );
      } catch (error) {
        console.warn("Failed to render handler seal:", error);
      }
    }

    if (payload.chairmanSealImage) {
      try {
        this.pdf.addImage(
          payload.chairmanSealImage,
          this.getImageFormat(payload.chairmanSealImage),
          marginX + cellWidth * 2 + (cellWidth - sealSize) / 2,
          startY + 12,
          sealSize,
          sealSize
        );
      } catch (error) {
        console.warn("Failed to render chairman seal:", error);
      }
    }
  }

  async generate(payload: DisbursementReceiptPayload, filename: string): Promise<void> {
    await this.ensureChineseFont();

    let nextY = this.drawTitle();
    nextY = this.drawRecipientInfo(payload, nextY + 4);
    nextY = this.drawItemsTable(payload.items, nextY + 4);
    nextY = this.drawNotesArea(payload.notes, nextY);
    this.drawSignatureArea(payload, nextY);

    this.pdf.save(filename);
  }

  private getImageFormat(dataUri: string): "PNG" | "JPEG" | "WEBP" {
    if (dataUri.startsWith("data:image/jpeg") || dataUri.startsWith("data:image/jpg")) {
      return "JPEG";
    }
    if (dataUri.startsWith("data:image/webp")) {
      return "WEBP";
    }
    return "PNG";
  }
}
