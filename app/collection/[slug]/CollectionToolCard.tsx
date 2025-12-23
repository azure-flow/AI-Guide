// ============================================================================
// FILE: app/collection/[slug]/CollectionToolCard.tsx
// PURPOSE: Collection page specific tool card component matching image design exactly
// ============================================================================

'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Star, DollarSign } from 'lucide-react';

interface Tag {
  name: string;
  slug: string;
}

interface CollectionToolCardProps {
  id: string;
  title: string;
  slug: string;
  logoUrl?: string | null;
  rating?: number;
  description?: string;
  keyFindings?: string[];
  tags?: Tag[];
  toolHref: string;
  whoIsItFor?: string | null;
  pricing?: string | null;
}

type TabType = 'overview' | 'who-is-it-for' | 'pricing';

interface TargetAudienceItem {
  title: string;
  bulletPoints: string[];
}

interface PricingModel {
  name: string;
  price: string;
  features: string[];
}

const CollectionToolCard: React.FC<CollectionToolCardProps> = ({
  id,
  title,
  logoUrl,
  rating,
  description,
  keyFindings = [],
  tags = [],
  toolHref,
  whoIsItFor,
  pricing,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1.5">
        <Star className="w-5 h-5 fill-blue-500 text-blue-500" />
        <span className="text-base font-medium text-gray-900">{rating.toFixed(1)}</span>
      </div>
    );
  };

  // Strip HTML from description for display
  const stripHtml = (html: string) => {
    return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  };

  const cleanDescription = description ? stripHtml(description) : '';

  // Parse whoIsItFor data
  const parsedWhoIsItFor = useMemo((): TargetAudienceItem[] => {
    if (!whoIsItFor || whoIsItFor.trim() === '') {
      return [];
    }

    // Split by double newlines to separate different audiences
    const sections = whoIsItFor.split(/\n\s*\n/).filter((section) => section.trim() !== '');

    return sections
      .map((section) => {
        const lines = section.split(/\r?\n/).map((line) => line.trim()).filter((line) => line !== '');

        if (lines.length === 0 || lines[0] === '') {
          return { title: '', bulletPoints: [] };
        }

        // First line is the title (Role name)
        const title = lines[0];

        // Rest are bullet points (descriptions)
        const bulletPoints = lines.slice(1).filter((line) => line !== '');

        return { title, bulletPoints };
      })
      .filter((item) => item.title !== '' && item.bulletPoints.length > 0);
  }, [whoIsItFor]);

  // Parse pricing data
  const parsedPricing = useMemo((): PricingModel[] => {
    if (!pricing || pricing.trim() === '') {
      return [];
    }

    // Split by double newlines to separate different pricing models
    const sections = pricing.split(/\n\s*\n/).filter((section) => section.trim() !== '');

    return sections
      .map((section) => {
        const lines = section.split(/\r?\n/).map((line) => line.trim()).filter((line) => line !== '');

        if (lines.length === 0) {
          return { name: '', price: '', features: [] };
        }

        // First line is the pricing model name
        const name = lines[0] || '';

        // Second line is the price
        const price = lines[1] || '$0.00';

        // Rest are features
        const features = lines.slice(2).filter((feature) => feature !== '');

        return { name, price, features };
      })
      .filter((item) => item.name !== '');
  }, [pricing]);

  return (
    <article className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6 relative">
      {/* Tags at the top */}
      {tags && tags.length > 0 && (
        <div className="px-6 pt-4 pb-2">
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, idx) => (
              <Link
                key={tag.slug}
                href={`/collection/${tag.slug}`}
                className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  idx === 0 ? 'bg-green-100 text-green-700 hover:bg-green-200' :
                  idx === 1 ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' :
                  'bg-cyan-100 text-cyan-700 hover:bg-cyan-200'
                }`}
              >
                {tag.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* View Profile Button - Top Right Corner */}
      <div className="absolute top-6 right-6 z-10">
        <Link
          href={toolHref}
          className="px-4 py-2 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors text-sm"
        >
          View Profile
        </Link>
      </div>

      <div className="p-6 overflow-hidden">
        <div className="flex gap-6">
          {/* Left Sidebar - Logo, Title, Rating, Navigation Tabs */}
          <div className="w-48 flex-shrink border-r-[1px] border-gray-200">
            {/* Logo */}
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center mb-4">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt={title} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className="w-full h-full bg-gray-200" />
              )}
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
            
            {/* Rating - Only show if we have reviews */}
            {rating !== undefined && rating > 0 && renderStars(rating)}
            
            {/* Navigation Tabs - Vertical on left sidebar */}
            <div className="flex flex-col gap-2 mt-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-2 text-sm text-left rounded transition-colors ${
                  activeTab === 'overview'
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('who-is-it-for')}
                className={`px-3 py-2 text-sm text-left rounded transition-colors ${
                  activeTab === 'who-is-it-for'
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Who is it for
              </button>
              <button
                onClick={() => setActiveTab('pricing')}
                className={`px-3 py-2 text-sm text-left rounded transition-colors ${
                  activeTab === 'pricing'
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Pricing
              </button>
            </div>
          </div>

          {/* Right Content - Dynamic based on active tab */}
          <div className="flex-1 pb-14">
            {activeTab === 'overview' && (
              <>
                {/* Description Section */}
                {cleanDescription && (
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Description</h4>
                    <p className="text-sm text-gray-600 leading-relaxed mb-3">
                      {cleanDescription}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>Share this:</span>
                      <Link 
                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(toolHref)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-blue-600 transition-colors"
                      >
                        X
                      </Link>
                      <Link 
                        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(toolHref)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-blue-600 transition-colors"
                      >
                        Facebook
                      </Link>
                    </div>
                  </div>
                )}

                {/* Key Findings Section */}
                {keyFindings && keyFindings.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Key Finding</h4>
                    <div className="flex flex-wrap gap-3">
                      {keyFindings.slice(0, 10).map((finding, idx) => (
                        <div key={idx} className="text-sm text-gray-700">
                          {finding}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === 'who-is-it-for' && (
              <div className='w-full h-full flex flex-col justify-center items-center'>
                {parsedWhoIsItFor.length > 0 ? (
                  <div className="grid grid-cols-3 gap-6">
                    {parsedWhoIsItFor.map((audience, idx) => (
                      <div key={idx} className="flex flex-col">
                        <h4 className="text-sm font-bold text-gray-900 mb-3">{audience.title}</h4>
                        <div className="space-y-2">
                          {audience.bulletPoints.map((point, pointIdx) => (
                            <p key={pointIdx} className="text-sm text-gray-600">
                              {point}
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No target audience information available.</p>
                )}
              </div>
            )}

            {activeTab === 'pricing' && (
              <div className='w-full h-full flex flex-col justify-center items-center'>
                {parsedPricing.length > 0 ? (
                  <div className="w-[105%] grid grid-cols-3 gap-6 border-y-[1px] border-gray-200">
                    {parsedPricing.map((model, idx) => (
                      <div key={idx} className="flex flex-col px-10 py-6 border-r-[1px] border-gray-200">
                        <div className="flex items-start gap-2">
                          <DollarSign className="w-8 h-8 bg-blue-600 rounded-full p-2 text-white font-bold mt-1 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm text-gray-600 mb-1">Pricing model</p>
                            <p className="text-sm font-medium text-gray-900 mb-1">{model.name || 'Free Trial'}</p>
                            <p className="text-lg font-bold text-gray-900">{model.price}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No pricing information available.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Button - Bottom Right */}
        <div className="absolute bottom-6 right-6">
          {activeTab === 'overview' && (
            <Link
              href={toolHref}
              className="inline-flex items-center justify-center px-6 py-3 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-md"
            >
              See What You Can Do
            </Link>
          )}
          {activeTab === 'who-is-it-for' && (
            <Link
              href={`${toolHref}#who-is-it-for`}
              className="inline-flex items-center justify-center px-6 py-3 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-md"
            >
              See What You Can Do
            </Link>
          )}
          {activeTab === 'pricing' && (
            <Link
              href={`${toolHref}#pricing`}
              className="inline-flex items-center justify-center px-6 py-3 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-md"
            >
              What's Included in Each Plan?
            </Link>
          )}
        </div>
      </div>
    </article>
  );
};

export default CollectionToolCard;
