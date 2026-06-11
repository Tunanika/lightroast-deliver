import type { MetadataRoute } from "next";

// Private delivery service — never index any of it.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
