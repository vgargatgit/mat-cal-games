export class Router {
  constructor(onChange) {
    this.onChange = onChange;
    this.handleChange = this.handleChange.bind(this);
  }

  start() {
    window.addEventListener('hashchange', this.handleChange);
    this.handleChange();
  }

  destroy() { window.removeEventListener('hashchange', this.handleChange); }

  navigate(route, replace = false) {
    const hash = `#/${route.replace(/^\/?/, '')}`;
    if (replace) history.replaceState(null, '', hash);
    else window.location.hash = hash;
    if (replace) this.handleChange();
  }

  handleChange() {
    const raw = window.location.hash.replace(/^#\/?/, '') || 'home';
    const [name, id] = raw.split('/');
    this.onChange({ name, id: id ? decodeURIComponent(id) : null });
  }
}
