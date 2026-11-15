import type { FefcoConfig } from './types';

export type FefcoCatalogGroup =
  'FEFCO 0200 (Slotted)' | 'FEFCO 0200 (Tuck Top)' | 'FEFCO 0200 (Crash Lock)';

export interface FefcoCatalogEntry {
  config: FefcoConfig;
  group: FefcoCatalogGroup;
  description: string;
  defaultDimensions: {
    length: number;
    width: number;
    height: number;
  };
}

/**
 * Complete catalog of all 36 FEFCO 0200-series models calibrated against ref-fefco-0200.pdf.
 */
export const FEFCO_CATALOG_ENTRIES: readonly FefcoCatalogEntry[] = [
  {
    config: {
      id: 'fefco-0200',
      name: 'FEFCO 0200 — Half-Slotted Container (HSC)',
      topFlapType: 'none',
      bottomFlapType: 'rsc',
      flapPreset: { top: 'none', bottom: 'rsc' },
      flapMath: { topOuter: 0, bottomOuter: 0.5, inner: 0.5 },
    },
    group: 'FEFCO 0200 (Slotted)',
    description: 'Open-top half-slotted tray or telescopic sleeve with W/2 bottom flaps.',
    defaultDimensions: { length: 200, width: 150, height: 120 },
  },
  {
    config: {
      id: 'fefco-0201',
      name: 'FEFCO 0201 — Regular Slotted Container (RSC)',
      topFlapType: 'rsc',
      bottomFlapType: 'rsc',
      flapPreset: { top: 'rsc', bottom: 'rsc' },
      flapMath: { topOuter: 0.5, bottomOuter: 0.5, inner: 0.5 },
    },
    group: 'FEFCO 0200 (Slotted)',
    description: 'Industry-standard shipping box where all top and bottom flaps equal W/2.',
    defaultDimensions: { length: 220, width: 150, height: 120 },
  },
  {
    config: {
      id: 'fefco-0202',
      name: 'FEFCO 0202 — Overlap Slotted Container (ORSC)',
      topFlapType: 'extended',
      bottomFlapType: 'extended',
      flapPreset: { top: 'extended-55', bottom: 'extended-55' },
      flapMath: { topOuter: 0.55, bottomOuter: 0.55, inner: 0.55 },
    },
    group: 'FEFCO 0200 (Slotted)',
    description: 'Extended W/2 + o outer flaps overlapping cleanly along the center seam.',
    defaultDimensions: { length: 220, width: 150, height: 120 },
  },
  {
    config: {
      id: 'fefco-0203',
      name: 'FEFCO 0203 — Full Overlap Slotted (FOL)',
      topFlapType: 'full',
      bottomFlapType: 'full',
      flapPreset: { top: 'full-overlap', bottom: 'full-overlap' },
      flapMath: { topOuter: 1.0, bottomOuter: 1.0, inner: 1.0 },
      allowInnerOverlap: true,
    },
    group: 'FEFCO 0200 (Slotted)',
    description: 'Heavy-duty full overlap carton where all outer and inner flaps equal 1.0 W.',
    defaultDimensions: { length: 240, width: 140, height: 100 },
  },
  {
    config: {
      id: 'fefco-0204',
      name: 'FEFCO 0204 — Center Special Slotted (CSSC)',
      topFlapType: 'rsc',
      bottomFlapType: 'rsc',
      flapPreset: { top: 'center-special', bottom: 'center-special' },
      flapMath: { topOuter: 0.5, bottomOuter: 0.5, inner: 0.5, innerBasis: 'L' },
    },
    group: 'FEFCO 0200 (Slotted)',
    description: 'Flush inner-seam carton with W/2 outer flaps and L/2 inner dust flaps.',
    defaultDimensions: { length: 220, width: 150, height: 120 },
  },
  {
    config: {
      id: 'fefco-0205',
      name: 'FEFCO 0205 — Center Special Overlap (CSO)',
      topFlapType: 'extended',
      bottomFlapType: 'extended',
      flapPreset: { top: 'all-half-L', bottom: 'all-half-L' },
      flapMath: {
        topOuter: 0.5,
        bottomOuter: 0.5,
        topOuterBasis: 'L',
        bottomOuterBasis: 'L',
        inner: 0.5,
        innerBasis: 'L',
      },
    },
    group: 'FEFCO 0200 (Slotted)',
    description: 'Uniform L/2 flaps across every panel for square-profile flush inner/outer seams.',
    defaultDimensions: { length: 220, width: 150, height: 120 },
  },
  {
    config: {
      id: 'fefco-0206',
      name: 'FEFCO 0206 — Center Special Full Overlap (SFF)',
      topFlapType: 'full',
      bottomFlapType: 'full',
      flapPreset: { top: 'center-special-full', bottom: 'center-special-full' },
      flapMath: { topOuter: 1.0, bottomOuter: 1.0, inner: 0.5, innerBasis: 'L' },
    },
    group: 'FEFCO 0200 (Slotted)',
    description: 'Maximum double-wall cushioning combining 1.0 W outer flaps and L/2 inner flaps.',
    defaultDimensions: { length: 240, width: 150, height: 110 },
  },
  {
    config: {
      id: 'fefco-0207',
      name: 'FEFCO 0207 — RSC w/ Folded Divider Base',
      topFlapType: 'rsc',
      bottomFlapType: 'custom',
      flapPreset: { top: 'rsc', bottom: 'partition-207-bot' },
    },
    group: 'FEFCO 0200 (Slotted)',
    description: 'Standard W/2 top with interlocking slotted partition bottom flaps.',
    defaultDimensions: { length: 220, width: 150, height: 120 },
  },
  {
    config: {
      id: 'fefco-0208',
      name: 'FEFCO 0208 — Partition-Flap Slotted Box',
      topFlapType: 'custom',
      bottomFlapType: 'custom',
      flapPreset: { top: 'partition-208', bottom: 'partition-208' },
    },
    group: 'FEFCO 0200 (Slotted)',
    description:
      'Extended scored top and bottom flaps with split W panels forming center dividers.',
    defaultDimensions: { length: 220, width: 150, height: 130 },
  },
  {
    config: {
      id: 'fefco-0209',
      name: 'FEFCO 0209 — Reduced Top Flap Box',
      topFlapType: 'extended',
      bottomFlapType: 'rsc',
      flapPreset: { top: 'reduced-25', bottom: 'rsc' },
      flapMath: { topOuter: 0.25, bottomOuter: 0.5, inner: 0.25, bottomInner: 0.5 },
    },
    group: 'FEFCO 0200 (Slotted)',
    description: 'Shallow 0.25 W short top dust flaps paired with standard W/2 bottom flaps.',
    defaultDimensions: { length: 200, width: 150, height: 110 },
  },
  {
    config: {
      id: 'fefco-0210',
      name: 'FEFCO 0210 — Double Roll End Tuck (Straight)',
      topFlapType: 'tuck',
      bottomFlapType: 'tuck',
      flapPreset: { top: 'rett-c0', bottom: 'rett-c0' },
      tuckDepth: 20,
    },
    group: 'FEFCO 0200 (Tuck Top)',
    description:
      'Straight tuck folding carton with full-width 1.0 W lids and rounded tuck tongues.',
    defaultDimensions: { length: 160, width: 100, height: 110 },
  },
  {
    config: {
      id: 'fefco-0211',
      name: 'FEFCO 0211 — Reverse Tuck Carton (RTE)',
      topFlapType: 'tuck',
      bottomFlapType: 'tuck',
      flapPreset: { top: 'rett-c0', bottom: 'rett-c2' },
      tuckDepth: 20,
    },
    group: 'FEFCO 0200 (Tuck Top)',
    description: 'Efficient alternating top/bottom tuck carton hinged from opposite L panels.',
    defaultDimensions: { length: 160, width: 100, height: 110 },
  },
  {
    config: {
      id: 'fefco-0212',
      name: 'FEFCO 0212 — Tuck Top / RSC Bottom',
      topFlapType: 'tuck',
      bottomFlapType: 'rsc',
      flapPreset: { top: 'rett-c0', bottom: 'rsc' },
      tuckDepth: 20,
    },
    group: 'FEFCO 0200 (Tuck Top)',
    description: 'Reclosable tuck-top display box paired with a classic taped W/2 slotted base.',
    defaultDimensions: { length: 170, width: 110, height: 110 },
  },
  {
    config: {
      id: 'fefco-0214',
      name: 'FEFCO 0214 — Flanged Collar Top Box',
      topFlapType: 'custom',
      bottomFlapType: 'rsc',
      flapPreset: { top: 'rim-flange-214', bottom: 'rsc' },
    },
    group: 'FEFCO 0200 (Slotted)',
    description: 'Double-creased chamfered rim flange top flaps reducing board crack at the hinge.',
    defaultDimensions: { length: 200, width: 140, height: 120 },
  },
  {
    config: {
      id: 'fefco-0215',
      name: 'FEFCO 0215 — Tuck Top / 1-2-3 Snap-Lock Bottom',
      topFlapType: 'tuck',
      bottomFlapType: 'snap-lock',
      flapPreset: { top: 'tuck-lid-215-c0', bottom: 'snap-lock' },
      tuckDepth: 20,
    },
    group: 'FEFCO 0200 (Tuck Top)',
    description:
      'Retail tuck-top carton with 0.37 W dust flaps and tape-free 1-2-3 interlocking bottom.',
    defaultDimensions: { length: 160, width: 105, height: 110 },
  },
  {
    config: {
      id: 'fefco-0216',
      name: 'FEFCO 0216 — RSC Top / Snap-Lock Bottom',
      topFlapType: 'rsc',
      bottomFlapType: 'snap-lock',
      flapPreset: { top: 'rsc', bottom: 'snap-lock' },
    },
    group: 'FEFCO 0200 (Crash Lock)',
    description: 'Slotted W/2 top closure paired with an interlocking 1-2-3 snap-lock base.',
    defaultDimensions: { length: 180, width: 120, height: 110 },
  },
  {
    config: {
      id: 'fefco-0217',
      name: 'FEFCO 0217 — Gable Handle / Snap-Lock Bottom',
      topFlapType: 'custom',
      bottomFlapType: 'snap-lock',
      flapPreset: { top: 'handle-217-top', bottom: 'snap-lock' },
    },
    group: 'FEFCO 0200 (Tuck Top)',
    description:
      'Portable carrier box with integrated die-cut handle top and 1-2-3 snap-lock bottom.',
    defaultDimensions: { length: 200, width: 120, height: 130 },
  },
  {
    config: {
      id: 'fefco-0218',
      name: 'FEFCO 0218 — Lock-Tab Overlap Top / FOL Bottom',
      topFlapType: 'custom',
      bottomFlapType: 'full',
      flapPreset: { top: 'lock-ear-218-top', bottom: 'full-overlap' },
    },
    group: 'FEFCO 0200 (Tuck Top)',
    description: 'Self-locking friction ear top lid above a rigid 1.0 W full overlap base.',
    defaultDimensions: { length: 200, width: 140, height: 110 },
  },
  {
    config: {
      id: 'fefco-0219',
      name: 'FEFCO 0219 — Latch Lock Lid / Snap-Lock Bottom',
      topFlapType: 'tuck',
      bottomFlapType: 'snap-lock',
      flapPreset: { top: 'latch-219-top', bottom: 'snap-lock' },
      tuckDepth: 18,
    },
    group: 'FEFCO 0200 (Tuck Top)',
    description: 'Security latch-slot top lid with finger cutouts over a 1-2-3 snap-lock bottom.',
    defaultDimensions: { length: 180, width: 120, height: 100 },
  },
  {
    config: {
      id: 'fefco-0220',
      name: 'FEFCO 0220 — Double Snap-Lock Container',
      topFlapType: 'snap-lock',
      bottomFlapType: 'snap-lock',
      flapPreset: { top: 'snap-lock', bottom: 'snap-lock' },
    },
    group: 'FEFCO 0200 (Crash Lock)',
    description: 'Symmetrical tape-free 1-2-3 snap-lock closures on both top and bottom ends.',
    defaultDimensions: { length: 180, width: 120, height: 110 },
  },
  {
    config: {
      id: 'fefco-0221',
      name: 'FEFCO 0221 — Open Top / Snap-Lock Base',
      topFlapType: 'none',
      bottomFlapType: 'snap-lock',
      flapPreset: { top: 'none', bottom: 'snap-lock' },
    },
    group: 'FEFCO 0200 (Crash Lock)',
    description: 'Open-top retail bin or sleeve with a self-locking 1-2-3 base.',
    defaultDimensions: { length: 180, width: 120, height: 110 },
  },
  {
    config: {
      id: 'fefco-0222',
      name: 'FEFCO 0222 — Carrier Handle / Lock Base',
      topFlapType: 'custom',
      bottomFlapType: 'snap-lock',
      flapPreset: { top: 'carrier-222-top', bottom: 'lock-222-bot' },
      columnLayout: 'W-L-W-L',
    },
    group: 'FEFCO 0200 (Tuck Top)',
    description:
      'Bottle/gift carrier carton with W-L-W-L panel order, locking side straps, and oval handles.',
    defaultDimensions: { length: 120, width: 200, height: 170 },
  },
  {
    config: {
      id: 'fefco-0225',
      name: 'FEFCO 0225 — Asymmetric Wrap Bottom Box',
      topFlapType: 'rsc',
      bottomFlapType: 'full',
      flapPreset: { top: 'rsc', bottom: 'wrap-225-bot' },
    },
    group: 'FEFCO 0200 (Slotted)',
    description: 'Continuous wrap-around 1.0 W base flap with thumb-notch release and W/2 top.',
    defaultDimensions: { length: 200, width: 140, height: 110 },
  },
  {
    config: {
      id: 'fefco-0226',
      name: 'FEFCO 0226 — Un-Slotted Bellows Folding Box',
      topFlapType: 'custom',
      bottomFlapType: 'custom',
      flapPreset: { top: 'bellows-226', bottom: 'bellows-226' },
    },
    group: 'FEFCO 0200 (Slotted)',
    description:
      'Leak-resistant un-slotted rectangular blank with V-chevron bellows corner creases.',
    defaultDimensions: { length: 200, width: 140, height: 100 },
  },
  {
    config: {
      id: 'fefco-0227',
      name: 'FEFCO 0227 — Gusseted Full-Overlap Liquid Box',
      topFlapType: 'full',
      bottomFlapType: 'full',
      flapPreset: { top: 'gusset-227', bottom: 'gusset-227' },
    },
    group: 'FEFCO 0200 (Slotted)',
    description: 'Reinforced corner-gusset 1.0 W full overlap container with diagonal fold webs.',
    defaultDimensions: { length: 200, width: 140, height: 110 },
  },
  {
    config: {
      id: 'fefco-0228',
      name: 'FEFCO 0228 — 6-Panel Side-Sleeve Wrap Carton',
      topFlapType: 'rsc',
      bottomFlapType: 'rsc',
      flapPreset: { top: 'rsc', bottom: 'rsc' },
      columnLayout: 'wrap-0228',
    },
    group: 'FEFCO 0200 (Slotted)',
    description:
      'Double-sidewall 6-panel blank splitting the rear wall with an extra un-flapped wrap panel.',
    defaultDimensions: { length: 160, width: 110, height: 110 },
  },
  {
    config: {
      id: 'fefco-0229',
      name: 'FEFCO 0229 — Scored Center Special (Outer Crease)',
      topFlapType: 'rsc',
      bottomFlapType: 'rsc',
      flapPreset: { top: 'crease-v-229', bottom: 'crease-v-229' },
    },
    group: 'FEFCO 0200 (Slotted)',
    description: 'Center-special box adding variable-depth trim creases across outer L flaps.',
    defaultDimensions: { length: 220, width: 150, height: 120 },
  },
  {
    config: {
      id: 'fefco-0229-1',
      name: 'FEFCO 0229.1 — Scored Center Special (Inner Crease)',
      topFlapType: 'rsc',
      bottomFlapType: 'rsc',
      flapPreset: { top: 'crease-v-229-1', bottom: 'crease-v-229-1' },
    },
    group: 'FEFCO 0200 (Slotted)',
    description: 'Variant of 0229 placing variable-depth trim score creases on the inner W flaps.',
    defaultDimensions: { length: 220, width: 150, height: 120 },
  },
  {
    config: {
      id: 'fefco-0230',
      name: 'FEFCO 0230 — Offset Seam on L Wall',
      topFlapType: 'rsc',
      bottomFlapType: 'rsc',
      flapPreset: { top: 'rsc', bottom: 'rsc' },
      columnLayout: 'offset-L',
    },
    group: 'FEFCO 0200 (Slotted)',
    description: 'Wide-blank RSC shifting the manufacturer joint seam partway across the L wall.',
    defaultDimensions: { length: 160, width: 200, height: 120 },
  },
  {
    config: {
      id: 'fefco-0231',
      name: 'FEFCO 0231 — Offset Seam on W Wall',
      topFlapType: 'rsc',
      bottomFlapType: 'rsc',
      flapPreset: { top: 'rsc', bottom: 'rsc' },
      columnLayout: 'offset-W',
    },
    group: 'FEFCO 0200 (Slotted)',
    description: 'Slotted RSC shifting the manufacturer glue flange ~1/3 across the W panel.',
    defaultDimensions: { length: 200, width: 150, height: 120 },
  },
  {
    config: {
      id: 'fefco-0232',
      name: 'FEFCO 0232 — Stepped Bottom Lock / RSC Top',
      topFlapType: 'rsc',
      bottomFlapType: 'crash-lock',
      flapPreset: { top: 'rsc', bottom: 'step-lock-232-bot' },
    },
    group: 'FEFCO 0200 (Crash Lock)',
    description: 'Standard W/2 top paired with a stepped interlocking bottom base.',
    defaultDimensions: { length: 200, width: 140, height: 110 },
  },
  {
    config: {
      id: 'fefco-0233',
      name: 'FEFCO 0233 — Crash-Lock Bottom / 0.44 W Top',
      topFlapType: 'rsc',
      bottomFlapType: 'crash-lock',
      flapPreset: { top: 'rsc-44', bottom: 'crash-lock-233' },
    },
    group: 'FEFCO 0200 (Crash Lock)',
    description:
      'Pre-glued auto-bottom crash-lock box with 45° diagonal creases and slotted lock slot.',
    defaultDimensions: { length: 200, width: 140, height: 110 },
  },
  {
    config: {
      id: 'fefco-0233-1',
      name: 'FEFCO 0233.1 — Open-Notch Crash-Lock Bottom',
      topFlapType: 'rsc',
      bottomFlapType: 'crash-lock',
      flapPreset: { top: 'rsc-44', bottom: 'crash-lock-233-1' },
    },
    group: 'FEFCO 0200 (Crash Lock)',
    description: 'High-speed auto-erecting crash-lock variant featuring an open U-notch base lock.',
    defaultDimensions: { length: 200, width: 140, height: 110 },
  },
  {
    config: {
      id: 'fefco-0240',
      name: 'FEFCO 0240 — Double-Euroslot Hang Header / Snap-Lock',
      topFlapType: 'tuck',
      bottomFlapType: 'snap-lock',
      flapPreset: { top: 'euroslot-240-top', bottom: 'snap-lock' },
      tuckDepth: 18,
    },
    group: 'FEFCO 0200 (Tuck Top)',
    description:
      'Tall POS retail display carton with folded twin-Euroslot header, tuck lid, and 1-2-3 bottom.',
    defaultDimensions: { length: 130, width: 85, height: 170 },
  },
  {
    config: {
      id: 'fefco-0241',
      name: 'FEFCO 0241 — Side-Wing Euroslot / Tuck Top / Snap-Lock',
      topFlapType: 'tuck',
      bottomFlapType: 'snap-lock',
      flapPreset: { top: 'euroslot-241-top', bottom: 'snap-lock' },
      tuckDepth: 18,
    },
    group: 'FEFCO 0200 (Tuck Top)',
    description:
      'Tall hanging retail carton placing reinforced Euroslot tabs on both W side wings.',
    defaultDimensions: { length: 130, width: 85, height: 170 },
  },
  {
    config: {
      id: 'fefco-0242',
      name: 'FEFCO 0242 — Neck-Tower Euroslot / Latch Lid / Snap-Lock',
      topFlapType: 'tuck',
      bottomFlapType: 'snap-lock',
      flapPreset: { top: 'euroslot-242-top', bottom: 'snap-lock' },
      tuckDepth: 18,
    },
    group: 'FEFCO 0200 (Tuck Top)',
    description:
      'Heavy-duty hanging box with narrow-neck multi-fold Euroslot tower and locking lid.',
    defaultDimensions: { length: 130, width: 85, height: 170 },
  },
];

export const FEFCO_CONFIG_BY_ID: Record<string, FefcoConfig> = Object.fromEntries(
  FEFCO_CATALOG_ENTRIES.map((entry) => [entry.config.id, entry.config]),
);
