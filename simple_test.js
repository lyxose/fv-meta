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
// 暴露到全局，供访问层注入脚本捕获 save() 并回传数据到 R2
window.psychoJS = psychoJS;
window.psychojs = psychoJS;

// 绘制相关变量
let canvas, ctx;
let isDrawing = false;
let drawMode = 'add'; // 'add' or 'subtract'
let brushSize = 15;
const brushDiameterRatio = 0.10; // 画笔直径 = 白色圆盘直径 * 1/10
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
let drawingCount = 1; // 1, 2
let allDrawingMatrices = []; // 存储两次的绘制矩阵
let currentNotification = null; // 存储当前显示的提示框
let enableBrushSizeAdjust = false; // 开关：是否允许调整画笔大小
let gazeDistributionDescription = ''; // 被试对注视分布的文字描述

// 全屏与窗口监控
let screenViolationCount = 0;
let experimentTerminated = false;
let experimentCompleted = false;
let lastViolationTime = 0;
const violationDebounceMs = 900;
let pendingViolationWarningReason = '';
let orientationMaskEl = null;
let experimentPausedForRecovery = false;
let pauseOverlayEl = null;
let orientationOutOfRange = false;
let orientationGuardListener = null;
let screenSecurityArmed = false; // 仅在同意后启用违规计数
let fullscreenEntryConfirmed = false; // 仅在确认已进入全屏后才统计退出
let screenSecurityArmAt = 0;
let fullscreenConfirmedAt = 0;
const fullscreenGuardGraceMs = 1200;

// 姿态/陀螺仪检测
let orientationListener = null;
let orientationStableStart = null;
let orientationReady = false;
let orientationPermissionState = 'unknown';
let hasGyroscope = false;
let orientationSamples = [];

// 绘制时序记录
let drawingTimeline = [];
let drawingTaskStartTime = null;
let firstDrawingActivityTime = 0;

// 绘制时长检验参数和变量
const minDrawingTime = 6000; // 首次绘制最少需要的操作时长（毫秒）
let totalDrawingActivityTime = 0; // 累计绘制活动时长（毫秒）
let activityStartTime = null; // 当前操作块的开始时间

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
  setupScreenSecurity();
  window.onConsentAccepted = handleConsentAccepted;
  
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

function isLikelyMobileDevice() {
  const ua = navigator.userAgent || '';
  return /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(ua);
}

const MOBILE_SESSION = isLikelyMobileDevice();

function getFullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement || null;
}

function isInFullscreen() {
  return !!getFullscreenElement();
}

async function requestFullscreenSafe() {
  const el = document.documentElement;
  if (!el) return false;
  try {
    if (el.requestFullscreen) {
      await el.requestFullscreen();
      return true;
    }
    if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
      return true;
    }
    if (el.msRequestFullscreen) {
      el.msRequestFullscreen();
      return true;
    }
  } catch (e) {
    console.warn('⚠️ 全屏请求失败:', e && e.message ? e.message : e);
  }
  return false;
}

async function exitFullscreenSafe() {
  try {
    if (!isInFullscreen()) return true;
    if (document.exitFullscreen) {
      await document.exitFullscreen();
      return true;
    }
    if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
      return true;
    }
    if (document.msExitFullscreen) {
      document.msExitFullscreen();
      return true;
    }
  } catch (e) {
    console.warn('⚠️ 退出全屏失败:', e && e.message ? e.message : e);
  }
  return false;
}

async function lockPortraitSafe() {
  if (!MOBILE_SESSION) return true;
  try {
    if (screen.orientation && typeof screen.orientation.lock === 'function') {
      await screen.orientation.lock('portrait');
      return true;
    }
  } catch (e) {
    console.warn('⚠️ 竖屏锁定失败:', e && e.message ? e.message : e);
  }
  return false;
}

async function ensurePortraitFullscreen() {
  if (!isInFullscreen()) {
    await requestFullscreenSafe();
  }
  if (MOBILE_SESSION) {
    await lockPortraitSafe();
    if (window.innerWidth > window.innerHeight) {
      await new Promise((resolve) => setTimeout(resolve, 120));
      if (!isInFullscreen()) {
        await requestFullscreenSafe();
      }
      await lockPortraitSafe();
    }
  }
  updateOrientationMask();
}

