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
// Static import for erc721
import * as erc721Decoder from '../types/ink/erc721'

/**
 * Register all static decoders available for this project
 * This function is called automatically when the module is imported
 */
export function registerAllStaticDecoders(): void {
  // Register decoder for guess_the_number
  registerStaticDecoder('guess_the_number', () => guess_the_numberDecoder)
  // Register decoder for erc721
  registerStaticDecoder('erc721', () => erc721Decoder)
}

// Automatically register when module is loaded
registerAllStaticDecoders()
