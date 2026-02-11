/************************ 
 * Simple_Test *
 ************************/

import { core, data, sound, util, visual, hardware } from './lib/psychojs-2025.2.4.js';
const { PsychoJS } = core;
const { TrialHandler, MultiStairHandler } = data;
const { Scheduler } = util;

// store info about the experiment session:
let expName = 'simple_test';
let expInfo = {
    'participant': `${util.pad(Number.parseFloat(util.randint(0, 999999)).toFixed(0), 6)}`,
    'session': '001',
};
let PILOTING = util.getUrlParameters().has('__pilotToken');

// 实验数据容器
let experimentData = {
  startTime: null,
  endTime: null,
  participantInfo: {},
  drawingData: null
};

// init psychoJS:
const psychoJS = new PsychoJS({
  debug: true
});

// 绘制相关变量
let canvas, ctx;
let isDrawing = false;
let drawMode = 'add'; // 'add' or 'subtract'
let brushSize = 15;
let colorMatrix = null;
let canvasSize = 0;
let matrixSize = 256;
let mouseX = 0;
let mouseY = 0;
let showBrushPreview = true;
let experimentSubmitted = false;
let lastClickTime = 0;
let clickTimeout = null;
// 多次绘制相关变量
let drawingCount = 1; // 1, 2, 3
let allDrawingMatrices = []; // 存储三次的绘制矩阵

// 启动 PsychoJS
psychoJS.start({
  expName: expName,
  expInfo: expInfo,
  resources: []
}).then(() => {
  // psychoJS.start() 完成后，experiment 已经初始化
  expInfo['date'] = util.MonotonicClock.getDateStr();
  expInfo['expName'] = expName;
  expInfo['OS'] = window.navigator.platform;
  psychoJS.experiment.dataFileName = (("." + "/") + `data/${expInfo["participant"]}_${expName}_${expInfo["date"]}`);
  psychoJS.experiment.field_separator = '\t';
  console.log('✓ PsychoJS 启动完成，数据文件名已设置:', psychoJS.experiment.dataFileName);
});

psychoJS.experimentLogger.setLevel(core.Logger.ServerLevel.INFO);

// 页面加载完成
document.addEventListener('DOMContentLoaded', function() {
  console.log('📄 页面加载完成');
  
  experimentData.startTime = new Date().toISOString();
  
  // 添加输入框回车事件
  const inputs = document.querySelectorAll('input[type="text"]');
  inputs.forEach(input => {
    input.addEventListener('keypress', function(event) {
      if (event.key === 'Enter') {
        submitInfo();
      }
    });
  });
  
  // 初始化绘制界面
  setTimeout(() => {
    initDrawingInterface();
  }, 100);
});

// 提交被试信息
function submitInfo() {
  const participantId = document.getElementById('participantId').value.trim();
  const participantName = document.getElementById('participantName').value.trim();
  const participantAge = document.getElementById('participantAge').value.trim();
  
  if (!participantId || !participantName || !participantAge) {
    alert('请填写所有字段！');
    return;
  }
  
  if (isNaN(participantAge) || participantAge <= 0) {
    alert('请输入有效的年龄！');
    return;
  }
  
  // 保存到实验数据
  experimentData.participantInfo = {
    id: participantId,
    name: participantName,
    age: participantAge
  };
  
  // 更新 expInfo（供 PsychoJS 使用）
  expInfo.participant = participantId;
  expInfo.name = participantName;
  expInfo.age = participantAge;
  
  // 使用 PsychoJS 记录被试信息
  psychoJS.experiment.addData('participant_id', participantId);
  psychoJS.experiment.addData('name', participantName);
  psychoJS.experiment.addData('age', participantAge);
  psychoJS.experiment.addData('start_time', experimentData.startTime);
  psychoJS.experiment.addData('trial_type', 'participant_info');
  psychoJS.experiment.nextEntry();
  console.log('✓ 被试信息已记录到 PsychoJS');
  
  // 备用：本地存储
  try {
    localStorage.setItem(
      `participant_info_${participantId}`,
      JSON.stringify({
        id: participantId,
        name: participantName,
        age: participantAge,
        start_time: experimentData.startTime
      })
    );
    console.log('✓ 被试信息已保存到本地存储');
  } catch (error) {
    console.error('❌ 本地存储失败:', error);
  }
  
  // 显示消息
  const resultMessage = document.getElementById('resultMessage');
  resultMessage.style.display = 'block';
  resultMessage.innerHTML = `
    <strong>信息提交成功！</strong><br><br>
    被试编号：${participantId}<br>
    姓名：${participantName}<br>
    年龄：${participantAge}<br><br>
    即将显示实验说明...
  `;
  
  setTimeout(() => {
    showInstructionPage();
  }, 2000);
}

