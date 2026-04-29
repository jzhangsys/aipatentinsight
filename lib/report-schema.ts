import { z } from "zod";

export const FAQSchema = z.object({
  question: z.string().min(1, "question required"),
  answer: z.string().min(1, "answer required"),
});

export const SectionSchema = z.object({
  heading: z.string().min(1, "heading required"),
  paragraphs: z.array(z.string().min(1)).min(1, "at least one paragraph"),
});

export const ReportSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  category: z.string().min(1),
  status: z.enum(["custom-only", "published", "draft"]).catch("custom-only"),
  coverImage: z.string().min(1),
  publishedAt: z.string().min(1),
  aiSummary: z.array(z.string().min(1)).default([]),
  faqs: z.array(FAQSchema).default([]),
  sections: z.array(SectionSchema).default([]),
});

export type FAQItem = z.infer<typeof FAQSchema>;
export type SectionItem = z.infer<typeof SectionSchema>;
export type ReportItem = z.infer<typeof ReportSchema>;
