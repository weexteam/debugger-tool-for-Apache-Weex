var channelId = new URLSearchParams(location.search).get('channelId');
var screencastParams = null;
var isProphetPageShowing = false;
var $help = $('.help')
var $tipsMask = $('.tips-mask')
var $switchBtn = $('.page-switch-btn')
var $prophetPage = $('#prophet-page');
var $inspectorPage = $('#inspector');
var $debuggerMenu = $('#debugger-menu');
var $prophetMenu = $('#prophet-menu');
var $remoteDebug = $('#remote_debug');
var hash = window.location.hash || '#debugger';
var shouldShowStepTips = localStorage.getItem('shouldShowStepTips')
var timeout
document.title = document.title + channelId
var wsBase='',httpBase='',match;
match=/\/debug_proxy_http_(\d+)/.exec(document.baseURI);
if(match){
    wsBase='/debug_proxy_ws_'+match[1];
    httpBase=match[0];
}
var wsSchema=location.protocol=='http:'?'ws://':'wss://'
websocket = new WebsocketClient(wsSchema + location.host +wsBase+ '/debugProxy/debugger/' + channelId);
websocket.on('socketOpened', () => {
  var toProphetPage = function () {
    $switchBtn.innerHTML = 'Debugger >>';
    $switchBtn.setAttribute('href', '#debugger')
    $prophetPage.style.visibility = 'visible';
    isProphetPageShowing = true;
    $debuggerMenu.style.display = 'none';
    $prophetMenu.style.display = 'block';
    $inspectorPage.style.display = 'none';
    isProphetPageShowing = true;
    websocket.send({
      method: 'Page.stopScreencast'
    });
    websocket.send({
      method: 'WxDebug.disable'
    })
    websocket.send({
      method: 'WxDebug.enableTracing',
      params: {
        status: true
      }
    });
    if ($remoteDebug.checked) {
      $remoteDebug.checked = false;
      websocket.send({
        method: 'WxDebug.reload'
      })
    }
  }
  var toDebuggerPage = function () {
    $switchBtn.innerHTML = 'Prophet >>';
    $switchBtn.setAttribute('href', '#prophet')
    $prophetPage.style.visibility = 'hidden';
    isProphetPageShowing = false;
    $prophetMenu.style.display = 'none';
    $debuggerMenu.style.display = 'block';
    $inspectorPage.style.display = 'block';
    isProphetPageShowing = false;
    websocket.send({
      method: 'WxDebug.enableTracing',
      params: {
        status: false
      }
    });
    if (screencastParams) {
      websocket.send({
        method: 'Page.startScreencast',
        params: screencastParams
      });
    }
  }
  if (hash === '#debugger') {
    toDebuggerPage();
  }
  else if (hash === '#prophet') {
    toProphetPage();
  }
  window.addEventListener('hashchange', function (e) {
    hash = new URL(e.newURL).hash;
    if (hash === '#debugger') {
      toDebuggerPage();
    }
    else if (hash === '#prophet') {
      toProphetPage();
    }
  }, false);
})
websocket.ws.onclose = function () {
  history.back()
}
websocket.on('WxDebug.pushDebuggerInfo', function (event) {
  var remoteTimer;
  var networkTimer;
  clearTimeout(timeout)
  if (event.params) {
    var device = event.params.device
    var name = device.name
    if (name && name.indexOf('com.') === 0) {
      var split = name.split('.')
      name = split.slice(Math.min(split.length - 1, 2)).join('.')
    }
    var appInfo = name + '@' + device.model
    var sdkVersion = 'v ' + device.weexVersion + ' - ' + device.platform + ' (inspector ' + device.devtoolVersion + ')'
    $('#app_info').innerHTML = appInfo
    $('#app_info').title = device.name + '@' + device.model
    $('#sdk_version').innerHTML = sdkVersion
    $('#remote_debug').checked = typeof (device.remoteDebug) === "undefined" ? false : device.remoteDebug;
    $('#network').checked = typeof (device.network) === "undefined" ? false : device.network;
    $('#element_mode').value = device.elementMode || sessionStorage.getItem('elmentMode') || 'native'
    $('#log_level').value = sessionStorage.getItem('logLevel') || 'debug'
    $('#remote_debug').onchange = function () {
      var checked = this.checked;
      remoteTimer && clearTimeout(remoteTimer)
      remoteTimer = setTimeout(function () {
        websocket.send({
          method: 'WxDebug.' + (checked ? 'enable' : 'disable')
        })
      }, 200)
    }
    $('#network').onchange = function () {
      var checked = this.checked;
      networkTimer && clearTimeout(networkTimer)
      networkTimer = setTimeout(function () {
        websocket.send({
          method: 'WxDebug.network',
          params: {
            enable: checked
          }
        })
      }, 200)
    }
    $('#element_mode').onchange = function () {
      sessionStorage.setItem('elmentMode', this.value);
      websocket.send({
        method: 'WxDebug.setElementMode',
        params: {
          data: this.value
        }
      })
    }
    $('#log_level').onchange = function () {
      sessionStorage.setItem('logLevel', this.value);
      websocket.send({
        method: 'WxDebug.setLogLevel',
        params: {
          data: this.value
        }
      })
    }
    
    initJsbundleQRcode(event.params.bundles);
    if (isProphetPageShowing) {
      websocket.send({
        method: 'WxDebug.enableTracing',
        params: {
          status: true
        }
      });
    }
    initDevtoolIframe();
  }
})
websocket.on('WxDebug.prompt', function (event) {
  var delayed = 5000 + event.params.messageText.length / 6 * 1000
  toast(translateI18n(event.params.messageText).replace(/\n/g, '<br>'), delayed)
})
websocket.on('WxDebug.reloadInspector', function (event) {
  $('#inspector').contentWindow.location.reload()
})
websocket.on('WxDebug.deviceDisconnect', function (event) {
  timeout = setTimeout(function () {
    history.back()
  }, 8000)
})
websocket.on('WxDebug.bundleRendered', function (event) {
  var found = false
  if (!event.params) found = true
  else {
    window._bundles && window._bundles.forEach(function (url) {
      if (url === event.params.bundleUrl) {
        found = true
      }
    })
  }
  if (found) {
    $('.bundle-qrcode').style.display = 'none'
  }
})
websocket.on('Page.startScreencast', function (event) {
  screencastParams = event.params;
  if (isProphetPageShowing) {
    websocket.send({
      method: 'Page.stopScreencast'
    });
  }
})

