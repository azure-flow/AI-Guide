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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scrollContainerRef.current) {
      isDragging.current = true;
      dragDistance.current = 0;
      startX.current = e.pageX - scrollContainerRef.current.offsetLeft;
      scrollLeft.current = scrollContainerRef.current.scrollLeft;
      scrollContainerRef.current.style.cursor = 'grabbing';
    }
  };

  const handleMouseLeave = () => {
    if (scrollContainerRef.current) {
      isDragging.current = false;
      scrollContainerRef.current.style.cursor = 'grab';
    }
  };

  const handleMouseUp = () => {
    if (scrollContainerRef.current) {
      isDragging.current = false;
      scrollContainerRef.current.style.cursor = 'grab';
      setTimeout(() => {
        dragDistance.current = 0;
      }, 100);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX.current) * 2;
    dragDistance.current += Math.abs(walk);
    scrollContainerRef.current.scrollLeft = scrollLeft.current - walk;
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
    if (container) {
      container.addEventListener('scroll', checkScrollPosition);
      window.addEventListener('resize', checkScrollPosition);
      return () => {
        container.removeEventListener('scroll', checkScrollPosition);
        window.removeEventListener('resize', checkScrollPosition);
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
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onScroll={checkScrollPosition}
      >
        <div className="flex gap-4 pb-4 px-4 md:px-0" style={{ width: 'max-content' }}>
          {cards.map((card) => (
            <div
              key={card.id}
              className="flex-none w-[90vw] max-w-[320px] md:w-[320px]"
              onClick={(e) => {
                if (dragDistance.current > 5) {
                  e.preventDefault();
                }
              }}
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

