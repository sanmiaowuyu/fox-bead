/* 应用版本号：每次发版 +1 */
const APP_VERSION = '144';

/* 防呆：样式表缓存戳永远跟随 APP_VERSION。
   历史上曾出现 HTML 里 style.v5.css?v=NNN 漏升、导致老用户加载到旧 CSS。
   这里在脚本启动时强制把 stylesheet 的 href 对齐到当前版本号，杜绝手工漏升。 */
(function syncStyleVersion() {
  var links = document.querySelectorAll('link[rel="stylesheet"]');
  for (var i = 0; i < links.length; i++) {
    var href = links[i].getAttribute('href') || '';
    if (href.indexOf('style.v5.css') === -1) continue;
    var base = href.split('?')[0];
    links[i].setAttribute('href', base + '?v=' + APP_VERSION);
  }
})();
