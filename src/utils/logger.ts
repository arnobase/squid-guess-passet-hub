// Système de logging intelligent pour contrôler les traces
export class Logger {
    private static logLevel: string
    private static targetContracts: string[]
    private static isProduction: boolean

    static {
        this.logLevel = process.env.LOG_LEVEL || 'info'
        this.targetContracts = (process.env.TARGET_CONTRACTS || '0xe75cbd47620dbb2053cf2a98d06840f06baaf141').split(',').map(addr => addr.trim().toLowerCase())
        this.isProduction = process.env.NODE_ENV === 'production'
    }

    static debug(message: string, data?: any) {
        if (this.shouldLog('debug')) {
            console.log(`🔍 [DEBUG] ${message}`, data || '')
        }
    }

    static info(message: string, data?: any) {
        if (this.shouldLog('info')) {
            console.log(`ℹ️ [INFO] ${message}`, data || '')
        }
    }

    static warn(message: string, data?: any) {
        if (this.shouldLog('warn')) {
            console.warn(`⚠️ [WARN] ${message}`, data || '')
        }
    }

    static error(message: string, data?: any) {
        if (this.shouldLog('error')) {
            console.error(`❌ [ERROR] ${message}`, data || '')
        }
    }

    static contractEvent(contractAddress: string, eventType: string, message: string, data?: any) {
        if (this.isTargetContract(contractAddress)) {
            console.log(`🔥 [${eventType.toUpperCase()}] ${message}`, data || '')
        } else if (this.shouldLog('debug')) {
            console.log(`🔍 [SKIP] Non-target contract ${contractAddress}: ${message}`)
        }
    }

    static blockProcessing(blockNumber: number, eventCount: number, hasTargetEvents: boolean) {
        // Log seulement s'il y a des événements de contrats cibles ou en mode debug
        if (hasTargetEvents || this.shouldLog('debug')) {
            console.log(`📦 Block ${blockNumber}: ${eventCount} events${hasTargetEvents ? ' (includes target contract)' : ''}`)
        }
    }

    private static shouldLog(level: string): boolean {
        const levels = ['error', 'warn', 'info', 'debug']
        const currentLevelIndex = levels.indexOf(this.logLevel)
        const requestedLevelIndex = levels.indexOf(level)
        return requestedLevelIndex <= currentLevelIndex
    }

    private static isTargetContract(contractAddress: string): boolean {
        return this.targetContracts.includes(contractAddress.toLowerCase())
    }

    static getTargetContracts(): string[] {
        return [...this.targetContracts]
    }

    static getLogLevel(): string {
        return this.logLevel
    }
}
