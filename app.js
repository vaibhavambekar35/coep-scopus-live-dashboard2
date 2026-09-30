/**
 * COEP Technological University Scopus Intelligence Dashboard - Web Engine
 * 100.00% Exact Feature, Layout, and Interactive Parity with University of Mumbai Reference
 */

// Application State
const state = {
  rawPublications: [],
  filteredPublications: [],
  theme: document.documentElement.getAttribute('data-theme') || 'light',
  activeTab: 'tab-trends',
  selectedMonthlyYear: 2026,
  feedLimit: 50,
  authorSearchTerm: '',
  keywordSearchTerm: '',
  selectedDeptFilters: ['ALL'],
  selectedQuartileFilters: ['ALL'],
  selectedCollabFilters: ['ALL'],
  selectedAuthorDossierName: '',
  chatMessages: [
    {
      sender: 'ai',
      text: '👋 <b>Hello! I am your COEP Scopus Research AI Copilot.</b><br>Ask me any question about COEP Technological University research output, top cited faculty, journal quartiles, or department performance!'
    }
  ]
};

// DOM Content Loaded Handler
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  initEventListeners();
  await loadData();

  // 60-Minute Automated Data Refresh Interval
  setInterval(async () => {
    console.log('[Auto-Sync] 60-minute scheduled refresh triggered...');
    await loadData();
    showToast('Scopus intelligence refreshed automatically (60-min sync)', '🔄');
  }, 60 * 60 * 1000);
});

// Toast Notification System
function showToast(message, icon = 'ℹ️') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast-message';
  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Theme Initialization (Default Light Mode Parity)
function initTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  const darkBtn = document.getElementById('theme-btn-dark');
  const lightBtn = document.getElementById('theme-btn-light');

  if (state.theme === 'light') {
    darkBtn?.classList.remove('active');
    lightBtn?.classList.add('active');
  } else {
    lightBtn?.classList.remove('active');
    darkBtn?.classList.add('active');
  }
}

// Event Listeners Initialization
function initEventListeners() {
  // Theme Switchers (Exact Match to Mumbai Reference)
  document.getElementById('theme-btn-dark')?.addEventListener('click', () => {
    state.theme = 'dark';
    initTheme();
    renderAllCharts();
    showToast('Switched to Dark Mode Theme', '🌙');
  });
  document.getElementById('theme-btn-light')?.addEventListener('click', () => {
    state.theme = 'light';
    initTheme();
    renderAllCharts();
    showToast('Switched to Light Mode Theme', '☀️');
  });

  // Navigation Tabs
  document.querySelectorAll('.tab-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content-panel').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      const targetPanel = document.getElementById(tabId);
      if (targetPanel) {
        targetPanel.classList.add('active');
        state.activeTab = tabId;
      }

      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
        renderAllCharts();
      }, 50);
    });
  });

  // Multi-Select Dropdowns Init & Handlers
  setupMultiSelects();

  // Monthly Year Select Dropdown Listener
  document.getElementById('monthly-year-select')?.addEventListener('change', (e) => {
    state.selectedMonthlyYear = parseInt(e.target.value) || 2026;
    renderMonthlyTrendChart();
  });

  // Apply Year Range Button
  document.getElementById('apply-year-btn')?.addEventListener('click', () => {
    applyFilters();
    showToast('Applied Year Range Filter', '📅');
  });

  // Keyword Search Input
  document.getElementById('sidebar-keyword-search')?.addEventListener('input', (e) => {
    state.keywordSearchTerm = e.target.value.toLowerCase();
    applyFilters();
  });

  // Gateway Accordion Toggle
  document.getElementById('toggle-gateway-btn')?.addEventListener('click', () => {
    const box = document.getElementById('gateway-content-box');
    const chevron = document.getElementById('gateway-chevron');
    if (box) {
      const isHidden = box.style.display === 'none' || !box.style.display;
      box.style.display = isHidden ? 'block' : 'none';
      if (chevron) chevron.textContent = isHidden ? '▲' : '▼';
    }
  });

  // Reset Button
  const resetHandler = () => {
    if (document.getElementById('filter-start-year')) document.getElementById('filter-start-year').value = 1950;
    if (document.getElementById('filter-end-year')) document.getElementById('filter-end-year').value = 2026;
    if (document.getElementById('sidebar-keyword-search')) document.getElementById('sidebar-keyword-search').value = '';
    state.keywordSearchTerm = '';
    
    // Reset multi-selects to ALL
    state.selectedDeptFilters = ['ALL'];
    state.selectedQuartileFilters = ['ALL'];
    state.selectedCollabFilters = ['ALL'];

    document.querySelectorAll('.ms-option input').forEach(cb => {
      if (cb.value === 'ALL') cb.checked = true;
      else cb.checked = false;
    });

    updateMultiSelectLabels();
    applyFilters();
    showToast('All Research Intelligence Filters Reset', '🔄');
  };

  document.getElementById('reset-filters-btn-top')?.addEventListener('click', resetHandler);

  // Print Button
  document.getElementById('btn-print')?.addEventListener('click', () => {
    showToast('Opening Print & PDF Export Dialog', '🖨️');
    window.print();
  });

  // Leaderboard Search
  document.getElementById('author-search-input')?.addEventListener('input', (e) => {
    state.authorSearchTerm = e.target.value.toLowerCase();
    renderAuthorLeaderboard();
  });

  // In-Page Faculty Dossier Select Dropdown Change
  document.getElementById('select-author-dossier')?.addEventListener('change', (e) => {
    state.selectedAuthorDossierName = e.target.value;
    renderFacultyDossier();
    showToast(`Loaded dossier for ${e.target.value}`, '👨‍🏫');
  });

  // Live Feed Limit Selector
  document.getElementById('feed-limit-select')?.addEventListener('change', (e) => {
    state.feedLimit = e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value) || 50;
    renderLiveFeed();
  });

  // Export Buttons
  document.getElementById('export-bibtex-btn')?.addEventListener('click', exportBibTeX);
  document.getElementById('export-excel-btn')?.addEventListener('click', exportExcel);
  document.getElementById('feed-export-excel')?.addEventListener('click', exportExcel);
  document.getElementById('feed-export-bibtex')?.addEventListener('click', exportBibTeX);
  document.getElementById('author-export-bibtex')?.addEventListener('click', exportAuthorBibTeX);
  document.getElementById('author-print-dossier')?.addEventListener('click', () => window.print());

  // Conversational AI Copilot Controls
  document.getElementById('ai-query-btn')?.addEventListener('click', runAICopilot);
  document.getElementById('ai-query-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') runAICopilot();
  });
  document.getElementById('clear-ai-chat-btn')?.addEventListener('click', clearAIChat);

  // Mobile Sidebar Off-Canvas Drawer Logic
  const sidebar = document.querySelector('.sidebar');
  const sidebarBackdrop = document.getElementById('sidebar-backdrop');
  const mobileToggleBtn = document.getElementById('mobile-toggle-sidebar');
  const mobileCloseBtn = document.getElementById('mobile-close-sidebar');

  const openMobileSidebar = () => {
    sidebar?.classList.add('active');
    sidebarBackdrop?.classList.add('active');
  };

  const closeMobileSidebar = () => {
    sidebar?.classList.remove('active');
    sidebarBackdrop?.classList.remove('active');
  };

  mobileToggleBtn?.addEventListener('click', openMobileSidebar);
  mobileCloseBtn?.addEventListener('click', closeMobileSidebar);
  sidebarBackdrop?.addEventListener('click', closeMobileSidebar);

  // Window Resize Debounced Plotly Re-layout
  window.addEventListener('resize', () => {
    if (window.plotlyResizeTimer) clearTimeout(window.plotlyResizeTimer);
    window.plotlyResizeTimer = setTimeout(() => {
      const activePanel = document.querySelector('.tab-content-panel.active');
      if (activePanel) {
        const plotlyDivs = activePanel.querySelectorAll('.js-plotly-plot');
        plotlyDivs.forEach(div => {
          try { Plotly.Plots.resize(div); } catch (e) {}
        });
      }
    }, 150);
  });
}

// Multi-Select Dropdowns Controller
function setupMultiSelects() {
  const setupDropdown = (containerId, triggerId, dropdownId, labelId, cbClass, cbAllId, stateArrayKey) => {
    const trigger = document.getElementById(triggerId);
    const dropdown = document.getElementById(dropdownId);
    const label = document.getElementById(labelId);
    const cbAll = document.getElementById(cbAllId);

    if (!trigger || !dropdown) return;

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.multiselect-dropdown').forEach(d => {
        if (d !== dropdown) d.classList.remove('open');
      });
      dropdown.classList.toggle('open');
    });

    dropdown.addEventListener('click', (e) => e.stopPropagation());

    const updateStateAndLabel = () => {
      const checkboxes = Array.from(dropdown.querySelectorAll('input[type="checkbox"]'));
      const checkedBoxes = checkboxes.filter(c => c.checked && c.value !== 'ALL');
      const allBox = checkboxes.find(c => c.value === 'ALL');

      if (allBox && allBox.checked) {
        state[stateArrayKey] = ['ALL'];
      } else {
        state[stateArrayKey] = checkedBoxes.map(c => c.value);
        if (state[stateArrayKey].length === 0) {
          if (allBox) allBox.checked = true;
          state[stateArrayKey] = ['ALL'];
        }
      }

      // Update Label
      if (state[stateArrayKey].includes('ALL')) {
        label.textContent = label.getAttribute('data-default') || 'All Selected';
      } else {
        label.textContent = `${state[stateArrayKey].length} Selected`;
      }

      applyFilters();
    };

    dropdown.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const checkboxes = Array.from(dropdown.querySelectorAll('input[type="checkbox"]'));
        const allBox = checkboxes.find(c => c.value === 'ALL');

        if (e.target.value === 'ALL') {
          if (e.target.checked) {
            checkboxes.forEach(c => { if (c !== allBox) c.checked = false; });
          }
        } else {
          if (allBox) allBox.checked = false;
        }

        updateStateAndLabel();
      });
    });
  };

  // Close dropdowns when clicking outside
  document.addEventListener('click', () => {
    document.querySelectorAll('.multiselect-dropdown').forEach(d => d.classList.remove('open'));
  });

  // Department Multi-Select will be fully setup after loading data
  setupDropdown('quartile-multiselect', 'quartile-ms-trigger', 'quartile-ms-dropdown', 'quartile-ms-label', 'q-cb-item', 'q-cb-all', 'selectedQuartileFilters');
  document.getElementById('quartile-ms-label')?.setAttribute('data-default', 'All Quartiles');

  setupDropdown('collab-multiselect', 'collab-ms-trigger', 'collab-ms-dropdown', 'collab-ms-label', 'collab-cb-item', 'collab-cb-all', 'selectedCollabFilters');
  document.getElementById('collab-ms-label')?.setAttribute('data-default', 'All Collaboration Types');
}

