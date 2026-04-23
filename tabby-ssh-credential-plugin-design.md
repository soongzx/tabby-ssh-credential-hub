# Tabby 独立 SSH 凭据插件设计方案

## 1. 目标

我对当前项目做了结构分析后，结论是：

这个需求可行，且适合做成一个独立的 Tabby 插件，不需要直接改造 `tabby-ssh` 的主体连接逻辑。

目标能力如下：

1. 新插件独立维护服务器地址、账户、密码等连接信息。
2. 用户平时在该插件内管理这些信息，而不是直接维护 `tabby-ssh` 的原生 Profile。
3. 当用户发起 SSH 连接时，由该插件把自身保存的数据转换为 `tabby-ssh` 可识别的连接参数。
4. 真正的 SSH 建连、认证、终端会话、端口转发、SFTP 等能力继续复用现有 `tabby-ssh`。

当前阶段只输出设计文档，不进入实现。

## 2. 基于现有项目的判断依据

我在仓库中确认了以下关键事实：

1. Tabby 本身就是插件式架构，应用启动时会动态加载 `tabby-*` 插件模块。
2. 插件通过 Angular `NgModule` 和 Provider 扩展系统能力，典型扩展点包括：
   - `ConfigProvider`
   - `ProfileProvider`
   - `SettingsTabProvider`
3. `tabby-ssh` 已经把 SSH 相关公开能力导出出来，包括：
   - `SSHTabComponent`
   - `SSHProfile`
   - `PasswordStorageService`
4. `ProfilesService` 可以根据 Profile 打开新标签页，因此新插件完全可以自己生成一个“桥接用 SSH Profile”，再交给 `tabby-ssh` 负责连接。
5. `tabby-ssh` 当前密码读取逻辑主要围绕 `SSHProfile` 和 `PasswordStorageService`，如果强行接管其密码链路，耦合会更深，升级风险更高。

对应代码位置：

1. `app/src/plugins.ts`
2. `tabby-core/src/api/profileProvider.ts`
3. `tabby-core/src/services/profiles.service.ts`
4. `tabby-ssh/src/index.ts`
5. `tabby-ssh/src/profiles.ts`
6. `tabby-ssh/src/session/ssh.ts`
7. `tabby-ssh/src/services/passwordStorage.service.ts`

## 3. 可行性结论

## 3.1 可行

推荐方案是：

新增一个独立插件，例如 `tabby-ssh-credential-hub`，它不替代 `tabby-ssh`，而是作为“连接信息管理层 + SSH 启动桥接层”。

这样做的原因：

1. `tabby-ssh` 已经非常完整地处理了认证流程、跳板机、代理、私钥、SFTP、端口转发、Host Key 校验等复杂逻辑。
2. 你的需求核心不在“重写 SSH”，而在“独立管理地址/账号/密码，并在连接时调用 Tabby 现有 SSH 能力”。
3. 采用桥接层，开发量更可控，后续跟随上游升级也更稳。

## 3.2 不建议的路线

不建议一开始就做以下方案：

1. 直接覆写 `PasswordStorageService`，把 `tabby-ssh` 的密码存储切换到新插件。
2. 直接修改 `tabby-ssh/src/session/ssh.ts`，让它从新插件读取密码。
3. 完全自研新的 SSH Tab 和认证流程。

原因：

1. 这些方案都比“桥接”更侵入。
2. 会把你的插件和 `tabby-ssh` 内部实现细节绑定得很死。
3. 一旦上游 SSH 插件升级，维护成本会明显增大。

## 4. 推荐总体架构

推荐采用三层结构：

1. 数据管理层：插件自己的连接信息模型、存储、加密。
2. 业务编排层：把插件记录转换为 `SSHProfile`，并发起连接。
3. UI 层：提供独立设置页、列表页、编辑弹窗、快速连接入口。

架构关系如下：

```text
用户操作插件 UI
    -> 插件读取自己的服务器记录
    -> 插件生成运行时 SSHProfile
    -> 插件调用 Tabby 的开标签能力
    -> SSHTabComponent 建连
    -> tabby-ssh 完成认证与会话管理
```

## 5. 设计方案

## 5.1 插件形态

建议新增一个独立插件目录：

```text
tabby-ssh-credential-hub/
```

插件提供以下扩展：

1. `ConfigProvider`
   - 提供插件自己的配置根节点。
2. `SettingsTabProvider`
   - 在设置页增加一个独立标签页，例如“SSH 凭据中心”。
3. `ProfileProvider`
   - 提供一种新的 Profile 类型，例如 `managed-ssh`。
   - 让插件管理的连接可以出现在 Profiles 列表和选择器中。
4. 可选的 `HotkeyProvider` 或工具按钮 Provider
   - 用于快速打开插件管理页面或快速发起连接。

## 5.2 数据模型

建议不要直接把密码明文放到普通配置区，而是拆成“元数据 + 机密数据”。

建议模型：

```ts
interface ManagedSSHProfile {
  id: string
  type: 'managed-ssh'
  name: string
  group?: string
  icon?: string | null
  color?: string | null
  sourceId: string
  options: {
    host: string
    port: number
    user: string
    authMode: 'password' | 'publicKey' | 'agent' | 'keyboardInteractive'
    passwordRef?: string | null
    privateKeys?: string[]
    jumpHostRef?: string | null
    proxyCommand?: string | null
    forwardedPorts?: ForwardedPortConfig[]
    tags?: string[]
    description?: string
  }
}
```

说明：

1. `ManagedSSHProfile` 是插件自己的业务对象，不等于 `SSHProfile`。
2. `passwordRef` 只保存密码引用，不保存明文。
3. 真正连接时再动态转换成 `SSHProfile`。

## 5.3 存储策略

建议采用“双存储”策略。

### 非敏感字段

