/* ==========================================================================
   A² Kit · v1.0.4 · shared runtime for A² Learning Studio platforms
   A² Learning Studio · Dr. Ali Keyvanfar & Dr. Arezou Shafaghat · KSU
   Canonical source: a2-learning-studio/kit/a2-kit.js (inlined into each
   platform between <!-- a2-kit:js --> markers by kit/sync.py).

   window.A2 =
     init(opts)          suite bar, skip link, icons, session, error capture
     where(text)         "you are here" text in the bar
     audio               ONE audio manager: narration, video, SFX never overlap
     log                 anonymous 21-field interaction log (localStorage)
     feedback            structured feedback dialog (ratings + tags + note)
     data                export JSON / CSV, clear
     privacy             scrub emails, phone numbers, IDs and self-introductions from logs and typed text
     ui                  toast, dialog, help, icon()

   Must load before any platform script that plays sound, so the audio
   patches are in place first.
   ========================================================================== */
(function () {
  'use strict';
  if (window.A2 && window.A2.kit) return;

  var VERSION = '1.0.4';
  var A2 = window.A2 = window.A2 || {};
  A2.kit = { version: VERSION };

  /* ------------------------------------------------------------------ utils */
  var hasLS = (function () { try { var k = '__a2t'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return true; } catch (e) { return false; } })();
  var hasSS = (function () { try { var k = '__a2t'; sessionStorage.setItem(k, '1'); sessionStorage.removeItem(k); return true; } catch (e) { return false; } })();
  var mem = {};
  function lsGet(k, d) { try { var v = hasLS ? localStorage.getItem(k) : mem[k]; return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lsSet(k, v) { try { var s = JSON.stringify(v); if (hasLS) localStorage.setItem(k, s); else mem[k] = s; } catch (e) { /* quota: keep in memory */ mem[k] = JSON.stringify(v); } }
  function lsDel(k) { try { if (hasLS) localStorage.removeItem(k); delete mem[k]; } catch (e) {} }
  function ssGet(k, d) { try { var v = hasSS ? sessionStorage.getItem(k) : mem['s:' + k]; return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function ssSet(k, v) { try { var s = JSON.stringify(v); if (hasSS) sessionStorage.setItem(k, s); else mem['s:' + k] = s; } catch (e) {} }
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var b = new Uint8Array(16); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(b) : b.forEach(function (_, i) { b[i] = Math.random() * 256 | 0; });
    b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    var h = Array.prototype.map.call(b, function (x) { return (x + 256).toString(16).slice(1); }).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function h(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k]; if (v == null || v === false) return;
      if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (k.slice(0, 2) === 'on' && typeof v === 'function') e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v);
    });
    if (html != null) e.innerHTML = html;
    return e;
  }
  function ready(fn) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true }); else fn(); }
  function basename(src) { if (!src) return ''; if (src.slice(0, 5) === 'data:' || src.slice(0, 5) === 'blob:') return ''; try { return decodeURIComponent(src.split('#')[0].split('?')[0].split('/').pop()); } catch (e) { return src.split('/').pop(); } }
  function stamp() { var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; }; return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()); }
  function download(name, text, type) {
    var blob = new Blob([text], { type: type }); var url = URL.createObjectURL(blob);
    var a = h('a', { href: url, download: name }); a.style.display = 'none'; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
  }
  A2.util = { esc: esc, h: h, uuid: uuid, ready: ready, store: { get: lsGet, set: lsSet, del: lsDel }, session: { get: ssGet, set: ssSet }, download: download };

  /* ------------------------------------------------------------------ icons */
  var ICONS = {
    play: '<path d="M7.5 4.8v14.4L19 12z"/>',
    pause: '<path d="M8.5 5v14M15.5 5v14"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
    volume: '<path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18.3 6.4a7.6 7.6 0 0 1 0 11.2"/>',
    'volume-x': '<path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z"/><path d="M16 10l5 5M21 10l-5 5"/>',
    captions: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M10.6 10.3a2.2 2.2 0 1 0 0 3.4M17 10.3a2.2 2.2 0 1 0 0 3.4"/>',
    message: '<path d="M20 15.2a2 2 0 0 1-2 2H9.2L4 21V6.5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"/><path d="M8.5 9.5h7M8.5 13h4.5"/>',
    download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/>',
    upload: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 19.5h14"/>',
    trash: '<path d="M4.5 7h15M9.5 7V4.8h5V7M6.5 7l1 12.5h9l1-12.5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.6h.01"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.6M12 17h.01"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    'check-circle': '<circle cx="12" cy="12" r="9"/><path d="M8 12.3l2.8 2.8L16.2 9.5"/>',
    'chevron-left': '<path d="M14.5 6 8.5 12l6 6"/>',
    'chevron-right': '<path d="M9.5 6l6 6-6 6"/>',
    'chevron-down': '<path d="M6 9.5l6 6 6-6"/>',
    'arrow-right': '<path d="M5 12h14M13 6l6 6-6 6"/>',
    'arrow-left': '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7"/>',
    star: '<path d="M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.7l-5.1 2.7 1-5.6-4.1-4 5.7-.8z"/>',
    alert: '<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.2M12 16.8h.01"/>',
    home: '<path d="M4 11.2 12 4.5l8 6.7V20h-5.5v-5.5h-5V20H4z"/>',
    list: '<path d="M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01"/>',
    replay: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4.2h4.2"/>',
    external: '<path d="M14 4.5h5.5V10M19.5 4.5 11 13M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>',
    'file-text': '<path d="M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5z"/><path d="M14 3.5v5h5M8.5 13h7M8.5 16.5h5"/>',
    database: '<ellipse cx="12" cy="6" rx="7" ry="2.8"/><path d="M5 6v12c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8V6M5 12c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
    award: '<circle cx="12" cy="9" r="5.5"/><path d="M8.6 13.3 7.5 21l4.5-2.6 4.5 2.6-1.1-7.7"/>',
    users: '<circle cx="9" cy="8.5" r="3.5"/><path d="M2.8 20a6.2 6.2 0 0 1 12.4 0M16 5.3a3.5 3.5 0 0 1 0 6.4M17.8 14.2A6.2 6.2 0 0 1 21.2 20"/>',
    layers: '<path d="M12 4 3 8.5l9 4.5 9-4.5z"/><path d="M3 12.5l9 4.5 9-4.5M3 16.5l9 4.5 9-4.5"/>',
    sliders: '<path d="M4 7h10M18 7h2M4 12h4M12 12h8M4 17h12M20 17h0"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="17" r="2"/>',
    chart: '<path d="M4 4v16h16M8.5 16v-5M13 16V8M17.5 16v-3"/>',
    sparkle: '<path d="M12 3.5l1.8 5 5 1.8-5 1.8-1.8 5-1.8-5-5-1.8 5-1.8z"/><path d="M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
    grid: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9.3h16M4 14.7h16M9.3 4v16M14.7 4v16"/>',
    book: '<path d="M5 4.5h9.5a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h9.5"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><path d="M12 12h.01"/>',
    shield: '<path d="M12 3.5 5 6.3v5.2c0 4.3 3 7.6 7 9 4-1.4 7-4.7 7-9V6.3z"/>',
    zap: '<path d="M13 3 5 13.5h6L10.5 21 19 10.5h-6z"/>',
    building: '<path d="M5 20.5V5.5A1.5 1.5 0 0 1 6.5 4h7A1.5 1.5 0 0 1 15 5.5v15M15 10h3.5a1.5 1.5 0 0 1 1.5 1.5v9M3.5 20.5h17M8.5 8h3M8.5 11.5h3M8.5 15h3"/>',
    flask: '<path d="M9.5 3.5h5M10.5 3.5v5.2L5 18.2a1.5 1.5 0 0 0 1.3 2.3h11.4a1.5 1.5 0 0 0 1.3-2.3l-5.5-9.5V3.5"/><path d="M7.6 14.5h8.8"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    pencil: '<path d="M4 20l1-4.5L15.5 5a2 2 0 0 1 2.8 0l.7.7a2 2 0 0 1 0 2.8L8.5 19z"/><path d="M13.5 7l3.5 3.5"/>',
    map: '<path d="M9 4.5 3.5 6.5v13l5.5-2 6 2 5.5-2v-13l-5.5 2z"/><path d="M9 4.5v13M15 6.5v13"/>',
    flag: '<path d="M5 21V4.5M5 4.5h11.5l-2 4 2 4H5"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5 13.3 13.3 8.5 15.5l2.2-4.8z"/>',
    calendar: '<rect x="4" y="5.5" width="16" height="15" rx="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
    dollar: '<path d="M12 3.5v17M16.5 7.5c-.7-1.2-2.3-2-4.5-2-2.6 0-4.5 1.3-4.5 3.2 0 4.6 9.4 2.2 9.4 6.9 0 1.9-2 3.3-4.8 3.3-2.3 0-4-.9-4.8-2.3"/>',
    hardhat: '<path d="M3.5 17.5h17M5 17.5v-3a7 7 0 0 1 14 0v3M10 7.6V5.5h4v2.1M9 13v-3M15 13v-3"/>',
    leaf: '<path d="M5 19c0-8 5-13.5 14.5-14-.5 9.5-6 14.5-14 14.5zM5 19l7-7"/>',
    server: '<rect x="4" y="4" width="16" height="7" rx="1.5"/><rect x="4" y="13" width="16" height="7" rx="1.5"/><path d="M7.5 7.5h.01M7.5 16.5h.01M11 7.5h5M11 16.5h5"/>'
  };
  var SPRITE_ID = 'a2-sprite';
  function injectSprite() {
    if (document.getElementById(SPRITE_ID)) return;
    var s = '<svg xmlns="http://www.w3.org/2000/svg" id="' + SPRITE_ID + '" aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden">';
    Object.keys(ICONS).forEach(function (k) { s += '<symbol id="a2-i-' + k + '" viewBox="0 0 24 24">' + ICONS[k] + '</symbol>'; });
    s += '</svg>';
    document.body.insertAdjacentHTML('afterbegin', s);
  }
  function icon(name, cls) { return '<svg class="a2-ico' + (cls ? ' ' + cls : '') + '" aria-hidden="true" focusable="false"><use href="#a2-i-' + name + '"></use></svg>'; }
  A2.icon = icon;
  A2.icons = ICONS;

  /* ---------------------------------------------------------------- privacy */
  var redactions = [];                 /* {k, n, re}: values registered this page session; whole value in any case, its parts as written */
  var RX = [
    [/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]'],
    [/\+?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g, '[phone]'],
    [/\b\d{7,}\b/g, '[number]']
  ];
  /* typed free text: self-introductions, sign-offs and ID cues, in any case ("my name is …", "i'm …", "thanks, …", "PIN 4826") */
  var UP = 'A-ZÀ-ÖØ-Þ', LO = 'a-zß-öø-ÿ';
  var NM = '[' + UP + '][' + LO + ']+(?:[-\'’][' + UP + ']?[' + LO + ']+)*(?![' + UP + LO + '])';
  function ci(w) { return w.replace(/[a-z]/gi, function (c) { return '[' + c.toUpperCase() + c.toLowerCase() + ']'; }); }
  function cues(list) { return '(?:' + list.map(function (c) { return ci(c).replace(/ /g, '\\s+'); }).join('|') + ')'; }
  /* capitalised words that are not names (split points for the possible-name check) */
  var NOT_NAMES = {};
  ('A About After Also An And Any Are As At Back Be Because Before Best But By Can Could Did Do Does Dr Each Even Every For From Good Great Had Has Have He Her Here His How However I If In Is It Its Just Maybe Me More Most Mr Mrs Ms My Next No Not Now Of Ok Okay On Once One Only Or Other Our Overall Please Prof Professor Really She So Some Still Than Thank Thanks That The Their Them Then There These They This Those Though To Today Too Two Three Four Five Six Up Very Was We Well Were What When Where Which While Who Why Will With Would Yes Yet You Your ' +
    'Module Modules Step Steps Part Parts Slide Slides Phase Phases Case Cases Study Studies Report Reports Survey Quiz Score Scores Certificate Lab Decision Decisions Tour Narration Caption Captions Transcript Video Videos Audio Sound Sounds Hub Home Start Stop Play Pause Replay Listen Help Feedback Export Exports Data Center Centre Centers Cloud Site Sites Planning Plan Critical Path Gantt Schedule Crew Crews Crane Tower Gate Safety Quality Risk Risks Log Register Project Projects Construction Management Manager Kennesaw State University Studio Learning Ecosystem Simulator Simulation Monte Carlo Bayesian Pareto Extreme Value Theory Analysis Viability Guidance Scenario Scenarios Pathway Criteria Instructor Teacher Student Students Team Group Class Course Week Day Morning ' +
    'Google Amazon Apple Microsoft Meta Oracle Equinix Digital Realty Chrome Safari Firefox Edge Windows Mac Android Excel Word Canvas Brightspace Monday Tuesday Wednesday Thursday Friday Saturday Sunday January February March April May June July August September October November December Fall Spring Summer Winter Atlanta Georgia Marietta').split(' ').forEach(function (w) { NOT_NAMES[w] = 1; });

  /* ordinary words (lowercase): after a cue, any other word is treated as a possible name */
  var COMMON = {};
  ('a able about above across actually afraid after again against ago ahead all almost alone along already also although always am amazing an and angry another any anyone anything anytime anyway are around as ask asked at audio aware away awesome awful back bad bar bars basic be because been before behind being below best better between big bit blind bored boring both bottom brief broken bug bugs busy but button buttons by call came can cannot cant certain chart charts check class classmate classmates clear click close cloud code color colour come comment comments confusing cool correct cost costs could course crane crew crews data day days dear deaf definitely design did didnt different difficult do does doesnt doing done dont down dr dumb during each easier easy either else end enjoy enjoyed enough error errors even ever every everybody everyone everything exactly example excellent exercise explain fair fast feedback few fine first fit folks font for found free friend friends from fun funny game games gave get gets getting give glad go goes going gone good got graph great group guys had happy hard has have having he help helpful her here hers him his honest hope how however hungry i if im important in info instructions instructor interesting into is issue issues it its itself just keep kind kinda knew know lab lacking last late later laggy layout learn learned learning least less let level like liked likes little long look looked looks lost lot lots love loved low mad made main make makes many mate maybe me mean might mine minute minutes mobile module modules more most much music must my myself name narration need needed needs negative neither nervous never new next nice no nobody none nope nor not nothing now of off often ok okay old on once one only open or other others our out over overall own page pages part parts partner people perfect phase phone pick place plan planning please pls points poor positive pretty prof professor project projects proud question questions quick quickly quite quiz rather ready really report reports right risk run sad said same saw say says scared schedule school score scores screen section see seem seemed seems serious set she short shy should show showed sick simple since sir site slide slides slow small smart so some someone something sometimes soon sorry sort sound sounds still stuck student students study stuff stupid such super sure survey sweet system take takes talk task tasks teacher team text than thank thanks that the their them then there these they thing things think this those though thought through time times tiny tip tips tired to today together too tool tools top tour tried true try trying turn two under understand understood unclear unsure unit until up upset us use used useful user using very video videos voice want wanted was way we week weird well went were what when where which while who whole why will wish wishes with without wonderful work worked works world worried would wow wrong yeah year yes yet you your yours yourself ' +
    'ai app apps aws bim browser buildsim captions chatgpt claude computer cpm csv d2l ecosystem email evnn evt excel gantt gev gpt hub ipad iphone json ksu laptop lca link links mcdm nanolca nexus pdf pert playscan powerpoint scorm simulator simulation slideshow tablet topsis transcript transcripts voxprofessor website wifi zoom').split(' ').forEach(function (w) { COMMON[w] = 1; });
  Object.keys(NOT_NAMES).forEach(function (w) { COMMON[w.toLowerCase()] = 1; });
  /* after a strong cue ("my name is"), these end the name */
  var STOP = {};
  ('a about after again also am an and anytime are as at back but by for from had has have he her his i if im in into is it its later maybe me my no not of off on or our out she so than that the their them then there they this to too um uh up was we were when where which who with yes you your').split(' ').forEach(function (w) { STOP[w] = 1; });
  var SUFFIX = /(?:ing|ed|ly|ful|ous|ive|able|ible|less|ness|ment|tion|sion|ity|ism|ist|ance|ence|ize|ise|ward|wise)$/;
  function bare(w) { return w.toLowerCase().replace(/[’']s$/, '').replace(/[’']/g, ''); }
  function knownWord(w) { var l = bare(w); return !!(COMMON[l] || (l.length > 3 && /s$/.test(l) && (COMMON[l.slice(0, -1)] || (/es$/.test(l) && COMMON[l.slice(0, -2)])))); }
  var CAP = new RegExp('^[' + UP + '][' + LO + ']');
  function nameLike(w) {
    if (knownWord(w)) return false;
    if (CAP.test(w)) return true;                         /* Capitalised and not an ordinary word */
    var l = bare(w);
    return !(l.length > 4 && SUFFIX.test(l));            /* confused, using, really, helpful … are not names */
  }
  var WORD = new RegExp('[' + UP + LO + '][' + UP + LO + '\'’-]*', 'y');
  /* up to `max` words from index i (spaces skipped, single-letter initials allowed) that pass ok() */
  function wordsAt(s, i, max, ok) {
    var j = i, n = 0, start = -1, end = -1;
    while (n < max) {
      var k = j; while (k < s.length && /\s/.test(s.charAt(k))) k++;
      WORD.lastIndex = k; var m = WORD.exec(s); if (!m) break;
      var w = m[0].replace(/[-'’]+$/, '');
      if (!ok(w)) break;
      if (start < 0) start = k;
      n++; j = k + w.length;
      if (w.length === 1 && s.charAt(j) === '.') j++;
      end = j;
    }
    return n ? { start: start, end: end, n: n } : null;
  }
  var CUE_STRONG = new RegExp('\\b' + cues(['my name is', 'my name\'s', 'my name’s', 'my names', 'my name', 'name is', 'call me', 'i am called', 'i\'m called', 'i’m called', 'im called', 'signed']) + '\\s*[:,-]?|\\b' + ci('name') + '\\s*:', 'g');
  var CUE_SELF = new RegExp('\\b' + cues(['i am', 'i\'m', 'i’m', 'im']) + '\\b', 'g');
  var CUE_PAIR = new RegExp('\\b' + cues(['this is', 'it is', 'it\'s', 'it’s', 'from', 'by', 'with', 'and', 'student', 'me and']) + '\\b', 'g');
  var CUE_SIGN = new RegExp('(?:^|[\\n.!?;,]|\\s[-\u2013\u2014])\\s*' + cues(['kind regards', 'best regards', 'thank you', 'thanks', 'thx', 'regards', 'best', 'cheers', 'sincerely', 'love']) + '\\s*[,:\u2013\u2014-]?', 'g');
  var CUE_DASH = /\s[-\u2013\u2014]+/g;
  var IDS = new RegExp('\\b(' + ['student id', 'student number', 'student no', 'net id', 'netid', 'ksu id', 'username', 'user name', 'pin', 'id'].map(ci).join('|') + ')(\\s*(?:(?:[:#=]|no\\.?|number|is|was)\\s*)?)[A-Za-z]*\\d(?:[A-Za-z0-9_-]|\\.(?=[A-Za-z0-9]))*', 'g');

  function wordRe(v, flags) { return new RegExp('(^|[^' + UP + LO + '0-9])(' + v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?![' + UP + LO + '0-9])', flags); }
  function addRedaction(v, full) {
    var k = (full ? 'f:' : 'p:') + v.toLowerCase();
    if (redactions.some(function (r) { return r.k === k; })) return;
    redactions.push({ k: k, n: v.length, re: wordRe(v, full ? 'gi' : 'g') });   /* the whole value in any case; its parts as written */
  }
  var privacy = A2.privacy = {
    /* register a personal value (e.g. a name typed for a certificate) so it never reaches the log or an export.
       opts.parts === false: match only the whole value (e.g. an organisation name) */
    redact: function (value, opts) {
      var v = String(value || '').trim(); if (v.length < 2) return;
      addRedaction(v, true);
      if (!(opts && opts.parts === false)) v.split(/[\s,]+/).forEach(function (part) { if (part.length >= 3) addRedaction(part, false); });
      redactions.sort(function (a, b) { return b.n - a.n; });
    },
    /* only the values registered with redact(), whole words; safe on JSON and CSV text */
    redactKnown: function (s) {
      if (typeof s !== 'string' || !redactions.length) return s;
      redactions.forEach(function (r) { r.re.lastIndex = 0; s = s.replace(r.re, '$1[redacted]'); });
      return s;
    },
    /* every logged string: registered values, emails, phone numbers, 7+ digit runs. max: longest string kept (default 240) */
    scrub: function (value, max) {
      if (value == null) return value;
      if (typeof value === 'number' || typeof value === 'boolean') return value;
      var s = privacy.redactKnown(typeof value === 'string' ? value : JSON.stringify(value));
      RX.forEach(function (p) { s = s.replace(p[0], p[1]); });
      var lim = typeof max === 'number' && max > 3 ? max : 240;
      return s.length > lim ? s.slice(0, lim - 3) + '...' : s;
    },
    /* typed free text (comments, open answers, labels): scrub() plus self-introductions, sign-offs and ID cues */
    scrubText: function (value, max) {
      if (value == null) return value;
      var s = String(value), spans = [];
      var atEnd = function (r) { return /^[\s.!]*$/.test(s.slice(r.end)); };
      function scan(re, max, ok, minN, test) {
        re.lastIndex = 0; var m;
        while ((m = re.exec(s))) {
          var r = wordsAt(s, m.index + m[0].length, max, ok);
          if (r && r.n >= minN && (!test || test(r))) spans.push(r);
          if (!m[0].length) re.lastIndex++;
        }
      }
      scan(CUE_STRONG, 3, function (w) { return !STOP[bare(w)]; }, 1);   /* "my name is zed testname" */
      scan(CUE_SELF, 3, nameLike, 1);                                      /* "i'm zed", not "i'm confused" */
      scan(CUE_PAIR, 3, nameLike, 2);                                      /* "from zed testname", "with Sarah Lee" */
      scan(CUE_SIGN, 3, nameLike, 1, atEnd);                               /* "thanks, zed" at the end */
      scan(CUE_DASH, 3, nameLike, 1, atEnd);                               /* "… - zed t" at the end */
      var h = wordsAt(s, 0, 3, nameLike); if (h && /^\s+here\b/i.test(s.slice(h.end))) spans.push(h);   /* "zed here, …" */
      spans.sort(function (a, b) { return b.start - a.start || b.end - a.end; });
      var last = Infinity;
      spans.forEach(function (r) { if (r.end > last) return; s = s.slice(0, r.start) + '[name]' + s.slice(r.end); last = r.start; });
      IDS.lastIndex = 0; s = s.replace(IDS, '$1$2[id]');
      return privacy.scrub(s, typeof max === 'number' ? max : 1000);
    },
    /* runs of 2-3 capitalised words that may be a person's name (for a gentle check before saving) */
    nameHints: function (value) {
      var s = String(value || ''), out = [], run = [];
      var re = new RegExp(NM + '|[^\\s]+', 'g'), m, nm = new RegExp('^' + NM + '$');
      function end() { if (run.length >= 2) out.push(run.join(' ')); run = []; }
      while ((m = re.exec(s))) {
        var w = m[0], core = w.replace(/[.,;:!?)"”]+$/, '');
        if (nm.test(core) && !NOT_NAMES[core]) { run.push(core); if (core !== w) end(); } else end();
      }
      end();
      return out.filter(function (x, i) { return out.indexOf(x) === i; }).slice(0, 3);
    }
  };

  /* ------------------------------------------------------------------ config */
  var cfg = {
    platform: 'a2', name: 'A² Learning Studio', subtitle: 'A² Learning Studio', version: '',
    accent: null, accentStrong: null, audio: false, bar: true, mount: null, main: 'main',
    help: null, lang: null, captions: true, autolog: true
  };
  A2.config = function () { return cfg; };

  /* ----------------------------------------------------------- audio manager
     One rule: at most one sound source is audible at any moment.
     - narration / video: newest wins; everything else is paused/cancelled.
     - sfx: plays only when nothing else is playing; a newer sfx cuts an older one.
     Enforced by patching HTMLMediaElement.play, catching native-control play events,
     speechSynthesis.speak and Web Audio source starts. Platforms may also call
     A2.audio.narrate() / A2.audio.sfx() directly.                            */
  var audio = A2.audio = (function () {
    var media = new Set();
    var sfxNodes = new Set();
    var lastSfxStart = 0;
    var muted = !!lsGet('a2.audio.muted', false);
    var subs = [];
    var origPlay = HTMLMediaElement.prototype.play;
    var synth = window.speechSynthesis || null;
    var origSpeak = synth && synth.speak ? synth.speak.bind(synth) : null;
    var origCancel = synth && synth.cancel ? synth.cancel.bind(synth) : null;
    var captionMap = {};
    var capEl = null, capText = null, capLabel = null, capPlayBtn = null;
    var capActive = null;
    var captionsOn = lsGet('a2.captions.on', true) !== false;

    function channel(el) {
      var c = el && el.dataset && el.dataset.a2Channel;
      if (c) return c;
      return el && el.tagName === 'VIDEO' ? 'video' : 'narration';
    }
    /* an element the platform muted on purpose (decorative loop) is not a sound source */
    function isSource(m) { return !(m.muted && !m.__a2MutedByKit) && m.volume > 0; }
    function busy(except) {
      var b = false;
      media.forEach(function (m) { if (m !== except && channel(m) !== 'sfx' && !m.paused && !m.ended && isSource(m)) b = true; });
      if (synth && synth.speaking) b = true;
      return b;
    }
    function stopSfx() { sfxNodes.forEach(function (n) { try { n.stop(); } catch (e) {} }); sfxNodes.clear(); media.forEach(function (m) { if (channel(m) === 'sfx' && !m.paused) { try { m.pause(); } catch (e) {} } }); }
    function preempt(except) {
      media.forEach(function (m) {
        if (m !== except && !m.paused && isSource(m)) { m.__a2Preempted = true; try { m.pause(); } catch (e) {} }
      });
      if (synth && origCancel && (synth.speaking || synth.pending)) origCancel();
      stopSfx();
    }
    function register(el) {
      if (!el || media.has(el)) return;
      media.add(el);
      ['play', 'playing', 'pause', 'ended', 'emptied'].forEach(function (ev) {
        el.addEventListener(ev, function () { onMediaEvent(el, ev); });
      });
      el.addEventListener('timeupdate', function () { if (capActive && capActive.el === el) renderCue(el); });
    }
    function state() {
      var s = { busy: false, channel: 'idle', label: '' };
      media.forEach(function (m) { if (channel(m) !== 'sfx' && !m.paused && !m.ended && isSource(m)) { s.busy = true; s.channel = channel(m); s.label = m.__a2Label || basename(m.currentSrc || m.src); } });
      if (!s.busy && synth && synth.speaking) { s.busy = true; s.channel = 'speech'; }
      if (muted) s.muted = true;
      return s;
    }
    function emit() { var s = state(); subs.forEach(function (fn) { try { fn(s); } catch (e) {} }); }
    function onMediaEvent(el, ev) {
      var ch = channel(el);
      if (ev === 'play' && ch !== 'sfx') preempt(el);
      if (ev === 'play' && ch === 'sfx' && busy(el)) { try { el.pause(); } catch (e) {} }
      if (ch !== 'sfx') {
        if (ev === 'playing') { showCaption(el); if (A2.log && A2.log.ready) A2.log.event('audio_play', { target: el.__a2Label || basename(el.currentSrc || el.src) || ch, value: ch }); }
        if (ev === 'pause' && !el.ended) { pauseCaption(el); if (A2.log && A2.log.ready && !el.__a2Preempted) A2.log.event('audio_pause', { target: el.__a2Label || basename(el.currentSrc || el.src) || ch, duration_ms: Math.round((el.currentTime || 0) * 1000) }); el.__a2Preempted = false; }
        if (ev === 'ended') { hideCaption(el); if (A2.log && A2.log.ready) A2.log.event('audio_end', { target: el.__a2Label || basename(el.currentSrc || el.src) || ch, duration_ms: Math.round((el.duration || 0) * 1000) }); }
      }
      emit();
    }

    /* patch: every play() call goes through here (covers new Audio() objects) */
    HTMLMediaElement.prototype.play = function () {
      var el = this; register(el);
      var ch = channel(el);
      if (ch === 'sfx') {
        if (muted || busy(el)) return Promise.resolve();
        stopSfx();
      } else {
        preempt(el);
      }
      if (muted && !el.muted) { el.muted = true; el.__a2MutedByKit = true; }
      else if (!muted && el.__a2MutedByKit) { el.muted = false; el.__a2MutedByKit = false; }
      var p = origPlay.apply(el, arguments);
      if (p && p.catch) p.catch(function () { /* autoplay blocked or source error: surfaced by the platform if it cares */ });
      return p;
    };
    /* native controls (<audio controls>, <video controls>) don't call play(); catch their play events */
    document.addEventListener('play', function (e) {
      var el = e.target; if (!(el instanceof HTMLMediaElement)) return;
      var fresh = !media.has(el); register(el);
      if (fresh) onMediaEvent(el, 'play');
    }, true);

    /* speech synthesis (house rule: no live TTS; still guarded) */
    if (synth && origSpeak) {
      synth.speak = function (u) { preempt(null); if (muted && u) u.volume = 0; var r = origSpeak(u); setTimeout(emit, 30); return r; };
    }

    /* Web Audio SFX: a source that starts while voice/video plays is silenced at once */
    var S = window.AudioScheduledSourceNode && window.AudioScheduledSourceNode.prototype;
    if (S && S.start && !S.start.__a2) {
      var ost = S.start;
      S.start = function () {
        var r = ost.apply(this, arguments);
        var node = this;
        if (muted || busy(null)) { try { node.stop(0); } catch (e) {} return r; }
        var now = performance.now();
        if (now - lastSfxStart > 60) { sfxNodes.forEach(function (n) { if (n !== node) { try { n.stop(); } catch (e) {} } }); sfxNodes.clear(); }
        lastSfxStart = now;
        sfxNodes.add(node);
        try { node.addEventListener('ended', function () { sfxNodes.delete(node); }); } catch (e) {}
        return r;
      };
      S.start.__a2 = true;
    }

    /* ---------- captions + transcripts ---------- */
    function ensureCaptionUI() {
      if (capEl) return;
      capEl = h('div', { class: 'a2-captions', role: 'region', 'aria-label': 'Captions' });
      var wrap = h('div', { class: 'a2-captions-text' });
      capLabel = h('span', { class: 'a2-captions-label' });
      capText = h('span', { class: 'a2-captions-line' });
      wrap.appendChild(capLabel); wrap.appendChild(capText);
      capPlayBtn = h('button', { type: 'button', class: 'a2-btn is-sm is-icon', 'aria-label': 'Pause narration' }, icon('pause'));
      capPlayBtn.addEventListener('click', function () {
        var el = capActive && capActive.el; if (!el) return;
        if (el.paused) el.play(); else el.pause();
      });
      var stopBtn = h('button', { type: 'button', class: 'a2-btn is-sm is-icon', 'aria-label': 'Stop narration' }, icon('stop'));
      stopBtn.addEventListener('click', function () { audio.stopAll(); });
      var tBtn = h('button', { type: 'button', class: 'a2-btn is-sm is-icon', 'aria-label': 'Open full transcript' }, icon('file-text'));
      tBtn.addEventListener('click', function () { if (capActive) audio.showTranscript(capActive.entry); });
      var hideBtn = h('button', { type: 'button', class: 'a2-btn is-sm is-icon', 'aria-label': 'Hide captions' }, icon('x'));
      hideBtn.addEventListener('click', function () { audio.setCaptions(false); });
      capEl.appendChild(wrap); capEl.appendChild(capPlayBtn); capEl.appendChild(stopBtn); capEl.appendChild(tBtn); capEl.appendChild(hideBtn);
      document.body.appendChild(capEl);
    }
    function lookup(el) {
      if (el.__a2Caption) return el.__a2Caption;
      var key = el.dataset && el.dataset.a2Caption;
      if (key && captionMap[key]) return captionMap[key];
      var b = basename(el.currentSrc || el.src);
      return b ? captionMap[b] || captionMap[b.replace(/\.[a-z0-9]+$/i, '')] || null : null;
    }
    function showCaption(el) {
      if (channel(el) === 'video' && el.textTracks && el.textTracks.length) return; /* native <track> captions handle video */
      var entry = lookup(el);
      if (!entry) { if (capActive) hideCaption(capActive.el); return; }
      capActive = { el: el, entry: entry };
      if (!captionsOn || !cfg.captions) return;
      ensureCaptionUI();
      capLabel.textContent = entry.label || 'Narration';
      renderCue(el);
      capPlayBtn.innerHTML = icon('pause'); capPlayBtn.setAttribute('aria-label', 'Pause narration');
      capEl.classList.add('is-on');
    }
    function renderCue(el) {
      if (!capActive || !capText) return;
      var entry = capActive.entry, t = el.currentTime || 0, txt = entry.text || '';
      if (entry.cues && entry.cues.length) {
        var cue = null;
        for (var i = 0; i < entry.cues.length; i++) { var c = entry.cues[i]; if (t >= c.start && t < c.end) { cue = c; break; } if (t >= c.start) cue = c; }
        txt = cue ? cue.text : entry.cues[0].text;
      }
      if (capText.textContent !== txt) capText.textContent = txt;
    }
    function pauseCaption(el) {
      if (!capActive || capActive.el !== el || !capPlayBtn) return;
      capPlayBtn.innerHTML = icon('play'); capPlayBtn.setAttribute('aria-label', 'Resume narration');
      if (el.__a2Preempted) hideCaption(el);
    }
    function hideCaption(el) {
      if (capActive && el && capActive.el !== el) return;
      capActive = null; if (capEl) capEl.classList.remove('is-on');
    }

    var api = {
      /* register captions: map of file basename (or data-a2-caption key) -> {label, text, cues:[{start,end,text}]} */
      captions: function (map) { Object.keys(map || {}).forEach(function (k) { captionMap[k] = map[k]; }); return api; },
      caption: function (el, entry) { el.__a2Caption = entry; register(el); return el; },
      setCaptions: function (on) {
        captionsOn = !!on; lsSet('a2.captions.on', captionsOn);
        if (!captionsOn && capEl) capEl.classList.remove('is-on');
        if (captionsOn && capActive && !capActive.el.paused) showCaption(capActive.el);
        if (A2.log && A2.log.ready) A2.log.event('setting', { target: 'captions', value: captionsOn ? 'on' : 'off' });
        emit();
      },
      captionsOn: function () { return captionsOn; },
      showTranscript: function (entry) {
        if (!entry) return;
        var body = '';
        if (entry.cues && entry.cues.length) body = entry.cues.map(function (c) { return '<p>' + esc(c.text) + '</p>'; }).join('');
        else body = String(entry.text || '').split(/\n{2,}/).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
        A2.ui.dialog({ title: entry.label || 'Transcript', lead: 'Full text of the narration.', body: '<div class="a2-transcript">' + body + '</div>', actions: [{ label: 'Close', primary: true }] });
      },
      /* play narration through the manager; src may be a URL, data URI or an existing element */
      narrate: function (src, opts) {
        opts = opts || {};
        var el = src instanceof HTMLMediaElement ? src : new Audio(src);
        el.dataset.a2Channel = 'narration';
        if (opts.label) el.__a2Label = opts.label;
        if (opts.caption) el.__a2Caption = opts.caption;
        register(el);
        if (opts.onended) el.addEventListener('ended', opts.onended, { once: true });
        el.play();
        return el;
      },
      sfx: function (src) {
        if (muted || busy(null)) return null;
        var el = src instanceof HTMLMediaElement ? src : new Audio(src);
        el.dataset.a2Channel = 'sfx'; register(el); el.play(); return el;
      },
      stopAll: function () { var was = busy(null); preempt(null); hideCaption(null); if (was && A2.log && A2.log.ready) A2.log.event('audio_stop'); emit(); },
      isBusy: function () { return busy(null); },
      state: state,
      muted: function () { return muted; },
      setMuted: function (m) {
        muted = !!m; lsSet('a2.audio.muted', muted);
        media.forEach(function (el) { if (muted) { el.muted = true; el.__a2MutedByKit = true; } else if (el.__a2MutedByKit) { el.muted = false; el.__a2MutedByKit = false; } });
        if (muted) stopSfx();
        if (A2.log && A2.log.ready) A2.log.event('setting', { target: 'sound', value: muted ? 'off' : 'on' });
        emit();
      },
      on: function (fn) { subs.push(fn); return function () { subs = subs.filter(function (f) { return f !== fn; }); }; },
      register: register
    };
    return api;
  })();

  /* --------------------------------------------------------- interaction log
     21 variables per event (schema a2.log/1). No names, emails or IDs: values
     pass through A2.privacy.scrub(); the session id is a random UUID per tab. */
  var FIELDS = ['session_id', 'platform', 'platform_version', 'seq', 'ts', 't_ms', 'view', 'step_index', 'step_total', 'event',
    'target', 'value', 'correct', 'score', 'attempt', 'duration_ms', 'input_mode', 'audio_state', 'viewport', 'reduced_motion', 'lang'];
  var PRIVACY_NOTE = 'Anonymous: a random session ID and no name, email or ID fields. Typed text is logged as its length only; feedback comments are kept ' +
    'with emails, phone numbers, ID numbers and self-introductions removed. Check comments for names before sharing.';
  var log = A2.log = (function () {
    var buf = null, fb = null, sess = null, seq = 0, t0 = 0, ctx = { view: null, step_index: null, step_total: null }, viewStart = 0;
    var inputMode = 'mouse', flushT = null, MAX = 6000;
    function keyLog() { return 'a2.log.' + cfg.platform; }
    function keyFb() { return 'a2.feedback.' + cfg.platform; }
    function load() {
      if (buf) return;
      buf = lsGet(keyLog(), []); if (!Array.isArray(buf)) buf = [];
      fb = lsGet(keyFb(), []); if (!Array.isArray(fb)) fb = [];
    }
    function flush() { if (!buf) return; if (buf.length > MAX) buf = buf.slice(buf.length - MAX); lsSet(keyLog(), buf); lsSet(keyFb(), fb); }
    function schedule() { clearTimeout(flushT); flushT = setTimeout(flush, 400); }
    function viewport() { var w = window.innerWidth || 1024; return w < 640 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop'; }
    function reduced() { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
    function startSession() {
      var k = 'a2.session.' + cfg.platform;
      sess = ssGet(k, null);
      var isNew = !sess;
      if (!sess) { sess = { id: uuid(), started: new Date().toISOString(), t0: Date.now(), seq: 0 }; ssSet(k, sess); }
      seq = sess.seq || 0; t0 = sess.t0 || Date.now();
      return isNew;
    }
    function rec(type, d) {
      load(); d = d || {};
      var st = audio.state();
      var row = {
        session_id: sess.id, platform: cfg.platform, platform_version: cfg.version || '', seq: ++seq,
        ts: new Date().toISOString(), t_ms: Date.now() - t0,
        view: d.view != null ? d.view : ctx.view, step_index: d.step_index != null ? d.step_index : ctx.step_index,
        step_total: d.step_total != null ? d.step_total : ctx.step_total,
        event: String(type).slice(0, 40),
        target: d.target != null ? privacy.scrub(String(d.target)).slice(0, 120) : null,
        value: d.value != null ? privacy.scrub(d.value) : null,
        correct: typeof d.correct === 'boolean' ? d.correct : null,
        score: typeof d.score === 'number' && isFinite(d.score) ? Math.round(d.score * 1000) / 1000 : null,
        attempt: typeof d.attempt === 'number' ? d.attempt : null,
        duration_ms: typeof d.duration_ms === 'number' ? Math.round(d.duration_ms) : null,
        input_mode: inputMode, audio_state: st.muted ? 'muted' : st.channel, viewport: viewport(),
        reduced_motion: reduced(), lang: cfg.lang || document.documentElement.lang || 'en'
      };
      buf.push(row);
      sess.seq = seq; ssSet('a2.session.' + cfg.platform, sess);
      schedule();
      return row;
    }
    var api = {
      ready: false,
      FIELDS: FIELDS,
      start: function () {
        var isNew = startSession(); load(); api.ready = true;
        rec(isNew ? 'session_start' : 'page_load', { target: location.pathname.split('/').pop() || 'index', value: (document.referrer ? 'ref:' + basename(document.referrer).slice(0, 40) : null) });
        addEventListener('pointerdown', function (e) { inputMode = e.pointerType === 'touch' ? 'touch' : e.pointerType === 'pen' ? 'pen' : 'mouse'; }, true);
        addEventListener('keydown', function (e) { var k = e.key || ''; if (k === 'Tab' || k === 'Enter' || k === ' ' || k.indexOf('Arrow') === 0) inputMode = 'keyboard'; }, true);
        addEventListener('pagehide', function () { if (ctx.view) rec('view_end', { duration_ms: Date.now() - viewStart }); rec('page_hide'); flush(); });
        document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(); });
        addEventListener('error', function (e) { rec('error', { target: basename(e.filename || '') || 'script', value: String(e.message || 'error').slice(0, 160) }); });
        addEventListener('unhandledrejection', function (e) { rec('error', { target: 'promise', value: String((e.reason && e.reason.message) || e.reason || 'rejection').slice(0, 160) }); });
      },
      event: function (type, data) { if (!api.ready) return null; return rec(type, data); },
      /* call on every screen change: id, {label, step_index, step_total} */
      view: function (id, o) {
        o = o || {};
        if (api.ready && ctx.view && ctx.view !== id) rec('view_end', { duration_ms: Date.now() - viewStart });
        ctx.view = id; ctx.step_index = o.step_index != null ? o.step_index : null; ctx.step_total = o.step_total != null ? o.step_total : null;
        viewStart = Date.now();
        if (o.label != null) A2.where(o.label);
        if (api.ready) rec('view', { target: id, value: o.label || null });
      },
      context: function () { return { view: ctx.view, step_index: ctx.step_index, step_total: ctx.step_total }; },
      sessionId: function () { return sess && sess.id; },
      events: function () { load(); return buf.slice(); },
      feedback: function () { load(); return fb.slice(); },
      addFeedback: function (entry) { load(); fb.push(entry); flush(); },
      flush: flush,
      clear: function () { buf = []; fb = []; lsDel(keyLog()); lsDel(keyFb()); flush(); },
      toCSV: function (rows) {
        rows = rows || api.events();
        var q = function (v) { if (v == null) return ''; var s = privacy.redactKnown(String(v)); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
        return FIELDS.join(',') + '\n' + rows.map(function (r) { return FIELDS.map(function (f) { return q(r[f]); }).join(','); }).join('\n') + '\n';
      },
      toJSON: function () {
        var ev = api.events();
        var sessions = {};
        ev.forEach(function (e) { if (!sessions[e.session_id]) sessions[e.session_id] = { session_id: e.session_id, first_ts: e.ts, events: 0 }; sessions[e.session_id].events++; sessions[e.session_id].last_ts = e.ts; });
        return JSON.stringify({
          schema: 'a2.log/1', kit_version: VERSION, platform: cfg.platform, platform_name: cfg.name, platform_version: cfg.version || '',
          exported_at: new Date().toISOString(),
          privacy: PRIVACY_NOTE,
          fields: FIELDS, sessions: Object.keys(sessions).map(function (k) { return sessions[k]; }),
          events: ev, feedback: api.feedback()
        }, function (k, v) { return typeof v === 'string' ? privacy.redactKnown(v) : v; }, 2);
      }
    };
    return api;
  })();

  /* ------------------------------------------------------------------ ui */
  var ui = A2.ui = {};
  var toastWrap = null;
  /* a toast never covers the focused control (WCAG 2.4.11): it moves to the top while it would */
  function hits(a, b) { return a.width > 0 && b.width > 0 && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top; }
  function placeToasts() {
    if (!toastWrap) return;
    if (!toastWrap.children.length) { toastWrap.classList.remove('is-top'); return; }
    var el = document.activeElement;
    if (!el || el === document.body || el === document.documentElement) return;
    if (hits(el.getBoundingClientRect(), toastWrap.getBoundingClientRect())) toastWrap.classList.toggle('is-top');
  }
  ui.toast = function (msg, ms) {
    if (!toastWrap) {
      toastWrap = h('div', { class: 'a2-toasts', role: 'status', 'aria-live': 'polite' }); document.body.appendChild(toastWrap);
      document.addEventListener('focusin', function () { setTimeout(placeToasts, 0); });
      addEventListener('resize', placeToasts);
    }
    var t = h('div', { class: 'a2-toast' }, icon('check-circle') + '<span>' + esc(msg) + '</span>');
    toastWrap.appendChild(t);
    placeToasts();
    setTimeout(function () { t.remove(); placeToasts(); }, ms || 3600);
  };
  /* dialog({title, lead, body (html), actions:[{label, primary, danger, value, onClick}], onClose, initialFocus}) -> HTMLDialogElement */
  var dlgSeq = 0;
  ui.dialog = function (o) {
    var tid = 'a2dlg-t' + (++dlgSeq);
    var d = h('dialog', { class: 'a2-dialog', 'aria-labelledby': tid });
    var head = '<div class="a2-dialog-head"><div class="a2-grow"><h2 id="' + tid + '">' + esc(o.title || '') + '</h2>' + (o.lead ? '<p>' + esc(o.lead) + '</p>' : '') + '</div>' +
      '<button type="button" class="a2-btn is-quiet is-icon" data-a2-close aria-label="Close">' + icon('x') + '</button></div>';
    d.innerHTML = head + '<div class="a2-dialog-body">' + (o.body || '') + '</div>' + (o.actions && o.actions.length ? '<div class="a2-dialog-foot"></div>' : '');
    var foot = d.querySelector('.a2-dialog-foot');
    (o.actions || []).forEach(function (a) {
      var b = h('button', { type: 'button', class: 'a2-btn' + (a.primary ? ' is-primary' : '') + (a.danger ? ' is-danger' : '') }, (a.icon ? icon(a.icon) : '') + '<span>' + esc(a.label) + '</span>');
      b.addEventListener('click', function () { var keep = a.onClick ? a.onClick(d) === false : false; if (!keep) d.close(a.value || a.label); });
      foot.appendChild(b);
    });
    d.querySelector('[data-a2-close]').addEventListener('click', function () { d.close('close'); });
    d.addEventListener('close', function () { if (o.onClose) o.onClose(d.returnValue, d); setTimeout(function () { d.remove(); }, 0); });
    document.body.appendChild(d);
    if (d.showModal) d.showModal(); else d.setAttribute('open', '');
    /* a body that scrolls must be reachable by keyboard (WCAG 2.1.1) */
    var body = d.querySelector('.a2-dialog-body');
    var fit = function () {
      if (body.scrollHeight > body.clientHeight + 1) { body.tabIndex = 0; body.setAttribute('role', 'region'); body.setAttribute('aria-labelledby', tid); }
      else { body.removeAttribute('tabindex'); body.removeAttribute('role'); body.removeAttribute('aria-labelledby'); }
    };
    fit(); addEventListener('resize', fit);
    d.addEventListener('close', function () { removeEventListener('resize', fit); });
    /* initialFocus: 'heading' or a selector inside the dialog (default: the browser's first focusable) */
    if (o.initialFocus) {
      var target = o.initialFocus === 'heading' ? d.querySelector('#' + tid) : d.querySelector(o.initialFocus);
      if (target) { if (o.initialFocus === 'heading') target.tabIndex = -1; try { target.focus(); } catch (e) {} }
    }
    return d;
  };

  A2.where = function (text) {
    var t = text == null ? '' : String(text);
    document.querySelectorAll('.a2-bar-where, .a2-where').forEach(function (n) { n.textContent = t; });
  };

  /* ---------------------------------------------------------------- feedback */
  var TAGS = ['Instructions unclear', 'Too hard', 'Too easy', 'Something broke', 'Audio or video', 'Accessibility', 'Want more like this'];
  var feedback = A2.feedback = {
    open: function (opts) {
      opts = opts || {};
      var ctx = log.context();
      var about = opts.about || (document.querySelector('.a2-bar-where') || {}).textContent || ctx.view || cfg.name;
      var scale = function (name, lo, hi) {
        var s = '<div class="a2-scale">';
        for (var i = 1; i <= 5; i++) s += '<label><input type="radio" name="' + name + '" value="' + i + '" required aria-label="' + i + ' of 5"><span aria-hidden="true">' + i + '</span></label>';
        return s + '</div><div class="a2-scale-ends" aria-hidden="true"><span>' + lo + '</span><span>' + hi + '</span></div>';
      };
      var body =
        '<form id="a2fb" novalidate>' +
        '<fieldset><legend>How useful was this? <span class="a2-badge is-required">Required</span></legend>' + scale('useful', '1 Not useful', '5 Very useful') + '</fieldset>' +
        '<fieldset><legend>How clear were the instructions? <span class="a2-badge is-required">Required</span></legend>' + scale('clear', '1 Confusing', '5 Very clear') + '</fieldset>' +
        '<fieldset><legend>Anything specific? <span class="a2-badge is-optional">Optional</span></legend><div class="a2-row">' +
        TAGS.map(function (t) { return '<button type="button" class="a2-chip" aria-pressed="false" data-tag="' + esc(t) + '">' + esc(t) + '</button>'; }).join('') + '</div></fieldset>' +
        '<div class="a2-field"><label for="a2fb-note">Comment <span class="a2-badge is-optional">Optional</span></label>' +
        '<textarea id="a2fb-note" class="a2-textarea" maxlength="500" aria-describedby="a2fb-hint"></textarea>' +
        '<span id="a2fb-hint" class="a2-hint">Feedback is anonymous, so leave out names, emails and ID numbers. Up to 500 characters.</span>' +
        '<p class="a2-callout is-warn" id="a2fb-name" role="alert" hidden></p></div>' +
        '<p class="a2-error" id="a2fb-err" role="alert" hidden>Please answer the two required questions.</p>' +
        '</form>';
      var dlg = ui.dialog({
        title: 'Share feedback', lead: 'About: ' + about + '. Anonymous, and it stays in this browser until you export it.', body: body,
        actions: [{ label: 'Cancel' }, {
          label: 'Save feedback', primary: true, onClick: function (d) {
            var f = d.querySelector('#a2fb');
            var u = f.querySelector('input[name=useful]:checked'), c = f.querySelector('input[name=clear]:checked');
            var err = f.querySelector('#a2fb-err'), ta = f.querySelector('#a2fb-note'), warn = f.querySelector('#a2fb-name');
            if (!u || !c) { err.hidden = false; (u ? f.querySelector('input[name=clear]') : f.querySelector('input[name=useful]')).focus(); return false; }
            var raw = ta.value.trim();
            /* a gentle check: words that look like a person's name get one chance to be removed */
            var hints = privacy.nameHints(privacy.scrubText(raw, 500));
            if (hints.length && !d.__a2NameChecked) {
              d.__a2NameChecked = true;
              warn.textContent = 'This may include a name: ' + hints.map(function (x) { return '“' + x + '”'; }).join(', ') + '. Feedback is anonymous, so please remove it, or select Save feedback again to save the comment as it is.';
              warn.hidden = false; ta.setAttribute('aria-describedby', 'a2fb-hint a2fb-name'); ta.focus({ preventScroll: true });
              try { warn.scrollIntoView({ block: 'nearest' }); } catch (e) {}
              return false;
            }
            var tags = Array.prototype.map.call(f.querySelectorAll('.a2-chip[aria-pressed=true]'), function (b) { return b.dataset.tag; });
            var note = privacy.scrubText(raw, 500) || '';
            var entry = { id: uuid(), session_id: log.sessionId(), ts: new Date().toISOString(), platform: cfg.platform, platform_version: cfg.version || '', view: ctx.view, step_index: ctx.step_index, about: privacy.scrub(about), useful: +u.value, clear: +c.value, tags: tags, comment: note };
            log.addFeedback(entry);
            /* the comment itself stays in the feedback record only; the event log gets its length */
            log.event('feedback', { target: ctx.view || 'general', value: 'useful=' + u.value + ';clear=' + c.value + (tags.length ? ';tags=' + tags.join('|') : '') + ';comment_chars=' + note.length, score: +u.value });
            ui.toast('Thanks. Feedback saved. Export it any time from Your data.');
          }
        }]
      });
      dlg.querySelectorAll('.a2-chip').forEach(function (b) { b.addEventListener('click', function () { b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); }); });
      var note0 = dlg.querySelector('#a2fb-note');
      note0.addEventListener('input', function () {
        if (!dlg.__a2NameChecked) return;
        dlg.__a2NameChecked = false; var w = dlg.querySelector('#a2fb-name'); w.hidden = true; w.textContent = ''; note0.setAttribute('aria-describedby', 'a2fb-hint');
      });
      log.event('feedback_open', { target: ctx.view || 'general', value: opts.reason || 'button' });
      return dlg;
    },
    /* gentle, dismissible prompt at a milestone; never blocks */
    prompt: function (about) {
      var key = 'a2.fbprompt.' + cfg.platform + '.' + (about || '');
      if (ssGet(key, false)) return;
      ssSet(key, true);
      ui.dialog({
        title: 'Quick feedback?', lead: 'Two ratings, about 20 seconds. Optional.',
        body: '<p class="a2-muted" style="margin:0">Your answers are anonymous and help improve ' + esc(cfg.name) + '.</p>',
        actions: [{ label: 'Not now' }, { label: 'Give feedback', primary: true, onClick: function () { setTimeout(function () { feedback.open({ about: about, reason: 'prompt' }); }, 0); } }]
      });
    }
  };

  /* -------------------------------------------------------------- your data */
  A2.data = {
    open: function () {
      var ev = log.events(), fb = log.feedback();
      var body =
        '<div class="a2-kpis" style="margin-bottom:16px">' +
        '<div class="a2-kpi"><b class="a2-num">' + ev.length + '</b><span>interaction events</span></div>' +
        '<div class="a2-kpi"><b class="a2-num">' + fb.length + '</b><span>feedback entries</span></div>' +
        '<div class="a2-kpi"><b class="a2-num" style="font-size:18px">' + esc((log.sessionId() || '').slice(0, 8)) + '</b><span>anonymous session</span></div></div>' +
        '<div class="a2-callout is-info">' + icon('shield') + '<div><strong>What is recorded.</strong> Screens visited, steps, choices, scores, timings and settings, under a random session ID, plus any feedback you save. ' +
        'There are no name, email or ID fields; text you type is logged as its length only, and feedback comments have emails, phone numbers and ID numbers removed. Nothing leaves this device unless you download it and choose to share it.</div></div>' +
        '<p class="a2-hint" style="margin:12px 0 0">JSON includes everything (events and feedback). CSV has one row per event with the 21 standard A² fields.</p>';
      ui.dialog({
        title: 'Your data', lead: cfg.name + ' · stored only in this browser', body: body,
        actions: [
          { label: 'Clear', danger: true, icon: 'trash', onClick: function (d) {
              var b = d.querySelector('.a2-dialog-foot .is-danger span');
              if (!d.__a2ConfirmClear) { d.__a2ConfirmClear = true; b.textContent = 'Select again to delete'; return false; }
              log.clear(); ui.toast('Data cleared on this device.'); return true; } },
          { label: 'Download CSV', icon: 'download', onClick: function () { A2.data.exportCSV(); return false; } },
          { label: 'Download JSON', primary: true, icon: 'download', onClick: function () { A2.data.exportJSON(); return false; } }
        ]
      });
      log.event('data_open');
    },
    exportJSON: function () {
      log.event('export', { target: 'json', value: log.events().length + ' events' }); log.flush();
      download('a2-' + cfg.platform + '-' + stamp() + '-' + (log.sessionId() || '').slice(0, 8) + '.json', log.toJSON(), 'application/json');
    },
    exportCSV: function () {
      log.event('export', { target: 'csv', value: log.events().length + ' events' }); log.flush();
      download('a2-' + cfg.platform + '-' + stamp() + '-' + (log.sessionId() || '').slice(0, 8) + '.csv', log.toCSV(), 'text/csv');
    }
  };

  /* ------------------------------------------------------------------ help */
  A2.help = function () {
    var hp = cfg.help || {};
    var steps = (hp.steps || []).map(function (s, i) {
      var badge = s.optional ? '<span class="a2-badge is-optional">Optional</span>' : s.required ? '<span class="a2-badge is-required">Required</span>' : '';
      return '<li style="margin:0 0 12px"><strong>' + esc(s.title) + '</strong> ' + badge + (s.text ? '<br><span class="a2-muted">' + esc(s.text) + '</span>' : '') + '</li>';
    }).join('');
    var keys = (hp.keys || []).map(function (k) { return '<tr><td><kbd>' + esc(k[0]) + '</kbd></td><td>' + esc(k[1]) + '</td></tr>'; }).join('');
    var body = (hp.intro ? '<p style="margin-top:0">' + esc(hp.intro) + '</p>' : '') +
      (steps ? '<ol style="padding-left:20px;margin:0 0 8px">' + steps + '</ol>' : '') +
      (keys ? '<h3 style="font-size:16px;margin:16px 0 8px">Keyboard</h3><table class="a2-table"><tbody>' + keys + '</tbody></table>' : '') +
      (hp.html || '') +
      '<p class="a2-hint" style="margin:16px 0 0">' + esc(cfg.name) + (cfg.version ? ' · v' + esc(cfg.version) : '') + ' · A² Learning Studio · Dr. Ali Keyvanfar &amp; Dr. Arezou Shafaghat · Kennesaw State University · ' +
      '<a href="https://alikeyvanfar-source.github.io/a2-learning-studio/">All A² platforms</a></p>';
    ui.dialog({ title: hp.title || 'How this works', lead: hp.lead || null, body: body, actions: [{ label: 'Got it', primary: true }] });
    log.event('help_open');
  };

  /* ---------------------------------------------------------------- suite bar */
  function buildBar() {
    var bar = h('header', { class: 'a2-bar', role: 'banner' });
    bar.innerHTML =
      '<div class="a2-bar-brand"><span class="a2-mark" aria-hidden="true">A²</span>' +
      '<span class="a2-bar-title"><b>' + esc(cfg.name) + '</b><small>' + esc(cfg.subtitle) + '</small></span></div>' +
      '<div class="a2-bar-where" aria-live="polite"></div>' +
      '<div class="a2-bar-actions">' +
      (cfg.audio ? '<button type="button" class="a2-btn is-quiet a2-hide-sm" data-a2="sound" aria-pressed="true" aria-label="Sound">' + icon('volume') + '<span class="a2-btn-label">Sound</span></button>' +
        '<button type="button" class="a2-btn is-quiet a2-hide-sm" data-a2="cc" aria-pressed="true" aria-label="Captions">' + icon('captions') + '<span class="a2-btn-label">Captions</span></button>' : '') +
      '<button type="button" class="a2-btn is-quiet a2-hide-sm" data-a2="help">' + icon('help') + '<span class="a2-btn-label">Help</span></button>' +
      '<button type="button" class="a2-btn is-quiet a2-hide-sm" data-a2="data">' + icon('database') + '<span class="a2-btn-label">Your data</span></button>' +
      '<button type="button" class="a2-btn" data-a2="feedback">' + icon('message') + '<span class="a2-btn-label">Feedback</span></button>' +
      '<button type="button" class="a2-btn is-quiet a2-more" data-a2="more" aria-label="More options" aria-haspopup="dialog">' + icon('menu') + '</button>' +
      '</div>';
    var where = h('div', { class: 'a2-where', 'aria-hidden': 'true' });
    var mount = cfg.mount && document.querySelector(cfg.mount);
    if (mount) { mount.appendChild(bar); mount.appendChild(where); }
    else { var first = document.body.firstElementChild; document.body.insertBefore(where, first && first.id === SPRITE_ID ? first.nextSibling : first); document.body.insertBefore(bar, where); }
    var q = function (k) { return bar.querySelector('[data-a2="' + k + '"]'); };
    q('help').addEventListener('click', A2.help);
    q('data').addEventListener('click', A2.data.open);
    q('feedback').addEventListener('click', function () { feedback.open(); });
    q('more').addEventListener('click', function () {
      var row = function (k, ic, label, state) { return '<button type="button" class="a2-btn" data-act="' + k + '"' + (state != null ? ' aria-pressed="' + (state ? 'true' : 'false') + '"' : '') + '>' + icon(ic) + '<span>' + label + '</span>' + (state != null ? '<span class="a2-state">' + (state ? 'On' : 'Off') + '</span>' : '') + '</button>'; };
      var body = '<div class="a2-menu">' +
        (cfg.audio ? row('sound', audio.muted() ? 'volume-x' : 'volume', 'Sound', !audio.muted()) + row('cc', 'captions', 'Captions', audio.captionsOn()) : '') +
        row('help', 'help', 'How this works') + row('data', 'database', 'Your data') + '</div>';
      var d = ui.dialog({ title: cfg.name, lead: 'Options', body: body });
      d.querySelectorAll('[data-act]').forEach(function (b) {
        b.addEventListener('click', function () {
          var k = b.dataset.act;
          if (k === 'sound') { audio.setMuted(!audio.muted()); b.setAttribute('aria-pressed', audio.muted() ? 'false' : 'true'); b.querySelector('.a2-state').textContent = audio.muted() ? 'Off' : 'On'; return; }
          if (k === 'cc') { audio.setCaptions(!audio.captionsOn()); b.setAttribute('aria-pressed', audio.captionsOn() ? 'true' : 'false'); b.querySelector('.a2-state').textContent = audio.captionsOn() ? 'On' : 'Off'; return; }
          d.close(); setTimeout(k === 'help' ? A2.help : A2.data.open, 0);
        });
      });
    });
    ['help', 'data', 'feedback'].forEach(function (k) { var b = q(k); b.setAttribute('aria-label', b.textContent.trim()); });
    if (cfg.audio) {
      var snd = q('sound'), cc = q('cc');
      /* toggle pattern: stable label, state in aria-pressed, icon shows state */
      var paint = function () {
        var m = audio.muted();
        snd.setAttribute('aria-pressed', m ? 'false' : 'true');
        snd.innerHTML = icon(m ? 'volume-x' : 'volume') + '<span class="a2-btn-label">Sound</span>';
        snd.title = m ? 'Sound is off' : 'Sound is on';
        var c = audio.captionsOn();
        cc.setAttribute('aria-pressed', c ? 'true' : 'false');
        cc.title = c ? 'Captions are on' : 'Captions are off';
      };
      snd.addEventListener('click', function () { audio.setMuted(!audio.muted()); paint(); });
      cc.addEventListener('click', function () { audio.setCaptions(!audio.captionsOn()); paint(); });
      audio.on(paint); paint();
    }
    return bar;
  }
  /* automatic, privacy-safe logging of choices: never records what someone typed, only its length */
  function autolog() {
    var skip = function (el) { return !el || el.closest('.a2-bar, .a2-dialog, .a2-captions, [data-a2-nolog]') || (el.tagName === 'A' && (el.hasAttribute('download') || /^blob:/.test(el.getAttribute('href') || ''))); };
    var name = function (el) {
      var t = el.getAttribute('data-a2-id') || el.id || el.getAttribute('aria-label') || el.getAttribute('title') || (el.textContent || '').replace(/\s+/g, ' ').trim();
      return (t || el.tagName.toLowerCase()).slice(0, 80);
    };
    document.addEventListener('click', function (e) {
      var el = e.target.closest && e.target.closest('button, a[href], [role=button], [role=tab], [role=option], [onclick], summary');
      if (!el || skip(el)) return;
      var tag = el.tagName.toLowerCase();
      log.event(tag === 'a' ? 'link' : tag === 'summary' ? 'toggle' : 'click', { target: name(el), value: tag === 'a' ? basename(el.getAttribute('href') || '') || null : null });
    }, true);
    document.addEventListener('change', function (e) {
      var el = e.target; if (!el || skip(el)) return;
      var t = (el.type || '').toLowerCase(), v;
      if (t === 'checkbox' || t === 'radio') v = el.checked ? (el.value && el.value !== 'on' ? el.value : 'checked') : 'unchecked';
      else if (t === 'range' || t === 'number' || el.tagName === 'SELECT') v = el.value;
      else if (t === 'file') v = 'files=' + ((el.files && el.files.length) || 0);
      else v = 'len=' + String(el.value || '').length; /* free text: length only */
      log.event('input', { target: name(el) || el.name || t, value: v });
    }, true);
  }
  function ensureSkip() {
    if (document.querySelector('.a2-skip')) return;
    var target = document.getElementById(cfg.main) || document.querySelector('main') || document.querySelector('[role=main]');
    if (!target) return;
    if (!target.id) target.id = 'main';
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    var a = h('a', { class: 'a2-skip', href: '#' + target.id, text: 'Skip to main content' });
    document.body.insertBefore(a, document.body.firstChild);
  }

  /* ------------------------------------------------------------------ init */
  A2.init = function (opts) {
    Object.keys(opts || {}).forEach(function (k) { cfg[k] = opts[k]; });
    var root = document.documentElement;
    if (cfg.accent) root.style.setProperty('--a2-accent', cfg.accent);
    if (cfg.accentStrong) root.style.setProperty('--a2-accent-strong', cfg.accentStrong);
    if (cfg.accentInk) root.style.setProperty('--a2-accent-ink', cfg.accentInk);
    ready(function () {
      root.classList.add('a2'); document.body.classList.add('a2');
      injectSprite();
      if (cfg.bar) buildBar();
      ensureSkip();
      log.start();
      if (cfg.autolog) autolog();
      if (cfg.onReady) try { cfg.onReady(A2); } catch (e) { console.error(e); }
    });
    return A2;
  };
})();
