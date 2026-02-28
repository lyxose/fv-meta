"""
读取PsychoJS实验数据并可视化被试的绘制分布

方位关系详细说明：
===================

1. 数据矩阵存储方式 (colorMatrix)
   ├─ colorMatrix[row][col]
   ├─ row: 0到255，0在顶部，255在底部（从上到下）
   ├─ col: 0到255，0在左侧，255在右侧（从左到右）
   └─ 矩阵原点(0,0)在左上角

2. 屏幕显示方位 (Canvas)
   ├─ 白色圆形在中心显示
   ├─ x轴：0在左边，width在右边（从左到右）
   ├─ y轴：0在顶部，height在底部（从上到下）
   ├─ 被试看到的圆形中心就是画布中心
   └─ 被试在圆形内的任何绘制都被记录到colorMatrix

3. 代码映射关系
   ├─ Canvas坐标 (x, y) → 矩阵坐标 (matrixY, matrixX)
   │  ├─ matrixX = (x / canvas.width) * matrixSize    # 列索引
   │  └─ matrixY = (y / canvas.height) * matrixSize   # 行索引
   ├─ 这意味着：Canvas的y轴直接对应矩阵的行
   │             Canvas的x轴直接对应矩阵的列
   └─ colorMatrix[matrixY][matrixX] = intensity

4. 可视化输出方向
   ├─ 使用 matplotlib.pyplot.imshow(colorMatrix, origin='upper')
   │  ├─ origin='upper' 表示第一行(row 0)显示在图像顶部
   │  └─ 这与Canvas的显示方向一致
   ├─ 结果图像：
   │  ├─ 顶部对应被试看到的圆形顶部
   │  ├─ 底部对应被试看到的圆形底部
   │  ├─ 左侧对应被试看到的圆形左侧
   │  └─ 右侧对应被试看到的圆形右侧

总结：所有方向都是一致的，不存在翻转！
"""

import json
import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path
import pandas as pd
from datetime import datetime

def find_latest_data_file(data_dir='data'):
    """找到最新的数据文件"""
    data_path = Path(data_dir)
    if not data_path.exists():
        print(f"❌ 数据目录不存在: {data_path}")
        return None
    
    # 查找所有csv文件
    csv_files = list(data_path.glob('*.csv'))
    if not csv_files:
        print("❌ 未找到任何CSV文件")
        return None
    
    # 按修改时间排序，获取最新的
    latest_file = max(csv_files, key=lambda p: p.stat().st_mtime)
    print(f"✓ 找到数据文件: {latest_file}")
    return latest_file

def load_drawing_data(csv_file):
    """从CSV文件加载绘制数据"""
    try:
        df = pd.read_csv(csv_file, sep='\t')
        print(f"✓ CSV加载成功: {len(df)} 行")
        print(f"  列名: {list(df.columns)}")
        return df
    except Exception as e:
        print(f"❌ CSV加载失败: {e}")
        return None

def extract_drawing_matrix(df):
    """从数据框中提取绘制矩阵（兼容 drawing_matrix 和 drawing_matrices）"""
    # 查找包含drawing_matrix的行
    drawing_rows = df[df['trial_type'] == 'drawing_data'] if 'trial_type' in df.columns else df
    
    if len(drawing_rows) == 0:
        print("❌ 未找到drawing_data类型的记录")
        return None
    
    # 获取第一条绘制记录
    first_drawing = drawing_rows.iloc[0]
    
    if 'drawing_matrices' not in first_drawing.index and 'drawing_matrix' not in first_drawing.index:
        print("❌ 记录中没有drawing_matrices/drawing_matrix字段")
        print(f"  可用字段: {list(first_drawing.index)}")
        return None
    
    try:
        matrices_json = first_drawing.get('drawing_matrices', None)
        if isinstance(matrices_json, str) and matrices_json.strip():
            matrices = json.loads(matrices_json)
            matrices_array = np.array(matrices, dtype=np.float32)
            if matrices_array.ndim == 3:
                print(f"✓ 多次绘制矩阵加载成功: 形状 {matrices_array.shape} (轮次, 高, 宽)")
                return matrices_array

        # 兼容旧格式
        matrix_json = first_drawing.get('drawing_matrix', None)
        if not isinstance(matrix_json, str) or not matrix_json.strip():
            print("❌ drawing_matrices/drawing_matrix 字段为空")
            return None
        matrix = json.loads(matrix_json)
        matrix_array = np.array(matrix, dtype=np.float32)
        print(f"✓ 单次矩阵加载成功: 形状 {matrix_array.shape}")
        return matrix_array[np.newaxis, ...]
    except json.JSONDecodeError as e:
        print(f"❌ JSON解析失败: {e}")
        return None

