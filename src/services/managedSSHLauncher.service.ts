import { Injectable } from '@angular/core'
import { AppService, NotificationsService } from 'tabby-core'
import { ManagedSSHProfile } from '../types'

declare const SSHTabComponent: any

@Injectable()
export class ManagedSSHLauncherService {
  private sshTabComponent: any = null
  private sshAvailable = false

  constructor (
    private app: AppService,
    private notifications: NotificationsService
  ) {
    this.detectSSHTab()
  }

  private detectSSHTab () {
    try {
      if (typeof SSHTabComponent !== 'undefined') {
        this.sshTabComponent = SSHTabComponent
        this.sshAvailable = true
      }
    } catch (e) {
      this.sshAvailable = false
    }
  }

  async connect (managed: ManagedSSHProfile): Promise<void> {
    const { user, host, port } = managed.options
    const address = `${user}@${host}:${port}`

    if (this.sshAvailable && this.sshTabComponent) {
      try {
        const runtimeProfile = this.buildRuntimeProfile(managed)
        this.app.openNewTab({
          type: this.sshTabComponent,
          inputs: { profile: runtimeProfile }
        })
        return
      } catch (e) {
        console.warn('Failed to use SSHTab, falling back to clipboard', e)
      }
    }

    await navigator.clipboard.writeText(address)
    this.notifications.info(`已复制连接信息: ${address}`)
  }

  isSSHAvailable (): boolean {
    return this.sshAvailable
  }

  private buildRuntimeProfile (managed: ManagedSSHProfile): any {
    return {
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
        password: '',
        privateKeys: managed.options.privateKeys ?? [],
        keepaliveInterval: 5000,
        keepaliveCountMax: 10,
        readyTimeout: null,
        x11: false,
        skipBanner: false,
        jumpHost: managed.options.jumpHostRef ?? null,
        agentForward: false,
        warnOnClose: null,
        algorithms: {
          hmac: [
            'hmac-sha2-512-etm@openssh.com',
            'hmac-sha2-256-etm@openssh.com',
            'hmac-sha2-512',
            'hmac-sha2-256',
            'hmac-sha1-etm@openssh.com',
            'hmac-sha1',
          ],
          kex: [
            'curve25519-sha256',
            'curve25519-sha256@libssh.org',
            'diffie-hellman-group16-sha512',
            'diffie-hellman-group14-sha256',
          ],
          cipher: [
            'chacha20-poly1305@openssh.com',
            'aes256-gcm@openssh.com',
            'aes256-ctr',
            'aes192-ctr',
            'aes128-ctr',
          ],
          serverHostKey: [
            'ssh-ed25519',
            'ecdsa-sha2-nistp256',
            'ecdsa-sha2-nistp521',
            'rsa-sha2-256',
            'rsa-sha2-512',
            'ssh-rsa',
          ],
          compression: ['none'],
        },
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
    }
  }
}