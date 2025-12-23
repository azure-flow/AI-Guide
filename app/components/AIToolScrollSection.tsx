'use client';

import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import AIToolCard from '@/components/AIToolCard';
import { AIToolCarouselCard } from './AIToolCarousel';

interface AIToolScrollSectionProps {
  cards: AIToolCarouselCard[];
  cardVariant?: "default" | "compact";
}

export default function AIToolScrollSection({ cards, cardVariant = "compact" }: AIToolScrollSectionProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const dragDistance = useRef(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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

  const handleMouseUp = () => {
    if (scrollContainerRef.current) {
      isDragging.current = false;
      scrollContainerRef.current.style.cursor = 'grab';
      scrollContainerRef.current.style.userSelect = '';
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
  };

  const checkScrollPosition = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  };

  const scrollPrev = () => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const isMobile = container.clientWidth < 768;
    // Card width: mobile is 90vw, desktop is 320px, plus 24px gap (gap-6)
    const cardWidth = isMobile 
      ? container.clientWidth * 0.9 + 24 
      : 320 + 24;
    scrollContainerRef.current.scrollBy({
      left: -cardWidth,
      behavior: 'smooth'
    });
  };

  const scrollNext = () => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const isMobile = container.clientWidth < 768;
    // Card width: mobile is 90vw, desktop is 320px, plus 24px gap (gap-6)
    const cardWidth = isMobile 
      ? container.clientWidth * 0.9 + 24 
      : 320 + 24;
    scrollContainerRef.current.scrollBy({
      left: cardWidth,
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    checkScrollPosition();
    const container = scrollContainerRef.current;
    
    // Global mouse event listeners for dragging
    const handleGlobalMouseMove = (e: MouseEvent) => {
      handleMouseMove(e);
    };
    
    const handleGlobalMouseUp = () => {
      handleMouseUp();
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
    
    if (container) {
      container.addEventListener('scroll', checkScrollPosition);
      window.addEventListener('resize', checkScrollPosition);
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      
      // Use event delegation to catch all link clicks in the container
      container.addEventListener('click', handleLinkClick, true);
      
      return () => {
        container.removeEventListener('scroll', checkScrollPosition);
        window.removeEventListener('resize', checkScrollPosition);
        window.removeEventListener('mousemove', handleGlobalMouseMove);
        window.removeEventListener('mouseup', handleGlobalMouseUp);
        container.removeEventListener('click', handleLinkClick, true);
      };
    }
  }, [cards]);

  if (!cards?.length) return null;

  return (
    <div className="relative">
      {canScrollLeft && (
        <button
          onClick={scrollPrev}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-1.5 shadow-lg hover:bg-gray-50 transition-colors border border-gray-200 hidden md:flex items-center justify-center"
          aria-label="Previous cards"
        >
          <ChevronLeft className="w-4 h-4 text-gray-700" />
        </button>
      )}
      
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto cursor-grab no-scrollbar"
        style={{
          WebkitOverflowScrolling: 'touch'
        }}
        onMouseDown={handleMouseDown}
        onScroll={checkScrollPosition}
      >
        <div className="flex gap-4 pb-4 px-4 md:px-0" style={{ width: 'max-content' }}>
          {cards.map((card) => (
            <div
              key={card.id}
              className="flex-none w-[90vw] max-w-[320px] md:w-[320px]"
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
              <AIToolCard variant={cardVariant} {...card} />
            </div>
          ))}
        </div>
      </div>

      {canScrollRight && (
        <button
          onClick={scrollNext}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-1.5 shadow-lg hover:bg-gray-50 transition-colors border border-gray-200 hidden md:flex items-center justify-center"
          aria-label="Next cards"
        >
          <ChevronRight className="w-4 h-4 text-gray-700" />
        </button>
      )}

      {/* Mobile arrows below the slider */}
      <div className="flex items-center justify-center gap-6 mt-4 md:hidden">
        <button
          onClick={scrollPrev}
          disabled={!canScrollLeft}
          className="bg-white rounded-full p-1.5 shadow-lg hover:bg-gray-50 transition-colors border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Previous cards"
        >
          <ChevronLeft className="w-4 h-4 text-gray-700" />
        </button>
        <button
          onClick={scrollNext}
          disabled={!canScrollRight}
          className="bg-white rounded-full p-1.5 shadow-lg hover:bg-gray-50 transition-colors border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Next cards"
        >
          <ChevronRight className="w-4 h-4 text-gray-700" />
        </button>
      </div>
    </div>
  );
}