def extract_drawing_timeline(df):
    """提取绘制时序数据 [drawing_index, elapsed_ms, x_norm, y_norm, mode]"""
    drawing_rows = df[df['trial_type'] == 'drawing_data'] if 'trial_type' in df.columns else df
    if len(drawing_rows) == 0:
        return None

    row = drawing_rows.iloc[0]
    if 'drawing_timeline' not in row.index or not isinstance(row.get('drawing_timeline', None), str):
        print("⚠️ 未找到 drawing_timeline 字段（可能是旧数据）")
        return None

    try:
        timeline = json.loads(row['drawing_timeline'])
        timeline_arr = np.array(timeline, dtype=np.float32)
        if timeline_arr.ndim != 2 or timeline_arr.shape[1] < 5:
            print(f"⚠️ drawing_timeline格式异常: shape={timeline_arr.shape}")
            return None
        print(f"✓ 绘制时序加载成功: {timeline_arr.shape[0]} 条事件")
        return timeline_arr
    except Exception as e:
        print(f"❌ drawing_timeline 解析失败: {e}")
        return None

def get_participant_info(df):
    """提取被试信息"""
    info_rows = df[df['trial_type'] == 'participant_info'] if 'trial_type' in df.columns else df.head(1)
    
    if len(info_rows) == 0:
        return {"participant_id": "unknown", "name": "unknown", "age": "unknown"}
    
    first_info = info_rows.iloc[0]
    return {
        'participant_id': first_info.get('participant_id', 'unknown'),
        'name': first_info.get('name', 'unknown'),
        'age': first_info.get('age', 'unknown')
    }

def visualize_drawing(matrix, participant_info=None, save_path='drawing_visualization.png'):
    """
    绘制被试的绘制分布图
    
    方位说明：
    ├─ 图像顶部 = 被试看到的圆形顶部
    ├─ 图像底部 = 被试看到的圆形底部
    ├─ 图像左侧 = 被试看到的圆形左侧
    └─ 图像右侧 = 被试看到的圆形右侧
    """
    if matrix is None:
        print("❌ 矩阵为空，无法绘制")
        return False

    # matrix: (trial, H, W)
    if matrix.ndim == 3:
        matrix_mean = np.mean(matrix, axis=0)
    else:
        matrix_mean = matrix
    
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))
    
    # 左图：热力图（intensity）
    ax1 = axes[0]
    im1 = ax1.imshow(matrix_mean, cmap='hot', origin='upper', aspect='auto')
    ax1.set_title('平均绘制强度分布\n(红色=高强度，黑色=无绘制)', fontsize=12, fontweight='bold')
    ax1.set_xlabel('左 ← 水平位置 → 右')
    ax1.set_ylabel('顶 ↑ 垂直位置 ↓ 底')
    plt.colorbar(im1, ax=ax1, label='绘制强度 (0-255)')
    
    # 添加网格
    ax1.grid(True, alpha=0.2, linestyle='--')
    
    # 右图：二值化图（是否有绘制）
    ax2 = axes[1]
    binary_matrix = (matrix_mean > 10).astype(np.uint8)  # 阈值：强度>10为有绘制
    im2 = ax2.imshow(binary_matrix, cmap='gray', origin='upper', aspect='auto')
    ax2.set_title('绘制覆盖区域\n(白色=被试绘制, 黑色=未绘制)', fontsize=12, fontweight='bold')
    ax2.set_xlabel('左 ← 水平位置 → 右')
    ax2.set_ylabel('顶 ↑ 垂直位置 ↓ 底')
    plt.colorbar(im2, ax=ax2, label='是否绘制')
    
    # 添加网格
    ax2.grid(True, alpha=0.2, linestyle='--')
    
    # 标题信息
    if participant_info:
        title = f"被试 {participant_info.get('name', 'Unknown')} ({participant_info.get('participant_id', 'ID')}) - 年龄 {participant_info.get('age', 'N/A')}"
    else:
        title = "绘制分布分析"
    
    fig.suptitle(title, fontsize=14, fontweight='bold', y=0.98)
    plt.tight_layout()
    
    # 保存图像
    try:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
        print(f"✓ 图像已保存: {save_path}")
    except Exception as e:
        print(f"⚠️ 图像保存失败: {e}")
    
    plt.show()
    return True

