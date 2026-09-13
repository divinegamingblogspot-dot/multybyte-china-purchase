/* MULTYBYTE // SIDE ULTRA — adds live-looking HUD layers without touching portal logic */
(() => {
  'use strict';
  const boot = () => {
    const side = document.querySelector('.login-side');
    if (!side || side.dataset.ultraReady === '1') return;
    side.dataset.ultraReady = '1';

    const make = (tag, cls, html) => {
      const el = document.createElement(tag);
      el.className = cls;
      el.innerHTML = html;
      side.appendChild(el);
      return el;
    };

    make('div', 'ultra-scan', '');
    make('div', 'ultra-corner', '');
    make('div', 'ultra-hud', '<span class="live">NODE ONLINE</span><span class="secure">SESSION ENCRYPTED</span>');
    make('div', 'ultra-readout', '<b>NETWORK TELEMETRY</b>LATENCY&nbsp;&nbsp; 18ms<br>UPLINK&nbsp;&nbsp;&nbsp;&nbsp; 1.2Gb/s<br>SYNC&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 99.98%<i></i>CHANNEL STABLE');
    make('div', 'ultra-nodes', '<i></i><i></i><i></i><i></i><i></i>');
    make('div', 'ultra-rail', '<div><b>NODE 01</b>PRIMARY</div><div><b>LIVE</b>DATA STREAM</div><div><b>99.99%</b>UPTIME</div><div><b>LOCKED</b>SECURE</div>');

    const tick = () => {
      const readout = side.querySelector('.ultra-readout');
      if (!readout) return;
      const latency = 14 + Math.floor(Math.random() * 11);
      const rate = (1.0 + Math.random() * .5).toFixed(1);
      readout.innerHTML = '<b>NETWORK TELEMETRY</b>LATENCY&nbsp;&nbsp; ' + latency + 'ms<br>UPLINK&nbsp;&nbsp;&nbsp;&nbsp; ' + rate + 'Gb/s<br>SYNC&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 99.98%<i></i>CHANNEL STABLE';
    };
    window.setInterval(tick, 4200);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
