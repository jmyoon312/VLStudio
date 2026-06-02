const { app, BrowserWindow, session } = require('electron');

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    console.log('[Permission Request]', permission);
    callback(false);
  });

  const win = new BrowserWindow();
  win.loadURL('https://webauthn.io/');
  
  setTimeout(() => {
    win.webContents.executeJavaScript(`
      document.querySelector('#register-button').click();
    `).catch(console.error);
  }, 3000);
});
