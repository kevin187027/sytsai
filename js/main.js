(function () {
  'use strict';

  /* ===== State ===== */
  var courseData = null;
  var allGroups = [];
  var filteredGroups = [];
  var currentCategory = 'all';
  var currentSearch = '';
  var currentSort = 'default';
  var currentPage = 1;
  var itemsPerPage = 9;

  /* ===== DOM Elements ===== */
  var groupGrid = document.getElementById('groupGrid');
  var paginationEl = document.getElementById('pagination');
  var noResultsEl = document.getElementById('noResults');
  var resultTitleEl = document.getElementById('resultTitle');
  var resultCountEl = document.getElementById('resultCount');
  var searchInput = document.getElementById('searchInput');
  var heroSearchInput = document.getElementById('heroSearchInput');
  var heroSearchBtn = document.getElementById('heroSearchBtn');
  var filterScroll = document.getElementById('filterScroll');
  var sortSelect = document.getElementById('sortSelect');

  /* ===== Category Colors ===== */
  var categoryColors = {
    '社區營造': '#2C5F2D',
    '數位平權': '#5B8DEF',
    '食農教育': '#66BB6A',
    '勞權倡議': '#E65100',
    '環境保護': '#00897B',
    '高齡關懷': '#7B1FA2',
    '文化保存': '#8D6E63',
    '社會福利': '#1565C0',
    '多元文化': '#D81B60',
    '兒少福利': '#F57C00',
    '身障權益': '#5C6BC0',
    '地方創生': '#558B2F',
    '性別平權': '#C2185B',
    '藝文推廣': '#E91E63',
    '社會正義': '#37474F',
    '教育推廣': '#0288D1'
  };

  function getColorForCategory(category) {
    return categoryColors[category] || '#2C5F2D';
  }

  function getColorForGroup(name) {
    var baseColors = ['#2C5F2D','#5B8DEF','#66BB6A','#E65100','#00897B','#7B1FA2','#8D6E63','#1565C0','#D81B60','#F57C00'];
    var hash = 0;
    for (var i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return baseColors[Math.abs(hash) % baseColors.length];
  }

  /* ===== Load Data from JSON ===== */
  function loadData() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'data/groups.json', true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200 || (xhr.status === 0 && xhr.responseText)) {
          try {
            var data = JSON.parse(xhr.responseText);
            courseData = data.course || {};
            allGroups = data.groups || [];
            renderCourseInfo();
            renderCategoryFilters();
            updateStats();
            applyFilters();
          } catch (e) {
            groupGrid.innerHTML = '<div class="loading-message">資料載入失敗，請重新整理頁面。</div>';
          }
        } else {
          groupGrid.innerHTML = '<div class="loading-message">無法載入資料（HTTP ' + xhr.status + '）。</div>';
        }
      }
    };
    xhr.send();
  }

  /* ===== Render Course Info in Hero ===== */
  function renderCourseInfo() {
    if (!courseData) return;

    document.getElementById('heroTitle').textContent = courseData.name || '社會實踐';
    document.getElementById('heroSubtitle').textContent = courseData.subtitle || '';
    document.getElementById('heroProfessor').textContent = courseData.professor || '';
    document.getElementById('heroSemester').textContent = courseData.semester || '';

    var courseInfoEl = document.getElementById('courseInfo');
    if (courseData.department || courseData.professor || courseData.semester) {
      courseInfoEl.style.display = 'block';
      document.getElementById('infoDept').textContent = courseData.department || '';
      document.getElementById('infoProf').textContent = courseData.professor || '';
      document.getElementById('infoSemester').textContent = courseData.semester || '';
      document.getElementById('infoDesc').textContent = courseData.description || '';
    }
  }

  /* ===== Render Category Filters Dynamically ===== */
  function renderCategoryFilters() {
    var categories = {};
    allGroups.forEach(function (g) {
      if (!categories[g.category]) categories[g.category] = 0;
      categories[g.category]++;
    });

    var catArray = Object.keys(categories).sort();

    var html = '<button class="filter-chip active" data-category="all">全部 (' + allGroups.length + ')</button>';
    catArray.forEach(function (cat) {
      html += '<button class="filter-chip" data-category="' + escapeHtml(cat) + '">' + escapeHtml(cat) + ' (' + categories[cat] + ')</button>';
    });

    filterScroll.innerHTML = html;

    filterScroll.querySelectorAll('.filter-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        filterScroll.querySelectorAll('.filter-chip').forEach(function (c) { c.classList.remove('active'); });
        this.classList.add('active');
        currentCategory = this.getAttribute('data-category');
        applyFilters();
        scrollToContent();
      });
    });
  }

  /* ===== Stats ===== */
  function updateStats() {
    var categories = {};
    var studentCount = 0;
    allGroups.forEach(function (g) {
      categories[g.category] = true;
      if (g.members) studentCount += g.members.length;
    });

    animateNumber('statGroups', allGroups.length);
    animateNumber('statCategories', Object.keys(categories).length);
    animateNumber('statStudents', studentCount);
  }

  function animateNumber(elementId, target) {
    var el = document.getElementById(elementId);
    if (!el) return;
    var current = 0;
    var step = Math.max(1, Math.ceil(target / 30));
    var interval = setInterval(function () {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(interval);
      }
      el.textContent = current;
    }, 30);
  }

  /* ===== Filter, Search & Sort ===== */
  function applyFilters() {
    filteredGroups = allGroups.filter(function (g) {
      var matchCategory = currentCategory === 'all' || g.category === currentCategory;
      var searchLower = currentSearch.toLowerCase().trim();
      var matchSearch = !searchLower ||
        g.name.toLowerCase().indexOf(searchLower) !== -1 ||
        g.projectName.toLowerCase().indexOf(searchLower) !== -1 ||
        g.category.toLowerCase().indexOf(searchLower) !== -1 ||
        (g.tag && g.tag.toLowerCase().indexOf(searchLower) !== -1) ||
        (g.description && g.description.toLowerCase().indexOf(searchLower) !== -1) ||
        (g.leader && g.leader.toLowerCase().indexOf(searchLower) !== -1);
      return matchCategory && matchSearch;
    });

    if (currentSort === 'name') {
      filteredGroups.sort(function (a, b) { return a.name.localeCompare(b.name, 'zh-Hant'); });
    } else if (currentSort === 'category') {
      filteredGroups.sort(function (a, b) { return a.category.localeCompare(b.category, 'zh-Hant'); });
    } else if (currentSort === 'score') {
      var scoreOrder = { 'A': 1, 'A-': 2, 'B+': 3, 'B': 4, 'B-': 5, 'C+': 6, 'C': 7 };
      filteredGroups.sort(function (a, b) {
        return (scoreOrder[a.score] || 99) - (scoreOrder[b.score] || 99);
      });
    }

    currentPage = 1;
    renderGroups();
    renderPagination();
    updateResultHeader();
  }

  function updateResultHeader() {
    var count = filteredGroups.length;
    resultCountEl.textContent = '共 ' + count + ' 組';

    if (currentCategory === 'all' && !currentSearch) {
      resultTitleEl.textContent = '所有組別';
    } else if (currentCategory !== 'all' && !currentSearch) {
      resultTitleEl.textContent = currentCategory;
    } else if (currentSearch) {
      resultTitleEl.textContent = '搜尋：' + currentSearch;
    } else {
      resultTitleEl.textContent = '搜尋結果';
    }
  }

  /* ===== Render Groups ===== */
  function renderGroups() {
    if (filteredGroups.length === 0) {
      groupGrid.innerHTML = '';
      noResultsEl.style.display = 'block';
      paginationEl.innerHTML = '';
      return;
    }

    noResultsEl.style.display = 'none';

    var start = (currentPage - 1) * itemsPerPage;
    var end = start + itemsPerPage;
    var pageGroups = filteredGroups.slice(start, end);

    var html = '';
    pageGroups.forEach(function (g) {
      var color = getColorForGroup(g.name);
      html += '<div class="group-card fade-in" data-group-id="' + g.id + '">';
      html += '  <div class="group-card-header">';
      html += '    <div class="group-logo" style="background:' + color + ';">' + escapeHtml(g.logo) + '</div>';
      html += '    <div class="group-card-info">';
      html += '      <div class="group-name">' + escapeHtml(g.name) + '</div>';
      html += '      <span class="group-category-tag">' + escapeHtml(g.category) + '</span>';
      html += '    </div>';
      html += '  </div>';
      html += '  <div class="group-card-body">';
      html += '    <div class="group-project-name">' + escapeHtml(g.projectName) + '</div>';
      html += '    <p class="group-desc">' + escapeHtml(g.description) + '</p>';
      html += '    <div class="group-meta">';
      if (g.tag) html += '      <span class="group-tag">#' + escapeHtml(g.tag) + '</span>';
      if (g.score) html += '      <span class="group-score">成績 ' + escapeHtml(g.score) + '</span>';
      html += '    </div>';
      html += '  </div>';
      html += '  <div class="group-card-footer">';
      html += '    <a href="' + g.projectUrl + '" target="_blank" rel="noopener" class="group-link-btn primary" onclick="event.stopPropagation()">查看作品</a>';
      html += '    <button class="group-link-btn" data-group-id="' + g.id + '" onclick="event.stopPropagation()">詳情</button>';
      html += '  </div>';
      html += '</div>';
    });

    groupGrid.innerHTML = html;

    /* Observe cards for fade-in */
    var cards = groupGrid.querySelectorAll('.group-card');
    if ('IntersectionObserver' in window) {
      var cardObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            cardObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });
      cards.forEach(function (card) { cardObserver.observe(card); });
    } else {
      cards.forEach(function (card) { card.classList.add('visible'); });
    }

    /* Bind card click to open modal */
    cards.forEach(function (card) {
      card.addEventListener('click', function () {
        var id = parseInt(this.getAttribute('data-group-id'), 10);
        var group = allGroups.filter(function (g) { return g.id === id; })[0];
        if (group) openModal(group);
      });
    });

    /* Bind detail buttons */
    groupGrid.querySelectorAll('.group-link-btn[data-group-id]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = parseInt(this.getAttribute('data-group-id'), 10);
        var group = allGroups.filter(function (g) { return g.id === id; })[0];
        if (group) openModal(group);
      });
    });
  }

  /* ===== Pagination ===== */
  function renderPagination() {
    var totalPages = Math.ceil(filteredGroups.length / itemsPerPage);
    if (totalPages <= 1) {
      paginationEl.innerHTML = '';
      return;
    }

    var html = '';
    html += '<button class="page-btn" data-page="' + (currentPage - 1) + '" ' + (currentPage === 1 ? 'disabled' : '') + '>&#8249;</button>';

    var maxVisible = 5;
    var startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    var endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
      html += '<button class="page-btn" data-page="1">1</button>';
      if (startPage > 2) html += '<span class="page-ellipsis">...</span>';
    }

    for (var p = startPage; p <= endPage; p++) {
      html += '<button class="page-btn ' + (p === currentPage ? 'active' : '') + '" data-page="' + p + '">' + p + '</button>';
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) html += '<span class="page-ellipsis">...</span>';
      html += '<button class="page-btn" data-page="' + totalPages + '">' + totalPages + '</button>';
    }

    html += '<button class="page-btn" data-page="' + (currentPage + 1) + '" ' + (currentPage === totalPages ? 'disabled' : '') + '>&#8250;</button>';

    paginationEl.innerHTML = html;

    paginationEl.querySelectorAll('.page-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (this.disabled) return;
        var page = parseInt(this.getAttribute('data-page'), 10);
        if (page >= 1 && page <= totalPages && page !== currentPage) {
          currentPage = page;
          renderGroups();
          renderPagination();
          updateResultHeader();
          var contentTop = document.querySelector('.main-content').offsetTop - 120;
          window.scrollTo({ top: contentTop, behavior: 'smooth' });
        }
      });
    });
  }

  /* ===== Modal ===== */
  var modalOverlay = document.getElementById('modalOverlay');
  var modalClose = document.getElementById('modalClose');
  var modalBody = document.getElementById('modalBody');

  function openModal(g) {
    var color = getColorForGroup(g.name);

    var html = '';
    html += '<div class="modal-header">';
    html += '  <div class="modal-logo" style="background:' + color + ';">' + escapeHtml(g.logo) + '</div>';
    html += '  <h3 class="modal-name">' + escapeHtml(g.name) + '</h3>';
    html += '  <p class="modal-project-name">' + escapeHtml(g.projectName) + '</p>';
    html += '  <div class="modal-tags">';
    html += '    <span class="modal-tag category">' + escapeHtml(g.category) + '</span>';
    if (g.tag) html += '    <span class="modal-tag issue">#' + escapeHtml(g.tag) + '</span>';
    if (g.score) html += '    <span class="modal-tag score">成績 ' + escapeHtml(g.score) + '</span>';
    html += '  </div>';
    html += '</div>';

    html += '<div class="modal-info">';
    html += '  <div class="modal-info-item"><span class="modal-info-icon">&#128172;</span><div><span class="modal-info-label">計畫簡介</span><span class="modal-info-value">' + escapeHtml(g.description) + '</span></div></div>';
    html += '  <div class="modal-info-item"><span class="modal-info-icon">&#128100;</span><div><span class="modal-info-label">組長</span><span class="modal-info-value">' + escapeHtml(g.leader) + '</span></div></div>';
    if (g.members && g.members.length > 0) {
      html += '  <div class="modal-info-item"><span class="modal-info-icon">&#128101;</span><div><span class="modal-info-label">組員 (' + g.members.length + '人)</span><div class="modal-members">';
      g.members.forEach(function (m) {
        var isLeader = m === g.leader;
        html += '<span class="modal-member' + (isLeader ? ' leader' : '') + '">' + (isLeader ? '&#11088; ' : '') + escapeHtml(m) + '</span>';
      });
      html += '  </div></div>';
    }
    if (g.semester) {
      html += '  <div class="modal-info-item"><span class="modal-info-icon">&#128197;</span><div><span class="modal-info-label">學期</span><span class="modal-info-value">' + escapeHtml(g.semester) + '</span></div></div>';
    }
    html += '</div>';

    html += '<div class="modal-links">';
    html += '  <a href="' + g.projectUrl + '" target="_blank" rel="noopener" class="modal-link-btn primary">&#128279; 查看作品</a>';
    if (g.presentationUrl) html += '  <a href="' + g.presentationUrl + '" target="_blank" rel="noopener" class="modal-link-btn">&#128202; 簡報</a>';
    if (g.reportUrl) html += '  <a href="' + g.reportUrl + '" target="_blank" rel="noopener" class="modal-link-btn">&#128209; 報告</a>';
    if (g.videoUrl) html += '  <a href="' + g.videoUrl + '" target="_blank" rel="noopener" class="modal-link-btn">&#127909; 影片</a>';
    html += '</div>';

    modalBody.innerHTML = html;
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  modalClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', function (e) {
    if (e.target === modalOverlay) closeModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modalOverlay.classList.contains('active')) closeModal();
  });

  /* ===== Utility ===== */
  function escapeHtml(str) {
    if (typeof str !== 'string') return String(str || '');
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ===== Search ===== */
  var searchTimer = null;

  function handleSearch(value) {
    currentSearch = value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
      applyFilters();
    }, 250);
  }

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      handleSearch(this.value);
    });
  }

  if (heroSearchInput) {
    heroSearchInput.addEventListener('input', function () {
      handleSearch(this.value);
      if (searchInput) searchInput.value = this.value;
    });
    heroSearchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') scrollToContent();
    });
  }

  if (heroSearchBtn) {
    heroSearchBtn.addEventListener('click', function () {
      if (heroSearchInput) handleSearch(heroSearchInput.value);
      scrollToContent();
    });
  }

  function scrollToContent() {
    var target = document.querySelector('.main-content');
    if (target) {
      var offset = target.offsetTop - 120;
      window.scrollTo({ top: offset, behavior: 'smooth' });
    }
  }

  /* ===== Sort ===== */
  if (sortSelect) {
    sortSelect.addEventListener('change', function () {
      currentSort = this.value;
      applyFilters();
    });
  }

  /* ===== Navbar & Floating Tools ===== */
  var navbar = document.getElementById('navbar');
  var backToTop = document.getElementById('backToTop');
  var socialQuickLinks = document.getElementById('socialQuickLinks');
  var toolsContainer = document.getElementById('floatingTools');

  window.addEventListener('scroll', function () {
    var scrollY = window.scrollY || window.pageYOffset;
    if (scrollY > 50) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');
    if (scrollY > 400) backToTop.classList.add('show');
    else backToTop.classList.remove('show');
  }, { passive: true });

  backToTop.addEventListener('click', function (e) {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  var socialsVisible = false;

  function showSocials() {
    socialQuickLinks.classList.add('show');
    socialsVisible = true;
  }

  function hideSocials() {
    socialQuickLinks.classList.remove('show');
    socialsVisible = false;
  }

  toolsContainer.addEventListener('mouseenter', showSocials);
  toolsContainer.addEventListener('mouseleave', function () {
    setTimeout(function () { if (socialsVisible) hideSocials(); }, 300);
  });

  backToTop.addEventListener('touchstart', function (e) {
    e.preventDefault();
    if (socialQuickLinks.classList.contains('show')) hideSocials();
    else showSocials();
  }, { passive: false });

  /* ===== Init ===== */
  loadData();

})();
