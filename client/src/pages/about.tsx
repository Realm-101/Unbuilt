import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Target, Users, TrendingUp, Mail } from "lucide-react";
import { useLocation } from "wouter";

export default function About() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-950 to-black theme-enforce-dark">
      {/* Header */}
      <header className="border-b border-purple-500/30 bg-black/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-8 h-8 text-purple-400" />
            <span className="text-2xl font-bold text-white flame-text">Unbuilt</span>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => setLocation("/")} className="text-white hover:text-purple-300">
              Home
            </Button>
            <Button onClick={() => setLocation("/api/login")} className="btn-flame">
              Get Started
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Company Overview */}
          <section className="text-center mb-16">
            <h1 className="text-4xl font-bold text-white neon-glow mb-6">
              About Unbuilt
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              The world's first AI-powered platform for discovering untapped market opportunities 
              and innovation gaps that entrepreneurs and businesses can capitalize on.
            </p>
          </section>

          {/* Mission & Vision */}
          <section className="grid md:grid-cols-2 gap-8 mb-16">
            <Card className="flame-card text-white">
              <CardHeader>
                <Target className="w-12 h-12 text-orange-400 mb-4" />
                <CardTitle className="text-2xl text-white">Our Mission</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  To democratize market research and opportunity discovery by providing 
                  entrepreneurs, startups, and enterprises with AI-powered insights that 
                  reveal what's missing in the market.
                </p>
              </CardContent>
            </Card>

            <Card className="flame-card text-white">
              <CardHeader>
                <TrendingUp className="w-12 h-12 text-red-400 mb-4" />
                <CardTitle className="text-2xl text-white">Our Vision</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  To become the essential platform that powers the next generation of 
                  innovation by helping visionaries identify and pursue breakthrough 
                  opportunities before anyone else.
                </p>
              </CardContent>
            </Card>
          </section>

          {/* How It Works */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-white neon-glow mb-8 text-center">
              How Unbuilt Works
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">1</span>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">Input Your Query</h3>
                <p className="text-gray-300">
                  Describe any market, industry, or problem area you're curious about
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">2</span>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">AI Analysis</h3>
                <p className="text-gray-300">
                  Our advanced AI scans markets and identifies genuine gaps and opportunities
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">3</span>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">Actionable Insights</h3>
                <p className="text-gray-300">
                  Get detailed analysis with feasibility scores, market size, and next steps
                </p>
              </div>
            </div>
          </section>

          {/* Business Information */}
          <section className="flame-card rounded-lg p-8 mb-16 text-white">
            <h2 className="text-3xl font-bold text-white neon-glow mb-8 text-center">
              Company Information
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold mb-4 text-white">Business Details</h3>
                <div className="space-y-2 text-gray-300">
                  <p><strong className="text-purple-400">Company:</strong> Unbuilt Technologies</p>
                  <p><strong className="text-purple-400">Industry:</strong> Software as a Service (SaaS)</p>
                  <p><strong className="text-purple-400">Founded:</strong> 2025</p>
                  <p><strong className="text-purple-400">Business Model:</strong> Subscription-based platform</p>
                  <p><strong className="text-purple-400">Target Market:</strong> Entrepreneurs, Startups, Innovation Teams</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold mb-4 text-white">Service Offerings</h3>
                <ul className="space-y-2 text-gray-300">
                  <li>• AI-powered market gap analysis</li>
                  <li>• Innovation opportunity discovery</li>
                  <li>• Professional market research reports</li>
                  <li>• Business development insights</li>
                  <li>• Competitive intelligence</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Contact Information */}
          <section className="text-center">
            <h2 className="text-3xl font-bold text-white neon-glow mb-8">
              Contact Us
            </h2>
            <div className="bg-white rounded-lg p-8 max-w-2xl mx-auto">
              <div className="flex items-center justify-center mb-4">
                <Mail className="w-6 h-6 text-blue-600 mr-2" />
                <span className="text-lg">support@unbuilt.cloud</span>
              </div>
              <p className="text-gray-600 mb-6">
                Have questions about our platform or need help with your subscription? 
                We're here to help you discover your next big opportunity.
              </p>
              <Button onClick={() => setLocation("/auth/register")} size="lg">
                Start Your Free Trial
              </Button>
            </div>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Sparkles className="w-6 h-6" />
            <span className="text-xl font-bold">Unbuilt</span>
          </div>
          <p className="text-gray-400">
            © 2025 Unbuilt Technologies. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}