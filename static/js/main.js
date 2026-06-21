// ==========================================================================
// Application State & Constants
// ==========================================================================
let releaseNotes = [];
let activeCategory = 'all';
let searchQuery = '';

// DOM Elements
const refreshBtn = document.getElementById('refresh-btn');
const exportCsvBtn = document.getElementById('export-csv-btn');
const lastUpdatedSpan = document.getElementById('last-updated');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const categoryFilterChips = document.querySelectorAll('.filter-chip');
const notesContainer = document.getElementById('notes-container');
const resultsCountDiv = document.getElementById('results-count');
const feedMetaDiv = document.getElementById('feed-meta');
const resetFiltersBtn = document.getElementById('reset-filters-btn');
const themeToggleBtn = document.getElementById('theme-toggle');

// Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const tweetTextarea = document.getElementById('tweet-textarea');
const attachedLinkText = document.getElementById('attached-link-text');
const charCountSpan = document.getElementById('char-count');
const charWarningSpan = document.getElementById('char-warning');
const copyTweetBtn = document.getElementById('copy-tweet-btn');
const publishTweetBtn = document.getElementById('publish-tweet-btn');
const counterDisplay = document.querySelector('.counter-display');

// Toast Container
const toastContainer = document.getElementById('toast-container');

// Max Twitter/X character length
const TWEET_LIMIT = 280;
const TWITTER_LINK_COST = 23; // Twitter URL shortener (t.co) cost

// Active Tweet state
let activeTweetData = {
    date: '',
    type: '',
    link: '',
    originalText: ''
};

// ==========================================================================
// Initialization & Listeners
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initApp();
});

function initApp() {
    // Load initial feed
    fetchReleaseNotes(false);

    // Event listeners
    refreshBtn.addEventListener('click', () => fetchReleaseNotes(true));
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', exportToCSV);
    }
    
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
        renderFeed();
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        searchInput.focus();
        renderFeed();
    });

    resetFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        activeCategory = 'all';
        categoryFilterChips.forEach(chip => {
            if (chip.dataset.category === 'all') {
                chip.classList.add('active');
            } else {
                chip.classList.remove('active');
            }
        });
        renderFeed();
    });

    categoryFilterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            categoryFilterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            activeCategory = chip.dataset.category;
            renderFeed();
        });
    });

    // Modal Events
    closeModalBtn.addEventListener('click', hideModal);
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) hideModal();
    });
    
    tweetTextarea.addEventListener('input', updateTweetCharCount);
    
    copyTweetBtn.addEventListener('click', () => {
        const fullTweet = tweetTextarea.value;
        copyToClipboard(fullTweet, 'Tweet draft copied to clipboard!');
    });

    publishTweetBtn.addEventListener('click', () => {
        const text = encodeURIComponent(tweetTextarea.value);
        const url = `https://twitter.com/intent/tweet?text=${text}`;
        window.open(url, '_blank');
        hideModal();
        showToast('Redirected to Twitter/X', 'success');
    });
}

// ==========================================================================
// API Operations
// ==========================================================================
async function fetchReleaseNotes(forceRefresh = false) {
    // Show loading state
    refreshBtn.classList.add('loading');
    refreshBtn.disabled = true;
    
    if (forceRefresh) {
        showToast('Syncing feed from Google Cloud...', 'success');
    }

    try {
        const response = await fetch(`/api/release-notes?refresh=${forceRefresh}`);
        const result = await response.json();
        
        if (response.ok) {
            releaseNotes = result.data || [];
            updateLastUpdatedTime(result.last_updated);
            renderFeed();
            if (forceRefresh) {
                showToast('Feed updated successfully!', 'success');
            }
        } else {
            console.error('Error fetching release notes:', result.error);
            showToast(result.error || 'Failed to fetch release notes', 'error');
            renderErrorState(result.error);
        }
    } catch (error) {
        console.error('Fetch error:', error);
        showToast('Network error, using cached data if available', 'error');
        renderErrorState(error.message);
    } finally {
        refreshBtn.classList.remove('loading');
        refreshBtn.disabled = false;
    }
}

