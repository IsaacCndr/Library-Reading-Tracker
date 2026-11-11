/**
 * Tasteful Library & Reading Tracker
 * Inspired by modern dashboard and productivity interface design.
 * 
 * Features:
 * - 100% Client-side with browser localStorage persistence
 * - Real-time statistics, completion progress, dynamic insight banner
 * - Add new books with clean collapsible panel
 * - Rate books from one to five stars
 * - Direct status toggle (Read / Not Read) from cards
 * - Real-time search & segmented status filtering (All / Read / Not Read)
 * - Sorting by date and alphabetical order
 * - Edit book details via floating modal
 * - Delete book with explicit user confirmation
 * - Starter sample books loader
 * - JSON Export & Import backup utilities
 */

(function () {
  'use strict';

  // --- Storage Key ---
  const STORAGE_KEY = 'tasteful_book_list_app_v2';

  // --- Curated Starter Sample Books ---
  const SAMPLE_BOOKS = [
    {
      id: 'book_sample_1',
      title: 'To Kill a Mockingbird',
      author: 'Harper Lee',
      isRead: true,
      rating: 5,
      createdAt: Date.now() - 86400000 * 4
    },
    {
      id: 'book_sample_2',
      title: '1984',
      author: 'George Orwell',
      isRead: true,
      rating: 4,
      createdAt: Date.now() - 86400000 * 2
    },
    {
      id: 'book_sample_3',
      title: 'Dune',
      author: 'Frank Herbert',
      isRead: false,
      rating: 0,
      createdAt: Date.now() - 86400000 * 1
    },
    {
      id: 'book_sample_4',
      title: 'The Great Gatsby',
      author: 'F. Scott Fitzgerald',
      isRead: false,
      rating: 0,
      createdAt: Date.now()
    }
  ];

  // --- State ---
  let books = [];
  let searchQuery = '';
  let activeFilter = 'all'; // 'all' | 'read' | 'unread'
  let activeSort = 'newest'; // 'newest' | 'oldest' | 'title-asc' | 'author-asc'

  // --- DOM Elements ---
  // Header & Subtitles
  const windowSubtitle = document.getElementById('window-subtitle');
  const toggleAddBtn = document.getElementById('toggle-add-btn');

  // Insight Banner
  const insightTitle = document.getElementById('insight-title');
  const insightDesc = document.getElementById('insight-desc');

  // Stats Elements
  const statTotal = document.getElementById('stat-total');
  const totalBadge = document.getElementById('total-badge');
  const totalSubtext = document.getElementById('total-subtext');
  const distFillRead = document.getElementById('dist-fill-read');
  const distFillUnread = document.getElementById('dist-fill-unread');

  const statRead = document.getElementById('stat-read');
  const readPercentage = document.getElementById('read-percentage');
  const readProgressFill = document.getElementById('read-progress-fill');
  const readSubtext = document.getElementById('read-subtext');

  const statUnread = document.getElementById('stat-unread');
  const unreadSubtext = document.getElementById('unread-subtext');
  const unreadBadge = document.getElementById('unread-badge');

  // Add Book Panel
  const addPanel = document.getElementById('add-panel');
  const closeAddPanelBtn = document.getElementById('close-add-panel-btn');
  const addForm = document.getElementById('add-book-form');
  const titleInput = document.getElementById('book-title');
  const authorInput = document.getElementById('book-author');
  const statusCheckbox = document.getElementById('book-status');
  const bookRatingPicker = document.getElementById('book-rating-picker');
  const titleError = document.getElementById('title-error');
  const authorError = document.getElementById('author-error');

  // Toolbar & Filter Controls
  const segmentBtns = document.querySelectorAll('.segment-btn');
  const countAll = document.getElementById('count-all');
  const countRead = document.getElementById('count-read');
  const countUnread = document.getElementById('count-unread');
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  const sortSelect = document.getElementById('sort-select');
  const filteredBadge = document.getElementById('filtered-badge');

  // Collection Container & Empty States
  const booksContainer = document.getElementById('books-container');
  const emptyState = document.getElementById('empty-state');
  const noResultsState = document.getElementById('no-results-state');
  const emptyAddBtn = document.getElementById('empty-add-btn');
  const loadSamplesBtn = document.getElementById('load-samples-btn');
  const resetSearchBtn = document.getElementById('reset-search-btn');

  // Edit Modal
  const editModal = document.getElementById('edit-modal');
  const editForm = document.getElementById('edit-book-form');
  const editIdInput = document.getElementById('edit-book-id');
  const editTitleInput = document.getElementById('edit-title');
  const editAuthorInput = document.getElementById('edit-author');
  const editStatusCheckbox = document.getElementById('edit-status');
  const editRatingPicker = document.getElementById('edit-rating-picker');
  const editTitleError = document.getElementById('edit-title-error');
  const editAuthorError = document.getElementById('edit-author-error');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const cancelEditBtn = document.getElementById('cancel-edit-btn');

  // Delete Modal & Toast
  const deleteModal = document.getElementById('delete-modal');
  const deletePromptText = document.getElementById('delete-prompt-text');
  const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
  const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
  const closeDeleteModalBtn = document.getElementById('close-delete-modal-btn');
  const toastEl = document.getElementById('toast');
  let pendingDeleteId = null;
  let toastTimer = null;

  // Footer Tools
  const exportBtn = document.getElementById('export-btn');
  const importBtn = document.getElementById('import-btn');
  const importFileInput = document.getElementById('import-file-input');

  // --- LocalStorage Operations ---
  function normalizeRating(rating) {
    return Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : 0;
  }

  function getSelectedRating(picker) {
    const selected = picker.querySelector('input[type="radio"]:checked');
    return selected ? normalizeRating(Number(selected.value)) : 0;
  }

  function setRating(picker, rating) {
    const normalizedRating = normalizeRating(rating);
    const options = picker.querySelectorAll('.rating-option');
    options.forEach((option, index) => {
      const input = option.querySelector('input');
      input.checked = Number(input.value) === normalizedRating;
      option.classList.toggle('is-active', index < normalizedRating);
    });

    const value = picker.querySelector('.rating-value');
    value.textContent = normalizedRating ? `${normalizedRating} of 5` : 'Not rated';
    picker.querySelector('.rating-clear').disabled = normalizedRating === 0;
  }

  function loadBooks() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          books = parsed.map(book => ({ ...book, rating: normalizeRating(book.rating) }));
          if (parsed.some((book, index) => book.rating !== books[index].rating)) {
            saveBooks();
          }
          return;
        }
      }
    } catch (e) {
      console.warn('Could not read books from localStorage, initializing fresh:', e);
    }
    books = [];
  }

  function saveBooks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
    } catch (e) {
      console.error('Error saving books to localStorage:', e);
      alert('Could not save to browser storage. Your storage may be full or restricted.');
    }
  }

  // --- Helper: Escape HTML to prevent XSS ---
  function escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // --- Helper: Format Relative Time ---
  function formatRelativeDate(timestamp) {
    if (!timestamp) return 'Recently added';
    const diffMs = Date.now() - timestamp;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Added just now';
    if (diffHours === 1) return 'Added 1 hour ago';
    if (diffHours < 24) return `Added ${diffHours} hours ago`;
    if (diffDays === 1) return 'Added yesterday';
    if (diffDays < 7) return `Added ${diffDays} days ago`;

    const d = new Date(timestamp);
    return `Added on ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  }

  // --- Toast Notification Helper ---
  function showToast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.add('hidden');
    }, 2400);
  }

  // --- Update Insight Banner & Statistics ---
  function updateInsightsAndStats() {
    const total = books.length;
    const read = books.filter(b => b.isRead).length;
    const unread = total - read;
    const readRatio = total > 0 ? (read / total) * 100 : 0;
    const percentage = Math.round(readRatio);

    // Card 1: Total Books
    statTotal.textContent = total;
    totalBadge.textContent = `${total} ${total === 1 ? 'title' : 'titles'}`;
    totalSubtext.textContent = total === 0 ? 'All titles in library' : `${read} completed, ${unread} unread`;
    if (distFillRead && distFillUnread) {
      distFillRead.style.width = `${readRatio}%`;
      distFillUnread.style.width = `${total > 0 ? 100 - readRatio : 0}%`;
    }

    // Card 2: Books Read
    statRead.textContent = read;
    readPercentage.textContent = `${percentage}%`;
    readProgressFill.style.width = `${readRatio}%`;
    readSubtext.textContent = total === 0 ? '0 of 0 completed' : `${read} of ${total} finished`;

    // Card 3: Want to Read
    statUnread.textContent = unread;
    unreadSubtext.textContent = unread === 0 ? 'All caught up' : `${unread} ${unread === 1 ? 'title' : 'titles'} waiting`;
    if (unreadBadge) {
      unreadBadge.textContent = unread === 0 ? 'All Read' : 'In Queue';
    }

    // Window subtitle
    windowSubtitle.textContent = `Personal Collection • ${total} ${total === 1 ? 'title' : 'titles'} tracked`;

    // Filter pill counts
    countAll.textContent = total;
    countRead.textContent = read;
    countUnread.textContent = unread;

    // Dynamic banner message matching reference's "Recommend by AI" feel
    if (total === 0) {
      insightTitle.textContent = 'Start Your Reading Journey';
      insightDesc.textContent = 'Add your favorite books, keep track of unread titles, and see your collection grow over time.';
    } else if (percentage === 100) {
      insightTitle.textContent = 'Magnificent! All Books Completed';
      insightDesc.textContent = `You have read all ${total} books in your library. Add new titles to continue your journey!`;
    } else if (percentage >= 50) {
      insightTitle.textContent = `High Momentum: ${percentage}% Completed`;
      insightDesc.textContent = `You've completed ${read} of ${total} books. You are well past the halfway mark of your collection!`;
    } else {
      insightTitle.textContent = `Reading In Progress: ${read} Completed`;
      insightDesc.textContent = `You have ${unread} books waiting in your reading queue. Dive into your next chapter today!`;
    }
  }

  // --- Main Render Function ---
  function render() {
    updateInsightsAndStats();

    const trimmedQuery = searchQuery.trim().toLowerCase();

    // 1. Filter by Reading Status & Search
    let displayedBooks = books.filter(book => {
      // Filter tab
      if (activeFilter === 'read' && !book.isRead) return false;
      if (activeFilter === 'unread' && book.isRead) return false;

      // Search query
      if (trimmedQuery) {
        const titleMatch = book.title && book.title.toLowerCase().includes(trimmedQuery);
        const authorMatch = book.author && book.author.toLowerCase().includes(trimmedQuery);
        return titleMatch || authorMatch;
      }
      return true;
    });

    // 2. Sort
    displayedBooks.sort((a, b) => {
      if (activeSort === 'newest') return (b.createdAt || 0) - (a.createdAt || 0);
      if (activeSort === 'oldest') return (a.createdAt || 0) - (b.createdAt || 0);
      if (activeSort === 'title-asc') return a.title.localeCompare(b.title);
      if (activeSort === 'author-asc') return a.author.localeCompare(b.author);
      return 0;
    });

    // 3. Clear button visibility
    if (trimmedQuery) {
      clearSearchBtn.classList.remove('hidden');
    } else {
      clearSearchBtn.classList.add('hidden');
    }

    filteredBadge.textContent = `${displayedBooks.length} ${displayedBooks.length === 1 ? 'item' : 'items'}`;

    // 4. Handle Empty States
    if (books.length === 0) {
      emptyState.classList.remove('hidden');
      noResultsState.classList.add('hidden');
      booksContainer.innerHTML = '';
      return;
    }

    emptyState.classList.add('hidden');

    if (displayedBooks.length === 0) {
      noResultsState.classList.remove('hidden');
      booksContainer.innerHTML = '';
      return;
    }

    noResultsState.classList.add('hidden');

    // 5. Render Book Items (Inspired by "Product Sale Comparison" in reference)
    booksContainer.innerHTML = '';
    const bookEmojis = ['📘', '📕', '📗', '📙', '📔', '📓'];

    displayedBooks.forEach((book, index) => {
      const card = document.createElement('article');
      card.className = 'book-card';
      card.setAttribute('role', 'listitem');
      card.dataset.id = book.id;

      const safeTitle = escapeHTML(book.title);
      const safeAuthor = escapeHTML(book.author);
      const paletteIndex = (index % 5) + 1;
      const emoji = bookEmojis[index % bookEmojis.length];

      const statusClass = book.isRead ? 'status-read' : 'status-unread';
      const statusIcon = book.isRead ? '✓' : '📖';
      const statusText = book.isRead ? 'Read' : 'Not Read';
      const toggleTitle = book.isRead ? 'Click to mark as Not Read' : 'Click to mark as Read';
      const rating = normalizeRating(book.rating);
      const ratingLabel = rating ? `${rating} of 5` : 'Not rated';
      const ratingStars = Array.from({ length: 5 }, (_, starIndex) =>
        `<span class="${starIndex < rating ? 'is-filled' : 'is-empty'}">★</span>`
      ).join('');

      card.innerHTML = `
        <div class="book-left-meta">
          <div class="book-cover-badge cover-palette-${paletteIndex}" aria-hidden="true">
            ${emoji}
          </div>
          <div class="book-info-block">
            <h3 class="book-title">${safeTitle}</h3>
            <div class="book-author-meta">
              <span class="author-name">by ${safeAuthor}</span>
              <span class="meta-dot">&bull;</span>
              <span class="added-date">${formatRelativeDate(book.createdAt)}</span>
            </div>
            <div class="book-rating">
              <span class="book-rating-stars" aria-hidden="true">${ratingStars}</span>
              <span>${ratingLabel}</span>
            </div>
          </div>
        </div>

        <div class="book-right-actions">
          <button 
            type="button" 
            class="status-pill-toggle ${statusClass}" 
            data-action="toggle-status" 
            data-id="${book.id}"
            title="${toggleTitle}"
            aria-label="${toggleTitle}"
          >
            <span>${statusIcon}</span>
            <span>${statusText}</span>
          </button>

          <button 
            type="button" 
            class="btn-micro-action action-edit" 
            data-action="edit" 
            data-id="${book.id}" 
            aria-label="Edit '${safeTitle}'"
            title="Edit book details"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
            <span>Edit</span>
          </button>

          <button 
            type="button" 
            class="btn-micro-action action-delete" 
            data-action="delete" 
            data-id="${book.id}" 
            aria-label="Delete '${safeTitle}'"
            title="Delete this book"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            <span>Delete</span>
          </button>
        </div>
      `;

      booksContainer.appendChild(card);
    });
  }

  // --- Add Book Logic ---
  function handleAddBook(e) {
    e.preventDefault();

    const title = titleInput.value.trim();
    const author = authorInput.value.trim();
    const isRead = statusCheckbox.checked;
    const rating = getSelectedRating(bookRatingPicker);

    let hasError = false;
    titleInput.classList.remove('input-invalid');
    authorInput.classList.remove('input-invalid');
    titleError.textContent = '';
    authorError.textContent = '';

    if (!title) {
      titleInput.classList.add('input-invalid');
      titleError.textContent = 'Please provide a book title.';
      hasError = true;
    }

    if (!author) {
      authorInput.classList.add('input-invalid');
      authorError.textContent = 'Please provide the author name.';
      hasError = true;
    }

    if (hasError) return;

    const newBook = {
      id: 'book_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      title: title,
      author: author,
      isRead: isRead,
      rating: rating,
      createdAt: Date.now()
    };

    books.unshift(newBook);
    saveBooks();

    // Reset Form
    titleInput.value = '';
    authorInput.value = '';
    statusCheckbox.checked = false;
    setRating(bookRatingPicker, 0);

    render();
    addPanel.classList.remove('open');
    showToast(`Added "${newBook.title}" to library`);
  }

  // --- Delete Book Modal & Confirmation ---
  function openDeleteModal(id) {
    const book = books.find(b => b.id === id);
    if (!book) return;

    pendingDeleteId = id;

    if (deleteModal && deletePromptText) {
      deletePromptText.innerHTML = `Are you sure you want to remove <strong>&ldquo;${escapeHTML(book.title)}&rdquo;</strong> by ${escapeHTML(book.author)} from your library?`;
      deleteModal.classList.remove('hidden');
    } else {
      // Fallback
      const confirmed = window.confirm(`Are you sure you want to delete "${book.title}"?`);
      if (confirmed) {
        executeDelete(id);
      }
    }
  }

  function closeDeleteModal() {
    if (deleteModal) {
      deleteModal.classList.add('hidden');
    }
    pendingDeleteId = null;
  }

  function executeDelete(id) {
    const book = books.find(b => b.id === id);
    const deletedTitle = book ? book.title : 'Book';
    books = books.filter(b => b.id !== id);
    saveBooks();
    render();
    closeDeleteModal();
    showToast(`Removed "${deletedTitle}" from library`);
  }

  function handleDeleteBook(id) {
    openDeleteModal(id);
  }

  // --- Toggle Read Status ---
  function handleToggleStatus(id) {
    const book = books.find(b => b.id === id);
    if (!book) return;

    book.isRead = !book.isRead;
    saveBooks();
    render();
    showToast(book.isRead ? `Marked "${book.title}" as Read` : `Marked "${book.title}" as Want to Read`);
  }

  // --- Edit Modal Handling ---
  function openEditModal(id) {
    const book = books.find(b => b.id === id);
    if (!book) return;

    editIdInput.value = book.id;
    editTitleInput.value = book.title;
    editAuthorInput.value = book.author;
    editStatusCheckbox.checked = book.isRead;
    setRating(editRatingPicker, normalizeRating(book.rating));

    editTitleInput.classList.remove('input-invalid');
    editAuthorInput.classList.remove('input-invalid');
    editTitleError.textContent = '';
    editAuthorError.textContent = '';

    editModal.classList.remove('hidden');
    editTitleInput.focus();
  }

  function closeEditModal() {
    editModal.classList.add('hidden');
    editIdInput.value = '';
    editTitleInput.value = '';
    editAuthorInput.value = '';
    editStatusCheckbox.checked = false;
    setRating(editRatingPicker, 0);
  }

  function handleSaveEdit(e) {
    e.preventDefault();

    const id = editIdInput.value;
    const title = editTitleInput.value.trim();
    const author = editAuthorInput.value.trim();
    const isRead = editStatusCheckbox.checked;
    const rating = getSelectedRating(editRatingPicker);

    let hasError = false;
    editTitleInput.classList.remove('input-invalid');
    editAuthorInput.classList.remove('input-invalid');
    editTitleError.textContent = '';
    editAuthorError.textContent = '';

    if (!title) {
      editTitleInput.classList.add('input-invalid');
      editTitleError.textContent = 'Please provide a book title.';
      hasError = true;
    }

    if (!author) {
      editAuthorInput.classList.add('input-invalid');
      editAuthorError.textContent = 'Please provide the author name.';
      hasError = true;
    }

    if (hasError) return;

    const book = books.find(b => b.id === id);
    if (book) {
      book.title = title;
      book.author = author;
      book.isRead = isRead;
      book.rating = rating;
      saveBooks();
      render();
    }

    closeEditModal();
  }

  // --- Starter Sample Books Loader ---
  function handleLoadSamples() {
    books = [...SAMPLE_BOOKS];
    saveBooks();
    render();
  }

  // --- Export & Import Utilities ---
  function handleExportBackup() {
    if (books.length === 0) {
      alert('Your library is currently empty. Add books before exporting.');
      return;
    }

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(books, null, 2));
    const downloadAnchor = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `my-book-list-backup-${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  function handleImportFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      try {
        const imported = JSON.parse(event.target.result);
        if (Array.isArray(imported)) {
          const confirmed = window.confirm(`Found ${imported.length} books in this backup. Would you like to restore them to your collection?`);
          if (confirmed) {
            books = imported.map(book => ({ ...book, rating: normalizeRating(book.rating) }));
            saveBooks();
            render();
            alert('Books successfully restored!');
          }
        } else {
          alert('Invalid backup format: Expected an array of books.');
        }
      } catch (err) {
        alert('Could not parse the selected file. Please make sure it is a valid JSON file.');
      }
      importFileInput.value = '';
    };
    reader.readAsText(file);
  }

  // --- Event Listeners Setup ---
  function initEventListeners() {
    // Add Book Panel Toggle
    toggleAddBtn.addEventListener('click', () => {
      addPanel.classList.toggle('open');
      if (addPanel.classList.contains('open')) {
        titleInput.focus();
      }
    });

    closeAddPanelBtn.addEventListener('click', () => {
      addPanel.classList.remove('open');
    });

    emptyAddBtn.addEventListener('click', () => {
      addPanel.classList.add('open');
      titleInput.focus();
    });

    // Add Form Submit
    addForm.addEventListener('submit', handleAddBook);
    bookRatingPicker.addEventListener('change', () => setRating(bookRatingPicker, getSelectedRating(bookRatingPicker)));
    editRatingPicker.addEventListener('change', () => setRating(editRatingPicker, getSelectedRating(editRatingPicker)));
    bookRatingPicker.addEventListener('click', (e) => {
      if (e.target.closest('.rating-clear')) setRating(bookRatingPicker, 0);
    });
    editRatingPicker.addEventListener('click', (e) => {
      if (e.target.closest('.rating-clear')) setRating(editRatingPicker, 0);
    });

    // Live validation cleanups
    titleInput.addEventListener('input', () => {
      if (titleInput.value.trim()) {
        titleInput.classList.remove('input-invalid');
        titleError.textContent = '';
      }
    });

    authorInput.addEventListener('input', () => {
      if (authorInput.value.trim()) {
        authorInput.classList.remove('input-invalid');
        authorError.textContent = '';
      }
    });

    editTitleInput.addEventListener('input', () => {
      if (editTitleInput.value.trim()) {
        editTitleInput.classList.remove('input-invalid');
        editTitleError.textContent = '';
      }
    });

    editAuthorInput.addEventListener('input', () => {
      if (editAuthorInput.value.trim()) {
        editAuthorInput.classList.remove('input-invalid');
        editAuthorError.textContent = '';
      }
    });

    // Delegated actions on book list cards
    booksContainer.addEventListener('click', (e) => {
      const button = e.target.closest('button');
      if (!button) return;

      const action = button.dataset.action;
      const id = button.dataset.id;
      if (!id) return;

      if (action === 'delete') {
        handleDeleteBook(id);
      } else if (action === 'edit') {
        openEditModal(id);
      } else if (action === 'toggle-status') {
        handleToggleStatus(id);
      }
    });

    // Segmented Filter Tabs
    segmentBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        segmentBtns.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        activeFilter = btn.dataset.filter;
        render();
      });
    });

    // Search Input & Reset
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      render();
    });

    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      searchInput.focus();
      render();
    });

    resetSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      activeFilter = 'all';
      segmentBtns.forEach(b => {
        if (b.dataset.filter === 'all') {
          b.classList.add('active');
          b.setAttribute('aria-selected', 'true');
        } else {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        }
      });
      searchInput.focus();
      render();
    });

    // Sorting
    sortSelect.addEventListener('change', (e) => {
      activeSort = e.target.value;
      render();
    });

    // Starter Samples
    loadSamplesBtn.addEventListener('click', handleLoadSamples);

    // Edit Modal Events
    editForm.addEventListener('submit', handleSaveEdit);
    closeModalBtn.addEventListener('click', closeEditModal);
    cancelEditBtn.addEventListener('click', closeEditModal);

    editModal.addEventListener('click', (e) => {
      if (e.target === editModal) {
        closeEditModal();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !editModal.classList.contains('hidden')) {
        closeEditModal();
      }
    });

    // Backup & Export
    exportBtn.addEventListener('click', handleExportBackup);
    importBtn.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', handleImportFile);
  }

  // --- Boot App ---
  function init() {
    loadBooks();
    initEventListeners();
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
