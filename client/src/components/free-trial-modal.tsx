import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Crown, Check, Sparkles, TrendingUp, Download, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";


interface FreeTrialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const proFeatures = [
  {
    icon: TrendingUp,
    title: "Unlimited AI Searches",
    description: "Discover endless market opportunities with no monthly limits"
  },
  {
    icon: Download,
    title: "Professional Exports",
    description: "PDF reports, CSV data, and investor pitch deck templates"
  },
  {
    icon: Sparkles,
    title: "Advanced Analytics",
    description: "Competitive analysis, market intelligence, and strategic insights"
  },
  {
    icon: Users,
    title: "Action Plan Generator",
    description: "4-phase development roadmaps with milestone tracking"
  }
];

export default function FreeTrialModal({ isOpen, onClose, onSuccess }: FreeTrialModalProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const trialMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/trial/activate", { email });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Free Trial Activated!",
        description: "You now have 7 days of unlimited Pro access. Happy exploring!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Trial Activation Failed",
        description: error.message || "Please try again or contact support.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter your email address to start your free trial.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await trialMutation.mutateAsync();
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl bg-gradient-to-br from-purple-900/95 via-pink-900/95 to-orange-900/95 border-purple-500/20 shadow-2xl">
          <CardHeader className="relative">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose} 
              className="absolute right-4 top-4 text-white hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </Button>
            
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mx-auto">
                <Crown className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">Start Your Free Trial</h2>
                <p className="text-purple-200 text-lg">
                  Get 7 days of unlimited Pro access • No credit card required
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Pro Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {proFeatures.map((feature, index) => (
                <div key={index} className="bg-black/20 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <feature.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-1">{feature.title}</h4>
                      <p className="text-sm text-gray-300 leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Value Proposition */}
            <div className="bg-gradient-to-r from-green-600/20 to-blue-600/20 rounded-lg p-4 border border-green-500/30">
              <div className="flex items-center space-x-3 mb-3">
                <Check className="w-6 h-6 text-green-400" />
                <h3 className="font-semibold text-white">What You Get</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-400">Unlimited</p>
                  <p className="text-gray-300">AI Searches</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-400">$29</p>
                  <p className="text-gray-300">Value/Month</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-400">7 Days</p>
                  <p className="text-gray-300">Free Trial</p>
                </div>
              </div>
            </div>

            {/* Email Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-white text-sm font-medium">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="mt-1 bg-black/30 border-purple-500/30 text-white placeholder-gray-400 focus:border-purple-400"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  We'll send you trial updates and product insights (unsubscribe anytime)
                </p>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 text-lg shadow-lg"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Activating Trial...</span>
                  </div>
                ) : (
                  <>Start 7-Day Free Trial</>
                )}
              </Button>
            </form>

            {/* Trust Signals */}
            <div className="text-center space-y-2">
              <p className="text-xs text-gray-400">
                ✓ No credit card required ✓ Cancel anytime ✓ Full access to all Pro features
              </p>
              <p className="text-xs text-gray-500">
                After trial, continue with Pro for $29/month or downgrade to free plan
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}