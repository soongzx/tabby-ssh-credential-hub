import { Injectable } from '@angular/core'
import { TranslateService } from 'tabby-core'
import { SettingsTabProvider } from 'tabby-settings'
import { ManagedSSHSettingsTabComponent } from './components/managedSSHSettingsTab.component'

@Injectable()
export class ManagedSSHSettingsTabProvider extends SettingsTabProvider {
  id = 'ssh-credential-hub'
  icon = 'key'
  title = 'SSH 凭据中心'

  constructor (private translate: TranslateService) {
    super()
  }

  getComponentType (): any {
    return ManagedSSHSettingsTabComponent
  }
}