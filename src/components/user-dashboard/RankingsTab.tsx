'use client';

import React, { useState, useRef, useEffect, startTransition } from 'react';
import { 
  RankingFilters, 
  RankingsResponse, 
  PaginationInfo, 
  JobCategory 
} from '@/types/api';
import { 
  Trophy, Crown, Users, Star, TrendingUp, Heart, User, Loader2, Sparkles,
  Search, ChevronLeft, ChevronRight
} from 'lucide-react';

interface RankingsTabProps {
  rankings: any[];
  userRanking: any;
  isLoadingRankings: boolean;
  rankingFilters: RankingFilters;
  rankingPagination: PaginationInfo | null;
  availableJobs: JobCategory[];
  updateRankingFilters: (filters: Partial<RankingFilters>) => void;
  fetchRankings: () => void;
}

// Simple Character Display (fallback)
const SimpleCharacterDisplay: React.FC<{
  character: any;
  className?: string;
  scale?: number;
}> = ({ character, className = "", scale = 1 }) => {
  const size = scale * 64; // Base size 64px
  
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="flex flex-col items-center gap-1">
        <div className="relative">
          <div 
            className="bg-gradient-to-br from-orange-200 via-orange-300 to-red-300 rounded-full flex items-center justify-center shadow-lg border-2 border-white"
            style={{ width: `${size}px`, height: `${size}px` }}
          >
            <User className="text-orange-700" style={{ width: `${size * 0.5}px`, height: `${size * 0.5}px` }} />
          </div>
          
          <div 
            className="absolute -top-1 -right-1 bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-lg"
            style={{ width: `${size * 0.25}px`, height: `${size * 0.25}px`, fontSize: `${Math.max(10, size * 0.15)}px` }}
          >
            {character.level}
          </div>
        </div>
      </div>
    </div>
  );
};

// MapleStory.io Character Renderer - FIXED VERSION
const MapleStoryCharacterRenderer: React.FC<{
  character: any;
  className?: string;
  scale?: number;
}> = ({ character, className = "", scale = 1 }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isImageReady, setIsImageReady] = useState(false);

  // Convert database skin color to API skin color
  const mapSkinColor = (dbSkinColor: number): number => {
    const skinMap: { [key: number]: number } = {
      0: 2000, // Light skin
      1: 2001, // Tanned skin  
      2: 2002, // Dark skin
      3: 2003  // Pale skin
    };
    return skinMap[dbSkinColor] ?? 2000;
  };

  useEffect(() => {
    const generateCharacterImage = async () => {
      try {
        setIsLoading(true);
        setError(false);
        setIsImageReady(false);

        const { mapleStoryAPI } = await import('@/services/maplestory-api');

        const characterOptions = {
          hair: character.hair,
          face: character.face,
          skin: mapSkinColor(character.skincolor),
          equipment: character.equipment || {},
          resize: scale,
          renderMode: 'default',
          flipX: false
        };

        const testResult = await mapleStoryAPI.testCharacterEndpoint(characterOptions);
        
        if (testResult.success && testResult.url) {
          const characterImageUrl = testResult.url; // Capture URL to fix TypeScript issue
          
          // Preload the image before setting URL
          const img = new Image();
          img.onload = () => {
            setImageUrl(characterImageUrl);
            setIsLoading(false);
            // Small delay to ensure image is rendered before showing
            setTimeout(() => setIsImageReady(true), 50);
          };
          img.onerror = () => {
            setError(true);
            setIsLoading(false);
          };
          img.src = characterImageUrl;
        } else {
          setError(true);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error generating character image:', err);
        setError(true);
        setIsLoading(false);
      }
    };

    generateCharacterImage();
  }, [character, scale]);

  const handleImageError = () => {
    setError(true);
    setIsLoading(false);
    setIsImageReady(false);
  };

  const handleImageLoad = () => {
    // Image is already loaded in the effect, this is just a backup
    setIsImageReady(true);
  };

  if (isLoading) {
    const iconSize = scale * 32;
    const sparkleSize = scale * 16;

    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            <Loader2 className="animate-spin text-orange-500" style={{ width: `${iconSize}px`, height: `${iconSize}px` }} />
            <Sparkles 
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-orange-300 animate-pulse" 
              style={{ width: `${sparkleSize}px`, height: `${sparkleSize}px` }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <SimpleCharacterDisplay 
        character={character}
        className={className}
        scale={scale}
      />
    );
  }

  return (
    <div 
      className={`relative ${className}`}
      style={{
        width: '100%',
        height: '100%'
      }}
    >
      <div
        className="absolute"
        style={{
          bottom: '55px',
          left: '50%',
          transform: `translateX(-50%) scale(${scale})`,
          transformOrigin: 'bottom center',
          // Only apply transition to opacity, not transform
          transition: isImageReady ? 'opacity 0.3s ease' : 'none',
          opacity: isImageReady ? 1 : 0
        }}
      >
        <img
          src={imageUrl}
          alt={`${character.name} character`}
          className="block drop-shadow-lg"
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading="eager"
          style={{ 
            imageRendering: 'pixelated',
            maxHeight: 'none',
            maxWidth: 'none'
          }}
        />
      </div>
    </div>
  );
};

