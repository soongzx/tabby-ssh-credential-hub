import { Injectable } from '@angular/core'
import { ConfigService } from 'tabby-core'
import { v4 as uuidv4 } from 'uuid'
import {
  ManagedSSHProfile,
  ManagedSSHProfileRecord,
  ManagedSSHPreferences
} from '../types'

@Injectable()
export class ManagedSSHStoreService {
  constructor (private config: ConfigService) {}

  private getConfig () {
    return this.config.store.sshCredentialHub
  }

  async getAllProfiles (): Promise<ManagedSSHProfile[]> {
    return this.getConfig().profiles.map(record => this.recordToProfile(record))
  }

  async getProfile (id: string): Promise<ManagedSSHProfile | null> {
    const record = this.getConfig().profiles.find(p => p.id === id)
    return record ? this.recordToProfile(record) : null
  }

  async addProfile (profile: Omit<ManagedSSHProfile, 'id' | 'type' | 'sourceId'>): Promise<ManagedSSHProfile> {
    const newProfile: ManagedSSHProfile = {
      ...profile,
      id: uuidv4(),
      type: 'managed-ssh',
      sourceId: `managed-ssh:${profile.name}`
    }

    const record = this.profileToRecord(newProfile)
    this.getConfig().profiles.push(record)
    await this.config.save()

    return newProfile
  }

  async updateProfile (id: string, updates: Partial<ManagedSSHProfile>): Promise<ManagedSSHProfile | null> {
    const profiles = this.getConfig().profiles
    const index = profiles.findIndex(p => p.id === id)

    if (index === -1) {
      return null
    }

    const existing = profiles[index]
    const updatedOptions = updates.options
      ? { ...existing.options, ...updates.options }
      : existing.options

    const updated: ManagedSSHProfileRecord = {
      ...existing,
      name: updates.name ?? existing.name,
      group: updates.group ?? existing.group,
      icon: updates.icon ?? existing.icon,
      color: updates.color ?? existing.color,
      options: updatedOptions
    }

    profiles[index] = updated
    await this.config.save()

    return this.recordToProfile(updated)
  }

  async deleteProfile (id: string): Promise<boolean> {
    const profiles = this.getConfig().profiles
    const index = profiles.findIndex(p => p.id === id)

    if (index === -1) {
      return false
    }

    profiles.splice(index, 1)
    await this.config.save()
    return true
  }

  async getPreferences (): Promise<ManagedSSHPreferences> {
    return this.getConfig().preferences
  }

  async updatePreferences (preferences: Partial<ManagedSSHPreferences>): Promise<void> {
    const current = this.getConfig().preferences
    this.getConfig().preferences = { ...current, ...preferences }
    await this.config.save()
  }

  private recordToProfile (record: ManagedSSHProfileRecord): ManagedSSHProfile {
    return {
      id: record.id,
      type: 'managed-ssh',
      name: record.name,
      group: record.group,
      icon: record.icon,
      color: record.color,
      sourceId: record.sourceId,
      options: {
        host: record.options.host,
        port: record.options.port,
        user: record.options.user,
        authMode: record.options.authMode,
        passwordRef: record.options.passwordRef,
        privateKeys: record.options.privateKeys,
        jumpHostRef: record.options.jumpHostRef,
        proxyCommand: record.options.proxyCommand,
        forwardedPorts: record.options.forwardedPorts,
        tags: record.options.tags,
        description: record.options.description
      }
    }
  }

  private profileToRecord (profile: ManagedSSHProfile): ManagedSSHProfileRecord {
    return {
      id: profile.id,
      name: profile.name,
      group: profile.group,
      icon: profile.icon,
      color: profile.color,
      sourceId: profile.sourceId,
      options: {
        host: profile.options.host,
        port: profile.options.port,
        user: profile.options.user,
        authMode: profile.options.authMode,
        passwordRef: profile.options.passwordRef,
        privateKeys: profile.options.privateKeys,
        jumpHostRef: profile.options.jumpHostRef,
        proxyCommand: profile.options.proxyCommand,
        forwardedPorts: profile.options.forwardedPorts,
        tags: profile.options.tags,
        description: profile.options.description
      }
    }
  }
}