function ensureOrientationMask() {
  if (orientationMaskEl) return orientationMaskEl;
  const mask = document.createElement('div');
  mask.id = 'orientationMask';
  mask.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 4000;
    display: none;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.85);
    color: #fff;
    text-align: center;
    padding: 24px;
    font-size: 18px;
    font-weight: 700;
  `;
  mask.innerHTML = '<div id="orientationMaskText">请保持手机竖屏，不允许横屏旋转。</div>';
  document.body.appendChild(mask);
  orientationMaskEl = mask;
  return mask;
}

function updateOrientationMask() {
  if (!MOBILE_SESSION) {
    if (orientationMaskEl) orientationMaskEl.style.display = 'none';
    return;
  }
  const mask = ensureOrientationMask();
  const isLandscape = window.innerWidth > window.innerHeight;
  const needMask = isLandscape || orientationOutOfRange;
  mask.style.display = needMask ? 'flex' : 'none';
  const textEl = document.getElementById('orientationMaskText');
  if (textEl) {
    if (isLandscape) {
      textEl.textContent = '请保持手机竖屏，不允许横屏旋转。';
    } else if (orientationOutOfRange) {
      textEl.textContent = '请保持手机底边与桌面平行（偏差过大，已暂停可视区域）。';
    } else {
      textEl.textContent = '请保持手机竖屏，不允许横屏旋转。';
    }
  }
}

function ensurePauseOverlay() {
  if (pauseOverlayEl) return pauseOverlayEl;
  const overlay = document.createElement('div');
  overlay.id = 'pauseOverlay';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 4500;
    display: none;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.72);
    color: #fff;
    text-align: center;
    padding: 20px;
  `;
  overlay.innerHTML = `
    <div style="max-width:560px;width:92vw;background:rgba(20,20,20,0.92);border:1px solid rgba(255,255,255,0.2);border-radius:12px;padding:22px;">
      <h3 style="margin:0 0 10px 0;font-size:24px;">实验已暂停</h3>
      <p id="pauseOverlayReason" style="margin:0 0 14px 0;line-height:1.8;color:#e6e6e6;">检测到您退出全屏或离开实验窗口，请恢复后继续。</p>
      <p style="margin:0 0 14px 0;line-height:1.8;color:#ffd6d6;">本次为第一次违规，再次发生将终止实验。</p>
      <button id="pauseResumeBtn" style="padding:12px 20px;border:0;border-radius:8px;background:#0d6efd;color:#fff;font-weight:700;cursor:pointer;">恢复全屏并继续</button>
    </div>
  `;
  document.body.appendChild(overlay);
  const resumeBtn = overlay.querySelector('#pauseResumeBtn');
  if (resumeBtn) {
    resumeBtn.addEventListener('click', async () => {
      await ensurePortraitFullscreen();
      if (isInFullscreen() && document.visibilityState === 'visible') {
        experimentPausedForRecovery = false;
        overlay.style.display = 'none';
      }
    });
  }
  pauseOverlayEl = overlay;
  return overlay;
}

function pauseExperimentForRecovery(reason) {
  experimentPausedForRecovery = true;
  if (drawingCount === 1 && isDrawing && activityStartTime !== null) {
    totalDrawingActivityTime += Date.now() - activityStartTime;
    activityStartTime = null;
  }
  isDrawing = false;
  const overlay = ensurePauseOverlay();
  const reasonEl = document.getElementById('pauseOverlayReason');
  if (reasonEl) {
    reasonEl.textContent = `检测到异常：${reason}。请恢复全屏并返回实验页面后继续。`;
  }
  overlay.style.display = 'flex';
}

function startOrientationGuardMonitor() {
  if (!MOBILE_SESSION || !hasGyroscope || orientationGuardListener) return;
  orientationGuardListener = function(event) {
    if (experimentTerminated) return;
    const gamma = Number.isFinite(event.gamma) ? event.gamma : null;
    if (gamma === null) return;
    orientationOutOfRange = Math.abs(gamma) > 28;
    updateOrientationMask();
  };
  window.addEventListener('deviceorientation', orientationGuardListener, true);
}

function showViolationWarning(reasonText) {
  const warning = document.createElement('div');
  warning.style.cssText = `
    position: fixed;
    top: 18px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(255, 193, 7, 0.98);
    color: #212529;
    padding: 14px 20px;
    border-radius: 6px;
    font-size: 15px;
    font-weight: bold;
    z-index: 3000;
    max-width: 90%;
    text-align: center;
    box-shadow: 0 2px 15px rgba(0,0,0,0.25);
  `;
  warning.innerHTML = `⚠️ 请保持实验页面在前台并处于全屏（原因：${reasonText}）。再次发生将终止实验。`;
  document.body.appendChild(warning);
  setTimeout(() => {
    if (warning.parentNode) warning.remove();
  }, 2800);
}

