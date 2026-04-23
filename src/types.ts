import { ForwardedPortConfig, PortForwardType } from 'tabby-ssh'

export { ForwardedPortConfig, PortForwardType }

export interface ManagedSSHProfile {
  id: string
  type: 'managed-ssh'
  name: string
  group?: string
  icon?: string | null
  color?: string | null
  sourceId: string
  options: ManagedSSHOptions
}

export interface ManagedSSHOptions {
  host: string
  port: number
  user: string
  authMode: 'password' | 'publicKey' | 'agent' | 'keyboardInteractive'
  passwordRef?: string | null
  privateKeys?: string[]
  jumpHostRef?: string | null
  proxyCommand?: string | null
  forwardedPorts?: ForwardedPortConfig[]
  tags?: string[]
  description?: string
}

export interface ManagedSSHConfig {
  sshCredentialHub: {
    version: number
    profiles: ManagedSSHProfileRecord[]
    preferences: ManagedSSHPreferences
  }
}

export interface ManagedSSHProfileRecord {
  id: string
  name: string
  group?: string
  icon?: string | null
  color?: string | null
  sourceId: string
  options: {
    host: string
    port: number
    user: string
    authMode: 'password' | 'publicKey' | 'agent' | 'keyboardInteractive'
    passwordRef?: string | null
    privateKeys?: string[]
    jumpHostRef?: string | null
    proxyCommand?: string | null
    forwardedPorts?: ForwardedPortConfig[]
    tags?: string[]
    description?: string
  }
}

export interface ManagedSSHPreferences {
  preferVault: boolean
  showManagedProfilesOnly: boolean
  defaultGroup: string
}

export const MANAGED_SSH_TYPE = 'managed-ssh'

export const VAULT_KEY_TYPE = 'managed-ssh:password'