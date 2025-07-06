// Get references to key DOM elements
const appContent = document.getElementById('app-content');
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const body = document.body;
const installAppButton = document.getElementById('install-app-button');

// Variable to store the deferred prompt for PWA installation
let deferredPrompt;

// Arrays to hold fetched data, initialized as empty
let federalHolidaysData = [];
let allAcronymsData = [];
let nalcResourcesData = [];
let appConfig = {}; // Object to hold application configuration

// Configuration for carrier colors and their associated CSS classes
const CARRIER_COLORS = {
    'black': { name: 'Black', class: 'carrier-black', textClass: 'text-calendar-heading-black', baseDayOffIndex: 0 },
    'yellow': { name: 'Yellow', class: 'carrier-yellow', textClass: 'text-calendar-heading-yellow', baseDayOffIndex: 1 },
    'blue': { name: 'Blue', class: 'carrier-blue', textClass: 'text-calendar-heading-blue', baseDayOffIndex: 2 },
    'green': { name: 'Green', class: 'carrier-green', textClass: 'text-calendar-heading-green', baseDayOffIndex: 3 },
    'brown': { name: 'Brown', class: 'carrier-brown', textClass: 'text-calendar-heading-brown', baseDayOffIndex: 4 },
    'red': { name: 'Red', class: 'carrier-red', textClass: 'text-calendar-heading-red', baseDayOffIndex: 5 },
    'all': { name: 'All', class: 'carrier-sunday', textClass: 'text-calendar-heading-all' }
};

// Reference date for calculating pay periods (December 14, 2024, is PP1 for 2025)
const PP_REFERENCE_DATE = new Date('2024-12-14T00:00:00');
const PP_REFERENCE_NUMBER = 1; // Pay Period 1
const PP_REFERENCE_YEAR = 2025; // Year for the reference pay period

/**
 * Applies the specified theme to the document body.
 * @param {string} theme - The theme to apply ('light' or 'dark').
 */
function applyTheme(theme) {
    body.classList.remove('theme-light', 'theme-dark');
    body.classList.add(`theme-${theme}`);
    // The theme icon is now handled purely by CSS ::before pseudo-elements
    localStorage.setItem('mcore-theme', theme);
}

/**
 * Toggles the current theme between 'light' and 'dark'.
 */
function toggleTheme() {
    const currentTheme = body.classList.contains('theme-dark') ? 'dark' : 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
}

/**
 * Initializes the theme based on user's saved preference or system preference.
 */