async function terminateExperiment(reason) {
  if (experimentTerminated || experimentCompleted) return;
  experimentTerminated = true;
  experimentSubmitted = true;
  experimentPausedForRecovery = false;
  console.error('🛑 实验已终止:', reason);

  if (pauseOverlayEl) {
    pauseOverlayEl.style.display = 'none';
  }
  if (orientationGuardListener) {
    window.removeEventListener('deviceorientation', orientationGuardListener, true);
    orientationGuardListener = null;
  }

  try {
    psychoJS.experiment.addData('termination_reason', reason);
    psychoJS.experiment.addData('termination_time', util.MonotonicClock.getDateStr());
    psychoJS.experiment.addData('trial_type', 'terminated');
    psychoJS.experiment.nextEntry();
    await psychoJS.experiment.save();
  } catch (e) {
    console.error('⚠️ 终止前保存失败:', e);
  }

  const interfaces = ['consentModal', 'root', 'instructionPage', 'comprehensionCheckPage', 'drawingInterface', 'orientationCheckPage'];
  interfaces.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  const completionPage = document.getElementById('completionPage');
  if (completionPage) {
    completionPage.style.display = 'flex';
    const content = completionPage.querySelector('.completion-content');
    if (content) {
      content.innerHTML = `
        <h2 style="color:#dc3545;">实验已终止</h2>
        <p>检测到页面离开全屏或切出前台超过允许次数。</p>
        <p style="font-size:14px;color:#666;">终止原因：${reason}</p>
      `;
    }
  }

  setTimeout(() => {
    psychoJS.quit({message: 'Experiment terminated.', isCompleted: false});
  }, 1200);
}

async function handleScreenViolation(reason) {
  if (experimentTerminated || experimentCompleted) return;
  if (!screenSecurityArmed) return;
  if (!fullscreenEntryConfirmed) return;
  if ((Date.now() - fullscreenConfirmedAt) < fullscreenGuardGraceMs) return;
  const now = Date.now();
  if (now - lastViolationTime < violationDebounceMs) return;
  lastViolationTime = now;

  screenViolationCount += 1;
  psychoJS.experiment.addData('screen_violation_count', screenViolationCount);
  psychoJS.experiment.addData('screen_violation_reason', reason);
  psychoJS.experiment.addData('screen_violation_time', util.MonotonicClock.getDateStr());
  psychoJS.experiment.addData('trial_type', 'screen_violation');
  psychoJS.experiment.nextEntry();

  if (screenViolationCount === 1) {
    if (document.visibilityState === 'visible') {
      showViolationWarning(reason);
    } else {
      pendingViolationWarningReason = reason;
    }
    pauseExperimentForRecovery(reason);
    await ensurePortraitFullscreen();
  } else {
    await terminateExperiment(`第2次违规：${reason}`);
  }
}

function setupScreenSecurity() {
  // 尝试自动全屏（多数浏览器会因非手势触发而拒绝）
  ensurePortraitFullscreen();

  // 首次用户交互时再次尝试全屏
  const firstGesture = async () => {
    await ensurePortraitFullscreen();
  };
  document.addEventListener('pointerdown', firstGesture, { once: true, capture: true });

  document.addEventListener('fullscreenchange', async () => {
    if (experimentTerminated || experimentCompleted) return;
    if (isInFullscreen()) {
      if (screenSecurityArmed && !fullscreenEntryConfirmed) {
        fullscreenEntryConfirmed = true;
        fullscreenConfirmedAt = Date.now();
      }
      await ensurePortraitFullscreen();
      updateOrientationMask();
      return;
    }

    if (!screenSecurityArmed || !fullscreenEntryConfirmed) return;
    if ((Date.now() - screenSecurityArmAt) < fullscreenGuardGraceMs) return;
    handleScreenViolation('退出全屏');
  });

  document.addEventListener('visibilitychange', () => {
    if (experimentTerminated || experimentCompleted) return;
    if (!screenSecurityArmed || !fullscreenEntryConfirmed) return;
    if ((Date.now() - fullscreenConfirmedAt) < fullscreenGuardGraceMs) return;
    if (document.visibilityState !== 'visible') {
      handleScreenViolation('切出实验窗口');
      return;
    }
    if (pendingViolationWarningReason) {
      showViolationWarning(pendingViolationWarningReason);
      pendingViolationWarningReason = '';
    }
    if (experimentPausedForRecovery && isInFullscreen()) {
      const overlay = ensurePauseOverlay();
      experimentPausedForRecovery = false;
      overlay.style.display = 'none';
    }
    updateOrientationMask();
  });

  window.addEventListener('blur', () => {
    if (experimentTerminated || experimentCompleted) return;
    if (!screenSecurityArmed || !fullscreenEntryConfirmed) return;
    if ((Date.now() - fullscreenConfirmedAt) < fullscreenGuardGraceMs) return;
    handleScreenViolation('窗口失去焦点');
  });

  window.addEventListener('orientationchange', () => {
    updateOrientationMask();
  });
  window.addEventListener('resize', () => {
    updateOrientationMask();
  });
  updateOrientationMask();
}

