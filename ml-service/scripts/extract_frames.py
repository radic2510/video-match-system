#!/usr/bin/env python3
"""
Extract frames from video for advertisement database.

This script:
1. Extracts frames from video at regular intervals
2. Detects scene changes
3. Generates embeddings for each frame
4. Stores in database for matching
"""

import argparse
import sys
from pathlib import Path
import cv2
import numpy as np
from typing import List, Tuple


def extract_frames_at_interval(
    video_path: Path,
    interval_seconds: float = 1.0,
    output_dir: Path = None
) -> List[Tuple[int, np.ndarray]]:
    """
    Extract frames from video at regular intervals.

    Args:
        video_path: Path to video file
        interval_seconds: Interval between frames in seconds
        output_dir: Optional directory to save frames

    Returns:
        List of (frame_number, frame) tuples
    """
    if output_dir:
        output_dir.mkdir(parents=True, exist_ok=True)

    # Open video
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise ValueError(f"Cannot open video: {video_path}")

    # Get video properties
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frames / fps

    frame_interval = int(fps * interval_seconds)

    print(f"Video: {video_path.name}")
    print(f"  FPS: {fps:.2f}")
    print(f"  Total frames: {total_frames}")
    print(f"  Duration: {duration:.2f}s")
    print(f"  Extracting every {frame_interval} frames ({interval_seconds}s)")
    print()

    frames = []
    frame_number = 0
    extracted_count = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # Extract frame at interval
        if frame_number % frame_interval == 0:
            frames.append((frame_number, frame))
            extracted_count += 1

            # Save frame if output directory specified
            if output_dir:
                timestamp = frame_number / fps
                output_path = output_dir / f"frame_{frame_number:06d}_t{timestamp:.2f}s.jpg"
                cv2.imwrite(str(output_path), frame)

            if extracted_count % 10 == 0:
                print(f"  Extracted {extracted_count} frames...")

        frame_number += 1

    cap.release()

    print(f"Total extracted: {len(frames)} frames")
    print()

    return frames


def detect_scene_changes(frames: List[Tuple[int, np.ndarray]], threshold: float = 0.3) -> List[int]:
    """
    Detect scene changes using frame difference.

    Args:
        frames: List of (frame_number, frame) tuples
        threshold: Threshold for scene change detection

    Returns:
        List of frame numbers where scene changes occur
    """
    print("Detecting scene changes...")

    scene_changes = [frames[0][0]]  # First frame is always a scene change

    for i in range(1, len(frames)):
        prev_frame = frames[i-1][1]
        curr_frame = frames[i][1]

        # Convert to grayscale
        prev_gray = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2GRAY)
        curr_gray = cv2.cvtColor(curr_frame, cv2.COLOR_BGR2GRAY)

        # Calculate frame difference
        diff = cv2.absdiff(prev_gray, curr_gray)
        diff_mean = np.mean(diff) / 255.0

        if diff_mean > threshold:
            scene_changes.append(frames[i][0])
            print(f"  Scene change at frame {frames[i][0]} (diff: {diff_mean:.3f})")

    print(f"Detected {len(scene_changes)} scene changes")
    print()

    return scene_changes


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Extract frames from video")
    parser.add_argument("video", type=Path, help="Path to video file")
    parser.add_argument("--interval", type=float, default=1.0, help="Frame interval in seconds (default: 1.0)")
    parser.add_argument("--output", type=Path, help="Output directory for frames")
    parser.add_argument("--detect-scenes", action="store_true", help="Detect scene changes")

    args = parser.parse_args()

    if not args.video.exists():
        print(f"Error: Video file not found: {args.video}")
        return 1

    print("=" * 60)
    print("Video Frame Extraction")
    print("=" * 60)
    print()

    # Extract frames
    frames = extract_frames_at_interval(
        args.video,
        interval_seconds=args.interval,
        output_dir=args.output
    )

    # Detect scene changes
    if args.detect_scenes:
        scene_changes = detect_scene_changes(frames)

    print("=" * 60)
    print("Extraction complete!")
    print("=" * 60)

    if args.output:
        print(f"Frames saved to: {args.output.absolute()}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
