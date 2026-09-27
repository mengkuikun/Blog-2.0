# Edge-TTS 朗读服务部署指南

> 博客文章朗读功能的服务端：部署在腾讯云服务器上的 edge-tts 代理（`scripts/TTS服务/`），提供流式 mp3 合成。博客端由 `PUBLIC_TTS_SERVER` 指向本服务；服务不可用时自动降级浏览器系统语音。

## 一、部署架构

```text
博客文章页「朗读」按钮
    ↓ POST /tts（文章文本 + 音色）
tts.example.com（Nginx HTTPS）
    ↓ 反代 127.0.0.1:8000
blog-tts 容器（FastAPI + edge-tts）
    ↓ WebSocket
微软 Edge 在线语音服务（免费）
    ↓ mp3 流式返回；完整音频缓存到 ./cache
```

- 2 核 4G 足够：合成算力在微软云端，服务器只做转发
- 缓存命中时支持 HTTP Range（进度条可拖动）；未命中时流式下发（1~2 秒出声）
- 文章正文不落盘（仅内存暂存 10 分钟），只有音频缓存（默认上限 2GB）

## 二、上传代码

```bash
mkdir -p /opt/blog-tts && cd /opt/blog-tts
# 方式一：克隆博客仓库后拷出（推荐，代码随仓库更新）
git clone --depth 1 https://github.com/mengkuikun/dumplingandcakeblog.git /tmp/blog
cp -r "/tmp/blog/scripts/TTS服务/." /opt/blog-tts/
# 方式二：本地 scp 上传 scripts/TTS服务/ 整个目录
```

## 三、连通性预检（关键步骤）

```bash
cd /opt/blog-tts
docker run --rm python:3.12 bash -c \
  "pip install --quiet edge-tts && edge-tts --list-voices > /tmp/voices.txt && head -n 5 /tmp/voices.txt"
```

- 能列出音色（如 `zh-CN-XiaoxiaoNeural`）→ 继续下一步
- 报 403 / 连接失败 → 先看第八节排查，连通后再继续

## 四、启动服务

```bash
cd /opt/blog-tts
docker compose up -d --build
docker compose logs --tail=30 tts   # 出现 "Application startup complete." 即成功
bash 自测.sh                         # 健康检查 + 合成 /tmp/tts-test.mp3
```

试听 `/tmp/tts-test.mp3`（下载到本地或用 `scp` 拉回）。

## 五、Nginx 反代 + HTTPS

前提：`tts.example.com` 已解析到本服务器。将 `nginx.conf.example` 并入现有 Nginx：

1. 在 `http {}` 全局块加限流区（若已有可复用）：
   ```nginx
   limit_req_zone $binary_remote_addr zone=tts_limit:10m rate=30r/m;
   ```
2. 新增 `tts.example.com` 的 server 块（照抄 `nginx.conf.example`，补证书路径）
3. 证书二选一：已有泛域名证书直接填路径；没有就跑 `certbot --nginx -d tts.example.com`（或面板申请）
4. `nginx -t && nginx -s reload`

验证：

```bash
curl https://tts.example.com/health
# {"status":"ok","edge_tts":"7.x.x"}
```

## 六、博客端配置

1. 本地 `.env` 加：`PUBLIC_TTS_SERVER=https://tts.example.com`
2. **EdgeOne Pages 控制台** → 项目 → 环境变量：新增 `PUBLIC_TTS_SERVER=https://tts.example.com`（线上构建的关键；与其余 13 个变量放一起）
3. push main 触发 EdgeOne 构建 → 文章页出现「朗读」按钮
4. （可选）GitHub 仓库 Variable 加 `PUBLIC_TTS_SERVER`：仅当希望 CI 的 `build.yml` 构建产物也带上；不加不影响 CI 通过

## 七、验收清单

服务端：

- [ ] `curl https://tts.example.com/health` 返回 ok
- [ ] `bash 自测.sh` 全绿，试听正常
- [ ] 第二次请求同一篇文章明显更快（缓存命中）
- [ ] 缓存命中后拖动进度条可跳转（Range 生效）

博客端：

- [ ] 文章页出现「朗读」按钮，点击 1~2 秒出声
- [ ] 倍速切换立即生效；刷新后倍速/音色被记住
- [ ] 手机锁屏/后台能继续播放，锁屏显示文章标题
- [ ] `docker compose stop` 后点朗读：提示后自动切系统语音
- [ ] 深色模式播放条样式正常；Swup 切页后播放停止

## 八、403 / 连接失败排查

| 检查 | 处理 |
|------|------|
| 库版本旧 | `docker compose build --no-cache`（requirements 要求 ≥7.2.7） |
| 服务器时间不准（令牌对时钟敏感） | `timedatectl set-ntp true && systemctl restart systemd-timesyncd` |
| 机房 IP 被区域风控 | 编辑 `docker-compose.yml` 的 `EDGE_TTS_PROXY=` 填入代理地址后执行 `docker compose up -d`（直接 export 不生效：compose 里的字面空值优先）。注意容器内 `127.0.0.1` 是容器自身，代理跑在宿主机时要填宿主网关（Linux Docker 默认 `http://172.17.0.1:7890`；或在 compose 加 `extra_hosts: ["host.docker.internal:host-gateway"]` 后用 `http://host.docker.internal:7890`），且代理需监听 `0.0.0.0` |
| 仍不行 | 不影响博客：前端自动降级系统语音；服务保留，等微软策略变化再试 |

## 九、常用运维

```bash
cd /opt/blog-tts
docker compose ps
docker compose logs --tail=100 tts
docker compose restart tts
du -sh cache
```

## 十、停用 / 回滚

- 博客端：删 EdgeOne 的 `PUBLIC_TTS_SERVER`，或把 `src/config/ttsConfig.ts` 的 `enable` 改为 `false`
- 服务端：`docker compose down` + 移除 Nginx server 块