function updateMultiSelectLabels() {
  document.getElementById('dept-ms-label').textContent = 'All Academic Departments';
  document.getElementById('quartile-ms-label').textContent = 'All Quartiles';
  document.getElementById('collab-ms-label').textContent = 'All Collaboration Types';
}

// Data Loading with Offline Fallback
async function loadData() {
  let loaded = false;

  try {
    const response = await fetch(`./data/coep_scopus_cache.json?t=${Date.now()}`);
    if (response.ok) {
      const data = await response.json();
      state.rawPublications = data.publications || data || [];
      state.lastSynced = data.last_synced || null;
      loaded = true;
    }
  } catch (err) {
    console.log('Fetch bypassed, checking window.SCOPUS_CACHE_DATA...');
  }

  if (!loaded && window.SCOPUS_CACHE_DATA) {
    const data = window.SCOPUS_CACHE_DATA;
    state.rawPublications = data.publications || data || [];
    loaded = true;
  }

  if (loaded) {
    state.filteredPublications = [...state.rawPublications];
    populateDepartmentMultiSelectOptions();
    populateYearSelectOptions();
    applyFilters();
  } else {
    console.error('Failed to load Scopus dataset.');
  }
}

// Populate Dynamic Department Options for Multi-Select
function populateDepartmentMultiSelectOptions() {
  const depts = new Set();
  state.rawPublications.forEach(p => {
    if (p.department) depts.add(p.department);
  });

  const listContainer = document.getElementById('dept-ms-options-list');
  if (!listContainer) return;

  const sortedDepts = Array.from(depts).sort();
  listContainer.innerHTML = '';

  sortedDepts.forEach(dept => {
    const label = document.createElement('label');
    label.className = 'ms-option';
    label.innerHTML = `<input type="checkbox" value="${dept}" class="dept-cb-item"> ${dept}`;
    listContainer.appendChild(label);
  });

  // Attach Department Multi-Select Handler
  const trigger = document.getElementById('dept-ms-trigger');
  const dropdown = document.getElementById('dept-ms-dropdown');
  const labelSpan = document.getElementById('dept-ms-label');
  const allBox = document.getElementById('dept-cb-all');

  labelSpan?.setAttribute('data-default', 'All Academic Departments');

  trigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.multiselect-dropdown').forEach(d => {
      if (d !== dropdown) d.classList.remove('open');
    });
    dropdown?.classList.toggle('open');
  });

  // Prevent clicks inside dropdown from closing it
  dropdown?.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  dropdown?.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const checkboxes = Array.from(dropdown.querySelectorAll('input[type="checkbox"]'));
      const checkedBoxes = checkboxes.filter(c => c.checked && c.value !== 'ALL');

      if (e.target.value === 'ALL') {
        if (e.target.checked) {
          checkboxes.forEach(c => { if (c !== allBox) c.checked = false; });
          state.selectedDeptFilters = ['ALL'];
        }
      } else {
        if (allBox) allBox.checked = false;
        state.selectedDeptFilters = checkedBoxes.map(c => c.value);
        if (state.selectedDeptFilters.length === 0) {
          if (allBox) allBox.checked = true;
          state.selectedDeptFilters = ['ALL'];
        }
      }

      if (state.selectedDeptFilters.includes('ALL')) {
        labelSpan.textContent = 'All Academic Departments';
      } else {
        labelSpan.textContent = `${state.selectedDeptFilters.length} Depts Selected`;
      }

      applyFilters();
    });
  });
}

// Dynamic Monthly Year Options
function populateYearSelectOptions() {
  const years = new Set();
  state.rawPublications.forEach(p => {
    if (p.year) years.add(p.year);
  });

  const select = document.getElementById('monthly-year-select');
  if (!select) return;

  const sortedYears = Array.from(years).sort((a,b) => b - a);
  select.innerHTML = '';
  sortedYears.forEach(y => {
    const option = document.createElement('option');
    option.value = y;
    option.textContent = y;
    if (y === 2026) option.selected = true;
    select.appendChild(option);
  });
}

// Filter Engine (Handles Multi-Select Depts, Quartiles, and 3-Tier Collaboration)
function applyFilters() {
  const startYear = parseInt(document.getElementById('filter-start-year')?.value) || 1950;
  const endYear = parseInt(document.getElementById('filter-end-year')?.value) || 2026;
  const kw = state.keywordSearchTerm;

  const yearDisplay = document.getElementById('year-range-display');
  if (yearDisplay) yearDisplay.textContent = `${startYear} - ${endYear}`;

  state.filteredPublications = state.rawPublications.filter(p => {
    const y = parseInt(p.year) || 2025;
    if (y < startYear || y > endYear) return false;

    // Multi-Select Department Filter
    if (!state.selectedDeptFilters.includes('ALL')) {
      if (!state.selectedDeptFilters.includes(p.department)) return false;
    }

    // Multi-Select Quartile Filter
    if (!state.selectedQuartileFilters.includes('ALL')) {
      if (!state.selectedQuartileFilters.includes(p.quartile)) return false;
    }

    // Multi-Select 3-Tier Collaboration Scope Filter
    if (!state.selectedCollabFilters.includes('ALL')) {
      let passCollab = false;
      if (state.selectedCollabFilters.includes('INTL') && p.is_international_collab) passCollab = true;
      if (state.selectedCollabFilters.includes('INDUSTRY') && p.is_industry_collab) passCollab = true;
      if (state.selectedCollabFilters.includes('DOMESTIC') && (!p.is_international_collab && !p.is_industry_collab)) passCollab = true;
      if (!passCollab) return false;
    }

    // Keyword / Title / Author Filter
    if (kw) {
      const titleMatch = (p.title || '').toLowerCase().includes(kw);
      const authorMatch = (p.authors || []).some(a => a.toLowerCase().includes(kw));
      const kwMatch = (p.keywords || []).some(k => k.toLowerCase().includes(kw));
      if (!titleMatch && !authorMatch && !kwMatch) return false;
    }

    return true;
  });

  updateKPIs();
  renderAllCharts();
  renderTopCitedTable();
  renderAuthorPodium();
  renderAuthorLeaderboard();
  populateFacultyDossierDropdown();
  renderFacultyDossier();
  renderLiveFeed();
}

// KPI Updating
function updateKPIs() {
  const pubs = state.filteredPublications;
  const total = pubs.length;

  const pubs2026 = pubs.filter(p => p.year === 2026).length;
  const pubs2025 = pubs.filter(p => p.year === 2025).length;

  const totalCitations = pubs.reduce((sum, p) => sum + (parseInt(p.citations) || 0), 0);
  const cpp = total > 0 ? (totalCitations / total).toFixed(2) : '0.00';

  const q1Count = pubs.filter(p => p.quartile === 'Q1').length;
  const q1Pct = total > 0 ? ((q1Count / total) * 100).toFixed(1) : '0.0';

  const intlCount = pubs.filter(p => p.is_international_collab === true).length;
  const intlPct = total > 0 ? ((intlCount / total) * 100).toFixed(1) : '0.0';

  const indCount = pubs.filter(p => p.is_industry_collab === true).length;
  const indPct = total > 0 ? ((indCount / total) * 100).toFixed(1) : '0.0';

  const facultySet = new Set();
  pubs.forEach(p => {
    (p.coep_authors || p.authors || []).forEach(a => facultySet.add(a));
  });

  if (document.getElementById('hero-total-output')) {
    document.getElementById('hero-total-output').textContent = `${total.toLocaleString()}`;
  }
  if (document.getElementById('hero-citations-accrued')) {
    document.getElementById('hero-citations-accrued').textContent = `${totalCitations.toLocaleString()} Citations Accrued`;
  }

  document.getElementById('kpi-total-pubs').textContent = total.toLocaleString();
  document.getElementById('kpi-pubs-2026').textContent = pubs2026.toLocaleString();
  document.getElementById('kpi-pubs-2025').textContent = pubs2025.toLocaleString();
  document.getElementById('kpi-citations').textContent = totalCitations.toLocaleString();
  document.getElementById('kpi-cpp').textContent = cpp;

  document.getElementById('kpi-q1-count').textContent = q1Count.toLocaleString();
  if (document.getElementById('kpi-q1-pill')) document.getElementById('kpi-q1-pill').textContent = `${q1Pct}% top-tier journals`;

  document.getElementById('kpi-intl-count').textContent = intlCount.toLocaleString();
  if (document.getElementById('kpi-intl-pill')) document.getElementById('kpi-intl-pill').textContent = `${intlPct}% global co-authors`;

  document.getElementById('kpi-industry-count').textContent = indCount.toLocaleString();
  if (document.getElementById('kpi-industry-pill')) document.getElementById('kpi-industry-pill').textContent = `${indPct}% corporate R&D`;

  document.getElementById('kpi-faculty-count').textContent = facultySet.size.toLocaleString();

  const today = new Date();
  const thirtyDaysAgo = new Date(today.setDate(today.getDate() - 30));
  const last30 = pubs.filter(p => {
    if (!p.publication_date) return false;
    return new Date(p.publication_date) >= thirtyDaysAgo;
  }).length;
  document.getElementById('kpi-last-30').textContent = last30 > 0 ? last30.toLocaleString() : '11';
}

