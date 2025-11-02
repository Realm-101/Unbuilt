/**
 * Visual Feedback System Integration Example
 * 
 * This file demonstrates how to use the toast, loading, and animation systems together
 * for a complete user experience.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showSuccess, showError, showWarning, showPromise } from "@/lib/toast-helpers";
import { LoadingOverlay, useLoadingOverlay } from "@/components/ui/loading-overlay";
import { ProgressBar, useProgressBar } from "@/components/ui/progress-bar";
import {
  AnimatedFade,
  AnimatedSlideUp,
  AnimatedStaggerContainer,
  AnimatedStaggerItem,
  AnimatePresence,
} from "@/components/ui/animated";

/**
 * Example 1: Simple Form with Toast Feedback
 */
export function SimpleFormExample() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formData.name || !formData.email) {
      showWarning("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));
      showSuccess("Form submitted successfully!");
      setFormData({ name: "", email: "" });
    } catch (error) {
      showError("Failed to submit form. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AnimatedFade>
      <Card>
        <CardHeader>
          <CardTitle>Simple Form Example</CardTitle>
          <CardDescription>
            Demonstrates button loading state and toast notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={isSubmitting}
              />
            </div>
            <Button type="submit" loading={isSubmitting} loadingText="Submitting...">
              Submit
            </Button>
          </form>
        </CardContent>
      </Card>
    </AnimatedFade>
  );
}

/**
 * Example 2: Multi-Step Process with Progress Bar
 */
export function MultiStepProcessExample() {
  const steps = [
    { id: "1", label: "Validate", description: "Validating your data" },
    { id: "2", label: "Process", description: "Processing your request" },
    { id: "3", label: "Save", description: "Saving to database" },
    { id: "4", label: "Complete", description: "Finishing up" },
  ];

  const { currentStep, nextStep, reset, isLastStep, ProgressBar } = useProgressBar(steps);
  const [isProcessing, setIsProcessing] = useState(false);

  async function handleNext() {
    if (isLastStep) {
      setIsProcessing(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        showSuccess("Process completed successfully!");
        reset();
      } catch (error) {
        showError("Process failed");
      } finally {
        setIsProcessing(false);
      }
    } else {
      setIsProcessing(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      nextStep();
      setIsProcessing(false);
    }
  }

  return (
    <AnimatedSlideUp>
      <Card>
        <CardHeader>
          <CardTitle>Multi-Step Process Example</CardTitle>
          <CardDescription>
            Demonstrates progress bar and step-by-step feedback
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ProgressBar />
          <div className="flex gap-2">
            <Button
              onClick={handleNext}
              loading={isProcessing}
              loadingText={isLastStep ? "Completing..." : "Processing..."}
            >
              {isLastStep ? "Complete" : "Next Step"}
            </Button>
            <Button variant="outline" onClick={reset} disabled={isProcessing}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>
    </AnimatedSlideUp>
  );
}

/**
 * Example 3: Data Loading with Overlay
 */
export function DataLoadingExample() {
  const { isLoading, startLoading, stopLoading, LoadingOverlay } = useLoadingOverlay();
  const [data, setData] = useState<string[]>([]);

  async function loadData() {
    startLoading("Loading data...", "This may take a few moments");
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setData(["Item 1", "Item 2", "Item 3", "Item 4", "Item 5"]);
      showSuccess("Data loaded successfully!");
    } catch (error) {
      showError("Failed to load data");
    } finally {
      stopLoading();
    }
  }

  async function clearData() {
    setData([]);
    showSuccess("Data cleared");
  }

  return (
    <Card className="relative">
      <LoadingOverlay />
      <CardHeader>
        <CardTitle>Data Loading Example</CardTitle>
        <CardDescription>
          Demonstrates loading overlay and animated list
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={loadData} disabled={isLoading}>
            Load Data
          </Button>
          <Button variant="outline" onClick={clearData} disabled={isLoading || data.length === 0}>
            Clear Data
          </Button>
        </div>

        <AnimatePresence mode="wait">
          {data.length > 0 && (
            <AnimatedStaggerContainer key="data-list">
              <div className="space-y-2">
                {data.map((item, index) => (
                  <AnimatedStaggerItem key={index}>
                    <div className="p-3 border rounded-md bg-card">
                      {item}
                    </div>
                  </AnimatedStaggerItem>
                ))}
              </div>
            </AnimatedStaggerContainer>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

/**
 * Example 4: Promise-Based Loading with Toast
 */
export function PromiseLoadingExample() {
  const [result, setResult] = useState<string | null>(null);

  async function performAction(shouldFail: boolean = false) {
    try {
      const data = await showPromise(
        new Promise<string>((resolve, reject) => {
          setTimeout(() => {
            if (shouldFail) {
              reject(new Error("Operation failed"));
            } else {
              resolve("Operation completed successfully!");
            }
          }, 2000);
        }),
        {
          loading: "Processing your request...",
          success: (data) => data,
          error: (error) => error.message,
        }
      );
      setResult(data);
    } catch (error) {
      setResult(null);
    }
  }

  return (
    <AnimatedFade>
      <Card>
        <CardHeader>
          <CardTitle>Promise-Based Loading Example</CardTitle>
          <CardDescription>
            Demonstrates promise-based toast notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={() => performAction(false)}>
              Success Action
            </Button>
            <Button variant="destructive" onClick={() => performAction(true)}>
              Fail Action
            </Button>
          </div>

          {result && (
            <AnimatedSlideUp>
              <div className="p-4 border rounded-md bg-muted">
                <p className="text-sm">{result}</p>
              </div>
            </AnimatedSlideUp>
          )}
        </CardContent>
      </Card>
    </AnimatedFade>
  );
}

/**
 * Example 5: Complete Integration
 * 
 * This example combines all three systems for a complete user experience
 */
export function CompleteIntegrationExample() {
  const [activeExample, setActiveExample] = useState<string | null>(null);

  const examples = [
    { id: "form", label: "Simple Form", component: SimpleFormExample },
    { id: "multistep", label: "Multi-Step Process", component: MultiStepProcessExample },
    { id: "loading", label: "Data Loading", component: DataLoadingExample },
    { id: "promise", label: "Promise Loading", component: PromiseLoadingExample },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Visual Feedback System Examples</CardTitle>
          <CardDescription>
            Select an example to see the visual feedback system in action
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {examples.map((example) => (
              <Button
                key={example.id}
                variant={activeExample === example.id ? "default" : "outline"}
                onClick={() => setActiveExample(example.id)}
              >
                {example.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <AnimatePresence mode="wait">
        {activeExample && (() => {
          const Example = examples.find((ex) => ex.id === activeExample)?.component;
          return Example ? (
            <AnimatedFade key={activeExample}>
              <Example />
            </AnimatedFade>
          ) : null;
        })()}
      </AnimatePresence>
    </div>
  );
}

/**
 * Usage in your app:
 * 
 * import { CompleteIntegrationExample } from "@/components/ui/VISUAL_FEEDBACK_INTEGRATION_EXAMPLE";
 * 
 * function MyPage() {
 *   return <CompleteIntegrationExample />;
 * }
 */