放在插件自己的配置区，例如：

```yaml
sshCredentialHub:
  profiles:
    - id: xxx
      name: prod-server
      group: ops
      options:
        host: 10.0.0.8
        port: 22
        user: ubuntu
        authMode: password
        passwordRef: cred-001
```

### 敏感字段

优先放入 Tabby 已有的 Vault。

建议 secret key 设计：

```ts
type: 'managed-ssh:password'
key: {
  profileID: 'managed-ssh:...'
}
value: '<password>'
```

这样做的好处：

1. 复用现有 Vault 能力，不重复造加密体系。
2. 配置导出与密钥保护边界更清晰。
3. 跟 Tabby 现有安全模型保持一致。

### 回退策略

如果用户没有启用 Vault，可以考虑两种方式：

1. 第一优先：提示用户启用 Vault。
2. 第二优先：使用 `keytar` 类系统安全存储。

我更建议第一种，避免插件再维护一套额外密码存储分支。

## 5.4 SSH 桥接方式

这是整个方案最关键的部分。

当用户点击“连接”时，插件执行以下步骤：

1. 读取 `ManagedSSHProfile`。
2. 从 Vault 读取密码或密钥相关秘密。
3. 组装一个运行时 `SSHProfile`。
4. 调用 `AppService.openNewTab` 或通过 `ProfileProvider.getNewTabParameters` 返回：
   - `type: SSHTabComponent`
   - `inputs: { profile: runtimeSSHProfile }`
5. 让 `SSHTabComponent` 按既有流程连接。

运行时转换示意：

```ts
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
    auth: mappedAuthMode,
    password: loadedPassword ?? null,
    privateKeys: managed.options.privateKeys ?? [],
    jumpHost: mappedJumpHostIdOrNull,
    proxyCommand: managed.options.proxyCommand ?? null,
    forwardedPorts: managed.options.forwardedPorts ?? [],
    keepaliveInterval: 5000,
    keepaliveCountMax: 10,
    readyTimeout: null,
    x11: false,
    skipBanner: false,
    agentForward: false,
    warnOnClose: null,
    algorithms: defaultAlgorithms,
    socksProxyHost: null,
    socksProxyPort: null,
    httpProxyHost: null,
    httpProxyPort: null,
    reuseSession: true,
    input: { backspace: 'backspace' },
    scripts: [],
  },
}
```

这里有一个非常重要的实现策略：

密码尽量写入 `runtimeProfile.options.password`，让 `tabby-ssh` 直接走它现有的 `saved-password` 认证分支，而不是强依赖其 `PasswordStorageService`。

这就是为什么我推荐“桥接”而不是“接管存储服务”。

## 5.5 Jump Host 设计

如果插件也要支持跳板机，建议跳板机仍由插件自己的记录体系管理，而不是要求用户另外维护一个原生 SSH Profile。

处理方式：

1. 主连接记录中保存 `jumpHostRef`。
2. 建连时把 jump host 记录也转换成一个运行时 `SSHProfile`。
3. 第一阶段可先简化为：
   - 仅支持“主机直接连接”
   - Jump Host 作为二期能力

原因：

`tabby-ssh` 的 `jumpHost` 字段当前更偏向引用现有 SSH Profile ID。若完全做插件内闭环管理，Jump Host 的桥接会比普通直连复杂一些。

因此推荐分阶段推进。

## 5.6 UI 设计

建议插件 UI 包括以下部分：

1. 设置页标签：`SSH 凭据中心`
2. 连接列表页
   - 搜索
   - 分组
   - 标签
   - 最近使用
3. 编辑弹窗
   - 地址
   - 端口
   - 用户名
   - 认证方式
   - 密码或私钥配置
4. 操作按钮
   - 连接
   - 编辑
   - 复制地址
   - 测试连接
   - 删除

建议第一版只做：

1. 列表
2. 新增/编辑
3. 删除
4. 连接

不要在第一版就做太多资产管理能力，比如批量导入、权限控制、审计日志、标签筛选统计等。

## 5.7 Profile 集成方式

推荐让该插件注册自己的 `ProfileProvider`，类型为 `managed-ssh`。

这样会有几个好处：

1. 它能自然出现在 Tabby 的 Profile 选择器里。
2. 用户可以像使用普通连接一样启动它。
3. 该 Profile Provider 在 `getNewTabParameters()` 中可以直接返回 `SSHTabComponent` 对应参数。

核心思想：

`managed-ssh` 是“面向用户的业务 Profile 类型”，`ssh` 是“真正用于连接的底层运行时 Profile 类型”。

## 5.8 与 tabby-ssh 的边界划分

边界建议如下：

### 新插件负责

1. 服务器清单管理
2. 用户名密码维护
3. 插件级列表、搜索、分组、备注
4. 运行时 SSH 参数拼装
5. 发起连接

### tabby-ssh 继续负责

1. SSH 协议握手
2. 认证过程
3. Shell/SFTP 会话
4. Host Key 校验
5. 端口转发
6. Agent/私钥认证
7. 连接生命周期管理

这个边界清晰，后续维护最稳。

## 6. 关键技术点说明

## 6.1 技术点一：插件可独立扩展 Tabby

原因：

当前项目已经支持第三方或新增插件目录，以 `NgModule + Provider` 的方式扩展。只要插件包符合 `tabby-plugin` 规范，就能被发现和加载。

这意味着：

你要的功能完全可以独立建插件目录，而不是把需求硬塞进 `tabby-ssh`。

## 6.2 技术点二：新插件可以定义自己的 Profile 类型

`ProfileProvider` 是这个方案成立的关键。

新插件不需要伪装成 `ssh` Provider，本身就可以定义：

```text
id = managed-ssh
```

然后在打开标签页时，内部再桥接成 `SSHProfile`。

