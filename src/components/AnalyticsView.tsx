"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExternalLink, Maximize2 } from "lucide-react";

const REPORT_URL =
  "https://lookerstudio.google.com/embed/reporting/9965dcaa-d77d-4e34-9ed4-80342731e830/page/ibvbF";

export function AnalyticsView() {
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);

  const handleOpenInNewTab = useCallback(() => {
    window.open(REPORT_URL, "_blank", "noopener,noreferrer");
  }, []);

  return (
    <>
      <section className="flex flex-col gap-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold leading-tight">資料分析圖表</h2>
            <p className="text-sm text-muted-foreground">
              即時檢視庫存成長、類別分佈與統計趨勢。若需要更大畫面，可放大全螢幕或前往新分頁。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenInNewTab}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              新分頁開啟
            </Button>
            <Button
              size="sm"
              onClick={() => setIsFullscreenOpen(true)}
              className="flex items-center gap-2"
            >
              <Maximize2 className="h-4 w-4" />
              全螢幕瀏覽
            </Button>
          </div>
        </header>

        <div className="overflow-hidden rounded-lg border bg-background shadow-sm">
          <iframe
            src={REPORT_URL}
            className="aspect-[4/3] w-full border-0 sm:aspect-[16/9]"
            allowFullScreen
            loading="lazy"
            title="資料分析圖表"
          />
        </div>
      </section>

      <Dialog open={isFullscreenOpen} onOpenChange={setIsFullscreenOpen}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 overflow-hidden border-0">
          <DialogHeader className="sr-only">
            <DialogTitle>資料分析圖表全螢幕</DialogTitle>
          </DialogHeader>
          <iframe
            src={REPORT_URL}
            className="h-full w-full border-0"
            allowFullScreen
            loading="lazy"
            title="資料分析圖表全螢幕"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
