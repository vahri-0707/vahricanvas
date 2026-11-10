(() => {
  const root = document.documentElement;
  const toggle = document.getElementById('theme-toggle');
  const themeColor = document.querySelector('meta[name="theme-color"]');
  function applyTheme(theme) {
    const light = theme === 'light';
    root.dataset.theme = light ? 'light' : 'dark';
    const label = `Switch to ${light ? 'dark' : 'light'} mode`;
    toggle.setAttribute('aria-label', label);
    toggle.setAttribute('aria-pressed', String(light));
    toggle.title = label;
    themeColor.content = light ? '#fbfaff' : '#0d0e10';
  }
  applyTheme(root.dataset.theme);
  toggle.addEventListener('click', () => {
    const theme = root.dataset.theme === 'light' ? 'dark' : 'light';
    applyTheme(theme);
    try { localStorage.setItem('vahri-studio-theme', theme); } catch { /* Theme switching also works without storage. */ }
  });
  addEventListener('storage', event => {
    if (event.key === 'vahri-studio-theme') applyTheme(event.newValue);
  });
})();
