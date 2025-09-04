import React from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Home, Search, Lightbulb, Activity, TrendingUp, BarChart3,
  History, Bookmark, FileText, HelpCircle, Settings,
  ChevronRight, Sparkles, Rocket, Target, Brain,
  Zap, Users, Shield, CreditCard, Info
} from "lucide-react";

interface SidebarNavProps {
  isOpen: boolean;
  onClose?: () => void;
  user: any;
}

export default function SidebarNav({ isOpen, onClose, user }: SidebarNavProps) {
  const [location] = useLocation();
  
  const navigationSections = [
    {
      title: "Discover",
      icon: Sparkles,
      items: [
        { href: "/", icon: Home, label: "Dashboard", description: "Your discovery hub" },
        { href: "/search", icon: Search, label: "Search", description: "Find market gaps" },
        { href: "/trending", icon: TrendingUp, label: "Trending", description: "Hot opportunities" },
        { href: "/market-trends", icon: Activity, label: "Heat Map", description: "Market visualization" },
      ]
    },
    {
      title: "Analyze",
      icon: Brain,
      items: [
        { href: "/validate-idea", icon: Lightbulb, label: "Validate Idea", description: "Test feasibility" },
        { href: "/market-research", icon: BarChart3, label: "Market Research", description: "Deep insights" },
        { href: "/action-plan", icon: Target, label: "Action Plans", description: "Implementation roadmap" },
      ]
    },
    {
      title: "Your Data",
      icon: FileText,
      items: [
        { href: "/history", icon: History, label: "History", description: "Past searches" },
        { href: "/saved", icon: Bookmark, label: "Saved", description: "Bookmarked ideas" },
      ]
    },
    {
      title: "Account",
      icon: Settings,
      items: [
        { href: "/profile", icon: Users, label: "Profile", description: "Your account" },
        { href: "/billing", icon: CreditCard, label: "Billing", description: "Subscription & payments" },
        { href: "/settings", icon: Settings, label: "Settings", description: "Preferences" },
      ]
    },
    {
      title: "Support",
      icon: HelpCircle,
      items: [
        { href: "/help", icon: HelpCircle, label: "Help Center", description: "Get assistance" },
        { href: "/about", icon: Info, label: "About", description: "Learn more" },
      ]
    }
  ];

  const isProUser = user?.plan === 'pro' || user?.plan === 'enterprise';

  return (
    <aside className={cn(
      "fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-card border-r border-border",
      "transform transition-transform duration-200 ease-in-out z-40",
      isOpen ? "translate-x-0" : "-translate-x-full",
      "lg:translate-x-0"
    )}>
      <ScrollArea className="h-full py-4">
        <div className="px-3 space-y-6">
          {/* Pro Upgrade CTA */}
          {!isProUser && (
            <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-semibold">Upgrade to Pro</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Unlock unlimited searches and advanced features
              </p>
              <Link href="/subscribe">
                <Button size="sm" className="w-full" variant="default">
                  <Rocket className="w-3 h-3 mr-1" />
                  Upgrade Now
                </Button>
              </Link>
            </div>
          )}

          {/* Navigation Sections */}
          {navigationSections.map((section) => (
            <div key={section.title}>
              <div className="flex items-center gap-2 px-3 mb-2">
                <section.icon className="w-4 h-4 text-muted-foreground" />
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {section.title}
                </h4>
              </div>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = location === item.href;
                  return (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant={isActive ? "secondary" : "ghost"}
                        className={cn(
                          "w-full justify-start gap-3 h-auto py-2 px-3",
                          isActive && "bg-secondary/50"
                        )}
                        onClick={onClose}
                      >
                        <item.icon className={cn(
                          "w-4 h-4 shrink-0",
                          isActive ? "text-primary" : "text-muted-foreground"
                        )} />
                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium">{item.label}</div>
                          <div className="text-xs text-muted-foreground">{item.description}</div>
                        </div>
                        {isActive && (
                          <ChevronRight className="w-4 h-4 text-primary shrink-0" />
                        )}
                      </Button>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Quick Stats */}
          {user && (
            <div className="border-t border-border pt-4 px-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Usage Stats
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Searches Today</span>
                  <span className="font-medium">12</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ideas Validated</span>
                  <span className="font-medium">3</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Saved Ideas</span>
                  <span className="font-medium">28</span>
                </div>
              </div>
              {!isProUser && (
                <div className="mt-3">
                  <div className="text-xs text-muted-foreground mb-1">Daily Limit</div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500" style={{ width: '60%' }}></div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">12 / 20 searches</div>
                </div>
              )}
            </div>
          )}

          {/* Pro Badge */}
          {isProUser && (
            <div className="px-3 pb-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20">
                <Shield className="w-4 h-4 text-yellow-500" />
                <div>
                  <div className="text-sm font-semibold">Pro Member</div>
                  <div className="text-xs text-muted-foreground">Unlimited access</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm lg:hidden -z-10"
          onClick={onClose}
        />
      )}
    </aside>
  );
}