这个设计比直接往 `config.store.profiles` 塞 `ssh` 原生对象更干净。

## 6.3 技术点三：密码不必强依赖 tabby-ssh 内部密码存储

`tabby-ssh` 在认证时会优先使用 `profile.options.password` 进入保存密码分支。

这意味着：

只要桥接时把密码放进运行时 `SSHProfile.options.password`，就已经可以复用其认证逻辑。

这点非常关键，它让方案从“改 SSH 插件”变成“调用 SSH 插件”。

## 6.4 技术点四：Vault 可以直接作为插件安全存储底座

当前项目已经有 `VaultService`，而且 `tabby-ssh` 自己的密码存储也会优先使用 Vault。

所以新插件最合理的做法不是自造加密，而是：

1. 普通字段进插件配置
2. 密码进 Vault

这样可以保持用户体验一致。

## 6.5 技术点五：运行时桥接对象可以不落盘

推荐把桥接生成的 `SSHProfile` 作为内存中的运行时对象使用，而不是存回 `config.store.profiles`。

优点：

1. 不污染用户原始配置。
2. 不需要同步维护两套 Profile 数据。
3. 可以避免“插件记录改了，但真实 SSH Profile 没同步”的双写问题。

## 7. 推荐实施规划

## 第一阶段：最小可用版本

目标：验证方案跑通。

范围：

1. 新建独立插件骨架
2. 增加设置页 Tab
3. 增加 `managed-ssh` ProfileProvider
4. 支持以下字段：
   - 名称
   - 分组
   - Host
   - Port
   - User
   - 认证方式
   - Password
5. 密码进 Vault
6. 点击连接后成功打开 `SSHTabComponent`

这一阶段不要做：

1. Jump Host
2. SOCKS/HTTP Proxy
3. Port Forwarding 编辑器
4. 私钥自动导入
5. 批量导入导出

## 第二阶段：增强连接能力

范围：

1. 私钥认证
2. Agent 认证
3. Jump Host
4. 端口转发
5. Proxy command
6. 连接测试

## 第三阶段：资产管理能力

范围：

1. 标签
2. 收藏
3. 最近连接
4. 批量导入
5. 搜索过滤
6. 更丰富的展示视图

## 8. 目录与模块规划

建议目录：

```text
tabby-ssh-credential-hub/
├─ src/
│  ├─ api/
│  ├─ components/
│  │  ├─ managedSSHSettingsTab.component.ts
│  │  ├─ managedSSHList.component.ts
│  │  ├─ managedSSHEditor.component.ts
│  │  └─ managedSSHProfileSettings.component.ts
│  ├─ services/
│  │  ├─ managedSSHStore.service.ts
│  │  ├─ managedSSHSecret.service.ts
│  │  ├─ managedSSHMapper.service.ts
│  │  └─ managedSSHLauncher.service.ts
│  ├─ config.ts
│  ├─ profiles.ts
│  ├─ settings.ts
│  ├─ types.ts
│  └─ index.ts
├─ package.json
├─ tsconfig.json
└─ webpack.config.mjs
```

模块职责：

1. `managedSSHStore.service.ts`
   - 管理非敏感连接元数据。
2. `managedSSHSecret.service.ts`
   - 封装 Vault 读写。
3. `managedSSHMapper.service.ts`
   - `ManagedSSHProfile -> SSHProfile` 转换。
4. `managedSSHLauncher.service.ts`
   - 发起连接。
5. `profiles.ts`
   - 插件自己的 `ProfileProvider`。
6. `settings.ts`
   - 插件自己的 `SettingsTabProvider`。

## 8.1 这个文档的定位

这份文档不只是当前仓库内的方案说明，还应被视为后续单独创建新插件仓库时的实施蓝图。

因此，下面的章节会补全以下内容：

1. 独立插件工程最小目录结构
2. 必须依赖的 Tabby 包与第三方包
3. 最小可运行的 `package.json`、`tsconfig.json`、`webpack.config.mjs` 模板
4. Tabby 识别插件的规则
5. 开发态如何把外部插件挂载到 Tabby 中调试
6. 插件内应该使用的核心 API、类型与 Provider 清单
7. 推荐的联调与验收方式

## 8.2 独立新工程的边界假设

后续如果单独创建一个新仓库，建议采用以下边界：

1. 新仓库只包含 `tabby-ssh-credential-hub` 这个插件本身。
2. Tabby 主仓库不作为开发目标的一部分，只作为运行和联调宿主。
3. 新插件通过 npm 包形式或本地目录形式被 Tabby 加载。
4. 新工程不复制 `tabby-ssh` 的实现，只把 `tabby-ssh` 作为 peer dependency 和运行时依赖目标。

换句话说，新仓库应是“独立插件仓库”，不是“Tabby fork”。

## 8.3 推荐的项目结构规划

如果后续你要单独创建一个新工程，我建议从一开始就把仓库结构设计清楚，避免后期把“插件代码、构建配置、文档、示例、联调脚本”混在一起。

推荐采用下面这套仓库结构：

```text
tabby-ssh-credential-hub/
├─ src/
│  ├─ api/
│  ├─ components/
│  ├─ services/
│  ├─ store/
│  ├─ mappers/
│  ├─ models/
│  ├─ utils/
│  ├─ config.ts
│  ├─ profiles.ts
│  ├─ settings.ts
│  └─ index.ts
├─ docs/
│  ├─ architecture.md
│  ├─ data-model.md
│  └─ development.md
├─ scripts/
│  ├─ link-dev.sh
│  └─ package-plugin.sh
├─ examples/
│  └─ sample-config.yaml
├─ package.json
├─ tsconfig.json
├─ webpack.config.mjs
├─ README.md
└─ LICENSE
```

这样分层的原因：

