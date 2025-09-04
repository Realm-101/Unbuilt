import { Button } from "@/components/ui/button";
import { Search, Lightbulb, TrendingUp, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-950 to-black text-white">
      {/* Header */}
      <header className="flex justify-between items-center p-6">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-orange-400 rounded-lg"></div>
          <span className="text-xl font-bold">Unbuilt</span>
        </div>
        <Button 
          onClick={() => window.location.href = "/api/login"}
          className="btn-flame"
        >
          Sign In
        </Button>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-6 flame-text">
            Discover What
            <br />
            <span className="flame-glow">Doesn't Exist Yet</span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Uncover untapped market opportunities and innovation gaps with AI-powered analysis. 
            Find what the world needs but no one has built.
          </p>
          <Button 
            size="lg"
            onClick={() => window.location.href = "/api/login"}
            className="btn-flame text-lg px-8 py-4"
          >
            Start Discovering
            <Search className="ml-2 h-5 w-5" />
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <Card className="bg-gradient-to-br from-purple-900/50 to-black border-purple-500/30">
            <CardHeader>
              <Lightbulb className="h-12 w-12 text-orange-400 mb-4" />
              <CardTitle className="text-xl text-white">Gap Discovery</CardTitle>
              <CardDescription className="text-gray-300">
                AI-powered analysis reveals untapped opportunities across industries
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gradient-to-br from-red-900/50 to-black border-red-500/30">
            <CardHeader>
              <TrendingUp className="h-12 w-12 text-red-400 mb-4" />
              <CardTitle className="text-xl text-white">Market Intelligence</CardTitle>
              <CardDescription className="text-gray-300">
                Comprehensive market sizing and feasibility analysis for each opportunity
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gradient-to-br from-orange-900/50 to-black border-orange-500/30">
            <CardHeader>
              <Zap className="h-12 w-12 text-yellow-400 mb-4" />
              <CardTitle className="text-xl text-white">Action Plans</CardTitle>
              <CardDescription className="text-gray-300">
                Step-by-step roadmaps to turn discoveries into successful ventures
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-r from-purple-900/30 to-red-900/30 rounded-xl p-12 neon-flame-border">
          <h2 className="text-3xl font-bold mb-4 flame-text">Ready to Find Your Next Big Idea?</h2>
          <p className="text-gray-300 mb-6">Join thousands of innovators discovering what the world needs next.</p>
          <Button 
            size="lg"
            onClick={() => window.location.href = "/api/login"}
            className="btn-flame text-lg px-8 py-4"
          >
            Get Started Free
          </Button>
        </div>
      </main>
    </div>
  );
}