// ============================================================================
// FILE: app/collection/[slug]/page.tsx
// PURPOSE: Collection page showing all tools with a specific tag
// ============================================================================

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Home } from 'lucide-react';
import {
    ALL_TAG_SLUGS,
    TAGS_QUERY,
    TAG_BY_SLUG_QUERY,
    TOOLS_BY_TAG_QUERY,
    NAV_MENU_POSTS_QUERY,
    REVIEWS_BY_POST_ID_QUERY,
    TOOLS_BY_DATE_DESC_QUERY
} from '../../../lib/queries';
import { wpFetch } from '../../../lib/wpclient';
import Container from '../../(components)/Container';
import CollectionPageContentWithSearch from './CollectionPageContentWithSearch';
import CollectionSearchBarWrapper from './CollectionSearchBarWrapper';
import { FilteredToolsProvider } from './FilteredToolsContext';
import PrimaryHeader from '@/components/site-header/PrimaryHeader';
import { buildNavGroups, NavMenuPostNode } from '@/lib/nav-groups';
import { getSiteBranding, getMegaphoneIcon, getTopCardSettings } from '@/lib/branding';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface CollectionPageProps {
    params: {
        slug: string;
    };
}

interface TagData {
    tag: {
        id: string;
        name: string;
        slug: string;
        description?: string;
        count: number;
    };
}

