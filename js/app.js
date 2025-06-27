// --- Global Constants and Configuration ---
const appContent = document.getElementById('app-content');
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const body = document.body;
const installAppButton = document.getElementById('install-app-button'); // NEW: Get install button

let deferredPrompt; // NEW: To store the install prompt event

let federalHolidaysData = []; // To store fetched holiday data

// Carrier color definitions and their corresponding Tailwind classes for styling.
// The 'baseDayOffIndex' maps to an offset from Monday (0=Mon, 1=Tue, ..., 5=Sat).
// This is derived from the user's example where Green had Thursday off for week 1 of the cycle.
// Green off Thursday (index 3), so the order Black, Yellow, Blue, Green, Brown, Red
// maps to Mon, Tue, Wed, Thu, Fri, Sat for their initial (week 1) designated day off.
const CARRIER_COLORS = {
    'black': { name: 'Black', class: 'carrier-black', baseDayOffIndex: 0 }, // Monday
    'yellow': { name: 'Yellow', class: 'carrier-yellow', baseDayOffIndex: 1 }, // Tuesday
    'blue': { name: 'Blue', class: 'carrier-blue', baseDayOffIndex: 2 }, // Wednesday
    'green': { name: 'Green', class: 'carrier-green', baseDayOffIndex: 3 }, // Thursday
    'brown': { name: 'Brown', class: 'carrier-brown', baseDayOffIndex: 4 }, // Friday
    'red': { name: 'Red', class: 'carrier-red', baseDayOffIndex: 5 }, // Saturday
};

// Reference date for calculating pay periods.
// User stated: "Pay period 25-02 would be the second pay period of 2025(that starts in 2024),
// this period would contain the work weeks 12-28-24 to 01-03 and 01-04 to 01-10-25)".
// This implies PP 25-01 starts Dec 14, 2024.
const PP_REFERENCE_DATE = new Date('2024-12-14T00:00:00'); // Start of PP 25-01 (Saturday)
const PP_REFERENCE_NUMBER = 1; // Corresponds to PP 01
const PP_REFERENCE_YEAR = 2025; // This is PP 25-01


// --- Theme Management ---

/**
 * Applies the selected theme to the body and saves the preference.
 * @param {string} theme 'light' or 'dark'.
 */
function applyTheme(theme) {
    body.classList.remove('theme-light', 'theme-dark');
    body.classList.add(`theme-${theme}`);
    themeIcon.classList.remove('fa-sun', 'fa-moon');
    themeIcon.classList.add(theme === 'light' ? 'fa-moon' : 'fa-sun'); // Show moon for light, sun for dark
    localStorage.setItem('mcore-theme', theme);
}

/**
 * Toggles between light and dark themes.
 */
function toggleTheme() {
    const currentTheme = body.classList.contains('theme-dark') ? 'dark' : 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
}

