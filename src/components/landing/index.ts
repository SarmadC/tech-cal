// This barrel file makes it easier to import all landing components.

// Export all the "child" components
export * from './HeroSection';
export * from './ChaosToOrderSection';
export * from './SocialProof';
export * from './FeaturesGrid';
export * from './Footer';
export * from './UseCasesSection';
export * from './FAQSection';
export * from './CoverageSection';
export * from './FeatureShowcaseSection';
export { default as HackathonHighlightSection } from './HackathonHighlightSection';
export { default as LightRays } from './LightRays';

// Export adaptive renderer and mobile components
export { default as AdaptiveLandingRenderer } from './AdaptiveLandingRenderer';
export { default as MobileLandingPage } from './mobile/MobileLandingPage';

