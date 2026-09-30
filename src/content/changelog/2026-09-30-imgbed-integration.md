---
version: "v1.44.0"
date: 2026-09-30
type: feature
description: 接入自建图床服务（img.imki.cn）：相册支持图床动态加载图片，上传走 HuggingFace 渠道
---

## 接入自建图床

- 接入自建图床 **img.imki.cn**（CloudFlare-ImgBed，HuggingFace 存储渠道），补齐 `PUBLIC_IMAGEBED_URL` / `PUBLIC_IMAGEBED_API_TOKEN` / `PUBLIC_IMAGEBED_FOLDER` 环境变量配置。
- 相册模块正式启用图床模式：新增测试相册「测试图床」（`src/content/album/`），`imgbedFolder` 指向图床 `手机uu` 目录，图片由相册页实时从图床拉取展示。
- 相册图片识别逻辑兼容各存储渠道：HuggingFace 等渠道上传的文件 MIME 为 `application/octet-stream`，现改为「MIME 为 image/ 或文件名扩展名为图片格式」双保险判断，不再依赖图床返回的 MIME 类型。
