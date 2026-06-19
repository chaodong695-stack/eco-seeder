import '@testing-library/jest-dom/vitest';

// Mock HTMLAudioElement.play for jsdom — jsdom does not implement media playback.
// The audio manager uses .catch() to handle failures, but jsdom logs warnings
// to stderr. This mock silences those warnings during tests.
if (typeof HTMLAudioElement !== 'undefined') {
  HTMLAudioElement.prototype.play = function () {
    // Return a rejected promise to simulate autoplay restriction,
    // which the audio manager handles gracefully via .catch().
    return Promise.reject(new DOMException('Not supported', 'NotSupportedError'));
  };
}
