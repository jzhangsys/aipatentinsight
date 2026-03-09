export const siteUrl = "https://www.aipatentinsight.com";
export const siteName = "AI Patent Insight";

export function getOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteName,
    url: siteUrl,
  };
}

export function getWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: siteUrl,
    inLanguage: "zh-Hant",
    publisher: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl,
    },
  };
}

export function getHomepageSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "首頁",
    url: siteUrl,
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: siteUrl,
    },
    about: [
      "產業演化趨勢",
      "精選專利摘要",
      "精選公司簡介",
      "API 服務",
      "深度解析報告",
    ],
    inLanguage: "zh-Hant",
  };
}

export function getWebPageSchema(input: {
  name: string;
  description: string;
  url: string;
  about?: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: input.name,
    description: input.description,
    url: input.url,
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: siteUrl,
    },
    about: input.about,
    inLanguage: "zh-Hant",
  };
}

export function getCollectionPageSchema(input: {
  name: string;
  description: string;
  url: string;
  itemNames: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.name,
    description: input.description,
    url: input.url,
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: siteUrl,
    },
    about: input.itemNames,
    inLanguage: "zh-Hant",
  };
}

export function getArticleSchema(input: {
  title: string;
  description: string;
  url: string;
  datePublished: string;
  image?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description,
    url: input.url,
    datePublished: input.datePublished,
    author: {
      "@type": "Organization",
      name: siteName,
    },
    publisher: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl,
    },
    image: input.image ? [input.image] : undefined,
    inLanguage: "zh-Hant",
  };
}
