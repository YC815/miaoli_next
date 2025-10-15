import { jsPDF } from 'jspdf';
// 讓我們嘗試強制設定 UTF-8 編碼

import type { DonationRecord } from "@/types/donation";

interface ReceiptData {
  receiptNumber: string;
  donorName: string;
  donorAddress?: string;
  donorId?: string;
  donorPhone?: string;
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    notes?: string;
  }>;
  date: Date;
}

export class ReceiptGenerator {
  private pdf: jsPDF;
  private fontLoaded: boolean = false;

  constructor() {
    this.pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      putOnlyUsedFonts: true,
      compress: true
    });
    
    // 立即嘗試設定中文支援
    try {
      // 使用 jsPDF 內建的字體支援
      this.pdf.setFont('helvetica', 'normal');
    } catch (error) {
      console.error('PDF 初始化錯誤:', error);
    }
  }

  async loadFont(): Promise<void> {
    if (this.fontLoaded) return;
    
    try {
      console.log('🔤 載入繁體中文字體...');
      
      // 載入 TTF 格式的繁體中文字體
      const response = await fetch('/fonts/TW-Kai-98_1.ttf');
      if (!response.ok) {
        throw new Error(`字體文件載入失敗: ${response.status}`);
      }
      
      const fontArrayBuffer = await response.arrayBuffer();
      console.log('📁 TTF 字體文件大小:', fontArrayBuffer.byteLength, 'bytes');
      
      // 轉換 ArrayBuffer 為 base64
      const fontBytes = new Uint8Array(fontArrayBuffer);
      let binary = '';
      const chunkSize = 8192; // 使用較小的塊來避免記憶體問題
      
      for (let i = 0; i < fontBytes.length; i += chunkSize) {
        const chunk = fontBytes.subarray(i, Math.min(i + chunkSize, fontBytes.length));
        binary += String.fromCharCode(...chunk);
      }
      
      const base64Font = btoa(binary);
      console.log('📝 Base64 字體長度:', base64Font.length);
      
      // 添加 TTF 字體到 jsPDF
      this.pdf.addFileToVFS('TW-Kai-98_1.ttf', base64Font);
      this.pdf.addFont('TW-Kai-98_1.ttf', 'TW-Kai', 'normal');
      
      this.fontLoaded = true;
      console.log('✅ 繁體中文字體載入成功!');
      
    } catch (error) {
      console.error('❌ 字體載入失敗:', error);
      
      // 備用方案：嘗試使用 jsPDF 的內建 Unicode 處理
      try {
        console.log('🔄 嘗試備用字體方案...');
        // 不載入自訂字體，但設定 jsPDF 使用 UTF-8
        this.fontLoaded = false;
        console.log('⚠️ 使用系統預設字體 (可能無法正確顯示中文)');
      } catch (fallbackError) {
        console.error('❌ 備用方案也失敗:', fallbackError);
        this.fontLoaded = false;
      }
    }
  }

  private setFont(size: number): void {
    try {
      if (this.fontLoaded) {
        // 嘗試使用中文字體
        try {
          this.pdf.setFont('TW-Kai', 'normal');
          console.log('  ✅ 使用繁體中文字體 TW-Kai，大小:', size);
        } catch (fontError) {
          console.warn('  ❌ 中文字體設定失敗，回退到系統字體:', fontError);
          this.fontLoaded = false; // 標記字體載入失敗
          this.pdf.setFont('helvetica', 'normal');
          console.log('  ⚠️ 回退到 helvetica 字體，大小:', size);
        }
      } else {
        this.pdf.setFont('helvetica', 'normal');
        console.log('  ⚠️ 使用 helvetica 字體，大小:', size);
      }
      this.pdf.setFontSize(size);
    } catch (error) {
      console.warn('❌ 字體設定完全失敗:', error);
      // 最後的安全網
      try {
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setFontSize(size);
      } catch (finalError) {
        console.error('❌ 連基本字體都設定失敗:', finalError);
      }
    }
  }

  // 處理文字編碼
  private encodeText(text: string): string {
    // 如果成功載入中文字體，直接返回原文
    if (this.fontLoaded) {
      return text;
    }
    
    // 如果沒有中文字體，返回原文並讓 jsPDF 嘗試處理
    // jsPDF 現在對 Unicode 有更好的支援
    return text;
  }

  private async loadImage(imagePath: string): Promise<string> {
    try {
      const response = await fetch(imagePath);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.warn(`Failed to load image: ${imagePath}`, error);
      return '';
    }
  }

  private drawBorder(x: number, y: number, width: number, height: number, lineWidth: number = 0.5): void {
    this.pdf.setLineWidth(lineWidth);
    this.pdf.rect(x, y, width, height);
  }

  private drawTable(x: number, y: number, width: number, headers: string[], rows: string[][], cellHeights: number[]): number {
    const colWidth = width / headers.length;
    let currentY = y;

    // 繪製表頭
    this.pdf.setLineWidth(0.5);
    for (let i = 0; i < headers.length; i++) {
      this.pdf.rect(x + i * colWidth, currentY, colWidth, cellHeights[0]);
      this.setFont(10);
      this.pdf.text(headers[i], x + i * colWidth + colWidth / 2, currentY + cellHeights[0] / 2, { 
        align: 'center',
        baseline: 'middle'
      });
    }
    currentY += cellHeights[0];

    // 繪製資料行
    for (let i = 0; i < rows.length; i++) {
      const rowHeight = cellHeights[i + 1] || 8;
      for (let j = 0; j < rows[i].length; j++) {
        this.pdf.rect(x + j * colWidth, currentY, colWidth, rowHeight);
        this.setFont(9);
        const text = rows[i][j] || '';
        this.pdf.text(text, x + j * colWidth + 2, currentY + rowHeight / 2, {
          baseline: 'middle'
        });
      }
      currentY += rowHeight;
    }

    return currentY;
  }

  async generateReceipt(records: DonationRecord[]): Promise<void> {
    console.log('🔍 generateReceipt 開始，記錄數量:', records.length);
    
    await this.loadFont();

    if (records.length === 0) {
      console.log('❌ 沒有記錄，退出');
      return;
    }

    // 合併所有記錄的資料
    const firstRecord = records[0];
    const allItems: ReceiptData['items'] = [];
    
    // 收集所有物品
    records.forEach((record, index) => {
      console.log(`📝 處理記錄 ${index + 1}:`, record.donor?.name || '匿名', '物品數量:', record.donationItems.length);
      record.donationItems.forEach(item => {
        allItems.push({
          name: item.itemName,
          quantity: item.quantity,
          unit: item.itemUnit,
          notes: item.notes ?? ''
        });
      });
    });

    // 找出主要捐贈者（具名捐贈者，如果都是無名氏則用第一個）
    const namedRecords = records.filter(r => r.donor && r.donor.name?.trim());
    const primaryRecord = namedRecords.length > 0 ? namedRecords[0] : firstRecord;

    const receiptData: ReceiptData = {
      receiptNumber: await this.generateReceiptNumber(),
      donorName: primaryRecord.donor?.name || '無名氏',
      donorAddress: primaryRecord.donor?.address ?? undefined,
      donorPhone: primaryRecord.donor?.phone ?? undefined,
      items: allItems,
      date: new Date(primaryRecord.createdAt)
    };

    console.log('📋 收據資料:', {
      receiptNumber: receiptData.receiptNumber,
      donorName: receiptData.donorName,
      itemsCount: receiptData.items.length,
      items: receiptData.items
    });

    try {
      await this.drawReceiptLayout(receiptData);
      console.log('✅ 收據版面繪製完成');
    } catch (error) {
      console.error('❌ 收據版面繪製失敗:', error);
      throw error;
    }
  }

  private async generateReceiptNumber(): Promise<string> {
    // 使用API端點產生連續的報表ID：00001, 00002, 00003...
    try {
      const response = await fetch('/api/reports/generate-id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      return data.reportId;
    } catch (error) {
      console.error('Failed to generate report ID:', error);
      // 備用方案：如果API失敗，使用簡單的時間戳
      const now = new Date();
      const timestamp = now.getTime().toString().slice(-5);
      return timestamp.padStart(5, '0');
    }
  }

  private async drawReceiptLayout(data: ReceiptData): Promise<void> {
    console.log('🎨 開始繪製收據版面');
    
    // 頁面設定
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;

    console.log('📐 頁面設定:', { pageWidth, pageHeight, margin, contentWidth });

    try {
      // 1. 繪製標題區域
      console.log('1️⃣ 繪製標題區域');
      await this.drawHeader(margin, margin + 5, contentWidth, data.receiptNumber);

      // 2. 繪製機構資訊
      console.log('2️⃣ 繪製機構資訊');
      this.drawOrgInfo(margin, margin + 25);

      // 3. 繪製主標題
      console.log('3️⃣ 繪製主標題');
      this.drawMainTitle(margin, margin + 50, contentWidth);

      // 4. 繪製捐贈者資訊表格
      console.log('4️⃣ 繪製捐贈者資訊表格');
      const donorTableY = this.drawDonorInfo(margin, margin + 75, contentWidth, data);
      console.log('   捐贈者表格結束位置:', donorTableY);

      // 5. 繪製物品明細表格
      console.log('5️⃣ 繪製物品明細表格，物品數量:', data.items.length);
      const itemsTableY = this.drawItemsTable(margin, donorTableY + 10, contentWidth, data.items);
      console.log('   物品表格結束位置:', itemsTableY);

      // 6. 繪製簽名區域
      console.log('6️⃣ 繪製簽名區域');
      await this.drawSignatureArea(margin, itemsTableY + 15, contentWidth);

      // 7. 繪製日期
      console.log('7️⃣ 繪製日期');
      this.drawDate(margin, pageHeight - 40, contentWidth, data.date);
      
      console.log('✅ 版面繪製完成');
    } catch (error) {
      console.error('❌ 版面繪製過程中發生錯誤:', error);
      throw error;
    }
  }

  private async drawHeader(x: number, y: number, width: number, receiptNumber: string): Promise<void> {
    console.log('  📍 drawHeader:', { x, y, width, receiptNumber });
    
    // 機構標題
    this.setFont(18);
    console.log('  🏢 繪製機構標題');
    this.pdf.text(this.encodeText('社團法人苗栗縣社會福利促進協會'), x + width / 2, y, { align: 'center' });

    // 收據編號
    this.setFont(12);
    console.log('  🔢 繪製收據編號:', receiptNumber);
    this.pdf.text(`No.${receiptNumber}`, x + width - 50, y + 5);

    // 嘗試載入機構印章 (1.png)
    console.log('  🖼️ 載入機構印章 1.png');
    const orgSeal = await this.loadImage('/receipt/1.png');
    if (orgSeal) {
      console.log('  ✅ 機構印章載入成功，添加到PDF');
      this.pdf.addImage(orgSeal, 'PNG', x + width / 2 + 80, y - 8, 15, 15);
    } else {
      console.log('  ❌ 機構印章載入失敗');
    }
  }

  private drawOrgInfo(x: number, y: number): void {
    this.setFont(10);
    const orgInfo = [
      '地址：苗栗市福麗里第35鄰北安街22號',
      '郵局帳號：0291120000818865',
      '戶名：社團法人苗栗縣社會福利促進協會葉儀生'
    ];

    orgInfo.forEach((info, index) => {
      this.pdf.text(this.encodeText(info), x, y + index * 5);
    });
  }

  private drawMainTitle(x: number, y: number, width: number): void {
    console.log('  📍 drawMainTitle:', { x, y, width });
    
    // 繪製黑框
    console.log('  ⬛ 繪製標題黑框');
    this.drawBorder(x + width / 2 - 40, y - 3, 80, 12, 1);
    
    this.setFont(14);
    console.log('  📝 繪製主標題文字');
    this.pdf.text(this.encodeText('接受捐贈物品收據'), x + width / 2, y + 3, { align: 'center' });
  }

  private drawDonorInfo(x: number, y: number, width: number, data: ReceiptData): number {
    const tableWidth = width;
    const rowHeight = 12;

    // 第一行：姓名和統一編號
    this.pdf.setLineWidth(0.5);
    
    // 姓名欄位
    this.pdf.rect(x, y, 25, rowHeight);
    this.setFont(10);
    this.pdf.text(this.encodeText('姓名'), x + 12.5, y + rowHeight / 2, { align: 'center', baseline: 'middle' });
    
    this.pdf.rect(x + 25, y, tableWidth / 2 - 25, rowHeight);
    this.setFont(9);
    this.pdf.text(this.encodeText(data.donorName), x + 27, y + rowHeight / 2, { baseline: 'middle' });
    
    // 統一編號欄位
    this.pdf.rect(x + tableWidth / 2, y, 25, rowHeight);
    this.setFont(10);
    this.pdf.text(this.encodeText('統一編號'), x + tableWidth / 2 + 12.5, y + rowHeight / 2, { align: 'center', baseline: 'middle' });
    
    this.pdf.rect(x + tableWidth / 2 + 25, y, tableWidth / 2 - 25, rowHeight);
    this.setFont(9);
    // 統一編號通常為空，可以手寫填入
    this.pdf.text('', x + tableWidth / 2 + 27, y + rowHeight / 2, { baseline: 'middle' });

    // 第二行：地址和電話
    const secondRowY = y + rowHeight;
    
    // 地址欄位
    this.pdf.rect(x, secondRowY, 25, rowHeight);
    this.setFont(10);
    this.pdf.text(this.encodeText('地址'), x + 12.5, secondRowY + rowHeight / 2, { align: 'center', baseline: 'middle' });
    
    this.pdf.rect(x + 25, secondRowY, tableWidth / 2 - 25, rowHeight);
    this.setFont(9);
    const address = data.donorAddress || '';
    this.pdf.text(this.encodeText(address), x + 27, secondRowY + rowHeight / 2, { baseline: 'middle' });
    
    // 電話欄位
    this.pdf.rect(x + tableWidth / 2, secondRowY, 25, rowHeight);
    this.setFont(10);
    this.pdf.text(this.encodeText('電話'), x + tableWidth / 2 + 12.5, secondRowY + rowHeight / 2, { align: 'center', baseline: 'middle' });
    
    this.pdf.rect(x + tableWidth / 2 + 25, secondRowY, tableWidth / 2 - 25, rowHeight);
    this.setFont(9);
    const phone = data.donorPhone || '';
    this.pdf.text(this.encodeText(phone), x + tableWidth / 2 + 27, secondRowY + rowHeight / 2, { baseline: 'middle' });

    return secondRowY + rowHeight;
  }

  private drawItemsTable(x: number, y: number, width: number, items: ReceiptData['items']): number {
    const colWidth = width / 8; // 8欄設計
    const headerHeight = 12;
    const rowHeight = 10;
    
    // 繪製表頭
    this.setFont(10);
    this.pdf.setLineWidth(0.5);
    
    // 左側物品明細標題
    this.pdf.rect(x, y, width / 2, headerHeight);
    this.pdf.text(this.encodeText('物品明細'), x + width / 4, y + headerHeight / 2, { align: 'center', baseline: 'middle' });
    
    // 右側物品明細標題  
    this.pdf.rect(x + width / 2, y, width / 2, headerHeight);
    this.pdf.text(this.encodeText('物品明細'), x + 3 * width / 4, y + headerHeight / 2, { align: 'center', baseline: 'middle' });
    
    let currentY = y + headerHeight;
    
    // 繪製欄位標題
    const headers = ['物品名稱', '數量', '單位', '備註'];
    
    // 左側欄位標題
    for (let i = 0; i < 4; i++) {
      this.pdf.rect(x + i * colWidth, currentY, colWidth, headerHeight);
      this.setFont(9);
      this.pdf.text(this.encodeText(headers[i]), x + i * colWidth + colWidth / 2, currentY + headerHeight / 2, { 
        align: 'center', 
        baseline: 'middle' 
      });
    }
    
    // 右側欄位標題
    for (let i = 0; i < 4; i++) {
      this.pdf.rect(x + (i + 4) * colWidth, currentY, colWidth, headerHeight);
      this.setFont(9);
      this.pdf.text(this.encodeText(headers[i]), x + (i + 4) * colWidth + colWidth / 2, currentY + headerHeight / 2, { 
        align: 'center', 
        baseline: 'middle' 
      });
    }
    
    currentY += headerHeight;
    
    // 繪製物品資料行（至少4行）
    const maxRows = 4;
    for (let row = 0; row < maxRows; row++) {
      // 左側物品
      const leftItem = items[row * 2];
      for (let col = 0; col < 4; col++) {
        this.pdf.rect(x + col * colWidth, currentY, colWidth, rowHeight);
        if (leftItem) {
          this.setFont(8);
          let text = '';
          switch (col) {
            case 0: text = leftItem.name; break;
            case 1: text = leftItem.quantity.toString(); break;
            case 2: text = leftItem.unit; break;
            case 3: text = leftItem.notes || ''; break;
          }
          this.pdf.text(this.encodeText(text), x + col * colWidth + 1, currentY + rowHeight / 2, { baseline: 'middle' });
        }
      }
      
      // 右側物品
      const rightItem = items[row * 2 + 1];
      for (let col = 0; col < 4; col++) {
        this.pdf.rect(x + (col + 4) * colWidth, currentY, colWidth, rowHeight);
        if (rightItem) {
          this.setFont(8);
          let text = '';
          switch (col) {
            case 0: text = rightItem.name; break;
            case 1: text = rightItem.quantity.toString(); break;
            case 2: text = rightItem.unit; break;
            case 3: text = rightItem.notes || ''; break;
          }
          this.pdf.text(this.encodeText(text), x + (col + 4) * colWidth + 1, currentY + rowHeight / 2, { baseline: 'middle' });
        }
      }
      
      currentY += rowHeight;
    }
    
    return currentY;
  }

  private async drawSignatureArea(x: number, y: number, width: number): Promise<void> {
    this.setFont(12);
    
    // 理事長簽名區
    this.pdf.text(this.encodeText('理事長：'), x, y + 10);
    const chairmanSeal = await this.loadImage('/receipt/2.png');
    if (chairmanSeal) {
      this.pdf.addImage(chairmanSeal, 'PNG', x + 25, y, 20, 20);
    } else {
      // 繪製簽名框
      this.pdf.setLineWidth(1);
      this.pdf.rect(x + 25, y + 5, 40, 10);
    }
    
    // 經手人簽名區
    this.pdf.text(this.encodeText('經手人：'), x + width - 80, y + 10);
    const handlerSeal = await this.loadImage('/receipt/3.png');
    if (handlerSeal) {
      this.pdf.addImage(handlerSeal, 'PNG', x + width - 50, y, 20, 20);
    } else {
      // 繪製簽名框
      this.pdf.setLineWidth(1);
      this.pdf.rect(x + width - 50, y + 5, 40, 10);
    }
  }

  private drawDate(x: number, y: number, width: number, date: Date): void {
    const rocYear = date.getFullYear() - 1911; // 轉換為民國年
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    this.setFont(12);
    const dateText = `中華民國　${rocYear}　年　${month}　月　${day}　日`;
    this.pdf.text(this.encodeText(dateText), x + width / 2, y, { align: 'center' });
  }

  getBlob(): Blob {
    return this.pdf.output('blob');
  }

  download(filename: string = 'receipt.pdf'): void {
    this.pdf.save(filename);
  }
}

export async function generateReceiptsPDF(records: DonationRecord[]): Promise<Blob> {
  const generator = new ReceiptGenerator();
  
  // 將所有記錄合併成一張收據
  await generator.generateReceipt(records);
  
  return generator.getBlob();
}