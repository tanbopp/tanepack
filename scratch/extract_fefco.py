"""Reverse-engineer FEFCO 0200-0215 vector paths and dimension annotations from ref-fefco-0200.pdf."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

import pymupdf

PDF_PATH = Path(__file__).resolve().parent.parent / 'ref-fefco-0200.pdf'
MODEL_HEADING_RE = re.compile(r'^(02\d{2}(?:\.\d+)?)\b')

# Horizontal threshold separating the 2D flat dieline (left) from the 3D isometric preview (right).
ISOMETRIC_SPLIT_X = 345.0
# Pages 1-3 are title & TOC; technical drawings start at Page 4 (index 3).
FIRST_DIAGRAM_PAGE_IDX = 3


def drawing_items_to_svg_path(items: list[tuple[Any, ...]]) -> str:
  """Convert PyMuPDF vector drawing primitives into an SVG path d string."""
  cmds: list[str] = []
  last_pt: tuple[float, float] | None = None

  for item in items:
    op = item[0]
    if op == 'l':
      p1, p2 = item[1], item[2]
      start = (round(p1.x, 2), round(p1.y, 2))
      end = (round(p2.x, 2), round(p2.y, 2))
      if last_pt != start:
        cmds.append(f'M {start[0]},{start[1]}')
      cmds.append(f'L {end[0]},{end[1]}')
      last_pt = end
    elif op == 're':
      rect = item[1]
      x0, y0, x1, y1 = (
          round(rect.x0, 2),
          round(rect.y0, 2),
          round(rect.x1, 2),
          round(rect.y1, 2),
      )
      cmds.append(f'M {x0},{y0} L {x1},{y0} L {x1},{y1} L {x0},{y1} Z')
      last_pt = (x0, y0)
    elif op == 'c':
      p1, p2, p3, p4 = item[1], item[2], item[3], item[4]
      start = (round(p1.x, 2), round(p1.y, 2))
      if last_pt != start:
        cmds.append(f'M {start[0]},{start[1]}')
      cmds.append(
          f'C {round(p2.x, 2)},{round(p2.y, 2)} '
          f'{round(p3.x, 2)},{round(p3.y, 2)} '
          f'{round(p4.x, 2)},{round(p4.y, 2)}'
      )
      last_pt = (round(p4.x, 2), round(p4.y, 2))
    elif op == 'qu':
      quad = item[1]
      pts = [quad.ul, quad.ur, quad.lr, quad.ll]
      coords = [(round(p.x, 2), round(p.y, 2)) for p in pts]
      cmds.append(
          f'M {coords[0][0]},{coords[0][1]} '
          f'L {coords[1][0]},{coords[1][1]} '
          f'L {coords[2][0]},{coords[2][1]} '
          f'L {coords[3][0]},{coords[3][1]} Z'
      )
      last_pt = coords[0]
  return ' '.join(cmds)


def extract_segments(items: list[tuple[Any, ...]]) -> list[tuple[float, float, float, float]]:
  """Extract orthogonal & arbitrary line segments from PyMuPDF drawing items."""
  segs: list[tuple[float, float, float, float]] = []
  for item in items:
    op = item[0]
    if op == 'l':
      p1, p2 = item[1], item[2]
      segs.append((p1.x, p1.y, p2.x, p2.y))
    elif op == 're':
      r = item[1]
      segs.extend([
          (r.x0, r.y0, r.x1, r.y0),
          (r.x1, r.y0, r.x1, r.y1),
          (r.x1, r.y1, r.x0, r.y1),
          (r.x0, r.y1, r.x0, r.y0),
      ])
  return segs


def cluster_coords(values: list[float], tol: float = 0.8) -> list[float]:
  """Group nearby scalar coordinates into sorted cluster averages."""
  if not values:
    return []
  sorted_vals = sorted(values)
  clusters: list[list[float]] = [[sorted_vals[0]]]
  for val in sorted_vals[1:]:
    if val - clusters[-1][-1] <= tol:
      clusters[-1].append(val)
    else:
      clusters.append([val])
  return [round(sum(c) / len(c), 2) for c in clusters]


def analyze_dieline_geometry(
    dieline_drawings: list[dict[str, Any]], dieline_texts: list[dict[str, Any]]
) -> dict[str, Any]:
  """Analyze 2D panel columns and top/bottom flap rows from extracted vector paths and creases."""
  solid_segs: list[tuple[float, float, float, float]] = []
  crease_segs: list[tuple[float, float, float, float]] = []
  svg_cuts: list[str] = []
  svg_creases: list[str] = []

  for d in dieline_drawings:
    path_str = drawing_items_to_svg_path(d['items'])
    if not path_str:
      continue
    dashes = d.get('dashes') or ''
    color = d.get('color')
    is_red_or_dashed = bool(dashes and dashes != '[] 0') or (
        color is not None and len(color) == 3 and color[0] > 0.6 and color[1] < 0.4
    )
    segs = extract_segments(d['items'])
    if is_red_or_dashed:
      crease_segs.extend(segs)
      svg_creases.append(path_str)
    else:
      solid_segs.extend(segs)
      svg_cuts.append(path_str)

  all_segs = solid_segs + crease_segs
  if not all_segs:
    return {}

  xs = [x for s in all_segs for x in (s[0], s[2])]
  ys = [y for s in all_segs for y in (s[1], s[3])]
  min_x, max_x = round(min(xs), 2), round(max(xs), 2)
  min_y, max_y = round(min(ys), 2), round(max(ys), 2)

  # Body labels ('L', 'W') sit just above the bottom body crease in every FEFCO 02xx schematic
  lw_labels = [t for t in dieline_texts if t['text'] in ('L', 'W') and t['x'] > 50]
  body_label_y = (
      sorted(lw_labels, key=lambda t: t['y'])[len(lw_labels) // 2]['y']
      if lw_labels
      else (min_y + max_y) * 0.5
  )

  # Collect all horizontal crease Y lines and horizontal cut Y lines
  horiz_creases = [
      s for s in crease_segs if abs(s[1] - s[3]) < 0.5 and abs(s[2] - s[0]) > 15.0
  ]
  horiz_crease_ys = cluster_coords([(s[1] + s[3]) * 0.5 for s in horiz_creases], tol=1.2)
  horiz_cuts = [s for s in solid_segs if abs(s[1] - s[3]) < 0.5 and abs(s[2] - s[0]) > 15.0]
  horiz_cut_ys = cluster_coords([(s[1] + s[3]) * 0.5 for s in horiz_cuts], tol=1.2)

  # Closest horizontal crease below body_label_y is yBodyBot; closest line above is yBodyTop
  below_creases = [y for y in horiz_crease_ys if y >= body_label_y - 3.0]
  above_lines = sorted(
      [y for y in (horiz_crease_ys + horiz_cut_ys) if y <= body_label_y - 10.0],
      reverse=True,
  )
  body_bot_y = below_creases[0] if below_creases else max_y
  body_top_y = above_lines[0] if above_lines else min_y
  body_height_pt = round(body_bot_y - body_top_y, 2)

  # Vertical creases that span the main body panel [body_top_y..body_bot_y] give panel column edges
  body_vert_creases = [
      s
      for s in crease_segs
      if abs(s[0] - s[2]) < 0.5
      and min(s[1], s[3]) <= body_bot_y + 2.0
      and max(s[1], s[3]) >= body_top_y - 2.0
      and abs(s[3] - s[1]) >= body_height_pt * 0.4
  ]
  vert_crease_xs = cluster_coords([(s[0] + s[2]) * 0.5 for s in body_vert_creases], tol=1.5)
  panel_edges_x = vert_crease_xs + (
      [max_x] if max_x - (vert_crease_xs[-1] if vert_crease_xs else 0) > 10 else []
  )
  panel_widths = [
      round(panel_edges_x[i + 1] - panel_edges_x[i], 2)
      for i in range(len(panel_edges_x) - 1)
  ]

  # Measure each column's top and bottom flap outer extent relative to yBodyTop / yBodyBot
  column_flaps: list[dict[str, Any]] = []
  for idx in range(len(panel_edges_x) - 1):
    cx0, cx1 = panel_edges_x[idx], panel_edges_x[idx + 1]
    col_mid = (cx0 + cx1) * 0.5
    col_top_ys = [
        min(s[1], s[3])
        for s in horiz_cuts
        if min(s[0], s[2]) <= col_mid <= max(s[0], s[2]) and s[1] <= body_top_y + 1.0
    ]
    col_bot_ys = [
        max(s[1], s[3])
        for s in horiz_cuts
        if min(s[0], s[2]) <= col_mid <= max(s[0], s[2]) and s[1] >= body_bot_y - 1.0
    ]
    top_ext = round(body_top_y - min(col_top_ys), 2) if col_top_ys else 0.0
    bot_ext = round(max(col_bot_ys) - body_bot_y, 2) if col_bot_ys else 0.0
    column_flaps.append({
        'colIndex': idx,
        'widthPt': round(cx1 - cx0, 2),
        'topFlapPt': top_ext,
        'bottomFlapPt': bot_ext,
    })

  l_pt = panel_widths[0] if len(panel_widths) >= 4 else (max(panel_widths) if panel_widths else 0.0)
  w_pt = panel_widths[1] if len(panel_widths) >= 4 else (min(panel_widths) if panel_widths else 0.0)

  ratios: list[dict[str, Any]] = []
  for cf in column_flaps:
    ratios.append({
        'col': cf['colIndex'],
        'widthPt': cf['widthPt'],
        'topPt': cf['topFlapPt'],
        'top_over_W': round(cf['topFlapPt'] / w_pt, 3) if w_pt else 0.0,
        'top_over_L': round(cf['topFlapPt'] / l_pt, 3) if l_pt else 0.0,
        'botPt': cf['bottomFlapPt'],
        'bot_over_W': round(cf['bottomFlapPt'] / w_pt, 3) if w_pt else 0.0,
        'bot_over_L': round(cf['bottomFlapPt'] / l_pt, 3) if l_pt else 0.0,
    })

  annotations = [
      {
          'text': t['text'],
          'x': round(t['x'], 1),
          'y': round(t['y'], 1),
      }
      for t in sorted(dieline_texts, key=lambda item: (round(item['y'], 1), round(item['x'], 1)))
  ]

  return {
      'boundsPt': {
          'minX': min_x,
          'minY': min_y,
          'maxX': max_x,
          'maxY': max_y,
          'width': round(max_x - min_x, 2),
          'height': round(max_y - min_y, 2),
      },
      'L_pt': l_pt,
      'W_pt': w_pt,
      'H_pt': body_height_pt,
      'bodyBoundsY': {'top': body_top_y, 'bot': body_bot_y},
      'horizCreaseYs': horiz_crease_ys,
      'vertCreaseXs': vert_crease_xs,
      'panelWidthsPt': panel_widths,
      'columnRatios': ratios,
      'annotations': annotations,
      'cutSvgPaths': svg_cuts,
      'creaseSvgPaths': svg_creases,
  }


def extract_models(target_codes: set[str]) -> list[dict[str, Any]]:
  """Extract structured vector + annotation models from ref-fefco-0200.pdf."""
  doc = pymupdf.open(str(PDF_PATH))
  results: list[dict[str, Any]] = []

  for page_idx in range(FIRST_DIAGRAM_PAGE_IDX, len(doc)):
    page = doc[page_idx]
    text_dict = page.get_text('dict')

    spans: list[dict[str, Any]] = []
    headings: list[dict[str, Any]] = []
    for block in text_dict.get('blocks', []):
      for line in block.get('lines', []):
        line_text = ''.join(s['text'] for s in line.get('spans', [])).strip()
        bbox = line['bbox']
        m = MODEL_HEADING_RE.match(line_text)
        max_size = max((s['size'] for s in line.get('spans', [])), default=0)
        if m and bbox[0] < 100 and max_size > 12:
          headings.append({
              'code': m.group(1),
              'fullTitle': line_text,
              'yTop': bbox[1],
              'yBot': bbox[3],
          })
        for span in line.get('spans', []):
          txt = span['text'].strip()
          if not txt:
            continue
          sb = span['bbox']
          spans.append({
              'text': txt,
              'x': (sb[0] + sb[2]) * 0.5,
              'y': (sb[1] + sb[3]) * 0.5,
              'size': span['size'],
          })

    headings.sort(key=lambda h: h['yTop'])
    if not headings:
      continue

    drawings = page.get_drawings()
    for i, heading in enumerate(headings):
      code = heading['code']
      if code not in target_codes:
        continue
      band_top = heading['yBot']
      band_bot = headings[i + 1]['yTop'] if i + 1 < len(headings) else page.rect.height - 45

      band_drawings = [
          d
          for d in drawings
          if band_top <= (d['rect'].y0 + d['rect'].y1) * 0.5 <= band_bot
          and d['rect'].x1 <= ISOMETRIC_SPLIT_X
      ]
      band_texts = [
          s
          for s in spans
          if band_top <= s['y'] <= band_bot and s['x'] <= ISOMETRIC_SPLIT_X
      ]
      iso_texts = [
          s
          for s in spans
          if band_top <= s['y'] <= band_bot and s['x'] > ISOMETRIC_SPLIT_X
      ]

      analysis = analyze_dieline_geometry(band_drawings, band_texts)
      results.append({
          'code': code,
          'title': heading['fullTitle'],
          'page': page_idx + 1,
          'isometricLabels': [t['text'] for t in iso_texts],
          **analysis,
      })

  return results


def main() -> None:
  targets = {f'02{n:02d}' for n in range(0, 16)}
  models = extract_models(targets)

  print(f'Extracted {len(models)} FEFCO 0200-series models from {PDF_PATH.name}:\n')
  for model in models:
    print(f"=== FEFCO {model['code']} ({model['title']}) [page {model['page']}] ===")
    print(
        f"  L={model.get('L_pt')}pt, W={model.get('W_pt')}pt, H={model.get('H_pt')}pt "
        f"| panels={model.get('panelWidthsPt')}"
    )
    print(f"  2D Annotations: {[a['text'] for a in model.get('annotations', [])]}")
    print('  Column flap measurements & ratios:')
    for col in model.get('columnRatios', []):
      print(
          f"    col[{col['col']}] w={col['widthPt']}pt: "
          f"top={col['topPt']}pt ({col['top_over_W']}*W, {col['top_over_L']}*L) | "
          f"bot={col['botPt']}pt ({col['bot_over_W']}*W, {col['bot_over_L']}*L)"
      )
    print(
        f"  Extracted SVG counts: {len(model.get('cutSvgPaths', []))} cut paths, "
        f"{len(model.get('creaseSvgPaths', []))} crease paths"
    )
    print()

  if '--json' in __import__('sys').argv:
    print(json.dumps(models, indent=2))


if __name__ == '__main__':
  main()
