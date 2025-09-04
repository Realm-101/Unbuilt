import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useLocation } from "wouter";

export default function Privacy() {
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
          <h1 className="text-4xl font-bold text-white neon-glow mb-8">Privacy Policy</h1>
          <p className="text-sm text-gray-400 mb-8">Last updated: January 2025</p>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">1. Information We Collect</h2>
              <p className="text-gray-300 mb-4">
                We collect information you provide directly to us, such as when you create an account, 
                use our services, or contact us for support.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-300">
                <li>Account information (name, email address)</li>
                <li>Search queries and preferences</li>
                <li>Usage data and analytics</li>
                <li>Payment information (processed securely through Stripe)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">2. How We Use Your Information</h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-300">
                <li>Provide and improve our AI-powered gap analysis services</li>
                <li>Process payments and manage subscriptions</li>
                <li>Send important updates about your account</li>
                <li>Analyze usage patterns to enhance our platform</li>
                <li>Respond to customer support requests</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">3. Information Sharing</h2>
              <p className="text-gray-300 mb-4">
                We do not sell, trade, or otherwise transfer your personal information to third parties, 
                except as described in this policy:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-300">
                <li>Service providers (Stripe for payments, hosting services)</li>
                <li>Legal compliance when required by law</li>
                <li>Business transfers (mergers, acquisitions)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
              <p className="text-gray-600">
                We implement appropriate security measures to protect your personal information against 
                unauthorized access, alteration, disclosure, or destruction. This includes encrypted 
                data transmission and secure database storage.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Your Rights</h2>
              <p className="text-gray-600 mb-4">You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li>Access and update your personal information</li>
                <li>Delete your account and associated data</li>
                <li>Opt out of non-essential communications</li>
                <li>Request a copy of your data</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Contact Us</h2>
              <p className="text-gray-600">
                If you have questions about this Privacy Policy, please contact us at 
                <a href="mailto:privacy@unbuilt.cloud" className="text-blue-600 hover:underline ml-1">
                  privacy@unbuilt.cloud
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}