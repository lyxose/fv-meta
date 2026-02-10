# Pavlovia 数据存储调试指南

## 问题描述
数据未能正确存储到 Pavlovia 服务器。

## 调试步骤

### 第 1 步：本地测试验证（重要！）

**在本地浏览器中测试**是排查问题的第一步：

1. 在浏览器中打开 `index.html`
2. 打开开发者工具 (F12) → Console 标签页
3. 按照以下操作步骤：
   - 填写被试信息并提交
   - 完成绘制任务
   - 查看 Console 输出

**关键日志输出检查**：

```
✓ 正常：
- "PsychoJS 已启动（来自 Pavlovia）" （Pavlovia 部署时）
- "被试信息已保存到本地 localStorage" （必须出现）
- "颜色矩阵已保存到本地 localStorage (xxxx 个非零元素)"（提交后必须出现）

✗ 错误：
- "PsychoJS 库未加载，使用本地存储模式" （Pavlovia 环境中不应出现）
- "PsychoJS 未正确初始化，数据未保存" （表示 PsychoJS 对象为 null）
```

### 第 2 步：检查 localStorage 数据

在本地测试完成后，在 Console 中执行以下命令验证数据是否已保存：

```javascript
// 查看所有 localStorage 数据
Object.keys(localStorage).filter(key => key.includes('participant_') || key.includes('drawing_'))

// 查看具体的被试信息
console.log(JSON.parse(localStorage.getItem('participant_info_[被试编号]')))

// 查看绘图数据摘要
const drawingData = JSON.parse(localStorage.getItem('drawing_data_[被试编号]'));
console.log(`非零元素数：${drawingData.non_zero_count}`);
```

### 第 3 步：Pavlovia 部署配置检查

如果本地数据保存正常，但 Pavlovia 上无法保存，检查以下项目：

#### 3.1 项目设置
1. 登录 https://pavlovia.org
2. 进入你的项目
3. 点击 **Settings** → **Online**
4. 检查以下配置：
   - **Status**: 应为 "RUNNING" 或 "PILOTING"
   - **HTML Path**: 应指向 `index.html`
   - **Data Folder**: `data`（确保存在）

#### 3.2 GitLab 连接
1. 在项目 Settings 中，确认 GitLab 仓库已正确关联
2. 运行实验时，Pavlovia 会从 GitLab 拉取最新代码

#### 3.3 检查项目权限
- 项目应为 **Public** 或 **Private**（取决于需求）
- 你应该是项目所有者或有编辑权限

### 第 4 步：Pavlovia 上的数据保存流程

**Pavlovia 的工作原理**：

```
你的 JavaScript 代码
    ↓
特殊的 PsychoJS 对象（由 Pavlovia 在加载时注入）
    ↓
psychoJS.experiment.addData()  // 添加数据
psychoJS.experiment.nextEntry()  // 推进到下一行
psychoJS.experiment.save()  // 保存到服务器
    ↓
Pavlovia 服务器上的 `data` 文件夹
    ↓
Download Results 中可下载
```

### 第 5 步：手动验证 PsychoJS 集成

在 Pavlovia 上运行实验时，在 Console 执行：

```javascript
// 检查 psychoJS 对象是否存在
console.log(typeof window.psychoJS);  // 应输出 "object"
console.log(window.psychoJS);  // 应显示 PsychoJS 对象

// 检查 experiment 对象
console.log(window.psychoJS.experiment);  // 应存在
```

### 第 6 步：上传和部署

**确保代码已上传到 GitLab**：

```bash
cd jstest_online
git status  # 检查修改
git add -A
git commit -m "修复并改进实验代码"
git push origin master
```

**在 Pavlovia 上重新加载**：
1. 进入项目
2. 点击 **Run** 或 **Pilot**
3. 等待右上方的加载完成

### 第 7 步：测试数据下载

**完成一次实验流程后**：

1. 登录 Pavlovia
2. 进入项目 → **Dashboard**
3. 查看 **Recent Sessions** 中是否有新的实验记录
4. 点击 **Download Results**
5. 检查下载的 ZIP 文件中是否包含数据

**检查数据格式**：

数据文件应为 `.csv` 格式，包含：
- 第一行：列名（participant_id, name, age, start_time, trial_type 等）
- 随后的行：被试数据
- 如果有绘图数据：drawing_matrix 列包含 JSON 格式的矩阵

### 常见问题速查表

| 问题 | 可能原因 | 解决方案 |
|------|--------|--------|
| 本地 Console 显示"未加载" | 本地环境，正常 | 在 Pavlovia 上测试时应显示"已启动" |
| 本地数据保存正常，但 Pavlovia 上无数据 | 代码未上传或语法错误 | 检查 Git 提交，查看浏览器 Console 错误 |
| Pavlovia 上看不到项目 | 权限问题或项目不存在 | 确保在 https://gitlab.pavlovia.org 上创建了项目 |
| Download Results 中无数据文件夹 | 实验未正确运行或未有被试完成 | 确保实验流程完整运行 |

## 手动测试清单

- [ ] 本地浏览器打开，看到信息输入界面
- [ ] 填写信息并提交，看到说明页
- [ ] 开始实验，看到黑色背景+白色圆盘
- [ ] 能够正常绘制（红色像素出现）
- [ ] 双击可切换模式
- [ ] 空格清空画布
- [ ] 回车或点击确认，看到完成页
- [ ] Console 显示所有关键日志
- [ ] localStorage 中有被试信息和绘图数据
- [ ] 在 Pavlovia 上运行，Console 显示"PsychoJS 已启动（来自 Pavlovia）"
- [ ] 完成实验后，Dashboard 显示新的会话
- [ ] 下载 Results，验证数据文件内容

## 数据保存的两种模式

本代码支持两种数据保存模式：

### 模式 1：Pavlovia 部署（优先）
- 自动检测到 `window.psychoJS` 对象
- 使用 `psychoJS.experiment.addData()` 保存
- 数据保存到 Pavlovia 服务器
- 开发者通过 Dashboard 下载

### 模式 2：本地/开发模式（备用）
- 检测到 `window.psychoJS` 不存在
- 使用 `localStorage` 备份
- 数据保存到浏览器本地存储
- 方便本地测试和调试

## 获取帮助

如果问题仍未解决，收集以下信息：

1. **Console 输出** - 将完整的日志截图
2. **Network 面板** - 检查是否有 POST 请求失败
3. **项目设置** - 确认 Pavlovia 配置
4. **Git 日志** - `git log --oneline -5`
5. **测试结果** - 本地是否正常

