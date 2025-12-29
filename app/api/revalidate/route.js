// app/api/revalidate/route.js
import { revalidatePath, revalidateTag } from 'next/cache'

/** GETでも再検証できるように（切り分け用&簡易テスト用）
 *  例: /api/revalidate?secret=TOKEN&path=/
 *  例: /api/revalidate?secret=TOKEN&all=true (revalidates all)
 */
export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('secret')
  if (token !== process.env.REVALIDATE_SECRET) {
    return Response.json({ message: 'Invalid secret' }, { status: 401 })
  }
  const path = searchParams.get('path')
  const all = searchParams.get('all') === 'true'
  
  try {
    const revalidatedPaths = []
    const revalidatedTags = []
    
    if (all) {
      // Revalidate all important paths
      revalidatePath('/', 'page')
      revalidatePath('/articles', 'page')
      revalidatedPaths.push('/', '/articles')
      
      // Revalidate all WordPress cache tags
      revalidateTag('wordpress-posts')
      revalidateTag('wordpress-tags')
      revalidateTag('wordpress-categories')
      revalidatedTags.push('wordpress-posts', 'wordpress-tags', 'wordpress-categories')
    } else if (path) {
      revalidatePath(path, 'page')
      revalidatedPaths.push(path)
    } else {
      // Default: revalidate homepage
      revalidatePath('/', 'page')
      revalidatedPaths.push('/')
    }
    
    return Response.json({ 
      revalidated: true, 
      method: 'GET', 
      paths: revalidatedPaths,
      tags: revalidatedTags
    })
  } catch (e) {
    return Response.json({ revalidated: false, error: e?.message }, { status: 500 })
  }
}

/** 本番運用はこちら（WP Webhooks からの POST 用）
 * 
 * Expected body format:
 * {
 *   secret: "YOUR_SECRET",
 *   slug: "post-slug",
 *   postType: "ai-review" | "blog" | "review" | "sitelogo" | "freqquestion" | "testimonial",
 *   tags: ["tag-slug-1", "tag-slug-2"],
 *   categories: ["category-slug-1"],
 *   path: "/optional-specific-path"
 * }
 */
export async function POST(req) {
  const { searchParams } = new URL(req.url)
  const secretInQuery = searchParams.get('secret')

  let body = {}
  try { body = await req.json() } catch (_) {}
  const { 
    secret: secretInBody, 
    path, 
    slug, 
    tags, 
    postType,
    categories 
  } = body

  const token = secretInQuery || secretInBody
  if (token !== process.env.REVALIDATE_SECRET) {
    return Response.json({ message: 'Invalid secret' }, { status: 401 })
  }

  const revalidatedPaths = []
  const revalidatedTags = []

  try {
    // Revalidate specific path if provided
    if (path) {
      revalidatePath(path, 'page')
      revalidatedPaths.push(path)
    }

    // Revalidate post-specific pages based on post type
    if (slug) {
      if (postType === 'ai-review' || categories?.includes('ai-review')) {
        // AI Tool post - revalidate tool detail page
        revalidatePath(`/tool/${slug}`, 'page')
        revalidatedPaths.push(`/tool/${slug}`)
      } else if (postType === 'blog' || categories?.includes('blog')) {
        // Blog post - revalidate blog detail page
        revalidatePath(`/blog/${slug}`, 'page')
        revalidatedPaths.push(`/blog/${slug}`)
      }
    }

    // Revalidate collection pages for all tags
    if (Array.isArray(tags) && tags.length > 0) {
      tags.forEach(tagSlug => {
        revalidatePath(`/collection/${tagSlug}`, 'page')
        revalidatedPaths.push(`/collection/${tagSlug}`)
        revalidatedTags.push(tagSlug)
      })
    }

    // Revalidate homepage (shows trending/new tools, categories)
    // Always revalidate homepage when any post is updated
    revalidatePath('/', 'page')
    revalidatedPaths.push('/')

    // Revalidate articles page if it's a blog post
    if (postType === 'blog' || categories?.includes('blog')) {
      revalidatePath('/articles', 'page')
      revalidatedPaths.push('/articles')
    }

    // Revalidate all WordPress data cache tags
    // These tags are used in wpFetch calls throughout the app
    revalidateTag('wordpress-posts')
    revalidateTag('wordpress-tags')
    revalidateTag('wordpress-categories')
    revalidatedTags.push('wordpress-posts', 'wordpress-tags', 'wordpress-categories')

    // Revalidate tag-based cache tags if provided
    if (Array.isArray(tags)) {
      tags.forEach(t => {
        revalidateTag(`tag-${t}`)
        revalidateTag(`post-${slug || 'unknown'}`)
        revalidatedTags.push(`tag-${t}`, `post-${slug || 'unknown'}`)
      })
    }

    return Response.json({ 
      revalidated: true, 
      method: 'POST', 
      paths: revalidatedPaths,
      tags: revalidatedTags,
      slug,
      postType
    })
  } catch (e) {
    return Response.json({ 
      revalidated: false, 
      error: e?.message,
      paths: revalidatedPaths,
      tags: revalidatedTags
    }, { status: 500 })
  }
}
