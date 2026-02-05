# Furimg-V3

一个基于 Node.js 和 Express 的高性能图片/文件服务 API，提供目录扫描、数据库存储、随机文件提取和完整文件外放功能。

## 功能特性

- 📁 **自动目录扫描** - 递归扫描配置目录中的所有文件
- 🎲 **随机文件提取** - 从全部文件或指定目录中获取随机文件
- 📊 **SQLite 数据库** - 高效的文件索引和查询
- 🔐 **认证与授权** - 支持管理员 Token 验证
- 🚦 **速率限制** - 内置速率限制防止滥用
- 🌐 **CORS 跨域** - 灵活的跨域资源共享配置
- 📦 **Gzip 压缩** - 自动响应压缩减少带宽
- 🏥 **健康检查** - 实时监控服务器状态和资源使用
- 📝 **日志系统** - 完整的请求和错误日志记录
- 🔗 **静态文件服务** - 直接提供图片和文件下载

## 快速开始

### 安装依赖

```bash
npm install
```

### 配置

编辑 `config/config.json` 配置文件：

```json
{
  "server": {
    "addr": "localhost",            // 监听地址
    "httpport": 3000,               // HTTP 端口
    "httpsport": 3001,              // HTTPS 端口
    "forcehttps": false,            // 是否强制 HTTPS，暂未开发
    "gzip": false,                  // 是否启用 Gzip 压缩
    "ssl": {
      "enable": false,              // 是否启用 SSL
      "cert": "./ssl/fullchain.pem", // SSL 证书路径
      "key": "./ssl/privkey.pem"    // SSL 密钥路径
    },
    "cors": {
      "enabled": true,              // 启用 CORS
      "origins": "*",               // 允许的源
      "methods": "GET, POST, PUT, DELETE, OPTIONS",
      "preflightContinue": false,
      "optionsSuccessStatus": 204
    },
    "rateLimit": {
      "enable": true,               // 启用速率限制
      "windowMS": 15,               // 时间窗口（分钟）
      "limit": 100,                 // 限制请求数
      "statusCode": 429,            // 超限时返回的状态码
      "message": "too many requests", // 超限时的错误消息
      "standardHeaders": "draft-8",
      "legacyHeaders": false,
      "validate": {
        "trustProxy": false
      }
    }
  },
  "db": {
    "sqlite3": {
      "file": "./data/app.db"       // 数据库文件路径
    }
  },
  "log": {
    "path": "./logs",               // 日志目录
    "level": 3                      // 日志级别（0-5）
  },
  "paths": {
    "html": "./public",             // 静态网站文件目录
    "images": "./tupian"            // 图片/文件目录
  },
  "admintoken": "114514"            // 管理员 Token
}
```

### 启动服务

```bash
npm start
```

服务将在 `http://localhost:3000` 启动。

## API 端点

### 1. 获取随机文件

**请求：**
```http
GET /api
```

**查询参数：**
- `json=true` (可选) - 返回 JSON 格式的文件信息而非文件本身

**响应示例：**
```json
{
  "file": "photo.jpg",
  "path": "/path/to/dir",
  "size": 2048576,
  "url": "http://localhost:3000/files/photo.jpg"
}
```

---

### 2. 从指定目录获取随机文件

**请求：**
```http
GET /api/folderpath
GET /api/folderpath/subfolder
```

**示例：**
```http
GET /api/2024/january?json=true
```

**查询参数：**
- `json=true` (可选) - 返回 JSON 格式的文件信息

**响应说明：** 返回指定文件夹中的随机文件，格式同 `/api` 端点。

---

### 3. 获取完整文件列表

**请求：**
```http
GET /filelist
```

**响应示例：**
```json
{
  "photos/2024": {
    "photo1.jpg": "/files/photos/2024/photo1.jpg",
    "photo2.jpg": "/files/photos/2024/photo2.jpg"
  }
}
```

---

### 4. 服务器健康检查

**请求：**
```http
GET /health
```

**响应示例：**
```json
{
  "status": "ok",
  "memory": {
    "rss": "150.25 MB",
    "heapTotal": "200.40 MB",
    "heapUsed": "120.15 MB",
    "external": "5.20 MB"
  },
  "platform": "win32",
  "arch": "x64",
  "nodeVersion": "v20.0.0",
  "uptime": {
    "ms": 3600000,
    "formatted": "0天 1时 0分 0秒"
  },
  "timestamp": "2024-01-15 10:30:45"
}
```

---

### 5. 刷新数据库（管理员）

**请求：**
```http
POST /admin/refresh
Authorization: Bearer 114514
```

**请求头：**
- `Authorization: Bearer <admintoken>` - 管理员 Token

**响应示例：**
```json
{
  "message": "refresh database start"
}
```

**说明：** 重新扫描配置目录，更新数据库中的文件索引。

---

### 6. 直接下载文件

**请求：**
```http
GET /files/path/to/file.jpg
```

**说明：** 配置 `paths.images` 目录中的文件都可通过该路径直接访问。

## 中间件配置

### 请求日志

所有请求都会被记录到日志系统。

### CORS 跨域

可在 `config/config.json` 中启用/禁用 CORS：
```json
"cors": {
  "enabled": true,
  "origins": "*",
  "methods": "GET, POST, PUT, DELETE, OPTIONS",
  "preflightContinue": false,
  "optionsSuccessStatus": 204
}
```

### 速率限制

防止 API 滥用：
```json
"rateLimit": {
  "enable": true,               // 启用速率限制
  "windowMS": 15,               // 15分钟时间窗口
  "limit": 100,                 // 最多100个请求
  "statusCode": 429,            // 超限返回的状态码
  "message": "too many requests"
}
```
超限返回 429 状态码。

### Gzip 压缩

在配置中启用以减少响应大小：
```json
"gzip": true
```

## 项目结构

```
.
├── app.js                 # 应用入口
├── config/
│   └── config.json       # 配置文件
├── src/
│   ├── database/
│   │   └── db.js         # SQLite 数据库操作
│   ├── utils/
│   │   ├── config.js     # 配置管理
│   │   ├── logger.js     # 日志工具
│   │   └── scanner.js    # 目录扫描工具
│   └── web/
│       ├── api.js        # 路由定义
│       ├── middleware.js # 中间件
│       └── server.js     # 服务器启动
├── data/
│   └── app.db            # SQLite 数据库文件
├── logs/                 # 日志目录
├── ssl/                  # SSL 证书（可选）
└── package.json
```

## 开发命令

```bash
# 启动服务
npm start

# 代码质量检查
npm run lint

# 自动修复代码风格
npm run lint:fix
```

## License

GPL-3.0-only