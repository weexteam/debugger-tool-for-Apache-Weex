const mlink = require('./midware/index');
const Router = mlink.Router;
const Hub = mlink.Hub;
const debuggerRouter = new Router('debugger');
const nativeProxyHub = new Hub('proxy.native');
const debuggerHub = new Hub('page.debugger', { idleTimeout: 10000 });
const inspectorHub = new Hub('proxy.inspector');
const runtimeWorkerHub = new Hub('runtime.worker');
const entryHub = new Hub('page.entry', { idleTimeout: 10000 });
const runtimeProxyHub = new Hub('runtime.proxy');
const syncHub = new Hub('sync');

const init = () => {
  debuggerRouter.link(nativeProxyHub);
  debuggerRouter.link(debuggerHub);
  debuggerRouter.link(inspectorHub);
  debuggerRouter.link(entryHub);
  debuggerRouter.link(syncHub);
  debuggerRouter.link(runtimeWorkerHub);
  debuggerRouter.link(runtimeProxyHub);
  mlink.load(__dirname);
};
entryHub.on('idle', function () {
  if (debuggerHub.empty()) {
    console.log('weex debugger长时间空闲 自动退出');
    process.exit(0);
  }
});
debuggerHub.on('idle', function () {
  if (entryHub.empty()) {
    console.log('weex debugger长时间空闲 自动退出');
    process.exit(0);
  }
});
module.exports = {
  init
};
