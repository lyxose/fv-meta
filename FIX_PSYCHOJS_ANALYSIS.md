# PsychoJS 初始化问题分析与修复

## 问题诊断

### 错误现象
```
Uncaught TypeError: Cannot read properties of undefined (reading 'experiment')
    at submitInfo (simple_test.js:171:14)
```

### 根本原因

#### 问题 1：局部变量遮蔽全局变量
**错误代码（simple_test.js）：**
```javascript
let psychoJS;  // 全局声明，初始值为 undefined

async function initPsychoJS() {
  try {
    const psychoJS = new PsychoJS({  // ❌ 创建局部变量
      debug: true
    });
    
    // 局部变量被初始化
    console.log('✓ PsychoJS 实例创建成功');
    
    // 函数结束时，局部变量被销毁
  } catch (error) {
    // ...
  }
}
```

**变量作用域图：**
```
全局作用域
├─ psychoJS = undefined  ← 问题！
│
└─ initPsychoJS() 函数作用域
   └─ const psychoJS = new PsychoJS()  ← 局部变量，函数外无法访问
```

**结果：** 函数执行完毕后，全局 `psychoJS` 仍然是 `undefined`

#### 问题 2：initPsychoJS() 函数从未调用
**错误代码（DOMContentLoaded 事件处理）：**
```javascript
document.addEventListener('DOMContentLoaded', async function() {
  console.log('📄 页面加载完成，开始初始化实验...');
  
  experimentData.startTime = new Date().toISOString();
  
  // 初始化 PsychoJS
//   const psychoJSReady = await initPsychoJS();  // ❌ 被注释掉！
//   if (psychoJSReady) {
//     console.log('✓ PsychoJS 已准备就绪');
//   }
  
  // ... 后续代码执行，但 psychoJS 仍未初始化
});
```

**结果：** PsychoJS 永远不会被初始化，全局 `psychoJS` 保持为 `undefined`

---

## 对比参考（terrain_painter.js - 正确实现）

```javascript
// 全局作用域中直接创建
const psychoJS = new PsychoJS({
  debug: true
});

// 直接配置和启动，无需额外初始化函数
psychoJS.openWindow({ ... });
psychoJS.schedule(...);
psychoJS.start({ ... });
```

**优点：**
- 全局变量在最顶层声明和初始化
- 不依赖复杂的初始化流程
- PsychoJS 实例从页面加载时就存在

---

## 修复方案

### 修复 1：使用赋值而不是 const
**文件：** simple_test.js, initPsychoJS() 函数

**错误代码：**
```javascript
const psychoJS = new PsychoJS({
  debug: true
});
```

**修复代码：**
```javascript
psychoJS = new PsychoJS({  // 赋值给全局变量
  debug: true
});
```

### 修复 2：取消注释并启用 initPsychoJS() 调用
**文件：** simple_test.js, DOMContentLoaded 事件处理

**错误代码：**
```javascript
// 初始化 PsychoJS
//   const psychoJSReady = await initPsychoJS();
//   if (psychoJSReady) {
//     console.log('✓ PsychoJS 已准备就绪');
//   }
```

**修复代码：**
```javascript
// 初始化 PsychoJS
const psychoJSReady = await initPsychoJS();
if (psychoJSReady) {
  console.log('✓ PsychoJS 已准备就绪');
} else {
  console.log('ℹ️  使用本地存储模式运行实验');
}
```

### 修复 3：添加安全检查
在 submitInfo()、saveDrawingData()、showCompletionPage() 等函数中添加检查：

```javascript
if (psychoJS && psychoJS.experiment) {
  // 可以安全地使用 psychoJS
  psychoJS.experiment.addData(...);
}
```

---

## 执行流程（修复后）

```
页面加载
    ↓
DOMContentLoaded 事件
    ↓
initPsychoJS() 被调用
    ↓
psychoJS = new PsychoJS()  ← 赋值给全局变量
    ↓
psychoJS.start() 启动
    ↓
全局 psychoJS 现在有效了 ✓
    ↓
submitInfo() 被调用时
    ↓
psychoJS.experiment 存在 ✓
    ↓
数据成功保存到 Pavlovia
```

---

## 测试验证

### 本地测试（F12 Console）
```javascript
// 测试 1：检查 psychoJS 是否已初始化
console.log('psychoJS:', window.psychoJS);
// 预期输出：PsychoJS 实例对象

// 测试 2：填写被试信息后提交
// 预期 Console 输出：
// ✓ 被试信息已记录到 PsychoJS

// 测试 3：完成绘制后回车确认
// 预期 Console 输出：
// ✓ 数据已成功保存到 Pavlovia 服务器
```

### Pavlovia 在线测试
1. 代码已推送到 GitLab
2. 访问 Pavlovia 项目
3. 运行 Pilot 测试
4. 验证 Console 中的日志
5. 检查 Dashboard → Download Results 中的数据

---

## 关键教训

| 问题 | 原因 | 后果 | 解决方案 |
|------|------|------|---------|
| 使用 `const` 而非赋值 | 作用域隔离 | 全局变量未初始化 | 使用 `psychoJS = ...` |
| 初始化函数被注释 | 代码被禁用 | 永不执行初始化 | 取消注释启用函数调用 |
| 缺少检查 | 防御不足 | 运行时错误 | 添加 `if (psychoJS && ...)` |

---

## 状态确认

✅ **已修复** - 所有问题已解决且代码已推送
- [x] 全局变量赋值问题
- [x] 启用 initPsychoJS() 调用
- [x] 添加安全检查
- [x] 推送到 GitLab
- [x] 准备好 Pavlovia 测试
