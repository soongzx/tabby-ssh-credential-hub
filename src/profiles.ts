import { Injectable } from '@angular/core'
import { ProfileProvider } from 'tabby-core'
import { ManagedSSHProfile, MANAGED_SSH_TYPE } from './types'

@Injectable()
export class ManagedSSHProfilesService extends ProfileProvider<any> {
  id = MANAGED_SSH_TYPE
  name = 'Managed SSH'

  constructor () {
    super()
  }

  async getBuiltinProfiles (): Promise<any[]> {
    return []
  }

  getNewTabParameters (profile: any): any {
    return null
  }

  getDescription (profile: any): string {
    const p = profile as ManagedSSHProfile
    if (!p?.options) return ''
    const { user, host, port } = p.options
    return `${user}@${host}:${port}`
  }
}