1. `src/` 只放插件源代码。
2. `docs/` 放设计和开发说明，避免 README 过载。
3. `scripts/` 放联调和打包脚本，降低人工操作成本。
4. `examples/` 放演示配置和示例数据，方便后续测试和文档说明。

## 8.4 源码目录的分层规划

我建议新工程内部不要只靠 `components/` 和 `services/` 两层来组织代码，而是明确做以下分层。

### `src/models/`

职责：

1. 定义领域模型。
2. 定义持久化结构。
3. 定义桥接时用到的辅助类型。

建议文件：

1. `managedSSHProfile.model.ts`
2. `managedSSHRecord.model.ts`
3. `managedSSHPreferences.model.ts`
4. `managedSSHSecrets.model.ts`

### `src/store/`

职责：

1. 管理配置持久化。
2. 管理列表增删改查。
3. 处理版本迁移。

建议文件：

1. `managedSSHStore.service.ts`
2. `managedSSHMigration.service.ts`

### `src/services/`

职责：

1. 承载业务服务。
2. 负责编排连接流程。
3. 封装 Vault、通知、启动器等外部依赖。

建议文件：

1. `managedSSHSecret.service.ts`
2. `managedSSHLauncher.service.ts`
3. `managedSSHQuery.service.ts`
4. `managedSSHValidation.service.ts`

### `src/mappers/`

职责：

1. 对象转换。
2. 持久化对象到领域对象转换。
3. 领域对象到 `SSHProfile` 的桥接转换。

建议文件：

1. `managedSSHToRuntimeSSH.mapper.ts`
2. `managedSSHRecord.mapper.ts`

### `src/components/`

职责：

1. 设置页容器组件。
2. 列表展示组件。
3. 编辑表单组件。
4. 弹窗组件。

建议文件：

1. `managedSSHSettingsTab.component.ts`
2. `managedSSHList.component.ts`
3. `managedSSHEditor.component.ts`
4. `managedSSHDeleteModal.component.ts`
5. `managedSSHTestConnectionModal.component.ts`

### `src/api/`

职责：

1. 如果后续需要对外暴露本插件自己的扩展点，在这里集中导出。
2. 保持 `index.ts` 简洁。

### `src/utils/`

职责：

1. 放纯函数工具。
2. 放格式化、排序、校验等与业务弱耦合的工具函数。

## 8.5 推荐的模块边界规划

建议从代码职责上，把整个插件拆成 5 个逻辑模块：

1. `bootstrap module`
   - 入口、Provider 注册、NgModule 声明。
2. `configuration module`
   - 默认配置、配置版本、迁移逻辑。
3. `profile module`
   - `managed-ssh` 的 ProfileProvider 和描述信息。
4. `credential management module`
   - 资产列表、编辑、删除、密码存储。
5. `ssh bridge module`
   - 桥接到 `tabby-ssh` 的运行时连接逻辑。

这种划分有一个很重要的好处：

后续即使 UI 做大了，或者需要支持导入导出、标签、审计等功能，也不会影响 SSH 桥接的核心稳定性。

## 8.6 第一阶段建议的最小项目结构

如果你希望第一版尽快落地，我建议先按下面这个最小结构建仓库，不要一上来就铺得太大：

```text
tabby-ssh-credential-hub/
├─ src/
│  ├─ components/
│  │  ├─ managedSSHSettingsTab.component.ts
│  │  ├─ managedSSHSettingsTab.component.pug
│  │  └─ managedSSHSettingsTab.component.scss
│  ├─ services/
│  │  ├─ managedSSHStore.service.ts
│  │  ├─ managedSSHSecret.service.ts
│  │  ├─ managedSSHMapper.service.ts
│  │  └─ managedSSHLauncher.service.ts
│  ├─ types.ts
│  ├─ config.ts
│  ├─ profiles.ts
│  ├─ settings.ts
│  └─ index.ts
├─ package.json
├─ tsconfig.json
├─ webpack.config.mjs
└─ README.md
```

这是第一阶段最适合的结构，因为：

1. 足够小，容易快速搭起来。
2. 足够清晰，不会把职责混在一个文件里。
3. 后续扩展时可以平滑演进到完整结构。

## 8.7 第二阶段扩展后的项目结构

当你进入第二阶段，开始支持私钥、Jump Host、连接测试、端口转发时，建议把结构扩展为：

```text
src/
├─ components/
├─ services/
├─ store/
├─ mappers/
├─ models/
├─ utils/
├─ config/
│  ├─ defaults.ts
│  ├─ migration.ts
│  └─ schema.ts
├─ bridge/
│  ├─ sshProfileFactory.ts
│  ├─ sshDependencyGuard.ts
│  └─ jumpHostResolver.ts
├─ profiles/
│  ├─ managedSSHProfiles.service.ts
│  └─ managedSSHProfileSettings.component.ts
└─ settings/
   ├─ managedSSHSettingsTabProvider.ts
   └─ managedSSHSettingsTab.component.ts
```

这里的关键变化：

1. `bridge/` 被单独拆出来，专门承载与 `tabby-ssh` 的集成逻辑。
2. `config/` 独立出来，方便做 schema 和 migration。
3. `profiles/` 和 `settings/` 各自成为独立区域，更利于维护。

## 8.8 第三阶段面向长期维护的项目结构

如果后续插件演进成长期维护项目，我建议最终结构向“功能域”继续靠拢，而不是无限细分技术层。

长期建议结构：

```text
src/
├─ core/
│  ├─ module.ts
│  ├─ providers.ts
│  └─ tokens.ts
├─ features/
│  ├─ managed-profiles/
│  ├─ credentials/
│  ├─ ssh-bridge/
│  ├─ settings-tab/
│  └─ import-export/
├─ shared/
│  ├─ components/
│  ├─ models/
│  ├─ utils/
│  └─ constants/
└─ index.ts
```