function initPreferences() {
    const savedTheme = localStorage.getItem('mcore-theme');
    if (savedTheme) {
        applyTheme(savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        applyTheme('dark');
    } else {
        applyTheme('light');
    }
}

/**
 * Fetches the application configuration from app-config.json.
 * Caches the data to avoid multiple fetches.
 * @returns {Promise<Object>} A promise that resolves with the application configuration.
 */
async function fetchAppConfig() {
    // Return cached data if available
    if (Object.keys(appConfig).length > 0) {
        return appConfig;
    }
    try {
        // Use relative path as base href is set in index.html
        const response = await fetch('data/app-config.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        appConfig = data;
        console.log('App Config loaded:', appConfig);
        return data;
    } catch (error) {
        console.error('Could not fetch app config:', error);
        return {}; // Return empty object on error
    }
}

/**
 * Fetches federal holidays data from holidays.json.
 * Caches the data to avoid multiple fetches.
 * @returns {Promise<Array>} A promise that resolves with the federal holidays data.
 */
async function fetchHolidays() {
    // Return cached data if available
    if (federalHolidaysData.length > 0) {
        return federalHolidaysData;
    }
    try {
        // Use relative path as base href is set in index.html
        const response = await fetch('data/holidays.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        federalHolidaysData = data;
        console.log('Federal Holidays loaded:', federalHolidaysData);
        return data;
    } catch (error) {
        console.error('Could not fetch federal holidays:', error);
        return []; // Return empty array on error
    }
}

/**
 * Fetches acronyms data from acronyms.json.
 * Caches the data to avoid multiple fetches.
 * @returns {Promise<Array>} A promise that resolves with the acronyms data.
 */
async function fetchAcronymsData() {
    // Return cached data if available
    if (allAcronymsData.length > 0) {
        return allAcronymsData;
    }
    try {
        // Use relative path as base href is set in index.html
        const response = await fetch('data/acronyms.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        allAcronymsData = data;
        console.log('Acronyms loaded:', allAcronymsData);
        return data;
    } catch (error) {
        console.error('Could not fetch acronyms:', error);
        return []; // Return empty array on error
    }
}

/**
 * Fetches NALC resources data from nalc-resources.json.
 * Caches the data to avoid multiple fetches.
 * @returns {Promise<Array>} A promise that resolves with the NALC resources data.
 */
async function fetchNalcResourcesData() {
    // Return cached data if available
    if (nalcResourcesData.length > 0) {
        return nalcResourcesData;
    }
    try {
        // Use relative path as base href is set in index.html
        const response = await fetch('data/nalc-resources.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        nalcResourcesData = data;
        console.log('NALC Resources loaded:', nalcResourcesData);
        return data;
    } catch (error) {
        console.error('Could not fetch NALC resources:', error);
        return []; // Return empty array on error
    }
}

/**
 * Checks if a given year is a leap year.
 * @param {number} year - The year to check.
 * @returns {boolean} True if it's a leap year, false otherwise.
 */
function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * Gets the number of days in a given month and year.
 * @param {number} month - The month (0-indexed).
 * @param {number} year - The year.
 * @returns {number} The number of days in the month.
 */
function getDaysInMonth(month, year) {
    return new Date(year, month + 1, 0).getDate();
}

/**
 * Calculates the observed holiday date (if it falls on a weekend).
 * If Saturday, observed on Friday. If Sunday, observed on Monday.
 * @param {Date} holidayDate - The actual date of the holiday.
 * @returns {Date} The observed holiday date.
 */
function getObservedHolidayDate(holidayDate) {
    let observedDate = new Date(holidayDate);
    if (observedDate.getDay() === 6) { // Saturday
        observedDate.setDate(observedDate.getDate() - 1); // Observed on Friday
    } else if (observedDate.getDay() === 0) { // Sunday
        observedDate.setDate(observedDate.getDate() + 1); // Observed on Monday
    }
    return observedDate;
}

/**
 * Checks if a given date is a federal holiday and returns its information.
 * @param {Date} date - The date to check.
 * @returns {Object|null} Holiday object if it's a holiday, otherwise null.
 */
function getFederalHoliday(date) {
    const year = date.getFullYear();
    for (const holiday of federalHolidaysData) {
        let actualHolidayDate;

        // Handle holidays based on Nth day of the week (e.g., Martin Luther King, Jr. Day, Memorial Day)
        if (typeof holiday.day === 'string' && holiday.day.includes('monday')) {
            let tempDate = new Date(year, holiday.month - 1, 1); // Start of the month
            let count = 0;
            const targetDay = 1; // Monday
            const nth = parseInt(holiday.day.split('-')[0].replace('first', '1').replace('second', '2').replace('third', '3').replace('fourth', '4').replace('last', '0'));

            if (holiday.day === 'last-monday') {
                 // For last Monday, start from the end of the month
                 tempDate = new Date(year, holiday.month, 0); // Last day of the previous month (which is the month of the holiday)
                 while (tempDate.getDay() !== targetDay) {
                     tempDate.setDate(tempDate.getDate() - 1);
                 }
                 actualHolidayDate = tempDate;
            } else {
                while (count < nth) {
                    if (tempDate.getDay() === targetDay) {
                        count++;
                    }
                    if (count === nth) {
                        actualHolidayDate = tempDate;
                        break;
                    }
                    tempDate.setDate(tempDate.getDate() + 1);
                }
            }
        } else if (typeof holiday.day === 'string' && holiday.day.includes('thursday')) {
            // Handle holidays based on Nth Thursday (e.g., Thanksgiving)
            let tempDate = new Date(year, holiday.month - 1, 1);
            let count = 0;
            const targetDay = 4; // Thursday
            const nth = parseInt(holiday.day.split('-')[0].replace('first', '1').replace('second', '2').replace('third', '3').replace('fourth', '4'));

            while (count < nth) {
                if (tempDate.getDay() === targetDay) {
                    count++;
                }
                if (count === nth) {
                    actualHolidayDate = tempDate;
                    break;
                }
                tempDate.setDate(tempDate.getDate() + 1);
            }
        }
        else {
            // Handle fixed-date holidays
            actualHolidayDate = new Date(year, holiday.month - 1, holiday.day);
        }

        if (actualHolidayDate) {
            const observedHolidayDate = getObservedHolidayDate(actualHolidayDate);

            // Check if the given date matches the observed holiday date
            if (observedHolidayDate.getDate() === date.getDate() &&
                observedHolidayDate.getMonth() === date.getMonth() &&
                observedHolidayDate.getFullYear() === date.getFullYear()) {
                return {
                    name: holiday.name,
                    info: holiday.info || `Information for ${holiday.name} not available. Specific information regarding contract implications or labor laws would be displayed here in future enhancements.`
                };
            }
        }
    }
    return null; // Not a federal holiday
}

/**
 * Calculates the Postal Work Week number for a given date.
 * The cycle starts on January 4, 2025 (a Saturday).
 * @param {Date} date - The date to calculate the week number for.
 * @returns {number} The postal work week number.
 */
function getPostalWorkWeekNumber(date) {
    const cycleStart = new Date('2025-01-04T00:00:00'); // Reference start date (Saturday)
    let targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    // Adjust targetDate to the preceding Saturday if it's not Saturday
    const dayOfWeek = targetDate.getDay(); // 0 for Sunday, 6 for Saturday
    if (dayOfWeek !== 6) {
        // If it's Sunday (0), (0+1)%7 = 1, subtract 1 day to get Saturday
        // If it's Monday (1), (1+1)%7 = 2, subtract 2 days to get Saturday
        targetDate.setDate(targetDate.getDate() - (dayOfWeek + 1) % 7);
    }

    // Calculate difference in milliseconds and then days
    const diffTime = Math.abs(targetDate.getTime() - cycleStart.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Calculate week number (add 1 because week numbers are 1-indexed)
    return Math.floor(diffDays / 7) + 1;
}

/**
 * Determines if a given date is a day off for a specific carrier color.
 * Includes Sundays as automatic days off.
 * @param {Date} date - The date to check.
 * @param {string} carrierColor - The color of the carrier (e.g., 'black', 'yellow').
 * @returns {boolean} True if it's a day off, false otherwise.
 */
function getCarrierDayOff(date, carrierColor) {
    // Sundays are always days off
    if (date.getDay() === 0) {
        return true;
    }
    // If no specific carrier color is selected, no rotating day off applies
    if (!carrierColor) {
        return false;
    }

    const carrier = CARRIER_COLORS[carrierColor];
    if (!carrier) return false; // Invalid carrier color

    const weekNumber = getPostalWorkWeekNumber(date);
    // Calculate the rotating day off index based on base day off and week number
    // Modulo 6 because there are 6 rotating days (Mon-Sat)
    const rotatingDayOffIndex = (carrier.baseDayOffIndex + (weekNumber - 1)) % 6;
    const actualDayOfWeek = date.getDay(); // 1 for Monday, 6 for Saturday
    const expectedDayOffForDate = rotatingDayOffIndex + 1; // Convert 0-5 index to 1-6 day of week

    return actualDayOfWeek === expectedDayOffForDate;
}

/**
 * Generates the HTML for a single month tile in the calendar.
 * @param {number} month - The month (0-indexed).
 * @param {number} year - The year.
 * @param {string|null} selectedCarrier - The currently selected carrier color, or null for 'All'.
 * @returns {string} HTML string for the month tile.
 */
function generateMonthTile(month, year, selectedCarrier) {
    const today = new Date();
    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = getDaysInMonth(month, year);

    // Calculate the offset for the first day of the month (Monday is 0, Sunday is 6)
    let startDay = firstDayOfMonth.getDay(); // 0 for Sunday, 1 for Monday, etc.
    const firstDayOffset = (startDay + 6) % 7; // Adjust so Monday is the first column (0 offset)

    let daysHtml = '';
    // Add empty divs for days before the 1st of the month
    for (let i = 0; i < firstDayOffset; i++) {
        daysHtml += '<div class="calendar-day other-month"></div>';
    }

    // Generate HTML for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month, day);
        let dayClasses = ['calendar-day'];
        let holidayHtml = '';
        let isOffDay = false;
        let highlightClasses = [];

        // Add 'today' class if it's the current date
        if (currentDate.getDate() === today.getDate() &&
            currentDate.getMonth() === today.getMonth() &&
            currentDate.getFullYear() === today.getFullYear()) {
            dayClasses.push('today');
        }

        const isSunday = currentDate.getDay() === 0;

        if (isSunday) {
            isOffDay = true;
            highlightClasses.push('carrier-sunday');
        } else if (selectedCarrier) {
            // If a specific carrier is selected, check their day off
            if (getCarrierDayOff(currentDate, selectedCarrier)) {
                isOffDay = true;
                highlightClasses.push(CARRIER_COLORS[selectedCarrier].class);
            }
        } else {
            // If 'All' carriers are selected, highlight if ANY carrier has it off
            for (const colorKey in CARRIER_COLORS) {
                if (colorKey !== 'all' && getCarrierDayOff(currentDate, colorKey)) {
                    isOffDay = true;
                    highlightClasses.push(CARRIER_COLORS[colorKey].class);
                }
            }
        }

        if (isOffDay) {
            highlightClasses.push('day-off-highlight');
        }
        dayClasses.push(...highlightClasses);

        // Check for federal holidays
        const holiday = getFederalHoliday(currentDate);
        if (holiday) {
            // Add holiday symbol and data attributes for lightbox
            holidayHtml = `<span class="holiday-symbol" data-holiday-name="${holiday.name}" data-holiday-info="${holiday.info}">★</span>`;
        }

        // Add cursor style based on whether the day has interactive info
        if (holiday || isOffDay) {
            dayClasses.push('cursor-pointer');
        } else {
            dayClasses.push('cursor-default');
        }

        daysHtml += `
            <div class="${dayClasses.join(' ')}" data-date="${currentDate.toISOString().split('T')[0]}" ${holiday ? 'data-is-holiday="true"' : ''}>
                <span class="day-number">${day}</span>
                ${holidayHtml}
            </div>
        `;
    }

    const monthNames = ["January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"];
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    return `
        <div class="calendar-month-tile card-bg">
            <div class="calendar-header bg-usps-blue">
                ${monthNames[month]} ${year}
                <div class="calendar-header-accent-line"></div>
            </div>
            <div class="calendar-day-names">
                ${dayNames.map(name => `<span>${name}</span>`).join('')}
            </div>
            <div class="calendar-days">
                ${daysHtml}
            </div>
        </div>
    `;
}

/**
 * Scrolls the calendar view to the current day.
 */
function jumpToTodayOnCalendar() {
    const todayCell = document.querySelector('.calendar-day.today');
    if (todayCell) {
        setTimeout(() => {
            todayCell.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 200); // Small delay to allow rendering
    }
}

/**
 * Renders the calendar page with month tiles and carrier selection buttons.
 * @param {number} year - The year to display.
 * @param {string|null} selectedCarrier - The carrier color to highlight days off for, or null for 'All'.
 */
async function renderCalendarPage(year, selectedCarrier = null) {
    await fetchHolidays(); // Ensure holidays data is loaded

    const currentYear = new Date().getFullYear();

    // Build carrier selection buttons HTML
    let carrierButtonsHtml = `<button class="carrier-color-button ${CARRIER_COLORS['all'].class} ${selectedCarrier === null ? 'selected' : ''}" data-carrier-color="">
                                <span class="button-text">All</span>
                              </button>`;

    for (const key in CARRIER_COLORS) {
        if (key !== 'all') {
            const carrier = CARRIER_COLORS[key];
            carrierButtonsHtml += `
                <button class="carrier-color-button ${carrier.class} ${selectedCarrier === key ? 'selected' : ''}" data-carrier-color="${key}">
                    <span class="button-text">${carrier.name}</span>
                </button>
            `;
        }
    }

    const currentCarrierInfo = selectedCarrier ? CARRIER_COLORS[selectedCarrier] : CARRIER_COLORS['all'];
    const headingTextColorClass = currentCarrierInfo.textClass;

    // Set the main app content for the calendar page
    appContent.innerHTML = `
        <h2 class="page-title ${headingTextColorClass}">Carrier Calendar</h2>
        <div class="carrier-buttons-grid">
            ${carrierButtonsHtml}
        </div>
        <div class="calendar-controls-group">
            <div class="calendar-year-controls">
                <button id="prev-year-btn" class="nav-button">&laquo; Previous</button>
                <span id="current-year-display" class="current-year-display text-usps-blue">${year}</span>
                <button id="next-year-btn" class="nav-button">Next &raquo;</button>
                <button id="current-year-btn" class="nav-button">Current Year</button>
                <button id="today-calendar-btn" class="nav-button">Today</button>
            </div>
        </div>
        <div id="calendar-grid" class="calendar-grid">
            </div>
    `;

    // Get references to newly rendered elements
    const calendarGrid = document.getElementById('calendar-grid');
    const prevYearBtn = document.getElementById('prev-year-btn');
    const nextYearBtn = document.getElementById('next-year-btn');
    const currentYearBtn = document.getElementById('current-year-btn');
    const todayCalendarBtn = document.getElementById('today-calendar-btn');

    /**
     * Renders all 12 month tiles for the current year and selected carrier.
     */
    function renderAllMonthTiles() {
        calendarGrid.innerHTML = ''; // Clear existing tiles
        const currentSelectedCarrier = document.querySelector('.carrier-color-button.selected')?.dataset.carrierColor || null;
        const currentSelectedYear = parseInt(document.getElementById('current-year-display').textContent);
        for (let i = 0; i < 12; i++) {
            calendarGrid.innerHTML += generateMonthTile(i, currentSelectedYear, currentSelectedCarrier);
        }
        attachHolidayLightboxListeners(); // Re-attach listeners after rendering
    }

    renderAllMonthTiles(); // Initial render of month tiles

    // Event listeners for year navigation
    prevYearBtn.addEventListener('click', () => {
        const currentDisplayedYear = parseInt(document.getElementById('current-year-display').textContent);
        document.getElementById('current-year-display').textContent = currentDisplayedYear - 1;
        // Update URL hash to reflect new year and trigger re-render via router
        window.location.hash = `#calendar?year=${currentDisplayedYear - 1}&carrier=${selectedCarrier || ''}`;
    });
    nextYearBtn.addEventListener('click', () => {
        const currentDisplayedYear = parseInt(document.getElementById('current-year-display').textContent);
        document.getElementById('current-year-display').textContent = currentDisplayedYear + 1;
        window.location.hash = `#calendar?year=${currentDisplayedYear + 1}&carrier=${selectedCarrier || ''}`;
    });
    currentYearBtn.addEventListener('click', () => {
        document.getElementById('current-year-display').textContent = currentYear;
        window.location.hash = `#calendar?year=${currentYear}&carrier=${selectedCarrier || ''}`;
    });

    // Event listener for "Today" button
    todayCalendarBtn.addEventListener('click', () => {
        const currentDisplayedYear = parseInt(document.getElementById('current-year-display').textContent);
        const actualCurrentYear = new Date().getFullYear();

        if (currentDisplayedYear !== actualCurrentYear) {
            // If currently displayed year is not the current year, navigate there
            window.location.hash = `#calendar?year=${actualCurrentYear}`;
            setTimeout(jumpToTodayOnCalendar, 200); // Jump to today after navigation completes
        } else {
            jumpToTodayOnCalendar(); // Just jump if already in the current year
        }
    });

    // Event listeners for carrier color selection buttons
    document.querySelectorAll('.carrier-color-button').forEach(button => {
        button.addEventListener('click', (event) => {
            // Remove 'selected' class from all buttons
            document.querySelectorAll('.carrier-color-button').forEach(btn => btn.classList.remove('selected'));
            // Add 'selected' class to the clicked button
            event.currentTarget.classList.add('selected');
            const newCarrier = event.currentTarget.dataset.carrierColor || ''; // Get new carrier color
            const currentSelectedYear = parseInt(document.getElementById('current-year-display').textContent);
            // Update URL hash to trigger re-render with new carrier
            window.location.hash = `#calendar?year=${currentSelectedYear}&carrier=${newCarrier}`;
        });
    });

    // Get references to holiday lightbox elements
    const holidayLightbox = document.getElementById('holiday-lightbox');
    const lightboxCloseBtn = document.getElementById('lightbox-close-btn');
    const lightboxHolidayName = document.getElementById('lightbox-holiday-name');
    const lightboxHolidayInfo = document.getElementById('lightbox-holiday-info');

    /**
     * Opens the holiday lightbox with the given holiday name and information.
     * @param {string} name - The name of the holiday.
     * @param {string} info - Information about the holiday.
     */
    function openHolidayLightbox(name, info) {
        lightboxHolidayName.textContent = name;
        lightboxHolidayInfo.textContent = info;
        holidayLightbox.classList.add('active');
    }

    /**
     * Closes the holiday lightbox.
     */
    function closeHolidayLightbox() {
        lightboxHolidayName.textContent = '';
        lightboxHolidayInfo.textContent = '';
        holidayLightbox.classList.remove('active');
    }

    /**
     * Attaches click listeners to holiday symbols within calendar days to open the lightbox.
     * This needs to be called after month tiles are re-rendered.
     */
    function attachHolidayLightboxListeners() {
        // Re-clone nodes to ensure event listeners are properly attached/detached
        // This prevents multiple listeners on the same element after re-rendering
        document.querySelectorAll('.calendar-day[data-is-holiday="true"]').forEach(dayCell => {
            const oldDayCell = dayCell;
            const newDayCell = oldDayCell.cloneNode(true); // Clone the node
            oldDayCell.parentNode.replaceChild(newDayCell, oldDayCell); // Replace old with new
        });

        // Attach new listeners to the cloned nodes
        document.querySelectorAll('.calendar-day[data-is-holiday="true"]').forEach(dayCell => {
            dayCell.addEventListener('click', (event) => {
                const symbol = dayCell.querySelector('.holiday-symbol');
                const name = symbol ? symbol.dataset.holidayName : null;
                const info = symbol ? symbol.dataset.holidayInfo : null;
                if (name && info) {
                    openHolidayLightbox(name, info);
                }
            });
        });
    }

    // Attach global listeners for lightbox close button and overlay click once
    if (!lightboxCloseBtn.__listenerAttached) { // Prevent attaching multiple times
        lightboxCloseBtn.addEventListener('click', closeHolidayLightbox);
        holidayLightbox.addEventListener('click', (event) => {
            if (event.target === holidayLightbox) { // Close only if clicking on the overlay itself
                closeHolidayLightbox();
            }
        });
        lightboxCloseBtn.__listenerAttached = true;
    }
    renderAllMonthTiles(); // Initial render of month tiles
}

/**
 * Scrolls the pay period table to the current pay period row.
 */
function jumpToCurrentPayPeriod() {
    const currentPayPeriodRow = document.querySelector('.pay-period-table .current-pay-period-row');
    if (currentPayPeriodRow) {
        setTimeout(() => {
            currentPayPeriodRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 200); // Small delay to allow rendering
    }
}

/**
 * Calculates and returns information for the pay period containing the given date.
 * @param {Date} date - The date to find the pay period for.
 * @returns {Object} An object containing pay period year, number, start date, end date, and pay date.
 */
function getPayPeriodInfo(date) {
    const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()); // Normalize date to midnight
    const diffTime = checkDate.getTime() - PP_REFERENCE_DATE.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); // Difference in days
    const payPeriodsPassed = Math.floor(diffDays / 14); // Number of 2-week pay periods passed

    let currentPayPeriodNumber = PP_REFERENCE_NUMBER + payPeriodsPassed;
    let currentPayPeriodYear = PP_REFERENCE_YEAR;

    // Adjust pay period number and year if it goes beyond a 26-period cycle
    while (currentPayPeriodNumber > 26) {
        currentPayPeriodNumber -= 26;
        currentPayPeriodYear++;
    }
    while (currentPayPeriodNumber <= 0) {
        currentPayPeriodNumber += 26;
        currentPayPeriodYear--;
    }

    // Calculate start, end, and pay dates for the determined pay period
    const ppStartDate = new Date(PP_REFERENCE_DATE);
    ppStartDate.setDate(PP_REFERENCE_DATE.getDate() + (payPeriodsPassed * 14));
    const ppEndDate = new Date(ppStartDate);
    ppEndDate.setDate(ppStartDate.getDate() + 13); // 13 days after start date for a 14-day period
    const payDate = new Date(ppEndDate);
    payDate.setDate(ppEndDate.getDate() + 7); // Pay date is 7 days after end date

    return {
        payPeriodYear: currentPayPeriodYear,
        payPeriodNumber: String(currentPayPeriodNumber).padStart(2, '0'), // Format as two digits
        startDate: ppStartDate,
        endDate: ppEndDate,
        payDate: payDate
    };
}

/**
 * Formats a Date object into a readable string.
 * @param {Date} date - The date to format.
 * @returns {string} Formatted date string (e.g., "Mon, Jan 1, 2024").
 */
function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
    });
}

/**
 * Renders the pay periods page with a table of pay periods for a given year.
 * @param {number} year - The year to display pay periods for.
 */
function renderPayPeriodsPage(year) {
    let tableRowsHtml = '';
    const today = new Date();

    // Determine the first pay period that starts in or before the target year
    let initialDateForYear = new Date(year, 0, 1); // Start checking from Jan 1 of the target year
    let ppInfoIter = getPayPeriodInfo(initialDateForYear);

    // Adjust ppInfoIter backward until its start date is within or before the target year's start
    // This ensures we capture any pay periods that overlap the year boundary
    while (ppInfoIter.payPeriodYear < year || (ppInfoIter.payPeriodYear === year && ppInfoIter.startDate.getFullYear() < year && !foundFirstPPOfYear)) {
        ppInfoIter.startDate.setDate(ppInfoIter.startDate.getDate() - 14); // Go back one pay period
        ppInfoIter = getPayPeriodInfo(ppInfoIter.startDate);
    }
    // Ensure we start from the correct pay period for the given year
    while (ppInfoIter.payPeriodYear < year) {
         ppInfoIter.startDate.setDate(ppInfoIter.startDate.getDate() + 14);
         ppInfoIter = getPayPeriodInfo(ppInfoIter.startDate);
    }

    let currentDate = new Date(ppInfoIter.startDate); // Start iterating from this adjusted date

    let count = 0;
    const maxPayPeriodsPerYear = 26; // A typical year has 26 pay periods

    // Loop to generate pay periods, including those that might overlap year boundaries
    while (count < maxPayPeriodsPerYear + 2) { // Generate a few extra to catch overlaps
        const ppInfo = getPayPeriodInfo(currentDate);

        // Break if we've gone too far into the next year
        if (ppInfo.payPeriodYear > year && ppInfo.payPeriodNumber > 5) { // Arbitrary cutoff to prevent infinite loop
            break;
        }

        // Only include pay periods relevant to the current year
        if (ppInfo.payPeriodYear === year ||
            (ppInfo.payPeriodYear === year - 1 && ppInfo.endDate.getFullYear() === year) || // PP started last year, ends this year
            (ppInfo.payPeriodYear === year + 1 && ppInfo.startDate.getFullYear() === year)) { // PP starts this year, ends next year
            
            const isCurrentPayPeriod = today >= ppInfo.startDate && today <= ppInfo.endDate;
            const rowClasses = isCurrentPayPeriod ? 'current-pay-period-row' : '';

            tableRowsHtml += `
                <tr class="${rowClasses}">
                    <td>${ppInfo.payPeriodYear}-${ppInfo.payPeriodNumber}</td>
                    <td>${formatDate(ppInfo.startDate)}</td>
                    <td>${formatDate(ppInfo.endDate)}</td>
                    <td class="pay-date">${formatDate(ppInfo.payDate)}</td>
                </tr>
            `;
            count++;
        }
        currentDate.setDate(currentDate.getDate() + 14); // Move to the start of the next pay period
    }


    appContent.innerHTML = `
        <div class="page-content-wrapper align-center">
            <h2 class="page-title">Pay Periods</h2>
            <div class="pay-period-controls-group">
                <button id="prev-pp-year-btn" class="nav-button">&laquo; Previous Year</button>
                <span id="current-pp-year-display" class="current-year-display text-usps-blue">${year}</span>
                <button id="next-pp-year-btn" class="nav-button">Next Year &raquo;</button>
                <button id="current-pp-btn" class="nav-button">Current Year</button>
                <button id="today-pay-period-btn" class="nav-button">Today</button>
            </div>
            <div class="table-container">
                <table class="pay-period-table">
                    <thead>
                        <tr>
                            <th>Pay Period (YR-PP)</th>
                            <th>Pay Period Start</th>
                            <th>Pay Period End</th>
                            <th>Pay Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRowsHtml}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Get references to newly rendered elements
    const prevPPYearBtn = document.getElementById('prev-pp-year-btn');
    const nextPPYearBtn = document.getElementById('next-pp-year-btn');
    const currentPPBtn = document.getElementById('current-pp-btn');
    const todayPayPeriodBtn = document.getElementById('today-pay-period-btn');

    // Event listeners for pay period year navigation
    prevPPYearBtn.addEventListener('click', () => {
        const currentDisplayedYear = parseInt(document.getElementById('current-pp-year-display').textContent);
        window.location.hash = `#pay-periods?year=${currentDisplayedYear - 1}`;
    });
    nextPPYearBtn.addEventListener('click', () => {
        const currentDisplayedYear = parseInt(document.getElementById('current-pp-year-display').textContent);
        window.location.hash = `#pay-periods?year=${currentDisplayedYear + 1}`;
    });
    currentPPBtn.addEventListener('click', () => {
        const currentYear = new Date().getFullYear();
        window.location.hash = `#pay-periods?year=${currentYear}`;
    });

    // Event listener for "Today" button in pay periods
    todayPayPeriodBtn.addEventListener('click', () => {
        const currentDisplayedYear = parseInt(document.getElementById('current-pp-year-display').textContent);
        const actualCurrentYear = new Date().getFullYear();

        if (currentDisplayedYear !== actualCurrentYear) {
            window.location.hash = `#pay-periods?year=${actualCurrentYear}`;
            setTimeout(jumpToCurrentPayPeriod, 200);
        } else {
            jumpToCurrentPayPeriod();
        }
    });
}

