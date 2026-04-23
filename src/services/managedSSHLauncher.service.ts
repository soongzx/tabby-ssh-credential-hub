import { Injectable } from '@angular/core'
import { AppService, NotificationsService } from 'tabby-core'
import { SSHTabComponent } from 'tabby-ssh'
import { ManagedSSHProfile } from '../types'
import { ManagedSSHMapperService } from './managedSSHMapper.service'

@Injectable()
export class ManagedSSHLauncherService {
  constructor (
    private app: AppService,
    private mapper: ManagedSSHMapperService,
    private notifications: NotificationsService
  ) {}

  async connect (managed: ManagedSSHProfile): Promise<void> {
    try {
      const runtimeProfile = await this.mapper.toRuntimeSSHProfile(managed)

      this.app.openNewTab({
        type: SSHTabComponent,
        inputs: { profile: runtimeProfile }
      })
    } catch (error: any) {
      this.notifications.error(`连接失败: ${error?.message ?? '未知错误'}`)
    }
  }
}