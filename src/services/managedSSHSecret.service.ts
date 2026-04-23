import { Injectable } from '@angular/core'
import { VaultService } from 'tabby-core'
import { VAULT_KEY_TYPE } from '../types'

@Injectable()
export class ManagedSSHSecretService {
  constructor (private vault: VaultService) {}

  async setPassword (profileId: string, password: string): Promise<void> {
    const key = this.buildVaultKey(profileId)
    await this.vault.addSecret({ type: VAULT_KEY_TYPE, key, value: password })
  }

  async getPassword (profileId: string): Promise<string | null> {
    const key = this.buildVaultKey(profileId)
    const secret = await this.vault.getSecret(VAULT_KEY_TYPE, key)
    return secret?.value ?? null
  }

  async deletePassword (profileId: string): Promise<void> {
    const key = this.buildVaultKey(profileId)
    await this.vault.removeSecret(VAULT_KEY_TYPE, key)
  }

  async hasPassword (profileId: string): Promise<boolean> {
    const password = await this.getPassword(profileId)
    return password !== null
  }

  private buildVaultKey (profileId: string): any {
    return { profileId }
  }
}