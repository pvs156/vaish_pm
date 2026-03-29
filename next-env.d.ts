/// <reference types="next" />
/// <reference types="next/image-types/global" />

// Allow side-effect CSS imports (Next.js handles bundling)
declare module "*.css" {
  const styles: Record<string, string>;
  export default styles;
}
