# 🚀 OC Cargo Claw 部署指南

> 从本地开发到云服务器上线的完整流程

---

## 📋 目录

1. [本地开发](#本地开发)
2. [Docker 本地测试](#docker-本地测试)
3. [云服务器部署](#云服务器部署)
4. [域名 + HTTPS 配置](#域名--https-配置)
5. [持续部署 CI/CD](#持续部署-cicd)
6. [性能优化](#性能优化)

---

## 本地开发

### 环境要求

- Node.js 20+
- npm 10+ (或 pnpm/yarn)

### 启动

```bash
cd frontend
npm install
npm run dev
```

访问 `http://localhost:5173`，热更新自动生效。

### 构建产物

```bash
npm run build       # 输出到 dist/
npm run preview     # 本地预览生产构建
```

---

## Docker 本地测试

### 单容器运行

```bash
cd frontend
docker build -t cargo-claw-web .
docker run -p 3000:80 cargo-claw-web
```

### Docker Compose（推荐）

```bash
# 在项目根目录
docker compose up --build

# 后台运行
docker compose up -d --build

# 查看日志
docker compose logs -f

# 停止
docker compose down
```

访问 `http://localhost:3000`

---

## 云服务器部署

### 适用云服务商

阿里云 ECS / 腾讯云 CVM / AWS EC2 / Vultr / DigitalOcean 等任一 Linux 服务器即可。

### 最低配置

- **CPU**：1 核（前端纯静态文件）
- **内存**：1GB（含 Docker 运行时）
- **磁盘**：20GB
- **带宽**：5Mbps 起

### 部署步骤

#### 1️⃣ 准备服务器

```bash
# SSH 登录服务器
ssh root@your-server-ip

# 安装 Docker 和 Docker Compose
curl -fsSL https://get.docker.com | sh
sudo systemctl start docker
sudo systemctl enable docker
```

#### 2️⃣ 拉取代码

**方式 A：从 Git 仓库**

```bash
git clone https://github.com/your-username/cargo-claw.git
cd cargo-claw
```

**方式 B：从本地上传**

```bash
# 本地执行
rsync -avz --exclude node_modules --exclude dist \
  ./cargo-claw/ root@your-server-ip:/root/cargo-claw/

# 服务器执行
cd /root/cargo-claw
```

#### 3️⃣ 启动服务

```bash
docker compose up -d --build
```

#### 4️⃣ 验证

```bash
curl http://localhost:3000
# 应返回 HTML 页面

docker compose ps
# 应看到 frontend 容器在运行
```

#### 5️⃣ 开放端口

阿里云 / 腾讯云控制台 → 安全组 → 入方向 → 放行 80/443 端口。

---

## 域名 + HTTPS 配置

### 方案 A：Nginx 反向代理 + Certbot（推荐）

```bash
# 安装 Nginx 和 Certbot
apt update && apt install -y nginx certbot python3-certbot-nginx

# 创建 Nginx 配置
cat > /etc/nginx/sites-available/cargoclaw << 'EOF'
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

ln -s /etc/nginx/sites-available/cargoclaw /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# 申请 HTTPS 证书（自动配置 Nginx）
certbot --nginx -d your-domain.com

# 证书自动续期已默认配置在 /etc/cron.d/certbot
```

访问 `https://your-domain.com` 即可。

### 方案 B：Cloudflare（更简单）

1. 域名 DNS 指向服务器 IP
2. 在 Cloudflare 启用代理（橙色云朵）
3. SSL/TLS 模式选 "Flexible"
4. 直接访问 `https://your-domain.com`，Cloudflare 自动处理证书

---

## 持续部署 CI/CD

### GitHub Actions 自动部署

创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to Server

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /root/cargo-claw
            git pull
            docker compose up -d --build
```

在 GitHub 仓库 Settings → Secrets 添加：
- `SSH_HOST`：服务器 IP
- `SSH_USER`：通常是 `root`
- `SSH_KEY`：服务器私钥内容

之后每次 `git push` 自动部署。

---

## 性能优化

### 当前构建分析

```
dist/index.html                   0.45 kB
dist/assets/index-xxx.css         5.17 kB
dist/assets/index-xxx.js        733.80 kB (gzip: 199.28 kB)
```

主要 bundle 包含 React + Three.js，约 200KB gzipped。对于一个 3D 应用来说是合理的。

### 进一步优化建议

#### 1. 代码分割（按场景懒加载）

```typescript
// 当 L2/L3 场景实现后
const YardScene = lazy(() => import('./scenes/yard/YardScene'));
const ContainerScene = lazy(() => import('./scenes/container/ContainerScene'));
```

#### 2. Three.js Tree Shaking

只导入用到的模块，不要 `import * as THREE`：

```typescript
// ✓ 推荐
import { Scene, PerspectiveCamera, Mesh } from 'three';

// ✗ 避免（增大 bundle）
import * as THREE from 'three';
```

#### 3. CDN 加速

国内部署建议把静态资源放到 OSS/COS + CDN：

```bash
# 构建后将 dist/assets 上传到 CDN
# 然后修改 vite.config.ts 的 base 字段为 CDN URL
```

#### 4. 使用 InstancedMesh

港口场景中大量重复物体（集装箱）已经用 `InstancedMesh` 渲染（见 `PortSceneBuilder.ts`），保持这个模式。

---

## 🐛 常见问题

### Q: 部署后白屏？

打开浏览器 DevTools → Console，常见原因：
- 路由问题：确认 `nginx.conf` 中有 `try_files $uri $uri/ /index.html`
- 静态资源 404：检查 Vite 的 `base` 配置

### Q: WebGL 不工作？

确认服务器有 HTTPS（HTTP 下某些浏览器禁用 WebGL 特性）。

### Q: 移动端卡顿？

3D 场景对移动端 GPU 要求较高。可以在 `SceneManager` 中根据设备能力降级：

```typescript
const isLowEnd = navigator.hardwareConcurrency < 4;
if (isLowEnd) {
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = false;
}
```

---

## 📊 部署检查清单

部署完成后逐项验证：

- [ ] `http://your-server-ip:3000` 可访问
- [ ] 域名解析正确（`dig your-domain.com`）
- [ ] HTTPS 证书有效（浏览器地址栏显示锁图标）
- [ ] 3D 场景正常加载（船舶、岸桥、堆场可见）
- [ ] 鼠标拖拽旋转流畅
- [ ] 右侧 Agent 面板数据实时更新
- [ ] PAUSE/RESUME 按钮可切换
- [ ] 浏览器 Console 无报错
- [ ] 移动端能打开（即使有性能问题）

---

*更新时间：2026 · OC Cargo Claw v3.0*
