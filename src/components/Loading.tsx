// src/components/Loading.tsx

export default function Loading() {
  return (
    <div className="min-h-screen bg-background-main flex items-center justify-center">
      <div className="text-center">
        <div className="relative">
          {/* Animated Calendar Icon */}
          <div className="w-20 h-20 bg-accent-primary/10 rounded-2xl flex items-center justify-center animate-pulse">
            <svg className="w-10 h-10 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          
          {/* Loading Dots */}
          <div className="flex justify-center mt-6 space-x-2">
            <div className="w-2 h-2 bg-accent-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-accent-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-accent-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
        
        <p className="mt-4 text-foreground-secondary">Loading...</p>
      </div>
    </div>
  );
}

// Skeleton component for content loading
export function ContentSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-background-secondary rounded-lg w-3/4 mb-4"></div>
      <div className="h-4 bg-background-secondary rounded w-full mb-2"></div>
      <div className="h-4 bg-background-secondary rounded w-5/6 mb-2"></div>
      <div className="h-4 bg-background-secondary rounded w-4/6"></div>
    </div>
  );
}

// Card skeleton for lists
export function CardSkeleton() {
  return (
    <div className="bg-background-secondary rounded-xl p-6 border border-border-color animate-pulse">
      <div className="h-40 bg-background-tertiary rounded-lg mb-4"></div>
      <div className="h-6 bg-background-tertiary rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-background-tertiary rounded w-full mb-2"></div>
      <div className="h-4 bg-background-tertiary rounded w-5/6"></div>
    </div>
  );
}