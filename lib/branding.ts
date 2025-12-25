// lib/branding.ts
// Helper to fetch site branding from WordPress sitelogo CPT

import { wpFetch } from './wpclient';
import { SITE_BRANDING_QUERY, FOOTER_SETTINGS_QUERY, FOOTER_SETTINGS_ALL_QUERY, TAGS_QUERY, HIGHLIGHTED_BLOG_POSTS_QUERY } from './queries';

export interface SiteBranding {
  siteName: string;
  siteLogo: {
    sourceUrl: string;
    altText?: string;
  } | null;
}

export async function getSiteBranding(): Promise<SiteBranding> {
  try {
    const data = await wpFetch<{
      sitelogos: {
        nodes: Array<{
          title: string;
          homepage?: {
            sitename?: string | null;
            sitelogo?: {
              node?: {
                sourceUrl: string;
                altText?: string;
              } | null;
            } | null;
          } | null;
        }>;
      };
    }>(SITE_BRANDING_QUERY, {}, { revalidate: 3600 });

    // Filter out the megaphone post - find the one that's NOT "megaphone" (case insensitive)
    const brandingPost = data?.sitelogos?.nodes?.find(
      (post) => post.title.toLowerCase() !== 'megaphone' && post.homepage
    ) || data?.sitelogos?.nodes?.find((post) => post.homepage);
    
    if (brandingPost && brandingPost.homepage) {
      const branding = {
        siteName: brandingPost.homepage.sitename || brandingPost.title || 'AI Plaza',
        siteLogo: brandingPost.homepage.sitelogo?.node
          ? {
              sourceUrl: brandingPost.homepage.sitelogo.node.sourceUrl,
              altText: brandingPost.homepage.sitelogo.node.altText || 'Site logo',
            }
          : null,
      };

      return branding;
    } else {
      console.warn('[Branding] No sitelogo posts found in WordPress or homepage field group is empty');
    }
  } catch (error) {
    console.error('[Branding] Failed to load site branding from WordPress:', error);
  }

  // Fallback to defaults
  return {
    siteName: 'AI Plaza',
    siteLogo: null,
  };
}

// Get megaphone icon for blue cards
export async function getMegaphoneIcon(): Promise<{
  sourceUrl: string;
  altText?: string;
} | null> {
  try {
    const data = await wpFetch<{
      sitelogos: {
        nodes: Array<{
          title: string;
          homepage?: {
            sitelogo?: {
              node?: {
                sourceUrl: string;
                altText?: string;
              } | null;
            } | null;
          } | null;
        }>;
      };
    }>(SITE_BRANDING_QUERY, {}, { revalidate: 3600 });

    // Find the megaphone post
    const megaphonePost = data?.sitelogos?.nodes?.find(
      (post) => post.title.toLowerCase() === 'megaphone' && post.homepage?.sitelogo?.node
    );
    
    if (megaphonePost?.homepage?.sitelogo?.node) {
      return {
        sourceUrl: megaphonePost.homepage.sitelogo.node.sourceUrl,
        altText: megaphonePost.homepage.sitelogo.node.altText || 'Megaphone icon',
      };
    }
  } catch (error) {
    console.error('[Branding] Failed to load megaphone icon from WordPress:', error);
  }

  return null;
}

// Get footer labels from footer_setting taxonomy
export interface FooterLabels {
  collections: string;
  blogHighlights: string;
  topics: string;
}

export async function getFooterLabels(): Promise<FooterLabels> {
  try {
    // The taxonomy name is footer_setting and it's attached to pages
    let data: any;
    let terms: Array<{ name: string; slug: string }> = [];

    try {
      // Query footerSettings (plural) - collection of terms
      data = await wpFetch<{ footerSettings?: { nodes: Array<{ name: string; slug: string }> } }>(
        FOOTER_SETTINGS_QUERY,
        {},
        { revalidate: 3600 }
      );
      terms = data?.footerSettings?.nodes ?? [];

      // If no terms found, try getting all terms and filter manually
      if (terms.length === 0) {
        console.log('[Footer Labels] No terms from filtered query, trying all terms...');
        try {
          data = await wpFetch<{ footerSettings?: { nodes: Array<{ name: string; slug: string }> } }>(
            FOOTER_SETTINGS_ALL_QUERY,
            {},
            { revalidate: 3600 }
          );
          const allTerms = data?.footerSettings?.nodes ?? [];
          // Filter by slug
          terms = allTerms.filter((term: { name: string; slug: string }) => 
            ['collection', 'blog_highlights', 'topics'].includes(term.slug)
          );
        } catch (allTermsError) {
          console.warn('[Footer Labels] Could not fetch all terms:', allTermsError);
        }
      }
    } catch (error) {
      console.error('[Footer Labels] Error fetching footerSettings taxonomy:', error);
    }

    // Map terms by slug to get labels
    const collectionTerm = terms.find((term) => term.slug === 'collection');
    const blogHighlightsTerm = terms.find((term) => term.slug === 'blog_highlights');
    const topicsTerm = terms.find((term) => term.slug === 'topics');

    return {
      collections: collectionTerm?.name || 'Collections',
      blogHighlights: blogHighlightsTerm?.name || 'Blog Highlights',
      topics: topicsTerm?.name || 'Topics'
    };
  } catch (error) {
    console.error('[Footer Labels] Failed to load footer labels from WordPress:', error);
    // Fallback to defaults
    return {
      collections: 'Collections',
      blogHighlights: 'Blog Highlights',
      topics: 'Topics'
    };
  }
}

