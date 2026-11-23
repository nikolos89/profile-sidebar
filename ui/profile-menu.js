(function () {
  'use strict';
  const PLUGIN_ID = 'profile-sidebar';
  const ICONS = {
    settings: ['M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8', 'm9.5 3-.6 2.1-1.8 1L5 5.6 3 9l1.5 1.6v2.8L3 15l2 3.4 2.1-.5 1.8 1 .6 2.1h5l.6-2.1 1.8-1 2.1.5 2-3.4-1.5-1.6v-2.8L21 9l-2-3.4-2.1.5-1.8-1-.6-2.1z'],
    person: ['M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0', 'M4 21v-2a8 8 0 0 1 16 0v2'],
    switch: ['M3 7h16m-4-4 4 4-4 4', 'M21 17H5m4-4-4 4 4 4'],
    add: ['M12 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0', 'M1 21v-2a7 7 0 0 1 12-4', 'M18 11v10m-5-5h10'],
    upgrade: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18', 'M12 16V8m-4 4 4-4 4 4'],
    logout: ['M9 4H4v16h5', 'M9 12h12m-4-4 4 4-4 4'],
    chevron: ['m6 9 6 6 6-6']
  };
  function cleanText(value) { return typeof value === 'string' ? value.trim() : ''; }
  function isPluginEnabled(plugins, id) {
    return Array.isArray(plugins) && plugins.some(plugin => {
      if (!plugin || plugin.disabled === true || plugin.enabled === false) return false;
      const path = cleanText(plugin.path || plugin.installDir).replace(/\\/g, '/').replace(/\/$/, '');
      return plugin.name === id || plugin.id === id || path.split('/').pop() === id || plugin.installedFrom?.id === id;
    });
  }
  function profileFromStatus(status, auth) {
    const signedIn = auth?.state === 'signedIn';
    const email = signedIn ? cleanText(status?.email) : '';
    const fullName = cleanText(status?.name || status?.displayName || status?.userName);
    const name = email ? (fullName || email.split('@')[0]) : 'Profile';
    const tier = signedIn ? cleanText(status?.userTier?.description || auth?.context?.selectedLicense?.tierDisplayName) : '';
    const plan = !signedIn ? 'Signed out' : tier || 'Plan loading…';
    const initial = Array.from(name)[0]?.toLocaleUpperCase('en') || '?';
    return { signedIn, email, name, fullName, plan, initial };
  }
  function safeUpgradeUrl(status) {
    const value = cleanText(status?.userTier?.upgradeSubscriptionUri);
    if (!value) return '';
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'https:' && !parsed.username && !parsed.password ? parsed.href : '';
    } catch { return ''; }
  }
  function Component(props) {
    const R = props.React;
    const h = R.createElement;
    const profile = profileFromStatus(props.status, props.auth);
    const upgradeUrl = safeUpgradeUrl(props.status);
    const [open, setOpen] = R.useState(false);
    const [confirmLogout, setConfirmLogout] = R.useState(false);
    const [signingOut, setSigningOut] = R.useState(false);
    const [error, setError] = R.useState('');
    const [position, setPosition] = R.useState(null);
    const trigger = R.useRef(null);
    const menu = R.useRef(null);
    const dialog = R.useRef(null);
    const menuId = R.useId();
    const dialogId = R.useId();
    const identityKey = (profile.signedIn ? 'in:' : 'out:') + profile.email;
    R.useEffect(() => { setOpen(false); setConfirmLogout(false); setError(''); }, [identityKey]);
    R.useLayoutEffect(() => {
      if (!open || !trigger.current || !menu.current) return;
      const place = () => {
        const anchor = trigger.current.getBoundingClientRect();
        const width = Math.min(310, window.innerWidth - 16);
        setPosition({ left: Math.max(8, Math.min(anchor.left, window.innerWidth - width - 8)), bottom: Math.max(8, window.innerHeight - anchor.top + 7), width });
      };
      place();
      const first = menu.current.querySelector('[role="menuitem"]:not(:disabled)');
      first?.focus({ preventScroll: true });
      const outside = event => {
        if (!menu.current?.contains(event.target) && !trigger.current?.contains(event.target)) setOpen(false);
      };
      const dismiss = event => {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus(); }
      };
      document.addEventListener('pointerdown', outside, true);
      document.addEventListener('keydown', dismiss, true);
      window.addEventListener('resize', place, { passive: true });
      return () => {
        document.removeEventListener('pointerdown', outside, true);
        document.removeEventListener('keydown', dismiss, true);
        window.removeEventListener('resize', place);
      };
    }, [open]);
    R.useEffect(() => {
      if (!confirmLogout || !dialog.current) return;
      const current = dialog.current;
      if (!current.open) current.showModal();
      return () => { if (current.open) current.close(); };
    }, [confirmLogout]);
    function icon(name) {
      return h('svg', { className:'agp-icon', viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:1.7, strokeLinecap:'round', strokeLinejoin:'round', 'aria-hidden':true },
        ...ICONS[name].map((d,index) => h('path', { d, key:index })));
    }
    function activate(action) {
      setOpen(false); setError('');
      try {
        const result = action();
        if (result?.catch) result.catch(() => setError('Could not open this action. Try Settings.'));
      } catch { setError('Could not open this action. Try Settings.'); }
    }
    function item(label, glyph, action, options = {}) {
      return h('button', {
        key:label, type:'button', role:'menuitem', className:'agp-menu-item' + (options.danger ? ' agp-menu-danger' : ''),
        disabled:!!options.disabled, title:options.title || undefined,
        onClick:() => activate(action), 'data-profile-action':options.action || glyph
      }, icon(glyph), h('span', null, label), options.shortcut ? h('span',{className:'agp-shortcut','aria-hidden':true},options.shortcut) : null);
    }
    function menuKeys(event) {
      const items = [...menu.current.querySelectorAll('[role="menuitem"]:not(:disabled)')];
      let index = items.indexOf(document.activeElement);
      if (event.key === 'ArrowDown') index = (index + 1) % items.length;
      else if (event.key === 'ArrowUp') index = (index - 1 + items.length) % items.length;
      else if (event.key === 'Home') index = 0;
      else if (event.key === 'End') index = items.length - 1;
      else if (event.key === 'Tab') { setOpen(false); return; }
      else return;
      event.preventDefault(); event.stopPropagation(); items[index]?.focus();
    }
    async function logout() {
      if (signingOut) return;
      setSigningOut(true); setError('');
      try { await props.onLogout(); setConfirmLogout(false); }
      catch { setError('Could not sign out. Open Settings → your account.'); }
      finally { setSigningOut(false); }
    }
    const content = [];
    content.push(item('Settings','settings',props.onSettings,{shortcut:'Ctrl+,',action:'settings'}));
    if (profile.signedIn) content.push(item('Account and plan','person',props.onAccount,{action:'account'}));
    if (profile.signedIn && props.accountsEnabled) {
      content.push(h('div',{key:'accounts-divider',className:'agp-divider',role:'separator'}));
      content.push(item('Switch account','switch',() => props.onAccounts('switch'),{disabled:!props.accountsReady,title:props.accountsReady ? undefined : 'Account Switcher is starting',action:'switch'}));
      content.push(item('Add account','add',() => props.onAccounts('add'),{disabled:!props.accountsReady,title:props.accountsReady ? undefined : 'Account Switcher is starting',action:'add'}));
    }
    if (profile.signedIn && upgradeUrl) {
      content.push(h('div',{key:'plan-divider',className:'agp-divider',role:'separator'}));
      content.push(item('Upgrade plan','upgrade',() => props.onUpgrade(upgradeUrl),{action:'upgrade'}));
    }
    if (profile.signedIn && props.canLogout) {
      content.push(h('div',{key:'logout-divider',className:'agp-divider',role:'separator'}));
      content.push(item('Sign out','logout',() => setConfirmLogout(true),{action:'logout'}));
    }
    const popup = open ? h('div', {
      ref:menu, id:menuId, role:'menu', 'aria-label':'Profile menu', className:'agp-menu',
      style:position || {left:8,bottom:70,width:Math.min(310,window.innerWidth-16),visibility:'hidden'}, onKeyDown:menuKeys
    }, h('div',{className:'agp-menu-heading'},
      h('span',{className:'agp-menu-email',title:profile.email},profile.email || 'Antigravity'),
      h('span',{className:'agp-menu-plan'},profile.plan)
    ), ...content) : null;
    const logoutDialog = confirmLogout ? h('dialog', {
      ref:dialog, className:'agp-dialog', 'aria-labelledby':dialogId,
      onCancel:event => {event.preventDefault();if(!signingOut)setConfirmLogout(false);}
    }, h('h2',{id:dialogId},'Sign out?'), h('p',{className:'agp-dialog-email'},profile.email),
      h('p',null,'Sign in through Google again to continue.'),
      error ? h('p',{className:'agp-error',role:'alert'},error) : null,
      h('div',{className:'agp-dialog-actions'},
        h('button',{type:'button',className:'agp-dialog-cancel',autoFocus:true,disabled:signingOut,onClick:() => setConfirmLogout(false)},'Cancel'),
        h('button',{type:'button',className:'agp-dialog-confirm',disabled:signingOut,onClick:logout},signingOut ? 'Signing out…' : 'Sign out')
      )
    ) : null;
    return h('div',{className:'agp-footer','data-testid':'profile-sidebar-footer','data-profile-plugin':PLUGIN_ID},
      h('button',{
        ref:trigger,type:'button',className:'agp-trigger' + (open ? ' agp-trigger-open' : ''),
        'aria-label':`Profile: ${profile.name}. ${profile.plan}`,'aria-haspopup':'menu','aria-expanded':open,'aria-controls':open ? menuId : undefined,
        title:profile.email ? `${profile.name}\n${profile.email}\n${profile.plan}` : profile.plan,
        onClick:() => {setError('');setOpen(value => !value);},
        onKeyDown:event => {if(event.key==='ArrowUp'||event.key==='ArrowDown'){event.preventDefault();setOpen(true);}}
      }, h('span',{className:'agp-avatar','aria-hidden':true},profile.initial),
        h('span',{className:'agp-identity'},h('span',{className:'agp-name'},profile.name),h('span',{className:'agp-plan'},profile.plan)),
        h('span',{className:'agp-chevron' + (open ? ' agp-chevron-open' : '')},icon('chevron'))
      ), !confirmLogout && error ? h('span',{className:'agp-inline-error',role:'status'},error) : null,
      popup ? props.portal(popup,document.body) : null,
      logoutDialog ? props.portal(logoutDialog,document.body) : null
    );
  }
  window.__AGProfileSidebar = Object.freeze({ version:'1.1.0-beta.1', Component, isPluginEnabled, profileFromStatus, safeUpgradeUrl });
})();
