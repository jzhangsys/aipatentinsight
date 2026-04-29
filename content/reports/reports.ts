export type ReportItem = {
  slug: string;
  title: string;
  summary: string;
  category: string;
  status: "custom-only" | "published";
  coverImage: string;
  publishedAt: string;
  aiSummary?: string[];
  faqs?: {
    question: string;
    answer: string;
  }[];
  sections: {
    heading: string;
    paragraphs: string[];
    image?: string;
    imageAlt?: string;
  }[];
};

export const reports: ReportItem[] = [];
