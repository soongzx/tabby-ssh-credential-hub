import { Injectable } from '@angular/core'
import { ConfigProvider } from 'tabby-core'

@Injectable()
export class ManagedSSHConfigProvider extends ConfigProvider {
  defaults = {
    sshCredentialHub: {
      version: 1,
      profiles: [],
      preferences: {
        preferVault: true,
        showManagedProfilesOnly: true,
        defaultGroup: ''
      }
    }
  }

  platformDefaults = {}
}