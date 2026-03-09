export type ReportItem = {
  slug: string;
  title: string;
  summary: string;
  category: string;
  status: "custom-only" | "published";
  coverImage: string;
  publishedAt: string;
  sections: {
    heading: string;
    paragraphs: string[];
    image?: string;
    imageAlt?: string;
  }[];
};

export const reports: ReportItem[] = [
  {
    slug: "ai-server-industry-evolution",
    title: "AI 伺服器產業演化趨勢",
    summary:
      "從技術路線、供應鏈結構與市場動能出發，整理 AI 伺服器相關產業的演化脈絡與觀察重點。",
    category: "產業演化趨勢",
    status: "custom-only",
    coverImage: "/images/reports/ai-server-cover.jpg",
    publishedAt: "2026-03-09",
    sections: [
      {
        heading: "報告摘要",
        paragraphs: [
          "AI 伺服器產業的核心驅動力來自高算力需求、資料中心擴張與模型推論規模化。這使得 GPU、HBM、先進封裝與高速互連成為觀察產業演化的重要節點。",
          "本報告以產業演化角度切入，整理 AI 伺服器相關供應鏈、技術路線與潛在競爭格局，作為後續投資研究與技術判讀的基礎。",
        ],
        image: "/images/reports/ai-server-cover.jpg",
        imageAlt: "AI 伺服器產業演化趨勢封面示意圖",
      },
      {
        heading: "觀察重點",
        paragraphs: [
          "第一，算力需求成長正在改變伺服器架構，並推升高頻寬記憶體、先進封裝與散熱技術的重要性。",
          "第二，供應鏈競爭不再只集中在晶片設計本身，而是延伸到封裝、材料、光互連與系統整合能力。",
          "第三，隨著企業導入 AI 應用場景增加，未來市場將更重視成本效率、推論部署與資料中心可擴充性。",
        ],
      },
      {
        heading: "後續延伸方向",
        paragraphs: [
          "此類報告未來可進一步結合專利摘要、公司技術定位與 API 資料服務，形成更完整的研究型產品架構。",
          "目前深度解析報告僅接受客製預定，後續可延伸為標準化圖文研究報告頁。",
        ],
      },
    ],
  },
  {
    slug: "advanced-packaging-technology-path",
    title: "先進封裝技術路徑整理",
    summary:
      "整理先進封裝相關技術的主要演進方向，包含高密度互連、異質整合、散熱與高頻傳輸等觀察重點。",
    category: "精選專利摘要",
    status: "custom-only",
    coverImage: "/images/reports/advanced-packaging-cover.jpg",
    publishedAt: "2026-03-09",
    sections: [
      {
        heading: "報告摘要",
        paragraphs: [
          "先進封裝已從單純後段製程角色，逐步上升為高效能運算與 AI 系統架構中的核心技術節點。",
          "本報告整理高密度互連、異質整合、散熱管理與高頻訊號傳輸等主要技術路徑，作為理解封裝技術主流方向的基礎。",
        ],
        image: "/images/reports/advanced-packaging-cover.jpg",
        imageAlt: "先進封裝技術路徑整理封面示意圖",
      },
      {
        heading: "主要技術方向",
        paragraphs: [
          "第一，高密度互連技術持續推進，以支撐更高 I/O 密度與更短傳輸距離。",
          "第二，異質整合成為系統層級優化的重要方法，使不同功能晶粒可在封裝層面協同設計。",
          "第三，隨著功耗與訊號完整性要求提高，散熱設計與高頻傳輸能力成為競爭關鍵。",
        ],
      },
      {
        heading: "研究延伸",
        paragraphs: [
          "先進封裝主題可進一步結合專利地圖、供應鏈分析與公司技術定位，形成更完整的深度報告。",
          "目前此類報告內容以研究示例形式呈現，實際商業服務仍以客製預定為主。",
        ],
      },
    ],
  },
];