// 显示实验说明页
function showInstructionPage() {
  const root = document.getElementById('root');
  const instructionPage = document.getElementById('instructionPage');
  
  if (root) root.style.display = 'none';
  if (instructionPage) instructionPage.style.display = 'flex';
  
  console.log('📖 显示实验说明页');
}

function startFromInstructions() {
  const instructionPage = document.getElementById('instructionPage');
  if (instructionPage) instructionPage.style.display = 'none';
  showComprehensionCheckPage();
}

// 显示理解检验页
function showComprehensionCheckPage() {
  const instructionPage = document.getElementById('instructionPage');
  const comprehensionCheckPage = document.getElementById('comprehensionCheckPage');
  
  if (instructionPage) instructionPage.style.display = 'none';
  
  // 等待 DOM 完全渲染后再绑定事件
  setTimeout(() => {
    if (comprehensionCheckPage) {
      comprehensionCheckPage.style.display = 'flex';
    }
    const submitBtn = document.getElementById('submitComprehensionBtn');
    if (submitBtn) {
      submitBtn.onclick = checkComprehension;
      console.log('✓ 理解检验提交按钮事件绑定成功');
    }
  }, 50);
  
  console.log('📝 显示理解检验页');
}

// 检验理解答案
function checkComprehension() {
  console.log('🔍 开始检查理解题答案...');
  
  const q1 = document.querySelector('input[name="q1"]:checked');
  const q2 = document.querySelector('input[name="q2"]:checked');
  
  console.log('Q1 checked:', q1 ? `Yes (value: ${q1.value})` : 'No');
  console.log('Q2 checked:', q2 ? `Yes (value: ${q2.value})` : 'No');
  
  const feedback = document.getElementById('comprehensionFeedback');
  
  if (!q1 || !q2) {
    feedback.style.display = 'block';
    feedback.style.backgroundColor = '#f8d7da';
    feedback.style.color = '#721c24';
    feedback.style.border = '1px solid #f5c6cb';
    feedback.innerHTML = '<strong>❌ 请完成所有题目</strong>';
    console.log('⚠️ 有未完成的题目');
    return;
  }
  
  // 正确答案：q1=b, q2=b
  console.log(`答案: Q1=${q1.value}, Q2=${q2.value}`);
  
  if (q1.value === 'b' && q2.value === 'b') {
    feedback.style.display = 'block';
    feedback.style.backgroundColor = '#d4edda';
    feedback.style.color = '#155724';
    feedback.style.border = '1px solid #c3e6cb';
    feedback.innerHTML = '<strong>✓ 答案正确！</strong><br>即将进入绘制任务...';
    console.log('✓ 理解检验通过');
    
    setTimeout(() => {
      startDrawingTask();
    }, 1500);
  } else {
    feedback.style.display = 'block';
    feedback.style.backgroundColor = '#f8d7da';
    feedback.style.color = '#721c24';
    feedback.style.border = '1px solid #f5c6cb';
    feedback.innerHTML = '<strong>❌ 答案有误，请重新阅读说明</strong><br>3秒后返回说明页面...';
    console.log('✗ 理解检验未通过，返回说明页');
    
    document.querySelectorAll('input[type="radio"]').forEach(input => input.checked = false);
    
    setTimeout(() => {
      const comprehensionCheckPage = document.getElementById('comprehensionCheckPage');
      const instructionPage = document.getElementById('instructionPage');
      if (comprehensionCheckPage) comprehensionCheckPage.style.display = 'none';
      if (instructionPage) instructionPage.style.display = 'flex';
    }, 3000);
  }
}

