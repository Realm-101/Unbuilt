import React from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Search, 
  Lightbulb, 
  Target,
  BarChart3,
  Activity,
  Users,
  Zap,
  ArrowUp,
  ArrowDown,
  DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardStatsProps {
  totalSearches?: number;
  totalGaps?: number;
  avgInnovationScore?: number;
  topCategory?: string;
  recentActivity?: Array<{
    type: 'search' | 'result' | 'export';
    text: string;
    timestamp: string;
  }>;
}

const StatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  change, 
  gradient 
}: { 
  icon: any; 
  label: string; 
  value: string | number; 
  change?: number;
  gradient: string;
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="relative bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-6 overflow-hidden group"
    >
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-5 group-hover:opacity-10 transition-opacity",
        gradient
      )} />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className={cn(
            "p-3 rounded-lg bg-gradient-to-br",
            gradient.replace('from-', 'from-').replace('to-', 'to-') + '/20'
          )}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          {change !== undefined && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
              change > 0 
                ? "bg-green-500/20 text-green-400" 
                : change < 0 
                ? "bg-red-500/20 text-red-400"
                : "bg-gray-500/20 text-gray-400"
            )}>
              {change > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              <span>{Math.abs(change)}%</span>
            </div>
          )}
        </div>
        
        <div>
          <div className="text-3xl font-bold text-white mb-1">{value}</div>
          <div className="text-sm text-gray-400">{label}</div>
        </div>
      </div>
    </motion.div>
  );
};

const ActivityItem = ({ activity }: { activity: any }) => {
  const getIcon = () => {
    switch (activity.type) {
      case 'search': return Search;
      case 'result': return Lightbulb;
      case 'export': return BarChart3;
      default: return Activity;
    }
  };
  
  const Icon = getIcon();
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 py-3 px-4 hover:bg-white/5 rounded-lg transition-colors"
    >
      <div className="p-2 rounded-lg bg-white/10">
        <Icon className="h-4 w-4 text-orange-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{activity.text}</p>
        <p className="text-xs text-gray-500">{activity.timestamp}</p>
      </div>
    </motion.div>
  );
};

export function DashboardStats({
  totalSearches = 0,
  totalGaps = 0,
  avgInnovationScore = 0,
  topCategory = 'Tech',
  recentActivity = []
}: DashboardStatsProps) {
  const mockTrends = {
    searches: 15,
    gaps: 23,
    innovation: 5,
    engagement: -3
  };

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Search}
          label="Total Searches"
          value={totalSearches.toLocaleString()}
          change={mockTrends.searches}
          gradient="from-blue-500 to-cyan-500"
        />
        <StatCard
          icon={Lightbulb}
          label="Gaps Discovered"
          value={totalGaps.toLocaleString()}
          change={mockTrends.gaps}
          gradient="from-orange-500 to-red-500"
        />
        <StatCard
          icon={Zap}
          label="Avg Innovation"
          value={`${avgInnovationScore.toFixed(1)}/10`}
          change={mockTrends.innovation}
          gradient="from-purple-500 to-pink-500"
        />
        <StatCard
          icon={Target}
          label="Top Category"
          value={topCategory}
          change={mockTrends.engagement}
          gradient="from-green-500 to-emerald-500"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Market Potential Overview */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-400" />
            Market Potential
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">High Potential</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '65%' }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                  />
                </div>
                <span className="text-sm text-white font-medium">65%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Medium Potential</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '25%' }}
                    transition={{ duration: 1, delay: 0.3 }}
                    className="h-full bg-gradient-to-r from-yellow-500 to-amber-500"
                  />
                </div>
                <span className="text-sm text-white font-medium">25%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Low Potential</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '10%' }}
                    transition={{ duration: 1, delay: 0.4 }}
                    className="h-full bg-gradient-to-r from-red-500 to-rose-500"
                  />
                </div>
                <span className="text-sm text-white font-medium">10%</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Feasibility Breakdown */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-orange-400" />
            Feasibility Analysis
          </h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
              <div className="text-2xl font-bold text-green-400">42</div>
              <div className="text-xs text-gray-400">High</div>
            </div>
            <div className="bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/20">
              <div className="text-2xl font-bold text-yellow-400">28</div>
              <div className="text-xs text-gray-400">Medium</div>
            </div>
            <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
              <div className="text-2xl font-bold text-red-400">15</div>
              <div className="text-xs text-gray-400">Low</div>
            </div>
          </div>
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              Most opportunities are highly feasible
            </p>
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-purple-400" />
            Recent Activity
          </h3>
          <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <ActivityItem key={index} activity={activity} />
              ))
            ) : (
              <div className="text-center py-8">
                <Users className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No recent activity</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Insights Panel */}
      <motion.div
        whileHover={{ scale: 1.01 }}
        className="bg-gradient-to-br from-orange-500/10 to-purple-500/10 backdrop-blur-xl rounded-xl border border-orange-500/20 p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-orange-400" />
          Key Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Trending Category</div>
            <div className="text-white font-semibold">AI & Machine Learning</div>
            <div className="text-xs text-green-400 mt-1">↑ 34% this week</div>
          </div>
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Avg Market Size</div>
            <div className="text-white font-semibold">$2.4B</div>
            <div className="text-xs text-gray-500 mt-1">Per opportunity</div>
          </div>
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Success Rate</div>
            <div className="text-white font-semibold">78%</div>
            <div className="text-xs text-gray-500 mt-1">High feasibility ideas</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}