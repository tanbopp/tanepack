"""
Test script for Kerf Packaging PoC (FEFCO 0201 / ECMA C-02 RSC).
Generates kerf_0201.svg, kerf_0201.json, and prints geometric summary.
"""

from __future__ import annotations

import json
import os
import sys

from kerf_packaging.ecma_generators import ecma_c02_rsc
from kerf_packaging.dieline import LineKind
from kerf_packaging.fold import fold_dieline


def main() -> None:
    output_dir = os.path.dirname(os.path.abspath(__file__))

    # Parameters matching FEFCO 0201 comparison benchmark
    length = 300.0
    width = 200.0
    depth = 150.0
    board_t = 0.5  # Material thickness in mm
    joint = 15.0   # Default manufacturer glue tab in Kerf

    print(f"=== Generating FEFCO 0201 (ECMA C-02 RSC) via kerf_packaging ===")
    print(f"Inputs: Length={length}mm, Width={width}mm, Depth={depth}mm, Thickness={board_t}mm, Joint={joint}mm\n")

    # Generate dieline
    dieline = ecma_c02_rsc(length, width, depth, board_t=board_t, joint=joint)

    cut_lines = dieline.cut_lines()
    fold_lines = dieline.fold_lines()

    print(f"--- Dieline Summary ---")
    print(f"Name:          {dieline.name}")
    print(f"Total Width:   {dieline.width:.2f} mm")
    print(f"Total Height:  {dieline.height:.2f} mm")
    print(f"Panels Count:  {len(dieline.panels)}")
    print(f"Cut Lines:     {len(cut_lines)}")
    print(f"Fold Lines:    {len(fold_lines)}")
    print(f"Total Lines:   {len(dieline.lines)}")
    print(f"Fold Edges:    {len(dieline.fold_edges)}")

    # Test 3D kinematics fold
    fold_result = fold_dieline(dieline)
    print(f"\n--- 3D Fold Check ---")
    print(f"Is Closed:     {fold_result.is_closed}")
    print(f"Bounding Box:  min={fold_result.bounding_box[0]}, max={fold_result.bounding_box[1]}")
    if fold_result.warnings:
        print(f"Warnings:      {fold_result.warnings}")

    # Export JSON
    json_path = os.path.join(output_dir, "kerf_0201.json")
    raw_data = {
        "name": dieline.name,
        "width": dieline.width,
        "height": dieline.height,
        "units": dieline.units,
        "material": dieline.material.value,
        "metadata": dieline.metadata,
        "panels": [
            {
                "name": p.name,
                "x": p.x,
                "y": p.y,
                "width": p.width,
                "height": p.height,
                "bounding_box": p.bounding_box(),
                "area": p.area(),
            }
            for p in dieline.panels
        ],
        "lines": [
            {
                "x1": l.x1,
                "y1": l.y1,
                "x2": l.x2,
                "y2": l.y2,
                "kind": l.kind.value,
                "layer": l.layer,
                "length": l.length(),
            }
            for l in dieline.lines
        ],
        "fold_edges": [
            {
                "panel_a": fe.panel_a,
                "panel_b": fe.panel_b,
                "angle_deg": fe.angle_deg,
                "line": {
                    "x1": fe.line.x1,
                    "y1": fe.line.y1,
                    "x2": fe.line.x2,
                    "y2": fe.line.y2,
                },
            }
            for fe in dieline.fold_edges
        ],
        "3d_bounding_box": {
            "min": list(fold_result.bounding_box[0]),
            "max": list(fold_result.bounding_box[1]),
        },
    }

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(raw_data, f, indent=2)
    print(f"\n[OK] Raw geometry exported to: {json_path}")

    # Export SVG
    svg_path = os.path.join(output_dir, "kerf_0201.svg")
    margin = 30.0
    vb_w = dieline.width + 2 * margin
    vb_h = dieline.height + 2 * margin

    # Standard CAD/Packaging stroke colors
    # Cut lines: Red #ff1744 / Crease (Fold) lines: Green or Cyan dashed / Panels: subtle fill
    svg_lines = [
        f'<?xml version="1.0" encoding="UTF-8"?>',
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {vb_w:.2f} {vb_h:.2f}" width="{vb_w:.2f}mm" height="{vb_h:.2f}mm">',
        f'  <defs>',
        f'    <style>',
        f'      .panel-rect {{ fill: rgba(33, 150, 243, 0.04); stroke: rgba(33, 150, 243, 0.15); stroke-width: 0.3; }}',
        f'      .cut-line {{ stroke: #d32f2f; stroke-width: 0.6; stroke-linecap: round; }}',
        f'      .fold-line {{ stroke: #1976d2; stroke-width: 0.6; stroke-dasharray: 4,3; stroke-linecap: round; }}',
        f'      .panel-label {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 8px; fill: #455a64; text-anchor: middle; dominant-baseline: middle; }}',
        f'      .dim-label {{ font-family: monospace; font-size: 7px; fill: #78909c; }}',
        f'    </style>',
        f'  </defs>',
        f'  <rect width="{vb_w:.2f}" height="{vb_h:.2f}" fill="#fafafa"/>',
        f'  <g transform="translate({margin}, {margin})">',
        f'    <!-- Panels -->',
    ]

    # In SVG Y points down, in CAD Y often points up. Let's flip Y so (0,0) is bottom-left
    # dieline.height - y
    def ty(y: float) -> float:
        return dieline.height - y

    for p in dieline.panels:
        py_svg = ty(p.y + p.height)
        svg_lines.append(
            f'    <rect class="panel-rect" x="{p.x:.2f}" y="{py_svg:.2f}" width="{p.width:.2f}" height="{p.height:.2f}"/>'
        )
        cx = p.x + p.width / 2.0
        cy = py_svg + p.height / 2.0
        svg_lines.append(
            f'    <text class="panel-label" x="{cx:.2f}" y="{cy:.2f}">{p.name}</text>'
        )

    svg_lines.append('    <!-- Cut and Fold Lines -->')
    for l in dieline.lines:
        cls = "cut-line" if l.kind == LineKind.CUT else "fold-line"
        y1_svg = ty(l.y1)
        y2_svg = ty(l.y2)
        svg_lines.append(
            f'    <line class="{cls}" x1="{l.x1:.2f}" y1="{y1_svg:.2f}" x2="{l.x2:.2f}" y2="{y2_svg:.2f}"/>'
        )

    # Add dimensions annotation
    svg_lines.append('    <!-- Dimension Annotations -->')
    svg_lines.append(
        f'    <text class="dim-label" x="0" y="-10">Blank: {dieline.width:.1f} mm × {dieline.height:.1f} mm (L={length}, W={width}, D={depth}, joint={joint})</text>'
    )
    svg_lines.append('  </g>')
    svg_lines.append('</svg>')

    with open(svg_path, "w", encoding="utf-8") as f:
        f.write("\n".join(svg_lines))
    print(f"[OK] 2D SVG exported to: {svg_path}")


if __name__ == "__main__":
    main()