/**
 * Renders the acronyms page with a searchable and sortable table.
 */
async function renderAcronymsPage() {
    await fetchAcronymsData(); // Ensure acronyms data is loaded

    appContent.innerHTML = `
        <div class="page-content-wrapper align-left">
            <h2 class="page-title">Useful Acronyms</h2>
            <div class="acronym-controls-group">
                <input type="text" id="acronym-search" placeholder="Search acronyms..." class="text-input search-input">
                <div class="sort-buttons-group">
                    <button id="sort-acronym-asc" class="nav-button">Sort A-Z</button>
                    <button id="sort-acronym-desc" class="nav-button">Sort Z-A</button>
                </div>
            </div>
            <div class="table-container">
                <table class="acronyms-table">
                    <thead>
                        <tr>
                            <th>Acronym</th>
                            <th>Meaning</th>
                        </tr>
                    </thead>
                    <tbody id="acronyms-table-body">
                        </tbody>
                </table>
            </div>
        </div>
    `;

    // Get references to newly rendered elements
    const acronymsTableBody = document.getElementById('acronyms-table-body');
    const acronymsSearchInput = document.getElementById('acronym-search');
    const sortAcronymAscBtn = document.getElementById('sort-acronym-asc');
    const sortAcronymDescBtn = document.getElementById('sort-acronym-desc');

    let currentSortOrder = 'asc'; // Default sort order

    /**
     * Sorts the acronyms data.
     * @param {Array} data - The array of acronyms to sort.
     * @param {string} order - The sort order ('asc' or 'desc').
     * @returns {Array} The sorted array.
     */
    function sortAcronyms(data, order) {
        return data.sort((a, b) => {
            if (order === 'asc') {
                return a.acronym.localeCompare(b.acronym);
            } else {
                return b.acronym.localeCompare(a.acronym);
            }
        });
    }

    /**
     * Renders the acronyms table based on current search term and sort order.
     */
    function renderAcronymsTable() {
        let filteredAcronyms = [...allAcronymsData]; // Create a copy to filter/sort

        const searchTerm = acronymsSearchInput.value.toLowerCase();

        // Apply search filter
        if (searchTerm) {
            filteredAcronyms = filteredAcronyms.filter(item =>
                item.acronym.toLowerCase().includes(searchTerm) ||
                item.meaning.toLowerCase().includes(searchTerm)
            );
        }

        const sortedAcronyms = sortAcronyms(filteredAcronyms, currentSortOrder);

        // Populate table body
        acronymsTableBody.innerHTML = sortedAcronyms.map(item => `
            <tr>
                <td class="font-semibold">${item.acronym}</td>
                <td>${item.meaning}</td>
            </tr>
        `).join('');
    }

    renderAcronymsTable(); // Initial render of the table

    // Event listeners for search and sort
    acronymsSearchInput.addEventListener('keyup', renderAcronymsTable);

    sortAcronymAscBtn.addEventListener('click', () => {
        currentSortOrder = 'asc';
        renderAcronymsTable();
    });

    sortAcronymDescBtn.addEventListener('click', () => {
        currentSortOrder = 'desc';
        renderAcronymsTable();
    });
}

