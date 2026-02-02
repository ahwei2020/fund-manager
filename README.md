# 基金管理助手

一个简洁的 H5 基金持仓管理工具，帮助基民轻松管理个人基金投资。

## 功能特点

- 📊 **持仓管理** - 添加、编辑、删除基金持仓
- 💰 **收益计算** - 自动计算当日收益和累计收益
- 📝 **交易记录** - 记录买入、卖出、转换操作
- 📤 **数据导出** - 支持导出 JSON 和 CSV 格式
- 🌙 **深色模式** - 支持浅色/深色主题切换
- 📱 **移动优先** - 专为手机浏览器优化

## 在线访问

**[点击这里访问应用](https://fund-manager.vercel.app)**

## 本地运行

### 方法一：使用 Python
```bash
cd fund-manager
python -m http.server 8000
```
然后在浏览器打开 `http://localhost:8000`

### 方法二：使用 Node.js
```bash
cd fund-manager
npx http-server -p 8000
```

## 部署到 Vercel

### 方式一：使用 Vercel CLI（推荐）

1. 安装 Vercel CLI：
```bash
npm install -g vercel
```

2. 在项目目录执行：
```bash
cd fund-manager
vercel
```

3. 按提示操作：
   - 登录 Vercel 账号
   - 选择 `Set up and deploy` -> `Continue`
   - 项目名称输入 `fund-manager`
   - 选择 `Other` 作为框架预设
   - 确认部署

4. 部署完成后会得到网址，如：`https://fund-manager.vercel.app`

### 方式二：通过 GitHub 自动部署

1. 将代码推送到 GitHub 仓库

2. 访问 [vercel.com](https://vercel.com) 并登录

3. 点击 "New Project"

4. 导入你的 GitHub 仓库

5. Vercel 会自动识别这是一个静态网站，点击 "Deploy"

6. 等待部署完成即可

## 添加到 iOS 主屏幕

1. 在 Safari 中打开应用网址
2. 点击底部的"分享"按钮（方框向上箭头）
3. 滚动选择"添加到主屏幕"
4. 点击"添加"
5. 现在可以像原生 App 一样使用了

## 数据说明

- 所有数据存储在浏览器本地（localStorage）
- 数据仅在您的设备上，不会上传到服务器
- 建议定期使用"导出数据"功能备份

## 免责声明

本应用仅供个人记录使用，不构成任何投资建议。投资有风险，入市需谨慎。

## 数据来源

基金数据来自东方财富网公开 API。

## 开源协议

MIT License