// 初始化绘制界面
function initDrawingInterface() {
  canvas = document.getElementById('drawingCanvas');
  if (!canvas) return;
  
  ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  initColorMatrix();
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  // 绑定事件
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('mouseleave', handleMouseLeave);
  canvas.addEventListener('wheel', handleWheel, { passive: false });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchend', handleTouchEnd);
  
  document.addEventListener('keydown', handleKeyDown);
  
  console.log('✓ 绘制界面初始化完成');
}

function resizeCanvas() {
  if (!canvas) return;
  
  const size = Math.min(window.innerWidth, window.innerHeight) * 0.7;
  canvasSize = size;
  canvas.width = size;
  canvas.height = size;
  
  if (colorMatrix) drawCanvas();
}

function initColorMatrix() {
  colorMatrix = new Array(matrixSize);
  for (let i = 0; i < matrixSize; i++) {
    colorMatrix[i] = new Array(matrixSize).fill(0);
  }
}

function startDrawingTask() {
  const root = document.getElementById('root');
  const instructionPage = document.getElementById('instructionPage');
  const comprehensionCheckPage = document.getElementById('comprehensionCheckPage');
  const drawingInterface = document.getElementById('drawingInterface');
  
  if (root) root.style.display = 'none';
  if (instructionPage) instructionPage.style.display = 'none';
  if (comprehensionCheckPage) comprehensionCheckPage.style.display = 'none';
  if (drawingInterface) drawingInterface.style.display = 'block';
  
  experimentSubmitted = false;
  drawingCount = 1;
  allDrawingMatrices = [];
  
  resizeCanvas();
  clearCanvas();
  updateDrawingPrompt();
  
  console.log('🎨 绘制任务开始 - 第1次');
}

// 更新绘制任务提示
function updateDrawingPrompt() {
  const instructionsDiv = document.querySelector('.instructions');
  if (instructionsDiv) {
    instructionsDiv.innerHTML = `<strong>任务进度：${drawingCount}/3</strong><br>
      请绘制密度分布图<br>
      <span style="font-size:11px;">(完成后按回车或点确认)</span>`;
  }
}

function drawCanvas() {
  if (!canvas || !ctx) return;
  
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = canvas.width / 2 - 10;
  
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
  
  const imageData = ctx.createImageData(canvas.width, canvas.height);
  
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist <= radius) {
        const matrixX = Math.floor((x / canvas.width) * matrixSize);
        const matrixY = Math.floor((y / canvas.height) * matrixSize);
        
        if (matrixX >= 0 && matrixX < matrixSize && matrixY >= 0 && matrixY < matrixSize) {
          const value = colorMatrix[matrixY][matrixX];
          const idx = (y * canvas.width + x) * 4;
          imageData.data[idx] = 255;
          imageData.data[idx + 1] = Math.max(0, 255 - value);
          imageData.data[idx + 2] = Math.max(0, 255 - value);
          imageData.data[idx + 3] = 255;
        }
      }
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
  
  ctx.strokeStyle = '#999999';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();
  
  if (showBrushPreview && mouseX > 0 && mouseY > 0) {
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mouseX, mouseY, brushSize, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function applyGaussianBrush(x, y, mode) {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = canvas.width / 2 - 10;
  
  const brushRadius = brushSize;
  const sigma = brushRadius / 3;
  
  const matrixX = (x / canvas.width) * matrixSize;
  const matrixY = (y / canvas.height) * matrixSize;
  
  const matrixBrushRadius = (brushRadius / canvas.width) * matrixSize;
  
  const proportionRate = 0.15; // 每次调整为剩余/衰退比例的15%
  
  for (let dy = -matrixBrushRadius * 2; dy <= matrixBrushRadius * 2; dy++) {
    for (let dx = -matrixBrushRadius * 2; dx <= matrixBrushRadius * 2; dx++) {
      const mx = Math.floor(matrixX + dx);
      const my = Math.floor(matrixY + dy);
      
      if (mx >= 0 && mx < matrixSize && my >= 0 && my < matrixSize) {
        const canvasX = (mx / matrixSize) * canvas.width;
        const canvasY = (my / matrixSize) * canvas.height;
        const distFromCenter = Math.sqrt(
          Math.pow(canvasX - centerX, 2) + Math.pow(canvasY - centerY, 2)
        );
        
        if (distFromCenter <= radius) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          const matrixSigma = (sigma / canvas.width) * matrixSize;
          const gaussian = Math.exp(-(dist * dist) / (2 * matrixSigma * matrixSigma));
          
          const currentValue = colorMatrix[my][mx];
          let newValue;
          
          if (mode === 'add') {
            // 绘制：增加量 = (255 - 当前值) * proportionRate * 高斯权重
            const remainingCapacity = 255 - currentValue;
            const increment = remainingCapacity * proportionRate * gaussian;
            newValue = currentValue + increment;
          } else {
            // 减淡：减少量 = 当前值 * proportionRate * 高斯权重
            const decrement = currentValue * proportionRate * gaussian;
            newValue = currentValue - decrement;
          }
          
          colorMatrix[my][mx] = Math.max(0, Math.min(255, newValue));
        }
      }
    }
  }
  
  drawCanvas();
}