// Skeleton loader component
const RankingRowSkeleton: React.FC = () => (
  <div className="grid grid-cols-12 gap-4 px-6 py-4 rounded-xl bg-gray-50 animate-pulse">
    <div className="col-span-1 flex items-center justify-center">
      <div className="w-12 h-8 bg-gray-200 rounded-full"></div>
    </div>
    <div className="col-span-1 flex items-center justify-center">
      <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
    </div>
    <div className="col-span-3 flex items-center">
      <div className="w-32 h-8 bg-gray-200 rounded-full"></div>
    </div>
    <div className="col-span-1 flex items-center justify-center">
      <div className="w-12 h-8 bg-gray-200 rounded-full"></div>
    </div>
    <div className="col-span-2 flex items-center justify-center">
      <div className="w-24 h-8 bg-gray-200 rounded-full"></div>
    </div>
    <div className="col-span-2 flex items-center justify-center">
      <div className="w-20 h-8 bg-gray-200 rounded-full"></div>
    </div>
    <div className="col-span-1 flex items-center justify-center">
      <div className="w-16 h-8 bg-gray-200 rounded-full"></div>
    </div>
    <div className="col-span-1 flex items-center justify-center">
      <div className="w-20 h-8 bg-gray-200 rounded-full"></div>
    </div>
  </div>
);

