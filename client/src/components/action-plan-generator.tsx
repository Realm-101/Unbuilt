import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, Circle, Clock, DollarSign, Users, Lightbulb, TrendingUp, Target, Calendar, FileText } from "lucide-react";
import { SearchResult } from "@shared/schema";

interface ActionPlanGeneratorProps {
  result: SearchResult;
  isPro: boolean;
  onUpgrade: () => void;
}

interface ActionStep {
  id: string;
  title: string;
  description: string;
  timeline: string;
  cost: string;
  difficulty: 'easy' | 'medium' | 'hard';
  completed: boolean;
  resources: string[];
}

interface ActionPlan {
  overview: string;
  totalTimeline: string;
  estimatedCost: string;
  phases: {
    id: string;
    name: string;
    duration: string;
    steps: ActionStep[];
  }[];
  keyMilestones: string[];
  successMetrics: string[];
  risks: string[];
  fundingStrategy: string[];
}

export default function ActionPlanGenerator({ result, isPro, onUpgrade }: ActionPlanGeneratorProps) {
  const [activePhase, setActivePhase] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  // Generate comprehensive action plan based on the gap
  const generateActionPlan = (): ActionPlan => {
    const plans = {
      tech: {
        overview: `Launch ${result.title} as a SaaS platform targeting ${result.marketSize} market with high ${result.feasibility} feasibility.`,
        totalTimeline: "12-18 months",
        estimatedCost: "$50K - $200K",
        phases: [
          {
            id: "validation",
            name: "Market Validation",
            duration: "2-3 months",
            steps: [
              {
                id: "research",
                title: "Conduct Market Research",
                description: "Deep dive into target market, validate demand, and identify key pain points",
                timeline: "2-4 weeks",
                cost: "$5K - $15K",
                difficulty: "medium" as const,
                completed: false,
                resources: ["Market research tools", "Survey platforms", "Interview guides"]
              },
              {
                id: "mvp-design",
                title: "Design MVP Wireframes",
                description: "Create detailed wireframes and user flow for minimum viable product",
                timeline: "2-3 weeks",
                cost: "$3K - $8K",
                difficulty: "easy" as const,
                completed: false,
                resources: ["Figma/Sketch", "UX designer", "User testing platform"]
              },
              {
                id: "tech-stack",
                title: "Choose Technology Stack",
                description: "Select optimal tech stack based on scalability and team expertise",
                timeline: "1 week",
                cost: "$0 - $2K",
                difficulty: "medium" as const,
                completed: false,
                resources: ["Technology assessment", "Developer consultation", "Architecture planning"]
              }
            ]
          },
          {
            id: "development",
            name: "Product Development",
            duration: "4-6 months", 
            steps: [
              {
                id: "mvp-build",
                title: "Build MVP",
                description: "Develop core features with basic functionality for early testing",
                timeline: "8-12 weeks",
                cost: "$25K - $75K",
                difficulty: "hard" as const,
                completed: false,
                resources: ["Development team", "Cloud infrastructure", "Testing tools"]
              },
              {
                id: "beta-testing",
                title: "Beta Testing Program",
                description: "Launch closed beta with 50-100 early adopters for feedback",
                timeline: "4-6 weeks",
                cost: "$2K - $5K",
                difficulty: "medium" as const,
                completed: false,
                resources: ["Beta user recruitment", "Feedback tools", "Analytics platform"]
              }
            ]
          },
          {
            id: "launch",
            name: "Market Launch",
            duration: "3-4 months",
            steps: [
              {
                id: "marketing-strategy",
                title: "Launch Marketing Strategy",
                description: "Execute comprehensive marketing plan across multiple channels",
                timeline: "Ongoing",
                cost: "$10K - $30K/month",
                difficulty: "medium" as const,
                completed: false,
                resources: ["Marketing team", "Ad platforms", "Content creation tools"]
              },
              {
                id: "sales-funnel",
                title: "Build Sales Funnel",
                description: "Create automated sales and onboarding processes",
                timeline: "3-4 weeks",
                cost: "$3K - $10K",
                difficulty: "medium" as const,
                completed: false,
                resources: ["CRM system", "Email automation", "Payment processing"]
              }
            ]
          },
          {
            id: "scale",
            name: "Scale & Growth",
            duration: "6+ months",
            steps: [
              {
                id: "team-expansion",
                title: "Expand Team",
                description: "Hire key roles: sales, marketing, customer success, and development",
                timeline: "3-6 months",
                cost: "$100K - $300K/year",
                difficulty: "hard" as const,
                completed: false,
                resources: ["Recruitment platforms", "HR systems", "Team management tools"]
              },
              {
                id: "feature-expansion",
                title: "Advanced Features",
                description: "Build enterprise features and integrations based on customer feedback",
                timeline: "Ongoing",
                cost: "$20K - $50K/month",
                difficulty: "hard" as const,
                completed: false,
                resources: ["Development team", "Enterprise tools", "Integration platforms"]
              }
            ]
          }
        ],
        keyMilestones: [
          "First paying customer acquired",
          "100 active users",
          "$10K MRR achieved", 
          "Product-market fit validated",
          "$100K ARR reached"
        ],
        successMetrics: [
          "Monthly Recurring Revenue (MRR)",
          "Customer Acquisition Cost (CAC)",
          "Customer Lifetime Value (LTV)",
          "User engagement rate",
          "Market share growth"
        ],
        risks: [
          "Technical scalability challenges",
          "Competitive market entry",
          "Customer acquisition costs",
          "Team scaling difficulties",
          "Cash flow management"
        ],
        fundingStrategy: [
          "Bootstrap with personal savings ($10K-50K)",
          "Friends & family round ($50K-250K)",
          "Angel investors ($250K-1M)",
          "Seed funding ($1M-5M)",
          "Series A ($5M-20M)"
        ]
      },
      // Add more category-specific plans
      default: {
        overview: `Develop ${result.title} to address the identified market gap with ${result.feasibility} implementation feasibility.`,
        totalTimeline: "6-12 months",
        estimatedCost: "$20K - $100K",
        phases: [
          {
            id: "research",
            name: "Research & Planning",
            duration: "1-2 months",
            steps: [
              {
                id: "market-analysis",
                title: "Market Analysis",
                description: "Analyze market size, competition, and customer needs",
                timeline: "2-3 weeks",
                cost: "$2K - $5K",
                difficulty: "easy" as const,
                completed: false,
                resources: ["Market research", "Competitor analysis", "Customer interviews"]
              }
            ]
          },
          {
            id: "execute",
            name: "Execution",
            duration: "3-6 months",
            steps: [
              {
                id: "build-solution",
                title: "Build Solution",
                description: "Develop the core product or service",
                timeline: "3-6 months",
                cost: "$15K - $75K",
                difficulty: "medium" as const,
                completed: false,
                resources: ["Development resources", "Testing", "Quality assurance"]
              }
            ]
          },
          {
            id: "launch",
            name: "Launch & Marketing",
            duration: "2-4 months",
            steps: [
              {
                id: "go-to-market",
                title: "Go-to-Market Strategy",
                description: "Launch product and acquire first customers",
                timeline: "2-4 months",
                cost: "$3K - $20K",
                difficulty: "medium" as const,
                completed: false,
                resources: ["Marketing channels", "Sales strategy", "Customer support"]
              }
            ]
          }
        ],
        keyMilestones: [
          "Market research completed",
          "MVP developed",
          "First customers acquired",
          "Break-even achieved"
        ],
        successMetrics: [
          "Customer satisfaction",
          "Revenue growth",
          "Market penetration",
          "Operational efficiency"
        ],
        risks: [
          "Market timing",
          "Competition",
          "Resource constraints",
          "Execution challenges"
        ],
        fundingStrategy: [
          "Personal investment",
          "Small business loans",
          "Crowdfunding",
          "Angel investment"
        ]
      }
    };

    return result.category.toLowerCase().includes('tech') ? plans.tech : plans.default;
  };

  const actionPlan = generateActionPlan();

  const toggleStepCompletion = (stepId: string) => {
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(stepId)) {
      newCompleted.delete(stepId);
    } else {
      newCompleted.add(stepId);
    }
    setCompletedSteps(newCompleted);
  };

  const calculateProgress = () => {
    const totalSteps = actionPlan.phases.reduce((acc, phase) => acc + phase.steps.length, 0);
    const completedCount = completedSteps.size;
    return totalSteps > 0 ? (completedCount / totalSteps) * 100 : 0;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isPro) {
    return (
      <Card className="border-2 border-dashed border-blue-300 bg-blue-50">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-xl">AI-Powered Action Plan</CardTitle>
          <CardDescription>
            Get a comprehensive step-by-step roadmap to build this opportunity
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>12-18 month timeline</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
              <DollarSign className="w-4 h-4" />
              <span>Funding strategy included</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
              <TrendingUp className="w-4 h-4" />
              <span>Success metrics & milestones</span>
            </div>
          </div>
          <Button onClick={onUpgrade} size="lg" className="w-full">
            Upgrade to Pro for Action Plans
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="w-5 h-5" />
            <span>Action Plan Overview</span>
          </CardTitle>
          <CardDescription>{actionPlan.overview}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{actionPlan.totalTimeline}</div>
              <div className="text-sm text-gray-500">Total Timeline</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{actionPlan.estimatedCost}</div>
              <div className="text-sm text-gray-500">Estimated Investment</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{Math.round(calculateProgress())}%</div>
              <div className="text-sm text-gray-500">Completion</div>
            </div>
          </div>
          <Progress value={calculateProgress()} className="w-full" />
        </CardContent>
      </Card>

      {/* Detailed Plan */}
      <Tabs value={activePhase.toString()} onValueChange={(value) => setActivePhase(parseInt(value))}>
        <TabsList className="grid w-full grid-cols-4">
          {actionPlan.phases.map((phase, index) => (
            <TabsTrigger key={phase.id} value={index.toString()}>
              {phase.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {actionPlan.phases.map((phase, index) => (
          <TabsContent key={phase.id} value={index.toString()}>
            <Card>
              <CardHeader>
                <CardTitle>{phase.name}</CardTitle>
                <CardDescription>Duration: {phase.duration}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {phase.steps.map((step) => (
                    <div
                      key={step.id}
                      className={`p-4 border rounded-lg transition-all ${
                        completedSteps.has(step.id) ? 'bg-green-50 border-green-200' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <button
                          onClick={() => toggleStepCompletion(step.id)}
                          className="mt-1 text-green-600 hover:text-green-700"
                        >
                          {completedSteps.has(step.id) ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : (
                            <Circle className="w-5 h-5" />
                          )}
                        </button>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className={`font-semibold ${completedSteps.has(step.id) ? 'line-through text-gray-500' : ''}`}>
                              {step.title}
                            </h4>
                            <div className="flex items-center space-x-2">
                              <Badge className={getDifficultyColor(step.difficulty)}>
                                {step.difficulty}
                              </Badge>
                              <Badge variant="outline">
                                <Clock className="w-3 h-3 mr-1" />
                                {step.timeline}
                              </Badge>
                              <Badge variant="outline">
                                <DollarSign className="w-3 h-3 mr-1" />
                                {step.cost}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-gray-600 mb-3">{step.description}</p>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">Resources needed:</span>
                            <div className="flex flex-wrap gap-1">
                              {step.resources.map((resource, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {resource}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Additional Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Key Milestones</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {actionPlan.keyMilestones.map((milestone, index) => (
                <li key={index} className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">{milestone}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5" />
              <span>Funding Strategy</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {actionPlan.fundingStrategy.map((strategy, index) => (
                <li key={index} className="flex items-center space-x-2">
                  <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">
                    {index + 1}
                  </span>
                  <span className="text-sm">{strategy}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}