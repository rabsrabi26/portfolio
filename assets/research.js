
(() => {
  'use strict';

  const DATA_URL =
    'https://raw.githubusercontent.com/rabsrabi26/MIMO-Scheduling-Simulation/final-thesis-200run/Final_Thesis_Package/Complete_Thesis_Package_20261116_231600/Statistical_Results/combined_200run_summary.csv';

  const status = document.getElementById('researchStatus');
  const summary = document.getElementById('researchSummary');
  const tableBody = document.querySelector('#researchTable tbody');
  const updated = document.getElementById('researchUpdated');
  const refreshButton = document.getElementById('refreshResearch');

  if (!status || !summary || !tableBody || !refreshButton) return;

  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    const headers = lines.shift().split(',').map(x => x.trim());

    return lines.map(line => {
      const values = [];
      let value = '';
      let quoted = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
          if (quoted && line[i + 1] === '"') {
            value += '"';
            i++;
          } else {
            quoted = !quoted;
          }
        } else if (char === ',' && !quoted) {
          values.push(value);
          value = '';
        } else {
          value += char;
        }
      }

      values.push(value);

      return Object.fromEntries(
        headers.map((header, index) => [header, values[index]?.trim() ?? ''])
      );
    });
  }

  function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function format(value, digits = 3) {
    const n = number(value);
    return n === null ? '—' : n.toFixed(digits);
  }

    function formatPercent(value) {
    const n = number(value);
    return n === null ? '—' : `${(n * 100).toFixed(2)}%`;
  }

  function showError(message) {
    status.textContent = 'Data unavailable';
    summary.textContent = message;

    tableBody.replaceChildren();
    const row = tableBody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 5;
    cell.textContent = message;
  }

  async function loadResearch() {
    refreshButton.disabled = true;
    status.textContent = 'Connecting to GitHub…';

    try {
      const response = await fetch(`${DATA_URL}?t=${Date.now()}`, {
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`GitHub returned HTTP ${response.status}.`);
      }

      const csv = await response.text();
      const rows = parseCSV(csv);

      if (!rows.length || !rows[0].Scenario) {
        throw new Error('The CSV file appears to be empty or invalid.');
      }

      // The finalized thesis dataset: 40 users, 200 runs per algorithm/metric.
      const selected = rows.filter(row =>
        row.Scenario === '40 Users' && Number(row.Runs) === 200
      );

      if (!selected.length) {
        throw new Error('The 40-user, 200-run results were not found.');
      }

      const algorithms = [
        'Priority',
        'Multilevel Queue',
        'Round Robin',
        'Proportional Fair',
        'Max C/I'
      ];

      const findResult = (algorithm, metric) =>
        selected.find(row =>
          row.Algorithm === algorithm && row.Metric === metric
        );

      const priority = {
        waiting: findResult('Priority', 'waiting'),
        turnaround: findResult('Priority', 'turnaround'),
        fairness: findResult('Priority', 'fairness'),
        utilization: findResult('Priority', 'utilization')
      };

      if (Object.values(priority).some(item => !item)) {
        throw new Error('Some required Priority results are missing.');
      }

      summary.innerHTML = `
        <article class="research-card">
          <span>Priority · Mean waiting</span>
          <strong>${format(priority.waiting.Mean, 4)} ms</strong>
          <small>95% CI: ${format(priority.waiting.CI95_Lower, 4)}–${format(priority.waiting.CI95_Upper, 4)}</small>
        </article>
        <article class="research-card">
          <span>Priority · Turnaround</span>
          <strong>${format(priority.turnaround.Mean, 3)} ms</strong>
          <small>95% CI: ${format(priority.turnaround.CI95_Lower, 3)}–${format(priority.turnaround.CI95_Upper, 3)}</small>
        </article>
        <article class="research-card">
          <span>Completion fairness</span>
          <strong>${format(priority.fairness.Mean, 4)}</strong>
          <small>Jain fairness index</small>
        </article>
        <article class="research-card">
          <span>Resource utilization</span>
          <strong>${formatPercent(priority.utilization.Mean)}</strong>
          <small>Priority scheduler</small>
        </article>
      `;

      tableBody.innerHTML = algorithms.map(algorithm => {
        const waiting = findResult(algorithm, 'waiting');
        const turnaround = findResult(algorithm, 'turnaround');
        const fairness = findResult(algorithm, 'fairness');
        const utilization = findResult(algorithm, 'utilization');

        if (!waiting || !turnaround || !fairness || !utilization) {
          return `<tr><td>${algorithm}</td><td colspan="4">Incomplete data</td></tr>`;
        }

        return `
          <tr>
            <td>${algorithm}</td>
            <td>${format(waiting.Mean, 4)}</td>
            <td>${format(turnaround.Mean, 3)}</td>
            <td>${format(fairness.Mean, 4)}</td>
            <td>${formatPercent(utilization.Mean)}</td>
          </tr>
        `;
      }).join('');

      status.textContent = 'Live · GitHub connected';
      updated.textContent =
        `Source: MIMO-Scheduling-Simulation · final-thesis-200run · 40 users · 200 runs per metric · Updated ${new Date().toLocaleString()}`;

    } catch (error) {
      console.error('Research data loading failed:', error);
      showError(error.message || 'Could not load research data.');
    } finally {
      refreshButton.disabled = false;
    }
  }

  refreshButton.addEventListener('click', loadResearch);
  loadResearch();
})();
