import { useUserPreferencesStore } from '@/stores/userPreferencesStore';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Eye, Zap, Volume2 } from 'lucide-react';
import { useEffect } from 'react';

/**
 * Accessibility settings panel
 * Allows users to customize accessibility features
 */
export function AccessibilitySettings() {
  const { accessibilitySettings, updateAccessibilitySettings } = useUserPreferencesStore();

  // Apply accessibility settings to document
  useEffect(() => {
    const root = document.documentElement;

    // High contrast mode
    if (accessibilitySettings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Reduced motion
    if (accessibilitySettings.reducedMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }

    // Screen reader optimized
    if (accessibilitySettings.screenReaderOptimized) {
      root.classList.add('screen-reader-optimized');
    } else {
      root.classList.remove('screen-reader-optimized');
    }
  }, [accessibilitySettings]);

  // Detect system preferences
  useEffect(() => {
    // Check for prefers-reduced-motion
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotionQuery.matches && !accessibilitySettings.reducedMotion) {
      updateAccessibilitySettings({ reducedMotion: true });
    }

    // Check for prefers-contrast
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    if (highContrastQuery.matches && !accessibilitySettings.highContrast) {
      updateAccessibilitySettings({ highContrast: true });
    }

    // Listen for changes
    const handleReducedMotionChange = (e: MediaQueryListEvent) => {
      updateAccessibilitySettings({ reducedMotion: e.matches });
    };

    const handleHighContrastChange = (e: MediaQueryListEvent) => {
      updateAccessibilitySettings({ highContrast: e.matches });
    };

    reducedMotionQuery.addEventListener('change', handleReducedMotionChange);
    highContrastQuery.addEventListener('change', handleHighContrastChange);

    return () => {
      reducedMotionQuery.removeEventListener('change', handleReducedMotionChange);
      highContrastQuery.removeEventListener('change', handleHighContrastChange);
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Accessibility Settings</CardTitle>
        <CardDescription>
          Customize the interface to meet your accessibility needs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* High Contrast Mode */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Eye className="w-5 h-5 mt-0.5 text-muted-foreground" aria-hidden="true" />
            <div className="space-y-1">
              <Label htmlFor="high-contrast" className="text-base font-medium">
                High Contrast Mode
              </Label>
              <p className="text-sm text-muted-foreground">
                Increase color contrast for better visibility. Enhances text and UI element distinction.
              </p>
            </div>
          </div>
          <Switch
            id="high-contrast"
            checked={accessibilitySettings.highContrast}
            onCheckedChange={(checked) =>
              updateAccessibilitySettings({ highContrast: checked })
            }
            aria-label="Toggle high contrast mode"
          />
        </div>

        <Separator />

        {/* Reduced Motion */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Zap className="w-5 h-5 mt-0.5 text-muted-foreground" aria-hidden="true" />
            <div className="space-y-1">
              <Label htmlFor="reduced-motion" className="text-base font-medium">
                Reduce Motion
              </Label>
              <p className="text-sm text-muted-foreground">
                Minimize animations and transitions. Helpful for users sensitive to motion or with vestibular disorders.
              </p>
            </div>
          </div>
          <Switch
            id="reduced-motion"
            checked={accessibilitySettings.reducedMotion}
            onCheckedChange={(checked) =>
              updateAccessibilitySettings({ reducedMotion: checked })
            }
            aria-label="Toggle reduced motion"
          />
        </div>

        <Separator />

        {/* Screen Reader Optimized */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Volume2 className="w-5 h-5 mt-0.5 text-muted-foreground" aria-hidden="true" />
            <div className="space-y-1">
              <Label htmlFor="screen-reader" className="text-base font-medium">
                Screen Reader Optimized
              </Label>
              <p className="text-sm text-muted-foreground">
                Optimize interface for screen readers. Adds extra context and descriptions for assistive technologies.
              </p>
            </div>
          </div>
          <Switch
            id="screen-reader"
            checked={accessibilitySettings.screenReaderOptimized}
            onCheckedChange={(checked) =>
              updateAccessibilitySettings({ screenReaderOptimized: checked })
            }
            aria-label="Toggle screen reader optimization"
          />
        </div>

        {/* Info about system preferences */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> These settings will sync with your system preferences when available.
            Changes are saved automatically and persist across sessions.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Hook to check if accessibility features are enabled
 */
export function useAccessibilitySettings() {
  const { accessibilitySettings } = useUserPreferencesStore();
  return accessibilitySettings;
}