async function finalizeExperimentAndQuit() {
  experimentCompleted = true;
  experimentPausedForRecovery = false;
  pendingViolationWarningReason = '';
  if (pauseOverlayEl) pauseOverlayEl.style.display = 'none';
  if (orientationMaskEl) orientationMaskEl.style.display = 'none';
  if (orientationGuardListener) {
    window.removeEventListener('deviceorientation', orientationGuardListener, true);
    orientationGuardListener = null;
  }
  await exitFullscreenSafe();
  setTimeout(() => {
    psychoJS.quit({message: 'Thank you for your patience.', isCompleted: true});
  }, 250);
}

function getCloudCaptureContext() {
  const path = String(window.location.pathname || '');
  const parts = path.split('/').filter(Boolean);
  const isCloudCapturePath = parts[0] === 'exp' && !!parts[1];
  const prefix = isCloudCapturePath ? decodeURIComponent(parts[1]) : '';
  const token = new URLSearchParams(window.location.search).get('access_token') || '';
  return {
    isCloudCapturePath,
    prefix,
    token
  };
}

function getPsychoJsRowsSnapshot() {
  try {
    const exp = psychoJS?.experiment;
    const rows = exp?._trialsData || exp?._trialList || exp?._data || [];
    if (Array.isArray(rows)) {
      return rows
        .filter((row) => row && typeof row === 'object')
        .map((row) => ({ ...row }));
    }
  } catch (error) {
    console.warn('读取 PsychoJS 行数据失败:', error && error.message ? error.message : error);
  }
  return [];
}

async function uploadCloudDataDirect(payloadObj) {
  const ctx = getCloudCaptureContext();
  if (!ctx.isCloudCapturePath || !ctx.prefix) {
    return { skipped: true, reason: 'not_cloud_capture_path' };
  }

  const body = {
    prefix: ctx.prefix,
    access_token: ctx.token,
    download_policy: 'upload_only',
    payload: {
      type: 'direct_save_audit',
      data: payloadObj,
      saved_at: new Date().toISOString()
    }
  };

  const bodyText = JSON.stringify(body);
  const bodyBytes = new TextEncoder().encode(bodyText).length;
  const useKeepalive = bodyBytes <= 60 * 1024;
  const absoluteCollectBase = (window.__EXP_ACCESS_BASE__ || 'https://exp.vaonline.dpdns.org').replace(/\/$/, '');
  const candidates = Array.from(new Set([
    `${window.location.origin}/data/collect`,
    `${absoluteCollectBase}/data/collect`
  ]));

  let lastError = null;
  for (const url of candidates) {
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: bodyText,
        keepalive: useKeepalive
      });
      if (!resp.ok) {
        throw new Error(`Cloud collect failed: ${resp.status}`);
      }
      const data = await resp.json().catch(() => ({}));
      return { skipped: false, key: data?.key || '' };
    } catch (err) {
      lastError = err;
      continue;
    }
  }

  if (lastError) {
    const reason = String(lastError?.message || lastError || 'unknown error');
    throw new Error(`Cloud collect request failed (${reason}); payload_bytes=${bodyBytes}`);
  }
  throw new Error('Cloud collect request failed: unknown error');
}

async function checkGyroscopeAvailability() {
  let genericGyroDetected = false;

  // Generic Sensor API
  if ('Gyroscope' in window) {
    try {
      let found = false;
      await new Promise((resolve) => {
        const gyro = new window.Gyroscope({ frequency: 10 });
        const timer = setTimeout(() => {
          try { gyro.stop(); } catch (e) {}
          resolve();
        }, 1300);
        gyro.onreading = () => {
          found = true;
          clearTimeout(timer);
          try { gyro.stop(); } catch (e) {}
          resolve();
        };
        gyro.onerror = () => {
          clearTimeout(timer);
          try { gyro.stop(); } catch (e) {}
          resolve();
        };
        gyro.start();
      });
      if (found) genericGyroDetected = true;
    } catch (e) {
      console.warn('Generic Gyroscope API 不可用:', e && e.message ? e.message : e);
    }
  }

  // iOS 需要显式授权
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    orientationPermissionState = 'required';
    try {
      const permission = await DeviceOrientationEvent.requestPermission();
      orientationPermissionState = permission;
      if (permission !== 'granted') return false;
    } catch (e) {
      orientationPermissionState = 'denied';
      return false;
    }
  }

  // DeviceOrientation 事件探测
  if (typeof window.DeviceOrientationEvent === 'undefined') {
    if (genericGyroDetected) {
      console.warn('检测到陀螺仪，但缺少 DeviceOrientation 接口，无法执行姿态校准。');
    }
    return false;
  }

  return await new Promise((resolve) => {
    let detected = false;
    const timer = setTimeout(() => {
      window.removeEventListener('deviceorientation', onOrientation, true);
      resolve(detected);
    }, 1500);

    function onOrientation(event) {
      const hasValues = Number.isFinite(event.beta) || Number.isFinite(event.gamma) || Number.isFinite(event.alpha);
      if (hasValues) {
        detected = true;
        clearTimeout(timer);
        window.removeEventListener('deviceorientation', onOrientation, true);
        resolve(true);
      }
    }

    window.addEventListener('deviceorientation', onOrientation, true);
  });
}

