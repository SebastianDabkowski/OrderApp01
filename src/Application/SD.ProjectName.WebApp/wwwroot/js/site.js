// Please see documentation at https://learn.microsoft.com/aspnet/core/client-side/bundling-and-minification
// for details on configuring this project to bundle and minify static web assets.

// Write your JavaScript code.

// Search suggestions with debounce
(function() {
    // Configuration (matching appsettings.json)
    const MIN_CHARACTERS = 2;
    const DEBOUNCE_MS = 300;

    let debounceTimer = null;
    let currentRequest = null;

    // Get search input element
    const searchInput = document.querySelector('input[name="q"]');
    if (!searchInput) return;

    // Create suggestions dropdown
    const suggestionsDropdown = document.createElement('div');
    suggestionsDropdown.className = 'search-suggestions';
    suggestionsDropdown.style.cssText = `
        position: absolute;
        background: white;
        border: 1px solid #dee2e6;
        border-top: none;
        border-radius: 0 0 0.25rem 0.25rem;
        max-height: 400px;
        overflow-y: auto;
        z-index: 1000;
        display: none;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `;

    // Position dropdown relative to search input
    searchInput.parentElement.style.position = 'relative';
    searchInput.parentElement.appendChild(suggestionsDropdown);

    // Set dropdown width to match input
    function updateDropdownWidth() {
        suggestionsDropdown.style.width = searchInput.offsetWidth + 'px';
        suggestionsDropdown.style.left = '0';
        suggestionsDropdown.style.top = searchInput.offsetHeight + 'px';
    }

    // Debounce function
    function debounce(func, delay) {
        return function(...args) {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => func.apply(this, args), delay);
        };
    }

    // Fetch suggestions from API
    async function fetchSuggestions(query) {
        // Cancel previous request if exists
        if (currentRequest) {
            currentRequest.abort();
        }

        const controller = new AbortController();
        currentRequest = controller;

        try {
            const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`, {
                signal: controller.signal
            });

            if (!response.ok) {
                console.error('Failed to fetch suggestions');
                return { categories: [], products: [] };
            }

            return await response.json();
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error fetching suggestions:', error);
            }
            return { categories: [], products: [] };
        } finally {
            currentRequest = null;
        }
    }

    // Render suggestions
    function renderSuggestions(data) {
        suggestionsDropdown.innerHTML = '';

        const hasResults = (data.categories && data.categories.length > 0) ||
                          (data.products && data.products.length > 0);

        if (!hasResults) {
            suggestionsDropdown.style.display = 'none';
            return;
        }

        updateDropdownWidth();

        // Render categories
        if (data.categories && data.categories.length > 0) {
            const categoryHeader = document.createElement('div');
            categoryHeader.style.cssText = 'padding: 0.5rem 1rem; font-weight: 600; font-size: 0.875rem; color: #6c757d; background: #f8f9fa;';
            categoryHeader.textContent = 'Categories';
            suggestionsDropdown.appendChild(categoryHeader);

            data.categories.forEach(item => {
                const suggestionItem = createSuggestionItem(item, 'category');
                suggestionsDropdown.appendChild(suggestionItem);
            });
        }

        // Render products
        if (data.products && data.products.length > 0) {
            const productHeader = document.createElement('div');
            productHeader.style.cssText = 'padding: 0.5rem 1rem; font-weight: 600; font-size: 0.875rem; color: #6c757d; background: #f8f9fa;';
            productHeader.textContent = 'Products';
            suggestionsDropdown.appendChild(productHeader);

            data.products.forEach(item => {
                const suggestionItem = createSuggestionItem(item, 'product');
                suggestionsDropdown.appendChild(suggestionItem);
            });
        }

        suggestionsDropdown.style.display = 'block';
    }

    // Create suggestion item element
    function createSuggestionItem(item, type) {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.style.cssText = 'padding: 0.5rem 1rem; cursor: pointer; border-bottom: 1px solid #f0f0f0;';
        div.setAttribute('data-type', type);
        div.setAttribute('data-text', item.text);

        const icon = type === 'category' ? '📁' : '🛍️';
        div.innerHTML = `<span style="margin-right: 0.5rem;">${icon}</span><span>${escapeHtml(item.text)}</span>`;

        // Hover effect
        div.addEventListener('mouseenter', function() {
            this.style.background = '#f8f9fa';
        });

        div.addEventListener('mouseleave', function() {
            this.style.background = 'white';
        });

        // Click handler
        div.addEventListener('click', function() {
            handleSuggestionClick(type, item.text);
        });

        return div;
    }

    // Handle suggestion click
    function handleSuggestionClick(type, text) {
        searchInput.value = text;
        suggestionsDropdown.style.display = 'none';

        if (type === 'category') {
            // Redirect to category browse page
            window.location.href = `/Categories/Browse?category=${encodeURIComponent(text)}`;
        } else {
            // Execute search
            searchInput.form.submit();
        }
    }

    // Escape HTML to prevent XSS
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Input event handler with debounce
    const handleInput = debounce(async function(event) {
        const query = event.target.value.trim();

        if (query.length < MIN_CHARACTERS) {
            suggestionsDropdown.style.display = 'none';
            return;
        }

        const suggestions = await fetchSuggestions(query);
        renderSuggestions(suggestions);
    }, DEBOUNCE_MS);

    // Attach event listeners
    searchInput.addEventListener('input', handleInput);

    // Hide suggestions when clicking outside
    document.addEventListener('click', function(event) {
        if (!searchInput.contains(event.target) && !suggestionsDropdown.contains(event.target)) {
            suggestionsDropdown.style.display = 'none';
        }
    });

    // Hide suggestions on escape key
    searchInput.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            suggestionsDropdown.style.display = 'none';
        }
    });

    // Update dropdown width on window resize
    window.addEventListener('resize', function() {
        if (suggestionsDropdown.style.display === 'block') {
            updateDropdownWidth();
        }
    });
})();

// Recently Viewed Products Management
(function() {
    const STORAGE_KEY = 'recentlyViewedProducts';
    const MAX_ITEMS = 10;

    // Get recently viewed products from localStorage
    function getRecentlyViewed() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error reading recently viewed products:', error);
            return [];
        }
    }

    // Save recently viewed products to localStorage
    function saveRecentlyViewed(products) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
        } catch (error) {
            console.error('Error saving recently viewed products:', error);
        }
    }

    // Add a product to recently viewed list
    function addRecentlyViewed(productId) {
        if (!productId || productId <= 0) {
            return;
        }

        let products = getRecentlyViewed();

        // Remove the product if it already exists (to move it to front)
        products = products.filter(id => id !== productId);

        // Add product to the beginning of the list
        products.unshift(productId);

        // Limit to MAX_ITEMS
        if (products.length > MAX_ITEMS) {
            products = products.slice(0, MAX_ITEMS);
        }

        saveRecentlyViewed(products);
    }

    // Get recently viewed product IDs as comma-separated string
    function getRecentlyViewedIds() {
        const products = getRecentlyViewed();
        return products.join(',');
    }

    // Clear all recently viewed products
    function clearRecentlyViewed() {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.error('Error clearing recently viewed products:', error);
        }
    }

    // Expose functions globally for use in Razor Pages
    window.RecentlyViewed = {
        add: addRecentlyViewed,
        get: getRecentlyViewed,
        getIds: getRecentlyViewedIds,
        clear: clearRecentlyViewed
    };
})();
