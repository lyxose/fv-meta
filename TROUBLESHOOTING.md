# jstest_online 调试和故障排除指南

## 问题总结与解决方案

### 问题：PsychoJS 库加载失败
**症状**：控制台显示 `ReferenceError: PsychoJS is not defined`

**根本原因**：
- PsychoJS CDN 库需要时间加载，脚本在库加载完成前就尝试使用它
- CDN 加载延迟或超时

**解决方案**：
在 `initPsychoJS()` 函数中添加了等待机制：
```javascript
// 等待 PsychoJS 库加载（最多等待 3 秒）
let retries = 0;
while (typeof PsychoJS === 'undefined' && retries < 30) {
  await new Promise(resolve => setTimeout(resolve, 100));
  retries++;
}
```

该代码每 100ms 检查一次 PsychoJS 是否已加载，最多等待 3 秒。如果加载失败，则自动降级使用本地存储模式。

---

## 调试流程（按顺序执行）

### 步骤 1：检查 PsychoJS 库加载状态
**在浏览器 Console 中执行**：
```javascript
console.log('PsychoJS 库加载status:', typeof PsychoJS)
```

**预期结果**：
- ✅ 本地测试（未在 Pavlovia 上）：`undefined` 或 `function`
- ✅ Pavlovia 部署：`function`

**如果显示 `undefined` 持续超过 5 秒**，说明 CDN 加载失败。

---

### 步骤 2：检查被试信息保存
**操作**：
1. 打开 index.html
2. F12 打开 Console
3. 填写被试信息，点击提交
4. 查看 Console 日志

**预期日志顺序**：
```
📄 页面加载完成，开始初始化实验...
开始初始化 PsychoJS...
[等待 1-3 秒...]
✓ PsychoJS 实例创建成功
✓ PsychoJS 启动成功
✓ 被试信息已记录到 PsychoJS
✓ 被试信息已保存到本地存储
```

**如果显示以下日志，表示使用备用存储**：
```
⚠️  PsychoJS 库加载超时，使用本地存储模式
ℹ️  使用本地存储模式运行实验
```

---

### 步骤 3：检查本地存储中的数据
**在浏览器 Console 中执行**：
```javascript
// 查看所有被试相关的数据
Object.keys(localStorage).filter(k => k.includes('participant_') || k.includes('drawing_'))

// 查看被试信息（替换 '12' 为实际的被试编号）
JSON.parse(localStorage.getItem('participant_info_12'))

// 查看绘图数据概览（替换 '12' 为实际的被试编号）
const drawingData = JSON.parse(localStorage.getItem('drawing_data_12'))
console.log('非零元素数量:', drawingData.non_zero_count)
console.log('矩阵大小:', drawingData.matrix_size)
```

---

### 步骤 4：测试完整绘制流程
**操作**：
1. 提交被试信息
2. 阅读说明页，点击"开始实验"
3. 在白色圆盘内绘制
4. 测试功能：
   - 双击切换模式（绘制/减淡）
   - 滚轮调节画笔大小
   - 空格清空画布
   - 回车确认提交

**预期日志**：
```
🎨 绘制任务开始
切换模式为: 减淡
切换模式为: 绘制
✏️  绘制完成，保存数据...
💾 开始保存绘制数据...
✓ 本地存储: 42208 个非零元素已保存
✅ 实验完成，显示完成页面
```

---

### 步骤 5：Pavlovia 部署测试
**前置条件**：
- 代码已推送到 GitLab（已完成）
- 项目在 Pavlovia 上配置正确

**测试步骤**：
1. 访问 Pavlovia 项目页面
2. 点击 "Run" 或 "Pilot"
3. 完整运行一次实验
4. 查看 Dashboard → Download Results

**预期输出**：
- ✅ CSV 文件中包含被试信息
- ✅ CSV 文件中包含绘制数据（JSON 格式）

---

## 常见问题解决表

| 问题 | 症状 | 解决方案 |
|------|------|--------|
| PsychoJS 未加载 | Console 显示 `ReferenceError: PsychoJS is not defined` | 检查 CDN 链接、网络连接、刷新页面 |
| 数据未保存 | 完成后 localStorage 中无数据 | 检查浏览器 localStorage 未被禁用 |
| Canvas 显示异常 | 黑色背景或白色圆盘不显示 | 打开 F12，检查 Canvas 元素是否存在 |
| 鼠标预览圆不显示 | 开始绘制后看不到灰色圆圈 | 正常现象，鼠标预览始终存在 |
| 提示文本位置错误 | 文本在屏幕中央 | ✅ 已修复，现在在右上角 |
| 双击切换不工作 | 双击无响应 | 确保在 300ms 内快速双击 |

---

## 数据存储双重机制说明

### 机制 1：PsychoJS → Pavlovia 服务器
**何时激活**：在 Pavlovia 部署的在线实验
**地点**：Pavlovia Dashboard → Download Results
**优点**：安全、自动化、无需手动干预

### 机制 2：localStorage → 本地浏览器
**何时激活**：本地测试或 PsychoJS 不可用时
**地点**：浏览器开发者工具 → Application → localStorage
**优点**：快速反馈、便于调试

两种机制同时工作，确保数据不丢失。

---

## UI 位置修改说明

### 提示文本框（Instructions）
- **原位置**：屏幕中央（position fixed, top 50%, left 50%）
- **新位置**：右上角（position fixed, top 10px, right 10px）
- **修改原因**：避免遮挡绘制区域和用户交互
- **修改代码**：index.html 中的 `.instructions` CSS 类

---

## 日志符号说明

| 符号 | 含义 | 示例 |
|------|------|------|
| 📄 | 页面事件 | 📄 页面加载完成 |
| ✓ | 成功操作 | ✓ 被试信息已保存 |
| ❌ | 错误 | ❌ PsychoJS 初始化失败 |
| ⚠️ | 警告 | ⚠️ PsychoJS 库加载超时 |
| ℹ️ | 信息 | ℹ️ 使用本地存储模式 |
| 🎨 | 绘制相关 | 🎨 绘制任务开始 |
| 💾 | 保存数据 | 💾 开始保存绘制数据 |
| ✅ | 完成 | ✅ 实验完成 |
| 👋 | 退出 | 👋 正在退出 Pavlovia |

---

## 下一步建议

1. **本地验证**（已完成部分）
   - [ ] 验证 PsychoJS 库加载
   - [ ] 验证被试信息保存
   - [ ] 验证绘制数据保存
   - [ ] 验证完整流程

2. **Pavlovia 部署**
   - [ ] 在 Pavlovia 上运行 Pilot
   - [ ] 完整通过一次实验流程
   - [ ] 检查 Downloaded Results 中的数据

3. **生产环境**
   - [ ] 多被试测试
   - [ ] 长期运行稳定性测试
   - [ ] 数据质量验证

---

## 联系与反馈

如有任何问题，请：
1. 检查 Console 日志（F12）
2. 根据此指南进行排查
3. 记录完整的错误信息和日志

