import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ImageOff } from 'lucide-react';

interface AccessibleImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: React.ReactNode;
  longDescription?: string;
  decorative?: boolean;
}

/**
 * Accessible image component with proper alt text and fallback
 * @param decorative - Set to true for decorative images (alt will be empty)
 * @param longDescription - Detailed description for complex images
 */
export function AccessibleImage({
  src,
  alt,
  fallback,
  longDescription,
  decorative = false,
  className,
  ...props
}: AccessibleImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  if (hasError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-muted rounded-md p-4',
          className
        )}
        role="img"
        aria-label={decorative ? undefined : alt}
      >
        {fallback || (
          <div className="text-center text-muted-foreground">
            <ImageOff className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">Image unavailable</p>
            {!decorative && alt && (
              <p className="text-xs mt-1">{alt}</p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {isLoading && (
        <div
          className={cn(
            'animate-pulse bg-muted rounded-md',
            className
          )}
          aria-hidden="true"
        />
      )}
      <img
        src={src}
        alt={decorative ? '' : alt}
        className={cn(isLoading && 'hidden', className)}
        onLoad={handleLoad}
        onError={handleError}
        aria-describedby={longDescription ? `${props.id}-desc` : undefined}
        {...props}
      />
      {longDescription && (
        <div id={`${props.id}-desc`} className="sr-only">
          {longDescription}
        </div>
      )}
    </>
  );
}
