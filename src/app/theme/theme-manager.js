export class ThemeManager {
  apply(settings) {
    const root = document.documentElement;
    root.dataset.theme = settings.theme === 'dark' ? 'dark' : 'light';
    root.dataset.contrast = settings.highContrast ? 'high' : 'normal';
    root.classList.toggle('reduce-motion', Boolean(settings.reducedMotion));
  }
}