// 鼠标事件 - 双击切换模式
function handleMouseDown(e) {
  const now = Date.now();
  const timeDiff = now - lastClickTime;
  
  if (timeDiff < 300 && timeDiff > 0) {
    e.preventDefault();
    toggleDrawMode();
    console.log('✏️ 切换模式为: ' + (drawMode === 'add' ? '绘制' : '减淡'));
    lastClickTime = 0;
    if (clickTimeout) clearTimeout(clickTimeout);
    return;
  }
  
  lastClickTime = now;
  
  if (clickTimeout) clearTimeout(clickTimeout);
  clickTimeout = setTimeout(() => {
    lastClickTime = 0;
  }, 300);
  
  if (e.button !== 0) return;
  e.preventDefault();
  
  isDrawing = true;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  applyGaussianBrush(x, y, drawMode);
}

function handleMouseMove(e) {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
  
  showBrushPreview = true;
  
  if (isDrawing) {
    applyGaussianBrush(mouseX, mouseY, drawMode);
  } else {
    drawCanvas();
  }
}

function handleMouseUp() {
  isDrawing = false;
}

function handleMouseLeave() {
  isDrawing = false;
  mouseX = -1;
  mouseY = -1;
  showBrushPreview = false;
  drawCanvas();
}

function handleWheel(e) {
  e.preventDefault();
  
  if (e.deltaY < 0) {
    brushSize = Math.min(100, brushSize + 5);
  } else {
    brushSize = Math.max(5, brushSize - 5);
  }
  
  console.log(`🖌️ 画笔大小: ${brushSize}px`);
  drawCanvas();
}

function handleTouchStart(e) {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  mouseX = touch.clientX - rect.left;
  mouseY = touch.clientY - rect.top;
  
  isDrawing = true;
  applyGaussianBrush(mouseX, mouseY, drawMode);
}

function handleTouchMove(e) {
  e.preventDefault();
  if (!isDrawing) return;
  
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  mouseX = touch.clientX - rect.left;
  mouseY = touch.clientY - rect.top;
  
  applyGaussianBrush(mouseX, mouseY, drawMode);
}

function handleTouchEnd(e) {
  e.preventDefault();
  isDrawing = false;
}

function handleKeyDown(e) {
  const drawingInterface = document.getElementById('drawingInterface');
  if (!drawingInterface || drawingInterface.style.display !== 'block') {
    return;
  }
  
  // 如果已提交，阻止所有键盘输入
  if (experimentSubmitted) {
    e.preventDefault();
    return;
  }
  
  if (e.code === 'Space') {
    e.preventDefault();
    clearCanvas();
    console.log('🗑️ 画布已清空');
  } else if (e.code === 'Enter') {
    e.preventDefault();
    confirmDrawing();
  }
}

function clearCanvas() {
  if (!canvas || !ctx) {
    console.error('Canvas 未初始化');
    return;
  }
  initColorMatrix();
  drawCanvas();
}

function toggleDrawMode() {
  drawMode = drawMode === 'add' ? 'subtract' : 'add';
  const btn = document.getElementById('modeBtn');
  if (drawMode === 'add') {
    btn.textContent = '绘制模式';
    btn.classList.add('active');
  } else {
    btn.textContent = '减淡模式';
    btn.classList.remove('active');
  }
}