这种结构适合插件功能不断增长后的维护场景，但不适合一开始就照搬。

所以我建议路线是：

1. 第一阶段用最小结构。
2. 第二阶段增加独立的 `bridge/`、`config/`、`store/`。
3. 第三阶段如果功能变大，再升级到按功能域组织。

## 8.9 推荐的文件职责边界

为了避免后续工程出现“巨型 service”或“巨型组件”，建议提前约定文件职责边界。

### `config.ts`

只负责：

1. `ConfigProvider` 默认值
2. 配置命名空间
3. 配置初始 schema

不要负责：

1. 配置读写业务逻辑
2. 数据迁移细节

### `profiles.ts`

只负责：

1. `ProfileProvider` 的注册与描述
2. `getNewTabParameters`
3. `getDescription`

不要负责：

1. 列表增删改查
2. Vault 访问
3. 大量 UI 逻辑

### `settings.ts`

只负责：

1. `SettingsTabProvider` 注册
2. 设置页标题、图标、权重

### `managedSSHStore.service.ts`

只负责：

1. 配置中的 profile 列表读写
2. 新增、更新、删除
3. 排序与基础查询

### `managedSSHSecret.service.ts`

只负责：

1. 密码读写
2. 私钥口令读写
3. Vault key 生成

### `managedSSHMapper.service.ts`

只负责：

1. `ManagedSSHProfile -> SSHProfile`
2. 默认值补齐
3. 字段兼容转换

### `managedSSHLauncher.service.ts`

只负责：

1. 组装桥接参数
2. 调用 `AppService` 或相关入口打开 SSH 标签页
3. 做 `tabby-ssh` 可用性检查

## 8.10 推荐的命名约定

为了让新工程长期保持一致，建议命名统一如下：

1. Profile 类型统一用 `managed-ssh`
2. 配置根节点统一用 `sshCredentialHub`
3. 组件前缀统一用 `ManagedSSH`
4. 服务前缀统一用 `ManagedSSH`
5. bridge 相关文件统一以 `ssh` 或 `runtimeSSH` 结尾

例如：

1. `ManagedSSHProfilesService`
2. `ManagedSSHLauncherService`
3. `managedSSHSettingsTab.component.ts`
4. `managedSSHToRuntimeSSH.mapper.ts`

## 8.11 README 应包含的项目结构说明

后续新仓库的 `README.md`，建议至少包含以下结构说明：

1. 项目目标
2. 与 Tabby / tabby-ssh 的关系
3. 仓库目录说明
4. 本地开发方式
5. 如何通过 `TABBY_PLUGINS` 联调
6. 支持的 Tabby 版本
7. 当前功能范围和限制

这样即使后续换人维护，也能快速理解仓库结构。

## 8.12 项目结构规划的最终建议

如果你后续马上要开一个新仓库，我建议直接采用这个节奏：

1. 按 `8.6` 建立第一阶段最小项目结构。
2. 在代码量开始增长时，按 `8.7` 拆出 `bridge/`、`config/`、`store/`。
3. 如果后续功能扩张明显，再按 `8.8` 升级为按功能域管理。

也就是说，项目结构规划不要一开始就过度设计，但要从第一天起给后续扩展预留清晰边界。

## 9. 具体实现细节建议

## 9.1 独立工程的最小文件模板

下面给出一个适合单独新建仓库的最小模板。这个模板不是最终代码，但已经足够作为新工程初始化骨架。

### `package.json` 模板

```json
{
  "name": "tabby-ssh-credential-hub",
  "version": "0.1.0",
  "description": "Managed SSH credential hub plugin for Tabby",
  "keywords": [
    "tabby-plugin"
  ],
  "main": "dist/index.js",
  "typings": "typings/index.d.ts",
  "files": [
    "dist",
    "typings"
  ],
  "scripts": {
    "build": "webpack --progress --color",
    "watch": "webpack --progress --color --watch"
  },
  "peerDependencies": {
    "@angular/animations": "^15",
    "@angular/common": "^15",
    "@angular/core": "^15",
    "@angular/forms": "^15",
    "@angular/platform-browser": "^15",
    "@ng-bootstrap/ng-bootstrap": "^14",
    "rxjs": "^7",
    "tabby-core": "*",
    "tabby-settings": "*",
    "tabby-terminal": "*",
    "tabby-ssh": "*"
  },
  "devDependencies": {
    "@types/node": "^20"
  }
}
```

说明：

1. `keywords` 必须包含 `tabby-plugin`，否则 Tabby 不会识别为插件。
2. `main` 应指向 `dist/index.js`。
3. `typings` 建议保留，和 Tabby 内建插件保持一致。
4. `tabby-ssh` 必须作为 peer dependency 明确列出。

### `tsconfig.json` 模板

如果新仓库不继承 Tabby 根仓库的 `tsconfig.json`，建议直接写完整配置：

```json
{
  "compilerOptions": {
    "module": "es2015",
    "target": "es2016",
    "moduleResolution": "node",
    "noImplicitAny": false,
    "removeComments": false,
    "emitDeclarationOnly": false,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "sourceMap": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "importHelpers": true,
    "strictNullChecks": true,
    "lib": ["DOM", "ES2015", "ES2017", "ES2019", "ES2021"],
    "baseUrl": "src"
  },
  "exclude": ["node_modules", "dist", "typings"],
  "angularCompilerOptions": {
    "strictTemplates": true,
    "enableResourceInlining": true,
    "strictInjectionParameters": true
  }
}
```

### `webpack.config.mjs` 模板

新仓库如果不能直接复用 Tabby 根仓库的 `webpack.plugin.config.mjs`，建议把必要配置内联到自己的仓库里。核心要求有三点：

1. `target` 使用 `node`
2. `entry` 指向 `src/index.ts`
3. `output.libraryTarget` 使用 `umd`