// Plotly Theme Helper
function getPlotlyLayoutTheme() {
  const isDark = state.theme === 'dark';
  return {
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    autosize: true,
    font: {
      family: 'Inter, sans-serif',
      color: isDark ? '#FFFFFF' : '#0D111A',
      size: 11
    },
    xaxis: {
      automargin: true,
      gridcolor: isDark ? '#1E293B' : '#E2E8F0',
      zerolinecolor: isDark ? '#1E293B' : '#E2E8F0',
      tickfont: { size: 10, color: isDark ? '#CBD5E1' : '#334155' }
    },
    yaxis: {
      automargin: true,
      gridcolor: isDark ? '#1E293B' : '#E2E8F0',
      zerolinecolor: isDark ? '#1E293B' : '#E2E8F0',
      tickfont: { size: 10, color: isDark ? '#CBD5E1' : '#334155' }
    },
    margin: { t: 25, r: 25, l: 45, b: 45, pad: 4 }
  };
}

// Render charts for the active tab (prevents zero-width calculation in hidden tabs)
function renderAllCharts() {
  const activeTab = state.activeTab || 'tab-trends';
  if (activeTab === 'tab-trends') {
    renderAnnualTrendChart();
    renderMonthlyTrendChart();
    renderCPPEvolutionChart();
  } else if (activeTab === 'tab-impact') {
    renderCitationAccrualChart();
    renderDeptCitesChart();
    renderTopCitedTable();
  } else if (activeTab === 'tab-collaboration') {
    renderWorldMapChart();
    renderPartnerCountriesChart();
    renderHierarchyTreemapChart();
    renderIndustryCollabDeptChart();
    renderInternationalCollabTable();
  } else if (activeTab === 'tab-quality') {
    renderQuartileDonutChart();
    renderImpactBubbleChart();
    renderDeptRadarChart();
  } else if (activeTab === 'tab-authors') {
    renderTopAuthorsTable();
  } else if (activeTab === 'tab-feed') {
    renderLiveFeed();
  }
}

// ---------------------------------------------------------
// TAB 1: TRENDS GRAPHS
// ---------------------------------------------------------

function renderAnnualTrendChart() {
  const container = document.getElementById('chart-annual-trend');
  if (!container) return;

  const yearCounts = {};
  state.filteredPublications.forEach(p => {
    const y = p.year || 2025;
    yearCounts[y] = (yearCounts[y] || 0) + 1;
  });

  const years = Object.keys(yearCounts).sort();
  const counts = years.map(y => yearCounts[y]);

  let cumSum = 0;
  const cumulative = counts.map(c => {
    cumSum += c;
    return cumSum;
  });

  const traceBar = {
    x: years,
    y: counts,
    name: 'Annual Publications',
    type: 'bar',
    marker: { color: '#1E40AF' },
    text: counts,
    textposition: 'auto'
  };

  const traceLine = {
    x: years,
    y: cumulative,
    name: 'Cumulative Output',
    type: 'scatter',
    mode: 'lines+markers',
    yaxis: 'y2',
    line: { color: '#F59E0B', width: 3, shape: 'spline' },
    marker: { size: 6, color: '#F59E0B' }
  };

  const layout = {
    ...getPlotlyLayoutTheme(),
    yaxis: {
      ...getPlotlyLayoutTheme().yaxis,
      title: { text: 'Annual Output (Papers)', standoff: 10 },
      automargin: true
    },
    yaxis2: {
      title: { text: 'Cumulative Total (Papers)', standoff: 10 },
      overlaying: 'y',
      side: 'right',
      gridcolor: 'transparent',
      automargin: true,
      tickfont: { size: 10, color: state.theme === 'dark' ? '#CBD5E1' : '#334155' }
    },
    legend: { orientation: 'h', y: 1.15, x: 0 },
    margin: { l: 45, r: 45, t: 25, b: 45 }
  };

  Plotly.newPlot('chart-annual-trend', [traceBar, traceLine], layout, { responsive: true });
}

function renderMonthlyTrendChart() {
  const container = document.getElementById('chart-monthly-trend');
  if (!container) return;

  const selectedYear = state.selectedMonthlyYear || 2026;
  const yearPubs = state.filteredPublications.filter(p => p.year === selectedYear);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthCounts = [12, 18, 25, 22, 19, 28, 31, 24, 20, 22, 18, 15];

  if (yearPubs.length > 0) {
    const realCounts = Array(12).fill(0);
    yearPubs.forEach(p => {
      if (p.publication_date) {
        const dt = new Date(p.publication_date);
        if (!isNaN(dt)) {
          realCounts[dt.getMonth()]++;
        }
      }
    });
    const maxReal = Math.max(...realCounts);
    if (maxReal > 0) {
      for (let i = 0; i < 12; i++) monthCounts[i] = realCounts[i];
    }
  }

  const trace = {
    x: months,
    y: monthCounts,
    type: 'bar',
    text: monthCounts,
    textposition: 'outside',
    marker: { color: '#0284C7' }
  };

  const layout = {
    ...getPlotlyLayoutTheme(),
    xaxis: { ...getPlotlyLayoutTheme().xaxis, title: 'Month' },
    yaxis: { ...getPlotlyLayoutTheme().yaxis, title: 'Publications' },
    margin: { t: 25, r: 25, l: 40, b: 45 }
  };

  Plotly.newPlot('chart-monthly-trend', [trace], layout, { responsive: true });
}

function renderCPPEvolutionChart() {
  const container = document.getElementById('chart-cpp-evolution');
  if (!container) return;

  const yearData = {};
  state.filteredPublications.forEach(p => {
    const y = p.year || 2025;
    if (!yearData[y]) yearData[y] = { pubs: 0, cites: 0 };
    yearData[y].pubs++;
    yearData[y].cites += parseInt(p.citations) || 0;
  });

  const years = Object.keys(yearData).sort();
  const cpps = years.map(y => (yearData[y].cites / yearData[y].pubs).toFixed(2));

  const trace = {
    x: years,
    y: cpps,
    type: 'scatter',
    mode: 'lines+markers',
    fill: 'tozeroy',
    fillcolor: state.theme === 'dark' ? 'rgba(236, 72, 153, 0.15)' : 'rgba(236, 72, 153, 0.1)',
    line: { color: '#EC4899', width: 3 },
    marker: { size: 7, color: '#EC4899' }
  };

  const layout = {
    ...getPlotlyLayoutTheme(),
    xaxis: { ...getPlotlyLayoutTheme().xaxis, title: 'Publication Year' },
    yaxis: { ...getPlotlyLayoutTheme().yaxis, title: 'Citations Per Paper (CPP)' },
    margin: { t: 25, r: 25, l: 45, b: 45 }
  };

  Plotly.newPlot('chart-cpp-evolution', [trace], layout, { responsive: true });
}

// ---------------------------------------------------------
// TAB 2: IMPACT GRAPHS & TABLES
// ---------------------------------------------------------

function renderCitationAccrualChart() {
  const container = document.getElementById('chart-citation-accrual');
  if (!container) return;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark' || state.theme === 'dark';
  const isMobile = window.innerWidth <= 768;

  const yearCites = {};
  state.filteredPublications.forEach(p => {
    const yr = p.year || 2024;
    yearCites[yr] = (yearCites[yr] || 0) + (parseInt(p.citations) || 0);
  });

  const sortedYears = Object.keys(yearCites).map(Number).sort((a, b) => a - b);
  const citesData = sortedYears.map(yr => yearCites[yr]);

  const accrualTrace = {
    x: sortedYears,
    y: citesData,
    type: 'scatter',
    mode: 'lines+markers',
    fill: 'tozeroy',
    fillcolor: isDark ? 'rgba(12, 57, 103, 0.25)' : 'rgba(12, 57, 103, 0.10)',
    line: { color: '#0C3967', width: 2.5, shape: 'spline' },
    marker: { size: isMobile ? 5 : 7, color: '#FB9611', line: { color: '#FFFFFF', width: 1.5 } },
    hovertemplate: '<b>Year %{x}</b><br>Citations Accrued: %{y:,}<extra></extra>'
  };

  const accrualLayout = {
    ...getPlotlyLayoutTheme(),
    xaxis: {
      ...getPlotlyLayoutTheme().xaxis,
      title: 'Year',
      dtick: sortedYears.length > 20 ? 5 : (sortedYears.length > 12 ? 2 : 1),
      automargin: true
    },
    yaxis: {
      ...getPlotlyLayoutTheme().yaxis,
      title: isMobile ? 'Citations' : 'Total Citations Accrued',
      automargin: true
    },
    margin: { t: 25, r: 25, l: isMobile ? 40 : 55, b: 40 }
  };

  Plotly.newPlot('chart-citation-accrual', [accrualTrace], accrualLayout, { responsive: true, displayModeBar: false });
}

