import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Lightbulb, TrendingUp, Shield, Target, Zap, 
  CheckCircle, AlertCircle, Info, ArrowRight,
  Brain, BarChart3, Users, DollarSign, Scale
} from "lucide-react";
import Layout from "@/components/layout-new";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import CommentsSection from "@/components/comments-section";

const ideaSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(200),
  description: z.string().min(20, "Description must be at least 20 characters").max(2000),
  targetMarket: z.string().min(5, "Target market must be specified").max(500),
  businessModel: z.string().min(5, "Business model must be specified").max(500),
  category: z.enum(['tech', 'healthcare', 'fintech', 'ecommerce', 'saas', 'marketplace', 'education', 'sustainability', 'other']),
  initialInvestment: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  monthlyRevenue: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  monthlyExpenses: z.string().optional().transform(val => val ? parseInt(val) : undefined),
});

type IdeaFormData = z.input<typeof ideaSchema>;

interface ValidationResult {
  idea: any;
  scoring: {
    originalityScore: number;
    credibilityScore: number;
    marketGapScore: number;
    competitionScore: number;
    overallScore: number;
    breakdown: any;
  };
  aiInsights: {
    dimensions: {
      feasibility: any;
      marketDemand: any;
      innovation: any;
      scalability: any;
      viability: any;
    };
    overallAssessment: any;
    competitorAnalysis: any;
    regulatoryConsiderations: any;
    fundingAdvice: any;
  };
  combinedValidation: {
    finalScore: number;
    confidence: string;
    recommendation: string;
  };
  financialModel: any;
  riskAssessment: any;
}

