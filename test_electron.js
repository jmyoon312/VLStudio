const { app, session } = require('electron');
app.whenReady().then(() => {
  console.log("Ready");
  app.quit();
});
