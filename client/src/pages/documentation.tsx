import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  Rocket, 
  Search, 
  Target, 
  BarChart, 
  Users, 
  Lightbulb,
  Code,
  Shield,
  CreditCard,
  HelpCircle,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Package
} from 'lucide-react';

export function Documentation() {
  const [activeSection, setActiveSection] = useState('getting-started');

  const sections = [
    { id: 'getting-started', title: 'Getting Started', icon: Rocket },
    { id: 'discovery', title: 'Gap Discovery', icon: Search },
    { id: 'validation', title: 'Idea Validation', icon: Target },
    { id: 'research', title: 'Market Research', icon: BarChart },
    { id: 'collaboration', title: 'Team Collaboration', icon: Users },
    { id: 'ai-features', title: 'AI Features', icon: Sparkles },
    { id: 'api', title: 'API Documentation', icon: Code },
    { id: 'billing', title: 'Billing & Plans', icon: CreditCard },
    { id: 'security', title: 'Security', icon: Shield },
    { id: 'faq', title: 'FAQ', icon: HelpCircle }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Documentation</h1>
          <p className="text-muted-foreground">Everything you need to know about using Unbuilt</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contents</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                  <nav className="space-y-1 p-4">
                    {sections.map((section) => {
                      const Icon = section.icon;
                      return (
                        <button
                          key={section.id}
                          onClick={() => setActiveSection(section.id)}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                            activeSection === section.id
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-secondary'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="text-sm font-medium">{section.title}</span>
                        </button>
                      );
                    })}
                  </nav>
                </ScrollArea>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-3">
            <Card>
              <CardContent className="p-8">
                {activeSection === 'getting-started' && <GettingStartedSection />}
                {activeSection === 'discovery' && <DiscoverySection />}
                {activeSection === 'validation' && <ValidationSection />}
                {activeSection === 'research' && <ResearchSection />}
                {activeSection === 'collaboration' && <CollaborationSection />}
                {activeSection === 'ai-features' && <AIFeaturesSection />}
                {activeSection === 'api' && <APISection />}
                {activeSection === 'billing' && <BillingSection />}
                {activeSection === 'security' && <SecuritySection />}
                {activeSection === 'faq' && <FAQSection />}
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </div>
  );
}

