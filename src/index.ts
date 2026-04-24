import { Injectable, NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import TabbyCoreModule, { ConfigProvider } from 'tabby-core'

@Injectable()
class EmptyConfigProvider extends ConfigProvider {
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
}

@NgModule({
    imports: [
        CommonModule,
        TabbyCoreModule
    ],
    providers: [
        { provide: ConfigProvider, useClass: EmptyConfigProvider, multi: true }
    ]
})
export default class ManagedSSHModule {}