可以从当前仓库的 `webpack.plugin.config.mjs` 裁剪出一个独立版本，或者在新仓库中直接拷贝一份并精简。

最小示意：

```js
import path from 'path'
import { fileURLToPath } from 'url'
import { AngularWebpackPlugin } from '@ngtools/webpack'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default {
  target: 'node',
  mode: 'production',
  entry: './src/index.ts',
  context: __dirname,
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    libraryTarget: 'umd',
    publicPath: 'auto'
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: ['@ngtools/webpack']
      },
      {
        test: /\.pug$/,
        use: ['apply-loader', 'pug-loader']
      },
      {
        test: /\.scss$/,
        use: ['@tabby-gang/to-string-loader', 'css-loader', 'sass-loader']
      }
    ]
  },
  externals: [
    /^@angular/,
    /^rxjs/,
    /^tabby-/,
    'keytar',
    'electron',
    '@electron/remote',
    'fs',
    'path'
  ],
  plugins: [
    new AngularWebpackPlugin({
      tsconfig: path.resolve(__dirname, 'tsconfig.json'),
      directTemplateLoading: false,
      jitMode: true
    })
  ]
}
```

说明：

1. 真正落地时，更推荐直接对齐 Tabby 主仓库的 `webpack.plugin.config.mjs`，兼容性更高。
2. 如果插件使用 `pug`、`scss`、翻译文件、svg 资源，应继续沿用 Tabby 的 loader 组合。
3. 如果新仓库自行维护 webpack 配置，升级成本会比直接复用主仓库模板高一些。

### `src/index.ts` 最小模板

```ts
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

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    NgbModule,
    TabbyCoreModule,
    TabbyTerminalModule
  ],
  providers: [
    { provide: ConfigProvider, useClass: ManagedSSHConfigProvider, multi: true },
    { provide: SettingsTabProvider, useClass: ManagedSSHSettingsTabProvider, multi: true },
    { provide: ProfileProvider, useExisting: ManagedSSHProfilesService, multi: true }
  ]
})
export default class ManagedSSHModule {}
```

## 9.2 Tabby 识别和加载插件的规则

这是后续新仓库最容易遗漏的部分。

Tabby 加载插件时，核心规则如下：

1. 插件目录中必须有 `package.json`。
2. `package.json.keywords` 必须包含：
   - `tabby-plugin`
   - 或 `tabby-builtin-plugin`
3. `main` 需要指向可被 Node `require` 的入口文件。
4. 插件默认导出必须是 Angular `NgModule`。
5. 包名建议使用 `tabby-` 前缀，例如：
   - `tabby-ssh-credential-hub`

当前项目中的实际识别逻辑说明：

1. `app/src/plugins.ts` 会扫描插件目录。
2. 只有命名符合 `tabby-*` 或 `terminus-*` 的包才会进入候选集合。
3. 只有带 `tabby-plugin` / `tabby-builtin-plugin` 关键字的包才会被接受。
4. 加载时会读取该包默认导出的 `NgModule`。

因此，新工程必须同时满足“命名规则 + keyword 规则 + 默认导出规则”。

## 9.3 开发态联调方式

后续单独建仓库时，推荐用“外部插件目录 + 本地 Tabby 宿主”的方式联调。

### 方式一：通过 `TABBY_PLUGINS`

这是最直接的方式。

假设插件仓库路径为：

```text
/path/to/tabby-ssh-credential-hub
```

那么启动 Tabby 时，把该目录注入环境变量：

```bash
TABBY_PLUGINS=/path/to/tabby-ssh-credential-hub tabby --debug
```

如果在开发机上联调的是源码仓库版 Tabby，也可以让它指向插件目录。

### 方式二：复制到用户插件目录

Tabby 也会从用户插件目录加载插件。

这适合做手工验证或模拟真实安装，但不如 `TABBY_PLUGINS` 适合高频开发。

### 开发推荐流程

建议采用下面的工作流：

1. 在独立插件仓库执行 `npm` 或 `yarn` 安装依赖。
2. 执行 `npm run watch` 持续产出 `dist/index.js`。
3. 在本地启动 Tabby，并通过 `TABBY_PLUGINS` 指向插件根目录。
4. 修改插件代码后，重新打开 Tabby 或重载开发环境验证效果。

## 9.4 必须依赖和建议依赖清单

下面是按角色划分的依赖建议。

### 必须 peer dependencies

1. `@angular/core`
2. `@angular/common`
3. `@angular/forms`
4. `@angular/platform-browser`
5. `@angular/animations`
6. `@ng-bootstrap/ng-bootstrap`
7. `rxjs`
8. `tabby-core`
9. `tabby-settings`
10. `tabby-terminal`
11. `tabby-ssh`

### 常见 dev dependencies

1. `typescript`
2. `webpack`
3. `webpack-cli`
4. `@ngtools/webpack`
5. `ts-loader` 或仅使用 `@ngtools/webpack`
6. `pug-loader`
7. `apply-loader`
8. `sass-loader`
9. `css-loader`
10. `@tabby-gang/to-string-loader`
11. `source-map-loader`

### 视情况引入的依赖

1. `ngx-toastr`
2. `ngx-filesize`
3. `clone-deep`
4. `slugify`
5. `uuid`

如果只是第一阶段最小可用版本，这些“视情况依赖”可以尽量少引。

## 9.5 新工程里必须了解的 Tabby API 清单

以下是后续新工程基本一定会用到的 API 和职责说明。

### 来自 `tabby-core`

1. `ConfigProvider`
   - 注册插件自己的默认配置。
2. `ConfigService`
   - 读写插件配置区。
3. `ProfileProvider`
   - 声明插件自己的 Profile 类型。
4. `ProfilesService`
   - 获取、打开、管理 Profiles。