async function confirmDrawing() {
  if (experimentSubmitted) {
    console.log('⚠️ 数据已提交，请勿重复提交');
    return;
  }
  
  console.log(`✏️ 第${drawingCount}次绘制完成，保存数据...`);
  
  // 保存当前绘制矩阵的副本
  const matrixCopy = colorMatrix.map(row => [...row]);
  allDrawingMatrices.push(matrixCopy);
  
  if (drawingCount < 3) {
    // 还有更多绘制任务
    drawingCount++;
    
    // 显示间隔页面
    showDrawingIntervalPage();
    
    setTimeout(() => {
      // 清空画布，继续下一次绘制
      initColorMatrix();
      drawCanvas();
      updateDrawingPrompt();
      
      const intervalPage = document.getElementById('drawingIntervalPage');
      if (intervalPage) intervalPage.style.display = 'none';
      
      console.log(`🎨 开始第${drawingCount}次绘制`);
    }, 2000);
  } else {
    // 所有绘制任务完成，准备上传
    experimentSubmitted = true;
    
    // 计算三次绘制的变异性
    const variability = calculateVariability(allDrawingMatrices);
    console.log(`📊 三次绘制变异性: ${variability.toFixed(4)}`);
    
    // 显示"正在保存"页面
    showSavingPage();
    
    // 后台异步保存数据
    try {
      const matrixJSON = JSON.stringify(allDrawingMatrices);
      psychoJS.experiment.addData('drawing_matrices', matrixJSON);
      psychoJS.experiment.addData('matrix_size', matrixSize);
      psychoJS.experiment.addData('drawing_count', 3);
      psychoJS.experiment.addData('drawings_variability', variability);
      psychoJS.experiment.addData('trial_type', 'drawing_data');
      psychoJS.experiment.addData('drawing_time', util.MonotonicClock.getDateStr());
      psychoJS.experiment.nextEntry();
      
      // 保存到 Pavlovia 服务器
      await psychoJS.experiment.save();
      console.log('✓ 数据已成功保存到 Pavlovia 服务器');
      
      // 保存成功后更新页面显示
      updateSavingPageSuccess();
      
      // 1.5秒后自动退出
      setTimeout(() => {
        psychoJS.quit({message: 'Thank you for your patience.', isCompleted: true});
      }, 1500);
      
    } catch (error) {
      console.error('❌ 保存数据错误:', error);
      updateSavingPageError(error);
    }
    
    console.log('📊 实验数据已完整保存');
  }
}

// 显示绘制间隔页
function showDrawingIntervalPage() {
  const intervalPage = document.getElementById('drawingIntervalPage');
  
  if (intervalPage) {
    intervalPage.style.display = 'flex';
    const content = intervalPage.querySelector('.interval-content');
    if (content) {
      content.innerHTML = `
        <h2 style="color:#007bff;margin-bottom:0;font-size:28px;">请再次绘制</h2>
      `;
    }
  }
  
  console.log(`⏳ 显示第${drawingCount}次绘制准备页`);
}

// 计算三次绘制的变异性
function calculateVariability(matrices) {
  if (matrices.length < 2) return 0;
  
  let totalDifference = 0;
  let cellCount = 0;
  
  // 计算相邻两次绘制之间的平均差异
  for (let t = 0; t < matrices.length - 1; t++) {
    let iteration_difference = 0;
    for (let i = 0; i < matrixSize; i++) {
      for (let j = 0; j < matrixSize; j++) {
        const diff = Math.abs(matrices[t][i][j] - matrices[t + 1][i][j]);
        iteration_difference += diff;
      }
    }
    totalDifference += iteration_difference;
    cellCount += matrixSize * matrixSize;
  }
  
  // 返回平均差异值 (0-255范围内的标准化值)
  const meanDifference = totalDifference / cellCount;
  return meanDifference;
}

