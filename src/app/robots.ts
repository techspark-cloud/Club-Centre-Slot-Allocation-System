import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/student/'], // Hide private dashboards & APIs from Google
    },
    sitemap: 'https://techspark-slots.vercel.app/sitemap.xml',
  };
}
