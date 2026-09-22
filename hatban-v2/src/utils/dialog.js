export function createDialog(title, content, className = '') {
  const dialog = document.createElement('dialog');
  dialog.className = 'app-dialog ' + className;
  const heading = document.createElement('h2');
  heading.id = 'dialog-' + crypto.randomUUID();
  heading.textContent = title;
  dialog.setAttribute('aria-labelledby', heading.id);
  const close = document.createElement('button');
  close.type = 'button'; close.className = 'dialog-close'; close.textContent = '닫기';
  close.onclick = () => dialog.close();
  dialog.append(heading, close, content);
  dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
  return dialog;
}
