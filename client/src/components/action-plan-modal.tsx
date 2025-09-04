import { useState } from "react";
import { X, Lightbulb, Target, Users, DollarSign, Calendar, CheckCircle, ExternalLink } from "lucide-react";
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
          <Tabs defaultValue="roadmap" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="roadmap">Development Roadmap</TabsTrigger>
              <TabsTrigger value="research">Market Research</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
              <TabsTrigger value="funding">Funding Options</TabsTrigger>
            </TabsList>

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