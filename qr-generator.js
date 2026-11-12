/* Vividex static QR generator — all payload processing happens locally. */
(() => {
  'use strict';

  const byId = id => document.getElementById(id);
  const form = byId('qr-form');
  const canvas = byId('qr-preview');
  if (!form || !canvas) return;

  const tabs = [...document.querySelectorAll('[data-qr-type]')];
  const panels = [...document.querySelectorAll('[data-panel]')];
  const foreground = byId('qr-foreground');
  const background = byId('qr-background');
  const ecc = byId('qr-error-level');
  const fileInput = byId('qr-logo');
  const removeLogo = byId('qr-remove-logo');
  const logoName = byId('qr-logo-filename');
  const warning = byId('qr-warning');
  const feedback = byId('qr-feedback');
  const chip = byId('qr-status-chip');
  const pngButton = byId('qr-download-png');
  const svgButton = byId('qr-download-svg');
  const maxPayloadBytes = 1200;
  const quietZone = 4;
  const utf8 = new TextEncoder();

  let activeType = 'url';
  let qrMatrix = null;
  let payload = '';
  let logoImage = null;
  let logoDataURL = '';
  let previousCorrection = 'M';
  let renderTimer = null;

  function value(id) {
    return byId(id).value.trim();
  }

  function fail(message) {
    throw new Error(message);
  }

  function cleanText(text) {
    return String(text || '').replace(/[\r\n]+/g, ' ').trim();
  }

  function normaliseURL(input) {
    let text = cleanText(input);
    if (!text) fail('Enter a website address to generate a QR code.');
    if (!/^[a-z][\w+.-]*:/i.test(text)) text = 'https://' + text;
    let url;
    try { url = new URL(text); }
    catch (_) { fail('Enter a valid website address such as https://example.com.'); }
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) {
      fail('Website QR codes must use an http:// or https:// address.');
    }
    return url.href;
  }

  function normalisePhone(text) {
    const phone = cleanText(text).replace(/[^\d+]/g, '');
    if (!/^\+?\d{3,18}$/.test(phone)) fail('Enter a valid phone number (including area or country code where needed).');
    return phone;
  }

  function escapeWifi(s) {
    return String(s).replace(/([\\;,:"])/g, '\\$1');
  }

  function escapeVCard(s) {
    return String(s).replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/([;,])/g,'\\$1');
  }

  function buildPayload() {
    switch (activeType) {
      case 'url':
        return normaliseURL(value('qr-url'));
      case 'text': {
        const text = byId('qr-text').value.trim();
        if (!text) fail('Enter the text you want the QR code to contain.');
        return text;
      }
      case 'wifi': {
        const ssid = byId('qr-wifi-ssid').value;
        const security = value('qr-wifi-security');
        const pass = byId('qr-wifi-password').value;
        if (!ssid.trim()) fail('Enter your Wi-Fi network name.');
        if (security !== 'nopass' && !pass) fail('Enter the Wi-Fi password, or select an open network.');
        const hidden = byId('qr-wifi-hidden').checked;
        return 'WIFI:T:' + security + ';S:' + escapeWifi(ssid) +
          (security === 'nopass' ? '' : ';P:' + escapeWifi(pass)) +
          ';H:' + (hidden ? 'true' : 'false') + ';;';
      }
      case 'email': {
        const email = value('qr-email-to');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Enter a valid email address.');
        const args = [];
        const subject = byId('qr-email-subject').value;
        const body = byId('qr-email-body').value;
        if (subject) args.push('subject=' + encodeURIComponent(subject));
        if (body) args.push('body=' + encodeURIComponent(body));
        return 'mailto:' + email + (args.length ? '?' + args.join('&') : '');
      }
      case 'phone':
        return 'tel:' + normalisePhone(value('qr-phone'));
      case 'sms':
        return 'SMSTO:' + normalisePhone(value('qr-sms-to')) + ':' + byId('qr-sms-message').value.replace(/\r\n/g, '\n');
      case 'contact': {
        const first = cleanText(value('qr-contact-first'));
        const last = cleanText(value('qr-contact-last'));
        if (!first && !last) fail('Enter at least a first name or last name.');
        const parts = ['BEGIN:VCARD', 'VERSION:3.0',
          'N:' + escapeVCard(last) + ';' + escapeVCard(first) + ';;;',
          'FN:' + escapeVCard([first, last].filter(Boolean).join(' '))];
        const company = value('qr-contact-company');
        const phone = value('qr-contact-phone');
        const email = value('qr-contact-email');
        const website = value('qr-contact-website');
        if (company) parts.push('ORG:' + escapeVCard(company));
        if (phone) parts.push('TEL;TYPE=CELL:' + escapeVCard(normalisePhone(phone)));
        if (email) {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Enter a valid contact email address.');
          parts.push('EMAIL;TYPE=INTERNET:' + escapeVCard(email));
        }
        if (website) parts.push('URL:' + escapeVCard(normaliseURL(website)));
        parts.push('END:VCARD');
        return parts.join('\r\n');
      }
      default:
        fail('Choose a QR code format.');
    }
  }

  function luminance(hex) {
    const rgb = [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)/255)
      .map(c => c <= .04045 ? c/12.92 : ((c+.055)/1.055)**2.4);
    return .2126*rgb[0] + .7152*rgb[1] + .0722*rgb[2];
  }

  function warningsFor(text) {
    const alerts=[];
    const l1=luminance(foreground.value), l2=luminance(background.value);
    const contrast=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
    if (contrast<4.5) alerts.push('Low contrast may make this QR code difficult to scan. Try a darker pattern on a light background.');
    else if (l1>l2) alerts.push('Light patterns on dark backgrounds are less reliable. Test this code on several phones.');
    if (logoImage) alerts.push('Branded codes can be harder to scan. Test your downloaded code before printing.');
    if (utf8.encode(text).length>500) alerts.push('This is a dense QR code. Print it larger and leave plenty of clear space around it.');
    return alerts.join(' ');
  }

  function paint(matrix, target, size) {
    const count = matrix.getModuleCount();
    const total = count + quietZone*2;
    const unit = size/total;
    target.width=size;
    target.height=size;
    const context = target.getContext('2d', {alpha:false});
    context.imageSmoothingEnabled=false;
    context.fillStyle=background.value;
    context.fillRect(0,0,size,size);
    context.fillStyle=foreground.value;
    for(let row=0;row<count;row++) {
      for(let col=0;col<count;col++) {
        if (!matrix.isDark(row,col)) continue;
        const x1=Math.round((col+quietZone)*unit);
        const x2=Math.round((col+quietZone+1)*unit);
        const y1=Math.round((row+quietZone)*unit);
        const y2=Math.round((row+quietZone+1)*unit);
        context.fillRect(x1,y1,x2-x1,y2-y1);
      }
    }
    if(logoImage) {
      const center=size/2;
      const outer=count*unit*.21;
      const inner=count*unit*.155;
      context.fillStyle=background.value;
      context.fillRect(Math.round(center-outer/2),Math.round(center-outer/2),Math.round(outer),Math.round(outer));
      context.imageSmoothingEnabled=true;
      context.imageSmoothingQuality='high';
      context.drawImage(logoImage,center-inner/2,center-inner/2,inner,inner);
    }
  }

  function setUnavailable(message) {
    qrMatrix=null;
    payload='';
    pngButton.disabled=true;
    svgButton.disabled=true;
    chip.textContent='NEEDS INPUT';
    chip.classList.add('is-error');
    feedback.textContent=message;
    warning.hidden=true;
    const c=canvas.getContext('2d');
    c.fillStyle='#f3f6fa';
    c.fillRect(0,0,canvas.width,canvas.height);
    c.strokeStyle='#d9e2f0';
    c.lineWidth=2;
    c.strokeRect(55,55,canvas.width-110,canvas.height-110);
    c.textAlign='center';
    c.font='600 19px sans-serif';
    c.fillStyle='#637895';
    c.fillText('Your QR preview',canvas.width/2,canvas.height/2);
  }

  function generate() {
    try {
      if (typeof qrcode !== 'function') fail('The QR engine could not load. Refresh the page and try again.');
      const next=buildPayload();
      const bytes=utf8.encode(next).length;
      if(bytes>maxPayloadBytes) fail('This content is too long ('+bytes+' bytes). Keep QR content below '+maxPayloadBytes+' bytes.');
      const correction=logoImage ? 'H' : ecc.value;
      const nextMatrix=qrcode(0,correction);
      nextMatrix.addData(next,'Byte');
      nextMatrix.make();
      qrMatrix=nextMatrix;
      payload=next;
      paint(qrMatrix,canvas,512);
      pngButton.disabled=false;
      svgButton.disabled=false;
      chip.textContent='READY';
      chip.classList.remove('is-error');
      feedback.textContent='Ready to download · ' + bytes + ' encoded bytes · ' + qrMatrix.getModuleCount() + ' × ' + qrMatrix.getModuleCount() + ' modules';
      const message=warningsFor(next);
      warning.textContent=message;
      warning.hidden=!message;
    } catch(error) {
      setUnavailable(error instanceof Error ? error.message : 'Unable to generate this code. Please check your input.');
    }
  }

  function scheduleGenerate() {
    clearTimeout(renderTimer);
    renderTimer=setTimeout(generate,180);
  }

  function selectTab(type, focus=false) {
    const selected=tabs.find(tab=>tab.dataset.qrType===type);
    if(!selected) return;
    activeType=type;
    tabs.forEach(tab=>{
      const active=tab===selected;
      tab.classList.toggle('is-selected',active);
      tab.setAttribute('aria-selected',String(active));
      tab.tabIndex=active?0:-1;
    });
    panels.forEach(panel=>{panel.hidden=panel.dataset.panel!==type;});
    if(focus) selected.focus();
    generate();
  }

  tabs.forEach((tab,index)=>{
    tab.addEventListener('click',()=>selectTab(tab.dataset.qrType));
    tab.addEventListener('keydown',e=>{
      let selected=index;
      if(e.key==='ArrowRight') selected=(index+1)%tabs.length;
      else if(e.key==='ArrowLeft') selected=(index-1+tabs.length)%tabs.length;
      else if(e.key==='Home') selected=0;
      else if(e.key==='End') selected=tabs.length-1;
      else return;
      e.preventDefault();
      selectTab(tabs[selected].dataset.qrType,true);
    });
  });

  function updateWifiControls() {
    const open=value('qr-wifi-security')==='nopass';
    byId('qr-wifi-password-wrap').hidden=open;
    byId('qr-wifi-password').disabled=open;
    scheduleGenerate();
  }
  byId('qr-wifi-security').addEventListener('change',updateWifiControls);
  form.addEventListener('submit',e=>e.preventDefault());
  form.addEventListener('input',scheduleGenerate);
  form.addEventListener('change',scheduleGenerate);
  document.querySelectorAll('.qr-style-panel input, .qr-style-panel select').forEach(el=>{
    if(el===fileInput) return;
    el.addEventListener('input',scheduleGenerate);
    el.addEventListener('change',scheduleGenerate);
  });

  const swatches=[...document.querySelectorAll('.qr-swatch')];
  function syncColours() {
    byId('qr-foreground-hex').textContent=foreground.value.toUpperCase();
    byId('qr-background-hex').textContent=background.value.toUpperCase();
    swatches.forEach(button=>{
      const selected=button.dataset.qrForeground===foreground.value && button.dataset.qrBackground===background.value;
      button.classList.toggle('is-selected',selected);
      button.setAttribute('aria-pressed',String(selected));
    });
    scheduleGenerate();
  }
  foreground.addEventListener('input',syncColours);
  background.addEventListener('input',syncColours);
  swatches.forEach(button=>button.addEventListener('click',()=>{
    foreground.value=button.dataset.qrForeground;
    background.value=button.dataset.qrBackground;
    syncColours();
  }));

  async function prepareLogo(file) {
    if(!file) return;
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)) fail('Upload a PNG, JPG or WebP image.');
    if(file.size>2*1024*1024) fail('Choose a logo under 2 MB.');
    const url=URL.createObjectURL(file);
    try {
      const source=new Image();
      source.decoding='async';
      source.src=url;
      await source.decode();
      if(source.naturalWidth>6000 || source.naturalHeight>6000 || !source.naturalWidth) fail('Choose a logo with reasonable image dimensions.');
      const offscreen=document.createElement('canvas');
      offscreen.width=300;
      offscreen.height=300;
      const ctx=offscreen.getContext('2d');
      const scale=Math.min(290/source.naturalWidth,290/source.naturalHeight);
      const w=source.naturalWidth*scale,h=source.naturalHeight*scale;
      ctx.clearRect(0,0,300,300);
      ctx.drawImage(source,(300-w)/2,(300-h)/2,w,h);
      const png=offscreen.toDataURL('image/png');
      const ready=new Image();
      ready.src=png;
      await ready.decode();
      logoImage=ready;
      logoDataURL=png;
      logoName.textContent=file.name;
      removeLogo.hidden=false;
      previousCorrection=ecc.value;
      ecc.value='H';
      ecc.disabled=true;
      generate();
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  fileInput.addEventListener('change',async()=>{
    if(!fileInput.files?.length) return;
    try {
      await prepareLogo(fileInput.files[0]);
    } catch(error) {
      fileInput.value='';
      logoName.textContent=error instanceof Error ? error.message : 'Unable to open this image.';
    }
  });

  removeLogo.addEventListener('click',()=>{
    fileInput.value='';
    logoImage=null;
    logoDataURL='';
    logoName.textContent='';
    removeLogo.hidden=true;
    ecc.disabled=false;
    ecc.value=previousCorrection;
    generate();
  });

  function createSVG() {
    if(!qrMatrix) return null;
    const count=qrMatrix.getModuleCount();
    const size=count+quietZone*2;
    const paths=[];
    for(let row=0;row<count;row++) {
      for(let col=0;col<count;col++) {
        if(qrMatrix.isDark(row,col)) paths.push('M'+(col+quietZone)+' '+(row+quietZone)+'h1v1h-1z');
      }
    }
    let image='';
    if(logoImage && logoDataURL.startsWith('data:image/png;base64,')) {
      const outer=count*.21, inner=count*.155;
      const center=size/2;
      image='<rect x="'+(center-outer/2)+'" y="'+(center-outer/2)+'" width="'+outer+'" height="'+outer+'" fill="'+background.value+'"/>' +
        '<image x="'+(center-inner/2)+'" y="'+(center-inner/2)+'" width="'+inner+'" height="'+inner+'" href="'+logoDataURL+'"/>';
    }
    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 '+size+' '+size+'" shape-rendering="crispEdges">' +
      '<rect width="'+size+'" height="'+size+'" fill="'+background.value+'"/>' +
      '<path d="'+paths.join('')+'" fill="'+foreground.value+'"/>'+image+'</svg>';
  }

  function downloadBlob(blob,filename) {
    const objectURL=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=objectURL;
    a.download=filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(objectURL),5000);
  }

  pngButton.addEventListener('click',()=>{
    if(!qrMatrix) return;
    const size=Number(byId('qr-png-size').value) || 1024;
    const target=document.createElement('canvas');
    paint(qrMatrix,target,size);
    target.toBlob(blob=>{
      if(blob) downloadBlob(blob,'vividex-qr-'+activeType+'.png');
      else feedback.textContent='Unable to export PNG. Try the SVG download instead.';
    },'image/png');
  });

  svgButton.addEventListener('click',()=>{
    if(!qrMatrix) return;
    const svg=createSVG();
    if(svg) downloadBlob(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),'vividex-qr-'+activeType+'.svg');
  });

  updateWifiControls();
  syncColours();
  selectTab('url');
})();
