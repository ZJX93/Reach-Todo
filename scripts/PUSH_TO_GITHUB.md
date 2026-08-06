# 把「抵达 · Reach」推送到 GitHub（仓库已指定：ZJX93/reach-todo）

目标仓库：`https://github.com/ZJX93/reach-todo`

> 沙箱环境无法直连 GitHub（DNS 被黑洞 + 连接器未注册 `17008`），推送必须在你本机完成。
> 源码与完整 git 历史已打包为 `reach-todo.tar.gz`（含 `.git`），下载解压后即可推送。

## 步骤

### 1. 下载并解压
CodeBuddy 文件栏找到 `/workspace/reach-todo.tar.gz` → 右键下载。
```bash
mkdir reach-todo && tar -xzf reach-todo.tar.gz -C reach-todo && cd reach-todo
```
（Windows 用 7-Zip / WinRAR 解压到 `reach-todo` 文件夹）

### 2. 推送（替换 `<你的PAT>` 为你之前提供的个人访问令牌）
```bash
git remote add origin https://<你的PAT>@github.com/ZJX93/reach-todo.git
git branch -M main
git push -u origin main
```

### 3. 如果仓库非空（已带 README/初始提交），先拉取再推
```bash
git pull --rebase origin main
git push -u origin main
```

推送成功后地址：`https://github.com/ZJX93/reach-todo`

## 说明
- 当前提交作者为占位身份 `抵达 Reach <dev@reach.app>`，如需改成你自己：
  ```bash
  git commit --amend --reset-author --no-edit
  git push -u origin main --force-with-lease
  ```
- PAT 需有 `repo` 权限；GitHub 已不支持账号密码推送，必须用 PAT。
- 不要把 `.git` 文件夹用网页拖拽方式上传（会乱）；想保留历史就用上面的命令行。