5. `AppService`
   - 直接打开新 Tab。
6. `VaultService`
   - 存储密码等敏感信息。
7. `PromptModalComponent`
   - 简单密码输入或确认对话框。
8. `NotificationsService`
   - 展示成功、错误、提示消息。
9. `TranslateService`
   - 文案国际化。
10. `ProfileSettingsComponent`
   - 如果你希望在 Profiles 页面里也能编辑该类型连接时需要实现。

### 来自 `tabby-settings`

1. `SettingsTabProvider`
   - 注册设置页标签。

### 来自 `tabby-ssh`

1. `SSHProfile`
   - 运行时桥接目标对象。
2. `SSHTabComponent`
   - 真正负责 SSH 会话的 Tab 组件。
3. `ForwardedPortConfig`
   - 端口转发配置类型。
4. `SSHAlgorithmType`
   - 算法配置枚举。

### Provider 注册模式

新工程最重要的一个约束是：扩展点不是通过函数调用注册，而是通过 Angular DI 的 multi provider 注册。

例如：

```ts
providers: [
  { provide: ConfigProvider, useClass: ManagedSSHConfigProvider, multi: true },
  { provide: SettingsTabProvider, useClass: ManagedSSHSettingsTabProvider, multi: true },
  { provide: ProfileProvider, useExisting: ManagedSSHProfilesService, multi: true }
]
```

## 9.6 推荐的新工程源码骨架

建议首批文件如下：

1. `src/index.ts`
2. `src/config.ts`
3. `src/settings.ts`
4. `src/profiles.ts`
5. `src/types.ts`
6. `src/services/managedSSHStore.service.ts`
7. `src/services/managedSSHSecret.service.ts`
8. `src/services/managedSSHMapper.service.ts`
9. `src/services/managedSSHLauncher.service.ts`
10. `src/components/managedSSHSettingsTab.component.ts`
11. `src/components/managedSSHSettingsTab.component.pug`
12. `src/components/managedSSHSettingsTab.component.scss`

如果只做最小闭环，其实只要 1 到 10 就可以开始开发。

## 9.7 运行时桥接的精确建议

为避免后续新工程误入深耦合路线，这里把桥接原则写死：

1. 不直接覆写 `tabby-ssh` 的 `PasswordStorageService`。
2. 不修改 `tabby-ssh` 内部认证流程。
3. 不把插件自己的 managed 数据自动同步回原生 `ssh` profile。
4. 只在点击连接时动态构造 `SSHProfile`。
5. 运行时密码优先注入 `runtimeProfile.options.password`。

这五条建议是新工程能否长期可维护的关键。

## 9.8 Vault 的使用建议

后续新工程里，建议把 Vault 访问统一封装成一个 service，不让业务组件直接操作 `VaultService`。

推荐封装接口：

```ts
class ManagedSSHSecretService {
  async setPassword(profileId: string, password: string): Promise<void>
  async getPassword(profileId: string): Promise<string | null>
  async deletePassword(profileId: string): Promise<void>
  async setPrivateKeyPassphrase(keyId: string, passphrase: string): Promise<void>
  async getPrivateKeyPassphrase(keyId: string): Promise<string | null>
}
```

对应 Vault secret 建议：

```ts
type = 'managed-ssh:password'
key = { profileId: string }

type = 'managed-ssh:key-passphrase'
key = { keyId: string }
```

## 9.9 建议的数据分层

建议新工程内部明确区分三套对象：

1. 持久化对象 `ManagedSSHProfileRecord`
   - 存在配置里。
2. 领域对象 `ManagedSSHProfile`
   - 供业务逻辑使用。
3. 运行时桥接对象 `SSHProfile`
   - 只在连接时生成。

这样做的好处：

1. 配置结构变更更容易做 migration。
2. 连接桥接逻辑集中。
3. UI 层不会直接依赖底层 `SSHProfile` 细节。

## 9.10 推荐的配置结构

建议将插件配置定义为：

```yaml
sshCredentialHub:
  version: 1
  profiles: []
  preferences:
    preferVault: true
    showManagedProfilesOnly: true
    defaultGroup: ""
```

说明：

1. `version` 用于后续 migration。
2. `profiles` 仅保存非敏感元数据。
3. `preferences` 保存 UI 或行为偏好。

## 9.11 推荐的 ProfileProvider 设计

新工程里的 `ManagedSSHProfilesService` 建议这样设计：

1. `id = 'managed-ssh'`
2. `name = 'Managed SSH'`
3. `settingsComponent = ManagedSSHProfileSettingsComponent` 可选
4. `getBuiltinProfiles()` 返回空数组
5. `getNewTabParameters(profile)` 内部完成 `managed -> ssh` 映射
6. `getDescription(profile)` 返回 `user@host:port`
7. 如需支持快速连接，可再决定是否继承 `QuickConnectProfileProvider`

我更建议第一版先继承普通 `ProfileProvider`，先把“受管连接资产”跑通，再考虑 Quick Connect。

## 9.12 推荐的设置页设计

建议设置页不是单纯做一个表单，而是做成“列表 + 详情编辑”的二栏或主从结构。

第一版最小交互：

1. 左侧列表：全部连接
2. 右侧表单：当前连接详情
3. 顶部操作：新增、复制、删除、连接

这样后续扩展批量操作、搜索、分组会更自然。

## 9.13 国际化与文案建议

如果后续新工程希望长期维护，建议从第一版就避免把文案硬编码在组件中。

建议：

1. UI 字段名走 `TranslateService`
2. 默认英文文案清晰、短句化
3. 错误提示统一由 `NotificationsService` 输出

虽然第一版可以先不做完整多语言，但至少要把硬编码集中管理。

## 9.14 与 Tabby 主仓库版本的兼容策略

由于新工程未来会独立存在，必须考虑 Tabby 上游版本兼容。

