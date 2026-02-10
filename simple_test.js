/************************ 
 * Simple_Test *
 * 使用 PsychoJS 的在线实验脚本
 ************************/

// PsychoJS 实例（可能为 null）
let psychoJS = null;
let expInfo = {
  participant: '',
  name: '',
  age: ''
};

// 实验数据
let experimentData = {
  expName: 'simple_test',
  startTime: null,
  endTime: null,
  participantInfo: {},
  drawingData: null
};

// 绘制相关变量
let canvas, ctx;
let isDrawing = false;
let drawMode = 'add'; // 'add' or 'subtract'
let brushSize = 30;
let colorMatrix = null;
let canvasSize = 0;
let matrixSize = 256; // 颜色矩阵大小

// 鼠标位置和画笔预览
let mouseX = 0;
let mouseY = 0;
let showBrushPreview = true;

// 实验状态控制
let experimentSubmitted = false;  // 防止重复提交
let inDrawingPhase = false;  // 是否在绘制阶段

// 初始化 PsychoJS（延迟初始化）
function initPsychoJS() {
  // 尝试使用 PsychoJS，如果不可用则跳过
  if (typeof PsychoJS !== 'undefined') {
    try {
      psychoJS = new PsychoJS({
        debug: true
      });
      
      // 设置实验名称和数据文件路径
      psychoJS.setRedirectUrls(
        'https://pavlovia.org',  // 完成后跳转
        'https://pavlovia.org'   // 取消后跳转
      );
      
      // 开始实验
      psychoJS.start({
        expName: experimentData.expName,
        expInfo: expInfo,
        resources: []
      }).then(() => {
        console.log('PsychoJS 启动成功');
      }).catch((error) => {
        console.error('PsychoJS 启动失败:', error);
        psychoJS = null;
      });
      
      console.log('PsychoJS 初始化完成');
    } catch (error) {
      console.error('PsychoJS 初始化错误:', error);
      psychoJS = null;
    }
  } else {
    console.log('PsychoJS 库未加载，继续使用本地存储');}
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
  console.log('实验页面加载完成');
  experimentData.startTime = new Date().toISOString();
  
  // 初始化 PsychoJS
  try {
    initPsychoJS();
  } catch (error) {
    console.error('PsychoJS 初始化失败:', error);
  }
  
  // 添加输入框的回车事件监听
  const inputs = document.querySelectorAll('input[type="text"]');
  inputs.forEach(input => {
    input.addEventListener('keypress', function(event) {
      if (event.key === 'Enter') {
        submitInfo();
      }
    });
  });
  
  // 初始化绘制界面（延迟初始化，确保 DOM 完全加载）
  setTimeout(() => {
    initDrawingInterface();
  }, 100);
});

// 检测是否为移动设备
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (window.innerWidth <= 768);
}

// 提交信息函数
function submitInfo() {
  // 获取输入值
  const participantId = document.getElementById('participantId').value.trim();
  const participantName = document.getElementById('participantName').value.trim();
  const participantAge = document.getElementById('participantAge').value.trim();
  
  // 验证输入
  if (!participantId) {
    alert('请输入被试编号！');
    document.getElementById('participantId').focus();
    return;
  }
  
  if (!participantName) {
    alert('请输入姓名！');
    document.getElementById('participantName').focus();
    return;
  }
  
  if (!participantAge) {
    alert('请输入年龄！');
    document.getElementById('participantAge').focus();
    return;
  }
  
  // 验证年龄是否为数字
  if (isNaN(participantAge) || participantAge <= 0) {
    alert('请输入有效的年龄！');
    document.getElementById('participantAge').focus();
    return;
  }
  
  // 存储数据
  experimentData.participantInfo = {
    id: participantId,
    name: participantName,
    age: participantAge
  };
  
  expInfo.participant = participantId;
  expInfo.name = participantName;
  expInfo.age = participantAge;
  
  // 保存被试信息
  saveParticipantInfo();
  
  // 显示成功消息
  const resultMessage = document.getElementById('resultMessage');
  resultMessage.style.display = 'block';
  resultMessage.innerHTML = `
    <strong>信息提交成功！</strong><br><br>
    被试编号：${participantId}<br>
    姓名：${participantName}<br>
    年龄：${participantAge}<br><br>
    即将显示实验说明...
  `;
  
  // 禁用输入框和按钮
  document.querySelectorAll('input').forEach(input => input.disabled = true);
  document.querySelector('button').disabled = true;
  
  // 2秒后显示实验说明页
  setTimeout(() => {
    showInstructionPage();
  }, 2000);
}

// 显示实验说明页
function showInstructionPage() {
  const root = document.getElementById('root');
  const instructionPage = document.getElementById('instructionPage');
  
  if (root) root.style.display = 'none';
  if (instructionPage) {
    instructionPage.style.display = 'flex';
  }
  
  console.log('显示实验说明页');
}

// 从说明页开始实验
function startFromInstructions() {
  const instructionPage = document.getElementById('instructionPage');
  if (instructionPage) {
    instructionPage.style.display = 'none';
  }
  startDrawingTask();
}