function initJsbundleQRcode (bundles) {
    var bundleQrcodeCtn = $('#qrcode_bundle')
    bundleQrcodeCtn.innerHTML = ''
    var bundles = bundles
    window._bundles = bundles
    if (bundles && bundles.length > 0) {
      bundles.forEach(function (url, i) {
        var q = document.createElement('div')
        url += `?_wx_tpl=${url}`
        q.innerHTML = '<p>' + new URL(url).pathname.split('/').slice(-1)[0] + '</p>'
        q.className = 'bundle-qr'
        bundleQrcodeCtn.appendChild(q)
        new QRCode(q, {
          text: url,
          width: 150,
          height: 150,
          colorDark: "#000000",
          colorLight: "#FFFFFF",
          correctLevel: QRCode.CorrectLevel.L
        });
        q.onclick = function () {
          websocket.send({
            method: 'WxDebug.refresh',
            params: {
              bundleUrl: url
            }
          })
        }
      })
      var qrcodeBtn = $('#qrcode_btn')
      var bundleQrcode = $('.bundle-qrcode')
      qrcodeBtn.style.visibility = 'visible'
      qrcodeBtn.onclick = function () {
        bundleQrcode.style.display = 'block'
      }
      bundleQrcode.onclick = function () {
        this.style.display = 'none'
      }
    }
}
function initDevtoolIframe() {
  $('#inspector').src = httpBase+`/inspector/inspector.html?${location.protocol=='http:'?'ws':'wss'}=${location.host+wsBase}/debugProxy/inspector/${channelId}&remoteFrontend=1`
  var shouldReloadApp = true
  $('#inspector').onload = function () {
    if (!shouldReloadApp && $('#remote_debug').checked) {
      websocket.send({
        method: 'WxDebug.reload'
      })
    }
    shouldReloadApp = false
    $('#inspector').contentDocument.addEventListener('keydown', function (evt) {
      if (evt.key == 'r' && (evt.metaKey || evt.altKey) || evt.key == 'F5') {
        evt.preventDefault()
        evt.stopPropagation()
        websocket.send({
          method: 'WxDebug.refresh'
        })
        return false
      }
    }, true)
  }
}

function initTips() {
  new AnchorTips(document.querySelectorAll('.line.short>span:nth-child(1)')[0], AnchorTips.LEFT, generatei18nTips('JSDEBUG_TIP'), $('.tips-mask'))
  new AnchorTips(document.querySelectorAll('.line.short>span:nth-child(1)')[1], AnchorTips.LEFT_BOTTOM, generatei18nTips('NETWORK_TIP'), $('.tips-mask'))
  new AnchorTips(document.querySelectorAll('.line.middle>span:nth-child(1)')[0], AnchorTips.RIGHT, generatei18nTips('LOGLEVEL_TIP'), $('.tips-mask'))
  new AnchorTips(document.querySelectorAll('.line.middle>span:nth-child(1)')[1], AnchorTips.RIGHT_BOTTOM, generatei18nTips('ELEMENT_MODE_TIP'), $('.tips-mask'))
}

function init() {
  document.onkeydown = function (evt) {
    if (evt.key == 'r' && (evt.metaKey || evt.altKey) || evt.key == 'F5') {
      evt.preventDefault();
      return false
    }
    else if (evt.key == 'n' && evt.ctrlKey) {
      evt.preventDefault();
      window.open('/#new', '_blank')
      return false
    }
  }
  document.addEventListener('click', function (e) {
    var target = e.target;
    if (hasClassName(target, 'icon-bangzhu')) {
      replaceClassName('.help span', 'icon-bangzhu', 'icon-close')
      $tipsMask.style.display = 'block'
      setTimeout(function () {
        $tipsMask.className += ' widget-anchor-show'
      }, 100)
    }
    else if (hasClassName(target, 'icon-close')) {
      replaceClassName('.help span', 'icon-close', 'icon-bangzhu')
      $tipsMask.className = $tipsMask.className.replace(/ widget-anchor-show/g, '')
      setTimeout(function () {
        $tipsMask.style.display = 'none'
      }, 400)
    }
    else if (hasClassName(target, 'refresh-btn')) {
      websocket.send({
        method: 'WxDebug.reload'
      });
    }
  })
  if (shouldShowStepTips) {
    $('.help').click()
    localStorage.setItem('shouldShowStepTips', false)
  }
  initTips();
}
init();