建议策略：

1. 先锁定一个明确的 Tabby 主版本作为首发兼容版本。
2. `package.json` 中对 Angular 和 Tabby peer dependency 保持与目标宿主版本一致。
3. 每次升级 Tabby 时，重点回归以下三点：
   - `SSHTabComponent` 是否仍接受同样的 `inputs.profile`
   - `SSHProfile` 字段是否有新增或重命名
   - `SettingsTabProvider` / `ProfileProvider` 注册方式是否变化

推荐在文档或 README 中明确写明“本插件支持的 Tabby 版本范围”。

## 9.15 联调与验收清单

后续新工程完成后，至少要验证以下用例：

1. Tabby 能识别并加载插件。
2. 设置页出现独立标签页。
3. 新增一个受管 SSH 连接记录后可以保存。
4. 密码不会出现在普通配置 YAML 中。
5. 点击连接后能打开 SSH 标签页。
6. 正确账号密码时可登录。
7. 错误密码时能看到合理提示，且不会污染配置。
8. 删除记录时能同步清理 Vault 中的密码 secret。
9. 在禁用 `tabby-ssh` 的情况下，插件能给出可理解提示。
10. Tabby 重启后，受管连接列表仍可恢复。

如果要把文档当作新工程的直接输入，这个验收清单非常重要。

## 9.16 第一阶段建议的交付定义

后续单独建仓库时，我建议把“第一阶段完成”的标准写得非常具体：

1. 新工程可以独立 `build`
2. 产物可以被 Tabby 外部加载
3. 设置页可维护 SSH 连接记录
4. 密码使用 Vault 存储
5. `managed-ssh` profile 可以发起 SSH 连接
6. 全流程不需要改 `tabby-ssh` 源码

达到这六条，就算最小闭环成立。

## 9.17 配置默认值

插件通过 `ConfigProvider` 注册：

```ts
defaults = {
  sshCredentialHub: {
    profiles: [],
    preferVault: true,
    showBuiltinSSHProfiles: false,
  },
}
```

## 9.18 密码服务封装

建议不要在 UI 组件里直接调 Vault，而是统一走：

```ts
class ManagedSSHSecretService {
  async setPassword(profileId: string, password: string): Promise<void>
  async getPassword(profileId: string): Promise<string | null>
  async clearPassword(profileId: string): Promise<void>
}
```

这样以后即使存储策略改变，也只改这一层。

## 9.19 启动连接的服务封装

建议由一个单独服务负责发起 SSH 连接：

```ts
class ManagedSSHLauncherService {
  async connect(managedProfile: ManagedSSHProfile): Promise<void>
}
```

内部逻辑：

1. 读取密码
2. 组装运行时 `SSHProfile`
3. 打开 `SSHTabComponent`

## 9.20 插件与 tabby-ssh 的依赖关系

建议在插件 `package.json` 中显式声明对以下包的依赖或 peer dependency：

1. `tabby-core`
2. `tabby-settings`
3. `tabby-terminal`
4. `tabby-ssh`

其中 `tabby-ssh` 是核心桥接依赖。

同时在运行时应增加检测：

如果 `tabby-ssh` 不可用或被禁用，插件要给出明确提示，而不是直接报错。

## 9.21 与原生 SSH Profiles 的关系

建议第一版不要自动同步原生 SSH Profile。

原因：

1. 双向同步会显著增加复杂度。
2. 用户容易搞不清“该改哪一边”。
3. 你的核心诉求是“由插件管理”，不是“和原生 SSH 页面共管”。

建议策略：

1. 新插件管理的是独立资产。
2. 原生 `ssh` Profiles 保持不动。
3. 两者并存，但职责不同。

## 10. 风险与注意事项

## 10.1 主要风险

1. `tabby-ssh` 的部分类型和内部行为虽然可复用，但仍带有一定内部实现耦合。
2. Jump Host 如果也要求完全使用插件自己的记录，会比直连复杂。
3. 如果后续要求“编辑一次，原生 SSH 配置也同步更新”，复杂度会明显上升。

## 10.2 兼容性风险

如果未来 `tabby-ssh` 修改了：

1. `SSHProfile` 结构
2. `SSHTabComponent` 输入参数
3. 认证时对 `options.password` 的处理顺序

则桥接层需要跟着调整。

不过相对直接篡改 `PasswordStorageService`，这种风险仍然更小。

## 10.3 安全注意事项

1. 不要把密码明文持久化到普通配置字段。
2. 不要在日志打印密码或完整连接串。
3. 编辑 UI 中密码字段要单向展示，不回填明文。
4. 删除连接记录时，应同步清理 Vault 中对应 secret。

## 11. 最终建议

我建议采用以下最终方案：

1. 新建独立插件 `tabby-ssh-credential-hub`
2. 插件使用自己的 `managed-ssh` Profile 类型管理服务器资产
3. 非敏感信息放插件配置区
4. 密码放 Tabby Vault
5. 连接时动态映射为运行时 `SSHProfile`
6. 通过 `SSHTabComponent` 复用现有 `tabby-ssh` 完成连接
7. 第一阶段先只做密码直连闭环，Jump Host 和高级特性放第二阶段

这个方案的平衡点最好：

1. 独立性足够强
2. 对现有代码侵入最小
3. 能最大化复用 `tabby-ssh`
4. 后续演进空间也足够大

## 12. 确认后建议的下一步

如果你确认这个方案，我下一步建议按下面顺序开始落地：

1. 创建插件骨架和 `package.json`
2. 注册 `ConfigProvider`、`SettingsTabProvider`、`ProfileProvider`
3. 落地数据模型和 Vault 密码服务
4. 打通“新增记录 -> 点击连接 -> 打开 SSH Tab”最小闭环
5. 再补列表页和编辑体验
