'use client';

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import FallbackImg from './FallbackImg';
import Container from '../(components)/Container';

interface BlogScrollSectionProps {
  posts: any[];
}

export default function BlogScrollSection({ posts }: BlogScrollSectionProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const dragDistance = useRef(0);
  const rafId = useRef<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleMouseDown = (e: React.MouseEvent | MouseEvent) => {
    // Check if click is within the scroll container
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const rect = container.getBoundingClientRect();
    const x = (e as MouseEvent).clientX || (e as React.MouseEvent).clientX;
    const y = (e as MouseEvent).clientY || (e as React.MouseEvent).clientY;
    
    // Check if click is inside container bounds
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      isDragging.current = true;
      dragDistance.current = 0;
      startX.current = x;
      scrollLeft.current = container.scrollLeft;
      container.style.cursor = 'grabbing';
      container.style.userSelect = 'none';
      e.preventDefault();
    }
  };

  const updateCurrentIndex = () => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const slides = container.querySelectorAll<HTMLDivElement>('.blog-slide');
    if (slides.length === 0) return;

    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.left + containerRect.width / 2;
    
    let closestIndex = 0;
    let closestDistance = Infinity;

    slides.forEach((slide, index) => {
      const slideRect = slide.getBoundingClientRect();
      const slideCenter = slideRect.left + slideRect.width / 2;
      const distance = Math.abs(slideCenter - containerCenter);
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    setCurrentIndex(closestIndex);
  };

  const handleMouseUp = () => {
    if (scrollContainerRef.current) {
      isDragging.current = false;
      scrollContainerRef.current.style.cursor = 'grab';
      scrollContainerRef.current.style.userSelect = '';
      
      // Cancel any pending animation frame
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
      
      setTimeout(() => {
        dragDistance.current = 0;
      }, 100);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.clientX;
    const walk = (x - startX.current) * 2;
    const absWalk = Math.abs(walk);
    dragDistance.current += absWalk;
    scrollContainerRef.current.scrollLeft = scrollLeft.current - walk;
    startX.current = x;
    scrollLeft.current = scrollContainerRef.current.scrollLeft;
    
    // Update current index during drag (throttled with requestAnimationFrame)
    if (rafId.current === null) {
      rafId.current = requestAnimationFrame(() => {
        updateCurrentIndex();
        rafId.current = null;
      });
    }
  };

  const scrollToIndex = (index: number) => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const slides = container.querySelectorAll<HTMLDivElement>('.blog-slide');
    const target = slides[index];
    if (!target) return;
    container.scrollTo({
      left: target.offsetLeft,
      behavior: 'smooth',
    });
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => {
      const next = prev === 0 ? posts.length - 1 : prev - 1;
      scrollToIndex(next);
      return next;
    });
  };

  const goToNext = () => {
    setCurrentIndex((prev) => {
      const next = prev === posts.length - 1 ? 0 : prev + 1;
      scrollToIndex(next);
      return next;
    });
  };

  const goToIndex = (index: number) => {
    setCurrentIndex(index);
    scrollToIndex(index);
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    
    // Set initial index
    updateCurrentIndex();
    
    // Global mouse event listeners for dragging
    const handleGlobalMouseMove = (e: MouseEvent) => {
      handleMouseMove(e);
    };
    
    const handleGlobalMouseUp = () => {
      handleMouseUp();
      // Update index after drag ends
      updateCurrentIndex();
    };
    
    // Prevent link navigation when dragging using event delegation
    const handleLinkClick = (e: Event) => {
      if (dragDistance.current > 5) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    };

    // Handle scroll events to update current index
    const handleScroll = () => {
      if (!isDragging.current) {
        updateCurrentIndex();
      }
    };
    
    if (container) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      container.addEventListener('scroll', handleScroll);
      
      // Use event delegation to catch all link clicks in the container
      container.addEventListener('click', handleLinkClick, true);
      
      return () => {
        window.removeEventListener('mousemove', handleGlobalMouseMove);
        window.removeEventListener('mouseup', handleGlobalMouseUp);
        container.removeEventListener('scroll', handleScroll);
        container.removeEventListener('click', handleLinkClick, true);
        
        // Clean up any pending animation frame
        if (rafId.current !== null) {
          cancelAnimationFrame(rafId.current);
          rafId.current = null;
        }
      };
    }
  }, [posts]);

  if (!posts?.length) return null;

  return (
    <section className="py-8 md:py-12">
      <Container>
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-800">Explore Our Blogs</h2>
        </div>

        <div
          className="relative"
          style={{ minHeight: '500px', paddingTop: '20px', paddingBottom: '40px' }}
        >
          {/* Scroll container */}
          <div
            ref={scrollContainerRef}
            className="relative overflow-x-auto cursor-grab no-scrollbar z-10"
            style={{
              WebkitOverflowScrolling: 'touch',
              pointerEvents: 'auto',
            }}
            onMouseDown={handleMouseDown}
          >
            <div className="flex gap-6 px-4 md:px-0" style={{ width: 'max-content' }}>
              {posts.map((p: any) => {
                const heroImage =
                  p.blog?.topPickImage?.node?.sourceUrl ??
                  p.featuredImage?.node?.sourceUrl ??
                  null;

                const plainExcerpt = p.excerpt
                  ? p.excerpt.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
                  : '';

                const authorIcon =
                  p.blog?.authorIcon?.node?.sourceUrl ??
                  p.author?.node?.avatar?.url ??
                  null;

                const authorName = p.author?.node?.name ?? '';

                return (
                  <div 
                    key={p.id} 
                    className="blog-slide flex-none relative"
                    onMouseDown={(e) => {
                      // Allow drag to start from card
                      handleMouseDown(e);
                    }}
                    onClick={(e) => {
                      // Prevent card link navigation if user was dragging
                      if (dragDistance.current > 5) {
                        e.preventDefault();
                        e.stopPropagation();
                        // Also prevent navigation on the link overlay
                        const link = (e.target as HTMLElement).closest('a');
                        if (link) {
                          link.onclick = (ev) => {
                            ev.preventDefault();
                            ev.stopPropagation();
                          };
                        }
                      }
                    }}
                    style={{ userSelect: 'none', pointerEvents: 'auto' }}
                  >
                    <Link
                      href={`/blog/${p.slug}`}
                      className="relative block"
                      onClick={(e) => {
                        // If user was dragging, don't treat as a click
                        if (dragDistance.current > 5) {
                          e.preventDefault();
                          e.stopPropagation();
                        }
                      }}
                    >
                      <article
                        className="bg-transparent border-0 shadow-none relative w-[90vw] max-w-[979px] md:w-[979px] flex-shrink-0 origin-top-left scale-[0.6] md:scale-100"
                        style={{ height: '464px' }}
                      >
                        {/* Right side - White container */}
                        <div
                          className="absolute w-[641px] h-[396px] bg-white rounded-xl shadow-sm z-0 flex items-start"
                          style={{ left: '280px', top: '0px' }}
                        >
                          <div
                            className="w-[423px] h-[261px] p-6 flex flex-col justify-between"
                            style={{ marginTop: '68px', marginLeft: '143px' }}
                          >
                            <div className="flex-1 flex flex-col">
                              <p className="text-blue-600 text-sm font-medium mb-3">
                                {p.tags?.nodes?.[0]?.name || 'Explore Our Top 10 Picks'}
                              </p>

                              <h3
                                className="text-xl font-bold text-gray-900 mb-3 line-clamp-2"
                                style={{ opacity: 1 }}
                              >
                                {p.title}
                              </h3>

                              <p
                                className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3 flex-1"
                                style={{ opacity: 1 }}
                              >
                                {plainExcerpt}
                              </p>
                            </div>

                            <div className="flex items-center gap-3 mt-auto">
                              <div className="relative w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden ring-1 ring-rose-100 bg-rose-50 flex items-center justify-center flex-shrink-0">
                                {authorIcon ? (
                                  <Image
                                    src={authorIcon}
                                    alt={authorName}
                                    fill
                                    sizes="40px"
                                    className="object-cover"
                                  />
                                ) : (
                                  <span className="text-rose-500 text-[10px] md:text-xs font-semibold">
                                    {authorName
                                      .split(/\s+/)
                                      .filter(Boolean)
                                      .slice(0, 2)
                                      .map((part: string) => part[0]?.toUpperCase())
                                      .join('') || '?'}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs md:text-sm font-semibold text-gray-900">
                                  {authorName}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Left side - Image */}
                        <div
                          className="absolute left-0 w-[423px] h-[261px] bg-blue-100 flex-shrink-0 rounded-xl overflow-hidden z-20"
                          style={{ top: '68px' }}
                        >
                          {heroImage ? (
                            <FallbackImg
                              src={heroImage}
                              fallback="https://via.placeholder.com/423x261?text=No+Image"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-blue-100 flex items-center justify-center">
                              <span className="text-blue-300 text-sm">No Image</span>
                            </div>
                          )}
                        </div>
                      </article>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Arrow controls row */}
          <div className="mt-2 flex flex-col items-center gap-3">
            <div className="flex items-center justify-center gap-6">
              <button
                type="button"
                aria-label="Previous blog"
                onClick={goToPrevious}
                className="bg-white rounded-full p-1.5 shadow-lg hover:bg-gray-50 transition-colors border border-gray-200"
              >
                <ChevronLeft className="w-4 h-4 text-gray-700" />
              </button>

              <div className="flex items-center gap-3">
                {posts.map((_, index) => {
                  const isActive = index === currentIndex;

                  return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => goToIndex(index)}
                    className={`transition-all duration-300 ${
                      isActive
                        ? 'w-8 h-1.5 bg-blue-500 rounded-full'
                        : 'w-1.5 h-1.5 bg-gray-300 rounded-full hover:bg-gray-400'
                    }`}
                    aria-label={`Go to blog ${index + 1}`}
                  />
                  );
                })}
              </div>

              <button
                type="button"
                aria-label="Next blog"
                onClick={goToNext}
                className="bg-white rounded-full p-1.5 shadow-lg hover:bg-gray-50 transition-colors border border-gray-200"
              >
                <ChevronRight className="w-4 h-4 text-gray-700" />
              </button>
            </div>

            {/* Blue CTA button under arrows */}
            <Link
              href="/articles"
              className="mt-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors shadow-md"
            >
              All best 10 articles
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}