function showRootEntryPage() {
  const root = document.getElementById('root');
  const orientationCheckPage = document.getElementById('orientationCheckPage');
  const consentModal = document.getElementById('consentModal');
  if (consentModal) consentModal.style.display = 'none';
  if (orientationCheckPage) orientationCheckPage.style.display = 'none';
  if (root) root.style.display = '';
}

function stopOrientationMonitor() {
  if (orientationListener) {
    window.removeEventListener('deviceorientation', orientationListener, true);
    orientationListener = null;
  }
}

function startOrientationMonitor() {
  const statusEl = document.getElementById('orientationStatus');
  const valuesEl = document.getElementById('orientationValues');
  const continueBtn = document.getElementById('orientationContinueBtn');
  orientationStableStart = null;
  orientationReady = false;
  if (continueBtn) continueBtn.disabled = true;

  orientationListener = function(event) {
    const beta = Number.isFinite(event.beta) ? event.beta : null;
    const gamma = Number.isFinite(event.gamma) ? event.gamma : null;
    const now = performance.now();

    if (beta !== null && gamma !== null) {
      orientationSamples.push({
        t: Math.round(now),
        beta: Number(beta.toFixed(2)),
        gamma: Number(gamma.toFixed(2))
      });
    }

    if (valuesEl) {
      const betaText = beta === null ? '--' : beta.toFixed(1);
      const gammaText = gamma === null ? '--' : gamma.toFixed(1);
      valuesEl.textContent = `β: ${betaText}°, γ: ${gammaText}°`;
    }

    const portrait = window.innerHeight >= window.innerWidth;
    const bottomParallel = gamma !== null && Math.abs(gamma) <= 20;

    if (portrait && bottomParallel) {
      if (!orientationStableStart) orientationStableStart = now;
      const stableMs = now - orientationStableStart;
      if (statusEl) {
        if (stableMs < 1500) {
          statusEl.textContent = `姿态正确，请继续保持 ${(1.5 - stableMs / 1000).toFixed(1)} 秒…`;
        } else {
          statusEl.textContent = '姿态校准完成，可以开始实验。';
        }
      }
      if (stableMs >= 1500 && !orientationReady) {
        orientationReady = true;
        if (continueBtn) continueBtn.disabled = false;
      }
    } else {
      orientationStableStart = null;
      orientationReady = false;
      if (continueBtn) continueBtn.disabled = true;
      if (statusEl) {
        statusEl.textContent = '请让手机底边与桌面边缘大致平行。';
      }
    }
  };

  window.addEventListener('deviceorientation', orientationListener, true);
}

function showOrientationCheckPage() {
  const orientationPage = document.getElementById('orientationCheckPage');
  const root = document.getElementById('root');
  if (root) root.style.display = 'none';
  if (orientationPage) orientationPage.style.display = 'flex';

  const continueBtn = document.getElementById('orientationContinueBtn');
  if (continueBtn) {
    continueBtn.onclick = () => {
      stopOrientationMonitor();
      psychoJS.experiment.addData('orientation_calibration_passed', 1);
      psychoJS.experiment.addData('orientation_permission_state', orientationPermissionState);
      psychoJS.experiment.addData('orientation_samples', JSON.stringify(orientationSamples.slice(-300)));
      psychoJS.experiment.addData('trial_type', 'orientation_check');
      psychoJS.experiment.nextEntry();
      showRootEntryPage();
    };
  }

  startOrientationMonitor();
}

