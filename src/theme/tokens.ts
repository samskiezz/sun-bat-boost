// Glassmorphic design system tokens
export const tokens = {
  // Glass panel styles
  panel: "bg-card/80 backdrop-blur-xl border border-border shadow-[0_8px_40px_rgba(0,0,0,0.12)] rounded-2xl",
  panelDark: "dark:bg-card/60 dark:border-border/40 dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]",
  
  // Interactive glass elements
  button: "bg-muted/50 hover:bg-muted/80 border border-border backdrop-blur-sm rounded-xl transition-all duration-300 text-foreground",
  buttonPrimary: "bg-gradient-to-r from-primary to-primary-glow text-primary-foreground border-0 shadow-glow hover:shadow-lg",
  
  // Card variants
  card: "bg-card/70 backdrop-blur-lg border border-border rounded-2xl shadow-glass",
  cardHover: "hover:bg-card/90 hover:border-border/60 hover:shadow-elegant hover:-translate-y-1",
  
  // Glow effects
  glow: "ring-1 ring-primary/40 shadow-glow",
  glowSubtle: "ring-1 ring-border shadow-[0_0_20px_rgba(0,0,0,0.1)]",
  
  // Text styles - semantic colors for proper contrast
  textPrimary: "text-foreground", 
  textSecondary: "text-muted-foreground",
  textGlass: "text-foreground drop-shadow-sm",
  textMuted: "text-muted-foreground",
  
  // Backgrounds
  backgroundGradient: "bg-gradient-to-br from-primary/10 via-background to-secondary/5",
  backgroundOverlay: "bg-[radial-gradient(circle_at_50%_120%,hsl(var(--primary)/0.2),transparent)]",
  
  // Animation classes
  transition: "transition-all duration-300 ease-out",
  transitionSlow: "transition-all duration-500 ease-out",
  
  // Layout
  container: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
  grid: "grid gap-6",
  
  // Holographic effects
  hologram: "relative before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:translate-x-[-100%] hover:before:animate-[shimmer_2s_ease-in-out] before:transition-transform",
  
  // Status indicators
  statusSuccess: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30",
  statusWarning: "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30",
  statusError: "bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/30",
  
  // Metrics and badges
  metric: "bg-muted/50 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 text-sm font-medium text-foreground",
  badge: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary border border-primary/30",
};

// Animation keyframes (to be added to tailwind config if needed)
export const animations = {
  shimmer: {
    '0%': { transform: 'translateX(-100%)' },
    '100%': { transform: 'translateX(100%)' }
  },
  float: {
    '0%, 100%': { transform: 'translateY(0px)' },
    '50%': { transform: 'translateY(-10px)' }
  },
  pulse: {
    '0%, 100%': { opacity: '1' },
    '50%': { opacity: '0.5' }
  }
};

// Color utilities for dynamic theming
export const colors = {
  glass: {
    light: 'rgba(255, 255, 255, 0.1)',
    medium: 'rgba(255, 255, 255, 0.2)',
    strong: 'rgba(255, 255, 255, 0.3)',
  },
  border: {
    light: 'rgba(255, 255, 255, 0.1)',
    medium: 'rgba(255, 255, 255, 0.2)',
    strong: 'rgba(255, 255, 255, 0.3)',
  },
  shadow: {
    glass: '0 8px 32px rgba(0, 0, 0, 0.12)',
    glow: '0 0 40px rgba(120, 119, 198, 0.3)',
    elegant: '0 4px 20px -2px rgba(0, 0, 0, 0.1)',
  }
};

// Spacing scale
export const spacing = {
  xs: '0.5rem',
  sm: '1rem', 
  md: '1.5rem',
  lg: '2rem',
  xl: '3rem',
  xxl: '4rem',
};

// Border radius scale
export const borderRadius = {
  sm: '0.5rem',
  md: '0.75rem', 
  lg: '1rem',
  xl: '1.25rem',
  xxl: '1.5rem',
  full: '9999px',
};