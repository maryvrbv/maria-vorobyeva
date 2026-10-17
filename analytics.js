// Analytics on top of the inline gtag snippet each page carries in its <head>.
// Runs right after that snippet (it sets up gtag and the ?notrack opt-out)
// and sends the config hit itself, so everything below rides on page_view.
//
// - visitor_id: one anonymous id per browser, shared with GA as its client id,
//   so a person seen in "User explorer" can be followed in ordinary reports
// - link_tag: ?from=<tag> marks a link you send someone (marydis.com/?from=sber);
//   the first tag a browser arrives with sticks to its later visits too
// - scroll_depth: 25 / 50 / 75 / 100% of the page, once each per page view
// - read_time: 30 s, 1, 2 and 5 min of the page being on screen
// - Microsoft Clarity session recordings, once CLARITY_ID is filled in
(function () {
  var GA_ID = 'G-FHZS0V3GJE';
  var CLARITY_ID = 'yx22ghlbmz';
  var off = window['ga-disable-' + GA_ID] === true;

  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, value);
    } catch (e) {}
    return value;
  }

  // reuse the id GA already gave this browser, else make one in GA's format
  var visitorId = store('visitorId');
  if (!visitorId) {
    var ga = document.cookie.match(/(?:^|;\s*)_ga=GA\d\.\d\.(\d+\.\d+)/);
    visitorId = ga ? ga[1] : Math.floor(Math.random() * 2147483647) + '.' + Math.floor(Date.now() / 1000);
    store('visitorId', visitorId);
  }

  var params = new URLSearchParams(location.search);
  var fromUrl = (params.get('from') || '').trim().toLowerCase().replace(/[^a-z0-9а-яё_.-]+/gi, '-').replace(/^[-.]+|[-.]+$/g, '').slice(0, 60);
  if (fromUrl && !store('linkTag')) store('linkTag', fromUrl);
  var linkTag = fromUrl || store('linkTag') || '';
  if (params.has('from')) {
    params.delete('from');
    var rest = params.toString();
    history.replaceState(null, '', location.pathname + (rest ? '?' + rest : '') + location.hash);
  }

  // sent with every event of this tag, and repeated on the custom events below
  var tagged = { visitor_id: visitorId, link_tag: linkTag || '(none)' };
  var config = {
    client_id: visitorId, visitor_id: tagged.visitor_id, link_tag: tagged.link_tag,
    page_lang: document.documentElement.lang || ''
  };
  // a tagged landing also shows up as its own source in the standard reports
  if (fromUrl) {
    config.page_location = location.origin + location.pathname +
      '?utm_source=' + encodeURIComponent(fromUrl) + '&utm_medium=link&utm_campaign=' + encodeURIComponent(fromUrl);
  }
  gtag('config', GA_ID, config);

  if (off) return;

  // scroll depth
  var marks = [25, 50, 75, 100];
  var sent = {};
  function onScroll() {
    var doc = document.documentElement;
    var seen = (window.scrollY + window.innerHeight) / Math.max(doc.scrollHeight, 1) * 100;
    for (var i = 0; i < marks.length; i++) {
      var m = marks[i];
      if (!sent[m] && seen >= (m === 100 ? 98 : m)) {
        sent[m] = true;
        gtag('event', 'scroll_depth', { scroll_percent: m, visitor_id: tagged.visitor_id, link_tag: tagged.link_tag });
      }
    }
    if (sent[100]) window.removeEventListener('scroll', onScroll);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('load', onScroll);

  // read time: counts only while the tab is visible
  var steps = [30, 60, 120, 300];
  var seconds = 0;
  var timer = setInterval(function () {
    if (document.visibilityState !== 'visible') return;
    seconds++;
    if (seconds === steps[0]) {
      gtag('event', 'read_time', { read_seconds: steps.shift(), visitor_id: tagged.visitor_id, link_tag: tagged.link_tag });
      if (!steps.length) clearInterval(timer);
    }
  }, 1000);

  // Microsoft Clarity
  if (CLARITY_ID) {
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', CLARITY_ID);
    window.clarity('identify', visitorId);
    if (linkTag) window.clarity('set', 'link_tag', linkTag);
  }
})();