// Footer section data structure
export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterSection {
  title: string;
  items: FooterLink[];
}

// Build footer sections with new data fetching method
export async function getFooterSections(): Promise<FooterSection[]> {
  const footerLabels = await getFooterLabels();
  
  // 1. Collections: Get all tags used in ai-review posts, sorted by count (most to least), max 10
  let collectionLinks: FooterLink[] = [];
  try {
    const tagsPostsData = await wpFetch<{ 
      posts: { 
        nodes: Array<{ 
          tags: { 
            nodes: Array<{ id: string; name: string; slug: string }> 
          } 
        }> 
      } 
    }>(TAGS_QUERY, {}, { revalidate: 3600 });

    // Aggregate tags from posts and count occurrences
    const tagMap = new Map<string, { id: string; name: string; slug: string; count: number }>();
    
    tagsPostsData?.posts?.nodes?.forEach((post) => {
      post.tags?.nodes?.forEach((tag) => {
        const existing = tagMap.get(tag.slug);
        if (existing) {
          existing.count += 1;
        } else {
          tagMap.set(tag.slug, {
            id: tag.id,
            name: tag.name,
            slug: tag.slug,
            count: 1
          });
        }
      });
    });

    // Sort by count descending and take first 10
    collectionLinks = Array.from(tagMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(tag => ({
        label: tag.name,
        href: `/collection/${tag.slug}`
      }));
  } catch (error) {
    console.error('[Footer] Error fetching collections:', error);
    collectionLinks = [
      { label: "All AI Tools", href: "/#reviews" },
      { label: "Trending", href: "/#reviews" },
      { label: "New Releases", href: "/#reviews" }
    ];
  }

  // 2. Blog Highlights: Get blog posts with highlight: true, max 15
  let blogLinks: FooterLink[] = [];
  try {
    const highlightedPostsData = await wpFetch<{
      posts: {
        nodes: Array<{
          id: string;
          slug: string;
          title: string;
          blog?: {
            hightlight?: boolean; // Note: field name has typo in WordPress schema
          } | null;
        }>;
      };
    }>(HIGHLIGHTED_BLOG_POSTS_QUERY, { first: 15 }, { revalidate: 3600 });

    // Filter posts where hightlight is true (note: field name has typo in WordPress)
    blogLinks = highlightedPostsData?.posts?.nodes
      ?.filter(post => post.blog?.hightlight === true)
      .slice(0, 15)
      .map(post => ({
        label: post.title,
        href: `/blog/${post.slug}`
      })) ?? [];
    
    if (blogLinks.length === 0) {
      blogLinks = [{ label: "All Articles", href: "/articles" }];
    }
  } catch (error) {
    console.error('[Footer] Error fetching blog highlights:', error);
    blogLinks = [{ label: "All Articles", href: "/articles" }];
  }

  // 3. Topics: Keep current logic - tags from ai-review posts, max 8
  let topicLinks: FooterLink[] = [];
  try {
    const tagsPostsData = await wpFetch<{ 
      posts: { 
        nodes: Array<{ 
          tags: { 
            nodes: Array<{ name: string; slug: string }> 
          } 
        }> 
      } 
    }>(TAGS_QUERY, {}, { revalidate: 3600 });

    // Aggregate unique tags from posts
    const tagSet = new Set<string>();
    const allTags: Array<{ name: string; slug: string }> = [];
    
    tagsPostsData?.posts?.nodes?.forEach((post) => {
      post.tags?.nodes?.forEach((tag) => {
        if (!tagSet.has(tag.slug)) {
          tagSet.add(tag.slug);
          allTags.push({ name: tag.name, slug: tag.slug });
        }
      });
    });

    topicLinks = allTags.slice(0, 8).map(tag => ({
      label: tag.name,
      href: `/articles?tag=${tag.slug}`
    }));

    if (topicLinks.length === 0) {
      topicLinks = [
        { label: "Guides", href: "/articles" },
        { label: "Case Studies", href: "/articles" }
      ];
    }
  } catch (error) {
    console.error('[Footer] Error fetching topics:', error);
    topicLinks = [
      { label: "Guides", href: "/articles" },
      { label: "Case Studies", href: "/articles" }
    ];
  }

  return [
    {
      title: footerLabels.collections,
      items: collectionLinks
    },
    {
      title: footerLabels.blogHighlights,
      items: blogLinks
    },
    {
      title: footerLabels.topics,
      items: topicLinks
    }
  ];
}

