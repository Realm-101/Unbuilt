import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/layout-new";
import { Search, Lightbulb, TrendingUp, Download, Crown, HelpCircle, FileText, Video, BookOpen, MessageCircle, Zap } from "lucide-react";

export default function Help() {
  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-950 to-black">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white neon-glow mb-4">
              Help & Documentation
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Everything you need to master Unbuilt and discover untapped market opportunities
            </p>
          </div>

          {/* Quick Start Guide */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">
              <Zap className="inline w-8 h-8 mr-2 text-orange-400" />
              Quick Start Guide
            </h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="bg-gradient-to-br from-purple-900/50 to-black border-purple-500/30">
                <CardHeader>
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-xl font-bold text-white">1</span>
                  </div>
                  <CardTitle className="text-center text-white">Enter Your Query</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 text-center">
                    Type any market, industry, or problem area you want to explore. Be specific for better results.
                  </p>
                  <div className="mt-4 p-3 bg-black/30 rounded-lg border border-purple-500/20">
                    <p className="text-sm text-purple-300 font-mono">
                      Example: "sustainable packaging for food delivery"
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-pink-900/50 to-black border-pink-500/30">
                <CardHeader>
                  <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-xl font-bold text-white">2</span>
                  </div>
                  <CardTitle className="text-center text-white">AI Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 text-center">
                    Our AI scans markets and identifies genuine gaps, rating each opportunity by innovation score and feasibility.
                  </p>
                  <div className="mt-4 flex justify-center space-x-2">
                    <Badge variant="secondary" className="bg-green-600/20 text-green-300">High Potential</Badge>
                    <Badge variant="secondary" className="bg-yellow-600/20 text-yellow-300">Medium Risk</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-900/50 to-black border-red-500/30">
                <CardHeader>
                  <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-xl font-bold text-white">3</span>
                  </div>
                  <CardTitle className="text-center text-white">Take Action</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 text-center">
                    Generate action plans, export reports, or dive deeper with competitive analysis and market intelligence.
                  </p>
                  <div className="mt-4 flex justify-center">
                    <Button size="sm" className="bg-gradient-to-r from-purple-600 to-pink-600">
                      <Download className="w-4 h-4 mr-1" />
                      Export Report
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Features Guide */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">
              <BookOpen className="inline w-8 h-8 mr-2 text-blue-400" />
              Features Guide
            </h2>
            
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Free Features */}
              <Card className="bg-gradient-to-br from-gray-900/80 to-black border-gray-500/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Lightbulb className="w-6 h-6 mr-2 text-yellow-400" />
                    Free Plan Features
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    Get started with 5 searches per month
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-semibold text-white">AI Gap Discovery</h4>
                      <p className="text-gray-300 text-sm">Discover 6+ market opportunities per search with innovation scores</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-semibold text-white">Basic Market Analysis</h4>
                      <p className="text-gray-300 text-sm">Market size estimates, feasibility ratings, and target demographics</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-semibold text-white">Search History</h4>
                      <p className="text-gray-300 text-sm">Access your past searches and save interesting opportunities</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pro Features */}
              <Card className="bg-gradient-to-br from-purple-900/80 to-black border-purple-500/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Crown className="w-6 h-6 mr-2 text-yellow-400" />
                    Pro Plan Features
                    <Badge className="ml-2 bg-gradient-to-r from-purple-600 to-pink-600">$29/month</Badge>
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    Unlimited access with advanced business tools
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-purple-400 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-semibold text-white">Unlimited AI Searches</h4>
                      <p className="text-gray-300 text-sm">No monthly limits - discover as many opportunities as you want</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-purple-400 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-semibold text-white">Action Plan Generator</h4>
                      <p className="text-gray-300 text-sm">4-phase development roadmaps with detailed tasks and timelines</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-purple-400 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-semibold text-white">Competitive Analysis</h4>
                      <p className="text-gray-300 text-sm">In-depth competitor research and market positioning insights</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-purple-400 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-semibold text-white">Professional Exports</h4>
                      <p className="text-gray-300 text-sm">PDF reports, CSV data, and investor-ready pitch decks</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-purple-400 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-semibold text-white">Market Intelligence</h4>
                      <p className="text-gray-300 text-sm">Advanced demographics, growth trends, and strategic insights</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">
              <HelpCircle className="inline w-8 h-8 mr-2 text-green-400" />
              Frequently Asked Questions
            </h2>
            
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="bg-gradient-to-br from-gray-900/60 to-black border-gray-600/30">
                <CardHeader>
                  <CardTitle className="text-lg text-white">How accurate are the market opportunities?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300">
                    Our AI analyzes real market data, trends, and gaps using advanced machine learning. While we provide comprehensive insights, we recommend validating opportunities with your own market research before making business decisions.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-gray-900/60 to-black border-gray-600/30">
                <CardHeader>
                  <CardTitle className="text-lg text-white">Can I cancel my Pro subscription anytime?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300">
                    Yes, you can cancel your Pro subscription at any time. You'll retain Pro features until the end of your current billing period, then automatically switch to the free plan.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-gray-900/60 to-black border-gray-600/30">
                <CardHeader>
                  <CardTitle className="text-lg text-white">What industries does Unbuilt cover?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300">
                    Unbuilt covers all industries and markets. From technology and healthcare to retail and services, our AI can identify opportunities in any sector you're interested in exploring.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-gray-900/60 to-black border-gray-600/30">
                <CardHeader>
                  <CardTitle className="text-lg text-white">How do I get better search results?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300">
                    Be specific in your queries. Instead of "healthcare," try "remote patient monitoring for elderly care." The more context you provide, the more targeted and valuable your results will be.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Contact Support */}
          <section className="text-center">
            <Card className="bg-gradient-to-br from-blue-900/40 to-black border-blue-500/30 max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="text-2xl text-white flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 mr-2 text-blue-400" />
                  Still Need Help?
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Our support team is here to help you succeed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-300">
                  Can't find what you're looking for? Contact our support team and we'll help you make the most of Unbuilt's powerful features.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Contact Support
                  </Button>
                  <Button variant="outline" className="border-purple-500/50 text-white hover:bg-purple-600/20">
                    <Video className="w-4 h-4 mr-2" />
                    Watch Tutorial
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </Layout>
  );
}