# Gitee 镜像 + 2FA + SSH 免码推送 操作备忘

> 适用：把 `fox-bead` 从 GitHub 额外镜像到 Gitee（国内稳），满足 Gitee 发布要求的双因素认证（2FA）。
> 维护人：余莎莎 ｜ 最后更新：2026-08-07
> 位置：`D:\余莎莎资料\fox-bead\GITEE_2FA_操作备忘.md`

---

## 0. 这套工作流解决什么

- **GitHub 外网不稳**：push 常遇 `github.com:443` 超时，代码推不出去。
- **Gitee 作国内镜像**：稳定、速度快，发布要求账号开启 2FA。
- **目标**：代码一份管两份（GitHub 主仓 + Gitee 镜像），平时以 Gitee 为主推，GitHub 不稳时重试。

---

## 1. Gitee 账号开两步验证（2FA）

纯网页操作，无代码：

1. 登录 gitee.com → 右上角头像 → **设置**
2. 左侧 **账号安全**（或「安全设置」）
3. 找 **两步验证 / 2FA** → 点 **开启**
4. 输登录密码确认身份
5. 页面出现 **二维码 + 一串密钥**
6. 手机装验证器 App 扫码：
   - 国内稳妥：**腾讯身份验证器**（或微信小程序）、**1Password**、**身份宝**
   - 通用：**Google Authenticator** / **Authy**
7. App 出现 **6 位动态码（每 30 秒变）**，填回 Gitee → 确认开启
8. **⚠️ 关键**：Gitee 给一组 **恢复码（recovery codes）**，立刻存进密码管理器或抄纸上。手机丢了就靠它进账号。

> 2FA 只卡**网页登录和发布敏感操作**；git 推送走 SSH key 不受影响（见 §3）。

---

## 2. 生成 SSH 密钥（⚠️ 中文用户名特别注意）

本机已生成过，钥匙在 `C:\Users\余莎莎\.ssh\id_ed25519`（私钥，勿外泄）和 `.pub`（公钥）。

**如换机器或重生成，命令如下（必须用 Windows 绝对路径，原因见 §6 坑 1）：**

```bash
# 先建目录（Git Bash 下）
mkdir -p "$HOME/.ssh"

# 生成 ed25519 密钥，必须用 C:/Users/用户名/.ssh/ 的 Windows 路径，否则写不进去
ssh-keygen -t ed25519 -C "sanmiaowuyu@gitee" -N "" -f "C:/Users/余莎莎/.ssh/id_ed25519"
```

生成后，**把公钥内容**（`C:\Users\余莎莎\.ssh\id_ed25519.pub` 的全部内容，含 `ssh-ed25519` 开头和邮箱结尾）复制到 Gitee：

- Gitee 网页 → 设置 → **SSH 公钥** → 粘贴 → 填标题（如「我的电脑」）→ 确定

验证连通（走显式路径，见 §6 坑 1）：

```bash
ssh -i "C:/Users/余莎莎/.ssh/id_ed25519" \
    -o StrictHostKeyChecking=accept-new \
    -o UserKnownHostsFile="C:/Users/余莎莎/.ssh/known_hosts" \
    -T git@gitee.com
# 成功回显：Hi sanmiaowuyu(@three-little-kitty)! You've successfully authenticated...
```

---

## 3. 配置 remote + git config（已配好，勿重复）

当前仓库已配置：

```bash
# gitee 走 SSH
git remote set-url gitee git@gitee.com:three-little-kitty/fox-bead.git

# 让本仓库所有 git 操作自动用正确私钥路径（绕开中文家目录编码坑）
git config core.sshCommand "ssh -i C:/Users/余莎莎/.ssh/id_ed25519 -o UserKnownHostsFile=C:/Users/余莎莎/.ssh/known_hosts"
```

查看状态：
```bash
git remote -v
# gitee   git@gitee.com:three-little-kitty/fox-bead.git (fetch/push)
# origin  https://github.com/sanmiaowuyu/fox-bead.git (fetch/push)
```

---

## 4. ⚠️ 必须先建空仓库（本次踩的坑）

**push 前必须在 Gitee 网页先建好仓库**，否则报 `404 not found`：

1. 登录 gitee.com → 右上角 **＋** → **新建仓库**
2. **仓库名称**填 `fox-bead`
3. **路径**自动变 `three-little-kitty/fox-bead`（**必须一致**，否则还是 404；注意 Gitee 真实路径是 `three-little-kitty`，不是显示名 `sanmiaowuyu`）
4. **不要**勾选「初始化 README」「添加 .gitignore」「选择分支模型」—— 保持**完全空仓库**，否则首次 push 冲突
5. 可见性：建议 **公开**（与 GitHub 镜像一致）；想私密选私有
6. 点 **创建**

> remote 地址是之前会话乐观预设的，仓库没建就会 404。建好后再 push。

---

## 5. 推送命令

仓库建好后，一条推送分支 + 全部 tag（含 `v140`）：

```bash
# 在 D:\余莎莎资料\fox-bead 目录下
git push gitee main --tags
```

日常同步（GitHub 不稳时以 Gitee 为主）：

```bash
git push gitee main --tags     # Gitee（稳，国内）
git push origin main --tags    # GitHub（外网不稳时失败就重试）
```

嫌麻烦可合并一次推双份（把 Gitee 加为 origin 的额外 URL）：

```bash
git remote set-url --add origin git@gitee.com:three-little-kitty/fox-bead.git
# 之后 git push origin main --tags 同时推 GitHub + Gitee
```

---

## 6. 故障排查

### 坑 1：中文家目录导致 ssh 读不到钥匙（Permission denied publickey）
- **现象**：`ssh -T git@gitee.com` 报 `Could not create directory '/c/Users/<乱码>/.ssh' ... Permission denied (publickey)`
- **原因**：Git Bash 的 `HOME=/c/Users/余莎莎`，ssh 内部把中文路径按 GBK 编码成乱码，读不到 `~/.ssh/id_ed25519`
- **解决**：始终用**显式 Windows 路径** `C:/Users/余莎莎/.ssh/id_ed25519`（见 §2、§3）。已写进 `git config core.sshCommand`，不用每次带
- **仅中文用户名机器有此问题**，纯英文用户名无

### 坑 2：push 报 404 not found
- **原因**：Gitee 上 `three-little-kitty/fox-bead` 仓库不存在（见 §4）；注意真实路径是 `three-little-kitty` 不是显示名 `sanmiaowuyu`
- **解决**：去 Gitee 网页新建空仓库，再 push

### 坑 3：GitHub push 卡 443 超时
- **原因**：沙箱/本机外网不稳，连不上 `github.com:443`
- **解决**：换 Gitee 主推；或等网络恢复重试 `git push origin main`

### 坑 4：ssh 首次连接问 "Are you sure ..."
- 输入 `yes` 回车即可（已用 `StrictHostKeyChecking=accept-new` 自动接受，一般不再问）

---

## 7. 一句话流程（建好仓库后每天）

```
改代码 → git commit → git push gitee main --tags（稳）
                     → git push origin main --tags（GitHub，不稳就重试）
```

2FA 只影响 Gitee 网页登录；推送全程走 SSH key，免动态码。