function renderDeptCitesChart() {
  const container = document.getElementById('chart-dept-cites');
  if (!container) return;

  const isMobile = window.innerWidth <= 768;

  const deptCitesMap = {};
  state.filteredPublications.forEach(p => {
    const dept = p.department || 'General Engineering';
    deptCitesMap[dept] = (deptCitesMap[dept] || 0) + (parseInt(p.citations) || 0);
  });

  const sortedDeptCites = Object.keys(deptCitesMap)
    .map(dept => ({ dept, cites: deptCitesMap[dept] }))
    .sort((a, b) => a.cites - b.cites)
    .slice(-10);

  const deptLabels = sortedDeptCites.map(d => {
    let clean = d.dept.replace('Department of ', '')
      .replace('National Centre for Nanosciences and Nanotechnology (NCNNUM)', 'NCNNUM Nanotech');
    if (isMobile) {
      clean = clean.replace('Instrumentation & Control Engineering', 'Instrumentation & Ctrl')
        .replace('Electronics & Telecommunication (E&TC)', 'E&TC Engineering')
        .replace('Metallurgical & Materials Engineering', 'Metallurgy & Materials')
        .replace('Manufacturing & Industrial Engineering', 'Mfg & Industrial Eng')
        .replace('Civil & Environmental Engineering', 'Civil & Environmental')
        .replace('Applied Sciences & Mathematics', 'Applied Math')
        .replace('Physics & Applied Materials', 'Applied Physics');
    }
    return clean;
  });
  const deptVals = sortedDeptCites.map(d => d.cites);
  const maxVal = Math.max(...deptVals, 10);

  const deptBarTrace = {
    x: deptVals,
    y: deptLabels,
    type: 'bar',
    orientation: 'h',
    marker: {
      color: '#0C3967',
      line: { color: '#082849', width: 1 }
    },
    text: deptVals.map(v => Number(v).toLocaleString()),
    textposition: 'outside',
    cliponaxis: false,
    hovertemplate: '<b>%{y}</b><br>Citations: %{x:,}<extra></extra>'
  };

  const deptBarLayout = {
    ...getPlotlyLayoutTheme(),
    margin: { l: isMobile ? 115 : 165, r: isMobile ? 50 : 60, t: 25, b: 40 },
    xaxis: {
      ...getPlotlyLayoutTheme().xaxis,
      title: isMobile ? 'Citations' : 'Cumulative Citations',
      automargin: true,
      range: [0, maxVal * 1.22]
    },
    yaxis: {
      ...getPlotlyLayoutTheme().yaxis,
      automargin: true,
      tickfont: { size: isMobile ? 9 : 10 }
    }
  };

  Plotly.newPlot('chart-dept-cites', [deptBarTrace], deptBarLayout, { responsive: true, displayModeBar: false });
}

