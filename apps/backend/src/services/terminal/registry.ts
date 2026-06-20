import type { TerminalProvider } from '@ultimate-pos/shared'
import type { TerminalProviderService } from './types'

class TerminalServiceRegistry {
  private providers = new Map<TerminalProvider, TerminalProviderService>()

  register(service: TerminalProviderService): void {
    this.providers.set(service.provider, service)
    console.log(`[terminal-registry] Registered provider: ${service.provider} (${service.label})`)
  }

  get(provider: TerminalProvider): TerminalProviderService {
    const service = this.providers.get(provider)
    if (!service) {
      throw new Error(`Terminal provider "${provider}" is not registered`)
    }
    return service
  }

  getAll(): TerminalProviderService[] {
    return Array.from(this.providers.values())
  }

  getRegisteredProviders(): TerminalProvider[] {
    return Array.from(this.providers.keys())
  }
}

export const terminalRegistry = new TerminalServiceRegistry()
