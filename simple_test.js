/************************ 
 * Simple_Test *
 * 使用 PsychoJS 的在线实验脚本
 ************************/

// PsychoJS 实例
let psychoJS;
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

// 初始化 PsychoJS
function initPsychoJS() {
  psychoJS = new PsychoJS({
    debug: true
  });
  
  // 不打开窗口，我们使用自定义界面
  psychoJS.experimentLogger.setLevel(psychoJS.logging.EXP);
  
  console.log('PsychoJS 初始化完成');
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
  console.log('实验页面加载完成');
  experimentData.startTime = new Date().toISOString();
  
  // 初始化 PsychoJS
  initPsychoJS();
  
  // 检测移动设备
  if (isMobileDevice()) {
    document.getElementById('mobileControls').style.display = 'flex';
    document.getElementById('mobileInstructions').style.display = 'inline';
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
  
  // 初始化绘制界面
  initDrawingInterface();
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
    即将进入绘制界面...
  `;
  
  // 禁用输入框和按钮
  document.querySelectorAll('input').forEach(input => input.disabled = true);
  document.querySelector('button').disabled = true;
  
  // 2秒后进入绘制界面
  setTimeout(() => {
    startDrawingTask();
  }, 2000);
}

// 保存被试信息到 CSV
function saveParticipantInfo() {
  const csvContent = 'participant_id,name,age,start_time\n' +
    `${experimentData.participantInfo.id},${experimentData.participantInfo.name},${experimentData.participantInfo.age},${experimentData.startTime}`;
  
  // 使用 PsychoJS 保存
  if (psychoJS) {
    psychoJS.experiment.addData('participant_id', experimentData.participantInfo.id);
    psychoJS.experiment.addData('name', experimentData.participantInfo.name);
    psychoJS.experiment.addData('age', experimentData.participantInfo.age);
    psychoJS.experiment.addData('start_time', experimentData.startTime);
    psychoJS.experiment.nextEntry();
  }
  
  // 同时下载本地备份
  downloadCSV(csvContent, `participant_${experimentData.participantInfo.id}_info.csv`);
  
  console.log('被试信息已保存');
}

// 初始化绘制界面
function initDrawingInterface() {
  canvas = document.getElementById('drawingCanvas');
  ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  // 设置画布大小
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  // 初始化颜色矩阵
  initColorMatrix();
  
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
}

// 调整画布大小
function resizeCanvas() {
  const size = Math.min(window.innerWidth, window.innerHeight) * 0.7;
  canvasSize = size;
  canvas.width = size;
  canvas.height = size;
  
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
  document.getElementById('root').style.display = 'none';
  document.getElementById('drawingInterface').style.display = 'block';
  
  // 清空画布
  clearCanvas();
  
  console.log('绘制任务开始');
}

// 绘制画布
function drawCanvas() {
  // 清空画布
  ctx.fillStyle = '#2c2c2c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // 绘制白色圆环
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2 - 10, 0, Math.PI * 2);
  ctx.stroke();
  
  // 绘制颜色矩阵
  const imageData = ctx.createImageData(canvas.width, canvas.height);
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = canvas.width / 2 - 10;
  
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // 只在圆环内绘制
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
  
  // 重新绘制白色圆环（覆盖在颜色上）
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();
  
  // 绘制画笔预览
  if (showBrushPreview && mouseX > 0 && mouseY > 0) {
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
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
          
          const intensity = gaussian * 50; // 调整强度
          
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
  isDrawing = true;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  drawMode = e.button === 2 ? 'subtract' : 'add';
  applyGaussianBrush(x, y, drawMode);
}

function handleMouseMove(e) {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
  
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
  
  document.getElementById('brushSizeDisplay').textContent = brushSize;
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
  if (e.code === 'Space') {
    e.preventDefault();
    clearCanvas();
  } else if (e.code === 'Enter') {
    e.preventDefault();
    confirmDrawing();
  }
}

// 清空画布
function clearCanvas() {
  initColorMatrix();
  drawCanvas();
  console.log('画布已清空');
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
  experimentData.endTime = new Date().toISOString();
  experimentData.drawingData = colorMatrix;
  
  console.log('绘制完成，保存数据...');
  
  // 保存颜色矩阵
  saveColorMatrix();
  
  // 显示完成信息
  alert('实验完成！数据已保存，感谢您的参与。');
  
  console.log('实验数据：', experimentData);
}

// 保存颜色矩阵
function saveColorMatrix() {
  // 将矩阵转换为 CSV 格式
  let csvContent = '';
  for (let i = 0; i < matrixSize; i++) {
    csvContent += colorMatrix[i].join(',') + '\n';
  }
  
  // 使用 PsychoJS 保存
  if (psychoJS) {
    psychoJS.experiment.addData('drawing_matrix', JSON.stringify(colorMatrix));
    psychoJS.experiment.addData('end_time', experimentData.endTime);
    psychoJS.experiment.addData('matrix_size', matrixSize);
    psychoJS.experiment.nextEntry();
    
    // 保存实验
    psychoJS.experiment.save({
      attributes: experimentData
    });
  }
  
  // 下载 CSV 文件
  downloadCSV(csvContent, `participant_${experimentData.participantInfo.id}_drawing.csv`);
  
  console.log('颜色矩阵已保存');
}

// 下载 CSV 文件
function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  console.log(`文件已下载: ${filename}`);
}

// 导出函数供外部调用
window.submitInfo = submitInfo;
window.clearCanvas = clearCanvas;
window.confirmDrawing = confirmDrawing;
window.toggleDrawMode = toggleDrawMode;
