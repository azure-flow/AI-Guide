// lib/branding.ts
// Helper to fetch site branding from WordPress sitelogo CPT

import { wpFetch } from './wpclient';
import { SITE_BRANDING_QUERY, FOOTER_SETTINGS_QUERY, FOOTER_SETTINGS_ALL_QUERY } from './queries';

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