// Initialize theme on page load
function initPreferences() {
    const savedTheme = localStorage.getItem('mcore-theme');
    if (savedTheme) {
        applyTheme(savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        // Default to dark if OS preference is dark
        applyTheme('dark');
    } else {
        applyTheme('light');
    }
    // Date coloring preference is no longer a user-selectable option, it always colors the box
}

// --- Data Fetching (Holidays) ---

/**
 * Fetches federal holiday data from the JSON file.
 * @returns {Promise<Array>} A promise that resolves with the holiday data.
 */
async function fetchHolidays() {
    if (federalHolidaysData.length > 0) {
        return federalHolidaysData; // Return cached data if already fetched
    }
    try {
        const response = await fetch('data/holidays.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        federalHolidaysData = data; // Cache the fetched data
        console.log('Federal Holidays loaded:', federalHolidaysData);
        return data;
    } catch (error) {
        console.error('Could not fetch federal holidays:', error);
        return []; // Return empty array on error
    }
}

// --- Date and Holiday Utilities ---

/**
 * Checks if a year is a leap year.
 * @param {number} year
 * @returns {boolean}
 */
function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * Returns the number of days in a given month of a given year.
 * @param {number} month (0-indexed)
 * @param {number} year
 * @returns {number}
 */
function getDaysInMonth(month, year) {
    return new Date(year, month + 1, 0).getDate();
}

/**
 * Adjusts holiday dates for observed days if they fall on a weekend.
 * If a holiday falls on a Saturday, it's observed on the preceding Friday.
 * If a holiday falls on a Sunday, it's observed on the following Monday.
 * @param {Date} holidayDate
 * @returns {Date} The observed holiday date.
 */
function getObservedHolidayDate(holidayDate) {
    let observedDate = new Date(holidayDate);
    if (observedDate.getDay() === 6) { // Saturday
        observedDate.setDate(observedDate.getDate() - 1); // Preceding Friday
    } else if (observedDate.getDay() === 0) { // Sunday
        observedDate.setDate(observedDate.getDate() + 1); // Following Monday
    }
    return observedDate;
}

/**
 * Checks if a given date is a Federal Holiday (observed).
 * Uses the fetched holiday data.
 * @param {Date} date - The date to check.
 * @returns {object|null} An object {name: string, info: string} if it's a holiday, otherwise null.
 */
function getFederalHoliday(date) {
    const year = date.getFullYear();
    for (const holiday of federalHolidaysData) {
        let actualHolidayDate;
        // Handle floating holidays (e.g., "third-monday") from JSON
        if (typeof holiday.day === 'string' && holiday.day.includes('monday')) {
            let tempDate = new Date(year, holiday.month - 1, 1); // Start of month
            let count = 0;
            const targetDay = 1; // Monday
            const nth = parseInt(holiday.day.split('-')[0].replace('first', '1').replace('second', '2').replace('third', '3').replace('fourth', '4').replace('last', '0'));

            if (holiday.day === 'last-monday') {
                 tempDate = new Date(year, holiday.month, 0); // End of month
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
            let tempDate = new Date(year, holiday.month - 1, 1); // Start of month
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
            actualHolidayDate = new Date(year, holiday.month - 1, holiday.day); // month is 1-indexed in JSON
        }

        if (actualHolidayDate) {
            const observedHolidayDate = getObservedHolidayDate(actualHolidayDate);

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
    return null;
}

// --- Carrier Schedule Logic ---

/**
 * Calculates the work week number relative to the postal cycle start (Jan 4, 2025).
 * This date is chosen as it's the start of a postal work week (Saturday) and
 * helps align with the user's provided example for Green carrier.
 *
 * @param {Date} date - The date for which to calculate the work week.
 * @returns {number} The 1-indexed work week number since Jan 4, 2025.
 */
function getPostalWorkWeekNumber(date) {
    const cycleStart = new Date('2025-01-04T00:00:00'); // Saturday, Jan 4, 2025 (Week 1 of 2025 cycle)
    // Ensure both dates are at the start of the day for accurate diff
    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    // Adjust targetDate to the start of its work week (Saturday)
    // 0=Sun, 1=Mon, ..., 6=Sat
    const dayOfWeek = targetDate.getDay();
    if (dayOfWeek !== 6) { // If not Saturday
        targetDate.setDate(targetDate.getDate() - (dayOfWeek + 1) % 7); // Go back to previous Saturday
    }

    const diffTime = Math.abs(targetDate.getTime() - cycleStart.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    // Add 1 because the cycleStart day is Week 1, not Week 0
    // Divide by 7 as work week starts Saturday.
    return Math.floor(diffDays / 7) + 1;
}

/**
 * Determines if a given date is a designated day off for a specific carrier.
 * Everyone has Sunday off. The other day off rotates.
 *
 * @param {Date} date - The date to check.
 * @param {string} carrierColor - The color of the carrier (e.g., 'green').
 * @returns {boolean} True if the date is a day off for the carrier, false otherwise.
 */
function getCarrierDayOff(date, carrierColor) {
    if (date.getDay() === 0) { // Sunday (0) is always a day off.
        return true;
    }
    if (!carrierColor) { // If 'All' is selected, only Sundays are guaranteed off by this function
        return false;
    }

    const carrier = CARRIER_COLORS[carrierColor];
    if (!carrier) return false;

    // For the rotating day off:
    // The designated day off (DTO) shifts one day forward each week in a 6-day cycle (Mon-Sat).
    // Calculate the 1-indexed work week number relative to the cycle start (Jan 4, 2025).
    const weekNumber = getPostalWorkWeekNumber(date);

    // Calculate the current rotating day off for the carrier.
    // (carrier's base DTO index + (current week - 1)) % 6
    // The result is 0=Mon, 1=Tue, ..., 5=Sat.
    const rotatingDayOffIndex = (carrier.baseDayOffIndex + (weekNumber - 1)) % 6;

    // Convert rotatingDayOffIndex to Date.getDay() format (0=Sun, 1=Mon, ..., 6=Sat)
    // Since our index is 0-5 for Mon-Sat, add 1 to match Date.getDay() for Mon-Sat.
    const actualDayOfWeek = date.getDay(); // 1 for Monday, ..., 6 for Saturday
    const expectedDayOffForDate = rotatingDayOffIndex + 1; // +1 because getDay() Mon=1

    return actualDayOfWeek === expectedDayOffForDate;
}

// --- Calendar Rendering ---

/**
 * Generates the HTML for a single month's calendar tile.
 * @param {number} month - The month (0-indexed, 0-11).
 * @param {number} year - The year.
 * @param {string|null} selectedCarrier - The carrier color for highlights, or null if showing all.
 * @returns {string} HTML string for the month tile.
*/
function generateMonthTile(month, year, selectedCarrier) {
    const today = new Date();
    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = getDaysInMonth(month, year);

    // Adjust firstDayOfMonth.getDay() to make Monday 0, Sunday 6 for easier grid alignment.
    let startDay = firstDayOfMonth.getDay(); // 0 (Sun) - 6 (Sat)
    const firstDayOffset = (startDay + 6) % 7; // Number of empty cells before 1st day (Mon=0, Sun=6)

    let daysHtml = '';
    // Add empty cells for days before the 1st of the month
    for (let i = 0; i < firstDayOffset; i++) {
        daysHtml += '<div class="calendar-day other-month"></div>';
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month, day);
        let dayClasses = ['calendar-day'];
        let holidayHtml = '';
        let isOffDay = false;
        let highlightClasses = []; // Collects all relevant classes for this day

        // Check for today's date
        if (currentDate.getDate() === today.getDate() &&
            currentDate.getMonth() === today.getMonth() &&
            currentDate.getFullYear() === today.getFullYear()) {
            dayClasses.push('today');
        }

        // Determine off-days and collect relevant highlight classes
        const isSunday = currentDate.getDay() === 0;

        if (isSunday) { // Sunday is always an off-day
            isOffDay = true;
            highlightClasses.push('carrier-sunday');
        } else if (selectedCarrier) {
            // If a specific carrier is selected, check if it's their rotating day off
            if (getCarrierDayOff(currentDate, selectedCarrier)) {
                isOffDay = true;
                highlightClasses.push(CARRIER_COLORS[selectedCarrier].class);
            }
        } else {
            // If "All" is selected (and it's not Sunday), check if it's an off-day for ANY carrier.
            // Collect all carrier classes that have this day off.
            for (const colorKey in CARRIER_COLORS) {
                if (getCarrierDayOff(currentDate, colorKey)) {
                    isOffDay = true; // At least one carrier has this day off
                    highlightClasses.push(CARRIER_COLORS[colorKey].class);
                }
            }
        }

        // If it's an off-day (Sunday or specific carrier day off), always add the general highlight class
        if (isOffDay) {
            highlightClasses.push('day-off-highlight');
        }

        // Add all collected highlight classes to the day's class list
        dayClasses.push(...highlightClasses);


        // Check for Federal Holidays
        const holiday = getFederalHoliday(currentDate);
        if (holiday) {
            holidayHtml = `<span class="holiday-symbol" data-holiday-name="${holiday.name}" data-holiday-info="${holiday.info}">★</span>`;
        }

        // Cursor logic: clickable if holiday or day-off, else default
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
            <div class="calendar-header bg-usps-blue text-white rounded-t-lg">
                ${monthNames[month]} ${year}
                <div class="calendar-header-accent-line"></div> <!-- Red accent line for monthly calendars -->
            </div>
            <div class="calendar-day-names">
                ${dayNames.map(name => `<span>${name}</span>`).join('')}
            </div>
            <div class="calendar-days flex-grow p-2">
                ${daysHtml}
            </div>
        </div>
    `;
}

/**
 * Renders the calendar page.
 * @param {number} year - The year to display.
 * @param {string|null} selectedCarrier - The carrier color key ('black', 'yellow', etc.) or null for 'All Colors'.
 */
async function renderCalendarPage(year, selectedCarrier = null) {
    // Ensure holidays are loaded before rendering
    await fetchHolidays();

    const currentYear = new Date().getFullYear();

    let carrierButtonsHtml = `<button class="carrier-color-button carrier-sunday-button ${selectedCarrier === null ? 'selected' : ''}" data-carrier-color="">
                                <span class="button-text">All</span>
                              </button>`;

    for (const key in CARRIER_COLORS) {
        const carrier = CARRIER_COLORS[key];
        carrierButtonsHtml += `
            <button class="carrier-color-button ${carrier.class} ${selectedCarrier === key ? 'selected' : ''}" data-carrier-color="${key}">
                <span class="button-text">${carrier.name}</span>
            </button>
        `;
    }


    appContent.innerHTML = `
        <h2 class="text-3xl font-bold mb-6 text-center text-usps-blue">Carrier Calendar</h2>
        <div class="flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-4 mb-6">
            <!-- Year Navigation -->
            <div class="flex items-center space-x-4 text-lg font-semibold">
                <button id="prev-year-btn" class="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">&laquo; Previous</button>
                <span id="current-year-display" class="text-usps-blue">${year}</span>
                <button id="next-year-btn" class="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Next &raquo;</button>
                <button id="current-year-btn" class="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Current Year</button>
            </div>
        </div>
        <div class="grid grid-cols-7 gap-2 mb-6"> <!-- UPDATED: Used CSS Grid for 7 columns -->
            <!-- Carrier Color Selection Buttons (Text-only) -->
            ${carrierButtonsHtml}
        </div>
        <div id="calendar-grid" class="calendar-grid">
            <!-- Monthly calendar tiles will be rendered here by JS -->
        </div>
    `;

    const calendarGrid = document.getElementById('calendar-grid');
    const prevYearBtn = document.getElementById('prev-year-btn');
    const nextYearBtn = document.getElementById('next-year-btn');
    const currentYearBtn = document.getElementById('current-year-btn');


    /**
     * Renders all 12 month tiles for the selected year and carrier.
     */
    function renderAllMonthTiles() {
        calendarGrid.innerHTML = ''; // Clear previous content
        const currentSelectedCarrier = document.querySelector('.carrier-color-button.selected')?.dataset.carrierColor || null;
        const currentSelectedYear = parseInt(document.getElementById('current-year-display').textContent);
        for (let i = 0; i < 12; i++) {
            calendarGrid.innerHTML += generateMonthTile(i, currentSelectedYear, currentSelectedCarrier);
        }
        attachHolidayLightboxListeners(); // Re-attach listeners after rendering new tiles
    }

    // Initial render of month tiles
    renderAllMonthTiles();

    // Event listeners for year navigation
    prevYearBtn.addEventListener('click', () => {
        const currentDisplayedYear = parseInt(document.getElementById('current-year-display').textContent);
        document.getElementById('current-year-display').textContent = currentDisplayedYear - 1;
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

    // Event listeners for carrier color buttons
    document.querySelectorAll('.carrier-color-button').forEach(button => {
        button.addEventListener('click', (event) => {
            document.querySelectorAll('.carrier-color-button').forEach(btn => btn.classList.remove('selected'));
            event.currentTarget.classList.add('selected');
            const newCarrier = event.currentTarget.dataset.carrierColor || '';
            const currentSelectedYear = parseInt(document.getElementById('current-year-display').textContent);
            window.location.hash = `#calendar?year=${currentSelectedYear}&carrier=${newCarrier}`;
        });
    });


    // --- Holiday Lightbox Logic ---
    const holidayLightbox = document.getElementById('holiday-lightbox');
    const lightboxCloseBtn = document.getElementById('lightbox-close-btn');
    const lightboxHolidayName = document.getElementById('lightbox-holiday-name');
    const lightboxHolidayInfo = document.getElementById('lightbox-holiday-info');

    function openHolidayLightbox(name, info) {
        lightboxHolidayName.textContent = name;
        lightboxHolidayInfo.textContent = info;
        holidayLightbox.classList.add('active');
    }

    function closeHolidayLightbox() {
        lightboxHolidayName.textContent = '';
        lightboxHolidayInfo.textContent = '';
        holidayLightbox.classList.remove('active');
    }

    // Attach event listeners to holiday symbols
    function attachHolidayLightboxListeners() {
        document.querySelectorAll('.calendar-day[data-is-holiday="true"]').forEach(dayCell => {
            // Remove existing listeners to prevent duplicates
            dayCell.replaceWith(dayCell.cloneNode(true));
        });

        document.querySelectorAll('.calendar-day[data-is-holiday="true"]').forEach(dayCell => {
            dayCell.addEventListener('click', (event) => {
                // Find the holiday symbol or rely on data attributes from the day cell itself
                const symbol = dayCell.querySelector('.holiday-symbol');
                const name = symbol ? symbol.dataset.holidayName : dayCell.dataset.holidayName;
                const info = symbol ? symbol.dataset.holidayInfo : dayCell.dataset.holidayInfo;
                if (name && info) {
                    openHolidayLightbox(name, info);
                }
            });
        });
    }

    // Ensure listeners are only attached once for the lightbox controls themselves
    if (!lightboxCloseBtn.__listenerAttached) {
        lightboxCloseBtn.addEventListener('click', closeHolidayLightbox);
        holidayLightbox.addEventListener('click', (event) => {
            if (event.target === holidayLightbox) { // Close if clicking outside the content
                closeHolidayLightbox();
            }
        });
        lightboxCloseBtn.__listenerAttached = true;
    }

    // Re-render immediately to update based on current hash parameters
    renderAllMonthTiles();
}

// --- Pay Period Page Rendering ---

/**
 * Calculates the pay period information for a given date.
 * Assumes pay period 25-01 starts on Dec 14, 2024.
 * @param {Date} date - The date for which to get pay period info.
 * @returns {object} Contains payPeriodYear, payPeriodNumber, startDate, endDate, payDate.
 */
function getPayPeriodInfo(date) {
    // Ensure the input date is treated as the start of the day
    const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    // Calculate days passed from the reference date (Dec 14, 2024 for PP 25-01)
    const diffTime = checkDate.getTime() - PP_REFERENCE_DATE.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); // Integer days passed

    // Each pay period is 14 days long.
    // Calculate how many full 14-day cycles have passed since the reference.
    const payPeriodsPassed = Math.floor(diffDays / 14);

    // Determine the base period number and year from the reference.
    let currentPayPeriodNumber = PP_REFERENCE_NUMBER + payPeriodsPassed;
    let currentPayPeriodYear = PP_REFERENCE_YEAR;

    // Adjust for year rollover (26 pay periods per 'year cycle')
    while (currentPayPeriodNumber > 26) {
        currentPayPeriodNumber -= 26;
        currentPayPeriodYear++;
    }
    while (currentPayPeriodNumber <= 0) { // Handle going backwards before 25-01
        currentPayPeriodNumber += 26;
        currentPayPeriodYear--;
    }


    // Calculate the start date of this pay period
    const ppStartDate = new Date(PP_REFERENCE_DATE);
    ppStartDate.setDate(PP_REFERENCE_DATE.getDate() + (payPeriodsPassed * 14));

    // Calculate the end date (13 days after start)
    const ppEndDate = new Date(ppStartDate);
    ppEndDate.setDate(ppStartDate.getDate() + 13);

    // Calculate the pay date (Thursday after the end of the pay period)
    // If PP ends Friday (day 5), next Thursday is 6 days later.
    const payDate = new Date(ppEndDate);
    payDate.setDate(ppEndDate.getDate() + 6); // Add 6 days to get to next Thursday

    return {
        payPeriodYear: currentPayPeriodYear,
        payPeriodNumber: String(currentPayPeriodNumber).padStart(2, '0'), // Format as 01, 02, etc.
        startDate: ppStartDate,
        endDate: ppEndDate,
        payDate: payDate
    };
}

/**
 * Formats a Date object into a readable string (e.g., "Mon, Jan 1, 2025").
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
    });
}

/**
 * Renders the Pay Periods page for a specific year.
 * @param {number} year - The year for which to display pay periods.
 */
function renderPayPeriodsPage(year) {
    let tableRowsHtml = '';
    const today = new Date();

    // Find the first pay period that *starts* in the requested year or before,
    // but its pay period number corresponds to the requested year's cycle.
    // We can iterate backwards from the beginning of the target year's PP 01 (which could be in previous year)
    let startPPDate = new Date(year, 0, 1); // Start of year
    let currentPPInfo = getPayPeriodInfo(startPPDate);

    // If the first day of the year falls into a PP belonging to the *previous* PP_REFERENCE_YEAR,
    // we need to advance to the next PP.
    // Loop until we find a pay period that starts within or after the target year's "first" pay period.
    // Given the PP_REFERENCE_DATE (Dec 14, 2024 for PP 25-01), the loop below should naturally find the correct starting point.

    // Calculate the start date of the first pay period *for* this 'year'
    // This is a bit tricky because PP's span years. We need to find the PP where the PP_REFERENCE_YEAR
    // matches the requested year, or the first PP of the requested year if its PP_REFERENCE_YEAR is the previous.
    let foundFirstPPOfYear = false;
    let initialDateForYear = new Date(year, 0, 1); // Start of target year
    let ppInfoIter = getPayPeriodInfo(initialDateForYear);

    // If the first day of the year falls into a PP belonging to the *previous* PP_REFERENCE_YEAR,
    // we need to advance to the next PP.
    while (ppInfoIter.payPeriodYear < year || (ppInfoIter.payPeriodYear === year && ppInfoIter.startDate.getFullYear() < year && !foundFirstPPOfYear)) {
        ppInfoIter.startDate.setDate(ppInfoIter.startDate.getDate() + 14); // Move to start of next PP
        ppInfoIter = getPayPeriodInfo(ppInfoIter.startDate);
        if (ppInfoIter.payPeriodYear === year) {
            foundFirstPPOfYear = true;
        }
    }
    // Now ppInfoIter holds the first relevant pay period for the given year.
    let currentDate = ppInfoIter.startDate;


    // Generate pay periods for the selected year
    let count = 0;
    const maxPayPeriodsPerYear = 26; // There are usually 26 pay periods in a cycle year
    while (count < maxPayPeriodsPerYear + 2) { // Generate slightly more than a year to cover overlaps
        const ppInfo = getPayPeriodInfo(currentDate);

        // Break if we've gone too far into the next year AND past its first few PPs
        if (ppInfo.payPeriodYear > year && ppInfo.payPeriodNumber > 5) { // Arbitrary cutoff to prevent infinite loop or excessive PPs
            break;
        }

        // Only add rows that are relevant to the current year or overlap significantly
        if (ppInfo.payPeriodYear === year || (ppInfo.payPeriodYear === year - 1 && ppInfo.endDate.getFullYear() === year) || (ppInfo.payPeriodYear === year + 1 && ppInfo.startDate.getFullYear() === year)) {
            const isCurrentPayPeriod = today >= ppInfo.startDate && today <= ppInfo.endDate;
            const rowClasses = isCurrentPayPeriod ? 'bg-blue-100 dark:bg-blue-900' : '';

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

        // Move to the start of the current pay period
        currentDate.setDate(currentDate.getDate() + 14);
    }


    appContent.innerHTML = `
        <h2 class="text-3xl font-bold mb-6 text-center text-usps-blue">Pay Periods</h2>
        <div class="flex items-center justify-center space-x-4 mb-6 text-lg font-semibold">
            <button id="prev-pp-year-btn" class="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">&laquo; Previous Year</button>
            <span id="current-pp-year-display" class="text-usps-blue">${year}</span>
            <button id="next-pp-year-btn" class="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Next Year &raquo;</button>
            <button id="current-pp-btn" class="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Current Year</button>
        </div>
        <div class="overflow-x-auto rounded-lg shadow-lg">
            <table class="pay-period-table">
                <thead>
                    <tr>
                        <th>Pay Period (YR-PP)</th>
                        <th>Work Week Start</th>
                        <th>Work Week End</th>
                        <th>Pay Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRowsHtml}
                </tbody>
            </table>
        </div>
    `;

    const prevPPYearBtn = document.getElementById('prev-pp-year-btn');
    const nextPPYearBtn = document.getElementById('next-pp-year-btn');
    const currentPPBtn = document.getElementById('current-pp-btn');

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
}

// --- Routing / Page Management ---

/**
 * Handles routing based on the URL hash.
 * Renders the appropriate page content.
 */
async function router() {
    const hash = window.location.hash;
    const urlParams = new URLSearchParams(hash.split('?')[1]);
    const currentYear = new Date().getFullYear();

    // Ensure holidays are loaded before rendering any content that needs them
    await fetchHolidays();

    if (hash.startsWith('#calendar')) {
        const year = parseInt(urlParams.get('year')) || currentYear;
        const carrier = urlParams.get('carrier') || null;
        renderCalendarPage(year, carrier);
    } else if (hash.startsWith('#pay-periods')) {
        const year = parseInt(urlParams.get('year')) || currentYear;
        renderPayPeriodsPage(year);
    } else if (hash === '#disclaimer') {
        renderDisclaimerPage();
    } else { // Default to landing if no hash or unknown hash
        renderLandingPage();
    }
}

/**
 * Renders the landing page content.
 */
function renderLandingPage() {
    appContent.innerHTML = `
        <div class="text-center py-10">
            <h2 class="text-4xl font-extrabold mb-4 text-usps-blue">Welcome to mCORE</h2>
            <p class="text-xl mb-8">Your Mail Carrier Operational Resource & Encyclopedia</p>
            <p class="mb-4 max-w-2xl mx-auto">
                mCORE is a free, open-source tool built by a mail carrier, for mail carriers.
                It provides essential resources and tools to help manage your schedule and understand pay periods,
                all designed to be minimalist, streamlined, and easy to use.
            </p>
            <p class="mb-8 max-w-2xl mx-auto">
                This application is not affiliated with the USPS or any union.
                It respects your privacy with no ads, no cost, and no user data sold.
            </p>
            <div class="flex justify-center space-x-4">
                <a href="#calendar" class="inline-block bg-usps-blue text-white py-3 px-6 rounded-lg text-lg font-semibold shadow-md hover:opacity-90 transition-opacity duration-300">
                    View Calendar
                </a>
                <a href="#pay-periods" class="inline-block bg-gray-200 text-gray-800 py-3 px-6 rounded-lg text-lg font-semibold shadow-md hover:bg-gray-300 transition-colors duration-300">
                    Check Pay Periods
                </a>
            </div>
            <div class="mt-8">
                <a href="#disclaimer" id="disclaimer-link" class="text-usps-blue underline hover:no-underline font-semibold">Terms & Conditions</a>
            </div>
            <!-- NEW: mCORE Logo below Terms and Conditions on main landing page -->
            <div class="flex justify-center mt-8">
                <img src="icons/mcore-logo.png" alt="mCORE Logo" class="h-16" onerror="this.onerror=null; this.src='https://placehold.co/64x64/0d6efd/ffffff?text=M';" />
            </div>
        </div>
    `;
}

/**
 * Renders the Disclaimer page content.
 */
function renderDisclaimerPage() {
    appContent.innerHTML = `
        <div class="text-center py-10">
            <h2 class="text-3xl font-bold mb-6 text-usps-blue">Terms & Conditions / Disclaimer of Responsibility</h2>
            <div class="text-left max-w-3xl mx-auto space-y-4">
                <p><strong>Important Disclaimer:</strong> This mCORE application is provided for informational and reference purposes only. It is developed independently by a mail carrier, for mail carriers, and is not affiliated with, endorsed by, or sponsored by the United States Postal Service (USPS), any labor union, or any other official entity.</p>
                <p>While every effort has been made to ensure the accuracy of the information provided (including, but not limited to, calendar schedules, a, and federal holidays), this application does not constitute official guidance or legal advice. Postal regulations, labor laws, union contracts, and operational procedures are complex and subject to change.</p>
                <p><strong>Users are solely responsible for verifying all information presented in this application with official USPS sources, union representatives, and/or relevant legal counsel.</strong></p>
                <p>The developer(s) of this application disclaim all liability for any errors or omissions in the content provided, or for any actions taken or not taken in reliance on the information contained herein. By using this application, you agree to these terms and understand that you use it at your own risk. The developer(s) shall not be liable for any direct, indirect, incidental, consequential, or punitive damages arising out of your access to, use of, or inability to use this application.</p>
                <p>This application is provided "as is" without warranty of any kind, either express or implied, including, but not limited to, the implied warranties of merchantability, fitness for a particular purpose, or non-infringement.</p>
                <p class="mt-6">Thank you for your understanding and continued dedication as a mail carrier.</p>
                <div class="mt-8">
                    <a href="#landing" class="inline-block bg-usps-blue text-white py-2 px-4 rounded-lg text-md font-semibold shadow-md hover:opacity-90 transition-opacity duration-300">
                        Back to Home
                    </a>
                </div>
                <!-- mCORE Logo below Terms and Conditions (already here) -->
                <div class="flex justify-center mt-8">
                    <img src="icons/mcore-logo.png" alt="mCORE Logo" class="h-16" onerror="this.onerror=null; this.src='https://placehold.co/64x64/0d6efd/ffffff?text=M';" />
                </div>
            </div>
        </div>
    `;
}


// --- Event Listeners and Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    initPreferences(); // Set initial theme and date coloring preferences
    router(); // Load content based on URL hash

    // Attach event listeners for navigation links
    document.getElementById('home-link').addEventListener('click', () => {
        window.location.hash = '#landing';
    });
    document.getElementById('calendar-nav-link').addEventListener('click', () => {
        window.location.hash = '#calendar';
    });
    document.getElementById('pay-periods-nav-link').addEventListener('click', () => {
        window.location.hash = '#pay-periods';
    });

    // Listen for hash changes to navigate without full page reloads
    window.addEventListener('hashchange', router);

    // Theme toggle listener
    themeToggle.addEventListener('click', toggleTheme);

    // Handle disclaimer link specifically, as it's not in main nav
    // Use event delegation for dynamically added disclaimer link
    appContent.addEventListener('click', (event) => {
        if (event.target.id === 'disclaimer-link') {
            event.preventDefault(); // Prevent default link behavior
            window.location.hash = '#disclaimer';
        }
    });

    // --- PWA Install Event Listeners ---
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent Chrome 76 and later from showing the mini-infobar automatically
        e.preventDefault();
        // Stash the event so it can be triggered later.
        deferredPrompt = e;
        // Update UI to notify the user they can add to home screen
        installAppButton.style.display = 'block'; // Show the install button
        console.log('beforeinstallprompt fired');
    });

    installAppButton.addEventListener('click', async () => {
        // Hide the install button
        installAppButton.style.display = 'none';
        // Show the prompt
        if (deferredPrompt) {
            deferredPrompt.prompt();
            // Wait for the user to respond to the prompt
            const { outcome } = await deferredPrompt.userChoice;
            // Optionally, send analytics event with outcome of user choice
            console.log(`User response to the install prompt: ${outcome}`);
            // We've used the prompt, and can't use it again, clear it.
            deferredPrompt = null;
        }
    });

    window.addEventListener('appinstalled', () => {
        // Hide the app-provided install promotion
        installAppButton.style.display = 'none';
        // Clear the deferredPrompt so it can be garbage collected
        deferredPrompt = null;
        // Log install to analytics
        console.log('PWA was installed');
    });

    // --- Service Worker Registration ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                })
                .catch(err => {
                    console.log('ServiceWorker registration failed: ', err);
                });
        });
    }
});
