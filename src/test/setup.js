/**
 * Setup global dos testes — matchers do jest-dom e mocks de WebGL/canvas.
 */
import '@testing-library/jest-dom/vitest';

// jsdom não implementa canvas 2D nem WebGL — mock mínimo p/ Three.js não quebrar
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = function (type) {
    if (type === '2d') {
      return {
        createRadialGradient: () => ({ addColorStop: () => {} }),
        fillRect: () => {},
        fillStyle: null,
      };
    }
    return null; // WebGL → ThreeVFXOverlay trata como indisponível
  };
}