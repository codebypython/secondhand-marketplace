// Animation configuration and named durations/easings used across the app
export const animations = {
  durations: {
    fast: '200ms',
    medium: '350ms',
    slow: '600ms',
  },
  easings: {
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
    decel: 'cubic-bezier(0.0, 0, 0.2, 1)',
  },
  // class names (CSS keyframes should be defined in CSS files)
  classes: {
    fadeIn: 'anim-fade-in',
    slideUp: 'anim-slide-up',
    shimmer: 'anim-shimmer',
  },
};

export default animations;
