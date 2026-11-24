(function () {
  'use strict';

  const MODEL_CHANGE = 'agp-model-change';
  const MODEL_SELECTOR = '[data-agp-model-label]';
  const REFRESH_MS = 10000;
  const numberFormat = new Intl.NumberFormat('en-US', {style:'percent', maximumFractionDigits:0});
  const timeFormat = new Intl.DateTimeFormat('en-US', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'});

  function normalize(value) {
    return String(value ?? '').toLowerCase()
      .replace(/(?<=\d)\.(?=\d)/g, ' ')
      .replace(/[^a-zа-яё0-9]+/g, ' ').trim();
  }

  function modelKey(value) {
    return normalize(value).replace(/^(?:models?|model)\s+/, '')
      .replace(/(?: (?:extra low|low|medium|high|xhigh|max|thinking|tiered|preview|pilot|tight|standard|низкий|средний|высокий))+$/, '');
  }

  function matchesModel(model, ...values) {
    // The picker can use a different visible product name from the internal
    // model ID. Two models shown separately must keep their separate quotas.
    const key = modelKey(model.label) || modelKey(model.id);
    if (key.length <= 3) return false;
    return values.some(value => {
      const name = modelKey(value);
      return name === key || (' ' + name + ' ').includes(' ' + key + ' ');
    });
  }

  function modelFamily(model) {
    const label = modelKey(model.label) || modelKey(model.id);
    if (/^gemini\b/.test(label)) return 'gemini';
    if (/^(?:claude|gpt|openai gpt)\b/.test(label)) return 'claude-gpt';
    return null;
  }

  function groupFamily(label) {
    const name = normalize(label);
    if (/^(?:(?:models?|модели) )?gemini(?: models?)?$/.test(name)) return 'gemini';
    if (/^(?:(?:models?|модели) )?(?:claude (?:and |и )?gpt|gpt (?:and |и )?claude)(?: models?)?$/.test(name)) {
      return 'claude-gpt';
    }
    return null;
  }

  function familyLabel(family) {
    return family === 'gemini' ? 'Gemini models' : 'Claude and GPT models';
  }

  function period(bucket) {
    const window = normalize(bucket.window);
    if (/^(?:5\s*h(?:r|rs|ours?)?|pt5h|300\s*m|18000\s*s|5\s*ч)$/.test(window)) return 'short';
    if (/^(?:weekly|week|1\s*w|7\s*d(?:ays?)?|p7d|168\s*h|недельный)$/.test(window)) return 'weekly';
    return null;
  }

  function readBucket(bucket) {
    if (bucket.disabled || bucket.enabled === false) return null;
    const fraction = bucket.remaining?.case === 'remainingFraction' ? bucket.remaining.value : bucket.remainingFraction;
    if (typeof fraction !== 'number' || !Number.isFinite(fraction) || fraction < 0 || fraction > 1) return null;
    const time = bucket.resetTime;
    let resetAt;
    if (time && typeof time === 'object' && 'seconds' in time) {
      resetAt = Number(time.seconds) * 1000 + Number(time.nanos ?? 0) / 1000000;
    } else if (time instanceof Date || typeof time === 'string') {
      resetAt = new Date(time).valueOf();
    }
    return {used:1-fraction, resetAt:Number.isFinite(resetAt) && resetAt > 0 ? resetAt : null};
  }

  function quotaForModel(groups, model) {
    const limits = {};
    const selected = model && !model.multi ? model : null;
    const selectedFamily = selected ? modelFamily(selected) : null;

    for (const group of Array.isArray(groups) ? groups : []) {
      const family = groupFamily(group?.displayName);
      for (const bucket of Array.isArray(group?.buckets) ? group.buckets : []) {
        if (!bucket) continue;
        const kind = period(bucket);
        if (!kind) continue;
        const sample = readBucket(bucket);
        if (!sample) continue;
        const matches = selected && matchesModel(selected, group.displayName, bucket.displayName, bucket.bucketId);
        const labels = normalize([group.displayName, bucket.displayName, bucket.bucketId].join(' '));
        const overall = /\b(?:all models?|all ai models?|global|overall|shared weekly|weekly shared)\b|все модели|общий недельный/.test(labels)
          || (kind === 'weekly' && /^(?:weekly|weekly (?:limit|quota)|7d limit)$/.test(normalize(group.displayName)));
        let priority;
        let scope;
        if (matches) {
          priority = 3;
        } else if (family && family === selectedFamily) {
          priority = 2;
          scope = familyLabel(family);
        } else if (overall && (selected || kind === 'weekly')) {
          priority = 1;
          scope = 'All models';
        } else continue;

        const current = limits[kind];
        if (!current || priority > current.priority || (priority === current.priority && sample.used > current.used)) {
          limits[kind] = {...sample, priority, scope};
        }
      }
    }
    return {short:limits.short ?? null, weekly:limits.weekly ?? null};
  }

  function readModelControl(button) {
    return {
      label:button.dataset.agpModelLabel,
      id:button.dataset.agpModelId,
      multi:button.dataset.agpModelMulti === 'true'
    };
  }

  function useSelectedModel(R, enabled) {
    const [model, setModel] = R.useState(null);
    R.useEffect(() => {
      if (!enabled) return;
      let preferred;
      let frame;
      const refresh = () => {
        if (frame) return;
        frame = requestAnimationFrame(() => {
          frame = null;
          const visible = Array.from(document.querySelectorAll(MODEL_SELECTOR))
            .filter(element => element.getClientRects().length && !element.closest('[inert],[aria-hidden="true"]'));
          // More than one visible composer can be displayed in split view.
          const active = visible.includes(preferred) ? preferred : visible.length === 1 ? visible[0] : null;
          const next = active ? readModelControl(active) : null;
          setModel(old => old?.id === next?.id && old?.label === next?.label && old?.multi === next?.multi ? old : next);
        });
      };
      const identify = event => {
        const hit = event.target?.closest?.(MODEL_SELECTOR);
        if (hit) preferred = hit;
        else {
          const form = event.target?.closest?.('[data-testid="agent-input-box"]');
          if (form) preferred = form.querySelector(MODEL_SELECTOR);
        }
        refresh();
      };
      refresh();
      window.addEventListener(MODEL_CHANGE, refresh);
      window.addEventListener('resize', refresh);
      window.addEventListener('focus', refresh);
      document.addEventListener('focusin', identify);
      document.addEventListener('pointerdown', identify, true);
      return () => {
        window.removeEventListener(MODEL_CHANGE, refresh);
        window.removeEventListener('resize', refresh);
        window.removeEventListener('focus', refresh);
        document.removeEventListener('focusin', identify);
        document.removeEventListener('pointerdown', identify, true);
        if (frame) cancelAnimationFrame(frame);
      };
    }, [enabled]);
    return enabled ? model : null;
  }

  function useQuota(R, identity, provider) {
    const [snapshot, setSnapshot] = R.useState(null);
    R.useEffect(() => {
      if (!identity || !provider) return;
      let disposed = false;
      let inFlight = false;
      let timer;
      let nextRequestAt = 0;
      function later() {
        clearTimeout(timer);
        if (!disposed && !document.hidden) timer = setTimeout(update, Math.max(0, nextRequestAt - Date.now()));
      }
      async function update() {
        clearTimeout(timer);
        if (disposed || document.hidden || inFlight) return;
        if (Date.now() < nextRequestAt) { later(); return; }
        inFlight = true;
        nextRequestAt = Date.now() + REFRESH_MS;
        try {
          const groups = await provider();
          if (!disposed) setSnapshot({identity, groups:Array.isArray(groups) ? groups : [], error:false});
        } catch {
          if (!disposed) setSnapshot(current => ({identity, groups:current?.identity === identity ? current.groups : [], error:true}));
        } finally {
          inFlight = false;
          later();
        }
      }
      const resume = () => {
        if (document.hidden) clearTimeout(timer);
        else update();
      };
      update();
      document.addEventListener('visibilitychange', resume);
      window.addEventListener('focus', resume);
      return () => {
        disposed = true;
        clearTimeout(timer);
        document.removeEventListener('visibilitychange', resume);
        window.removeEventListener('focus', resume);
      };
    }, [identity,provider]);
    return snapshot?.identity === identity ? snapshot : null;
  }

  function QuotaIndicator({React:R, portal, identity, plan, provider, onDetails, open, onToggle, onClose}) {
    const h = R.createElement;
    const model = useSelectedModel(R, !!identity);
    const snapshot = useQuota(R, identity, provider);
    const quota = quotaForModel(snapshot?.groups, model);
    const trigger = R.useRef(null);
    const popover = R.useRef(null);
    const popoverId = R.useId();
    const [position,setPosition] = R.useState(null);
    R.useLayoutEffect(() => {
      if (!open || !trigger.current || !popover.current) return;
      const place = () => {
        const anchor = trigger.current.closest('.agp-row').getBoundingClientRect();
        const width = Math.min(338, window.innerWidth - 16);
        setPosition({
          left:Math.max(8, Math.min(anchor.left, window.innerWidth - width - 8)),
          bottom:Math.max(8, window.innerHeight - anchor.top + 7),
          width
        });
      };
      const outside = event => {
        if (!trigger.current?.contains(event.target) && !popover.current?.contains(event.target)) onClose();
      };
      const escape = event => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        onClose();
        trigger.current?.focus();
      };
      place();
      popover.current.focus({preventScroll:true});
      document.addEventListener('pointerdown', outside, true);
      document.addEventListener('keydown', escape, true);
      window.addEventListener('resize', place);
      return () => {
        document.removeEventListener('pointerdown', outside, true);
        document.removeEventListener('keydown', escape, true);
        window.removeEventListener('resize', place);
      };
    },[open,onClose]);
    if (!identity) return null;

    const shortTitle = 'Five-hour limit';
    const weeklyTitle = 'Weekly limit';
    const describeUsage = (title,sample) => `${title} — ${sample ? 'used ' + numberFormat.format(sample.used) : 'unavailable'}`;
    const shortUsage = describeUsage(shortTitle,quota.short);
    const weeklyUsage = describeUsage(weeklyTitle,quota.weekly);
    const ring = (className,sample) => h('span',{className},
      h('span',{className:'agp-quota-track'}),
      sample ? h('span',{className:'agp-quota-arc',style:{'--agp-used':sample.used}}) : null);
    const dial = h('div',{className:'agp-quota-dial','aria-hidden':true},
      ring('agp-quota-ring',quota.short),
      ring('agp-quota-ring agp-quota-ring-weekly',quota.weekly));
    const row = (title,sample,barClass) => h('div',{className:'agp-quota-item'},
      h('div',{className:'agp-quota-item-line'},h('strong',null,title),
        h('span',{className:'agp-quota-number'},sample ? numberFormat.format(sample.used) : '—')),
      h('div',{className:barClass,role:sample ? 'progressbar' : undefined,
        'aria-label':sample ? title : undefined,'aria-valuenow':sample ? Math.round(sample.used*100) : undefined},
        sample ? h('span',{style:{width:(sample.used*100)+'%'}}) : null),
      sample?.scope || sample?.resetAt ? h('small',null,
        [sample.scope,sample.resetAt ? 'Resets ' + timeFormat.format(sample.resetAt) : null].filter(Boolean).join(' · ')) : null
    );
    const explanation = !provider ? 'Usage data is unavailable'
      : !snapshot ? 'Loading usage…'
      : snapshot.error ? 'Could not refresh usage'
      : model?.multi ? 'Multiple models or an orchestrator are selected'
      : !model ? 'Open a conversation with a selected model'
      : !quota.short ? 'Five-hour usage is unavailable for this model' : '';
    const panel = open ? h('section',{className:'agp-menu agp-quota-panel',role:'dialog',tabIndex:-1,
      'aria-label':'Usage limits',id:popoverId,ref:popover,style:position || {visibility:'hidden'}},
      h('div',{className:'agp-quota-heading'},
        h('div',null,h('strong',null,'Usage limits'),h('small',null,plan)),
        h('button',{type:'button',className:'agp-quota-details',onClick:() => {onClose();onDetails();}},'View all limits')),
      model?.label && !model.multi ? h('p',{className:'agp-quota-model'},model.label) : null,
      row(shortTitle,quota.short,'agp-quota-bar'),
      row(weeklyTitle,quota.weekly,'agp-quota-bar agp-quota-bar-weekly'),
      explanation ? h('p',{className:'agp-quota-explanation',role:'status'},explanation) : null) : null;
    return h(R.Fragment,null,
      h('button',{type:'button',className:'agp-quota-button',ref:trigger,title:`${shortUsage}\n${weeklyUsage}`,
        'aria-label':`Antigravity usage limits. ${shortUsage}. ${weeklyUsage}`,'aria-haspopup':'dialog','aria-expanded':open,
        'aria-controls':open ? popoverId : undefined,onClick:onToggle},dial),
      panel ? portal(panel,document.body) : null);
  }

  window.__AGProfileQuota = Object.freeze({QuotaIndicator, quotaForModel});
})();