/**
 * Handles routing based on the URL hash.
 */
async function router() {
    const hash = window.location.hash;
    const urlParams = new URLSearchParams(hash.split('?')[1]); // Parse URL parameters
    const currentYear = new Date().getFullYear();

    await fetchHolidays(); // Ensure holidays are loaded for calendar calculations

    // Check for direct carrier color hash (e.g., #calendar-black)
    const carrierMatch = hash.match(/^#calendar-([a-z]+)$/);
    if (carrierMatch) {
        const carrierColor = carrierMatch[1];
        if (CARRIER_COLORS[carrierColor]) {
            renderCalendarPage(currentYear, carrierColor);
            return;
        }
    }

    // Route based on hash
    if (hash.startsWith('#calendar')) {
        const year = parseInt(urlParams.get('year')) || currentYear;
        const carrier = urlParams.get('carrier') || null;
        renderCalendarPage(year, carrier);
    } else if (hash.startsWith('#resources')) {
        renderNalcResourcesPage();
    } else if (hash.startsWith('#acronyms')) {
        renderAcronymsPage();
    } else if (hash.startsWith('#pay-periods')) {
        const year = parseInt(urlParams.get('year')) || currentYear;
        renderPayPeriodsPage(year);
    } else if (hash === '#disclaimer') {
        renderDisclaimerPage();
    } else {
        renderLandingPage(); // Default to landing page
    }
}

/**
 * Renders the landing page content.
 */
function renderLandingPage() {
    appContent.innerHTML = `
        <div class="page-content-wrapper align-center">
            <h2 class="page-title">Welcome to mCORE</h2>
            <p class="homepage-description">
                <span class="acronym-highlight">M</span>ail <span class="acronym-highlight">C</span>arrier <span class="acronym-highlight">O</span>perational <span class="acronym-highlight">R</span>esource & <span class="acronym-highlight">E</span>ncyclopedia
            </p>
            <p class="homepage-info-text">
                No Ads<br>
				100% Free<br>
				Open-source<br>
				No Data Collection or Selling.<br>
				Works great offline, with optional web links.<br>

            </p>
            <div class="button-group">
                <a href="#disclaimer" id="disclaimer-link" class="button primary-button">Terms & Conditions</a>
            </div>
            <div class="logo-display-area">
                <!-- Image path is now relative to the base href -->
                <img src="icons/mcore-logo.png" alt="mCORE Logo" class="mcore-logo-large" onerror="this.onerror=null; this.src='https://placehold.co/64x64/0d6efd/ffffff?text=M';" />
            </div>
        </div>
    `;
}

/**
 * Renders the disclaimer/terms and conditions page.
 */
function renderDisclaimerPage() {
    appContent.innerHTML = `
        <div class="page-content-wrapper align-left">
            <h2 class="page-title">Terms & Conditions / Disclaimer of Responsibility</h2>
            <div class="disclaimer-content-area">
                <p class="info-text"><strong>Important Disclaimer:</strong> This mCORE application is provided for informational and reference purposes only. It is developed independently by a mail carrier, for ALL mail carriers, and is not affiliated with, endorsed by, or sponsored by the United States Postal Service (USPS), any labor union, or any other official entity.</p>
                <p class="info-text">While every effort has been made to ensure the accuracy of the information provided (including, but not limited to, calendar schedules, NALC Resource and federal holidays), this application does not constitute official guidance or legal advice. Postal regulations, labor laws, union contracts, and operational procedures are complex and subject to change.</p>
                <p class="info-text"><strong>Users are solely responsible for verifying all information presented in this application with official USPS sources, union representatives, and/or relevant legal counsel.</strong></p>
                <p class="info-text">The developer(s) of this application disclaim all liability for any errors or omissions in the content provided, or for any actions taken or not taken in reliance on the information contained herein. By using this application, you agree to these terms and understand that you use it at your own risk. The developer(s) shall not be liable for any direct, indirect, incidental, consequential, or punitive damages arising out of your access to, use of, or inability to use this application.</p>
                <p class="info-text">This application is provided "as is" without warranty of any kind, either express or implied, including, but not limited to, the implied warranties of merchantability, fitness for a particular purpose, or non-infringement.</p>
                <p class="info-text">Thank you for your understanding and continued dedication as a mail carrier.</p>
                <div class="button-group">
                    <a href="#landing" class="button primary-button">Back to Home</a>
                </div>
                <div class="logo-display-area">
                    <!-- Image path is now relative to the base href -->
                    <img src="icons/mcore-logo.png" alt="mCORE Logo" class="mcore-logo-large" onerror="this.onerror=null; this.src='https://placehold.co/64x64/0d6efd/ffffff?text=M';" />
                </div>
            </div>
        </div>
    `;
}

/**
 * Renders the NALC resources page.
 */
function renderNalcResourcesPage() {
    appContent.innerHTML = `
        <div class="page-content-wrapper align-left">
            <h2 class="page-title">Useful Resources</h2>
            <p class="info-text">This section provides links to publicly available resources from the National Association of Letter Carriers (NALC) and other relevant sources. Please note that mCORE is an independent application and is not affiliated with NALC or any union. Always verify information with official sources.</p>
            <ul id="nalc-resources-list" class="resource-list">
                </ul>
            <div class="button-group">
                <a href="#landing" class="button primary-button">Back to Home</a>
            </div>
        </div>
    `;
    const resourcesList = document.getElementById('nalc-resources-list');
    fetchNalcResourcesData().then(data => {
        if (data && data.length > 0) {
            resourcesList.innerHTML = data.map(item => `
                <li>
                    <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="resource-link">
                        ${item.title}
                    </a>
                    <p class="resource-description">${item.description}</p>
                </li>
            `).join('');
        } else {
            resourcesList.innerHTML = '<li>No resources available at this time.</li>';
        }
    });
}


// Event listener for when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', async () => {
    await fetchAppConfig(); // Load app configuration first

    // Set current year in footer
    const currentYearSpan = document.getElementById('current-year');
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }

    // Set app version in footer from config
    const appVersionSpan = document.getElementById('app-version');
    if (appVersionSpan && appConfig.version) {
        appVersionSpan.textContent = appConfig.version;
    }

    // Dynamically set contact email link
    const contactEmailLink = document.getElementById('contact-email-link');
    if (contactEmailLink) {
        const user = 'a.mailman.sam';
        const domain = 'gmail.com';
        const email = `mailto:${user}@${domain}`;
        contactEmailLink.href = email;
        contactEmailLink.textContent = 'Contact';
    }

    initPreferences(); // Initialize theme preferences
    router(); // Initial routing based on URL hash

    // Navigation link event listeners
    document.getElementById('home-link').addEventListener('click', () => { window.location.hash = '#landing'; });
    document.getElementById('calendar-nav-link').addEventListener('click', () => { window.location.hash = '#calendar'; });
    document.getElementById('resources-nav-link').addEventListener('click', () => { window.location.hash = '#resources'; });
    document.getElementById('acronyms-nav-link').addEventListener('click', () => { window.location.hash = '#acronyms'; });
    document.getElementById('pay-periods-nav-link').addEventListener('click', () => { window.location.hash = '#pay-periods'; });

    // Listen for hash changes to trigger routing
    window.addEventListener('hashchange', router);
    // Listen for theme toggle button clicks
    themeToggle.addEventListener('click', toggleTheme);

    // Event listener for the disclaimer link on the landing page (to prevent default hash behavior)
    appContent.addEventListener('click', (event) => {
        if (event.target.id === 'disclaimer-link') {
            event.preventDefault();
            window.location.hash = '#disclaimer';
        }
    });

    // PWA installation prompt handling
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault(); // Prevent the default prompt
        deferredPrompt = e; // Store the event for later use
        installAppButton.style.display = 'flex'; // Show the install button
        console.log('beforeinstallprompt fired');
    });

    installAppButton.addEventListener('click', async () => {
        installAppButton.style.display = 'none'; // Hide the button immediately
        if (deferredPrompt) {
            deferredPrompt.prompt(); // Show the installation prompt
            const { outcome } = await deferredPrompt.userChoice; // Wait for user's choice
            console.log(`User response to the install prompt: ${outcome}`);
            deferredPrompt = null; // Clear the prompt
        }
    });

    window.addEventListener('appinstalled', () => {
        installAppButton.style.display = 'none'; // Hide button if app is installed
        deferredPrompt = null;
        console.log('PWA was installed');
    });

    // Service Worker registration
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            // Register the service worker relative to the base href
            navigator.serviceWorker.register('service-worker.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                })
                .catch(err => {
                    console.log('ServiceWorker registration failed: ', err);
                });
        });
    }
});
