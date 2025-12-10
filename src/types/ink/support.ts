/**
 * Shared utilities for Ink! contract event decoders
 * 
 * This module provides SCALE codec decoding functions and hex utilities
 * used by generated decoder code. All functions follow SCALE specification:
 * - Little-endian byte order for integers
 * - Compact encoding for variable-length integers
 * - No padding between fields
 */

/**
 * Convert hex string to Uint8Array
 * @param hex - Hex string (with or without 0x prefix)
 * @returns Uint8Array of bytes
 */
export function hexToBytes(hex: string): Uint8Array {
    const clean = hex.startsWith('0x') ? hex.slice(2) : hex
    const out = new Uint8Array(clean.length / 2)
    for (let i = 0; i < clean.length; i += 2) {
        out[i >> 1] = parseInt(clean.slice(i, i + 2), 16)
    }
    return out
}

/**
 * Convert Uint8Array to hex string
 * @param bytes - Byte array
 * @returns Hex string with 0x prefix
 */
export function bytesToHex(bytes: Uint8Array): string {
    let hex = '0x'
    for (let i = 0; i < bytes.length; i++) {
        const b = bytes[i].toString(16).padStart(2, '0')
        hex += b
    }
    return hex
}

/**
 * Result type for SCALE decode operations
 * Contains the decoded value and the new offset after reading
 */
export interface ReadResult<T> { value: T; offset: number }

/**
 * Read u8 (unsigned 8-bit integer) from buffer
 * @param buf - Buffer to read from
 * @param offset - Starting offset
 * @returns Decoded value and new offset
 */
export function readU8(buf: Uint8Array, offset: number): ReadResult<number> {
    return { value: buf[offset], offset: offset + 1 }
}

/**
 * Read u16 (unsigned 16-bit integer) from buffer (little-endian)
 * @param buf - Buffer to read from
 * @param offset - Starting offset
 * @returns Decoded value and new offset
 */
export function readU16(buf: Uint8Array, offset: number): ReadResult<number> {
    const v = buf[offset] | (buf[offset + 1] << 8)
    return { value: v, offset: offset + 2 }
}

/**
 * Read u32 (unsigned 32-bit integer) from buffer (little-endian)
 * @param buf - Buffer to read from
 * @param offset - Starting offset
 * @returns Decoded value and new offset
 */
export function readU32(buf: Uint8Array, offset: number): ReadResult<number> {
    const v = buf[offset] | (buf[offset + 1] << 8) | (buf[offset + 2] << 16) | (buf[offset + 3] << 24)
    return { value: v >>> 0, offset: offset + 4 }
}

/**
 * Read u64 (unsigned 64-bit integer) from buffer (little-endian)
 * Returns bigint to handle values > Number.MAX_SAFE_INTEGER
 * @param buf - Buffer to read from
 * @param offset - Starting offset
 * @returns Decoded value (bigint) and new offset
 */
export function readU64(buf: Uint8Array, offset: number): ReadResult<bigint> {
    let v = 0n
    for (let i = 0; i < 8; i++) v |= BigInt(buf[offset + i]) << BigInt(i * 8)
    return { value: v, offset: offset + 8 }
}

/**
 * Read u128 (unsigned 128-bit integer) from buffer (little-endian)
 * Returns bigint to handle large values
 * @param buf - Buffer to read from
 * @param offset - Starting offset
 * @returns Decoded value (bigint) and new offset
 */
export function readU128(buf: Uint8Array, offset: number): ReadResult<bigint> {
    let v = 0n
    for (let i = 0; i < 16; i++) v |= BigInt(buf[offset + i]) << BigInt(i * 8)
    return { value: v, offset: offset + 16 }
}

/**
 * Read compact-encoded u32 from buffer
 * SCALE compact encoding uses 1-5 bytes depending on value:
 * - 0-63: 1 byte (flag 00)
 * - 64-16383: 2 bytes (flag 01)
 * - 16384-1073741823: 4 bytes (flag 10)
 * - >= 2^30: 5+ bytes (flag 11)
 * @param buf - Buffer to read from
 * @param offset - Starting offset
 * @returns Decoded value (number or bigint) and new offset
 */
export function readCompactU32(buf: Uint8Array, offset: number): ReadResult<number | bigint> {
    const flag = buf[offset] & 0b11
    if (flag === 0) {
        return { value: buf[offset] >> 2, offset: offset + 1 }
    }
    if (flag === 1) {
        const lo = buf[offset]
        const hi = buf[offset + 1]
        const v = ((lo | (hi << 8)) >> 2) >>> 0
        return { value: v, offset: offset + 2 }
    }
    if (flag === 2) {
        const a = buf[offset]
        const b = buf[offset + 1]
        const c = buf[offset + 2]
        const d = buf[offset + 3]
        const v = ((a | (b << 8) | (c << 16) | (d << 24)) >>> 2) >>> 0
        return { value: v, offset: offset + 4 }
    }
    const byteLen = 4 + (buf[offset] >> 2)
    let val = 0n
    for (let i = 0; i < byteLen; i++) val |= BigInt(buf[offset + 1 + i]) << BigInt(8 * i)
    return { value: val, offset: offset + 1 + byteLen }
}

/**
 * Read string from buffer (SCALE encoding: compact length + UTF-8 bytes)
 * @param buf - Buffer to read from
 * @param offset - Starting offset
 * @returns Decoded string and new offset
 */
export function readString(buf: Uint8Array, offset: number): ReadResult<string> {
    const len = readCompactU32(buf, offset)
    const start = len.offset
    const end = start + Number(len.value)
    const value = new TextDecoder().decode(buf.slice(start, end))
    return { value, offset: end }
}

/**
 * Type-safe assertion function
 * Throws error if condition is false
 * @param condition - Condition to check
 * @param message - Error message
 */
export function assert(condition: boolean, message: string): asserts condition {
    if (!condition) throw new Error(message)
}

// TODO: Consider adding additional utility functions if needed:
// - readI64() / readI128() for signed integers (currently computed from unsigned)
// - readU256() / readI256() for 256-bit integers
// - readCompactU64() / readCompactU128() if compact encoding is used for larger types
// - Helper for decoding Option<T> and Result<T, E> patterns (if needed)
// - Helper for decoding tuples directly (currently handled in composite decoding)