interface ToolsData {
    posts: {
        nodes: Array<{
            id: string;
            databaseId: number;
            title: string;
            slug: string;
            excerpt: string;
            featuredImage?: {
                node: {
                    sourceUrl: string;
                };
            };
            aiToolMeta?: {
                logo?: {
                    node: {
                        sourceUrl: string;
                        altText?: string;
                    };
                };
                keyFindingsRaw?: string;
            };
            tags?: {
                nodes: Array<{
                    name: string;
                    slug: string;
                }>;
            };
        }>;
    };
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default async function CollectionPage({ params }: CollectionPageProps) {
    let { slug } = params;

    // Fetch current tag data
    let tagData: TagData | null = null;
    let tag: TagData['tag'];

    try {
        tagData = await wpFetch<TagData>(TAG_BY_SLUG_QUERY, { slug }, { revalidate: 3600 });

        if (!tagData?.tag) {
            // Create a fallback tag object with formatted slug as name
            const formattedName = slug
                .split('-')
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            tag = {
                id: slug,
                name: formattedName,
                slug: slug,
                description: undefined,
                count: 0
            };
        } else {
            tag = tagData.tag;
        }
    } catch (error) {
        console.error('❌ Error fetching tag:', error);
        // Create a fallback tag object instead of showing 404
        const formattedName = slug
            .split('-')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        tag = {
            id: slug,
            name: formattedName,
            slug: slug,
            description: undefined,
            count: 0
        };
    }

    // Fetch all data in parallel for faster loading
    // Special handling for "new" slug - get first 9 tools sorted by date ASC
    const toolsQuery =
        slug === 'new'
            ? wpFetch<ToolsData>(TOOLS_BY_DATE_DESC_QUERY, {}, { revalidate: 3600 })
            : wpFetch<ToolsData>(TOOLS_BY_TAG_QUERY, { tag: [slug] }, { revalidate: 3600 });

    const [toolsData, allTagRes, navMenuRes, branding, tagsWithCountRes, allReviewsData, megaphoneIcon, topCardSettings] =
        await Promise.all([
            toolsQuery.catch(() => ({
                posts: { nodes: [] }
            })),
            wpFetch<{ tags: { nodes: { name: string; slug: string }[] } }>(ALL_TAG_SLUGS, {}, { revalidate: 3600 }),
            wpFetch<{ posts: { nodes: NavMenuPostNode[] } }>(
                NAV_MENU_POSTS_QUERY,
                { first: 200 },
                { revalidate: 3600 }
            ),
            getSiteBranding(),
            wpFetch<{ 
                posts: { 
                    nodes: Array<{ 
                        tags: { 
                            nodes: Array<{ id: string; name: string; slug: string }> 
                        } 
                    }> 
                } 
            }>(
                TAGS_QUERY,
                {},
                { revalidate: 3600 }
            ),
            wpFetch<{
                reviews: {
                    nodes: Array<{
                        reviewerMeta: {
                            starRating: number;
                            relatedTool?: {
                                nodes: Array<{ databaseId: number }>;
                            };
                        };
                    }>;
                };
            }>(REVIEWS_BY_POST_ID_QUERY, {}, { revalidate: 3600 }).catch(() => ({ reviews: { nodes: [] } })),
            getMegaphoneIcon(),
            getTopCardSettings()
        ]);

    console.log(toolsData?.posts?.nodes?.length, 'toolsData');

    const tools = toolsData?.posts?.nodes ?? [];
    const allTags = allTagRes?.tags?.nodes ?? [];
    const navGroups = buildNavGroups(navMenuRes?.posts?.nodes ?? []);
    
    // Aggregate tags from ai-review posts and count occurrences
    const tagMap = new Map<string, { id: string; name: string; slug: string; count: number }>();
    
    tagsWithCountRes?.posts?.nodes?.forEach((post) => {
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

    // Convert to array, sort based on settings
    const tagsWithCountRaw = Array.from(tagMap.values());
    let tagsWithCount: typeof tagsWithCountRaw;
    
    if (topCardSettings.sorting === 'title') {
        // Sort alphabetically by name
        tagsWithCount = [...tagsWithCountRaw].sort((a, b) => {
            if (a.slug === 'new') return -1;
            if (b.slug === 'new') return 1;
            return a.name.localeCompare(b.name);
        });
    } else {
        // Sort by count descending (default)
        tagsWithCount = [...tagsWithCountRaw].sort((a, b) => {
            if (a.slug === 'new') return -1;
            if (b.slug === 'new') return 1;
            return b.count - a.count;
        });
    }
    
    // Limit to displayAmount
    tagsWithCount = tagsWithCount.slice(0, topCardSettings.displayAmount);
    const allReviews = allReviewsData?.reviews?.nodes ?? [];

    // Calculate average rating for each tool
    const toolRatings: Record<number, number> = {};
    tools.forEach((tool: any) => {
        const toolReviews = allReviews.filter((review) => {
            const relatedToolId = review.reviewerMeta?.relatedTool?.nodes?.[0]?.databaseId;
            return relatedToolId === tool.databaseId;
        });

        if (toolReviews.length > 0) {
            const avgRating = toolReviews.reduce((sum, r) => sum + r.reviewerMeta.starRating, 0) / toolReviews.length;
            toolRatings[tool.databaseId] = avgRating;
        }
    });

    return (
        <div className="min-h-screen bg-white">
            <PrimaryHeader
                tags={allTags}
                navGroups={navGroups}
                siteName={branding.siteName}
                siteLogo={branding.siteLogo}
                tools={tools.map((t) => ({ title: t.title, slug: t.slug }))}
            />

            {/* Breadcrumb */}
            <div className="bg-white border-b">
                <Container>
                    <div className="flex items-center gap-2 text-sm text-gray-600 py-3">
                        <Link href="/" className="hover:text-blue-600 flex items-center gap-1 flex-shrink-0">
                            <Home className="w-4 h-4 text-blue-600" />
                        </Link>
                        <span className="flex-shrink-0">/</span>
                        <span className="text-blue-600 flex-shrink-0">{tag.name}</span>
                        {tools.length > 0 && (
                            <>
                                <span className="flex-shrink-0">/</span>
                                <span className="text-gray-900 truncate">{tools[0].title}</span>
                            </>
                        )}
                    </div>
                </Container>
            </div>

            {/* Search and Tools List - Client Component */}
            {tools.length === 0 ? (
                <section className="py-12">
                    <Container>
                        <div className="text-center py-16">
                            <div className="mb-6">
                                <svg
                                    className="w-24 h-24 mx-auto text-gray-300"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={1.5}
                                        d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-3">No tools found for "{tag.name}"</h2>
                            <p className="text-gray-500 text-lg mb-6">
                                {tag.count === 0 && !tagData?.tag
                                    ? "This collection doesn't exist yet or has no tools."
                                    : 'This collection is currently empty.'}
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Link
                                    href="/"
                                    className="inline-flex items-center justify-center px-6 py-3 text-base font-semibold text-white rounded-lg transition-colors shadow-md hover:shadow-lg hover:opacity-90"
                                    style={{ backgroundColor: '#1466F6' }}
                                >
                                    ← Back to Home
                                </Link>
                                <Link
                                    href="/collection/new"
                                    className="inline-flex items-center justify-center px-6 py-3 text-base font-semibold text-gray-700 bg-white rounded-lg border border-gray-300 transition-colors hover:bg-gray-50"
                                >
                                    Browse New Tools
                                </Link>
                            </div>
                        </div>
                    </Container>
                </section>
            ) : (
                <FilteredToolsProvider initialTools={tools}>
                    {/* Blue category cards (match homepage) */}
                    <section className="py-8">
                        <Container>
                            <div className="grid grid-cols-5 gap-y-4 justify-items-center">
                                {tagsWithCount.map((t) => (
                                    <Link
                                        key={t.slug}
                                        href={`/collection/${t.slug}`}
                                        className="rounded-lg transition-colors shadow-md relative overflow-hidden hover:opacity-90"
                                        style={{ 
                                            width: '175px', 
                                            height: '115px',
                                            backgroundColor: topCardSettings.bgColor
                                        }}
                                    >
                                        {/* Icon in top-left */}
                                        <div className="absolute top-3 left-4">
                                            {megaphoneIcon ? (
                                                <Image
                                                    src={megaphoneIcon.sourceUrl}
                                                    alt={megaphoneIcon.altText || 'Category icon'}
                                                    width={40}
                                                    height={40}
                                                    className="w-10 h-10 object-contain"
                                                />
                                            ) : (
                                                <svg
                                                    className="w-10 h-10 opacity-60"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                    strokeWidth="1.5"
                                                    style={{ color: topCardSettings.textColor }}
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        d="M4.5 10.5L18.5 5.5v13L4.5 13.5v-3z"
                                                    />
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        d="M4.5 10.5c-1 0-1.5.5-1.5 1.5s.5 1.5 1.5 1.5"
                                                    />
                                                    <circle cx="2.5" cy="12" r="1.5" fill="currentColor" />
                                                </svg>
                                            )}
                                        </div>
                                        {/* Left-aligned text */}
                                        <div className="absolute left-4 top-14 right-3 flex flex-col">
                                            <h3
                                                className="font-bold mb-0.5 truncate"
                                                title={t.name}
                                                style={{ 
                                                    color: topCardSettings.textColor,
                                                    fontSize: topCardSettings.fontSize
                                                }}
                                            >
                                                {t.name}
                                            </h3>
                                            {t.slug !== 'new' && (
                                                <p 
                                                    className="text-[10px] tracking-wide opacity-70"
                                                    style={{ color: topCardSettings.textColor }}
                                                >
                                                    {t.count} LISTING
                                                </p>
                                            )}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </Container>
                    </section>

                    {/* Search Bar - below blue boxes for filtering */}
                    <section className="py-8 bg-white">
                        <Container>
                            <div className="max-w-3xl mx-auto">
                                <CollectionSearchBarWrapper tags={allTags} tools={tools} />
                            </div>
                        </Container>
                    </section>

                    <CollectionPageContentWithSearch tools={tools} toolRatings={toolRatings} />
                </FilteredToolsProvider>
            )}
        </div>
    );
}

// ============================================================================
// ISR CONFIGURATION
// ============================================================================

export const revalidate = 3600;
export const dynamicParams = true; // Allow dynamic params beyond static generation

// ============================================================================
// GENERATE STATIC PARAMS (Optional - for static generation of known collections)
// ============================================================================

export async function generateStaticParams() {
    // Pre-generate the most common collection pages at build time for instant loading
    try {
        const tagsData = await wpFetch<{ tags: { nodes: Array<{ slug: string }> } }>(
            TAGS_QUERY,
            {},
            { revalidate: 3600 }
        );

        const tags = tagsData?.tags?.nodes ?? [];

        // Generate static pages for all tags
        return tags.map((tag) => ({
            slug: tag.slug
        }));
    } catch (error) {
        console.error('Error in generateStaticParams:', error);
        return [];
    }
}