const RankingsTab: React.FC<RankingsTabProps> = ({
  rankings,
  userRanking,
  isLoadingRankings,
  rankingFilters,
  rankingPagination,
  availableJobs,
  updateRankingFilters,
  fetchRankings
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [isFilterTransitioning, setIsFilterTransitioning] = useState(false);

  const handleJobFilter = (job: string) => {
    if (job === rankingFilters.job) return; // Don't update if same filter
    
    setIsFilterTransitioning(true);
    startTransition(() => {
      updateRankingFilters({ job, page: 1 });
    });
    
    // Remove transition state after a short delay
    setTimeout(() => setIsFilterTransitioning(false), 300);
  };

  const handleSearchSubmit = (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    const trimmedSearch = searchInput.trim();
    
    if (trimmedSearch === rankingFilters.search) return; // Don't update if same search
    
    setIsFilterTransitioning(true);
    startTransition(() => {
      updateRankingFilters({ search: trimmedSearch, page: 1 });
    });
    
    setTimeout(() => setIsFilterTransitioning(false), 300);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setIsFilterTransitioning(true);
    startTransition(() => {
      updateRankingFilters({ search: '', page: 1 });
    });
    setTimeout(() => setIsFilterTransitioning(false), 300);
  };

  const handlePageChange = (page: number) => {
    setIsFilterTransitioning(true);
    startTransition(() => {
      updateRankingFilters({ page });
    });
    
    setTimeout(() => setIsFilterTransitioning(false), 300);
  };

  const getJobIcon = (jobCategory: string) => {
    const iconMap: { [key: string]: string } = {
      'all': '⚔️',
      'beginner': '👶',
      'noblesse': '👶',
      'warrior': '🛡️',
      'dawn-warrior': '🛡️',
      'magician': '🔮',
      'blaze-wizard': '🔮',
      'archer': '🏹',
      'bowman': '🏹',
      'wind-archer': '🏹',
      'thief': '🗡️',
      'night-walker': '🗡️',
      'pirate': '⚓',
      'thunder-breaker': '⚓',
      'aran': '❄️'
    };
    return iconMap[jobCategory] || '❓';
  };

  return (
    <div className="space-y-6 pb-32">
      <style jsx>{`
        @keyframes sparkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .ranking-row {
          transition: all 0.3s ease;
          animation: fadeIn 0.3s ease-out;
          animation-fill-mode: both;
        }
        
        .ranking-row:nth-child(1) { animation-delay: 0ms; }
        .ranking-row:nth-child(2) { animation-delay: 50ms; }
        .ranking-row:nth-child(3) { animation-delay: 100ms; }
        .ranking-row:nth-child(4) { animation-delay: 150ms; }
        .ranking-row:nth-child(5) { animation-delay: 200ms; }
        .ranking-row:nth-child(6) { animation-delay: 250ms; }
        .ranking-row:nth-child(7) { animation-delay: 300ms; }
        .ranking-row:nth-child(8) { animation-delay: 350ms; }
        .ranking-row:nth-child(9) { animation-delay: 400ms; }
        .ranking-row:nth-child(10) { animation-delay: 450ms; }
        .ranking-row:nth-child(11) { animation-delay: 500ms; }
        .ranking-row:nth-child(12) { animation-delay: 550ms; }
        .ranking-row:nth-child(13) { animation-delay: 600ms; }
        .ranking-row:nth-child(14) { animation-delay: 650ms; }
        .ranking-row:nth-child(15) { animation-delay: 700ms; }
        
        .ranking-row .bg-gif {
          opacity: 0.3;
          transition: opacity 0.3s ease;
        }
        
        .ranking-row .character-avatar {
          opacity: 0.5;
          transition: opacity 0.3s ease;
        }
        
        .ranking-row .data-tag {
          opacity: 0.7;
          transition: all 0.3s ease;
        }
        
        .ranking-row:hover .bg-gif {
          opacity: 1;
        }
        
        .ranking-row:hover .character-avatar {
          opacity: 1;
        }
        
        .ranking-row:hover .data-tag {
          opacity: 1;
          transform: translateY(-1px);
        }
        
        .ranking-row:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }
      `}</style>

      {/* Rankings Table with integrated search, filters, and stats */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Table Header with Stats Bar */}
        <div className="p-6 bg-gradient-to-r from-orange-50 to-orange-100 border-b border-gray-200">
          {/* Title and Compact Stats */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6 text-orange-500" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {rankingFilters.job !== 'all' ? 
                    `${rankingFilters.job === 'archer' ? 'Bowman' : rankingFilters.job.charAt(0).toUpperCase() + rankingFilters.job.slice(1)} Rankings` : 
                    'Top Players'}
                </h2>
                <p className="text-sm text-gray-600">Search players and filter by job class</p>
              </div>
            </div>
          </div>

          {/* Compact Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {/* Top Player */}
            <div className="bg-white/80 backdrop-blur rounded-lg p-3 border border-orange-200/50">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-orange-500" />
                <div>
                  <p className="text-xs text-gray-600">Champion</p>
                  <p className="text-sm font-bold text-gray-900">
                    {rankings.length > 0 ? rankings[0].name : 'No data'}
                  </p>
                </div>
              </div>
            </div>

            {/* Your Rank */}
            <div className="bg-white/80 backdrop-blur rounded-lg p-3 border border-orange-200/50">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-orange-500" />
                <div>
                  <p className="text-xs text-gray-600">Your Rank</p>
                  <p className="text-sm font-bold text-gray-900">
                    {userRanking ? `#${userRanking.rank}` : 'Not ranked'}
                  </p>
                </div>
              </div>
            </div>

            {/* Total Players */}
            <div className="bg-white/80 backdrop-blur rounded-lg p-3 border border-orange-200/50">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-orange-500" />
                <div>
                  <p className="text-xs text-gray-600">Total Players</p>
                  <p className="text-sm font-bold text-gray-900">
                    {rankingPagination?.totalItems || rankings.length}
                  </p>
                </div>
              </div>
            </div>

            {/* Highest Level */}
            <div className="bg-white/80 backdrop-blur rounded-lg p-3 border border-orange-200/50">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-orange-500" />
                <div>
                  <p className="text-xs text-gray-600">Max Level</p>
                  <p className="text-sm font-bold text-gray-900">
                    {rankings.length > 0 ? rankings[0].level : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search character name..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearchSubmit(e as any);
                    }
                  }}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                />
              </div>
              <button
                onClick={handleSearchSubmit}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all font-medium flex items-center gap-2 shadow-lg hover:shadow-xl"
              >
                <Search className="w-4 h-4" />
                Search
              </button>
              {rankingFilters.search && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Job Filter Buttons - Using actual PNG icons */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-gray-700">Filter by Job Class</h3>
            <div className="flex flex-wrap gap-2">
              {/* Use availableJobs from props, but ensure we have all jobs */}
              {(availableJobs && availableJobs.length > 0 ? availableJobs : [
                { value: 'all', label: 'All Jobs' },
                { value: 'beginner', label: 'Beginner' },
                { value: 'noblesse', label: 'Noblesse' },
                { value: 'warrior', label: 'Warrior' },
                { value: 'dawn-warrior', label: 'Dawn Warrior' },
                { value: 'magician', label: 'Magician' },
                { value: 'blaze-wizard', label: 'Blaze Wizard' },
                { value: 'archer', label: 'Bowman' },  // Display as Bowman but value is archer
                { value: 'wind-archer', label: 'Wind Archer' },
                { value: 'thief', label: 'Thief' },
                { value: 'night-walker', label: 'Night Walker' },
                { value: 'pirate', label: 'Pirate' },
                { value: 'thunder-breaker', label: 'Thunder Breaker' },
                { value: 'aran', label: 'Aran' }
              ]).map(job => {
                const getIconFileName = (jobValue: string) => {
                  // Map job values to your actual PNG file names
                  const iconMap: { [key: string]: string } = {
                    'all': 'all',
                    'beginner': 'beginner',
                    'noblesse': 'noblesse',
                    'warrior': 'warrior',
                    'dawn-warrior': 'dawn_warrior',
                    'magician': 'magician',
                    'blaze-wizard': 'blaze_wizard',
                    'thief': 'thief',
                    'night-walker': 'night_walker',
                    'archer': 'bowman',  // Map archer value to bowman icon
                    'wind-archer': 'wind_archer',
                    'pirate': 'pirate',
                    'thunder-breaker': 'thunder_breaker',
                    'aran': 'aran'
                  };
                  return iconMap[jobValue] || 'all';
                };

                // Override label for archer
                const displayLabel = job.value === 'archer' ? 'Bowman' : job.label;

                return (
                  <button
                    key={job.value}
                    onClick={() => handleJobFilter(job.value)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                      rankingFilters.job === job.value
                        ? 'bg-orange-500 text-white shadow-md scale-105'
                        : 'bg-white text-gray-700 hover:bg-orange-50 hover:text-orange-600 border border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    {/* Use actual PNG icons with emoji fallback */}
                    <span className="w-4 h-4 flex items-center justify-center">
                      <img 
                        src={`/assets/job-icons/${getIconFileName(job.value)}.png`} 
                        alt={displayLabel}
                        className="w-4 h-4"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = getJobIcon(job.value);
                          }
                        }}
                      />
                    </span>
                    {displayLabel}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Custom Table */}
        {isLoadingRankings || isFilterTransitioning ? (
          <div className="relative min-h-[600px]">
            {/* Keep previous content visible but faded during transitions */}
            {rankings.length > 0 && isFilterTransitioning && !isLoadingRankings && (
              <div className="opacity-30 transition-opacity duration-300">
                <div className="p-6 space-y-4">
                  {/* Header Row */}
                  <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                    <div className="col-span-1 text-center">Rank</div>
                    <div className="col-span-1 text-center">Avatar</div>
                    <div className="col-span-3">Player</div>
                    <div className="col-span-1 text-center">Level</div>
                    <div className="col-span-2 text-center">Job</div>
                    <div className="col-span-2 text-center">Guild</div>
                    <div className="col-span-1 text-center">Fame</div>
                    <div className="col-span-1 text-center">EXP</div>
                  </div>
                  
                  {/* Show existing data */}
                  {rankings.slice(0, 10).map(player => (
                    <div key={player.id} className="grid grid-cols-12 gap-4 px-6 py-4">
                      <div className="col-span-1 text-center">#{player.rank}</div>
                      <div className="col-span-1"></div>
                      <div className="col-span-3">{player.name}</div>
                      <div className="col-span-1 text-center">{player.level}</div>
                      <div className="col-span-2 text-center">{player.job}</div>
                      <div className="col-span-2 text-center">{player.guild || '-'}</div>
                      <div className="col-span-1 text-center">{player.fame}</div>
                      <div className="col-span-1 text-center">{player.exp}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Loading overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 border-3 border-orange-500/30 border-t-orange-500 rounded-full animate-spin"></div>
                  <Sparkles className="w-6 h-6 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-orange-400 animate-pulse" />
                </div>
                <span className="text-sm text-gray-600 font-medium">
                  {isFilterTransitioning ? 'Updating...' : 'Loading rankings...'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {rankings.length === 0 ? (
              <div className="text-center py-12">
                <div className="flex flex-col items-center gap-4">
                  <Trophy className="w-12 h-12 text-gray-300" />
                  <div>
                    <p className="text-lg font-medium text-gray-600">No ranking data found</p>
                    <p className="text-sm text-gray-500">
                      {rankingFilters.search 
                        ? `No players found matching "${rankingFilters.search}"`
                        : rankingFilters.job !== 'all'
                        ? `No ${rankingFilters.job === 'archer' ? 'Bowman' : rankingFilters.job} players found`
                        : 'Rankings will appear here once characters are created'
                      }
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Header Row */}
                <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                  <div className="col-span-1 text-center">Rank</div>
                  <div className="col-span-1 text-center">Avatar</div>
                  <div className="col-span-3">Player</div>
                  <div className="col-span-1 text-center">Level</div>
                  <div className="col-span-2 text-center">Job</div>
                  <div className="col-span-2 text-center">Guild</div>
                  <div className="col-span-1 text-center">Fame</div>
                  <div className="col-span-1 text-center">EXP</div>
                </div>

                {/* Data Rows */}
                {rankings.map((player, index) => (
                  <div 
                    key={player.id} 
                    className={`ranking-row group relative grid grid-cols-12 gap-4 px-6 py-4 rounded-xl cursor-pointer ${
                      player.isCurrentUser 
                        ? 'bg-gradient-to-r from-orange-50 to-orange-25 border-2 border-orange-300' 
                        : 'bg-gray-50 hover:bg-white border-2 border-transparent hover:border-gray-200'
                    }`}
                    style={{
                      minHeight: '120px',
                      overflow: 'hidden',
                      position: 'relative'
                    }}
                  >
                    {/* Background GIF for top 10 */}
                    {player.rank <= 10 && (
                      <div 
                        className="bg-gif absolute inset-0 pointer-events-none"
                        style={{
                          backgroundImage: player.rank <= 3 
                            ? `url('/assets/gifs/ranking-bg-${player.rank}.gif')`
                            : `url('/assets/gifs/ranking-bg-4-10.gif')`,
                          backgroundSize: 'cover',
                          backgroundPosition: player.rank === 1 ? 'center -380px' : 
                                             player.rank === 2 ? 'center -400px' : 
                                             player.rank === 3 ? 'center -250px' : 'center -120px',
                          backgroundRepeat: 'no-repeat',
                          transform: `scale(1.2)`,
                          transformOrigin: 'center',
                          zIndex: 0
                        }}
                      />
                    )}

                    {/* Rank */}
                    <div className="col-span-1 flex items-center justify-center relative z-10">
                      <span className="data-tag inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-gradient-to-r from-orange-100 to-orange-50 text-gray-800 border border-orange-200/50 shadow-sm">
                        {player.rank <= 3 && (
                          <Crown className={`w-4 h-4 ${
                            player.rank === 1 ? 'text-yellow-500' :
                            player.rank === 2 ? 'text-gray-400' :
                            'text-orange-600'
                          }`} />
                        )}
                        #{player.rank}
                      </span>
                    </div>

                    {/* Character Avatar - UPDATED TO USE MapleStoryCharacterRenderer */}
                    <div className="col-span-1 flex items-center justify-center relative z-10">
                      <div className="character-avatar relative" style={{ width: '100px', height: '100px' }}>
                        <div className="absolute inset-0 flex items-end justify-center" style={{ bottom: '-55px' }}>
                          <MapleStoryCharacterRenderer 
                            character={{
                              id: player.id,
                              name: player.name,
                              level: player.level,
                              job: player.jobId.toString(),
                              skincolor: player.skincolor || 0,
                              gender: player.gender || 0,
                              hair: player.hair || 30000,
                              face: player.face || 20000,
                              equipment: player.equipment || {},
                              stats: player.stats || { str: 4, dex: 4, int: 4, luk: 4 },
                              exp: player.exp || 0,
                              meso: player.meso || 0
                            }}
                            scale={1.1}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Player Name */}
                    <div className="col-span-3 flex items-center relative z-10">
                      <div className="min-w-0">
                        <span className="data-tag inline-block px-4 py-1.5 rounded-full text-sm font-semibold bg-gradient-to-r from-orange-100 via-orange-50 to-white text-gray-800 border border-orange-200/50 shadow-sm">
                          {player.name}
                          {player.isCurrentUser && <span className="ml-1 text-orange-600">(You)</span>}
                        </span>
                      </div>
                    </div>

                    {/* Level */}
                    <div className="col-span-1 flex items-center justify-center relative z-10">
                      <span className="data-tag inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-gradient-to-br from-orange-100 to-yellow-50 text-gray-800 border border-orange-200/50 shadow-sm">
                        {player.level}
                        {player.level >= 200 && (
                          <Star className="w-4 h-4 text-yellow-500" />
                        )}
                      </span>
                    </div>

                    {/* Job */}
                    <div className="col-span-2 flex items-center justify-center relative z-10">
                      <span className="data-tag inline-block px-3 py-1 rounded-full text-sm font-semibold bg-gradient-to-r from-indigo-100 to-orange-50 text-gray-800 border border-orange-200/50 shadow-sm">
                        {player.job}
                      </span>
                    </div>

                    {/* Guild */}
                    <div className="col-span-2 flex items-center justify-center relative z-10">
                      {player.guild ? (
                        <span className="data-tag inline-block px-3 py-1 rounded-full text-sm font-semibold bg-gradient-to-r from-blue-100 to-orange-50 text-gray-800 border border-orange-200/50 shadow-sm">
                          {player.guild}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm font-medium">No Guild</span>
                      )}
                    </div>

                    {/* Fame */}
                    <div className="col-span-1 flex items-center justify-center relative z-10">
                      <span className="data-tag inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-gradient-to-r from-pink-100 to-orange-50 text-gray-800 border border-orange-200/50 shadow-sm">
                        <Heart className="w-4 h-4 text-pink-500" />
                        {player.fame.toLocaleString()}
                      </span>
                    </div>

                    {/* EXP */}
                    <div className="col-span-1 flex items-center justify-center relative z-10">
                      <span className="data-tag inline-block px-3 py-1 rounded-full text-xs font-mono font-semibold bg-gradient-to-r from-purple-100 to-orange-50 text-gray-800 border border-orange-200/50 shadow-sm">
                        {player.exp.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* User's Ranking Highlight - Only show when not in table and on first page */}
      {userRanking && !rankings.some(r => r.isCurrentUser) && rankingFilters.job === 'all' && !rankingFilters.search && rankingFilters.page === 1 && (
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-xl shadow-lg">
          <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <Crown className="w-6 h-6" />
            Your Best Character
          </h3>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center">
              <MapleStoryCharacterRenderer 
                character={{
                  id: userRanking.id,
                  name: userRanking.name,
                  level: userRanking.level,
                  job: userRanking.jobId.toString(),
                  skincolor: userRanking.skincolor || 0,
                  gender: userRanking.gender || 0,
                  hair: userRanking.hair || 30000,
                  face: userRanking.face || 20000,
                  equipment: userRanking.equipment || {},
                  stats: userRanking.stats || { str: 4, dex: 4, int: 4, luk: 4 },
                  exp: userRanking.exp || 0,
                  meso: userRanking.meso || 0
                }}
                scale={0.8}
              />
            </div>
            <div>
              <div className="text-2xl font-bold">#{userRanking.rank}</div>
              <div className="text-lg">{userRanking.name}</div>
              <div className="text-orange-100">Level {userRanking.level} {userRanking.job}</div>
              {userRanking.guild && (
                <div className="text-orange-200 text-sm">[{userRanking.guild}]</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      {rankingPagination && rankingPagination.totalPages > 1 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {rankingPagination.startItem}-{rankingPagination.endItem} of {rankingPagination.totalItems} players
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(rankingFilters.page - 1)}
                disabled={!rankingPagination.hasPrevPage}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  rankingPagination.hasPrevPage
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, rankingPagination.totalPages) }, (_, i) => {
                  const startPage = Math.max(1, rankingPagination.currentPage - 2);
                  const pageNum = startPage + i;
                  
                  if (pageNum > rankingPagination.totalPages) return null;
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                        pageNum === rankingPagination.currentPage
                          ? 'bg-orange-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-orange-100 hover:text-orange-600'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => handlePageChange(rankingFilters.page + 1)}
                disabled={!rankingPagination.hasNextPage}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  rankingPagination.hasNextPage
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                }`}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RankingsTab;