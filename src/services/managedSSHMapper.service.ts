import { Injectable } from '@angular/core'
import { SSHProfile, SSHAlgorithmType } from 'tabby-ssh'
import { ManagedSSHProfile } from '../types'
import { ManagedSSHSecretService } from './managedSSHSecret.service'
import { defaultAlgorithms } from '../algorithms'

@Injectable()
export class ManagedSSHMapperService {
  constructor (private secret: ManagedSSHSecretService) {}

  async toRuntimeSSHProfile (managed: ManagedSSHProfile): Promise<SSHProfile> {
    const password = managed.options.authMode === 'password'
      ? await this.secret.getPassword(managed.id)
      : null

    const runtimeProfile: SSHProfile = {
      id: `ssh-runtime:${managed.id}`,
      type: 'ssh',
      name: managed.name,
      group: managed.group ?? '',
      icon: managed.icon ?? 'fas fa-desktop',
      color: managed.color ?? null,
      disableDynamicTitle: false,
      weight: 0,
      isBuiltin: false,
      isTemplate: false,
      behaviorOnSessionEnd: 'auto',
      clearServiceMessagesOnConnect: true,
      options: {
        host: managed.options.host,
        port: managed.options.port,
        user: managed.options.user,
        auth: managed.options.authMode,
        password: password ?? '',
        privateKeys: managed.options.privateKeys ?? [],
        keepaliveInterval: 5000,
        keepaliveCountMax: 10,
        readyTimeout: null,
        x11: false,
        skipBanner: false,
        jumpHost: managed.options.jumpHostRef ?? null,
        agentForward: false,
        warnOnClose: null,
        algorithms: this.getDefaultAlgorithms(),
        proxyCommand: managed.options.proxyCommand ?? null,
        forwardedPorts: managed.options.forwardedPorts ?? [],
        socksProxyHost: null,
        socksProxyPort: null,
        httpProxyHost: null,
        httpProxyPort: null,
        reuseSession: true,
        input: { backspace: 'backspace' },
        scripts: []
      }
    } as any

    return runtimeProfile
  }

  private getDefaultAlgorithms (): Record<SSHAlgorithmType, string[]> {
    return {
      [SSHAlgorithmType.HMAC]: [...defaultAlgorithms.hmac],
      [SSHAlgorithmType.KEX]: [...defaultAlgorithms.kex],
      [SSHAlgorithmType.CIPHER]: [...defaultAlgorithms.cipher],
      [SSHAlgorithmType.HOSTKEY]: [...defaultAlgorithms.serverHostKey],
      [SSHAlgorithmType.Compression]: [...defaultAlgorithms.compression],
    }
  }
}