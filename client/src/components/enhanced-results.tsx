import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  Lightbulb, 
  DollarSign, 
  AlertCircle,
  ChevronRight,
  Sparkles,
  Rocket,
  Target,
  Clock,
  BarChart3,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SearchResult } from '@shared/schema';

interface EnhancedResultsProps {
  results: SearchResult[];
  onResultClick?: (result: SearchResult) => void;
  loading?: boolean;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "Tech That's Missing":
      return Rocket;
    case "Services That Don't Exist":
      return Target;
    case "Products Nobody's Made":
      return Lightbulb;
    case "Business Models":
      return TrendingUp;
    default:
      return Sparkles;
  }
};

const getFeasibilityColor = (feasibility: string) => {
  switch (feasibility) {
    case 'high':
      return 'from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-400';
    case 'medium':
      return 'from-yellow-500/20 to-amber-500/20 border-yellow-500/30 text-yellow-400';
    case 'low':
      return 'from-red-500/20 to-rose-500/20 border-red-500/30 text-red-400';
    default:
      return 'from-gray-500/20 to-gray-500/20 border-gray-500/30 text-gray-400';
  }
};

const getInnovationGradient = (score: number) => {
  if (score >= 8) return 'from-purple-500 to-pink-500';
  if (score >= 6) return 'from-blue-500 to-purple-500';
  if (score >= 4) return 'from-cyan-500 to-blue-500';
  return 'from-gray-500 to-gray-600';
};

export function EnhancedResults({ results, onResultClick, loading }: EnhancedResultsProps) {
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
              <div className="h-6 bg-white/10 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-white/10 rounded w-full mb-2"></div>
              <div className="h-4 bg-white/10 rounded w-5/6 mb-4"></div>
              <div className="flex gap-2 mb-4">
                <div className="h-8 bg-white/10 rounded-full w-24"></div>
                <div className="h-8 bg-white/10 rounded-full w-20"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <Lightbulb className="h-16 w-16 text-orange-400 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-white mb-2">No gaps discovered yet</h3>
        <p className="text-gray-400">Start searching to find untapped opportunities</p>
      </motion.div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <AnimatePresence mode="popLayout">
        {results.map((result, index) => {
          const CategoryIcon = getCategoryIcon(result.category);
          const isExpanded = expandedCard === index;
          const isHovered = hoveredCard === index;

          return (
            <motion.div
              key={result.id || index}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ 
                opacity: 1, 
                y: 0,
                scale: isHovered ? 1.02 : 1
              }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ 
                duration: 0.3,
                delay: index * 0.05
              }}
              onMouseEnter={() => setHoveredCard(index)}
              onMouseLeave={() => setHoveredCard(null)}
              onClick={() => {
                setExpandedCard(isExpanded ? null : index);
                onResultClick?.(result);
              }}
              className={cn(
                "relative group cursor-pointer",
                isExpanded && "md:col-span-2 lg:col-span-3"
              )}
            >
              <div className={cn(
                "relative bg-gradient-to-br from-black/60 to-black/40 backdrop-blur-xl rounded-xl border transition-all duration-300",
                isHovered 
                  ? "border-orange-500/50 shadow-2xl shadow-orange-500/20" 
                  : "border-white/10 shadow-xl"
              )}>
                {/* Innovation Score Badge */}
                <div className="absolute -top-3 -right-3 z-10">
                  <motion.div 
                    animate={{ rotate: isHovered ? 10 : 0 }}
                    className={cn(
                      "w-14 h-14 rounded-full flex items-center justify-center font-bold text-white shadow-lg bg-gradient-to-br",
                      getInnovationGradient(result.innovationScore)
                    )}
                  >
                    <div>
                      <div className="text-lg">{result.innovationScore}</div>
                      <div className="text-[8px] -mt-1">/ 10</div>
                    </div>
                  </motion.div>
                </div>

                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className={cn(
                      "p-3 rounded-lg bg-gradient-to-br transition-all duration-300",
                      isHovered 
                        ? "from-orange-500/30 to-red-500/30" 
                        : "from-white/10 to-white/5"
                    )}>
                      <CategoryIcon className="h-5 w-5 text-orange-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-1 line-clamp-2">
                        {result.title}
                      </h3>
                      <span className="text-xs text-gray-400">{result.category}</span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className={cn(
                    "text-gray-300 text-sm mb-4",
                    isExpanded ? "" : "line-clamp-3"
                  )}>
                    {result.description}
                  </p>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className={cn(
                      "px-3 py-2 rounded-lg bg-gradient-to-r border text-xs font-medium flex items-center gap-2",
                      getFeasibilityColor(result.feasibility)
                    )}>
                      <Clock className="h-3 w-3" />
                      <span>{result.feasibility} feasibility</span>
                    </div>
                    <div className={cn(
                      "px-3 py-2 rounded-lg bg-gradient-to-r border text-xs font-medium flex items-center gap-2",
                      result.marketPotential === 'high' 
                        ? 'from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-400'
                        : result.marketPotential === 'medium'
                        ? 'from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-400'
                        : 'from-gray-500/20 to-gray-500/20 border-gray-500/30 text-gray-400'
                    )}>
                      <BarChart3 className="h-3 w-3" />
                      <span>{result.marketPotential} potential</span>
                    </div>
                  </div>

                  {/* Market Size */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-400" />
                      <span className="text-xl font-bold text-green-400">
                        {result.marketSize}
                      </span>
                    </div>
                    <motion.div
                      animate={{ x: isHovered ? 5 : 0 }}
                      className="flex items-center gap-1 text-orange-400"
                    >
                      <span className="text-xs">Explore</span>
                      <ChevronRight className="h-4 w-4" />
                    </motion.div>
                  </div>

                  {/* Expanded Content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="border-t border-white/10 pt-4 mt-4"
                      >
                        <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg p-4 border border-yellow-500/20">
                          <div className="flex items-start gap-2 mb-2">
                            <AlertCircle className="h-4 w-4 text-yellow-400 mt-0.5" />
                            <div>
                              <h4 className="text-sm font-semibold text-yellow-400 mb-1">
                                Why This Gap Exists
                              </h4>
                              <p className="text-sm text-gray-300">
                                {result.gapReason}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex gap-3">
                          <button className="flex-1 py-2 px-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg text-sm font-medium hover:from-orange-600 hover:to-red-600 transition-all flex items-center justify-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            <span>Full Analysis</span>
                          </button>
                          <button className="flex-1 py-2 px-4 bg-white/10 text-white rounded-lg text-sm font-medium hover:bg-white/20 transition-all flex items-center justify-center gap-2">
                            <ExternalLink className="h-4 w-4" />
                            <span>Export</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}