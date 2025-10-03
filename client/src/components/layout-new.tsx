import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import type { UserProfile } from "@/types/user";
import { 
  User as UserIcon, Search, Bookmark, History, TrendingUp, LogOut, Settings, 
  Crown, HelpCircle, Info, Menu, X, Lightbulb, Activity, 
  ChevronDown, Home, FileText, CreditCard, Shield, Bell,
  Plus, Zap, BarChart3, Users, Star
} from "lucide-react";
import Logo from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const typedUser = user as UserProfile | null;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut for search (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery("");
    }
  };

  const handleLogout = () => {
    window.location.href = '/';
  };

  // Organized navigation structure
  const mainNavItems = [
    { href: "/", icon: Home, label: "Discover", description: "Find market gaps" },
    { href: "/validate-idea", icon: Lightbulb, label: "Validate", description: "Test your ideas" },
    { href: "/market-trends", icon: Activity, label: "Trends", description: "Market heat map" },
    { href: "/analytics", icon: BarChart3, label: "Analytics", description: "Data insights" },
  ];

  const userNavItems = [
    { href: "/history", icon: History, label: "History" },
    { href: "/saved", icon: Bookmark, label: "Saved" },
  ];

  const isProUser = typedUser?.plan === 'pro' || typedUser?.plan === 'enterprise';

  return (
    <div className="min-h-screen bg-background transition-colors">
      {/* Simplified Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo */}
            <div className="flex items-center gap-8">
              <button 
                onClick={() => setLocation("/")}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
              >
                <Logo size="sm" />
                <span className="font-bold text-xl hidden sm:inline">Unbuilt</span>
              </button>

              {/* Main Navigation - Desktop Only */}
              {user && (
                <nav className="hidden lg:flex items-center gap-1">
                  {mainNavItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Button 
                        key={item.href}
                        variant={location === item.href ? "secondary" : "ghost"} 
                        size="sm"
                        className="gap-2"
                        onClick={() => setLocation(item.href)}
                      >
                        <Icon className="w-4 h-4" />
                        {item.label}
                      </Button>
                    );
                  })}
                </nav>
              )}
            </div>

            {/* Center: Search Bar */}
            {user && (
              <div className="hidden md:flex flex-1 max-w-xl mx-8">
                <form onSubmit={handleSearch} className="w-full relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      ref={searchRef}
                      type="text"
                      placeholder="Search market opportunities... (⌘K)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setIsSearchFocused(true)}
                      onBlur={() => setIsSearchFocused(false)}
                      className="pl-10 pr-4 w-full bg-secondary/50 border-secondary focus:bg-secondary"
                    />
                    {searchQuery && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2"
                        onClick={() => setSearchQuery("")}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </form>
              </div>
            )}

            {/* Right: User Actions */}
            <div className="flex items-center gap-2">
              {user ? (
                <>
                  {/* Quick Actions */}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="hidden lg:flex"
                    onClick={() => setLocation('/validate-idea')}
                    title="Quick Validate"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>

                  {/* Upgrade Button for Free Users */}
                  {!isProUser && (
                    <Button 
                      size="sm" 
                      variant="default" 
                      className="hidden sm:flex gap-2"
                      onClick={() => setLocation('/subscribe')}
                    >
                      <Zap className="w-4 h-4" />
                      Upgrade
                    </Button>
                  )}

                  {/* User Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                          <UserIcon className="w-4 h-4 text-white" />
                        </div>
                        <span className="hidden sm:inline text-sm font-medium">
                          {typedUser?.firstName || typedUser?.email?.split('@')[0] || 'Account'}
                        </span>
                        {isProUser && <Badge variant="secondary" className="hidden sm:flex">PRO</Badge>}
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {typedUser?.firstName || 'User'}
                          </p>
                          <p className="text-xs leading-none text-muted-foreground">
                            {typedUser?.email}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      
                      {/* User Navigation Items */}
                      {userNavItems.map((item) => (
                        <DropdownMenuItem key={item.href} onClick={() => setLocation(item.href)}>
                          <item.icon className="mr-2 h-4 w-4" />
                          <span>{item.label}</span>
                        </DropdownMenuItem>
                      ))}
                      
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuItem onClick={() => setLocation('/market-research')}>
                        <BarChart3 className="mr-2 h-4 w-4" />
                        <span>Market Research</span>
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem onClick={() => setLocation('/trending')}>
                        <TrendingUp className="mr-2 h-4 w-4" />
                        <span>Trending Now</span>
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator />

                      <DropdownMenuItem onClick={() => setLocation('/profile')}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                      </DropdownMenuItem>
                      
                      {!isProUser && (
                        <DropdownMenuItem onClick={() => setLocation('/subscribe')}>
                          <Crown className="mr-2 h-4 w-4 text-yellow-500" />
                          <span>Upgrade to Pro</span>
                        </DropdownMenuItem>
                      )}
                      
                      {isProUser && (
                        <DropdownMenuItem onClick={() => setLocation('/billing')}>
                          <CreditCard className="mr-2 h-4 w-4" />
                          <span>Billing</span>
                        </DropdownMenuItem>
                      )}
                      
                      <DropdownMenuItem onClick={() => setLocation('/help')}>
                        <HelpCircle className="mr-2 h-4 w-4" />
                        <span>Help & Support</span>
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Sign out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <ThemeToggle />
                </>
              ) : (
                <>
                  <ThemeToggle />
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setLocation('/')}
                  >
                    Sign In
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => setLocation('/')}
                  >
                    Get Started
                  </Button>
                </>
              )}
              
              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-border bg-background">
            <div className="px-4 py-4 space-y-2">
              {/* Mobile Search */}
              {user && (
                <form onSubmit={handleSearch} className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search opportunities..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-full"
                    />
                  </div>
                </form>
              )}

              {/* Mobile Navigation */}
              {user ? (
                <>
                  <div className="space-y-1 pb-2">
                    {mainNavItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Button
                          key={item.href}
                          variant={location === item.href ? "secondary" : "ghost"}
                          className="w-full justify-start gap-3"
                          onClick={() => {
                            setLocation(item.href);
                            setIsMobileMenuOpen(false);
                          }}
                        >
                          <Icon className="w-4 h-4" />
                          <div className="flex-1 text-left">
                            <div className="font-medium">{item.label}</div>
                            <div className="text-xs text-muted-foreground">{item.description}</div>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                  
                  <div className="border-t border-border pt-2 space-y-1">
                    {userNavItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Button
                          key={item.href}
                          variant="ghost"
                          className="w-full justify-start gap-3"
                          onClick={() => {
                            setLocation(item.href);
                            setIsMobileMenuOpen(false);
                          }}
                        >
                          <Icon className="w-4 h-4" />
                          {item.label}
                        </Button>
                      );
                    })}
                  </div>

                  {!isProUser && (
                    <div className="border-t border-border pt-2">
                      <Button
                        className="w-full gap-2"
                        onClick={() => {
                          setLocation('/subscribe');
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <Crown className="w-4 h-4" />
                        Upgrade to Pro
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start"
                    onClick={() => {
                      setLocation('/about');
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    <Info className="w-4 h-4 mr-2" />
                    About
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start"
                    onClick={() => {
                      setLocation('/help');
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    <HelpCircle className="w-4 h-4 mr-2" />
                    Help & Docs
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </header>
      
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}