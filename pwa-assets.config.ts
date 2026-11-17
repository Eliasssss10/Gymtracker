import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

const bg = '#0b0c0a';
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, padding: 0, resizeOptions: { background: bg } },
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: { background: bg } },
  },
  images: ['public/icon.svg'],
});
