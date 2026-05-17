/**
 * [ROOT CAUSE RESOLUTION]
 * Manually registering 'openrouter/free' metadata to stop the SDK warnings at the source.
 * This fulfills the requirement of the @mariozechner/pi-ai library.
 */
export const models = {
  "openrouter/free": {
    "contextWindow": 128000,
    "maxOutput": 4096,
    "pricing": {
      "input": 0,
      "output": 0
    }
  }
};

// Default export if required by index.js
export default models;