function updateLastUpdatedTime(timestamp) {
    if (!timestamp) {
        lastUpdatedSpan.textContent = 'Never';
        return;
    }
    const date = new Date(timestamp * 1000);
    lastUpdatedSpan.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ==========================================================================
// Feed Rendering Logic
// ==========================================================================
function renderFeed() {
    if (releaseNotes.length === 0) {
        renderEmptyState('No release notes found.');
        return;
    }

    notesContainer.innerHTML = '';
    let totalSectionsMatched = 0;

    releaseNotes.forEach(entry => {
        // Filter sections within each entry
        const matchedSections = entry.sections.filter(sec => {
            // Category check
            const categoryMatch = (activeCategory === 'all' || sec.type.toLowerCase() === activeCategory.toLowerCase());
            
            // Search match
            const searchMatch = !searchQuery || 
                sec.type.toLowerCase().includes(searchQuery) || 
                sec.text.toLowerCase().includes(searchQuery) ||
                entry.date.toLowerCase().includes(searchQuery);
                
            return categoryMatch && searchMatch;
        });

        if (matchedSections.length > 0) {
            totalSectionsMatched += matchedSections.length;

            // Create entry container
            const dayGroup = document.createElement('div');
            dayGroup.className = 'day-group';

            // Create day header
            const dayHeader = document.createElement('div');
            dayHeader.className = 'day-header';
            
            const dayDate = document.createElement('span');
            dayDate.className = 'day-date';
            dayDate.textContent = entry.date;
            
            const dayLine = document.createElement('div');
            dayLine.className = 'day-line';
            
            const dayLink = document.createElement('a');
            dayLink.className = 'day-link';
            dayLink.href = entry.link;
            dayLink.target = '_blank';
            dayLink.innerHTML = `
                Feed link
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;

            dayHeader.appendChild(dayDate);
            dayHeader.appendChild(dayLine);
            dayHeader.appendChild(dayLink);
            dayGroup.appendChild(dayHeader);

            // Render matched sections as cards
            matchedSections.forEach(sec => {
                const card = document.createElement('div');
                card.className = `note-card glass-card card-category-${sec.type.toLowerCase()} card-category-general`;
                
                // Set custom category CSS override
                const typeLower = sec.type.toLowerCase();
                if (['feature', 'change', 'announcement', 'deprecation'].includes(typeLower)) {
                    card.className = `note-card glass-card card-category-${typeLower}`;
                }

                // Render Badge and Social Actions
                const cardTop = document.createElement('div');
                cardTop.className = 'card-top';

                const badge = document.createElement('span');
                badge.className = `category-badge badge-general`;
                if (['feature', 'change', 'announcement', 'deprecation'].includes(typeLower)) {
                    badge.className = `category-badge badge-${typeLower}`;
                }
                badge.textContent = sec.type;

                const cardActions = document.createElement('div');
                cardActions.className = 'card-actions';

                // Copy to Clipboard Button
                const copyBtn = document.createElement('button');
                copyBtn.className = 'action-icon-btn copy-btn';
                copyBtn.title = 'Copy to Clipboard';
                copyBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                `;
                copyBtn.addEventListener('click', () => {
                    copyToClipboard(sec.text, 'Release note text copied to clipboard!');
                });

                // Tweet Button
                const tweetBtn = document.createElement('button');
                tweetBtn.className = 'action-icon-btn tweet-btn';
                tweetBtn.title = 'Draft a tweet about this update';
                tweetBtn.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                `;
                tweetBtn.addEventListener('click', () => {
                    openTweetComposer(sec, entry.date, entry.link);
                });

                cardActions.appendChild(copyBtn);
                cardActions.appendChild(tweetBtn);

                cardTop.appendChild(badge);
                cardTop.appendChild(cardActions);
                card.appendChild(cardTop);

                // Content
                const contentDiv = document.createElement('div');
                contentDiv.className = 'note-content';
                contentDiv.innerHTML = sec.html;
                card.appendChild(contentDiv);

                dayGroup.appendChild(card);
            });

            notesContainer.appendChild(dayGroup);
        }
    });

    // Update results meta info
    if (activeCategory !== 'all' || searchQuery) {
        feedMetaDiv.style.display = 'flex';
        resultsCountDiv.textContent = `Found ${totalSectionsMatched} matching update${totalSectionsMatched !== 1 ? 's' : ''}`;
    } else {
        feedMetaDiv.style.display = 'none';
    }

    if (totalSectionsMatched === 0) {
        renderEmptyState(`No release updates matching your filter filters or search query.`);
    }
}

// ==========================================================================
// Empty, Loading, and Error State Renders
// ==========================================================================
function renderEmptyState(message) {
    notesContainer.innerHTML = `
        <div class="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
                <path d="M8 11h6"/>
            </svg>
            <h3>No Updates Match Your Query</h3>
            <p>${message}</p>
        </div>
    `;
}

function renderErrorState(errorMessage) {
    notesContainer.innerHTML = `
        <div class="error-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <h3>Unable to Load Feed</h3>
            <p>${errorMessage || 'An unknown error occurred while retrieving updates.'}</p>
            <button class="btn btn-secondary" onclick="fetchReleaseNotes(true)">Try Again</button>
        </div>
    `;
}

// ==========================================================================
// Tweet Composer & Sharing Actions
// ==========================================================================
function openTweetComposer(section, date, link) {
    activeTweetData = {
        date: date,
        type: section.type,
        link: link,
        originalText: section.text
    };

    attachedLinkText.textContent = link;

    // Compose a draft tweet text
    // Format: "BigQuery Update ([Date]) [Type]: [Text] [Link]"
    // Twitter URL shortening transforms links to exactly 23 characters.
    // Calculate space for tweet:
    // 280 (limit) - 23 (link cost) - 1 (space) = 256 characters remaining for prefix & text snippet
    const headerPrefix = `BigQuery Update (${date}) [${section.type}]: `;
    const linkSpace = 24; // space + link
    const maxTextSpace = TWEET_LIMIT - headerPrefix.length - linkSpace;

    let textSnippet = section.text;
    if (textSnippet.length > maxTextSpace) {
        textSnippet = textSnippet.substring(0, maxTextSpace - 3) + '...';
    }

    tweetTextarea.value = `${headerPrefix}${textSnippet} ${link}`;
    
    // Show Modal
    tweetModal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // block scroll behind modal
    updateTweetCharCount();
    tweetTextarea.focus();
}

function hideModal() {
    tweetModal.style.display = 'none';
    document.body.style.overflow = ''; // restore scrolling
}

function updateTweetCharCount() {
    const rawLength = tweetTextarea.value.length;
    
    // We estimate the character count by simulating how Twitter treats the link.
    // We search the textarea for the original URL (activeTweetData.link) and replace its length with 23 in our count.
    let computedLength = rawLength;
    const url = activeTweetData.link;
    
    if (url && tweetTextarea.value.includes(url)) {
        // Find URL occurrences, subtract original length, and add 23
        const occurrences = (tweetTextarea.value.match(new RegExp(url.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g')) || []).length;
        computedLength = rawLength - (url.length * occurrences) + (TWITTER_LINK_COST * occurrences);
    } else {
        // If they deleted or edited the link, we add the link cost at the end if we expect them to attach it,
        // but since we include the link inline, we'll just check if there's any http link and count it as 23.
        const urlRegex = /https?:\/\/[^\s]+/g;
        const matches = tweetTextarea.value.match(urlRegex) || [];
        matches.forEach(m => {
            computedLength = computedLength - m.length + TWITTER_LINK_COST;
        });
    }

    charCountSpan.textContent = computedLength;
    
    if (computedLength > TWEET_LIMIT) {
        counterDisplay.classList.add('limit-exceeded');
        charWarningSpan.style.visibility = 'visible';
    } else {
        counterDisplay.classList.remove('limit-exceeded');
        charWarningSpan.style.visibility = 'hidden';
    }
}

// ==========================================================================
// Clipboard & Toast System Utilities
// ==========================================================================
function copyToClipboard(text, successMsg) {
    if (!navigator.clipboard) {
        // Fallback
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            showToast(successMsg, 'success');
        } catch (err) {
            showToast('Unable to copy text', 'error');
        }
        document.body.removeChild(textArea);
        return;
    }

    navigator.clipboard.writeText(text).then(() => {
        showToast(successMsg, 'success');
    }, (err) => {
        showToast('Failed to copy text', 'error');
    });
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Select Icon based on type
    let iconSvg = '';
    if (type === 'success') {
        iconSvg = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
            </svg>
        `;
    } else if (type === 'error') {
        iconSvg = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
        `;
    }

    toast.innerHTML = `
        ${iconSvg}
        <span>${message}</span>
        <button class="toast-close">&times;</button>
    `;

    toastContainer.appendChild(toast);

    // Auto-remove toast
    const autoRemove = setTimeout(() => {
        toast.style.animation = 'fadeIn 0.2s reverse ease-out';
        toast.addEventListener('animationend', () => toast.remove());
    }, 3500);

    // Manual close
    toast.querySelector('.toast-close').addEventListener('click', () => {
        clearTimeout(autoRemove);
        toast.remove();
    });
}

// ==========================================================================
// CSV Export logic
// ==========================================================================
function exportToCSV() {
    if (releaseNotes.length === 0) {
        showToast('No release notes available to export', 'error');
        return;
    }

    // Gather matched items
    const rows = [['Date', 'Category', 'Link', 'Content']];
    let matchedCount = 0;

    releaseNotes.forEach(entry => {
        entry.sections.forEach(sec => {
            // Category check
            const categoryMatch = (activeCategory === 'all' || sec.type.toLowerCase() === activeCategory.toLowerCase());
            
            // Search match
            const searchMatch = !searchQuery || 
                sec.type.toLowerCase().includes(searchQuery) || 
                sec.text.toLowerCase().includes(searchQuery) ||
                entry.date.toLowerCase().includes(searchQuery);

            if (categoryMatch && searchMatch) {
                // Escape CSV values
                const escapeCsv = (val) => {
                    if (val === null || val === undefined) return '';
                    let str = String(val);
                    // Replace double quotes with two double quotes
                    str = str.replace(/"/g, '""');
                    return `"${str}"`;
                };

                rows.push([
                    escapeCsv(entry.date),
                    escapeCsv(sec.type),
                    escapeCsv(entry.link),
                    escapeCsv(sec.text)
                ]);
                matchedCount++;
            }
        });
    });

    if (matchedCount === 0) {
        showToast('No matching release notes to export', 'error');
        return;
    }

    const csvContent = rows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    // Create clean filename based on filters
    let filename = 'bq_releases';
    if (activeCategory !== 'all') {
        filename += `_${activeCategory.toLowerCase()}`;
    }
    if (searchQuery) {
        filename += `_search_${searchQuery.replace(/[^a-z0-9]/gi, '_')}`;
    }
    filename += '.csv';

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(`Exported ${matchedCount} updates to CSV!`, 'success');
}

// ==========================================================================
// Theme Toggling (Light / Dark Mode)
// ==========================================================================
function initTheme() {
    const currentTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon(currentTheme);
    
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
    showToast(`Swapped to ${newTheme} mode!`, 'success');
}

function updateThemeIcon(theme) {
    if (!themeToggleBtn) return;
    if (theme === 'light') {
        // Show Moon Icon for switching to dark mode
        themeToggleBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
        `;
        themeToggleBtn.title = 'Switch to Dark Mode';
    } else {
        // Show Sun Icon for switching to light mode
        themeToggleBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
        `;
        themeToggleBtn.title = 'Switch to Light Mode';
    }
}