// 保存被试信息到 Pavlovia
function saveParticipantInfo() {
  // 使用 PsychoJS 保存到服务器（如果可用）
  if (psychoJS && psychoJS.experiment) {
    try {
      psychoJS.experiment.addData('participant_id', experimentData.participantInfo.id);
      psychoJS.experiment.addData('name', experimentData.participantInfo.name);
      psychoJS.experiment.addData('age', experimentData.participantInfo.age);
      psychoJS.experiment.addData('start_time', experimentData.startTime);
      psychoJS.experiment.addData('trial_type', 'participant_info');
      psychoJS.experiment.nextEntry();
      console.log('被试信息已保存到 Pavlovia');
    } catch (error) {
      console.error('保存被试信息错误:', error);
    }
  } else {
    console.log('PsychoJS 未可用，使用本地存储');
  }
  
  // 备用：也保存到 localStorage 作为备份
  try {
    localStorage.setItem(
      `participant_info_${experimentData.participantInfo.id}`,
      JSON.stringify({
        id: experimentData.participantInfo.id,
        name: experimentData.participantInfo.name,
        age: experimentData.participantInfo.age,
        start_time: experimentData.startTime
      })
    );
    console.log('被试信息已保存到本地 localStorage');
  } catch (error) {
    console.error('本地保存错误:', error);
  }
}

// 初始化绘制界面
function initDrawingInterface() {
  canvas = document.getElementById('drawingCanvas');
  if (!canvas) {
    console.error('Canvas 元素未找到');
    return;
  }
  
  ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  // 初始化颜色矩阵
  initColorMatrix();
  
  // 设置画布大小
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  // 绑定事件
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('mouseleave', handleMouseLeave);
  canvas.addEventListener('wheel', handleWheel, { passive: false });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  
  // 触摸事件（移动设备）
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchend', handleTouchEnd);
  
  // 键盘事件
  document.addEventListener('keydown', handleKeyDown);
  
  console.log('绘制界面初始化完成');
}

// 调整画布大小
function resizeCanvas() {
  if (!canvas) return;
  
  const size = Math.min(window.innerWidth, window.innerHeight) * 0.7;
  canvasSize = size;
  canvas.width = size;
  canvas.height = size;
  
  console.log(`Canvas 尺寸设置为: ${size}px`);
  
  // 立即绘制画布
  if (colorMatrix) {
    drawCanvas();
  }
}

// 初始化颜色矩阵
function initColorMatrix() {
  colorMatrix = new Array(matrixSize);
  for (let i = 0; i < matrixSize; i++) {
    colorMatrix[i] = new Array(matrixSize).fill(0);
  }
}

// 开始绘制任务
function startDrawingTask() {
  const root = document.getElementById('root');
  const instructionPage = document.getElementById('instructionPage');
  const drawingInterface = document.getElementById('drawingInterface');
  
  if (root) root.style.display = 'none';
  if (instructionPage) instructionPage.style.display = 'none';
  if (drawingInterface) drawingInterface.style.display = 'block';
  
  // 设置实验状态
  inDrawingPhase = true;
  experimentSubmitted = false;
  
  // 重新设置画布大小
  resizeCanvas();
  
  // 清空画布并绘制初始状态
  clearCanvas();
  
  console.log('绘制任务开始');
}

