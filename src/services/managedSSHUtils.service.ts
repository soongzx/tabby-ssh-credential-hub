import { Injectable } from '@angular/core'

@Injectable()
export class ManagedSSHUtilsService {
  constructor () {}

  async copyToClipboard (text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      return false
    }
  }

  formatAddress (host: string, port: number, user: string): string {
    return `${user}@${host}:${port}`
  }

  parseAddress (address: string): { user?: string; host: string; port: number } | null {
    try {
      let user: string | undefined
      let host = address
      let port = 22

      if (host.includes('@')) {
        const parts = host.split('@')
        user = parts[0]
        host = parts.slice(1).join('@')
      }

      if (host.includes('[')) {
        const match = host.match(/\[([^\]]+)\](:\d+)?/)
        if (match) {
          host = match[1]
          port = match[2] ? parseInt(match[2].substring(1)) : 22
        }
      } else if (host.includes(':')) {
        const parts = host.split(':')
        host = parts[0]
        port = parseInt(parts[1])
      }

      if (isNaN(port) || port < 1 || port > 65535) {
        port = 22
      }

      return { user, host, port }
    } catch {
      return null
    }
  }

  validateHost (host: string): boolean {
    if (!host?.trim()) return false
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/
    const hostnamePattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    return ipv4Pattern.test(host) || hostnamePattern.test(host)
  }

  validatePort (port: number): boolean {
    return Number.isInteger(port) && port >= 1 && port <= 65535
  }

  validateUsername (username: string): boolean {
    return !!username?.trim()
  }
}