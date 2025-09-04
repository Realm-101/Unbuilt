import React from 'react';

// Theme enforcement component to ensure consistent dark flame theme
export function ThemeEnforcer({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-enforce-dark min-h-screen">
      {children}
    </div>
  );
}

// Page wrapper with consistent flame theme
export function FlamePage({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-950 to-black theme-enforce-dark">
      {children}
    </div>
  );
}

// Standard flame header component
export function FlameHeader({ 
  title, 
  onHomeClick 
}: { 
  title: string;
  onHomeClick: () => void;
}) {
  return (
    <header className="border-b border-purple-500/30 bg-black/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-orange-400 rounded-lg"></div>
          <span className="text-2xl font-bold text-white flame-text">{title}</span>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            onClick={onHomeClick}
            className="text-white hover:text-purple-300 transition-colors px-4 py-2"
          >
            Home
          </button>
        </div>
      </div>
    </header>
  );
}

// Standard content card with flame theme
export function FlameCard({ 
  children,
  className = ""
}: { 
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flame-card rounded-lg p-8 text-white ${className}`}>
      {children}
    </div>
  );
}

// Text components with guaranteed visibility
export function FlameHeading({ 
  children,
  level = 1,
  className = ""
}: {
  children: React.ReactNode;
  level?: 1 | 2 | 3 | 4;
  className?: string;
}) {
  const baseClasses = "font-bold text-white";
  const sizeClasses = {
    1: "text-4xl neon-glow",
    2: "text-3xl neon-glow",
    3: "text-2xl",
    4: "text-xl"
  };
  
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  
  return (
    <Tag className={`${baseClasses} ${sizeClasses[level]} ${className}`}>
      {children}
    </Tag>
  );
}

export function FlameText({ 
  children,
  muted = false,
  className = ""
}: {
  children: React.ReactNode;
  muted?: boolean;
  className?: string;
}) {
  const textColor = muted ? "text-gray-300" : "text-white";
  
  return (
    <p className={`${textColor} ${className}`}>
      {children}
    </p>
  );
}

export function FlameList({ 
  items,
  className = ""
}: {
  items: string[];
  className?: string;
}) {
  return (
    <ul className={`list-disc pl-6 space-y-2 text-gray-300 ${className}`}>
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}