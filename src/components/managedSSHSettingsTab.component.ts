import { Component, OnInit } from '@angular/core'
import { NotificationsService } from 'tabby-core'
import { ManagedSSHProfile } from '../types'
import { ManagedSSHStoreService } from '../services/managedSSHStore.service'
import { ManagedSSHSecretService } from '../services/managedSSHSecret.service'
import { ManagedSSHLauncherService } from '../services/managedSSHLauncher.service'

@Component({
  template: require('./managedSSHSettingsTab.component.pug'),
  styles: [require('./managedSSHSettingsTab.component.scss')]
})
export class ManagedSSHSettingsTabComponent implements OnInit {
  profiles: ManagedSSHProfile[] = []
  filteredProfiles: ManagedSSHProfile[] = []
  selectedProfile: ManagedSSHProfile | null = null
  isEditing = false
  isLoading = false
  showPassword = false
  searchQuery = ''
  selectedGroup = ''

  editForm = {
    name: '',
    group: '',
    host: '',
    port: 22,
    user: '',
    authMode: 'password' as 'password' | 'publicKey' | 'agent' | 'keyboardInteractive',
    password: ''
  }

  get groups (): string[] {
    const groupSet = new Set<string>()
    this.profiles.forEach(p => {
      if (p.group) groupSet.add(p.group)
    })
    return Array.from(groupSet).sort()
  }

  constructor (
    private store: ManagedSSHStoreService,
    private secret: ManagedSSHSecretService,
    private launcher: ManagedSSHLauncherService,
    private notifications: NotificationsService
  ) {}

  async ngOnInit () {
    await this.loadProfiles()
  }

  async loadProfiles () {
    this.isLoading = true
    try {
      this.profiles = await this.store.getAllProfiles()
      this.applyFilter()
    } finally {
      this.isLoading = false
    }
  }

  applyFilter () {
    let result = [...this.profiles]

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase()
      result = result.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.options.host.toLowerCase().includes(query) ||
        p.options.user.toLowerCase().includes(query) ||
        p.group?.toLowerCase().includes(query)
      )
    }

    if (this.selectedGroup) {
      result = result.filter(p => p.group === this.selectedGroup)
    }

    this.filteredProfiles = result
  }

  onSearchChange () {
    this.applyFilter()
  }

  onGroupFilterChange () {
    this.applyFilter()
  }

  selectProfile (profile: ManagedSSHProfile) {
    this.selectedProfile = profile
    this.isEditing = false
  }

  startAdd () {
    this.selectedProfile = null
    this.isEditing = true
    this.resetForm()
  }

  startEdit () {
    if (!this.selectedProfile) return
    this.isEditing = true
    this.editForm = {
      name: this.selectedProfile.name,
      group: this.selectedProfile.group ?? '',
      host: this.selectedProfile.options.host,
      port: this.selectedProfile.options.port,
      user: this.selectedProfile.options.user,
      authMode: this.selectedProfile.options.authMode,
      password: ''
    }
    this.showPassword = false
  }

  async save () {
    if (!this.validateForm()) {
      return
    }

    this.isLoading = true
    try {
      if (this.selectedProfile) {
        await this.store.updateProfile(this.selectedProfile.id, {
          name: this.editForm.name,
          group: this.editForm.group || undefined,
          options: {
            ...this.selectedProfile.options,
            host: this.editForm.host,
            port: this.editForm.port,
            user: this.editForm.user,
            authMode: this.editForm.authMode
          }
        })

        if (this.editForm.password) {
          await this.secret.setPassword(this.selectedProfile.id, this.editForm.password)
        }

        this.notifications.info('连接已更新')
      } else {
        const newProfile = await this.store.addProfile({
          name: this.editForm.name,
          group: this.editForm.group || undefined,
          icon: null,
          color: null,
          options: {
            host: this.editForm.host,
            port: this.editForm.port,
            user: this.editForm.user,
            authMode: this.editForm.authMode,
            passwordRef: null,
            privateKeys: [],
            jumpHostRef: null,
            proxyCommand: null,
            forwardedPorts: [],
            tags: [],
            description: ''
          }
        })

        if (this.editForm.password) {
          await this.secret.setPassword(newProfile.id, this.editForm.password)
        }

        this.notifications.info('连接已添加')
      }

      await this.loadProfiles()
      this.isEditing = false
      this.resetForm()
    } catch (error: any) {
      this.notifications.error(error?.message ?? '保存失败')
    } finally {
      this.isLoading = false
    }
  }

  cancelEdit () {
    this.isEditing = false
    this.resetForm()
  }

  async delete () {
    if (!this.selectedProfile) return

    this.isLoading = true
    try {
      await this.store.deleteProfile(this.selectedProfile.id)
      await this.secret.deletePassword(this.selectedProfile.id)
      await this.loadProfiles()
      this.selectedProfile = null
      this.notifications.info('连接已删除')
    } catch (error: any) {
      this.notifications.error(error?.message ?? '删除失败')
    } finally {
      this.isLoading = false
    }
  }

  async connect () {
    if (!this.selectedProfile) return
    await this.launcher.connect(this.selectedProfile)
  }

  async copyAddress () {
    if (!this.selectedProfile) return
    const { user, host, port } = this.selectedProfile.options
    const address = `${user}@${host}:${port}`
    await navigator.clipboard.writeText(address)
    this.notifications.info('已复制地址')
  }

  togglePasswordVisibility () {
    this.showPassword = !this.showPassword
  }

  clearGroupFilter () {
    this.selectedGroup = ''
    this.applyFilter()
  }

  private validateForm (): boolean {
    if (!this.editForm.name?.trim()) {
      this.notifications.error('请输入连接名称')
      return false
    }
    if (!this.editForm.host?.trim()) {
      this.notifications.error('请输入主机地址')
      return false
    }
    if (!this.editForm.user?.trim()) {
      this.notifications.error('请输入用户名')
      return false
    }
    if (this.editForm.port < 1 || this.editForm.port > 65535) {
      this.notifications.error('端口号无效')
      return false
    }
    return true
  }

  private resetForm () {
    this.editForm = {
      name: '',
      group: '',
      host: '',
      port: 22,
      user: '',
      authMode: 'password',
      password: ''
    }
    this.showPassword = false
  }
}