def compute_statistics(matrix):
    """计算矩阵统计信息"""
    if matrix is None:
        return None

    if matrix.ndim == 3:
        matrix = np.mean(matrix, axis=0)
    
    stats = {
        '最大强度': np.max(matrix),
        '最小强度': np.min(matrix),
        '平均强度': np.mean(matrix),
        '标准差': np.std(matrix),
        '绘制像素数': np.sum(matrix > 10),
        '总像素数': matrix.size,
        '覆盖率': f"{(np.sum(matrix > 10) / matrix.size * 100):.2f}%"
    }
    return stats

def analyze_spatial_distribution(matrix):
    """分析空间分布特征"""
    if matrix is None:
        return None

    if matrix.ndim == 3:
        matrix = np.mean(matrix, axis=0)
    
    # 计算水平和垂直的投影
    horizontal_projection = np.sum(matrix, axis=0)  # 沿行求和，得到每列的总强度
    vertical_projection = np.sum(matrix, axis=1)    # 沿列求和，得到每行的总强度
    
    # 找到最强的位置
    max_col = np.argmax(horizontal_projection)
    max_row = np.argmax(vertical_projection)
    
    distribution = {
        '水平分布最强位置': f"列 {max_col} (0从左,255从右)",
        '垂直分布最强位置': f"行 {max_row} (0从顶,255从底)",
        '水平投影峰值': horizontal_projection[max_col],
        '垂直投影峰值': vertical_projection[max_row],
    }
    return distribution

def plot_projections(matrix, save_path='projections.png'):
    """绘制水平和垂直投影"""
    if matrix is None:
        return False

    if matrix.ndim == 3:
        matrix = np.mean(matrix, axis=0)
    
    horizontal = np.sum(matrix, axis=0)
    vertical = np.sum(matrix, axis=1)
    
    fig, axes = plt.subplots(1, 2, figsize=(12, 4))
    
    # 水平投影
    ax1 = axes[0]
    ax1.plot(horizontal, color='red', linewidth=2)
    ax1.set_title('水平投影\n(绘制沿水平方向的分布)', fontsize=11, fontweight='bold')
    ax1.set_xlabel('水平位置 (0左, 255右)')
    ax1.set_ylabel('累积强度')
    ax1.grid(True, alpha=0.3)
    
    # 垂直投影
    ax2 = axes[1]
    ax2.plot(vertical, color='blue', linewidth=2)
    ax2.set_title('垂直投影\n(绘制沿垂直方向的分布)', fontsize=11, fontweight='bold')
    ax2.set_xlabel('垂直位置 (0顶, 255底)')
    ax2.set_ylabel('累积强度')
    ax2.grid(True, alpha=0.3)
    
    plt.tight_layout()
    
    try:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
        print(f"✓ 投影图已保存: {save_path}")
    except Exception as e:
        print(f"⚠️ 投影图保存失败: {e}")
    
    plt.show()
    return True

def analyze_timeline(timeline):
    """分析绘制时序"""
    if timeline is None or len(timeline) == 0:
        return None

    drawing_index = timeline[:, 0].astype(int)
    t_ms = timeline[:, 1]
    x = timeline[:, 2]
    y = timeline[:, 3]
    mode = timeline[:, 4].astype(int)  # 1=add, 0=subtract

    add_count = int(np.sum(mode == 1))
    sub_count = int(np.sum(mode == 0))
    total = len(mode)
    duration_ms = float(np.max(t_ms) - np.min(t_ms)) if total > 1 else 0.0

    # 近似轨迹长度（归一化坐标空间）
    dx = np.diff(x)
    dy = np.diff(y)
    path_len = float(np.sum(np.sqrt(dx * dx + dy * dy)))

    result = {
        '总事件数': total,
        '绘制事件数(mode=1)': add_count,
        '减淡事件数(mode=0)': sub_count,
        '绘制占比': f"{(add_count / total * 100):.2f}%" if total else '0%',
        '总时长(ms)': round(duration_ms, 2),
        '轨迹总长度(归一化坐标)': round(path_len, 4),
        '轮次数': int(np.max(drawing_index)) if total else 0
    }
    return result

