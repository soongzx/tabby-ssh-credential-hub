import { Injectable } from '@angular/core'
import { NewTabParameters, ProfileProvider } from 'tabby-core'
import SSHTabComponent from 'tabby-ssh'
import { ManagedSSHProfile, MANAGED_SSH_TYPE } from './types'
import { ManagedSSHMapperService } from './services/managedSSHMapper.service'

@Injectable()
export class ManagedSSHProfilesService extends ProfileProvider<ManagedSSHProfile> {
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

  async getNewTabParameters (profile: ManagedSSHProfile): Promise<any> {
    const runtimeProfile = await this.mapper.toRuntimeSSHProfile(profile)
    return {
      type: SSHTabComponent,
      inputs: { profile: runtimeProfile }
    }
  }

  getDescription (profile: ManagedSSHProfile): string {
    const { user, host, port } = profile.options
    return `${user}@${host}:${port}`
  }
}