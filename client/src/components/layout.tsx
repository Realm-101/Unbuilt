import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { User, Search, Bookmark, History, TrendingUp, LogOut, Settings, Crown, HelpCircle, Info, FileText, Menu, X, Lightbulb, Activity } from "lucide-react";
import Logo from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Squares } from "@/components/ui/squares-background";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const handleLogout = () => {
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-background transition-colors relative">
      {/* Squares Background - Fixed behind all content */}
      <div className="fixed inset-0 z-0">
        <Squares
          direction="diagonal"
          speed={0.5}
          squareSize={40}
          borderColor="#333"
          hoverFillColor="#222"
        />
      </div>
      
      {/* Content wrapper with relative positioning */}
      <div className="relative z-10">
        <header className="flame-glass sticky top-0 z-50 neon-flame-border-red">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-36">
            {/* Logo Section - Made More Prominent & Properly Positioned */}
            <div className="flex items-center">
              <Link href="/" className="hover:opacity-80 transition-opacity flex items-center justify-center">
                <Logo size="md" />
              </Link>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-1">
              <Link href="/about">
                <Button 
                  variant={location === '/about' ? 'default' : 'ghost'} 
                  size="sm"
                  className={location === '/about' ? 'neon-border-blue text-white' : 'hover-glow text-white hover:text-purple-300'}
                >
                  <Info className="w-4 h-4 mr-1" />
                  About
                </Button>
              </Link>
              <Link href="/help">
                <Button 
                  variant={location === '/help' ? 'default' : 'ghost'} 
                  size="sm"
                  className={location === '/help' ? 'neon-border-blue text-white' : 'hover-glow text-white hover:text-purple-300'}
                >
                  <HelpCircle className="w-4 h-4 mr-1" />
                  Help & Docs
                </Button>
              </Link>
              {user ? (
                <>
                  <Link href="/trending">
                    <Button 
                      variant={location === '/trending' ? 'default' : 'ghost'} 
                      size="sm"
                      className={location === '/trending' ? 'neon-border-blue text-white' : 'hover-glow text-white hover:text-purple-300'}
                    >
                      <TrendingUp className="w-4 h-4 mr-1" />
                      Trending
                    </Button>
                  </Link>
                  <Link href="/history">
                    <Button 
                      variant={location === '/history' ? 'default' : 'ghost'} 
                      size="sm"
                      className={location === '/history' ? 'neon-border-blue text-white' : 'hover-glow text-white hover:text-purple-300'}
                    >
                      <History className="w-4 h-4 mr-1" />
                      History
                    </Button>
                  </Link>
                  <Link href="/saved">
                    <Button 
                      variant={location === '/saved' ? 'default' : 'ghost'} 
                      size="sm"
                      className={location === '/saved' ? 'neon-border-blue text-white' : 'hover-glow text-white hover:text-purple-300'}
                    >
                      <Bookmark className="w-4 h-4 mr-1" />
                      Saved
                    </Button>
                  </Link>
                  <Link href="/validate-idea">
                    <Button 
                      variant={location === '/validate-idea' ? 'default' : 'ghost'} 
                      size="sm"
                      className={location === '/validate-idea' ? 'neon-border-blue text-white' : 'hover-glow text-white hover:text-purple-300'}
                    >
                      <Lightbulb className="w-4 h-4 mr-1" />
                      Validate Idea
                    </Button>
                  </Link>
                  <Link href="/market-research">
                    <Button 
                      variant={location === '/market-research' ? 'default' : 'ghost'} 
                      size="sm"
                      className={location === '/market-research' ? 'neon-border-blue text-white' : 'hover-glow text-white hover:text-purple-300'}
                    >
                      <TrendingUp className="w-4 h-4 mr-1" />
                      Research
                    </Button>
                  </Link>
                  <Link href="/market-trends">
                    <Button 
                      variant={location === '/market-trends' ? 'default' : 'ghost'} 
                      size="sm"
                      className={location === '/market-trends' ? 'neon-border-blue text-white' : 'hover-glow text-white hover:text-purple-300'}
                    >
                      <Activity className="w-4 h-4 mr-1" />
                      Heat Map
                    </Button>
                  </Link>
                </>
              ) : null}
            </nav>
            
            {/* Right Side Actions */}
            <div className="flex items-center space-x-2">
              {user ? (
                <>
                  {((user as any).plan === 'free' || !(user as any).plan) && (
                    <Link href="/subscribe">
                      <Button size="sm" className="btn-flame animate-pulse-glow">
                        <Crown className="w-4 h-4 mr-1" />
                        Upgrade Pro
                      </Button>
                    </Link>
                  )}
                  
                  <ThemeToggle />
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleLogout}
                    className="hover-glow text-white"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </>
              ) : null}
              
              {!user ? (
                <>
                  <ThemeToggle />
                  <Link href="/">
                    <Button variant="ghost" size="sm" className="hover-glow text-white">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/">
                    <Button size="sm" className="btn-flame">
                      Get Started
                    </Button>
                  </Link>
                </>
              ) : null}
              
              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden text-white"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-black/95 backdrop-blur-sm border-t border-purple-500/30">
            <div className="px-4 py-4 space-y-2">
              <Link href="/about">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-white hover:bg-purple-600/20"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Info className="w-4 h-4 mr-2" />
                  About
                </Button>
              </Link>
              <Link href="/help">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-white hover:bg-purple-600/20"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Help & Docs
                </Button>
              </Link>
              {user ? (
                <>
                  <Link href="/trending">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-white hover:bg-purple-600/20"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Trending
                    </Button>
                  </Link>
                  <Link href="/history">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-white hover:bg-purple-600/20"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <History className="w-4 h-4 mr-2" />
                      History
                    </Button>
                  </Link>
                  <Link href="/saved">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-white hover:bg-purple-600/20"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Bookmark className="w-4 h-4 mr-2" />
                      Saved
                    </Button>
                  </Link>
                </>
              ) : null}
            </div>
          </div>
        )}
      </header>
      
        {children}
      </div>
    </div>
  );
}
