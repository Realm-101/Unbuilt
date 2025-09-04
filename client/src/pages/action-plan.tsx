import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Calendar, Clock, DollarSign, Users, Target,
  ChevronRight, CheckCircle, AlertCircle, Rocket,
  Briefcase, TrendingUp, Shield, ArrowRight,
  Download, Share2, Milestone
} from "lucide-react";
import Layout from "@/components/layout-new";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface ActionPlanData {
  actionPlan: {
    title: string;
    overview: string;
    totalDuration: string;
    totalBudget: string;
    phases: {
      discovery: Phase;
      development: Phase;
      launch: Phase;
      growth: Phase;
    };
    criticalPath: string[];
    resourcePlan: {
      team: any[];
      tools: any[];
      infrastructure: any[];
    };
    metrics: any[];
    contingencyPlans: any[];
    nextActions: {
      immediate: string[];
      shortTerm: string[];
      planning: string[];
    };
  };
  summary: {
    summary: string;
    totalMilestones: number;
    criticalMilestones: string[];
    estimatedTimeline: string;
    budgetRange: string;
    teamSize: string;
    immediateActions: string[];
  };
}

interface Phase {
  id: string;
  name: string;
  objective: string;
  duration: string;
  milestones: any[];
  keyDeliverables: string[];
  budget: string;
  team: string[];
  risks: string[];
  gates: string[];
}

