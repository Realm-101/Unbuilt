import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, BarChart3, Users, CheckCircle, ArrowRight, Star } from "lucide-react";
import Logo from "@/components/logo";

export default function Landing() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");

  const handleGetStarted = () => {
    setLocation("/auth/register");
  };

  const handleSignIn = () => {
    setLocation("/auth/login");
  };

  return (
    <div className="min-h-screen dark flame-bg">
      {/* Header */}
      <header className="flame-glass neon-flame-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Logo size="lg" />
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => setLocation("/about")} className="text-gray-300 hover:text-white">
              About
            </Button>
            <Button variant="ghost" onClick={handleSignIn} className="text-gray-300 hover:text-white">
              Sign In
            </Button>
            <Button onClick={handleGetStarted} className="btn-flame">
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-24 px-4">
        <div className="container mx-auto text-center">
          <Badge className="mb-6 bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-300 border-purple-500/30">
            🚀 Discover What's Missing in the Market
          </Badge>
          <h1 className="text-5xl font-bold text-white mb-6 drop-shadow-lg">
            Discover What's Still <span className="flame-text drop-shadow-lg">Unbuilt</span>
          </h1>
          <p className="text-xl text-gray-200 mb-8 max-w-3xl mx-auto drop-shadow-md">
            The only AI-powered platform that reveals untapped market opportunities, 
            helping entrepreneurs and innovators discover what doesn't exist yet but should.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="px-8 py-6 text-lg btn-flame" onClick={handleGetStarted}>
              Start Finding Gaps
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button size="lg" variant="outline" className="px-8 py-6 text-lg border-purple-500/30 text-purple-300 hover:bg-purple-500/10" onClick={handleSignIn}>
              View Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">
              Why Choose Unbuilt?
            </h2>
            <p className="text-lg text-gray-300">
              Turn market gaps into million-dollar opportunities
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="premium-card hover-glow">
              <CardHeader>
                <TrendingUp className="w-12 h-12 text-purple-400 mb-4" />
                <CardTitle className="text-xl text-white">AI-Powered Analysis</CardTitle>
                <CardDescription className="text-gray-300">
                  Our advanced AI scans markets and identifies real opportunities that competitors miss
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="premium-card hover-glow">
              <CardHeader>
                <BarChart3 className="w-12 h-12 text-blue-400 mb-4" />
                <CardTitle className="text-xl text-white">Detailed Market Insights</CardTitle>
                <CardDescription className="text-gray-300">
                  Get feasibility scores, market size estimates, and innovation ratings for every opportunity
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="premium-card hover-glow">
              <CardHeader>
                <Users className="w-12 h-12 text-cyan-400 mb-4" />
                <CardTitle className="text-xl text-white">Export & Share</CardTitle>
                <CardDescription className="text-gray-300">
                  Generate professional reports, pitch decks, and presentations for investors and teams
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-purple-900/10 to-blue-900/10">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-gray-300">
              Choose the plan that fits your innovation needs
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free Plan */}
            <Card className="premium-card border-gray-600/30">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl text-white">Free</CardTitle>
                <div className="text-4xl font-bold text-white mb-2">$0</div>
                <CardDescription className="text-gray-400">Perfect for exploring ideas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-gray-300">5 searches per month</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-gray-300">Basic gap analysis</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-gray-300">Save results</span>
                </div>
                <Button className="w-full mt-6 btn-premium" onClick={handleGetStarted}>
                  Get Started Free
                </Button>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className="premium-card border-purple-500/50 relative hover-glow">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white">Most Popular</Badge>
              </div>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl text-white">Pro</CardTitle>
                <div className="text-4xl font-bold neon-glow mb-2">$29</div>
                <CardDescription className="text-gray-400">For serious entrepreneurs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-gray-300">Unlimited searches</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-gray-300">Advanced AI analysis</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-gray-300">Export to PDF/CSV</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-gray-300">Trending insights</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-gray-300">Priority support</span>
                </div>
                <Button className="w-full mt-6 btn-premium" onClick={handleGetStarted}>
                  Start Pro Trial
                </Button>
              </CardContent>
            </Card>

            {/* Enterprise Plan */}
            <Card className="premium-card border-gray-600/30">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl text-white">Enterprise</CardTitle>
                <div className="text-4xl font-bold text-white mb-2">$299</div>
                <CardDescription className="text-gray-400">For teams & organizations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-gray-300">Everything in Pro</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-gray-300">Team collaboration</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-gray-300">Custom integrations</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-gray-300">Dedicated support</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-gray-300">API access</span>
                </div>
                <Button className="w-full mt-6 btn-premium" onClick={handleGetStarted}>
                  Contact Sales
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 flame-bg">
        <div className="container mx-auto text-center">
          <div className="flame-glass neon-flame-border p-12 rounded-lg max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-6 flame-text">
              Ready to Discover Your Next Big Opportunity?
            </h2>
            <p className="text-xl text-gray-200 mb-8 drop-shadow-md">
              Join thousands of entrepreneurs who've discovered what's still Unbuilt
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="btn-flame px-8 py-6 text-lg hover-lift" onClick={handleGetStarted}>
                Start Finding Gaps Today
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="flame-glass border-t neon-flame-border text-white py-12 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Logo size="sm" />
              </div>
              <p className="text-gray-400 text-sm">
                AI-powered platform for discovering products, services, and solutions that don't exist yet.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><button onClick={() => setLocation("/about")} className="hover:text-white">About</button></li>
                <li><button onClick={() => setLocation("/trending")} className="hover:text-white">Features</button></li>
                <li><button onClick={handleGetStarted} className="hover:text-white">Pricing</button></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><button onClick={() => setLocation("/about")} className="hover:text-white">About Us</button></li>
                <li><a href="mailto:support@unbuilt.cloud" className="hover:text-white">Contact</a></li>
                <li><a href="mailto:careers@unbuilt.cloud" className="hover:text-white">Careers</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><button onClick={() => setLocation("/privacy")} className="hover:text-white">Privacy Policy</button></li>
                <li><button onClick={() => setLocation("/terms")} className="hover:text-white">Terms of Service</button></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-purple-500/30 pt-8 text-center">
            <p className="text-gray-300 text-sm drop-shadow-md">
              © 2025 Unbuilt Technologies. All rights reserved. Business Registration: Pending
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}