async function handleConsentAccepted() {
  const consentModal = document.getElementById('consentModal');
  if (consentModal) consentModal.style.display = 'none';

  await ensurePortraitFullscreen();
  screenSecurityArmed = true;
  screenSecurityArmAt = Date.now();
  if (isInFullscreen()) {
    fullscreenEntryConfirmed = true;
    fullscreenConfirmedAt = Date.now();
  }

  const mobile = isLikelyMobileDevice();
  hasGyroscope = mobile ? await checkGyroscopeAvailability() : false;

  if (mobile && orientationPermissionState === 'denied') {
    await terminateExperiment('姿态传感器权限被拒绝，无法进行姿态校准');
    return;
  }

  startOrientationGuardMonitor();

  psychoJS.experiment.addData('device_is_mobile', mobile ? 1 : 0);
  psychoJS.experiment.addData('device_has_gyroscope', hasGyroscope ? 1 : 0);
  psychoJS.experiment.addData('orientation_permission_state', orientationPermissionState);
  psychoJS.experiment.addData('trial_type', 'device_check');
  psychoJS.experiment.nextEntry();

  if (hasGyroscope) {
    showOrientationCheckPage();
  } else {
    showRootEntryPage();
  }
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

  const whiteDiskDiameter = Math.max(20, canvas.width - 20);
  brushSize = Math.max(4, whiteDiskDiameter * brushDiameterRatio * 0.5);
  
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
  const descriptionPage = document.getElementById('descriptionPage');
  const drawingInterface = document.getElementById('drawingInterface');
  
  if (root) root.style.display = 'none';
  if (instructionPage) instructionPage.style.display = 'none';
  if (comprehensionCheckPage) comprehensionCheckPage.style.display = 'none';
  if (descriptionPage) descriptionPage.style.display = 'none';
  if (drawingInterface) drawingInterface.style.display = 'block';
  
  experimentSubmitted = false;
  drawingCount = 1;
  allDrawingMatrices = [];
  drawingTimeline = [];
  drawingTaskStartTime = performance.now();
  firstDrawingActivityTime = 0;
  gazeDistributionDescription = '';
  
  // 重置绘制时长计时器（仅首次绘制需要）
  totalDrawingActivityTime = 0;
  activityStartTime = null;
  
  resizeCanvas();
  clearCanvas();
  updateDrawingPrompt();
  
  console.log('🎨 绘制任务开始 - 第1次');
}