export default function ValidateIdeaPage() {
  const [, setLocation] = useLocation();
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<IdeaFormData>({
    resolver: zodResolver(ideaSchema),
    defaultValues: {
      category: 'tech'
    }
  });

  const validateIdea = useMutation({
    mutationFn: async (data: z.output<typeof ideaSchema>) => {
      const response = await apiRequest("POST", "/api/ideas", data);
      return response.json();
    },
    onSuccess: (data) => {
      setValidationResult(data);
      setIsValidating(false);
    },
    onError: (error) => {
      console.error('Validation error:', error);
      setIsValidating(false);
    }
  });

  const onSubmit = (data: IdeaFormData) => {
    setIsValidating(true);
    const transformedData = ideaSchema.parse(data);
    validateIdea.mutate(transformedData);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    if (score >= 40) return "text-orange-500";
    return "text-red-500";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return { text: "Excellent", className: "bg-green-500/20 text-green-300 border-green-500/30" };
    if (score >= 60) return { text: "Good", className: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" };
    if (score >= 40) return { text: "Fair", className: "bg-orange-500/20 text-orange-300 border-orange-500/30" };
    return { text: "Needs Work", className: "bg-red-500/20 text-red-300 border-red-500/30" };
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">
            <span className="flame-text">AI-Powered Idea Validation</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Get comprehensive validation insights powered by advanced AI analysis.
            Our multi-dimensional scoring system evaluates feasibility, market demand, innovation, and more.
          </p>
        </div>

        {!validationResult ? (
          <Card className="flame-card max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Submit Your Idea for Validation</CardTitle>
              <CardDescription className="text-gray-400">
                Fill in the details below to receive a comprehensive AI-powered analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Idea Title *</Label>
                    <Input
                      {...register("title")}
                      placeholder="e.g., AI-Powered Personal Finance Coach"
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                    {errors.title && (
                      <p className="text-red-400 text-sm">{errors.title.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select 
                      onValueChange={(value) => setValue("category", value as any)}
                      defaultValue="tech"
                    >
                      <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-700">
                        <SelectItem value="tech">Technology</SelectItem>
                        <SelectItem value="healthcare">Healthcare</SelectItem>
                        <SelectItem value="fintech">Fintech</SelectItem>
                        <SelectItem value="ecommerce">E-commerce</SelectItem>
                        <SelectItem value="saas">SaaS</SelectItem>
                        <SelectItem value="marketplace">Marketplace</SelectItem>
                        <SelectItem value="education">Education</SelectItem>
                        <SelectItem value="sustainability">Sustainability</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    {...register("description")}
                    placeholder="Describe your idea in detail. What problem does it solve? How does it work?"
                    className="bg-gray-900 border-gray-700 text-white min-h-[120px]"
                  />
                  {errors.description && (
                    <p className="text-red-400 text-sm">{errors.description.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="targetMarket">Target Market *</Label>
                    <Textarea
                      {...register("targetMarket")}
                      placeholder="Who is your target audience? Be specific."
                      className="bg-gray-900 border-gray-700 text-white min-h-[80px]"
                    />
                    {errors.targetMarket && (
                      <p className="text-red-400 text-sm">{errors.targetMarket.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessModel">Business Model *</Label>
                    <Textarea
                      {...register("businessModel")}
                      placeholder="How will you make money? Subscription, one-time purchase, marketplace fees, etc."
                      className="bg-gray-900 border-gray-700 text-white min-h-[80px]"
                    />
                    {errors.businessModel && (
                      <p className="text-red-400 text-sm">{errors.businessModel.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="initialInvestment">Initial Investment ($)</Label>
                    <Input
                      {...register("initialInvestment")}
                      type="number"
                      placeholder="50000"
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="monthlyRevenue">Expected Monthly Revenue ($)</Label>
                    <Input
                      {...register("monthlyRevenue")}
                      type="number"
                      placeholder="25000"
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="monthlyExpenses">Expected Monthly Expenses ($)</Label>
                    <Input
                      {...register("monthlyExpenses")}
                      type="number"
                      placeholder="10000"
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full btn-flame"
                  disabled={isValidating}
                >
                  {isValidating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Validating with AI...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4 mr-2" />
                      Validate My Idea
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Overall Score Card */}
            <Card className="flame-card">
              <CardHeader>
                <CardTitle className="text-3xl text-white">Validation Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="text-center">
                    <div className={`text-5xl font-bold mb-2 ${getScoreColor(validationResult.combinedValidation.finalScore)}`}>
                      {validationResult.combinedValidation.finalScore}
                    </div>
                    <div className="text-gray-400">Overall Score</div>
                    <Badge className={`mt-2 ${getScoreBadge(validationResult.combinedValidation.finalScore).className}`}>
                      {getScoreBadge(validationResult.combinedValidation.finalScore).text}
                    </Badge>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold mb-2 text-white">
                      {validationResult.combinedValidation.confidence}
                    </div>
                    <div className="text-gray-400">Confidence Level</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold mb-2 text-white">
                      {validationResult.aiInsights.overallAssessment.verdict}
                    </div>
                    <div className="text-gray-400">AI Verdict</div>
                  </div>
                </div>
                
                <Alert className="bg-gray-800 border-gray-700">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-gray-300">
                    {validationResult.combinedValidation.recommendation}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Detailed Analysis Tabs */}
            <Tabs defaultValue="dimensions" className="w-full">
              <TabsList className="grid w-full grid-cols-6 bg-gray-800 border-gray-700">
                <TabsTrigger value="dimensions">Dimensions</TabsTrigger>
                <TabsTrigger value="strengths">Strengths & Risks</TabsTrigger>
                <TabsTrigger value="competitors">Competition</TabsTrigger>
                <TabsTrigger value="financial">Financial</TabsTrigger>
                <TabsTrigger value="next-steps">Next Steps</TabsTrigger>
                <TabsTrigger value="collaboration">Discussion</TabsTrigger>
              </TabsList>

              <TabsContent value="dimensions" className="space-y-4">
                {/* Traditional Scores */}
                <Card className="flame-card">
                  <CardHeader>
                    <CardTitle className="text-white">Traditional Validation Scores</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { name: "Originality", score: validationResult.scoring.originalityScore, icon: Lightbulb },
                      { name: "Credibility", score: validationResult.scoring.credibilityScore, icon: Shield },
                      { name: "Market Gap", score: validationResult.scoring.marketGapScore, icon: Target },
                      { name: "Competition", score: validationResult.scoring.competitionScore, icon: Users }
                    ].map((metric) => (
                      <div key={metric.name} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <metric.icon className="w-4 h-4 text-purple-400" />
                            <span className="text-white">{metric.name}</span>
                          </div>
                          <span className={`font-bold ${getScoreColor(metric.score)}`}>
                            {metric.score}/100
                          </span>
                        </div>
                        <Progress value={metric.score} className="h-2" />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* AI Dimension Analysis */}
                <Card className="flame-card">
                  <CardHeader>
                    <CardTitle className="text-white">AI-Powered Dimension Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {Object.entries(validationResult.aiInsights.dimensions).map(([key, dimension]: [string, any]) => (
                      <div key={key} className="space-y-3">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-semibold text-white capitalize">{key}</h3>
                          <Badge className={getScoreBadge(dimension.score).className}>
                            {dimension.score}/100
                          </Badge>
                        </div>
                        <p className="text-gray-300 text-sm">{dimension.analysis}</p>
                        {dimension.recommendations && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-400 mb-1">Recommendations:</p>
                            <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                              {dimension.recommendations.slice(0, 2).map((rec: string, i: number) => (
                                <li key={i}>{rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="strengths" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="flame-card">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center">
                        <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                        Top Strengths
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {validationResult.aiInsights.overallAssessment.topStrengths.map((strength: string, i: number) => (
                          <li key={i} className="flex items-start">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-1 mr-2 flex-shrink-0" />
                            <span className="text-gray-300">{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="flame-card">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2 text-red-500" />
                        Critical Risks
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {validationResult.aiInsights.overallAssessment.criticalRisks.map((risk: string, i: number) => (
                          <li key={i} className="flex items-start">
                            <AlertCircle className="w-4 h-4 text-red-500 mt-1 mr-2 flex-shrink-0" />
                            <span className="text-gray-300">{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="competitors" className="space-y-4">
                <Card className="flame-card">
                  <CardHeader>
                    <CardTitle className="text-white">Competitive Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-400 mb-2">Market Position</h4>
                      <p className="text-white">{validationResult.aiInsights.competitorAnalysis.marketPosition}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-semibold text-gray-400 mb-2">Key Differentiators</h4>
                      <div className="flex flex-wrap gap-2">
                        {validationResult.aiInsights.competitorAnalysis.differentiators.map((diff: string, i: number) => (
                          <Badge key={i} className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                            {diff}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-400 mb-2">Direct Competitors</h4>
                        <ul className="list-disc list-inside text-gray-300 space-y-1">
                          {validationResult.aiInsights.competitorAnalysis.directCompetitors.map((comp: string, i: number) => (
                            <li key={i}>{comp}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-400 mb-2">Indirect Competitors</h4>
                        <ul className="list-disc list-inside text-gray-300 space-y-1">
                          {validationResult.aiInsights.competitorAnalysis.indirectCompetitors.map((comp: string, i: number) => (
                            <li key={i}>{comp}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="financial" className="space-y-4">
                <Card className="flame-card">
                  <CardHeader>
                    <CardTitle className="text-white">Financial Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-gray-800 rounded-lg">
                        <DollarSign className="w-8 h-8 text-green-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-white">
                          {validationResult.aiInsights.fundingAdvice.estimatedCapitalNeeded}
                        </div>
                        <div className="text-sm text-gray-400">Capital Needed</div>
                      </div>
                      
                      <div className="text-center p-4 bg-gray-800 rounded-lg">
                        <TrendingUp className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-white">
                          {validationResult.aiInsights.dimensions.viability.profitabilityTimeline}
                        </div>
                        <div className="text-sm text-gray-400">To Profitability</div>
                      </div>
                      
                      <div className="text-center p-4 bg-gray-800 rounded-lg">
                        <Scale className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-white">
                          {validationResult.aiInsights.fundingAdvice.investorAppeal}
                        </div>
                        <div className="text-sm text-gray-400">Investor Appeal</div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-gray-400 mb-2">Revenue Streams</h4>
                      <ul className="list-disc list-inside text-gray-300 space-y-1">
                        {validationResult.aiInsights.dimensions.viability.revenueStreams.map((stream: string, i: number) => (
                          <li key={i}>{stream}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-gray-400 mb-2">Funding Sources</h4>
                      <div className="flex flex-wrap gap-2">
                        {validationResult.aiInsights.fundingAdvice.fundingSources.map((source: string, i: number) => (
                          <Badge key={i} className="bg-green-500/20 text-green-300 border-green-500/30">
                            {source}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="next-steps" className="space-y-4">
                <Card className="flame-card">
                  <CardHeader>
                    <CardTitle className="text-white">Recommended Next Steps</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {validationResult.aiInsights.overallAssessment.nextSteps.map((step: string, i: number) => (
                        <div key={i} className="flex items-start p-4 bg-gray-800 rounded-lg">
                          <div className="flex-shrink-0 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                            {i + 1}
                          </div>
                          <div className="ml-4 flex-grow">
                            <p className="text-white">{step}</p>
                          </div>
                          <ArrowRight className="w-5 h-5 text-purple-400 flex-shrink-0 mt-1" />
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Button 
                        className="btn-flame"
                        onClick={async () => {
                          // Generate action plan for this idea
                          setIsValidating(true);
                          try {
                            const response = await apiRequest("POST", "/api/action-plan", {
                              idea: validationResult.idea,
                              validationScore: validationResult.combinedValidation.finalScore,
                              marketSize: validationResult.idea.marketSize
                            });
                            const data = await response.json();
                            // Store in localStorage for the action plan page
                            localStorage.setItem('actionPlan', JSON.stringify(data));
                            setLocation('/action-plan');
                          } catch (error) {
                            console.error('Failed to generate action plan:', error);
                          } finally {
                            setIsValidating(false);
                          }
                        }}
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        Generate Action Plan
                      </Button>
                      
                      <Button 
                        className="btn-flame"
                        onClick={() => {
                          // Generate business plan for this idea
                          const ideaData = validationResult.idea;
                          setLocation(`/business-plan?title=${encodeURIComponent(ideaData.title)}&description=${encodeURIComponent(ideaData.description)}`);
                        }}
                      >
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Business Plan
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        className="border-gray-700 text-gray-300"
                        onClick={() => setValidationResult(null)}
                      >
                        Validate Another
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="collaboration" className="space-y-6">
                <CommentsSection 
                  ideaId={validationResult.idea.id}
                  ideaTitle={validationResult.idea.title}
                  onShareClick={() => {
                    // TODO: Implement share modal
                    console.log("Share clicked");
                  }}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </Layout>
  );
}