import { useState } from "react";
import { X, Lightbulb, Target, Users, DollarSign, Calendar, CheckCircle, ExternalLink, TrendingUp, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { SearchResult } from "@shared/schema";

interface ActionPlanModalProps {
  isOpen: boolean;
  result: SearchResult | null;
  onClose: () => void;
}

export default function ActionPlanModal({ isOpen, result, onClose }: ActionPlanModalProps) {
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  if (!isOpen || !result) return null;

  const toggleStep = (stepIndex: number) => {
    setCompletedSteps(prev => 
      prev.includes(stepIndex) 
        ? prev.filter(i => i !== stepIndex)
        : [...prev, stepIndex]
    );
  };

  const validationSteps = [
    "Research existing solutions and competitors",
    "Interview 5-10 potential customers",
    "Create basic prototype or mockup",
    "Test core assumptions with target market",
    "Validate pricing and business model"
  ];

  const developmentSteps = [
    "Define minimum viable product (MVP) scope",
    "Create technical architecture plan",
    "Build MVP with core features",
    "Set up basic infrastructure and hosting",
    "Implement user feedback system"
  ];

  const launchSteps = [
    "Create landing page and marketing materials",
    "Build social media presence",
    "Reach out to early adopters",
    "Launch beta with limited users",
    "Iterate based on user feedback"
  ];

  const scaleSteps = [
    "Analyze user data and behavior patterns",
    "Implement advanced features",
    "Build sales and marketing processes",
    "Seek funding or investment if needed",
    "Scale infrastructure for growth"
  ];

  const getTimelineEstimate = () => {
    switch (result.feasibility) {
      case "high": return "3-6 months to market";
      case "medium": return "6-12 months to market";
      case "low": return "12+ months to market";
      default: return "Timeline varies";
    }
  };

  const getInitialInvestment = () => {
    switch (result.feasibility) {
      case "high": return "$5K-$25K";
      case "medium": return "$25K-$100K";
      case "low": return "$100K+";
      default: return "Investment varies";
    }
  };

  const resources = [
    { name: "Lean Startup Canvas", url: "https://leanstack.com/lean-canvas", description: "Plan your business model" },
    { name: "Customer Development", url: "https://customerdevlabs.com/", description: "Validate your idea with customers" },
    { name: "No-Code Tools", url: "https://nocode.tech/", description: "Build MVPs without coding" },
    { name: "Y Combinator Startup School", url: "https://startupschool.org/", description: "Free online startup course" },
    { name: "Product Hunt", url: "https://producthunt.com/", description: "Launch and discover new products" }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto w-full neon-flame-border">
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{result.title}</h2>
              <p className="text-gray-300 mb-4">{result.description}</p>
              <div className="flex items-center space-x-4">
                <Badge variant="outline" className="flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  {getTimelineEstimate()}
                </Badge>
                <Badge variant="outline" className="flex items-center">
                  <DollarSign className="w-3 h-3 mr-1" />
                  {getInitialInvestment()}
                </Badge>
                <Badge variant="outline" className="flex items-center">
                  <Target className="w-3 h-3 mr-1" />
                  Market: {result.marketSize}
                </Badge>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="p-2 text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="p-6">
          <Tabs defaultValue="analysis" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="analysis">Full Analysis</TabsTrigger>
              <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
              <TabsTrigger value="research">Research</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
              <TabsTrigger value="funding">Funding</TabsTrigger>
            </TabsList>

            <TabsContent value="analysis" className="space-y-6">
              {/* Overview Section */}
              <div className="bg-gradient-to-br from-orange-900/20 to-purple-900/20 p-6 rounded-lg border border-orange-500/30">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <Lightbulb className="w-5 h-5 mr-2 text-orange-400" />
                  Opportunity Overview
                </h3>
                <p className="text-gray-300 leading-relaxed mb-4">{result.description}</p>
                
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                    <h4 className="font-medium text-white mb-2">Why This Gap Exists</h4>
                    <p className="text-sm text-gray-300">{result.gapReason}</p>
                  </div>
                  {result.industryContext && (
                    <div className="bg-gray-800/50 p-4 rounded-lg">
                      <h4 className="font-medium text-white mb-2">Industry Context</h4>
                      <p className="text-sm text-gray-300">{result.industryContext}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Detailed Scores Explanation */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-white flex items-center">
                  <Target className="w-5 h-5 mr-2 text-orange-400" />
                  Detailed Score Analysis
                </h3>

                {/* Innovation Score */}
                <div className="bg-purple-900/20 p-5 rounded-lg border border-purple-500/30">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-white flex items-center">
                      <Lightbulb className="w-4 h-4 mr-2 text-purple-400" />
                      Innovation Score
                    </h4>
                    <span className="text-2xl font-bold text-purple-400">{result.innovationScore}/10</span>
                  </div>
                  <Progress value={result.innovationScore * 10} className="mb-3" />
                  <p className="text-sm text-gray-300 mb-2">
                    {result.innovationScore >= 8 
                      ? "This represents a highly innovative opportunity with significant potential to disrupt existing markets or create entirely new categories. The solution addresses problems in novel ways that haven't been widely explored."
                      : result.innovationScore >= 6
                      ? "This opportunity shows strong innovation potential with unique approaches to existing problems. While not entirely unprecedented, it offers fresh perspectives that could differentiate it in the market."
                      : result.innovationScore >= 4
                      ? "This represents a moderate innovation opportunity, building on existing concepts with incremental improvements. Success will depend on execution quality and market positioning."
                      : "This opportunity involves lower innovation risk but may face more competition. Focus on execution excellence and finding unique angles to stand out."}
                  </p>
                  <div className="mt-3 pt-3 border-t border-purple-500/20">
                    <p className="text-xs text-gray-400">
                      <strong>What this means:</strong> {result.innovationScore >= 7 ? "High potential for patents, first-mover advantage, and premium positioning." : result.innovationScore >= 5 ? "Good differentiation potential with focused positioning strategy." : "Compete on execution, customer service, and niche targeting."}
                    </p>
                  </div>
                </div>

                {/* Feasibility Analysis */}
                <div className="bg-green-900/20 p-5 rounded-lg border border-green-500/30">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-white flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2 text-green-400" />
                      Feasibility Assessment
                    </h4>
                    <Badge className={`${result.feasibility === 'high' ? 'bg-green-500/20 text-green-400' : result.feasibility === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'} text-lg font-bold capitalize`}>
                      {result.feasibility}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-300 mb-3">
                    {result.feasibility === 'high'
                      ? "This opportunity has high feasibility with existing technology and reasonable resource requirements. You can likely build an MVP within 3-6 months with a small team and moderate budget. Technical barriers are manageable, and required expertise is readily available."
                      : result.feasibility === 'medium'
                      ? "This opportunity presents moderate feasibility challenges. You'll need 6-12 months for development, specialized skills or partnerships, and a more substantial budget. Some technical or regulatory hurdles exist but are surmountable with proper planning."
                      : "This opportunity involves significant feasibility challenges requiring 12+ months, substantial capital, specialized expertise, or breakthrough technology. Consider partnerships, phased approaches, or waiting for enabling technologies to mature."}
                  </p>
                  <div className="grid md:grid-cols-3 gap-3 mt-3">
                    <div className="bg-gray-800/50 p-3 rounded">
                      <p className="text-xs text-gray-400 mb-1">Time to Market</p>
                      <p className="text-sm font-semibold text-white">{getTimelineEstimate()}</p>
                    </div>
                    <div className="bg-gray-800/50 p-3 rounded">
                      <p className="text-xs text-gray-400 mb-1">Initial Investment</p>
                      <p className="text-sm font-semibold text-white">{getInitialInvestment()}</p>
                    </div>
                    <div className="bg-gray-800/50 p-3 rounded">
                      <p className="text-xs text-gray-400 mb-1">Technical Complexity</p>
                      <p className="text-sm font-semibold text-white capitalize">{result.feasibility}</p>
                    </div>
                  </div>
                </div>

                {/* Market Potential */}
                <div className="bg-blue-900/20 p-5 rounded-lg border border-blue-500/30">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-white flex items-center">
                      <TrendingUp className="w-4 h-4 mr-2 text-blue-400" />
                      Market Potential
                    </h4>
                    <div className="text-right">
                      <Badge className={`${result.marketPotential === 'high' ? 'bg-blue-500/20 text-blue-400' : result.marketPotential === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'} text-lg font-bold capitalize mb-1`}>
                        {result.marketPotential}
                      </Badge>
                      <p className="text-sm text-gray-400">{result.marketSize}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-300 mb-3">
                    {result.marketPotential === 'high'
                      ? `The ${result.marketSize} market size indicates substantial revenue potential. High market potential means strong demand signals, growing market trends, and multiple customer segments. This opportunity could scale to significant revenue with proper execution.`
                      : result.marketPotential === 'medium'
                      ? `The ${result.marketSize} market size suggests solid revenue potential in a defined niche. Medium market potential indicates proven demand but may require focused targeting or market education. Success depends on capturing a meaningful market share.`
                      : `The ${result.marketSize} market size indicates a smaller or emerging market. Lower market potential suggests niche opportunities or markets requiring development. Consider if this aligns with your growth goals or if it's a stepping stone to larger markets.`}
                  </p>
                  {result.competitorAnalysis && (
                    <div className="mt-3 pt-3 border-t border-blue-500/20">
                      <p className="text-xs text-gray-400 mb-1"><strong>Competitive Landscape:</strong></p>
                      <p className="text-sm text-gray-300">{result.competitorAnalysis}</p>
                    </div>
                  )}
                </div>

                {/* Confidence Score */}
                <div className="bg-orange-900/20 p-5 rounded-lg border border-orange-500/30">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-white flex items-center">
                      <Target className="w-4 h-4 mr-2 text-orange-400" />
                      Confidence Level
                    </h4>
                    <span className="text-2xl font-bold text-orange-400">{result.confidenceScore || 75}%</span>
                  </div>
                  <Progress value={result.confidenceScore || 75} className="mb-3" />
                  <p className="text-sm text-gray-300">
                    {(result.confidenceScore || 75) >= 80
                      ? "High confidence based on strong market signals, clear demand indicators, and validated assumptions. The analysis is backed by substantial data and real-world evidence."
                      : (result.confidenceScore || 75) >= 60
                      ? "Moderate confidence with good supporting evidence but some assumptions requiring validation. Additional market research is recommended before major investment."
                      : "Lower confidence due to limited data, emerging market conditions, or significant unknowns. Treat this as a hypothesis requiring thorough validation before proceeding."}
                  </p>
                </div>
              </div>

              {/* Actionable Recommendations */}
              {result.actionableRecommendations && (result.actionableRecommendations as string[]).length > 0 && (
                <div className="bg-yellow-900/20 p-5 rounded-lg border border-yellow-500/30">
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2 text-yellow-400" />
                    Key Recommendations
                  </h3>
                  <div className="space-y-3">
                    {(result.actionableRecommendations as string[]).map((rec: string, index: number) => (
                      <div key={index} className="flex items-start gap-3 bg-gray-800/50 p-3 rounded">
                        <span className="flex-shrink-0 w-6 h-6 bg-yellow-500/20 text-yellow-400 rounded-full flex items-center justify-center text-sm font-semibold">
                          {index + 1}
                        </span>
                        <p className="text-sm text-gray-300 flex-1">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Next Steps */}
              <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 p-5 rounded-lg border border-purple-500/30">
                <h3 className="text-xl font-semibold text-white mb-3 flex items-center">
                  <ArrowRight className="w-5 h-5 mr-2 text-purple-400" />
                  Ready to Move Forward?
                </h3>
                <p className="text-sm text-gray-300 mb-4">
                  Now that you understand the opportunity in detail, explore the other tabs to see the development roadmap, market research strategies, helpful resources, and funding options.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">📋 Development Roadmap</Badge>
                  <Badge variant="outline" className="text-xs">🔍 Market Research</Badge>
                  <Badge variant="outline" className="text-xs">📚 Resources</Badge>
                  <Badge variant="outline" className="text-xs">💰 Funding Options</Badge>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="roadmap" className="space-y-6">
              <div className="grid gap-6">
                <div className="bg-blue-900/30 p-4 rounded-lg border border-blue-600/30">
                  <h3 className="font-semibold text-white mb-2 flex items-center">
                    <Target className="w-4 h-4 mr-2" />
                    Phase 1: Validation (0-2 months)
                  </h3>
                  <div className="space-y-2">
                    {validationSteps.map((step, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <button
                          onClick={() => toggleStep(index)}
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                            completedSteps.includes(index) 
                              ? 'bg-green-500 border-green-500' 
                              : 'border-gray-300'
                          }`}
                        >
                          {completedSteps.includes(index) && (
                            <CheckCircle className="w-3 h-3 text-white" />
                          )}
                        </button>
                        <span className={completedSteps.includes(index) ? 'line-through text-gray-500' : 'text-gray-300'}>
                          {step}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-green-900/30 p-4 rounded-lg border border-green-600/30">
                  <h3 className="font-semibold text-white mb-2 flex items-center">
                    <Lightbulb className="w-4 h-4 mr-2" />
                    Phase 2: Development (2-4 months)
                  </h3>
                  <div className="space-y-2">
                    {developmentSteps.map((step, index) => (
                      <div key={index + 10} className="flex items-center space-x-2">
                        <button
                          onClick={() => toggleStep(index + 10)}
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                            completedSteps.includes(index + 10) 
                              ? 'bg-green-500 border-green-500' 
                              : 'border-gray-300'
                          }`}
                        >
                          {completedSteps.includes(index + 10) && (
                            <CheckCircle className="w-3 h-3 text-white" />
                          )}
                        </button>
                        <span className={completedSteps.includes(index + 10) ? 'line-through text-gray-500' : 'text-gray-300'}>
                          {step}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-orange-900/30 p-4 rounded-lg border border-orange-600/30">
                  <h3 className="font-semibold text-white mb-2 flex items-center">
                    <Users className="w-4 h-4 mr-2" />
                    Phase 3: Launch (4-6 months)
                  </h3>
                  <div className="space-y-2">
                    {launchSteps.map((step, index) => (
                      <div key={index + 20} className="flex items-center space-x-2">
                        <button
                          onClick={() => toggleStep(index + 20)}
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                            completedSteps.includes(index + 20) 
                              ? 'bg-green-500 border-green-500' 
                              : 'border-gray-300'
                          }`}
                        >
                          {completedSteps.includes(index + 20) && (
                            <CheckCircle className="w-3 h-3 text-white" />
                          )}
                        </button>
                        <span className={completedSteps.includes(index + 20) ? 'line-through text-gray-500' : 'text-gray-300'}>
                          {step}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-purple-900/30 p-4 rounded-lg border border-purple-600/30">
                  <h3 className="font-semibold text-white mb-2 flex items-center">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Phase 4: Scale (6+ months)
                  </h3>
                  <div className="space-y-2">
                    {scaleSteps.map((step, index) => (
                      <div key={index + 30} className="flex items-center space-x-2">
                        <button
                          onClick={() => toggleStep(index + 30)}
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                            completedSteps.includes(index + 30) 
                              ? 'bg-green-500 border-green-500' 
                              : 'border-gray-300'
                          }`}
                        >
                          {completedSteps.includes(index + 30) && (
                            <CheckCircle className="w-3 h-3 text-white" />
                          )}
                        </button>
                        <span className={completedSteps.includes(index + 30) ? 'line-through text-gray-500' : 'text-gray-300'}>
                          {step}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-2 text-gray-300">
                    <span>Progress: {completedSteps.length}/20 steps</span>
                    <span>{Math.round((completedSteps.length / 20) * 100)}%</span>
                  </div>
                  <Progress value={(completedSteps.length / 20) * 100} className="w-full" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="research" className="space-y-4">
              <div className="bg-yellow-900/30 p-4 rounded-lg border border-yellow-600/30">
                <h3 className="font-semibold text-white mb-3">Market Research Strategy</h3>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium mb-1 text-white">Target Customer Analysis</h4>
                    <p className="text-sm text-gray-300">
                      Identify and interview potential users. Create customer personas and understand pain points.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1 text-white">Competitive Analysis</h4>
                    <p className="text-sm text-gray-300">
                      Research existing solutions, their pricing, features, and customer feedback.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1 text-white">Market Size Validation</h4>
                    <p className="text-sm text-gray-300">
                      Validate the {result.marketSize} market size estimate through industry reports and surveys.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="border border-gray-600 rounded-lg p-4 bg-gray-700/30">
                <h4 className="font-semibold text-white mb-2">Why This Gap Exists</h4>
                <p className="text-gray-300">{result.gapReason}</p>
              </div>
            </TabsContent>

            <TabsContent value="resources" className="space-y-4">
              <div className="grid gap-4">
                {resources.map((resource, index) => (
                  <div key={index} className="border border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow bg-gray-700/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-white">{resource.name}</h4>
                        <p className="text-sm text-gray-300">{resource.description}</p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a href={resource.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="funding" className="space-y-4">
              <div className="grid gap-4">
                <div className="bg-green-900/30 p-4 rounded-lg border border-green-600/30">
                  <h4 className="font-semibold text-white mb-2">Bootstrap Funding</h4>
                  <p className="text-sm text-gray-300 mb-2">Self-fund with personal savings or revenue</p>
                  <p className="text-xs text-green-400">Best for: High feasibility projects with low initial costs</p>
                </div>

                <div className="bg-blue-900/30 p-4 rounded-lg border border-blue-600/30">
                  <h4 className="font-semibold text-white mb-2">Angel Investors</h4>
                  <p className="text-sm text-gray-300 mb-2">Individual investors providing $25K-$100K</p>
                  <p className="text-xs text-blue-400">Best for: Proven concept with early traction</p>
                </div>

                <div className="bg-purple-900/30 p-4 rounded-lg border border-purple-600/30">
                  <h4 className="font-semibold text-white mb-2">Venture Capital</h4>
                  <p className="text-sm text-gray-300 mb-2">Professional investors providing $500K+</p>
                  <p className="text-xs text-purple-400">Best for: High-growth potential with large market</p>
                </div>

                <div className="bg-orange-900/30 p-4 rounded-lg border border-orange-600/30">
                  <h4 className="font-semibold text-white mb-2">Crowdfunding</h4>
                  <p className="text-sm text-gray-300 mb-2">Public funding through platforms like Kickstarter</p>
                  <p className="text-xs text-orange-400">Best for: Consumer products with broad appeal</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}