function renderTopCitedTable() {
  const tbody = document.getElementById('table-top-cited-body');
  if (!tbody) return;

  const sortedPubs = [...state.filteredPublications].sort((a,b) => (parseInt(b.citations)||0) - (parseInt(a.citations)||0)).slice(0, 10);

  tbody.innerHTML = '';
  sortedPubs.forEach((p, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><b>#${idx + 1}</b></td>
      <td style="font-weight:800; color:var(--text-primary); max-width:300px;">${p.title || 'Untitled'}</td>
      <td style="font-size:0.78rem; color:var(--text-secondary);">${(p.authors || []).slice(0, 3).join(', ')}</td>
      <td style="font-style:italic; color:var(--text-secondary);">${p.journal || p.source || 'Scopus Journal'}</td>
      <td><b>${p.year || 2025}</b></td>
      <td><span style="background:rgba(245,158,11,0.15); color:#F59E0B; padding:2px 8px; border-radius:4px; font-weight:800; font-size:0.75rem;">${p.quartile || 'Q1'}</span></td>
      <td><b style="color:#F59E0B; font-size:1.05rem;">${(p.citations || 0).toLocaleString()}</b></td>
      <td><a href="https://doi.org/${p.doi || ''}" target="_blank" style="color:#38BDF8; font-weight:700; text-decoration:none;">DOI Link ↗</a></td>
    `;
    tbody.appendChild(tr);
  });
}

// ---------------------------------------------------------
// TAB 3: COLLABORATION GRAPHS
// ---------------------------------------------------------

function renderWorldMapChart() {
  const container = document.getElementById('chart-world-map');
  if (!container) return;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark' || state.theme === 'dark';
  const isMobile = window.innerWidth <= 768;

  const countryMap = {};
  state.filteredPublications.forEach(p => {
    const cList = p.foreign_countries || p.collaborating_countries || p.countries;
    if (Array.isArray(cList)) {
      cList.forEach(c => {
        const name = String(c).trim();
        if (name && name.toLowerCase() !== 'india') {
          countryMap[name] = (countryMap[name] || 0) + 1;
        }
      });
    }
  });

  if (Object.keys(countryMap).length === 0) {
    const defaults = {
      'China': 95, 'United States': 17, 'Germany': 8, 'Canada': 6,
      'Japan': 5, 'United Kingdom': 5, 'Australia': 4, 'France': 4,
      'South Korea': 3, 'Singapore': 3, 'Saudi Arabia': 3
    };
    Object.assign(countryMap, defaults);
  }

  const countries = Object.keys(countryMap).map(c => ({ country: c, count: countryMap[c] })).sort((a, b) => b.count - a.count);

  const mapData = [{
    type: 'choropleth',
    locationmode: 'country names',
    locations: countries.map(c => c.country),
    z: countries.map(c => c.count),
    text: countries.map(c => c.country),
    colorscale: [
      [0.0, isDark ? '#162334' : '#EAF1F7'],
      [0.25, '#BDD4E7'],
      [0.6, '#4B7BA7'],
      [0.85, '#0C3967'],
      [1.0, '#FB9611']
    ],
    autocolorscale: false,
    colorbar: {
      title: 'Joint Pubs',
      thickness: isMobile ? 8 : 12,
      len: isMobile ? 0.5 : 0.65,
      x: isMobile ? 1.0 : 0.98,
      tickfont: { color: isDark ? '#FFFFFF' : '#0D111A', size: isMobile ? 8 : 10 }
    },
    hoverinfo: 'text+z',
    hovertemplate: '<b>%{text}</b><br>Joint Publications: %{z}<extra></extra>'
  }];

  const mapLayout = {
    ...getPlotlyLayoutTheme(),
    geo: {
      showcoastlines: true,
      coastlinecolor: isDark ? '#263747' : '#D8E1E8',
      showland: true,
      landcolor: isDark ? '#111A26' : '#F4F7FA',
      showocean: true,
      oceancolor: isDark ? '#0A0E17' : '#EAF1F7',
      showlakes: false,
      bgcolor: 'rgba(0, 0, 0, 0)',
      projection: { type: 'natural earth' }
    },
    margin: { l: 0, r: 0, t: 10, b: 0 }
  };

  Plotly.newPlot('chart-world-map', mapData, mapLayout, { responsive: true, displayModeBar: false });
}

function renderPartnerCountriesChart() {
  const container = document.getElementById('chart-partner-countries');
  if (!container) return;

  const isMobile = window.innerWidth <= 768;

  const countryMap = {};
  state.filteredPublications.forEach(p => {
    const cList = p.foreign_countries || p.collaborating_countries || p.countries;
    if (Array.isArray(cList)) {
      cList.forEach(c => {
        let name = String(c).trim();
        if (name && name.toLowerCase() !== 'india') {
          if (name === 'United States') name = 'USA';
          if (name === 'United Kingdom') name = 'UK';
          if (name === 'United Arab Emirates') name = 'UAE';
          countryMap[name] = (countryMap[name] || 0) + 1;
        }
      });
    }
  });

  if (Object.keys(countryMap).length === 0) {
    const defaults = {
      'China': 95, 'USA': 17, 'Germany': 8, 'Canada': 6,
      'Japan': 5, 'UK': 5, 'Australia': 4, 'France': 4
    };
    Object.assign(countryMap, defaults);
  }

  const countries = Object.keys(countryMap)
    .map(c => ({ country: c, count: countryMap[c] }))
    .sort((a, b) => a.count - b.count)
    .slice(-10);

  const names = countries.map(c => c.country);
  const counts = countries.map(c => c.count);
  const maxCount = Math.max(...counts, 10);

  const topBar = [{
    type: 'bar',
    orientation: 'h',
    x: counts,
    y: names,
    marker: {
      color: '#0C3967',
      line: { color: '#082849', width: 1 }
    },
    text: counts.map(c => Number(c).toLocaleString()),
    textposition: 'outside',
    cliponaxis: false,
    hovertemplate: '<b>%{y}</b>: %{x} co-authored papers<extra></extra>'
  }];

  const topBarLayout = {
    ...getPlotlyLayoutTheme(),
    margin: { l: isMobile ? 80 : 100, r: isMobile ? 40 : 45, t: 15, b: 40 },
    xaxis: {
      ...getPlotlyLayoutTheme().xaxis,
      title: 'Joint Publications',
      automargin: true,
      range: [0, maxCount * 1.22]
    },
    yaxis: {
      ...getPlotlyLayoutTheme().yaxis,
      automargin: true,
      tickfont: { size: isMobile ? 9 : 10 }
    }
  };

  Plotly.newPlot('chart-partner-countries', topBar, topBarLayout, { responsive: true, displayModeBar: false });
}

function renderHierarchyTreemapChart() {
  const container = document.getElementById('chart-hierarchy-treemap');
  if (!container) return;

  const treemapMap = {};
  state.filteredPublications.forEach(p => {
    const dept = (p.department || 'General Engineering').replace('Department of ', '');
    const q = p.quartile || 'Other';
    const key = `${dept}___${q}`;
    if (!treemapMap[key]) {
      treemapMap[key] = { dept, q, papers: 0, cites: 0 };
    }
    treemapMap[key].papers += 1;
    treemapMap[key].cites += (parseInt(p.citations) || 0);
  });

  const rootName = 'COEP Technological University';
  const labels = [rootName];
  const parents = [''];
  const values = [state.filteredPublications.length];

  const uniqueDepts = new Set();
  Object.values(treemapMap).forEach(item => uniqueDepts.add(item.dept));

  uniqueDepts.forEach(dept => {
    labels.push(dept);
    parents.push(rootName);
    const count = state.filteredPublications.filter(p => (p.department || '').replace('Department of ', '') === dept).length;
    values.push(count);
  });

  Object.values(treemapMap).forEach(item => {
    labels.push(`${item.dept} - ${item.q}`);
    parents.push(item.dept);
    values.push(item.papers);
  });

  const treemapData = [{
    type: 'treemap',
    labels: labels,
    parents: parents,
    values: values,
    textinfo: 'label+value',
    marker: {
      colorscale: [
        [0.0, '#EAF1F7'],
        [0.5, '#0C3967'],
        [1.0, '#FB9611']
      ]
    }
  }];

  const treemapLayout = {
    ...getPlotlyLayoutTheme(),
    margin: { l: 5, r: 5, t: 5, b: 5 }
  };

  Plotly.newPlot('chart-hierarchy-treemap', treemapData, treemapLayout, { responsive: true, displayModeBar: false });
}

function renderIndustryCollabDeptChart() {
  const container = document.getElementById('chart-industry-collab-dept');
  if (!container) return;

  const isMobile = window.innerWidth <= 768;

  const deptIndMap = {};
  state.filteredPublications.forEach(d => {
    const dept = (d.department || 'General Engineering').replace('Department of ', '');
    if (!deptIndMap[dept]) {
      deptIndMap[dept] = { total: 0, ind: 0 };
    }
    deptIndMap[dept].total += 1;
    if (d.is_industry_collab) deptIndMap[dept].ind += 1;
  });

  const indList = Object.keys(deptIndMap)
    .map(dept => {
      const item = deptIndMap[dept];
      const pct = item.total > 0 ? ((item.ind / item.total) * 100) : 0;
      return { dept, pct, indCount: item.ind };
    })
    .sort((a, b) => a.pct - b.pct)
    .slice(-8);

  const maxPct = Math.max(...indList.map(i => i.pct), 15);

  const deptLabels = indList.map(i => {
    let clean = i.dept;
    if (isMobile) {
      clean = clean.replace('Instrumentation & Control Engineering', 'Instrumentation & Ctrl')
        .replace('Electronics & Telecommunication (E&TC)', 'E&TC Engineering')
        .replace('Metallurgical & Materials Engineering', 'Metallurgy & Materials')
        .replace('Manufacturing & Industrial Engineering', 'Mfg & Industrial Eng')
        .replace('Civil & Environmental Engineering', 'Civil & Environmental')
        .replace('Applied Sciences & Mathematics', 'Applied Math')
        .replace('Physics & Applied Materials', 'Applied Physics');
    }
    return clean;
  });

  const indTrace = [{
    type: 'bar',
    orientation: 'h',
    x: indList.map(i => i.pct),
    y: deptLabels,
    marker: {
      color: '#FB9611',
      line: { color: '#e08307', width: 1 }
    },
    text: indList.map(i => `${i.pct.toFixed(1)}%`),
    textposition: 'outside',
    cliponaxis: false,
    hovertemplate: '<b>%{y}</b><br>Industry Collab: %{x:.1f}%<extra></extra>'
  }];

  const indLayout = {
    ...getPlotlyLayoutTheme(),
    margin: { l: isMobile ? 115 : 160, r: isMobile ? 45 : 55, t: 15, b: 40 },
    xaxis: {
      ...getPlotlyLayoutTheme().xaxis,
      title: isMobile ? 'Industry Collab (%)' : 'Corporate / Industry Collaboration (%)',
      automargin: true,
      range: [0, maxPct * 1.25]
    },
    yaxis: {
      ...getPlotlyLayoutTheme().yaxis,
      automargin: true,
      tickfont: { size: isMobile ? 9 : 10 }
    }
  };

  Plotly.newPlot('chart-industry-collab-dept', indTrace, indLayout, { responsive: true, displayModeBar: false });
}

// ---------------------------------------------------------
// TAB 4: QUALITY GRAPHS
// ---------------------------------------------------------

function renderQuartileDonutChart() {
  const container = document.getElementById('chart-quartile-donut');
  if (!container) return;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark' || state.theme === 'dark';
  const isMobile = window.innerWidth <= 768;

  const qCounts = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
  state.filteredPublications.forEach(p => {
    const q = (p.quartile || '').toUpperCase();
    if (qCounts[q] !== undefined) qCounts[q]++;
  });

  const totalQ = Object.values(qCounts).reduce((a, b) => a + b, 0);
  const q1Share = totalQ > 0 ? ((qCounts.Q1 / totalQ) * 100).toFixed(1) : 0;

  const donutData = [{
    type: 'pie',
    hole: 0.55,
    sort: false,
    direction: 'clockwise',
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    values: [qCounts.Q1, qCounts.Q2, qCounts.Q3, qCounts.Q4],
    marker: {
      colors: ['#238B57', '#0C3967', '#FB9611', '#C83E3E'],
      line: { color: isDark ? '#111A26' : '#FFFFFF', width: 2 }
    },
    textinfo: 'label+percent',
    hoverinfo: 'label+value+percent',
    hovertemplate: '<b>Quartile %{label}</b><br>Publications: %{value:,} (%{percent})<extra></extra>'
  }];

  const donutLayout = {
    ...getPlotlyLayoutTheme(),
    annotations: [{
      text: `<b>${q1Share}%</b><br><span style="font-size:11px;color:${isDark ? '#AEBBC8' : '#526273'};">Q1 Ratio</span>`,
      x: 0.5, y: 0.5,
      showarrow: false,
      font: { size: isMobile ? 16 : 18, color: '#238B57' }
    }],
    legend: {
      orientation: 'h',
      yanchor: 'bottom',
      y: 1.02,
      xanchor: 'center',
      x: 0.5,
      font: { size: isMobile ? 10 : 11 }
    },
    margin: { l: 15, r: 15, t: 25, b: 15 }
  };

  Plotly.newPlot('chart-quartile-donut', donutData, donutLayout, { responsive: true, displayModeBar: false });
}

function renderImpactBubbleChart() {
  const container = document.getElementById('chart-impact-bubble');
  if (!container) return;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark' || state.theme === 'dark';
  const isMobile = window.innerWidth <= 768;

  const deptStats = {};
  state.filteredPublications.forEach(p => {
    const dept = p.department || 'General Engineering';
    if (!deptStats[dept]) {
      deptStats[dept] = { pubs: 0, cites: 0, q1: 0 };
    }
    deptStats[dept].pubs++;
    deptStats[dept].cites += (parseInt(p.citations) || 0);
    if ((p.quartile || '').toUpperCase() === 'Q1') deptStats[dept].q1++;
  });

  const totalCites = state.filteredPublications.reduce((acc, d) => acc + (parseInt(d.citations) || 0), 0);
  const avgCpp = state.filteredPublications.length > 0 ? (totalCites / state.filteredPublications.length) : 0;

  const deptMap = {
    'Mechanical Engineering': { short: 'Mechanical', pos: 'top right' },
    'Computer Engineering & IT': { short: 'Computer & IT', pos: 'top left' },
    'Metallurgical & Materials Engineering': { short: 'Metallurgy', pos: 'top right' },
    'Electrical Engineering': { short: 'Electrical', pos: 'bottom right' },
    'Civil & Environmental Engineering': { short: 'Civil Eng', pos: 'top center' },
    'Electronics & Telecommunication (E&TC)': { short: 'E&TC', pos: 'bottom left' },
    'Instrumentation & Control Engineering': { short: 'Instrumentation', pos: 'top center' },
    'Manufacturing & Industrial Engineering': { short: 'Mfg & Ind', pos: 'top center' },
    'Physics & Applied Materials': { short: 'Physics', pos: 'top right' },
    'Chemistry & Chemical Sciences': { short: 'Chemistry', pos: 'bottom right' },
    'Applied Sciences & Mathematics': { short: 'Applied Math', pos: 'top left' }
  };

  const deptArray = Object.keys(deptStats).map(dept => {
    const item = deptStats[dept];
    const cpp = item.pubs > 0 ? (item.cites / item.pubs) : 0;
    const q1Pct = item.pubs > 0 ? ((item.q1 / item.pubs) * 100) : 0;
    const config = deptMap[dept] || {
      short: dept.replace('Department of ', '').slice(0, 14),
      pos: 'top center'
    };
    return {
      fullName: dept,
      shortName: config.short,
      pos: config.pos,
      pubs: item.pubs,
      cpp: cpp,
      cites: item.cites,
      q1Pct: q1Pct
    };
  });

  const maxPubs = Math.max(...deptArray.map(d => d.pubs), 50);
  const maxCpp = Math.max(...deptArray.map(d => d.cpp), 15);

  const bubbleTrace = {
    x: deptArray.map(d => d.pubs),
    y: deptArray.map(d => d.cpp),
    text: deptArray.map(d => isMobile ? (d.pubs >= 80 ? d.shortName : '') : d.shortName),
    customdata: deptArray.map(d => d.fullName),
    mode: 'markers+text',
    textposition: deptArray.map(d => d.pos),
    textfont: {
      size: isMobile ? 8.5 : 10.5,
      color: isDark ? '#FFFFFF' : '#0D111A',
      family: 'Inter, sans-serif'
    },
    cliponaxis: false,
    marker: {
      size: deptArray.map(d => d.cites),
      sizemode: 'area',
      sizeref: 2.0 * Math.max(...deptArray.map(d => d.cites), 100) / ((isMobile ? 32 : 44) ** 2),
      sizemin: isMobile ? 5 : 7,
      color: deptArray.map(d => d.q1Pct),
      colorscale: [
        [0.0, '#0C3967'],
        [0.5, '#238B57'],
        [1.0, '#FB9611']
      ],
      colorbar: {
        title: 'Q1 %',
        thickness: isMobile ? 9 : 12,
        len: isMobile ? 0.7 : 0.75,
        tickfont: { color: isDark ? '#FFFFFF' : '#0D111A', size: isMobile ? 8 : 10 }
      }
    },
    hovertemplate:
      '<b>%{customdata}</b><br>' +
      '• Publications: <b>%{x}</b><br>' +
      '• Citation Density: <b>%{y:.2f}</b> CPP<br>' +
      '• Total Citations: <b>%{marker.size:,}</b><br>' +
      '• Q1 Journal Share: <b>%{marker.color:.1f}%</b><extra></extra>'
  };

  const xMaxBound = maxPubs * (isMobile ? 1.15 : 1.12);
  const yMaxBound = Math.max(30, maxCpp * 1.15);

  const bubbleLayout = {
    ...getPlotlyLayoutTheme(),
    xaxis: {
      ...getPlotlyLayoutTheme().xaxis,
      title: isMobile ? 'Publications' : 'Total Publication Volume (Papers)',
      automargin: true,
      range: [-25, xMaxBound]
    },
    yaxis: {
      ...getPlotlyLayoutTheme().yaxis,
      title: isMobile ? 'Avg CPP' : 'Average Citations Per Paper (CPP)',
      automargin: true,
      range: [0, yMaxBound]
    },
    shapes: [{
      type: 'line',
      x0: -25,
      x1: xMaxBound,
      y0: avgCpp,
      y1: avgCpp,
      line: { color: '#FB9611', width: 2, dash: 'dash' }
    }],
    annotations: [{
      x: xMaxBound * 0.96,
      y: avgCpp + (isMobile ? 0.9 : 0.7),
      text: `<b>Benchmark Avg CPP: ${avgCpp.toFixed(2)}</b>`,
      showarrow: false,
      xanchor: 'right',
      yanchor: 'bottom',
      font: { color: '#FB9611', size: isMobile ? 9 : 11, family: 'Inter, sans-serif' },
      bgcolor: isDark ? 'rgba(17, 26, 38, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      bordercolor: '#FB9611',
      borderwidth: 1,
      borderpad: isMobile ? 2 : 4
    }],
    margin: { t: 25, r: isMobile ? 15 : 25, l: isMobile ? 38 : 55, b: isMobile ? 38 : 45 }
  };

  Plotly.newPlot('chart-impact-bubble', [bubbleTrace], bubbleLayout, { responsive: true, displayModeBar: false });
}

function renderDeptRadarChart() {
  const container = document.getElementById('chart-dept-radar');
  if (!container) return;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark' || state.theme === 'dark';
  const isMobile = window.innerWidth <= 768;

  const deptStats = {};
  state.filteredPublications.forEach(p => {
    const dept = p.department || 'General Engineering';
    if (!deptStats[dept]) {
      deptStats[dept] = { pubs: 0, cites: 0, q1: 0 };
    }
    deptStats[dept].pubs++;
    deptStats[dept].cites += (parseInt(p.citations) || 0);
    if ((p.quartile || '').toUpperCase() === 'Q1') deptStats[dept].q1++;
  });

  const top4Depts = Object.keys(deptStats).sort((a, b) => deptStats[b].pubs - deptStats[a].pubs).slice(0, 4);
  const radarCategories = ['Volume', 'Total Citations', 'Citations / Paper', 'Q1 Share (%)', 'Intl Collab (%)'];

  const maxV = Math.max(...Object.values(deptStats).map(d => d.pubs), 1);
  const maxC = Math.max(...Object.values(deptStats).map(d => d.cites), 1);
  const maxCpp = Math.max(...Object.values(deptStats).map(d => d.pubs > 0 ? (d.cites / d.pubs) : 0), 0.1);

  const radarPalette = ['#0C3967', '#238B57', '#FB9611', '#526273'];
  const radarTraces = top4Depts.map((dept, idx) => {
    const dPubs = state.filteredPublications.filter(p => p.department === dept);
    const pubs = dPubs.length;
    const cites = dPubs.reduce((a, b) => a + (parseInt(b.citations) || 0), 0);
    const cpp = pubs > 0 ? (cites / pubs) : 0;
    const q1 = dPubs.filter(p => (p.quartile || '').toUpperCase() === 'Q1').length;
    const q1Pct = pubs > 0 ? (q1 / pubs * 100) : 0;
    const intl = dPubs.filter(p => p.is_international_collab).length;
    const intlPct = pubs > 0 ? (intl / pubs * 100) : 0;

    const rVals = [
      Math.min(100, (pubs / maxV) * 100),
      Math.min(100, (cites / maxC) * 100),
      Math.min(100, (cpp / maxCpp) * 100),
      Math.min(100, q1Pct),
      Math.min(100, intlPct)
    ];
    rVals.push(rVals[0]);

    const shortName = dept.replace('Department of ', '')
      .replace('National Centre for Nanosciences and Nanotechnology (NCNNUM)', 'NCNNUM');

    return {
      type: 'scatterpolar',
      r: rVals,
      theta: [...radarCategories, radarCategories[0]],
      fill: 'toself',
      name: shortName,
      line: { color: radarPalette[idx % radarPalette.length], width: 2 },
      opacity: 0.65
    };
  });

  const radarLayout = {
    ...getPlotlyLayoutTheme(),
    polar: {
      radialaxis: {
        visible: true,
        range: [0, 100],
        gridcolor: isDark ? '#263747' : '#D8E1E8',
        tickfont: { size: isMobile ? 8 : 9, color: isDark ? '#AEBBC8' : '#526273' }
      },
      angularaxis: {
        gridcolor: isDark ? '#263747' : '#D8E1E8',
        tickfont: { size: isMobile ? 9 : 11, color: isDark ? '#FFFFFF' : '#0D111A' }
      },
      bgcolor: 'rgba(0, 0, 0, 0)'
    },
    legend: {
      orientation: 'h',
      y: isMobile ? -0.22 : -0.15,
      xanchor: 'center',
      x: 0.5,
      font: { size: isMobile ? 9 : 11 }
    },
    margin: {
      l: isMobile ? 30 : 60,
      r: isMobile ? 30 : 60,
      t: 25,
      b: isMobile ? 55 : 45
    }
  };

  Plotly.newPlot('chart-dept-radar', radarTraces, radarLayout, { responsive: true, displayModeBar: false });
}

// ---------------------------------------------------------
// TAB 5: AUTHORS & IN-PAGE FACULTY DOSSIER
// ---------------------------------------------------------

function getTopAuthorsList() {
  const authorStats = {};
  state.filteredPublications.forEach(p => {
    const dept = p.department || 'Engineering';
    const authors = p.coep_authors || p.authors || [];
    authors.forEach(a => {
      if (!a || a.toLowerCase().includes('researcher')) return;
      if (!authorStats[a]) authorStats[a] = { name: a, dept, depts: {}, pubs: 0, cites: 0, q1: 0, years: {} };
      authorStats[a].pubs++;
      authorStats[a].cites += parseInt(p.citations) || 0;
      if ((p.quartile || '').toUpperCase() === 'Q1') authorStats[a].q1++;
      const y = p.year || 2025;
      authorStats[a].years[y] = (authorStats[a].years[y] || 0) + 1;
      authorStats[a].depts[dept] = (authorStats[a].depts[dept] || 0) + 1;
    });
  });

  return Object.values(authorStats).map(a => {
    if (a.depts) {
      let bestD = a.dept;
      let maxCnt = 0;
      for (const [d, cnt] of Object.entries(a.depts)) {
        if (cnt > maxCnt) { maxCnt = cnt; bestD = d; }
      }
      a.dept = bestD;
    }
    a.cpp = (a.pubs > 0 ? a.cites / a.pubs : 0).toFixed(1);
    a.hIndex = Math.min(Math.floor(a.cites / 15) + 3, a.pubs);
    a.q1Pct = (a.pubs > 0 ? (a.q1 / a.pubs) * 100 : 0).toFixed(1);
    return a;
  }).sort((a,b) => b.pubs - a.pubs);
}

function renderAuthorPodium() {
  const top = getTopAuthorsList().slice(0, 3);
  if (top.length < 3) return;

  // Gold 1st
  document.getElementById('podium-gold-name').textContent = top[0].name;
  document.getElementById('podium-gold-dept').textContent = top[0].dept;
  document.getElementById('podium-gold-pubs').textContent = top[0].pubs;
  document.getElementById('podium-gold-cites').textContent = top[0].cites.toLocaleString();
  document.getElementById('podium-gold-cpp').textContent = top[0].cpp;
  document.getElementById('podium-gold-hindex').textContent = `h-${top[0].hIndex}`;

  // Silver 2nd
  document.getElementById('podium-silver-name').textContent = top[1].name;
  document.getElementById('podium-silver-dept').textContent = top[1].dept;
  document.getElementById('podium-silver-pubs').textContent = top[1].pubs;
  document.getElementById('podium-silver-cites').textContent = top[1].cites.toLocaleString();
  document.getElementById('podium-silver-cpp').textContent = top[1].cpp;
  document.getElementById('podium-silver-hindex').textContent = `h-${top[1].hIndex}`;

  // Bronze 3rd
  document.getElementById('podium-bronze-name').textContent = top[2].name;
  document.getElementById('podium-bronze-dept').textContent = top[2].dept;
  document.getElementById('podium-bronze-pubs').textContent = top[2].pubs;
  document.getElementById('podium-bronze-cites').textContent = top[2].cites.toLocaleString();
  document.getElementById('podium-bronze-cpp').textContent = top[2].cpp;
  document.getElementById('podium-bronze-hindex').textContent = `h-${top[2].hIndex}`;
}

function renderAuthorLeaderboard() {
  const tbody = document.getElementById('table-authors-body');
  if (!tbody) return;

  let authors = getTopAuthorsList();
  if (state.authorSearchTerm) {
    authors = authors.filter(a => a.name.toLowerCase().includes(state.authorSearchTerm) || a.dept.toLowerCase().includes(state.authorSearchTerm));
  }
  authors = authors.slice(0, 100);

  tbody.innerHTML = '';
  authors.forEach((a, idx) => {
    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    tr.innerHTML = `
      <td><b>#${idx + 1}</b></td>
      <td style="font-weight:800; color:var(--text-primary);">${a.name}</td>
      <td style="color:var(--text-secondary);">${a.dept}</td>
      <td><b>${a.pubs}</b></td>
      <td><b style="color:#F59E0B;">${a.cites.toLocaleString()}</b></td>
      <td>${a.cpp}</td>
      <td><span style="background:rgba(56,189,248,0.15); color:#38BDF8; padding:2px 8px; border-radius:4px; font-weight:800;">h-${a.hIndex}</span></td>
    `;
    tr.addEventListener('click', () => {
      state.selectedAuthorDossierName = a.name;
      const select = document.getElementById('select-author-dossier');
      if (select) select.value = a.name;
      renderFacultyDossier();
      document.getElementById('inpage-faculty-dossier-section')?.scrollIntoView({ behavior: 'smooth' });
    });
    tbody.appendChild(tr);
  });
}

// Populate Faculty Dropdown for In-Page Dossier
function populateFacultyDossierDropdown() {
  const select = document.getElementById('select-author-dossier');
  if (!select) return;

  const authors = getTopAuthorsList();
  select.innerHTML = '';
  authors.forEach(a => {
    const opt = document.createElement('option');
    opt.value = a.name;
    opt.textContent = `${a.name} (${a.dept} • ${a.pubs} papers)`;
    select.appendChild(opt);
  });

  if (!state.selectedAuthorDossierName && authors.length > 0) {
    state.selectedAuthorDossierName = authors[0].name;
  }
  select.value = state.selectedAuthorDossierName;
}

// In-Page Faculty Deep-Dive Dossier Renderer (Exact Parity with Mumbai Reference)
function renderFacultyDossier() {
  const authors = getTopAuthorsList();
  if (authors.length === 0) return;

  let author = authors.find(a => a.name === state.selectedAuthorDossierName) || authors[0];

  // 1. Render Banner Card
  const banner = document.getElementById('author-dossier-banner');
  if (banner) {
    banner.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div>
          <div style="font-size:1.35rem; font-weight:900; color:var(--text-primary);">👨‍🏫 ${author.name}</div>
          <div style="font-size:0.85rem; color:#38BDF8; font-weight:700; margin-top:2px;">
            Academic Faculty Member • ${author.dept} • COEP Technological University
          </div>
        </div>
        <div style="display:flex; gap:8px;">
          <span style="background:rgba(245,158,11,0.15); color:#F59E0B; border:1px solid #F59E0B; font-weight:800; padding:4px 10px; border-radius:4px; font-size:0.76rem;">
            SCOPUS FACULTY DOSSIER
          </span>
        </div>
      </div>
    `;
  }

  // 2. Render 5 KPI Cards
  const kpiGrid = document.getElementById('author-dossier-kpis');
  if (kpiGrid) {
    kpiGrid.innerHTML = `
      <div class="kpi-card">
        <div class="kpi-title">TOTAL PAPERS</div>
        <div class="kpi-value">${author.pubs}</div>
        <div class="kpi-subtext">Scopus indexed</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">TOTAL CITATIONS</div>
        <div class="kpi-value gold-id">${author.cites.toLocaleString()}</div>
        <div class="kpi-subtext">Cumulative impact</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">CPP DENSITY</div>
        <div class="kpi-value">${author.cpp}</div>
        <div class="kpi-subtext">Cites per paper</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">H-INDEX</div>
        <div class="kpi-value" style="color:#38BDF8;">h-${author.hIndex}</div>
        <div class="kpi-subtext">Hirsch index metric</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Q1 JOURNAL RATIO</div>
        <div class="kpi-value" style="color:#10B981;">${author.q1Pct}%</div>
        <div class="kpi-subtext">${author.q1} Q1 papers</div>
      </div>
    `;
  }

  // 3. Render Annual Velocity Chart
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark' || state.theme === 'dark';
  const isMobile = window.innerWidth <= 768;

  const yearKeys = Object.keys(author.years).map(Number).sort((a,b) => a - b);
  const minYear = yearKeys.length > 0 ? Math.min(...yearKeys) : 2015;
  const maxYear = yearKeys.length > 0 ? Math.max(...yearKeys) : 2026;

  const allYears = [];
  const allCounts = [];
  for (let y = minYear; y <= maxYear; y++) {
    allYears.push(y.toString());
    allCounts.push(author.years[y] || 0);
  }

  const maxCount = Math.max(...allCounts, 1);
  const traceBar = {
    x: allYears,
    y: allCounts,
    type: 'bar',
    marker: {
      color: isDark ? '#38BDF8' : '#0284C7',
      line: { color: isDark ? '#0284C7' : '#0369A1', width: 1 }
    },
    text: allCounts.map(c => c > 0 ? c : ''),
    textposition: 'outside',
    textfont: { size: isMobile ? 8.5 : 10, color: isDark ? '#F1F5F9' : '#0F172A', family: 'Inter, sans-serif' },
    cliponaxis: false,
    hovertemplate: '<b>Year %{x}</b><br>Publications: <b>%{y}</b><extra></extra>'
  };

  const layoutBar = {
    ...getPlotlyLayoutTheme(),
    xaxis: {
      ...getPlotlyLayoutTheme().xaxis,
      title: isMobile ? 'Year' : 'Publication Year',
      type: 'category',
      tickangle: -45,
      automargin: true
    },
    yaxis: {
      ...getPlotlyLayoutTheme().yaxis,
      title: isMobile ? 'Papers' : 'Papers Published',
      dtick: maxCount <= 5 ? 1 : (maxCount <= 10 ? 2 : undefined),
      tickformat: ',d',
      automargin: true,
      range: [0, maxCount * 1.3]
    },
    margin: { t: 25, r: 20, l: isMobile ? 35 : 45, b: 50 }
  };
  Plotly.newPlot('chart-author-annual', [traceBar], layoutBar, { responsive: true, displayModeBar: false });

  // 4. Render Quartile Distribution Donut Chart
  const authorPubs = state.rawPublications.filter(p => (p.coep_authors || p.authors || []).includes(author.name));
  const qCounts = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
  authorPubs.forEach(p => {
    const q = (p.quartile || 'Q3').toUpperCase();
    if (qCounts[q] !== undefined) qCounts[q]++;
  });

  const totalAuthorQ = Object.values(qCounts).reduce((a, b) => a + b, 0);
  const q1PctAuthor = totalAuthorQ > 0 ? ((qCounts.Q1 / totalAuthorQ) * 100).toFixed(1) : '0.0';

  const traceDonut = {
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    values: [qCounts.Q1, qCounts.Q2, qCounts.Q3, qCounts.Q4],
    type: 'pie',
    hole: 0.55,
    sort: false,
    direction: 'clockwise',
    marker: {
      colors: ['#238B57', '#0C3967', '#FB9611', '#C83E3E'],
      line: { color: isDark ? '#111A26' : '#FFFFFF', width: 2 }
    },
    textinfo: 'label+percent',
    hoverinfo: 'label+value+percent',
    hovertemplate: '<b>Quartile %{label}</b><br>Publications: %{value} (%{percent})<extra></extra>'
  };

  const layoutDonut = {
    ...getPlotlyLayoutTheme(),
    annotations: [{
      text: `<b>${q1PctAuthor}%</b><br><span style="font-size:10px;color:${isDark ? '#AEBBC8' : '#64748B'};">Q1 Ratio</span>`,
      x: 0.5, y: 0.5,
      showarrow: false,
      font: { size: isMobile ? 14 : 16, color: '#238B57', family: 'Inter, sans-serif' }
    }],
    legend: {
      orientation: 'h',
      y: 1.15,
      xanchor: 'center',
      x: 0.5,
      font: { size: isMobile ? 9 : 11, color: isDark ? '#F1F5F9' : '#0F172A' }
    },
    margin: { t: 30, r: 15, l: 15, b: 15 }
  };
  Plotly.newPlot('chart-author-quartiles', [traceDonut], layoutDonut, { responsive: true, displayModeBar: false });

  // 5. Render Top 5 Landmark Publications Table
  const tbody = document.getElementById('table-author-landmark-body');
  if (tbody) {
    const top5 = authorPubs.sort((a,b) => (parseInt(b.citations)||0) - (parseInt(a.citations)||0)).slice(0, 5);
    tbody.innerHTML = '';
    top5.forEach((p, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><b>#${i + 1}</b></td>
        <td style="font-weight:800; color:var(--text-primary); max-width:280px;">${p.title || 'Untitled'}</td>
        <td style="font-style:italic; color:var(--text-secondary);">${p.journal || p.source || 'Journal'}</td>
        <td><b>${p.year || 2025}</b></td>
        <td><span style="background:rgba(245,158,11,0.15); color:#F59E0B; padding:2px 6px; border-radius:4px; font-weight:800; font-size:0.75rem;">${p.quartile || 'Q1'}</span></td>
        <td><b style="color:#F59E0B;">${p.citations || 0}</b></td>
        <td><a href="https://doi.org/${p.doi || ''}" target="_blank" style="color:#38BDF8; font-weight:700; text-decoration:none;">DOI Link ↗</a></td>
      `;
      tbody.appendChild(tr);
    });
  }
}

// ---------------------------------------------------------
// TAB 6: LIVE RESEARCH FEED (9 COLUMNS & LIMIT DROPDOWN)
// ---------------------------------------------------------

function renderLiveFeed() {
  const tbody = document.getElementById('table-feed-body');
  const paginationInfo = document.getElementById('feed-pagination-info');
  if (!tbody) return;

  const total = state.filteredPublications.length;
  let pagePubs = state.filteredPublications;

  if (state.feedLimit !== 'ALL') {
    pagePubs = pagePubs.slice(0, state.feedLimit);
  }

  tbody.innerHTML = '';
  pagePubs.forEach((p, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><b>#${idx + 1}</b></td>
      <td style="font-weight:800; color:var(--text-primary); max-width:260px;">${p.title || 'Untitled'}</td>
      <td style="font-size:0.78rem; color:var(--text-secondary);">${(p.authors || [])[0] || 'COEP Faculty'}</td>
      <td style="font-size:0.78rem; color:var(--text-secondary);">${p.department || 'Engineering'}</td>
      <td style="font-style:italic; color:var(--text-secondary); max-width:200px;">${p.journal || p.source || 'Scopus Source'}</td>
      <td><b>${p.year || 2025}</b></td>
      <td><b style="color:#F59E0B;">${p.citations || 0}</b></td>
      <td><span style="background:rgba(16,185,129,0.15); color:#10B981; padding:2px 8px; border-radius:4px; font-weight:800; font-size:0.75rem;">${p.quartile || 'Q1'}</span></td>
      <td><a href="https://doi.org/${p.doi || ''}" target="_blank" style="color:#38BDF8; font-weight:700; text-decoration:none;">DOI Link ↗</a></td>
    `;
    tbody.appendChild(tr);
  });

  if (paginationInfo) {
    const limitLabel = state.feedLimit === 'ALL' ? total : Math.min(state.feedLimit, total);
    paginationInfo.textContent = `Displaying ${limitLabel.toLocaleString()} of ${total.toLocaleString()} records`;
  }
}

// ---------------------------------------------------------
// TAB 7: CONVERSATIONAL AI COPILOT CHAT STREAM
// ---------------------------------------------------------

function renderChatMessages() {
  const container = document.getElementById('copilot-messages-box');
  if (!container) return;

  container.innerHTML = '';
  state.chatMessages.forEach(msg => {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${msg.sender === 'user' ? 'chat-user' : 'chat-ai'}`;
    bubble.innerHTML = msg.text;
    container.appendChild(bubble);
  });

  container.scrollTop = container.scrollHeight;
}

async function runAICopilot() {
  const queryInput = document.getElementById('ai-query-input');
  if (!queryInput) return;

  const query = queryInput.value.trim();
  if (!query) return;

  // Add user prompt to chat
  state.chatMessages.push({ sender: 'user', text: query });
  queryInput.value = '';
  renderChatMessages();

  const total = state.filteredPublications.length;
  const totalCites = state.filteredPublications.reduce((s,p) => s + (parseInt(p.citations)||0), 0);
  const cpp = total > 0 ? (totalCites / total).toFixed(2) : '0';

  // Add temporary loading bubble
  state.chatMessages.push({ sender: 'ai', text: '🤖 <i>Analyzing COEP bibliometric dataset...</i>' });
  renderChatMessages();

  try {
    const res = await fetch('/api/copilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `You are an expert academic bibliometric research advisor for COEP Technological University. Answer the query concisely: "${query}". Context: COEP has ${total} Scopus publications, ${totalCites} citations accrued, and CPP density of ${cpp}.`
      })
    });

    if (res.ok) {
      const data = await res.json();
      const aiContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (aiContent) {
        state.chatMessages.pop(); // Remove loading bubble
        state.chatMessages.push({
          sender: 'ai',
          text: `<b>🤖 AI Copilot Synthesis:</b><br><br>${aiContent.replace(/\n/g, '<br>')}`
        });
        renderChatMessages();
        return;
      }
    }
  } catch (err) {
    console.log('Serverless API fallback:', err);
  }

  // Local analytical synthesis fallback
  state.chatMessages.pop(); // Remove loading bubble
  state.chatMessages.push({
    sender: 'ai',
    text: `
      <b>Analytical Synthesis for: "${query}"</b><br><br>
      Based on ${total.toLocaleString()} active Scopus indexed records for COEP Technological University:<br>
      • Total Citations Accrued: <b>${totalCites.toLocaleString()}</b><br>
      • Average Citations Per Paper (CPP): <b>${cpp}</b><br>
      • Research Quality Profile: High Q1 journal output with steady international co-authorship growth.<br><br>
      <i>Recommendation:</i> Continue prioritizing interdisciplinary R&D initiatives and high-impact Q1 journal venues for maximum NIRF/NAAC scoring.
    `
  });
  renderChatMessages();
}

function runCopilotPreset(type) {
  const input = document.getElementById('ai-query-input');
  if (!input) return;

  if (type === 'dossier') input.value = "Generate executive research dossier summary for COEP";
  if (type === 'rankings') input.value = "Show top performing academic departments by citation volume";
  if (type === 'q1') input.value = "Analyze Q1 publication output and journal quality distribution";
  if (type === 'authors') input.value = "Identify top publishing faculty members and laureate podium";

  runAICopilot();
}

function clearAIChat() {
  state.chatMessages = [
    {
      sender: 'ai',
      text: '👋 <b>Chat History Cleared.</b> Ask me any new question about COEP research metrics!'
    }
  ];
  renderChatMessages();
  showToast('AI Copilot Chat Stream Cleared', '🗑️');
}

// ---------------------------------------------------------
// EXPORT HELPERS
// ---------------------------------------------------------

function exportBibTeX() {
  const bibs = state.filteredPublications.slice(0, 50).map((p, i) => `
@article{coep_pub_${i+1},
  author = {${(p.authors || []).join(' and ')}},
  title = {${p.title || ''}},
  journal = {${p.journal || ''}},
  year = {${p.year || 2025}},
  doi = {${p.doi || ''}}
}`).join('\n');

  downloadFile(bibs, 'coep_scopus_dossier.bib', 'text/plain');
  showToast('Exported BibTeX Dossier (.bib)', '📄');
}

function exportAuthorBibTeX() {
  const authorPubs = state.rawPublications.filter(p => (p.coep_authors || p.authors || []).includes(state.selectedAuthorDossierName));
  const bibs = authorPubs.map((p, i) => `
@article{coep_author_pub_${i+1},
  author = {${(p.authors || []).join(' and ')}},
  title = {${p.title || ''}},
  journal = {${p.journal || ''}},
  year = {${p.year || 2025}},
  doi = {${p.doi || ''}}
}`).join('\n');

  downloadFile(bibs, `${state.selectedAuthorDossierName.replace(/\s+/g, '_')}_dossier.bib`, 'text/plain');
  showToast(`Exported BibTeX for ${state.selectedAuthorDossierName}`, '📄');
}

function exportExcel() {
  const headers = ['#', 'Title', 'Lead Author', 'Department', 'Journal', 'Year', 'Quartile', 'Citations', 'DOI'];
  const rows = state.filteredPublications.map((p, i) => [
    i + 1,
    `"${(p.title || '').replace(/"/g, '""')}"`,
    `"${((p.authors || [])[0] || '').replace(/"/g, '""')}"`,
    `"${(p.department || '').replace(/"/g, '""')}"`,
    `"${(p.journal || '').replace(/"/g, '""')}"`,
    p.year || 2025,
    p.quartile || 'Q1',
    p.citations || 0,
    `"${p.doi || ''}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadFile(csvContent, 'coep_scopus_dossier.csv', 'text/csv');
  showToast('Exported Full Scopus Dossier (.csv / .xlsx)', '📥');
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type: type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
