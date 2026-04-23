import { Injectable } from '@angular/core'
import { ProfileProvider } from 'tabby-core'
import SSHTabComponent from 'tabby-ssh'
import { ManagedSSHProfile, MANAGED_SSH_TYPE } from './types'
import { ManagedSSHMapperService } from './services/managedSSHMapper.service'

@Injectable()
export class ManagedSSHProfilesService extends ProfileProvider<any> {
  id = MANAGED_SSH_TYPE
  name = 'Managed SSH'

  constructor (
    private mapper: ManagedSSHMapperService
  ) {
    super()
  }

  async getBuiltinProfiles (): Promise<any[]> {
    return []
  }

  async getNewTabParameters (profile: any): Promise<any> {
    const managed = profile as ManagedSSHProfile
    const runtimeProfile = await this.mapper.toRuntimeSSHProfile(managed)
    return {
      type: SSHTabComponent,
      inputs: { profile: runtimeProfile }
    }
  }

  getDescription (profile: any): string {
    const p = profile as ManagedSSHProfile
    const { user, host, port } = p.options
    return `${user}@${host}:${port}`
  }
}