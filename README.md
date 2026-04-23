# tabby-ssh-credential-hub

SSH 凭据中心插件 for [Tabby](https://tabby.sh)。

## 功能特性

- 集中管理 SSH 连接凭据
- 密码存储在 Tabby Vault 中，更安全
- 支持多种认证方式：密码、公钥、Agent、键盘交互
- 通过托管 Profile 一键发起 SSH 连接
- 与 tabby-ssh 无缝集成，复用现有 SSH 功能

## 系统要求

- Tabby v1.0+
- Node.js 16+ (开发环境)
- Angular 15+

## 安装

### 从源码构建

```bash
# 克隆仓库
git clone https://github.com/YOUR_USERNAME/tabby-ssh-credential-hub.git
cd tabby-ssh-credential-hub

# 安装依赖
npm install

# 构建插件
npm run build
```

### 加载插件

将构建产物目录链接到 Tabby 插件目录：

**Linux:**
```bash
ln -s /path/to/tabby-ssh-credential-hub/dist ~/.config/tabby/plugins/tabby-ssh-credential-hub
```

**macOS:**
```bash
ln -s /path/to/tabby-ssh-credential-hub/dist ~/Library/Application\ Support/tabby/plugins/tabby-ssh-credential-hub
```

**Windows:**
```cmd
mklink /D "%APPDATA%\tabby\plugins\tabby-ssh-credential-hub" "C:\path\to\tabby-ssh-credential-hub\dist"
```

### 开发模式联调

使用 `TABBY_PLUGINS` 环境变量指向插件目录：

```bash
TABBY_PLUGINS=/path/to/tabby-ssh-credential-hub tabby --debug
```

## 使用方法

1. 打开 Tabby
2. 进入 **设置 (Settings)** > **SSH 凭据中心**
3. 点击 **新增** 添加服务器连接
4. 填写服务器信息（Host、端口、用户名、认证方式）
5. 输入密码（将安全存储在 Vault 中）
6. 点击 **连接** 发起 SSH 会话

## 架构说明

```
┌─────────────────────────────────────────────────────┐
│                    Tabby Application                 │
│  ┌───────────────────────────────────────────────┐  │
│  │           tabby-ssh-credential-hub            │  │
│  │                                               │  │
│  │  ┌─────────────────┐  ┌───────────────────┐   │  │
│  │  │ Settings Tab UI │  │ Profile Provider │   │  │
│  │  └────────┬────────┘  └────────┬────────┘   │  │
│  │           │                      │             │  │
│  │  ┌────────▼─────────────────────▼────────┐   │  │
│  │  │         ManagedSSHStoreService        │   │  │
│  │  │  (配置读写、元数据管理)                │   │  │
│  │  └────────┬─────────────────────┬────────┘   │  │
│  │           │                     │             │  │
│  │  ┌────────▼────────┐  ┌────────▼────────┐   │  │
│  │  │ ManagedSSHSecret│  │ManagedSSHMapper │   │  │
│  │  │   Service       │  │   Service       │   │  │
│  │  │ (Vault 密码读写) │  │ (Profile 转换)  │   │  │
│  │  └─────────────────┘  └────────┬────────┘   │  │
│  │                                 │             │  │
│  │                    ┌────────────▼────────┐   │  │
│  │                    │ManagedSSHLauncher  │   │  │
│  │                    │   Service          │   │  │
│  │                    └────────┬───────────┘   │  │
│  └─────────────────────────────┼───────────────┘  │
│                                │                   │
│                                ▼                   │
│                    ┌───────────────────────┐       │
│                    │     tabby-ssh         │       │
│                    │  (实际 SSH 连接)       │       │
│                    └───────────────────────┘       │
└─────────────────────────────────────────────────────┘
```

### 核心服务

| 服务 | 职责 |
|------|------|
| `ManagedSSHStoreService` | 管理连接配置的增删改查 |
| `ManagedSSHSecretService` | 封装 Vault 密码读写 |
| `ManagedSSHMapperService` | 将托管 Profile 转换为运行时 SSHProfile |
| `ManagedSSHLauncherService` | 发起 SSH 连接 |

### 数据存储

- **非敏感字段**：存储在 Tabby 配置文件的 `sshCredentialHub.profiles` 下
- **密码**：存储在 Tabby Vault 中，通过 `managed-ssh:password:{profileId}` 索引

## 开发指南

### 项目结构

```
tabby-ssh-credential-hub/
├── src/
│   ├── index.ts                 # NgModule 入口
│   ├── config.ts                # ConfigProvider
│   ├── settings.ts              # SettingsTabProvider
│   ├── profiles.ts              # ProfileProvider
│   ├── types.ts                 # 类型定义
│   ├── algorithms.ts            # SSH 算法默认配置
│   ├── components/
│   │   └── managedSSHSettingsTab.component.*  # 设置页组件
│   └── services/
│       ├── managedSSHStore.service.ts
│       ├── managedSSHSecret.service.ts
│       ├── managedSSHMapper.service.ts
│       ├── managedSSHLauncher.service.ts
│       └── managedSSHUtils.service.ts
├── package.json
├── tsconfig.json
├── webpack.config.mjs
└── README.md
```

### 构建命令

```bash
npm run build    # 生产构建
npm run watch    # 开发监视模式
```

### 已知限制

- Jump Host（跳板机）支持暂未实现
- 私钥文件管理暂未实现
- 连接测试功能暂未实现

## License

MIT