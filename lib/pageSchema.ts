import { siteConfig } from "@/lib/site";

export function getWebPageSchema(input: {
  title: string;
  description: string;
  path?: string;
}) {
  const url = input.path ? `${siteConfig.url}${input.path}` : siteConfig.url;

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: input.title,
    description: input.description,
    url,
    inLanguage: "zh-Hant",
    isPartOf: {
      "@type": "WebSite",
      name: siteConfig.name,
      url: siteConfig.url,
    },
  };
}

export function getCollectionPageSchema(input: {
  title: string;
  description: string;
  path: string;
}) {
  const url = `${siteConfig.url}${input.path}`;

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.title,
    description: input.description,
    url,
    inLanguage: "zh-Hant",
    isPartOf: {
      "@type": "WebSite",
      name: siteConfig.name,
      url: siteConfig.url,
    },
  };
}
