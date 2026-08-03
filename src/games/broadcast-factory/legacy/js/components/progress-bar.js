export function progressBar(value, label = 'Progress') {
  const wrapper = document.createElement('div');
  wrapper.className = 'progress-meter';
  wrapper.setAttribute('role', 'progressbar');
  wrapper.setAttribute('aria-label', label);
  wrapper.setAttribute('aria-valuemin', '0');
  wrapper.setAttribute('aria-valuemax', '100');
  wrapper.setAttribute('aria-valuenow', String(value));
  const bar = document.createElement('span');
  bar.style.width = `${Math.max(0, Math.min(100, value))}%`;
  wrapper.append(bar);
  return wrapper;
}
