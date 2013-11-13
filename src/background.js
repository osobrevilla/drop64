chrome.app.runtime.onLaunched.addListener(function() {
  mainWindow = chrome.app.window.create('index.html', {
    'bounds': {
      'width': 330,
      'height': 400
    },
    'minWidth': 330,
    'minHeight': 330
  });
});
