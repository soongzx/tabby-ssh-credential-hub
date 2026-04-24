import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import TabbyCoreModule, { ConfigProvider, ProfileProvider } from 'tabby-core'
import { SettingsTabProvider } from 'tabby-settings'
import TabbyTerminalModule from 'tabby-terminal'

import { ManagedSSHConfigProvider } from './config'
import { ManagedSSHProfilesService } from './profiles'
import { ManagedSSHSettingsTabProvider } from './settings'
import { ManagedSSHSettingsTabComponent } from './components/managedSSHSettingsTab.component'
import { ManagedSSHStoreService } from './services/managedSSHStore.service'
import { ManagedSSHSecretService } from './services/managedSSHSecret.service'
import { ManagedSSHMapperService } from './services/managedSSHMapper.service'
import { ManagedSSHLauncherService } from './services/managedSSHLauncher.service'
import { ManagedSSHUtilsService } from './services/managedSSHUtils.service'

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    NgbModule,
    TabbyCoreModule,
    TabbyTerminalModule
  ],
  declarations: [
    ManagedSSHSettingsTabComponent
  ],
  entryComponents: [
    ManagedSSHSettingsTabComponent
  ],
  providers: [
    { provide: ConfigProvider, useClass: ManagedSSHConfigProvider, multi: true },
    { provide: SettingsTabProvider, useClass: ManagedSSHSettingsTabProvider, multi: true },
    { provide: ProfileProvider, useExisting: ManagedSSHProfilesService, multi: true },
    ManagedSSHStoreService,
    ManagedSSHSecretService,
    ManagedSSHMapperService,
    ManagedSSHLauncherService,
    ManagedSSHUtilsService
  ]
})
export default class ManagedSSHModule {}