// 绘制画布
function drawCanvas() {
  if (!canvas || !ctx) return;
  
  // 清空画布 - 黑色背景
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = canvas.width / 2 - 10;
  
  // 绘制白色圆盘背景
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
  
  // 绘制颜色矩阵
  const imageData = ctx.createImageData(canvas.width, canvas.height);
  
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // 只在圆盘内绘制
      if (dist <= radius) {
        const matrixX = Math.floor((x / canvas.width) * matrixSize);
        const matrixY = Math.floor((y / canvas.height) * matrixSize);
        
        if (matrixX >= 0 && matrixX < matrixSize && matrixY >= 0 && matrixY < matrixSize) {
          const value = colorMatrix[matrixY][matrixX];
          const idx = (y * canvas.width + x) * 4;
          imageData.data[idx] = value;     // R
          imageData.data[idx + 1] = 0;     // G
          imageData.data[idx + 2] = 0;     // B
          imageData.data[idx + 3] = 255;   // A
        }
      }
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
  
  // 重新绘制白色圆圈边界
  ctx.strokeStyle = '#999999';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();
  
  // 绘制画笔预览
  if (showBrushPreview && mouseX > 0 && mouseY > 0) {
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mouseX, mouseY, brushSize, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// 应用高斯画笔
function applyGaussianBrush(x, y, mode) {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = canvas.width / 2 - 10;
  
  const brushRadius = brushSize;
  const sigma = brushRadius / 3;
  
  const matrixX = (x / canvas.width) * matrixSize;
  const matrixY = (y / canvas.height) * matrixSize;
  
  const matrixBrushRadius = (brushRadius / canvas.width) * matrixSize;
  
  for (let dy = -matrixBrushRadius * 2; dy <= matrixBrushRadius * 2; dy++) {
    for (let dx = -matrixBrushRadius * 2; dx <= matrixBrushRadius * 2; dx++) {
      const mx = Math.floor(matrixX + dx);
      const my = Math.floor(matrixY + dy);
      
      if (mx >= 0 && mx < matrixSize && my >= 0 && my < matrixSize) {
        // 检查是否在圆环内
        const canvasX = (mx / matrixSize) * canvas.width;
        const canvasY = (my / matrixSize) * canvas.height;
        const distFromCenter = Math.sqrt(
          Math.pow(canvasX - centerX, 2) + Math.pow(canvasY - centerY, 2)
        );
        
        if (distFromCenter <= radius) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          const matrixSigma = (sigma / canvas.width) * matrixSize;
          const gaussian = Math.exp(-(dist * dist) / (2 * matrixSigma * matrixSigma));
          
          const intensity = gaussian * 25; // 减半强度
          
          if (mode === 'add') {
            colorMatrix[my][mx] = Math.min(255, colorMatrix[my][mx] + intensity);
          } else {
            colorMatrix[my][mx] = Math.max(0, colorMatrix[my][mx] - intensity);
          }
        }
      }
    }
  }
  
  drawCanvas();
}

// 鼠标事件处理
function handleMouseDown(e) {
  if (e.button !== 0) return; // 只响应左键
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
  
  console.log(`画笔大小: ${brushSize}px`);
  drawCanvas();
}

// 触摸事件处理（移动设备）
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

// 键盘事件处理
function handleKeyDown(e) {
  // 只在绘制界面显示时才响应
  const drawingInterface = document.getElementById('drawingInterface');
  if (!drawingInterface || drawingInterface.style.display !== 'block') {
    return;
  }
  
  if (e.code === 'Space') {
    e.preventDefault();
    clearCanvas();
    console.log('画布已清空');
  } else if (e.code === 'Enter') {
    e.preventDefault();
    confirmDrawing();
  }
}

// 清空画布
function clearCanvas() {
  if (!canvas || !ctx) {
    console.error('Canvas 未初始化');
    return;
  }
  initColorMatrix();
  drawCanvas();
}

// 切换绘制模式（移动设备）
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

// 确认绘制
function confirmDrawing() {
  // 防止重复提交
  if (experimentSubmitted) {
    console.log('数据已提交，请勿重复提交');
    return;
  }
  
  experimentSubmitted = true;
  inDrawingPhase = false;
  
  experimentData.endTime = new Date().toISOString();
  experimentData.drawingData = colorMatrix;
  
  console.log('绘制完成，保存数据...');
  
  // 禁用所有按钮
  const buttons = document.querySelectorAll('.control-btn');
  buttons.forEach(btn => btn.disabled = true);
  
  // 保存颜色矩阵
  saveColorMatrix();
  
  // 显示完成页面（而非弹窗）
  setTimeout(() => {
    showCompletionPage();
  }, 500);
  
  console.log('实验数据：', experimentData);
}

// 保存颜色矩阵到 Pavlovia
function saveColorMatrix() {
  console.log('开始保存颜色矩阵...');
  
  // 使用 PsychoJS 保存到服务器（如果可用）
  if (psychoJS && psychoJS.experiment) {
    try {
      const matrixJSON = JSON.stringify(colorMatrix);
      psychoJS.experiment.addData('drawing_matrix', matrixJSON);
      psychoJS.experiment.addData('end_time', experimentData.endTime);
      psychoJS.experiment.addData('matrix_size', matrixSize);
      psychoJS.experiment.addData('trial_type', 'drawing_data');
      psychoJS.experiment.nextEntry();
      
      if (psychoJS.experiment.save) {
        psychoJS.experiment.save().then(() => {
          console.log('颜色矩阵已成功保存到 Pavlovia');
        }).catch((error) => {
          console.error('保存到 Pavlovia 失败:', error);
        });
      }
    } catch (error) {
      console.error('保存数据错误:', error);
    }
  } else {
    console.log('PsychoJS 未可用，使用本地存储');
  }
  
  // 备用：保存到 localStorage
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
    console.log(`颜色矩阵已保存到本地 localStorage (${nonZeroCount} 个非零元素)`);
  } catch (error) {
    console.error('本地保存错误:', error);
  }
}

// 注意：数据现在直接保存到 Pavlovia 服务器
// 实验开发者可以通过 Pavlovia dashboard 下载 results

// 显示实验完成页面
function showCompletionPage() {
  const drawingInterface = document.getElementById('drawingInterface');
  const completionPage = document.getElementById('completionPage');
  
  if (drawingInterface) drawingInterface.style.display = 'none';
  if (completionPage) completionPage.style.display = 'flex';
  
  console.log('显示实验完成页面');
  
  // 5秒后尝试退出实验
  setTimeout(() => {
    if (psychoJS && psychoJS.quit) {
      psychoJS.quit();
    }
  }, 5000);
}

// 导出函数供外部调用
window.submitInfo = submitInfo;
window.showInstructionPage = showInstructionPage;
window.startFromInstructions = startFromInstructions;
window.showCompletionPage = showCompletionPage;
window.clearCanvas = clearCanvas;
window.confirmDrawing = confirmDrawing;
window.toggleDrawMode = toggleDrawMode;
