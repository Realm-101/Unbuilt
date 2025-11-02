import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react"

const variantIcons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  default: null,
  destructive: XCircle,
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const Icon = variant ? variantIcons[variant as keyof typeof variantIcons] : null

        return (
          <Toast 
            key={id} 
            variant={variant}
            {...props}
            // Add ARIA live region for accessibility
            aria-live={variant === "error" || variant === "destructive" ? "assertive" : "polite"}
            aria-atomic="true"
            role={variant === "error" || variant === "destructive" ? "alert" : "status"}
          >
            <div className="flex items-start gap-3 w-full">
              {Icon && (
                <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" aria-hidden="true" />
              )}
              <div className="grid gap-1 flex-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