def plot_timeline_overview(timeline, save_path='timeline_overview.png'):
    """可视化时序：时间-模式散点图 + 轨迹散点图"""
    if timeline is None or len(timeline) == 0:
        return False

    drawing_index = timeline[:, 0].astype(int)
    t_ms = timeline[:, 1]
    x = timeline[:, 2]
    y = timeline[:, 3]
    mode = timeline[:, 4].astype(int)

    fig, axes = plt.subplots(1, 2, figsize=(14, 5))

    # 左：时间-模式
    ax1 = axes[0]
    colors = np.where(mode == 1, 'red', 'blue')
    ax1.scatter(t_ms, drawing_index, c=colors, s=8, alpha=0.6)
    ax1.set_title('时序事件分布\n(红=绘制, 蓝=减淡)', fontsize=11, fontweight='bold')
    ax1.set_xlabel('时间 (ms)')
    ax1.set_ylabel('绘制轮次')
    ax1.grid(True, alpha=0.25)

    # 右：空间轨迹
    ax2 = axes[1]
    ax2.scatter(x, y, c=t_ms, cmap='viridis', s=6, alpha=0.6)
    ax2.set_title('绘制轨迹（归一化坐标）\n颜色表示时间推进', fontsize=11, fontweight='bold')
    ax2.set_xlabel('x (0=左, 1=右)')
    ax2.set_ylabel('y (0=上, 1=下)')
    ax2.set_xlim(0, 1)
    ax2.set_ylim(1, 0)
    ax2.grid(True, alpha=0.25)

    plt.tight_layout()
    try:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
        print(f"✓ 时序图已保存: {save_path}")
    except Exception as e:
        print(f"⚠️ 时序图保存失败: {e}")

    plt.show()
    return True

def main():
    """主函数"""
    print("=" * 60)
    print("PsychoJS 绘制数据分析工具")
    print("=" * 60)
    
    # 查找数据文件
    csv_file = find_latest_data_file()
    if csv_file is None:
        return
    
    # 加载数据
    df = load_drawing_data(csv_file)
    if df is None:
        return
    
    print(f"\n📊 数据概览:")
    print(f"  总记录数: {len(df)}")
    print(f"  数据时间范围: {df.index[0]} - {df.index[-1]}")
    
    # 提取被试信息
    participant_info = get_participant_info(df)
    print(f"\n👤 被试信息:")
    print(f"  ID: {participant_info['participant_id']}")
    print(f"  姓名: {participant_info['name']}")
    print(f"  年龄: {participant_info['age']}")
    
    # 提取绘制矩阵
    print(f"\n🎨 提取绘制数据...")
    matrices = extract_drawing_matrix(df)
    if matrices is None:
        return

    timeline = extract_drawing_timeline(df)
    
    # 计算统计
    stats = compute_statistics(matrices)
    print(f"\n📈 统计信息:")
    for key, value in stats.items():
        print(f"  {key}: {value}")
    
    # 空间分布
    distribution = analyze_spatial_distribution(matrices)
    print(f"\n📍 空间分布:")
    for key, value in distribution.items():
        print(f"  {key}: {value}")

    if matrices.ndim == 3:
        print(f"\n🧪 多次绘制信息:")
        print(f"  绘制轮次数: {matrices.shape[0]}")
        if matrices.shape[0] >= 2:
            pairwise = []
            for i in range(matrices.shape[0] - 1):
                pairwise.append(float(np.mean(np.abs(matrices[i] - matrices[i + 1]))))
            print(f"  相邻轮次平均差异: {[round(v, 4) for v in pairwise]}")

    if timeline is not None:
        timeline_stats = analyze_timeline(timeline)
        print(f"\n⏱️ 绘制时序统计:")
        for key, value in timeline_stats.items():
            print(f"  {key}: {value}")
    
    # 生成可视化
    print(f"\n🖼️  生成可视化图像...")
    viz_path = f"visualization_{participant_info['participant_id']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
    visualize_drawing(matrices, participant_info, viz_path)
    
    proj_path = f"projections_{participant_info['participant_id']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
    plot_projections(matrices, proj_path)

    if timeline is not None:
        tl_path = f"timeline_{participant_info['participant_id']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        plot_timeline_overview(timeline, tl_path)
    
    print("\n✅ 分析完成！")
    print("=" * 60)

if __name__ == '__main__':
    main()
