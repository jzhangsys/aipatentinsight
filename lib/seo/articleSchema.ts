export function createArticleSchema({
  title,
  description,
  url,
  image,
  datePublished,
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: description,
    image: image,
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
    datePublished: datePublished,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
  };
}