// 保存绘制数据
async function saveDrawingData() {
  console.log('💾 开始保存绘制数据...');
  
  try {
    // 转换矩阵为 JSON 字符串
    const matrixJSON = JSON.stringify(colorMatrix);
    
    // 添加数据到 PsychoJS
    psychoJS.experiment.addData('drawing_matrix', matrixJSON);
    psychoJS.experiment.addData('end_time', experimentData.endTime);
    psychoJS.experiment.addData('matrix_size', matrixSize);
    psychoJS.experiment.addData('trial_type', 'drawing_data');
    
    // 推进到下一行
    psychoJS.experiment.nextEntry();
    
    // 保存到服务器
    await psychoJS.experiment.save();
    console.log('✓ 数据已成功保存到 Pavlovia 服务器');
    
  } catch (error) {
    console.error('❌ 保存数据错误:', error);
  }
  
  // 备用：本地存储
  try {
    const sparseData = {};
    let nonZeroCount = 0;
    
    for (let i = 0; i < matrixSize; i++) {
      for (let j = 0; j < matrixSize; j++) {
        if (colorMatrix[i][j] > 0) {
          sparseData[`${i},${j}`] = Math.round(colorMatrix[i][j]);
          nonZeroCount++;
        }
      }
    }
    
    localStorage.setItem(
      `drawing_data_${experimentData.participantInfo.id}`,
      JSON.stringify({
        participant_id: experimentData.participantInfo.id,
        matrix_size: matrixSize,
        non_zero_count: nonZeroCount,
        sparse_data: sparseData,
        end_time: experimentData.endTime
      })
    );
    console.log(`✓ 本地存储: ${nonZeroCount} 个非零元素已保存`);
  } catch (error) {
    console.error('❌ 本地存储错误:', error);
  }
}

// 显示"正在保存"页面
function showSavingPage() {
  const drawingInterface = document.getElementById('drawingInterface');
  const completionPage = document.getElementById('completionPage');
  
  if (drawingInterface) drawingInterface.style.display = 'none';
  if (completionPage) {
    completionPage.style.display = 'flex';
    // 更新内容为"正在保存"
    const content = completionPage.querySelector('.completion-content');
    if (content) {
      content.innerHTML = `
        <h2 style="color: #007bff;">正在保存数据...</h2>
        <p>请稍候，不要关闭窗口</p>
        <div style="margin: 30px 0;">
          <div style="width: 50px; height: 50px; border: 5px solid #f3f3f3; border-top: 5px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
        </div>
      `;
    }
  }
  console.log('💾 显示保存中页面');
}

// 保存成功后更新页面
function updateSavingPageSuccess() {
  const completionPage = document.getElementById('completionPage');
  if (completionPage) {
    const content = completionPage.querySelector('.completion-content');
    if (content) {
      content.innerHTML = `
        <h2 style="color: #28a745;">✓ 数据保存成功！</h2>
        <p>感谢您的参与。</p>
        <p style="color: #999; font-size: 14px; margin-top: 30px;">您可以关闭此窗口。</p>
      `;
    }
  }
  console.log('✅ 更新页面：保存成功');
}

// 保存失败后更新页面
function updateSavingPageError(error) {
  const completionPage = document.getElementById('completionPage');
  if (completionPage) {
    const content = completionPage.querySelector('.completion-content');
    if (content) {
      content.innerHTML = `
        <h2 style="color: #dc3545;">保存失败</h2>
        <p>数据可能未成功上传到服务器</p>
        <p style="font-size: 14px; color: #666;">错误信息：${error.message || '未知错误'}</p>
        <p style="color: #999; font-size: 14px; margin-top: 30px;">请联系实验管理员</p>
      `;
    }
  }
  console.error('❌ 更新页面：保存失败', error);
}

// 显示完成页面
function showCompletionPage() {
  const drawingInterface = document.getElementById('drawingInterface');
  const completionPage = document.getElementById('completionPage');
  
  if (drawingInterface) drawingInterface.style.display = 'none';
  if (completionPage) completionPage.style.display = 'flex';
  
  console.log('✅ 实验完成，显示完成页面');
  
  // 5 秒后退出
  setTimeout(() => {
    psychoJS.quit({message: 'Thank you for your patience.', isCompleted: true});
  }, 5000);
}

// 导出全局函数
window.submitInfo = submitInfo;
window.showInstructionPage = showInstructionPage;
window.startFromInstructions = startFromInstructions;
window.showComprehensionCheckPage = showComprehensionCheckPage;
window.checkComprehension = checkComprehension;
window.clearCanvas = clearCanvas;
window.confirmDrawing = confirmDrawing;
window.toggleDrawMode = toggleDrawMode;
