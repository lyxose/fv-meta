"""
读取按“元数据 + 轨迹CSV + 矩阵CSV”分文件保存的数据，并进行单被试/群体分析。

目录约定（R2下载后本地）：
  data/
    E000035/
      U000004/
        1772..._metadata.json
        1772..._drawing1_timeline.csv
        1772..._drawing2_timeline.csv
        1772..._drawing1_matrix.csv
        1772..._drawing2_matrix.csv

功能：
1) 指定被试：绘制两次矩阵、平均矩阵、两次轨迹图
2) 群体分析：每位被试平均矩阵先归一化，再求群体平均并绘图
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd


@dataclass
class ParticipantBundle:
    experiment_uid: str
    user_uid: str
    metadata: Optional[dict]
    matrix1: np.ndarray
    matrix2: np.ndarray
    timeline1: pd.DataFrame
    timeline2: pd.DataFrame


def find_latest_file(folder: Path, pattern: str) -> Optional[Path]:
    files = sorted(folder.glob(pattern), key=lambda p: p.stat().st_mtime)
    return files[-1] if files else None


def load_matrix_csv(path: Path) -> np.ndarray:
    df = pd.read_csv(path, header=None)
    return df.values.astype(np.float32)


def load_timeline_csv(path: Path) -> pd.DataFrame:
    return pd.read_csv(path)


def load_metadata(path: Optional[Path]) -> Optional[dict]:
    if not path:
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def load_bundle(user_dir: Path, experiment_uid: str, user_uid: str) -> Optional[ParticipantBundle]:
    m1 = find_latest_file(user_dir, "*_drawing1_matrix.csv")
    m2 = find_latest_file(user_dir, "*_drawing2_matrix.csv")
    t1 = find_latest_file(user_dir, "*_drawing1_timeline.csv")
    t2 = find_latest_file(user_dir, "*_drawing2_timeline.csv")
    meta = find_latest_file(user_dir, "*_metadata.json")

    if not (m1 and m2 and t1 and t2):
        return None

    return ParticipantBundle(
        experiment_uid=experiment_uid,
        user_uid=user_uid,
        metadata=load_metadata(meta),
        matrix1=load_matrix_csv(m1),
        matrix2=load_matrix_csv(m2),
        timeline1=load_timeline_csv(t1),
        timeline2=load_timeline_csv(t2),
    )


def scan_bundles(data_root: Path, experiment_uid: Optional[str] = None) -> List[ParticipantBundle]:
    bundles: List[ParticipantBundle] = []
    exp_dirs = [data_root / experiment_uid] if experiment_uid else [p for p in data_root.glob("E*") if p.is_dir()]

    for exp_dir in exp_dirs:
        if not exp_dir.exists() or not exp_dir.is_dir():
            continue
        for user_dir in [p for p in exp_dir.glob("U*") if p.is_dir()]:
            bundle = load_bundle(user_dir, exp_dir.name, user_dir.name)
            if bundle is not None:
                bundles.append(bundle)
    return bundles


def normalize_matrix(mat: np.ndarray) -> np.ndarray:
    m = np.asarray(mat, dtype=np.float32)
    lo = float(np.min(m))
    hi = float(np.max(m))
    if hi <= lo:
        return np.zeros_like(m)
    return (m - lo) / (hi - lo)


def plot_participant(bundle: ParticipantBundle, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)

    mean_mat = (bundle.matrix1 + bundle.matrix2) / 2.0

    fig, axes = plt.subplots(1, 3, figsize=(16, 5))
    for ax, mat, title in [
        (axes[0], bundle.matrix1, "Drawing 1 Matrix"),
        (axes[1], bundle.matrix2, "Drawing 2 Matrix"),
        (axes[2], mean_mat, "Mean Matrix"),
    ]:
        im = ax.imshow(mat, cmap="hot", origin="upper")
        ax.set_title(title)
        ax.set_xlabel("x")
        ax.set_ylabel("y")
        plt.colorbar(im, ax=ax, fraction=0.046, pad=0.04)

    title_name = bundle.metadata.get("participant_name") if bundle.metadata else ""
    fig.suptitle(f"{bundle.experiment_uid}/{bundle.user_uid} {title_name}")
    fig.tight_layout()
    fig.savefig(out_dir / f"{bundle.experiment_uid}_{bundle.user_uid}_matrices.png", dpi=150)
    plt.close(fig)

    fig2, axes2 = plt.subplots(1, 2, figsize=(12, 5))
    for ax, timeline, title in [
        (axes2[0], bundle.timeline1, "Drawing 1 Trajectory"),
        (axes2[1], bundle.timeline2, "Drawing 2 Trajectory"),
    ]:
        if {"x_norm", "y_norm"}.issubset(timeline.columns):
            x = timeline["x_norm"].astype(float).to_numpy()
            y = timeline["y_norm"].astype(float).to_numpy()
            ax.plot(x, y, linewidth=0.8, alpha=0.8)
            ax.scatter(x[:: max(1, len(x)//150)], y[:: max(1, len(y)//150)], s=4, alpha=0.6)
        ax.set_title(title)
        ax.set_xlim(0, 1)
        ax.set_ylim(1, 0)
        ax.set_xlabel("x_norm")
        ax.set_ylabel("y_norm")
        ax.grid(alpha=0.2, linestyle="--")

    fig2.tight_layout()
    fig2.savefig(out_dir / f"{bundle.experiment_uid}_{bundle.user_uid}_trajectories.png", dpi=150)
    plt.close(fig2)


def plot_group(bundles: List[ParticipantBundle], out_dir: Path, tag: str = "group") -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    if not bundles:
        print("❌ 没有可用被试数据")
        return

    norm_means = []
    for b in bundles:
        mean_mat = (b.matrix1 + b.matrix2) / 2.0
        norm_means.append(normalize_matrix(mean_mat))

    group_mat = np.mean(np.stack(norm_means, axis=0), axis=0)

    fig, ax = plt.subplots(figsize=(6, 6))
    im = ax.imshow(group_mat, cmap="hot", origin="upper")
    ax.set_title(f"Group Mean (N={len(bundles)})")
    ax.set_xlabel("x")
    ax.set_ylabel("y")
    plt.colorbar(im, ax=ax)
    fig.tight_layout()
    fig.savefig(out_dir / f"{tag}_group_mean.png", dpi=150)
    plt.close(fig)

    np.save(out_dir / f"{tag}_group_mean.npy", group_mat)
    pd.DataFrame(group_mat).to_csv(out_dir / f"{tag}_group_mean.csv", header=False, index=False)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-root", default="data", help="数据根目录")
    parser.add_argument("--experiment", default=None, help="实验ID，如 E000035")
    parser.add_argument("--user", default=None, help="被试ID，如 U000004")
    parser.add_argument("--out", default="analysis_out", help="输出目录")
    args = parser.parse_args()

    data_root = Path(args.data_root)
    out_dir = Path(args.out)

    bundles = scan_bundles(data_root, args.experiment)
    if not bundles:
        print("❌ 未找到符合条件的数据")
        return

    if args.user:
        matched = [b for b in bundles if b.user_uid == args.user]
        if not matched:
            print(f"❌ 未找到被试 {args.user}")
            return
        plot_participant(matched[0], out_dir)
        print(f"✓ 已输出被试图: {matched[0].experiment_uid}/{matched[0].user_uid}")
    else:
        plot_group(bundles, out_dir, tag=args.experiment or "all")
        print(f"✓ 已输出群体图，N={len(bundles)}")


if __name__ == "__main__":
    main()
