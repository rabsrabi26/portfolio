/* Browser translation of MIMO-Scheduling-Simulation-Reviewed-v2.
   The event-driven server loop, channel-rate model, queue selection, quantum
   service, and metrics follow scheduler_simulate.m and its helpers. */
(function (root) {
  'use strict';

  var DEFAULT_CONFIG = {
    numRuns: 100, numUsers: 20, numAntennas: 16, cellRadius_m: 500,
    bandwidth_Hz: 10e6, noisePower_dBm: -104, txPower_dBm: 30,
    pathLoss1m_dB: 30, pathLossExponent: 3.5, shadowStd_dB: 8,
    arrivalWindow_ms: 10, rrQuantum_ms: 2, pfQuantum_ms: 1,
    pfAveragingTime_ms: 10, alpha: 0.7, beta: 0.3,
    queueEdges_m: [[0, 125], [125, 250], [250, 375], [375, 500]],
    serviceProbabilities: [0.3, 0.4, 0.3],
    serviceDemandRanges_ms: [[1, 5], [2, 8], [5, 15]], seed: 20261115
  };
  var SERVICE_WEIGHT = [1.0, 0.5, 0.2];
  var SERVICE_NAMES = ['Voice/Video', 'Text', 'Data'];
  var ALGOS = [
    { key: 'priority', label: 'Location + Service Priority', short: 'Priority' },
    { key: 'mlq', label: 'Multilevel Queue', short: 'Multilevel' },
    { key: 'rr', label: 'Round Robin', short: 'Round Robin' },
    { key: 'pf', label: 'Proportional Fair', short: 'Proportional Fair' },
    { key: 'maxci', label: 'Max C/I', short: 'Max C/I' }
  ];

  /* Repeatable local PRNG. MATLAB's mt19937ar stream is not byte-for-byte
     reproduced by browsers; distribution and draw order are preserved. */
  function makeRng(seed) {
    var state = seed >>> 0, spare = null;
    function random() {
      state = (state + 0x6D2B79F5) | 0;
      var t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    function normal() {
      if (spare !== null) { var s = spare; spare = null; return s; }
      var u = Math.max(random(), 1e-12), v = random();
      var mag = Math.sqrt(-2 * Math.log(u)), angle = 2 * Math.PI * v;
      spare = mag * Math.sin(angle);
      return mag * Math.cos(angle);
    }
    return { random: random, normal: normal };
  }

  function mergeConfig(opts) {
    var c = {};
    Object.keys(DEFAULT_CONFIG).forEach(function (k) { c[k] = DEFAULT_CONFIG[k]; });
    Object.keys(opts || {}).forEach(function (k) { c[k] = opts[k]; });
    c.serviceProbabilities = (c.serviceProbabilities || DEFAULT_CONFIG.serviceProbabilities).map(Number);
    var pSum = c.serviceProbabilities.reduce(function (a, b) { return a + b; }, 0);
    if (!(pSum > 0) || c.serviceProbabilities.some(function (p) { return !Number.isFinite(p) || p < 0; })) {
      throw new Error('Service-class weights must be non-negative and have a positive total.');
    }
    c.serviceProbabilities = c.serviceProbabilities.map(function (p) { return p / pSum; });
    c.numUsers = Math.max(1, Math.floor(+c.numUsers));
    c.numAntennas = Math.max(1, Math.floor(+c.numAntennas));
    c.numRuns = Math.max(1, Math.min(500, Math.floor(+c.numRuns || 100)));
    return c;
  }

  function generateScenario(opts, rng) {
    var cfg = mergeConfig(opts), K = cfg.numUsers, i;
    var theta = [], radius = [], arrivals = [], types = [], work = [];
    /* Keep the MATLAB draw sequence: all angles, all radii, arrivals, class
       draws, workload draws, then channel shadowing draws. */
    for (i = 0; i < K; i++) theta.push(2 * Math.PI * rng.random());
    for (i = 0; i < K; i++) radius.push(cfg.cellRadius_m * Math.sqrt(rng.random()));
    for (i = 0; i < K; i++) arrivals.push(cfg.arrivalWindow_ms * rng.random());
    var cdf = [cfg.serviceProbabilities[0], cfg.serviceProbabilities[0] + cfg.serviceProbabilities[1], 1];
    for (i = 0; i < K; i++) {
      var u = rng.random();
      types.push(u <= cdf[0] ? 0 : u <= cdf[1] ? 1 : 2);
    }
    for (i = 0; i < K; i++) {
      var range = cfg.serviceDemandRanges_ms[types[i]];
      work.push(range[0] + (range[1] - range[0]) * rng.random());
    }
    var users = [];
    for (i = 0; i < K; i++) {
      users.push({
        id: i, x_m: radius[i] * Math.cos(theta[i]), y_m: radius[i] * Math.sin(theta[i]),
        angle: theta[i], distance_m: radius[i], arrival_ms: arrivals[i],
        service_type: types[i], work_ms: work[i]
      });
    }

    var noiseW = Math.pow(10, (cfg.noisePower_dBm - 30) / 10);
    var txW = Math.pow(10, (cfg.txPower_dBm - 30) / 10);
    var sumEff = 0;
    users.forEach(function (user) {
      var d = Math.max(user.distance_m, 1);
      var shadow = cfg.shadowStd_dB * rng.normal();
      user.pathLoss_dB = cfg.pathLoss1m_dB + 10 * cfg.pathLossExponent * Math.log10(d) + shadow;
      user.gainLinear = Math.pow(10, -user.pathLoss_dB / 10);
      user.snrLinear = Math.max(txW * user.gainLinear / noiseW, 1e-12);
      user.spectralEfficiency = Math.log2(1 + user.snrLinear);
      sumEff += user.spectralEfficiency;
    });
    var meanEff = sumEff / K;
    users.forEach(function (user) {
      user.rateFactor = Math.max(user.spectralEfficiency / Math.max(meanEff, Number.EPSILON), 0.05);
      /* Alias fields keep the cell map/timeline rendering simple. */
      user.distance = user.distance_m;
      user.type = user.service_type;
      user.arrival_time = user.arrival_ms;
      user.burst_time = user.work_ms;
      user.path_loss = user.gainLinear;
    });
    return { users: users, cfg: cfg };
  }

  function priorityScore(user, cfg, maxDistance) {
    var nd = maxDistance > 0 ? 1 - user.distance_m / maxDistance : 0;
    return cfg.alpha * nd + cfg.beta * SERVICE_WEIGHT[user.service_type];
  }

  function selectUser(candidates, users, cfg, algorithm, avgRate, rrTicket) {
    var i, best, bestMetric;
    if (algorithm === 'Priority') {
      var maxDistance = Math.max.apply(null, users.map(function (u) { return u.distance_m; }));
      best = candidates[0]; bestMetric = -Infinity;
      for (i = 0; i < candidates.length; i++) {
        var score = priorityScore(users[candidates[i]], cfg, maxDistance);
        if (score > bestMetric) { bestMetric = score; best = candidates[i]; }
      }
      return best;
    }
    if (algorithm === 'Multilevel Queue') {
      var bestQueue = Infinity, pool = [];
      candidates.forEach(function (index) {
        var d = users[index].distance_m, q = cfg.queueEdges_m.length;
        for (var j = 0; j < cfg.queueEdges_m.length; j++) {
          var lo = cfg.queueEdges_m[j][0], hi = cfg.queueEdges_m[j][1];
          var inBand = d >= lo && (j === cfg.queueEdges_m.length - 1 ? d <= hi : d < hi);
          if (inBand) { q = j; break; }
        }
        if (q < bestQueue) { bestQueue = q; pool = [index]; }
        else if (q === bestQueue) pool.push(index);
      });
      return selectUser(pool, users, cfg, 'Priority', avgRate, rrTicket);
    }
    if (algorithm === 'Round Robin') {
      best = candidates[0];
      for (i = 1; i < candidates.length; i++) if (rrTicket[candidates[i]] < rrTicket[best]) best = candidates[i];
      return best;
    }
    if (algorithm === 'Proportional Fair') {
      best = candidates[0]; bestMetric = -Infinity;
      for (i = 0; i < candidates.length; i++) {
        var ix = candidates[i], pf = users[ix].rateFactor / Math.max(avgRate[ix], Number.EPSILON);
        if (pf > bestMetric) { bestMetric = pf; best = ix; }
      }
      return best;
    }
    if (algorithm === 'Max C/I') {
      best = candidates[0]; bestMetric = -Infinity;
      for (i = 0; i < candidates.length; i++) {
        var ci = users[candidates[i]].snrLinear;
        if (ci > bestMetric) { bestMetric = ci; best = candidates[i]; }
      }
      return best;
    }
    throw new Error('Unknown scheduler: ' + algorithm);
  }

  function schedulerSimulate(users, cfg, algorithm) {
    var K = users.length, M = cfg.numAntennas, EPS = 1e-10;
    var remaining = users.map(function (u) { return u.work_ms; });
    var completion = new Array(K).fill(NaN), firstStart = new Array(K).fill(NaN);
    var active = new Array(M).fill(null), activeUser = new Array(K).fill(false);
    var rrTicket = users.map(function (_, i) { return i; }), nextTicket = K;
    var meanRate = users.reduce(function (a, u) { return a + u.rateFactor; }, 0) / K;
    var avgRate = new Array(K).fill(Math.max(meanRate, Number.EPSILON));
    var lastUpdate = 0, rateState = new Array(K).fill(0), currentTime = 0;
    var segs = [], guard = 0;

    while (completion.some(function (v) { return Number.isNaN(v); })) {
      if (++guard > 1000000) throw new Error('Scheduler did not converge; check simulation parameters.');

      /* Complete all service slices ending at this event time. A user's
         remaining workload is reduced by served duration × channel rate. */
      for (var m = 0; m < M; m++) {
        var job = active[m];
        if (job && job.end <= currentTime + EPS) {
          var u = job.user;
          remaining[u] = Math.max(0, remaining[u] - job.slice * users[u].rateFactor);
          if (remaining[u] <= EPS) {
            completion[u] = job.end;
            remaining[u] = 0;
          } else if (algorithm === 'Round Robin') {
            rrTicket[u] = nextTicket++;
          }
          activeUser[u] = false;
          rateState[u] = 0;
          active[m] = null;
        }
      }

      /* Dispatch onto every currently idle antenna. The MATLAB source
         intends this parallel dispatch, but its free-server placeholder can
         repeatedly select the same idle antenna when no user has arrived yet.
         Dispatching all available servers avoids that non-advancing loop. */
      var freeServers = [];
      for (m = 0; m < M; m++) if (!active[m]) freeServers.push(m);
      for (var fi = 0; fi < freeServers.length; fi++) {
        var candidates = [];
        for (u = 0; u < K; u++) {
          if (Number.isNaN(completion[u]) && remaining[u] > EPS &&
              users[u].arrival_ms <= currentTime + EPS && !activeUser[u]) candidates.push(u);
        }
        if (!candidates.length) break;
        var server = freeServers[fi];
        u = selectUser(candidates, users, cfg, algorithm, avgRate, rrTicket);
        if (Number.isNaN(firstStart[u])) firstStart[u] = currentTime;
        var rate = users[u].rateFactor, slice;
        if (algorithm === 'Round Robin') slice = Math.min(cfg.rrQuantum_ms, remaining[u] / rate);
        else if (algorithm === 'Proportional Fair') slice = Math.min(cfg.pfQuantum_ms, remaining[u] / rate);
        else slice = remaining[u] / rate;
        slice = Math.max(slice, EPS);
        active[server] = { user: u, start: currentTime, end: currentTime + slice, slice: slice };
        activeUser[u] = true;
        rateState[u] = rate;
        segs.push({ lane: server, start: currentTime, end: currentTime + slice, id: users[u].id, type: users[u].service_type });
      }

      if (!completion.some(function (v) { return Number.isNaN(v); })) break;

      /* Next event is a service-slice completion. If at least one antenna is
         idle, an earlier arrival can also wake the scheduler; if all antennas
         are busy, arrivals wait until a resource becomes free, as intended. */
      var nextTime = Infinity, hasIdle = active.some(function (slot) { return slot === null; });
      active.forEach(function (slot) { if (slot) nextTime = Math.min(nextTime, slot.end); });
      if (hasIdle) {
        for (u = 0; u < K; u++) {
          if (Number.isNaN(completion[u]) && remaining[u] > EPS && !activeUser[u] && users[u].arrival_ms > currentTime + EPS) {
            nextTime = Math.min(nextTime, users[u].arrival_ms);
          }
        }
      }
      if (!Number.isFinite(nextTime)) throw new Error('No future arrival or service event can complete the remaining users.');

      /* Exponential moving-average throughput update over the elapsed time.
         rateState is non-zero only for users currently occupying a server. */
      var dt = Math.max(nextTime - lastUpdate, 0);
      var a = 1 - Math.exp(-dt / Math.max(cfg.pfAveragingTime_ms, Number.EPSILON));
      for (u = 0; u < K; u++) avgRate[u] = (1 - a) * avgRate[u] + a * rateState[u];
      lastUpdate = nextTime;
      currentTime = nextTime;
    }

    if (completion.some(function (v) { return !Number.isFinite(v); })) throw new Error('Some users were not completed. Check arrivals and scheduler state.');
    var waiting = [], turnaround = [], sumThroughput = 0, sumThroughput2 = 0;
    var minArrival = Infinity, maxCompletion = -Infinity, busyWork = 0;
    for (u = 0; u < K; u++) {
      var turn = completion[u] - users[u].arrival_ms;
      var wait = Math.max(0, turn - users[u].work_ms / users[u].rateFactor);
      var throughput = users[u].work_ms / Math.max(turn, Number.EPSILON);
      waiting.push(wait); turnaround.push(turn);
      sumThroughput += throughput; sumThroughput2 += throughput * throughput;
      minArrival = Math.min(minArrival, users[u].arrival_ms);
      maxCompletion = Math.max(maxCompletion, completion[u]);
      busyWork += users[u].work_ms / users[u].rateFactor;
    }
    var fairness = sumThroughput2 > 0 ? (sumThroughput * sumThroughput) / (K * sumThroughput2) : 1;
    var makespan = maxCompletion - minArrival;
    var utilization = busyWork / (M * Math.max(makespan, Number.EPSILON));
    return {
      waiting: waiting, turnaround: turnaround, completion: completion, firstStart: firstStart,
      meanWaiting_ms: waiting.reduce(function (a, b) { return a + b; }, 0) / K,
      meanTurnaround_ms: turnaround.reduce(function (a, b) { return a + b; }, 0) / K,
      jainFairness: fairness, resourceUtilization: Math.min(Math.max(utilization, 0), 1),
      makespan: makespan, segs: segs
    };
  }

  function stats(values) {
    var n = values.length;
    var mean = values.reduce(function (a, b) { return a + b; }, 0) / n;
    var variance = values.reduce(function (a, b) { return a + Math.pow(b - mean, 2); }, 0) / Math.max(1, n - 1);
    return { mean: mean, std: Math.sqrt(variance), ci95: 1.96 * Math.sqrt(variance) / Math.sqrt(n) };
  }

  function compare(opts) {
    var cfg = mergeConfig(opts), metricNames = ['waiting', 'turnaround', 'fairness', 'utilization'];
    var rows = {};
    ALGOS.forEach(function (a) { rows[a.key] = { waiting: [], turnaround: [], fairness: [], utilization: [] }; });
    var sample = null;
    for (var run = 1; run <= cfg.numRuns; run++) {
      /* run_experiment creates a distinct stream from seed + run, and the
         generated scenario/channel is shared by all five algorithms. */
      var rng = makeRng((cfg.seed + run) >>> 0);
      var scenario = generateScenario(cfg, rng), results = {};
      ALGOS.forEach(function (a) {
        var r = schedulerSimulate(scenario.users, cfg, a.label === 'Location + Service Priority' ? 'Priority' :
          a.label === 'Multilevel Queue' ? 'Multilevel Queue' : a.label === 'Round Robin' ? 'Round Robin' :
          a.label === 'Proportional Fair' ? 'Proportional Fair' : 'Max C/I');
        results[a.key] = r;
        rows[a.key].waiting.push(r.meanWaiting_ms);
        rows[a.key].turnaround.push(r.meanTurnaround_ms);
        rows[a.key].fairness.push(r.jainFairness);
        rows[a.key].utilization.push(r.resourceUtilization);
      });
      if (!sample) sample = { users: scenario.users, results: results };
    }
    var averaged = {};
    ALGOS.forEach(function (a) {
      var r = rows[a.key], w = stats(r.waiting), t = stats(r.turnaround), f = stats(r.fairness), u = stats(r.utilization);
      averaged[a.key] = {
        awt: w.mean, awtCI: w.ci95, att: t.mean, attCI: t.ci95,
        jain: f.mean, jainCI: f.ci95, util: u.mean, utilCI: u.ci95,
        makespan: sample.results[a.key].makespan,
        done: sample.results[a.key].completion, segs: sample.results[a.key].segs
      };
    });
    return { users: sample.users, results: averaged, sample: sample, runs: cfg.numRuns, config: cfg };
  }

  /* ---------- IPv4 subnet calculator ---------- */
  function parseIPv4(s) {
    var m = /^\s*(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\s*$/.exec(s || '');
    if (!m) return null;
    var n = 0;
    for (var i = 1; i <= 4; i++) { var o = +m[i]; if (o > 255) return null; n = n * 256 + o; }
    return n >>> 0;
  }
  function intToIp(n) { return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.'); }
  function bin32(n) { var s = (n >>> 0).toString(2); while (s.length < 32) s = '0' + s; return s; }
  function maskOf(c) { return c === 0 ? 0 : ((0xFFFFFFFF << (32 - c)) >>> 0); }
  function addrKind(ip) {
    var a = ip >>> 24, b = (ip >>> 16) & 255;
    if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return 'Private (RFC 1918)';
    if (a === 127) return 'Loopback'; if (a === 169 && b === 254) return 'Link-local';
    if (a === 100 && b >= 64 && b <= 127) return 'Shared / CGNAT (RFC 6598)';
    if (a >= 224 && a <= 239) return 'Multicast'; if (a >= 240) return 'Reserved'; if (a === 0) return 'This network';
    return 'Public';
  }
  function subnetInfo(ipStr, cidr) {
    var ip = parseIPv4(ipStr);
    if (cidr === '' || cidr == null) return { error: 'Enter a prefix length between 0 and 32' };
    cidr = +cidr;
    if (ip === null) return { error: 'Enter a valid IPv4 address, e.g. 192.168.10.37' };
    if (!(cidr >= 0 && cidr <= 32) || cidr % 1 !== 0) return { error: 'Prefix length must be between 0 and 32' };
    var mask = maskOf(cidr), net = (ip & mask) >>> 0, bc = (net | (~mask >>> 0)) >>> 0;
    var total = Math.pow(2, 32 - cidr), usable, first, last;
    if (cidr === 32) { usable = 1; first = last = net; }
    else if (cidr === 31) { usable = 2; first = net; last = bc; }
    else { usable = total - 2; first = net + 1; last = bc - 1; }
    return { ip: intToIp(ip), cidr: cidr, mask: intToIp(mask), wildcard: intToIp((~mask) >>> 0),
      network: intToIp(net), broadcast: intToIp(bc), first: intToIp(first), last: intToIp(last),
      total: total, usable: usable, kind: addrKind(ip), ipBin: bin32(ip), maskBin: bin32(mask) };
  }
  function splitSubnet(ipStr, cidr, newCidr, limit) {
    var ip = parseIPv4(ipStr); cidr = +cidr; newCidr = +newCidr; limit = limit || 64;
    if (ip === null || !(newCidr > cidr) || newCidr > 32 || cidr < 0 || cidr > 32) return [];
    var count = Math.pow(2, newCidr - cidr), size = Math.pow(2, 32 - newCidr), base = (ip & maskOf(cidr)) >>> 0, rows = [];
    for (var i = 0; i < Math.min(count, limit); i++) rows.push(subnetInfo(intToIp((base + i * size) >>> 0), newCidr));
    rows.totalCount = count; return rows;
  }

  var api = {
    DEFAULT_CONFIG: DEFAULT_CONFIG, ALGOS: ALGOS, CELL_RADIUS: 500, SERVICE_NAMES: SERVICE_NAMES,
    makeRng: makeRng, generateScenario: generateScenario, compare: compare,
    subnetInfo: subnetInfo, splitSubnet: splitSubnet, parseIPv4: parseIPv4
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Lab = api;
})(typeof window !== 'undefined' ? window : this);