// 更新绘制任务提示
function updateDrawingPrompt() {
  const instructionsDiv = document.querySelector('.instructions');
  if (instructionsDiv) {
    instructionsDiv.innerHTML = `<strong>操作提示：</strong><br>
      选择绘制/减淡模式（按钮高亮为当前模式）<br>
      空格：清空画布<br>
      回车：确认提交`;
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
  recordDrawingTimelineEvent(x, y, mode);

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

function recordDrawingTimelineEvent(x, y, mode) {
  if (!canvas || drawingTaskStartTime === null) return;

  const clampedX = Math.max(0, Math.min(canvas.width, x));
  const clampedY = Math.max(0, Math.min(canvas.height, y));
  const normalizedX = Number((clampedX / canvas.width).toFixed(4));
  const normalizedY = Number((clampedY / canvas.height).toFixed(4));
  const elapsedMs = Math.round(performance.now() - drawingTaskStartTime);

  // [绘制轮次, 时间(ms), x(0-1), y(0-1), 模式(1=绘制,0=减淡)]
  drawingTimeline.push([
    drawingCount,
    elapsedMs,
    normalizedX,
    normalizedY,
    mode === 'add' ? 1 : 0
  ]);
}

// 鼠标事件 - 双击切换模式
function handleMouseDown(e) {
  if (experimentPausedForRecovery) return;
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
  
  // 记录操作块开始时间（仅第一次绘制需要计时）
  if (drawingCount === 1 && !isDrawing && activityStartTime === null) {
    activityStartTime = Date.now();
  }
  
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
  // 累计绘制活动时长（仅第一次绘制需要计时）
  if (drawingCount === 1 && isDrawing && activityStartTime !== null) {
    totalDrawingActivityTime += Date.now() - activityStartTime;
    activityStartTime = null;
  }
  
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
  // 滚轮调整画笔大小功能已关闭
  if (!enableBrushSizeAdjust) return;
  
  
  if (e.deltaY < 0) {
    brushSize = Math.min(100, brushSize + 5);
  } else {
    brushSize = Math.max(5, brushSize - 5);
  }
  
  console.log(`🖌️ 画笔大小: ${brushSize}px`);
  drawCanvas();
}

function handleTouchStart(e) {
  if (experimentPausedForRecovery) return;
  e.preventDefault();
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  mouseX = touch.clientX - rect.left;
  mouseY = touch.clientY - rect.top;
  
  // 记录操作块开始时间（仅第一次绘制需要计时）
  if (drawingCount === 1 && !isDrawing && activityStartTime === null) {
    activityStartTime = Date.now();
  }
  
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
  
  // 累计绘制活动时长（仅第一次绘制需要计时）
  if (drawingCount === 1 && isDrawing && activityStartTime !== null) {
    totalDrawingActivityTime += Date.now() - activityStartTime;
    activityStartTime = null;
  }
  
  isDrawing = false;
}

function handleKeyDown(e) {
  const descriptionPage = document.getElementById('descriptionPage');
  if (descriptionPage && descriptionPage.style.display === 'flex') {
    if ((e.ctrlKey || e.metaKey) && e.code === 'Enter') {
      e.preventDefault();
      submitDescriptionAndSave();
    }
    return;
  }

  const drawingInterface = document.getElementById('drawingInterface');
  if (!drawingInterface || drawingInterface.style.display !== 'block') {
    return;
  }

  if (experimentPausedForRecovery) {
    e.preventDefault();
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
  const nextMode = drawMode === 'add' ? 'subtract' : 'add';
  setDrawMode(nextMode);
}

function setDrawMode(mode) {
  drawMode = mode === 'subtract' ? 'subtract' : 'add';
  const addBtn = document.getElementById('addModeBtn');
  const subtractBtn = document.getElementById('subtractModeBtn');
  if (addBtn && subtractBtn) {
    if (drawMode === 'add') {
      addBtn.classList.add('active');
      subtractBtn.classList.remove('active');
    } else {
      addBtn.classList.remove('active');
      subtractBtn.classList.add('active');
    }
  }
}

async function confirmDrawing() {
  if (experimentPausedForRecovery) {
    console.log('⏸️ 当前处于暂停恢复状态，暂不能提交');
    return;
  }
  if (experimentSubmitted) {
    console.log('⚠️ 数据已提交，请勿重复提交');
    return;
  }
  
  // 首次绘制需要检查最小操作时长
  if (drawingCount === 1) {
    if (totalDrawingActivityTime < minDrawingTime) {
      showInsufficientTimeWarning();
      console.log(`⏱️ 绘制时长不足：${totalDrawingActivityTime}ms，需要 ${minDrawingTime}ms`);
      return;
    }
    firstDrawingActivityTime = totalDrawingActivityTime;
    console.log(`✓ 绘制时长足够：${totalDrawingActivityTime}ms`);
  }
  
  console.log(`✏️ 第${drawingCount}次绘制完成，保存数据...`);
  
  // 保存当前绘制矩阵的副本
  const matrixCopy = colorMatrix.map(row => [...row]);
  allDrawingMatrices.push(matrixCopy);
  
  if (drawingCount < 2) {
    // 立即清空画布，防止被试记忆
    initColorMatrix();
    drawCanvas();
    
    drawingCount++;
    
    // 重置绘制时长计时器（后续轮次无需计时）
    totalDrawingActivityTime = 0;
    activityStartTime = null;
    
    // 显示间隔页面提示
    showDrawingIntervalPage();
    
    setTimeout(() => {
      // minDrawingTime 毫秒后移除提示框，继续下一次绘制
      if (currentNotification && currentNotification.parentNode) {
        currentNotification.remove();
        currentNotification = null;
      }
      
      updateDrawingPrompt();
      
      const intervalPage = document.getElementById('drawingIntervalPage');
      if (intervalPage) intervalPage.style.display = 'none';
      
      console.log(`🎨 开始第${drawingCount}次绘制`);
    }, minDrawingTime);
  } else {
    // 所有绘制任务完成，进入文字描述页面
    experimentSubmitted = true;
    showDescriptionPage();
    console.log('📝 两次绘制完成，等待被试填写分布描述');
  }
}

function showDescriptionPage() {
  const drawingInterface = document.getElementById('drawingInterface');
  const descriptionPage = document.getElementById('descriptionPage');
  if (drawingInterface) drawingInterface.style.display = 'none';
  if (descriptionPage) descriptionPage.style.display = 'flex';

  const textarea = document.getElementById('distributionDescription');
  if (textarea) {
    textarea.value = '';
    setTimeout(() => textarea.focus(), 80);
  }
}

async function submitDescriptionAndSave() {
  const descriptionPage = document.getElementById('descriptionPage');
  if (!descriptionPage || descriptionPage.style.display !== 'flex') return;

  const textarea = document.getElementById('distributionDescription');
  const feedback = document.getElementById('descriptionFeedback');
  const submitBtn = document.getElementById('submitDescriptionBtn');

  const text = textarea ? textarea.value.trim() : '';
  if (!text) {
    if (feedback) {
      feedback.style.display = 'block';
      feedback.style.color = '#b42318';
      feedback.textContent = '请先填写您对注视点分布的详细描述。';
    }
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = '正在提交...';
  }
  if (feedback) {
    feedback.style.display = 'none';
  }

  gazeDistributionDescription = text;
  showSavingPage();

  try {
    const variability = calculateVariability(allDrawingMatrices);
    const matrixJSON = JSON.stringify(allDrawingMatrices);

    psychoJS.experiment.addData('drawing_matrices', matrixJSON);
    psychoJS.experiment.addData('drawing_timeline', JSON.stringify(drawingTimeline));
    psychoJS.experiment.addData('drawing_timeline_format', '[drawing_index,elapsed_ms,x_norm,y_norm,mode_1_add_0_subtract]');
    psychoJS.experiment.addData('drawing_timeline_event_count', drawingTimeline.length);
    psychoJS.experiment.addData('matrix_size', matrixSize);
    psychoJS.experiment.addData('drawing_count', 2);
    psychoJS.experiment.addData('drawings_variability', variability);
    psychoJS.experiment.addData('first_drawing_duration', firstDrawingActivityTime || totalDrawingActivityTime);
    psychoJS.experiment.addData('gaze_distribution_description', gazeDistributionDescription);
    psychoJS.experiment.addData('gaze_description_length', gazeDistributionDescription.length);
    psychoJS.experiment.addData('trial_type', 'drawing_data');
    psychoJS.experiment.addData('drawing_time', util.MonotonicClock.getDateStr());
    psychoJS.experiment.nextEntry();

    await psychoJS.experiment.save();
    console.log('✓ 数据已成功保存到 Pavlovia 服务器');

    const directPayload = {
      participant_id: expInfo.participant || experimentData?.participantInfo?.id || '',
      exp_name: expName,
      experiment_uid: experimentData?.expUid || '',
      user_uid: experimentData?.participantInfo?.id || expInfo.participant || '',
      drawing_matrices: allDrawingMatrices,
      drawing_timeline: drawingTimeline,
      matrix_size: matrixSize,
      drawing_count: 2,
      drawings_variability: variability,
      first_drawing_duration: firstDrawingActivityTime || totalDrawingActivityTime,
      gaze_distribution_description: gazeDistributionDescription,
      gaze_description_length: gazeDistributionDescription.length,
      drawing_time: util.MonotonicClock.getDateStr(),
      psychojs_rows: getPsychoJsRowsSnapshot()
    };

    const cloudSaveResult = await uploadCloudDataDirect(directPayload);
    if (!cloudSaveResult.skipped && !cloudSaveResult.key) {
      throw new Error('云端审核未返回有效存储键，已阻止完成页面。');
    }
    if (!cloudSaveResult.skipped) {
      console.log('☁️ Cloud R2 审核通过，存储键:', cloudSaveResult.key);
    }

    updateSavingPageSuccess();

    setTimeout(() => {
      finalizeExperimentAndQuit();
    }, 1500);
  } catch (error) {
    console.error('❌ 保存数据错误:', error);
    updateSavingPageError(error);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = '提交并完成实验';
    }
  }
}

// 显示绘制时长不足的错误提示
function showInsufficientTimeWarning() {
  const warning = document.createElement('div');
  warning.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(255, 0, 0, 0.95);
    color: #fff;
    padding: 15px 30px;
    border-radius: 5px;
    font-size: 16px;
    font-weight: bold;
    z-index: 2000;
    max-width: 80%;
    text-align: center;
    box-shadow: 0 2px 15px rgba(0,0,0,0.3);
  `;
  warning.innerHTML = '请认真完成绘制再提交！';
  document.body.appendChild(warning);
  
  // 3秒后自动移除
  setTimeout(() => {
    if (warning.parentNode) {
      warning.remove();
    }
  }, 3000);
  
  console.log('⚠️ 显示绘制时长不足警告');
}

// 显示绘制间隔页

function showDrawingIntervalPage() {
  currentNotification = document.createElement('div');
  currentNotification.style.cssText = `
    position: fixed;
    top: 10px;
    left: 10px;
    color: #333;
    background: rgba(255,255,255,0.95);
    padding: 15px;
    border-radius: 5px;
    border: 1px solid #ddd;
    font-size: 14px;
    font-weight: bold;
    max-width: 250px;
    z-index: 1001;
    text-align: left;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  `;
  currentNotification.innerHTML = '请再次绘制<br>以确认答案';
  document.body.appendChild(currentNotification);
  
  console.log(`⏳ 显示第${drawingCount}次绘制准备页`);
}

// 计算多次绘制的变异性（当前流程为两次）
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
  const descriptionPage = document.getElementById('descriptionPage');
  const completionPage = document.getElementById('completionPage');
  
  if (drawingInterface) drawingInterface.style.display = 'none';
  if (descriptionPage) descriptionPage.style.display = 'none';
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
    finalizeExperimentAndQuit();
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
window.setDrawMode = setDrawMode;
window.submitDescriptionAndSave = submitDescriptionAndSave;
