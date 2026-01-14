/**
 * Static decoder registry for this project
 * 
 * This file registers static imports for each generated contract.
 * Imports are resolved at build time, which improves performance.
 * 
 * @generated - Do not edit manually, regenerate with gen-ink-decoder.js
 */

import { registerStaticDecoder } from '@luckyweb3/subsquid-ink-v6-decoder'

// Static import for guess_the_number
import * as guess_the_numberDecoder from '../types/ink/guess_the_number'

/**
 * Register all static decoders available for this project
 * This function is called automatically when the module is imported
 */
export function registerAllStaticDecoders(): void {
  // Register decoder for guess_the_number
  registerStaticDecoder('guess_the_number', () => guess_the_numberDecoder)
}

// Automatically register when module is loaded
registerAllStaticDecoders()