function GettingStartedSection() {
  return (
    <div className="prose max-w-none">
      <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
        <Rocket className="h-8 w-8 text-primary" />
        Getting Started with Unbuilt
      </h2>
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Welcome to Unbuilt</CardTitle>
            <CardDescription>Your AI-powered innovation discovery platform</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Unbuilt helps entrepreneurs and innovators identify market gaps and untapped opportunities 
              using advanced AI analysis. Get started in just a few steps:
            </p>
            
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-semibold">Create Your Account</h4>
                  <p className="text-muted-foreground">Sign up with email or use Google/GitHub authentication</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-semibold">Start Your First Search</h4>
                  <p className="text-muted-foreground">Enter an industry or problem area to discover gaps</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-semibold">Explore AI Insights</h4>
                  <p className="text-muted-foreground">Review innovation scores, market potential, and feasibility ratings</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <h4 className="font-semibold">Generate Action Plans</h4>
                  <p className="text-muted-foreground">Create comprehensive business plans and roadmaps</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Start Video</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-lg p-8 text-center">
              <Lightbulb className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">5-minute walkthrough coming soon</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DiscoverySection() {
  return (
    <div className="prose max-w-none">
      <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
        <Search className="h-8 w-8 text-primary" />
        Gap Discovery
      </h2>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>How Gap Discovery Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Our AI-powered discovery engine uses Perplexity AI with real-time web search to identify 
              market gaps and innovation opportunities. Here's what you can discover:
            </p>
            
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <ChevronRight className="h-5 w-5 text-primary mt-0.5" />
                <span><strong>Unmet Needs:</strong> Problems that existing solutions don't fully address</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="h-5 w-5 text-primary mt-0.5" />
                <span><strong>Market Inefficiencies:</strong> Areas where current offerings fall short</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="h-5 w-5 text-primary mt-0.5" />
                <span><strong>Emerging Trends:</strong> New opportunities from technological or social changes</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="h-5 w-5 text-primary mt-0.5" />
                <span><strong>Cross-Industry Innovation:</strong> Ideas that combine concepts from different fields</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Search Tips & Best Practices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-secondary rounded-lg">
                <h4 className="font-semibold mb-2">✅ Good Searches</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>"sustainable packaging for e-commerce"</li>
                  <li>"mental health tools for remote workers"</li>
                  <li>"AI solutions for small business accounting"</li>
                </ul>
              </div>
              
              <div className="p-4 bg-secondary rounded-lg">
                <h4 className="font-semibold mb-2">❌ Searches to Avoid</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>"business ideas" (too broad)</li>
                  <li>"make money" (not specific)</li>
                  <li>"next big thing" (too vague)</li>
                </ul>
              </div>
            </div>

            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <p className="text-sm">
                <strong>Pro Tip:</strong> Be specific about the industry, problem, or user group you're 
                targeting for the best results.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ValidationSection() {
  return (
    <div className="prose max-w-none">
      <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
        <Target className="h-8 w-8 text-primary" />
        Idea Validation
      </h2>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Multi-Dimensional Validation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Our validation system evaluates ideas across multiple dimensions to give you a comprehensive 
              assessment of viability:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2">Innovation Score (0-100)</h4>
                <p className="text-sm text-muted-foreground">
                  Measures uniqueness and differentiation from existing solutions
                </p>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2">Market Potential</h4>
                <p className="text-sm text-muted-foreground">
                  Estimates total addressable market and growth opportunities
                </p>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2">Feasibility Rating</h4>
                <p className="text-sm text-muted-foreground">
                  Assesses technical and resource requirements for implementation
                </p>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2">Competition Analysis</h4>
                <p className="text-sm text-muted-foreground">
                  Evaluates competitive landscape and barriers to entry
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Understanding Validation Results</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Score Range</th>
                  <th className="text-left py-2">Interpretation</th>
                  <th className="text-left py-2">Recommended Action</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b">
                  <td className="py-2">80-100</td>
                  <td className="py-2 text-green-600">Excellent Opportunity</td>
                  <td className="py-2">Move to detailed planning</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">60-79</td>
                  <td className="py-2 text-blue-600">Good Potential</td>
                  <td className="py-2">Refine and research further</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">40-59</td>
                  <td className="py-2 text-yellow-600">Needs Work</td>
                  <td className="py-2">Pivot or enhance differentiators</td>
                </tr>
                <tr>
                  <td className="py-2">0-39</td>
                  <td className="py-2 text-red-600">High Risk</td>
                  <td className="py-2">Consider alternative approaches</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ResearchSection() {
  return (
    <div className="prose max-w-none">
      <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
        <BarChart className="h-8 w-8 text-primary" />
        Market Research
      </h2>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Comprehensive Market Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Our market research tools powered by xAI Grok provide deep insights into:
            </p>

            <div className="grid grid-cols-1 gap-4">
              <div className="flex gap-4">
                <Package className="h-8 w-8 text-primary flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">TAM, SAM, SOM Analysis</h4>
                  <p className="text-sm text-muted-foreground">
                    Total Addressable Market, Serviceable Addressable Market, and Serviceable Obtainable Market calculations
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <TrendingUp className="h-8 w-8 text-primary flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">Growth Projections</h4>
                  <p className="text-sm text-muted-foreground">
                    5-year market growth forecasts based on industry trends and historical data
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <Users className="h-8 w-8 text-primary flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">Customer Segmentation</h4>
                  <p className="text-sm text-muted-foreground">
                    Detailed buyer personas, demographics, and psychographics
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <Target className="h-8 w-8 text-primary flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">Competitive Intelligence</h4>
                  <p className="text-sm text-muted-foreground">
                    SWOT analysis, competitor mapping, and positioning strategies
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CollaborationSection() {
  return (
    <div className="prose max-w-none">
      <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
        <Users className="h-8 w-8 text-primary" />
        Team Collaboration
      </h2>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Collaborate with Your Team</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Work together on ideas with powerful collaboration features:
            </p>

            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <div>
                  <strong>Threaded Comments:</strong> Discuss specific aspects of ideas with context
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <div>
                  <strong>Reactions:</strong> Quick feedback with 👍 ❤️ ⭐ reactions
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <div>
                  <strong>Activity Feed:</strong> Stay updated on team actions and discussions
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <div>
                  <strong>Share Ideas:</strong> Export and share reports with stakeholders
                </div>
              </li>
            </ul>

            <div className="bg-secondary rounded-lg p-4">
              <p className="text-sm">
                <strong>Coming Soon:</strong> Real-time collaboration, team workspaces, and role-based permissions
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AIFeaturesSection() {
  return (
    <div className="prose max-w-none">
      <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
        <Sparkles className="h-8 w-8 text-primary" />
        AI Features
      </h2>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Multi-AI Intelligence System</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Unbuilt leverages multiple AI providers for specialized tasks:
            </p>

            <div className="space-y-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="font-semibold">Perplexity AI</h4>
                <p className="text-sm text-muted-foreground">
                  Real-time web search for current market gaps and trends
                </p>
                <code className="text-xs bg-secondary px-2 py-1 rounded">
                  llama-3.1-sonar-large-128k-online
                </code>
              </div>

              <div className="border-l-4 border-purple-500 pl-4">
                <h4 className="font-semibold">xAI Grok</h4>
                <p className="text-sm text-muted-foreground">
                  Advanced business planning and market intelligence
                </p>
                <code className="text-xs bg-secondary px-2 py-1 rounded">
                  grok-2-1212
                </code>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <h4 className="font-semibold">Google Gemini</h4>
                <p className="text-sm text-muted-foreground">
                  Fallback provider for reliability and consistency
                </p>
                <code className="text-xs bg-secondary px-2 py-1 rounded">
                  gemini-2.0-flash-exp
                </code>
              </div>
            </div>

            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <p className="text-sm">
                <strong>Smart Caching:</strong> We cache AI responses for 24 hours to reduce costs 
                and improve response times while maintaining data freshness.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function APISection() {
  return (
    <div className="prose max-w-none">
      <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
        <Code className="h-8 w-8 text-primary" />
        API Documentation
      </h2>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>RESTful API</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Access Unbuilt's features programmatically with our REST API:
            </p>

            <div className="bg-secondary rounded-lg p-4">
              <h4 className="font-semibold mb-2">Base URL</h4>
              <code className="text-sm">https://api.unbuilt.io/v1</code>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Authentication</h4>
                <pre className="bg-secondary rounded-lg p-4 text-sm overflow-x-auto">
{`GET /api/search
Authorization: Bearer YOUR_API_KEY`}
                </pre>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Search for Gaps</h4>
                <pre className="bg-secondary rounded-lg p-4 text-sm overflow-x-auto">
{`POST /api/search
{
  "query": "sustainable packaging for e-commerce",
  "limit": 10
}`}
                </pre>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Validate Idea</h4>
                <pre className="bg-secondary rounded-lg p-4 text-sm overflow-x-auto">
{`POST /api/validate
{
  "title": "Eco-friendly shipping materials",
  "description": "Biodegradable packaging...",
  "industry": "E-commerce"
}`}
                </pre>
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <p className="text-sm">
                <strong>Note:</strong> API access is available for Pro and Enterprise plans. 
                Contact support for API key generation.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function BillingSection() {
  return (
    <div className="prose max-w-none">
      <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
        <CreditCard className="h-8 w-8 text-primary" />
        Billing & Plans
      </h2>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Pricing Plans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold">Free</h4>
                <p className="text-2xl font-bold my-2">$0<span className="text-sm font-normal">/month</span></p>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>✓ 5 searches/month</li>
                  <li>✓ Basic validation</li>
                  <li>✓ Community support</li>
                </ul>
              </div>

              <div className="border-2 border-primary rounded-lg p-4">
                <h4 className="font-semibold">Pro</h4>
                <p className="text-2xl font-bold my-2">$29<span className="text-sm font-normal">/month</span></p>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>✓ Unlimited searches</li>
                  <li>✓ Advanced AI features</li>
                  <li>✓ Business plans</li>
                  <li>✓ API access</li>
                  <li>✓ Priority support</li>
                </ul>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-semibold">Enterprise</h4>
                <p className="text-2xl font-bold my-2">Custom</p>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>✓ Everything in Pro</li>
                  <li>✓ Custom AI models</li>
                  <li>✓ Dedicated support</li>
                  <li>✓ SLA guarantee</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SecuritySection() {
  return (
    <div className="prose max-w-none">
      <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
        <Shield className="h-8 w-8 text-primary" />
        Security
      </h2>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Your Data is Safe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              We take security seriously and implement industry best practices:
            </p>

            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <Shield className="h-5 w-5 text-green-500 mt-0.5" />
                <span><strong>Encryption:</strong> All data encrypted at rest and in transit (TLS 1.3)</span>
              </li>
              <li className="flex items-start gap-2">
                <Shield className="h-5 w-5 text-green-500 mt-0.5" />
                <span><strong>Authentication:</strong> OAuth 2.0 with Google and GitHub</span>
              </li>
              <li className="flex items-start gap-2">
                <Shield className="h-5 w-5 text-green-500 mt-0.5" />
                <span><strong>Data Privacy:</strong> GDPR compliant, no selling of user data</span>
              </li>
              <li className="flex items-start gap-2">
                <Shield className="h-5 w-5 text-green-500 mt-0.5" />
                <span><strong>Infrastructure:</strong> Hosted on secure cloud infrastructure with automatic backups</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FAQSection() {
  return (
    <div className="prose max-w-none">
      <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
        <HelpCircle className="h-8 w-8 text-primary" />
        Frequently Asked Questions
      </h2>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How accurate are the AI predictions?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Our AI models are trained on vast datasets and provide insights based on current market data. 
              While highly accurate for trend identification, all predictions should be validated with 
              additional research before making business decisions.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Can I export my research data?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Yes! Pro users can export all research, validation results, and business plans in PDF, 
              HTML, and JSON formats. Free users can export basic search results.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How often is market data updated?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Our Perplexity AI integration provides real-time web search capabilities, ensuring you 
              get the most current market information. Cached results are refreshed every 24 hours.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Can I collaborate with my team?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Yes! Teams can comment on ideas, share research, and collaborate in real-time. 
              Enterprise plans include advanced team management features and role-based permissions.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">What's the difference between the AI models?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              We use specialized AI models for different tasks: Perplexity for real-time discovery, 
              xAI Grok for business planning, and Gemini as a reliable fallback. This multi-AI approach 
              ensures the best results for each type of analysis.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}