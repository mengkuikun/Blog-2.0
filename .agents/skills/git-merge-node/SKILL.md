---
name: git-merge-node
description: 博客 Git 合并节点提交法（Non-Fast-Forward Merge Node）。Use when 用户要求"合并节点提交""生成汇总提交节点""合并节点法推送到远程""按 67253684 的方式提交""按上次的方法提交"或在大迭代收尾时将多个本地功能提交聚合为一个带详细总结的 Merge 节点推送到远程。
---

# Git 合并节点提交法（Non-Fast-Forward Merge Node）

## 1. 核心意图与应用场景

在博客的大版本或多功能迭代中，本地会先进行多次细粒度的原子提交（例如：`feat(album)`、`feat(circle)`、`feat(branding)`、`feat(navbar)`、`feat(schedules)`）。

如果直接 push 这些线性提交：
- GitHub 仓库主页的最上方只会显示最后一次提交的信息（例如：`feat(schedules): 添加农历六月二十五个人生日日程`），完全无法体现这次迭代的核心改动（资料卡、图床、朋友圈等被淹没）。
如果直接使用 squash 压成 1 个提交：
- 丢失了每一次改动的独立记录与版本分支。

**合并节点法（经典案例：`67253684` 与 `18f74c0a`）**：
保留所有细分原子提交构成的开发线，同时在 `main` 主线上产生一个清晰的 **合并汇总结点（Merge Commit，`--no-ff`）**。
- GitHub 首页最新提交即为 **该合并节点的汇总 feat 信息**。
- 每一个原子提交的修改细节、历史记录 100% 完整保留在气泡分支上。

---

## 2. 判定基准点（BASE_COMMIT）

在执行合并节点法之前，必须先明确 **基准节点（BASE_COMMIT）**：
- 基准节点即为**上一次推送到远程的那个合并节点**（例如 `67253684`）。
- 可以通过 `git log --graph --oneline` 快速找到上一个合并分叉根节点。

---

## 3. 标准执行流程（分步命令）

假设当前 `main` 分支上已完成若干次本地原子提交（设最新提交为 `LATEST_COMMIT`）：

### 步骤 1：确认工作区干净
```bash
git status
# 确保 working tree clean，所有改动都已在各自原子 commit 中提交完毕
```

### 步骤 2：创建临时工作分支并记录末端
```bash
# 1. 获取当前最新提交的哈希
git branch -f feat-update HEAD
```

### 步骤 3：将 main 主分支重置回基准节点
```bash
git reset --hard <BASE_COMMIT>
# 例如：git reset --hard 67253684
```

### 步骤 4：生成汇总 Merge 节点（--no-ff）
编写汇总提交信息（建议写入临时文本文件，防止多行文本与引号在不同操作系统 Shell 中被截断）：

```bash
# 格式规范：
# feat: <本次大迭代的一句话总结>
#
# 完成博客多项核心功能升级与视觉个性化定制，主要改动：
# - <模块1总结>
# - <模块2总结>
# - <模块3总结>
```

执行合并命令：
```bash
git merge feat-update --no-ff -F scratch/merge_msg.txt
```

### 步骤 5：删除临时分支
```bash
git branch -d feat-update
```

### 步骤 6：检查分支图谱
```bash
git log --graph --oneline -n 10
```
验证图谱是否呈现清晰的双亲气泡结构：
```text
*   <MERGE_COMMIT> feat: 汇总信息
|\  
| * <COMMIT_5>
| * <COMMIT_4>
| * <COMMIT_3>
| * <COMMIT_2>
| * <COMMIT_1>
|/  
*   <BASE_COMMIT> 上一个合并节点
```

### 步骤 7：推送到远程
```bash
git push origin main
```
（由于新的合并节点同时包含 BASE_COMMIT 与最新分支节点，push 会平滑快进同步至 GitHub）。

---

## 4. 常见误区与避坑指南

1. **切勿直接 push 裸提交序列**：当用户说“生成汇总 feat 信息准备推送到远程”时，指的是**用该汇总信息建立合并节点**，而不是直接 push 后面的零散提交。
2. **切勿使用 fast-forward（必须 `--no-ff`）**：默认的 `git merge` 在没有分叉时会直接快进移动指针，无法生成带汇总信息的合并节点。
3. **合并前先与站长确认汇总文案**：汇总文案应清晰归纳本次迭代的各个模块，待站长确认后再执行合并与推送。
