import Link from "next/link";
import Container from "./(components)/Container";
import PrimaryHeader from "@/components/site-header/PrimaryHeader";
import SiteFooter from "@/components/SiteFooter";
import { wpFetch } from "../lib/wpclient";
import {
  ALL_TAG_SLUGS,
  NAV_MENU_POSTS_QUERY,
  ALL_TOOLS_QUERY,
} from "../lib/queries";
import { buildNavGroups, NavMenuPostNode } from "@/lib/nav-groups";
import { getSiteBranding, type SiteBranding } from "@/lib/branding";

export default async function NotFound() {
  // Fetch header data (same as homepage)
  let allTags: Array<{ name: string; slug: string }> = [];
  let navGroups: ReturnType<typeof buildNavGroups> = [];
  let branding: SiteBranding = {
    siteName: "AI Plaza",
    siteLogo: null,
  };
  let searchTools: Array<{ title: string; slug: string }> = [];

  try {
    const [allTagRes, navMenuRes, brandingData, allToolsData] = await Promise.all([
      wpFetch<{ tags: { nodes: { name: string; slug: string }[] } }>(
        ALL_TAG_SLUGS,
        {},
        { revalidate: 3600 }
      ).catch(() => ({ tags: { nodes: [] } })),
      wpFetch<{ posts: { nodes: NavMenuPostNode[] } }>(
        NAV_MENU_POSTS_QUERY,
        { first: 200 },
        { revalidate: 3600 }
      ).catch(() => ({ posts: { nodes: [] } })),
      getSiteBranding().catch(() => ({ siteName: "AI Plaza", siteLogo: null })),
      wpFetch<{ posts: { nodes: any[] } }>(
        ALL_TOOLS_QUERY,
        { first: 200 },
        { revalidate: 3600 }
      ).catch(() => ({ posts: { nodes: [] } })),
    ]);

    allTags = allTagRes?.tags?.nodes ?? [];
    navGroups = buildNavGroups(navMenuRes?.posts?.nodes ?? []);
    branding = brandingData;
    const allTools = allToolsData?.posts?.nodes ?? [];
    searchTools = allTools.map((t: any) => ({
      title: t.title as string,
      slug: t.slug as string,
    }));
  } catch (error) {
    console.error("Error fetching header data for 404 page:", error);
    // Use fallback values already set above
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header - Same as homepage */}
      <PrimaryHeader
        tags={allTags}
        navGroups={navGroups}
        siteName={branding.siteName}
        siteLogo={branding.siteLogo}
        tools={searchTools}
      />

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center py-20">
        <Container>
          <div className="text-center max-w-2xl mx-auto">
            {/* 404 Number */}
            <div className="mb-8">
              <h1 className="text-9xl font-bold bg-gradient-to-r from-[#6EA6FF] via-[#7EC7FF] to-[#8CEBFF] bg-clip-text text-transparent">
                404
              </h1>
            </div>

            {/* Error Message */}
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Page Not Found
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              The page you're looking for doesn't exist or has been moved.
              Let's get you back on track.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/"
                className="inline-flex items-center justify-center px-8 py-3 text-base font-semibold text-white rounded-lg transition-colors shadow-md hover:shadow-lg hover:opacity-90"
                style={{ backgroundColor: "#1466F6" }}
              >
                Go to Homepage
              </Link>
              <Link
                href="/articles"
                className="inline-flex items-center justify-center px-8 py-3 text-base font-semibold text-gray-700 bg-white rounded-lg border border-gray-300 transition-colors hover:bg-gray-50"
              >
                Browse Articles
              </Link>
            </div>

            {/* Helpful Links */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-4">You might be looking for:</p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  href="/collection/trending"
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Trending Tools
                </Link>
                <span className="text-gray-300">•</span>
                <Link
                  href="/articles"
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                >
                  All Articles
                </Link>
                <span className="text-gray-300">•</span>
                <Link
                  href="/#reviews"
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                >
                  All Reviews
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </main>

      {/* Footer - Same as homepage */}
      <SiteFooter
        sections={[
          {
            title: "Collections",
            items: [
              { label: "All AI Tools", href: "/#reviews" },
              { label: "Trending", href: "/#reviews" },
              { label: "New Releases", href: "/#reviews" },
            ],
          },
          {
            title: "Blog Highlights",
            items: [{ label: "All Articles", href: "/articles" }],
          },
          {
            title: "Topics",
            items: [
              { label: "Guides", href: "/articles" },
              { label: "Case Studies", href: "/articles" },
            ],
          },
        ]}
      />
    </div>
  );
}

