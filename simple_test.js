/************************ 
 * Simple_Test *
 * 参考 terrain_painter.js 实现
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

// init psychoJS:
const psychoJS = new PsychoJS({
  debug: true
});

// open window:
psychoJS.openWindow({
  fullscr: false,
  color: new util.Color([0,0,0]),
  units: 'height',
  waitBlanking: true,
  backgroundImage: '',
  backgroundFit: 'none',
});

// schedule the experiment:
psychoJS.schedule(psychoJS.gui.DlgFromDict({
  dictionary: expInfo,
  title: expName
}));

const flowScheduler = new Scheduler(psychoJS);
const dialogCancelScheduler = new Scheduler(psychoJS);
psychoJS.scheduleCondition(function() { return (psychoJS.gui.dialogComponent.button === 'OK'); },flowScheduler, dialogCancelScheduler);

// flowScheduler gets run if the participants presses OK
flowScheduler.add(updateInfo);
flowScheduler.add(experimentInit);
flowScheduler.add(trialRoutineBegin());
flowScheduler.add(trialRoutineEachFrame());
flowScheduler.add(trialRoutineEnd());
flowScheduler.add(quitPsychoJS, 'Thank you for your patience.', true);

// quit if user presses Cancel in dialog box:
dialogCancelScheduler.add(quitPsychoJS, 'Thank you for your patience.', false);

psychoJS.start({
  expName: expName,
  expInfo: expInfo,
  resources: []
});

psychoJS.experimentLogger.setLevel(core.Logger.ServerLevel.INFO);

// 绘制相关变量
let canvas, ctx;
let isDrawing = false;
let drawMode = 'add'; // 'add' or 'subtract'
let brushSize = 30;
let colorMatrix = null;
let canvasSize = 0;
let matrixSize = 256;
let mouseX = 0;
let mouseY = 0;
let showBrushPreview = true;
let experimentSubmitted = false;
let inDrawingPhase = false;
let lastClickTime = 0;
let clickTimeout = null;

var currentLoop;
var frameDur;
var trialClock;
var globalClock;
var routineTimer;

async function updateInfo() {
  currentLoop = psychoJS.experiment;
  expInfo['date'] = util.MonotonicClock.getDateStr();
  expInfo['expName'] = expName;
  expInfo['psychopyVersion'] = '2025.2.4';
  expInfo['OS'] = window.navigator.platform;

  expInfo['frameRate'] = psychoJS.window.getActualFrameRate();
  if (typeof expInfo['frameRate'] !== 'undefined')
    frameDur = 1.0 / Math.round(expInfo['frameRate']);
  else
    frameDur = 1.0 / 60.0;

  util.addInfoFromUrl(expInfo);
  
  psychoJS.experiment.dataFileName = (("." + "/") + `data/${expInfo["participant"]}_${expName}_${expInfo["date"]}`);
  psychoJS.experiment.field_separator = '\t';

  return Scheduler.Event.NEXT;
}

async function experimentInit() {
  trialClock = new util.Clock();
  globalClock = new util.Clock();
  routineTimer = new util.CountdownTimer();
  
  // 初始化绘制界面
  initDrawingInterface();
  
  return Scheduler.Event.NEXT;
}

function trialRoutineBegin(snapshot) {
  return async function () {
    showParticipantForm();
    return Scheduler.Event.NEXT;
  }
}

function trialRoutineEachFrame() {
  return async function () {
    return Scheduler.Event.NEXT;
  };
}

function trialRoutineEnd(snapshot) {
  return async function () {
    return Scheduler.Event.NEXT;
  }
}

async function quitPsychoJS(message, isCompleted) {
  if (psychoJS.experiment.isEntryEmpty()) {
    psychoJS.experiment.nextEntry();
  }
  psychoJS.window.close();
  psychoJS.quit({message: message, isCompleted: isCompleted});
  
  return Scheduler.Event.QUIT;
}

// 显示被试信息表单
function showParticipantForm() {
  const root = document.getElementById('root');
  if (root) root.style.display = 'block';
}

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
  
  // 记录被试信息到 PsychoJS
  psychoJS.experiment.addData('participant_id', participantId);
  psychoJS.experiment.addData('name', participantName);
  psychoJS.experiment.addData('age', participantAge);
  psychoJS.experiment.addData('trial_type', 'participant_info');
  psychoJS.experiment.addData('info_time', util.MonotonicClock.getDateStr());
  psychoJS.experiment.nextEntry();
  
  // 更新 expInfo
  expInfo.participant = participantId;
  
  console.log('✓ 被试信息已记录');
  
  // 显示说明页
  const resultMessage = document.getElementById('resultMessage');
  resultMessage.style.display = 'block';
  resultMessage.innerHTML = `
    <strong>信息提交成功！</strong><br><br>
    被试编号：${participantId}<br>
    姓名：${participantName}<br>
    年龄：${participantAge}<br><br>
    即将显示实验说明...
  `;
  
  document.querySelectorAll('input').forEach(input => input.disabled = true);
  document.querySelector('button').disabled = true;
  
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
  startDrawingTask();
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
  const drawingInterface = document.getElementById('drawingInterface');
  
  if (root) root.style.display = 'none';
  if (instructionPage) instructionPage.style.display = 'none';
  if (drawingInterface) drawingInterface.style.display = 'block';
  
  inDrawingPhase = true;
  experimentSubmitted = false;
  
  resizeCanvas();
  clearCanvas();
  
  console.log('🎨 绘制任务开始');
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
          
          const intensity = gaussian * 25;
          
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
  
  experimentSubmitted = true;
  inDrawingPhase = false;
  
  console.log('✏️ 绘制完成，保存数据...');
  
  const buttons = document.querySelectorAll('.control-btn');
  buttons.forEach(btn => btn.disabled = true);
  
  // 保存绘制数据到 PsychoJS
  const matrixJSON = JSON.stringify(colorMatrix);
  psychoJS.experiment.addData('drawing_matrix', matrixJSON);
  psychoJS.experiment.addData('matrix_size', matrixSize);
  psychoJS.experiment.addData('trial_type', 'drawing_data');
  psychoJS.experiment.addData('drawing_time', util.MonotonicClock.getDateStr());
  psychoJS.experiment.nextEntry();
  
  // 保存到 Pavlovia 服务器
  try {
    await psychoJS.experiment.save();
    console.log('✓ 数据已成功保存到 Pavlovia 服务器');
  } catch (error) {
    console.error('❌ 保存数据错误:', error);
  }
  
  // 显示完成页
  setTimeout(() => {
    showCompletionPage();
  }, 500);
}

function showCompletionPage() {
  const drawingInterface = document.getElementById('drawingInterface');
  const completionPage = document.getElementById('completionPage');
  
  if (drawingInterface) drawingInterface.style.display = 'none';
  if (completionPage) completionPage.style.display = 'flex';
  
  console.log('✅ 实验完成，显示完成页面');
  
  // 5 秒后结束实验
  setTimeout(() => {
    psychoJS.quit('Thank you for your patience.', true);
  }, 5000);
}

// 导出全局函数
window.submitInfo = submitInfo;
window.showInstructionPage = showInstructionPage;
window.startFromInstructions = startFromInstructions;
window.clearCanvas = clearCanvas;
window.confirmDrawing = confirmDrawing;
window.toggleDrawMode = toggleDrawMode;
