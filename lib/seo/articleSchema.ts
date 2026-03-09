type ArticleSchemaInput = {
  title: string;
  description: string;
  url: string;
  image?: string;
  datePublished: string;
};

export function createArticleSchema({
  title,
  description,
  url,
  image,
  datePublished,
}: ArticleSchemaInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    image,
    author: {
      "@type": "Organization",
      name: "AI Patent Insight",
    },
    publisher: {
      "@type": "Organization",
      name: "AI Patent Insight",
      logo: {
        "@type": "ImageObject",
        url: "https://www.aipatentinsight.com/images/reports/ai-server-cover.jpg",
      },
    },
    datePublished,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
  };
}
