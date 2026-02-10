/************************ 
 * Simple_Test *
 * 最简单的在线实验测试脚本
 ************************/

// 实验信息存储
let experimentData = {
  expName: 'simple_test',
  startTime: null,
  endTime: null,
  participantInfo: {}
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
  console.log('实验页面加载完成');
  experimentData.startTime = new Date().toISOString();
  
  // 添加输入框的回车事件监听
  const inputs = document.querySelectorAll('input[type="text"]');
  inputs.forEach(input => {
    input.addEventListener('keypress', function(event) {
      if (event.key === 'Enter') {
        submitInfo();
      }
    });
  });
});

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
  experimentData.endTime = new Date().toISOString();
  
  // 打印数据到控制台（实际实验中会保存到服务器）
  console.log('实验数据：', experimentData);
  
  // 显示成功消息
  const resultMessage = document.getElementById('resultMessage');
  resultMessage.style.display = 'block';
  resultMessage.innerHTML = `
    <strong>信息提交成功！</strong><br><br>
    被试编号：${participantId}<br>
    姓名：${participantName}<br>
    年龄：${participantAge}<br><br>
    实验开始时间：${experimentData.startTime}<br>
    提交时间：${experimentData.endTime}
  `;
  
  // 禁用输入框和按钮
  document.querySelectorAll('input').forEach(input => input.disabled = true);
  document.querySelector('button').disabled = true;
  
  // 模拟保存数据
  saveData();
}

// 保存数据函数（模拟）
function saveData() {
  // 在真实的 Pavlovia 实验中，这里会调用 PsychoJS 的数据保存方法
  // 例如：psychoJS.experiment.save({...})
  
  // 这里我们只是将数据保存到 localStorage 作为演示
  const dataKey = `exp_${experimentData.participantInfo.id}_${Date.now()}`;
  
  try {
    localStorage.setItem(dataKey, JSON.stringify(experimentData));
    console.log('数据已保存到本地存储，键名：', dataKey);
    
    // 也可以生成 CSV 格式的数据
    const csvData = generateCSV();
    console.log('CSV 格式数据：\n', csvData);
    
  } catch (error) {
    console.error('保存数据时出错：', error);
  }
}

// 生成 CSV 格式数据
function generateCSV() {
  const headers = ['participant_id', 'name', 'age', 'start_time', 'end_time'];
  const values = [
    experimentData.participantInfo.id,
    experimentData.participantInfo.name,
    experimentData.participantInfo.age,
    experimentData.startTime,
    experimentData.endTime
  ];
  
  const csvContent = headers.join(',') + '\n' + values.join(',');
  return csvContent;
}

// 下载数据函数（可选功能）
function downloadData() {
  const csvContent = generateCSV();
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `exp_data_${experimentData.participantInfo.id}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 导出函数供外部调用
window.submitInfo = submitInfo;
window.downloadData = downloadData;
