// Unit tests verifying BoxViewer rebuilds 3D geometry on dieline changes and disposes old models
import { cleanup, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateTuckEndBox } from '@entities/dieline';
import { BoxViewer } from './BoxViewer';

const { createdModels, mockInvalidate } = vi.hoisted(() => ({
  createdModels: [] as Array<{ totalWidth: number; dispose: ReturnType<typeof vi.fn> }>,
  mockInvalidate: vi.fn(),
}));

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: ReactNode }) => (
    <div data-testid="mock-r3f-canvas">{children}</div>
  ),
  useThree: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      invalidate: mockInvalidate,
      gl: { render: vi.fn(), domElement: { toDataURL: () => '' } },
      scene: {},
      camera: {},
    }),
}));

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => null,
}));

vi.mock('./buildBoxGeometry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./buildBoxGeometry')>();
  return {
    ...actual,
    buildBoxGeometry: (dieline: Parameters<typeof actual.buildBoxGeometry>[0]) => {
      const model = actual.buildBoxGeometry(dieline);
      const originalDispose = model.dispose;
      const disposeSpy = vi.fn(() => {
        originalDispose();
      });
      createdModels.push({ totalWidth: dieline.totalWidth, dispose: disposeSpy });
      return {
        ...model,
        dispose: disposeSpy,
      };
    },
  };
});

let restoreConsoleError: (() => void) | null = null;

beforeEach(() => {
  const originalError = console.error;
  const spy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    const first = typeof args[0] === 'string' ? args[0] : '';
    if (
      first.includes('is unrecognized in this browser') ||
      first.includes('using incorrect casing') ||
      first.includes('non-boolean attribute') ||
      first.includes('does not recognize the `%s` prop')
    ) {
      return;
    }
    originalError(...args);
  });
  restoreConsoleError = () => spy.mockRestore();
});

afterEach(() => {
  restoreConsoleError?.();
  restoreConsoleError = null;
  createdModels.length = 0;
  mockInvalidate.mockReset();
  cleanup();
});

describe('BoxViewer geometry lifecycle', () => {
  it('rebuilds procedural geometry when dieline changes and disposes every previous model without leaks', () => {
    const initialDieline = generateTuckEndBox({
      length: 100,
      width: 50,
      height: 100,
      thickness: 0.5,
      bleedSize: 3,
    });

    const { rerender, unmount } = render(<BoxViewer dieline={initialDieline} />);
    expect(createdModels).toHaveLength(1);
    expect(createdModels[0]?.totalWidth).toBe(317);
    expect(createdModels[0]?.dispose).not.toHaveBeenCalled();

    const resizedDieline = generateTuckEndBox({
      length: 150,
      width: 50,
      height: 100,
      thickness: 0.5,
      bleedSize: 3,
    });
    rerender(<BoxViewer dieline={resizedDieline} foldAngle={45} />);

    expect(createdModels).toHaveLength(2);
    expect(createdModels[0]?.dispose).toHaveBeenCalledTimes(1);
    expect(createdModels[1]?.totalWidth).toBe(417);
    expect(createdModels[1]?.dispose).not.toHaveBeenCalled();
    expect(mockInvalidate).toHaveBeenCalled();

    // Renders dedicated single-sided outside & inside meshes per panel to prevent Z-fighting
    const outsideMesh = document.querySelector('mesh[name="face-front-outside"]');
    const insideMesh = document.querySelector('mesh[name="face-front-inside"]');
    expect(outsideMesh).not.toBeNull();
    expect(insideMesh).not.toBeNull();

    unmount();
    expect(createdModels[1]?.dispose).toHaveBeenCalledTimes(1);
  });
});
