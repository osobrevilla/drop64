chrome.app.runtime.onLaunched.addListener(function() {
  mainWindow = chrome.app.window.create('index.html', {
    'bounds': {
      'width': 355,
      'height': 400
    },
    'minWidth': 355,
    'minHeight': 330
  });
});
