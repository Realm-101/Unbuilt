import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useLocation } from "wouter";

export default function Terms() {
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
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto flame-card rounded-lg p-8 text-white">
          <h1 className="text-4xl font-bold text-white neon-glow mb-8">Terms of Service</h1>
          <p className="text-sm text-gray-400 mb-8">Last updated: January 2025</p>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">1. Acceptance of Terms</h2>
              <p className="text-gray-300">
                By accessing and using Unbuilt ("Service"), you accept and agree to be bound by 
                the terms and provision of this agreement. If you do not agree to abide by the above, 
                please do not use this service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Service Description</h2>
              <p className="text-gray-600 mb-4">
                Unbuilt is an AI-powered platform that provides market gap analysis and innovation 
                opportunity discovery services. Our service includes:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li>Market research and gap analysis</li>
                <li>Innovation opportunity identification</li>
                <li>Business intelligence reports</li>
                <li>Competitive analysis insights</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Subscription Plans</h2>
              <div className="space-y-4 text-gray-600">
                <p><strong>Free Plan:</strong> 5 searches per month with basic features</p>
                <p><strong>Pro Plan ($29/month):</strong> Unlimited searches with advanced features</p>
                <p><strong>Enterprise Plan ($299/month):</strong> All features plus team collaboration</p>
                <p>All subscriptions automatically renew unless cancelled before the renewal date.</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Payment Terms</h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li>Subscription fees are billed monthly in advance</li>
                <li>All payments are processed securely through Stripe</li>
                <li>Refunds are available within 14 days of purchase</li>
                <li>Price changes will be communicated 30 days in advance</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. User Responsibilities</h2>
              <p className="text-gray-600 mb-4">You agree to:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li>Provide accurate and complete information</li>
                <li>Use the service for lawful purposes only</li>
                <li>Not share your account credentials</li>
                <li>Respect intellectual property rights</li>
                <li>Not attempt to reverse engineer our AI algorithms</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Limitation of Liability</h2>
              <p className="text-gray-600">
                Unbuilt provides market analysis for informational purposes only. We do not guarantee 
                the accuracy, completeness, or usefulness of any information provided. Users are responsible 
                for their own business decisions and investments.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Termination</h2>
              <p className="text-gray-600">
                Either party may terminate this agreement at any time. Upon termination, your access 
                to the service will cease, and any outstanding fees will remain due.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Contact Information</h2>
              <p className="text-gray-600">
                For questions about these Terms of Service, please contact us at 
                <a href="mailto:legal@unbuilt.cloud" className="text-blue-600 hover:underline ml-1">
                  legal@unbuilt.cloud
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}