export default function ActionPlanPage() {
  const [, setLocation] = useLocation();
  const [actionPlanData, setActionPlanData] = useState<ActionPlanData | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<"discovery" | "development" | "launch" | "growth">("discovery");

  useEffect(() => {
    // Load action plan from localStorage
    const storedPlan = localStorage.getItem('actionPlan');
    if (storedPlan) {
      try {
        const data = JSON.parse(storedPlan);
        setActionPlanData(data);
      } catch (error) {
        console.error('Failed to parse action plan:', error);
      }
    }
  }, []);

  if (!actionPlanData) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold text-white mb-4">No Action Plan Available</h2>
            <p className="text-gray-400 mb-6">Please validate an idea first to generate an action plan.</p>
            <Button className="btn-flame" onClick={() => setLocation('/validate-idea')}>
              Validate an Idea
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const { actionPlan, summary } = actionPlanData;
  const phases = ["discovery", "development", "launch", "growth"] as const;
  const phaseIcons = {
    discovery: <Target className="w-5 h-5" />,
    development: <Briefcase className="w-5 h-5" />,
    launch: <Rocket className="w-5 h-5" />,
    growth: <TrendingUp className="w-5 h-5" />
  };

  const phaseColors = {
    discovery: "bg-blue-500",
    development: "bg-purple-500",
    launch: "bg-orange-500",
    growth: "bg-green-500"
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">
            <span className="flame-text">4-Phase Action Plan</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-6">
            {actionPlan.overview}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="flame-card">
            <CardHeader className="pb-3">
              <Clock className="w-8 h-8 text-blue-500 mb-2" />
              <CardTitle className="text-white">Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{summary.estimatedTimeline}</div>
              <p className="text-gray-400 text-sm">Total duration</p>
            </CardContent>
          </Card>

          <Card className="flame-card">
            <CardHeader className="pb-3">
              <DollarSign className="w-8 h-8 text-green-500 mb-2" />
              <CardTitle className="text-white">Budget</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{summary.budgetRange}</div>
              <p className="text-gray-400 text-sm">Total investment</p>
            </CardContent>
          </Card>

          <Card className="flame-card">
            <CardHeader className="pb-3">
              <Users className="w-8 h-8 text-purple-500 mb-2" />
              <CardTitle className="text-white">Team Size</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{summary.teamSize}</div>
              <p className="text-gray-400 text-sm">Required team</p>
            </CardContent>
          </Card>

          <Card className="flame-card">
            <CardHeader className="pb-3">
              <Milestone className="w-8 h-8 text-orange-500 mb-2" />
              <CardTitle className="text-white">Milestones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{summary.totalMilestones}</div>
              <p className="text-gray-400 text-sm">Key deliverables</p>
            </CardContent>
          </Card>
        </div>

        {/* Phase Timeline */}
        <Card className="flame-card mb-8">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Development Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="absolute top-6 left-0 right-0 h-1 bg-gray-700"></div>
              <div className="relative flex justify-between">
                {phases.map((phase, index) => (
                  <button
                    key={phase}
                    onClick={() => setSelectedPhase(phase)}
                    className="relative group"
                  >
                    <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center
                      ${selectedPhase === phase ? phaseColors[phase] : 'bg-gray-700'}
                      transition-all duration-300 hover:scale-110
                      ${selectedPhase === phase ? 'ring-4 ring-white/20' : ''}
                    `}>
                      <span className="text-white font-bold">{index + 1}</span>
                    </div>
                    <div className="mt-2 text-center">
                      <p className={`text-sm font-semibold ${selectedPhase === phase ? 'text-white' : 'text-gray-400'}`}>
                        {actionPlan.phases[phase].name}
                      </p>
                      <p className="text-xs text-gray-500">{actionPlan.phases[phase].duration}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selected Phase Details */}
        <Card className="flame-card mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${phaseColors[selectedPhase]}`}>
                  {phaseIcons[selectedPhase]}
                </div>
                <div>
                  <CardTitle className="text-2xl text-white">
                    {actionPlan.phases[selectedPhase].name}
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    {actionPlan.phases[selectedPhase].objective}
                  </CardDescription>
                </div>
              </div>
              <div className="text-right">
                <Badge className="bg-gray-700 text-gray-300">
                  {actionPlan.phases[selectedPhase].duration}
                </Badge>
                <p className="text-sm text-gray-400 mt-1">
                  {actionPlan.phases[selectedPhase].budget}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="milestones" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-gray-800 border-gray-700">
                <TabsTrigger value="milestones">Milestones</TabsTrigger>
                <TabsTrigger value="deliverables">Deliverables</TabsTrigger>
                <TabsTrigger value="team">Team</TabsTrigger>
                <TabsTrigger value="risks">Risks & Gates</TabsTrigger>
              </TabsList>

              <TabsContent value="milestones" className="space-y-4 mt-6">
                <Accordion type="single" collapsible className="w-full">
                  {actionPlan.phases[selectedPhase].milestones.map((milestone: any, index: number) => (
                    <AccordionItem key={milestone.id} value={milestone.id} className="border-gray-700">
                      <AccordionTrigger className="text-white hover:text-purple-300">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                            <span className="text-sm font-bold text-purple-300">{index + 1}</span>
                          </div>
                          <div className="text-left">
                            <p className="font-semibold">{milestone.title}</p>
                            <p className="text-sm text-gray-400">{milestone.duration}</p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="text-gray-300 space-y-3">
                        <p>{milestone.description}</p>
                        
                        <div>
                          <h5 className="text-sm font-semibold text-white mb-2">Deliverables:</h5>
                          <ul className="list-disc list-inside text-sm space-y-1">
                            {milestone.deliverables.map((deliverable: string, i: number) => (
                              <li key={i}>{deliverable}</li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <h5 className="text-sm font-semibold text-white mb-2">Success Criteria:</h5>
                          <ul className="list-disc list-inside text-sm space-y-1">
                            {milestone.successCriteria.map((criteria: string, i: number) => (
                              <li key={i}>{criteria}</li>
                            ))}
                          </ul>
                        </div>
                        
                        {milestone.estimatedCost && (
                          <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                            Est. Cost: {milestone.estimatedCost}
                          </Badge>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </TabsContent>

              <TabsContent value="deliverables" className="mt-6">
                <div className="space-y-3">
                  {actionPlan.phases[selectedPhase].keyDeliverables.map((deliverable: string, index: number) => (
                    <div key={index} className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                      <span className="text-gray-300">{deliverable}</span>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="team" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {actionPlan.phases[selectedPhase].team.map((role: string, index: number) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg">
                      <Users className="w-5 h-5 text-purple-400" />
                      <span className="text-white">{role}</span>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="risks" className="mt-6 space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-white mb-3">Key Risks</h4>
                  <div className="space-y-2">
                    {actionPlan.phases[selectedPhase].risks.map((risk: string, index: number) => (
                      <div key={index} className="flex items-start space-x-3">
                        <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                        <span className="text-gray-300">{risk}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-semibold text-white mb-3">Decision Gates</h4>
                  <div className="space-y-2">
                    {actionPlan.phases[selectedPhase].gates.map((gate: string, index: number) => (
                      <div key={index} className="flex items-start space-x-3">
                        <Shield className="w-5 h-5 text-blue-500 mt-0.5" />
                        <span className="text-gray-300">{gate}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Next Actions */}
        <Card className="flame-card mb-8">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Immediate Next Actions</CardTitle>
            <CardDescription className="text-gray-400">
              Start with these actionable steps to begin your journey
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="font-semibold text-white mb-3 flex items-center">
                  <span className="w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center mr-2">!</span>
                  Next 7 Days
                </h3>
                <div className="space-y-2">
                  {actionPlan.nextActions.immediate.map((action: string, i: number) => (
                    <div key={i} className="flex items-start">
                      <ChevronRight className="w-4 h-4 text-red-500 mt-0.5 mr-2" />
                      <span className="text-gray-300 text-sm">{action}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-white mb-3 flex items-center">
                  <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center mr-2">30</span>
                  Next 30 Days
                </h3>
                <div className="space-y-2">
                  {actionPlan.nextActions.shortTerm.map((action: string, i: number) => (
                    <div key={i} className="flex items-start">
                      <ChevronRight className="w-4 h-4 text-orange-500 mt-0.5 mr-2" />
                      <span className="text-gray-300 text-sm">{action}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-white mb-3 flex items-center">
                  <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center mr-2">📋</span>
                  Research & Planning
                </h3>
                <div className="space-y-2">
                  {actionPlan.nextActions.planning.map((action: string, i: number) => (
                    <div key={i} className="flex items-start">
                      <ChevronRight className="w-4 h-4 text-blue-500 mt-0.5 mr-2" />
                      <span className="text-gray-300 text-sm">{action}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Critical Path */}
        <Card className="flame-card mb-8">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Critical Path to Success</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2">
              {actionPlan.criticalPath.map((step: string, index: number) => (
                <React.Fragment key={index}>
                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 py-2 px-4">
                    {step}
                  </Badge>
                  {index < actionPlan.criticalPath.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-gray-500" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-center space-x-4">
          <Button className="btn-flame">
            <Download className="w-4 h-4 mr-2" />
            Export Plan as PDF
          </Button>
          <Button variant="outline" className="border-gray-700 text-gray-300">
            <Share2 className="w-4 h-4 mr-2" />
            Share Plan
          </Button>
          <Button variant="outline" className="border-gray-700 text-gray-300" onClick={() => setLocation('/validate-idea')}>
            Create Another Plan
          </Button>
        </div>
      </div>
    </Layout>
  );
}