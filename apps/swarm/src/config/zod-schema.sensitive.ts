import { z } from "zod";

// Redacted sensitive field marker.
// We've moved away from the complex Zod OpenAPI registry to ensure
// maximum compatibility across different Node.js/ESM environments.
export const sensitive = {
  _isSensitive: true,
  register: (schema: any) => schema,
};

// Ensure z.registry exists as a dummy for any other imports
if (typeof (z as any).registry !== "function") {
  (z as any).registry = () => sensitive;
}
