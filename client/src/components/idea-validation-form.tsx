import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { validateIdeaSchema, type ValidateIdea } from '@shared/schema';
import { Lightbulb, TrendingUp, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';

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
  riskAssessment: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
  };
  financialModel: {
    summary: {
      totalInvestment: number;
      breakEvenMonth: number;
      fiveYearROI: number;
      totalProfit: number;
      averageGrowthRate: number;
    };
    projections: Array<{
      year: number;
      revenue: number;
      expenses: number;
      profit: number;
      cashFlow: number;
    }>;
  };
}

export default function IdeaValidationForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ValidateIdea>({
    resolver: zodResolver(validateIdeaSchema),
    defaultValues: {
      title: '',
      description: '',
      targetMarket: '',
      businessModel: '',
      category: 'tech',
      initialInvestment: 0,
      monthlyRevenue: 0,
      monthlyExpenses: 0,
    },
  });

  const onSubmit = async (data: ValidateIdea) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ideas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to validate idea');
      }

      const validationResult = await response.json();
      setResult(validationResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRiskColor = (level: string) => {
    if (level === 'low') return 'bg-green-100 text-green-800';
    if (level === 'medium') return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Lightbulb className="w-8 h-8 text-yellow-500" />
          Idea Validation & Financial Analysis
        </h1>
        <p className="text-muted-foreground">
          Transform your business ideas into validated opportunities with AI-powered scoring and financial modeling
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form Section */}
        <Card>
          <CardHeader>
            <CardTitle>Submit Your Idea</CardTitle>
            <CardDescription>
              Provide details about your business idea for comprehensive validation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Idea Title</FormLabel>
                      <FormControl>
                        <Input placeholder="AI-powered fitness coach app" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="tech">Technology</SelectItem>
                          <SelectItem value="healthcare">Healthcare</SelectItem>
                          <SelectItem value="fintech">FinTech</SelectItem>
                          <SelectItem value="ecommerce">E-commerce</SelectItem>
                          <SelectItem value="saas">SaaS</SelectItem>
                          <SelectItem value="marketplace">Marketplace</SelectItem>
                          <SelectItem value="education">Education</SelectItem>
                          <SelectItem value="sustainability">Sustainability</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your idea, the problem it solves, and how it works..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="targetMarket"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Market</FormLabel>
                      <FormControl>
                        <Input placeholder="Fitness enthusiasts aged 25-45..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="businessModel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Model</FormLabel>
                      <FormControl>
                        <Input placeholder="Subscription-based with premium features..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="initialInvestment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Initial Investment ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="50000"
                            {...field}
                            onChange={e => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="monthlyRevenue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Revenue ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="10000"
                            {...field}
                            onChange={e => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="monthlyExpenses"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Expenses ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="7000"
                            {...field}
                            onChange={e => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? 'Validating...' : 'Validate Idea'}
                </Button>
              </form>
            </Form>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Section */}
        {result && (
          <div className="space-y-6">
            {/* Validation Scores */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Validation Scores
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className={`text-4xl font-bold ${getScoreColor(result.scoring.overallScore)}`}>
                    {result.scoring.overallScore}/100
                  </div>
                  <p className="text-sm text-muted-foreground">Overall Score</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Originality</span>
                      <span className="text-sm font-medium">{result.scoring.originalityScore}</span>
                    </div>
                    <Progress value={result.scoring.originalityScore} />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Credibility</span>
                      <span className="text-sm font-medium">{result.scoring.credibilityScore}</span>
                    </div>
                    <Progress value={result.scoring.credibilityScore} />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Market Gap</span>
                      <span className="text-sm font-medium">{result.scoring.marketGapScore}</span>
                    </div>
                    <Progress value={result.scoring.marketGapScore} />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Competition</span>
                      <span className="text-sm font-medium">{result.scoring.competitionScore}</span>
                    </div>
                    <Progress value={result.scoring.competitionScore} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Risk Assessment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  Risk Assessment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className={getRiskColor(result.riskAssessment.level)} variant="secondary">
                  {result.riskAssessment.level.toUpperCase()} RISK
                </Badge>
                <ul className="mt-3 space-y-1">
                  {result.riskAssessment.factors.map((factor, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      • {factor}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Financial Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  Financial Projections
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {result.financialModel.summary.breakEvenMonth}
                    </div>
                    <p className="text-sm text-blue-800">Months to Break Even</p>
                  </div>
                  
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {result.financialModel.summary.fiveYearROI}%
                    </div>
                    <p className="text-sm text-green-800">5-Year ROI</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">5-Year Revenue Projection</h4>
                  {result.financialModel.projections.map((projection) => (
                    <div key={projection.year} className="flex justify-between items-center py-2 border-b last:border-0">
                      <span>Year {projection.year}</span>
                      <div className="text-right">
                        <div className="font-medium">${projection.revenue.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">
                          Profit: ${projection.profit.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}