// --- Global Constants and Configuration ---
const appContent = document.getElementById('app-content');
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const body = document.body;
const installAppButton = document.getElementById('install-app-button');

let deferredPrompt;

let federalHolidaysData = [];
let allAcronymsData = []; // Store original acronyms data

// Carrier color definitions, including text classes for calendar heading
const CARRIER_COLORS = {
    'black': { name: 'Black', class: 'carrier-black', textClass: 'text-calendar-heading-black', baseDayOffIndex: 0 },
    'yellow': { name: 'Yellow', class: 'carrier-yellow', textClass: 'text-calendar-heading-yellow', baseDayOffIndex: 1 },
    'blue': { name: 'Blue', class: 'carrier-blue', textClass: 'text-calendar-heading-blue', baseDayOffIndex: 2 },
    'green': { name: 'Green', class: 'carrier-green', textClass: 'text-calendar-heading-green', baseDayOffIndex: 3 },
    'brown': { name: 'Brown', class: 'carrier-brown', textClass: 'text-calendar-heading-brown', baseDayOffIndex: 4 },
    'red': { name: 'Red', class: 'carrier-red', textClass: 'text-calendar-heading-red', baseDayOffIndex: 5 },
    'all': { name: 'All', class: 'carrier-sunday', textClass: 'text-calendar-heading-all' } // 'All' for Sunday highlight, matches new CSS text class
};

const PP_REFERENCE_DATE = new Date('2024-12-14T00:00:00'); // Start of PP 25-01 (Saturday)
const PP_REFERENCE_NUMBER = 1;
const PP_REFERENCE_YEAR = 2025;


// --- Theme Management ---
function applyTheme(theme) {
    body.classList.remove('theme-light', 'theme-dark');
    body.classList.add(`theme-${theme}`);
    themeIcon.classList.remove('fa-sun', 'fa-moon');
    themeIcon.classList.add(theme === 'light' ? 'fa-moon' : 'fa-sun');
    localStorage.setItem('mcore-theme', theme);
}

function toggleTheme() {
    const currentTheme = body.classList.contains('theme-dark') ? 'dark' : 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
}

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

// --- Data Fetching (Holidays & Acronyms) ---
async function fetchHolidays() {
    if (federalHolidaysData.length > 0) {
        return federalHolidaysData;
    }
    try {
        const response = await fetch('/mcore/data/holidays.json'); // Corrected path for GitHub Pages
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        federalHolidaysData = data;
        console.log('Federal Holidays loaded:', federalHolidaysData);
        return data;
    } catch (error) {
        console.error('Could not fetch federal holidays:', error);
        return [];
    }
}

async function fetchAcronymsData() { // Renamed to avoid conflict with renderAcronymsPage
    if (allAcronymsData.length > 0) {
        return allAcronymsData;
    }
    try {
        const response = await fetch('/mcore/data/acronyms.json'); // Corrected path for GitHub Pages
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        allAcronymsData = data;
        console.log('Acronyms loaded:', allAcronymsData);
        return data;
    } catch (error) {
        console.error('Could not fetch acronyms:', error);
        return [];
    }
}


// --- Date and Holiday Utilities ---
function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

function getDaysInMonth(month, year) {
    return new Date(year, month + 1, 0).getDate();
}

function getObservedHolidayDate(holidayDate) {
    let observedDate = new Date(holidayDate);
    if (observedDate.getDay() === 6) { // Saturday
        observedDate.setDate(observedDate.getDate() - 1); // Preceding Friday
    } else if (observedDate.getDay() === 0) { // Sunday
        observedDate.setDate(observedDate.getDate() + 1); // Following Monday
    }
    return observedDate;
}

function getFederalHoliday(date) {
    const year = date.getFullYear();
    for (const holiday of federalHolidaysData) {
        let actualHolidayDate;
        if (typeof holiday.day === 'string' && holiday.day.includes('monday')) {
            let tempDate = new Date(year, holiday.month - 1, 1);
            let count = 0;
            const targetDay = 1; // Monday
            const nth = parseInt(holiday.day.split('-')[0].replace('first', '1').replace('second', '2').replace('third', '3').replace('fourth', '4').replace('last', '0'));

            if (holiday.day === 'last-monday') {
                 tempDate = new Date(year, holiday.month, 0);
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
            actualHolidayDate = new Date(year, holiday.month - 1, holiday.day);
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
function getPostalWorkWeekNumber(date) {
    const cycleStart = new Date('2025-01-04T00:00:00'); // Saturday, Jan 4, 2025 (Week 1 of 2025 cycle)
    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayOfWeek = targetDate.getDay();
    if (dayOfWeek !== 6) {
        targetDate.setDate(targetDate.getDate() - (dayOfWeek + 1) % 7);
    }
    const diffTime = Math.abs(targetDate.getTime() - cycleStart.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7) + 1;
}

function getCarrierDayOff(date, carrierColor) {
    if (date.getDay() === 0) { // Sunday (0) is always a day off.
        return true;
    }
    if (!carrierColor) {
        return false;
    }

    const carrier = CARRIER_COLORS[carrierColor];
    if (!carrier) return false;

    const weekNumber = getPostalWorkWeekNumber(date);
    const rotatingDayOffIndex = (carrier.baseDayOffIndex + (weekNumber - 1)) % 6;
    const actualDayOfWeek = date.getDay();
    const expectedDayOffForDate = rotatingDayOffIndex + 1;

    return actualDayOfWeek === expectedDayOffForDate;
}

// --- Calendar Rendering ---
function generateMonthTile(month, year, selectedCarrier) {
    const today = new Date();
    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = getDaysInMonth(month, year);

    let startDay = firstDayOfMonth.getDay();
    const firstDayOffset = (startDay + 6) % 7;

    let daysHtml = '';
    for (let i = 0; i < firstDayOffset; i++) {
        daysHtml += '<div class="calendar-day other-month"></div>';
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month, day);
        let dayClasses = ['calendar-day'];
        let holidayHtml = '';
        let isOffDay = false;
        let highlightClasses = [];

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
            if (getCarrierDayOff(currentDate, selectedCarrier)) {
                isOffDay = true;
                highlightClasses.push(CARRIER_COLORS[selectedCarrier].class);
            }
        } else {
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

        const holiday = getFederalHoliday(currentDate);
        if (holiday) {
            holidayHtml = `<span class="holiday-symbol" data-holiday-name="${holiday.name}" data-holiday-info="${holiday.info}">★</span>`;
        }

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
                <div class="calendar-header-accent-line"></div>
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

async function renderCalendarPage(year, selectedCarrier = null) {
    await fetchHolidays();

    const currentYear = new Date().getFullYear();

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

    appContent.innerHTML = `
        <h2 class="text-3xl font-bold mb-6 text-center ${headingTextColorClass}">Carrier Calendar</h2>
        <div class="flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-4 mb-6">
            <div class="flex items-center space-x-4 text-lg font-semibold">
                <button id="prev-year-btn" class="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">&laquo; Previous</button>
                <span id="current-year-display" class="text-usps-blue">${year}</span>
                <button id="next-year-btn" class="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Next &raquo;</button>
                <button id="current-year-btn" class="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Current Year</button>
            </div>
        </div>
        <div class="grid grid-cols-7 gap-2 mb-6">
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

    function renderAllMonthTiles() {
        calendarGrid.innerHTML = '';
        const currentSelectedCarrier = document.querySelector('.carrier-color-button.selected')?.dataset.carrierColor || null;
        const currentSelectedYear = parseInt(document.getElementById('current-year-display').textContent);
        for (let i = 0; i < 12; i++) {
            calendarGrid.innerHTML += generateMonthTile(i, currentSelectedYear, currentSelectedCarrier);
        }
        attachHolidayLightboxListeners();
    }

    renderAllMonthTiles();

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

    document.querySelectorAll('.carrier-color-button').forEach(button => {
        button.addEventListener('click', (event) => {
            document.querySelectorAll('.carrier-color-button').forEach(btn => btn.classList.remove('selected'));
            event.currentTarget.classList.add('selected');
            const newCarrier = event.currentTarget.dataset.carrierColor || '';
            const currentSelectedYear = parseInt(document.getElementById('current-year-display').textContent);
            window.location.hash = `#calendar?year=${currentSelectedYear}&carrier=${newCarrier}`;
        });
    });

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

    function attachHolidayLightboxListeners() {
        document.querySelectorAll('.calendar-day[data-is-holiday="true"]').forEach(dayCell => {
            dayCell.replaceWith(dayCell.cloneNode(true));
        });

        document.querySelectorAll('.calendar-day[data-is-holiday="true"]').forEach(dayCell => {
            dayCell.addEventListener('click', (event) => {
                const symbol = dayCell.querySelector('.holiday-symbol');
                const name = symbol ? symbol.dataset.holidayName : dayCell.dataset.holidayName;
                const info = symbol ? symbol.dataset.holidayInfo : dayCell.dataset.holidayInfo;
                if (name && info) {
                    openHolidayLightbox(name, info);
                }
            });
        });
    }

    if (!lightboxCloseBtn.__listenerAttached) {
        lightboxCloseBtn.addEventListener('click', closeHolidayLightbox);
        holidayLightbox.addEventListener('click', (event) => {
            if (event.target === holidayLightbox) {
                closeHolidayLightbox();
            }
        });
        lightboxCloseBtn.__listenerAttached = true;
    }
    renderAllMonthTiles();
}

// --- Pay Period Page Rendering ---
function getPayPeriodInfo(date) {
    const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffTime = checkDate.getTime() - PP_REFERENCE_DATE.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const payPeriodsPassed = Math.floor(diffDays / 14);

    let currentPayPeriodNumber = PP_REFERENCE_NUMBER + payPeriodsPassed;
    let currentPayPeriodYear = PP_REFERENCE_YEAR;

    while (currentPayPeriodNumber > 26) {
        currentPayPeriodNumber -= 26;
        currentPayPeriodYear++;
    }
    while (currentPayPeriodNumber <= 0) {
        currentPayPeriodNumber += 26;
        currentPayPeriodYear--;
    }

    const ppStartDate = new Date(PP_REFERENCE_DATE);
    ppStartDate.setDate(PP_REFERENCE_DATE.getDate() + (payPeriodsPassed * 14));
    const ppEndDate = new Date(ppStartDate);
    ppEndDate.setDate(ppStartDate.getDate() + 13);
    const payDate = new Date(ppEndDate);
    payDate.setDate(ppEndDate.getDate() + 7);

    return {
        payPeriodYear: currentPayPeriodYear,
        payPeriodNumber: String(currentPayPeriodNumber).padStart(2, '0'),
        startDate: ppStartDate,
        endDate: ppEndDate,
        payDate: payDate
    };
}

function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
    });
}

function renderPayPeriodsPage(year) {
    let tableRowsHtml = '';
    const today = new Date();

    let startPPDate = new Date(year, 0, 1);
    let currentPPInfo = getPayPeriodInfo(startPPDate);

    let foundFirstPPOfYear = false;
    let initialDateForYear = new Date(year, 0, 1);
    let ppInfoIter = getPayPeriodInfo(initialDateForYear);

    while (ppInfoIter.payPeriodYear < year || (ppInfoIter.payPeriodYear === year && ppInfoIter.startDate.getFullYear() < year && !foundFirstPPOfYear)) {
        ppInfoIter.startDate.setDate(ppInfoIter.startDate.getDate() + 14);
        ppInfoIter = getPayPeriodInfo(ppInfoIter.startDate);
        if (ppInfoIter.payPeriodYear === year) {
            foundFirstPPOfYear = true;
        }
    }
    let currentDate = ppInfoIter.startDate;

    let count = 0;
    const maxPayPeriodsPerYear = 26;
    while (count < maxPayPeriodsPerYear + 2) {
        const ppInfo = getPayPeriodInfo(currentDate);

        if (ppInfo.payPeriodYear > year && ppInfo.payPeriodNumber > 5) {
            break;
        }

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

// --- Acronyms Page Rendering and Functionality ---
async function renderAcronymsPage() {
    await fetchAcronymsData(); // Fetch acronyms from JSON file

    appContent.innerHTML = `
        <h2 class="text-3xl font-bold mb-6 text-center text-usps-blue">Useful Acronyms</h2>
        <div class="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 mb-6">
            <input type="text" id="acronym-search" placeholder="Search acronyms..." class="p-2 border border-gray-300 rounded-md card-bg text-current w-full sm:w-1/2 md:w-1/3">
            <div class="flex space-x-2">
                <button id="sort-acronym-asc" class="p-2 rounded-md bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Sort A-Z</button>
                <button id="sort-acronym-desc" class="p-2 rounded-md bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Sort Z-A</button>
            </div>
        </div>
        <div class="overflow-x-auto rounded-lg shadow-lg">
            <table class="pay-period-table acronyms-table"> <!-- Added specific class for acronyms table -->
                <thead>
                    <tr>
                        <th>Acronym</th>
                        <th>Meaning</th>
                    </tr>
                </thead>
                <tbody id="acronyms-table-body">
                    <!-- Acronyms will be rendered here -->
                </tbody>
            </table>
        </div>
    `;

    const acronymsTableBody = document.getElementById('acronyms-table-body');
    const acronymsSearchInput = document.getElementById('acronym-search');
    const sortAcronymAscBtn = document.getElementById('sort-acronym-asc');
    const sortAcronymDescBtn = document.getElementById('sort-acronym-desc');

    let currentSortOrder = 'asc'; // 'asc' or 'desc'

    function sortAcronyms(data, order) {
        return data.sort((a, b) => {
            if (order === 'asc') {
                return a.acronym.localeCompare(b.acronym);
            } else {
                return b.acronym.localeCompare(a.acronym);
            }
        });
    }

    function renderAcronymsTable() {
        let filteredAcronyms = [...allAcronymsData]; // Filter from original data
        const searchTerm = acronymsSearchInput.value.toLowerCase();

        if (searchTerm) {
            filteredAcronyms = filteredAcronyms.filter(item =>
                item.acronym.toLowerCase().includes(searchTerm) ||
                item.meaning.toLowerCase().includes(searchTerm)
            );
        }

        const sortedAcronyms = sortAcronyms(filteredAcronyms, currentSortOrder);

        acronymsTableBody.innerHTML = sortedAcronyms.map(item => `
            <tr>
                <td class="font-semibold">${item.acronym}</td>
                <td>${item.meaning}</td>
            </tr>
        `).join('');
    }

    // Initial render
    renderAcronymsTable();

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


// --- Routing / Page Management ---
async function router() {
    const hash = window.location.hash;
    const urlParams = new URLSearchParams(hash.split('?')[1]);
    const currentYear = new Date().getFullYear();

    await fetchHolidays(); // Always fetch holidays as they are broadly used
    // Acronyms are now fetched by renderAcronymsPage()

    if (hash.startsWith('#calendar')) {
        const year = parseInt(urlParams.get('year')) || currentYear;
        const carrier = urlParams.get('carrier') || null;
        renderCalendarPage(year, carrier);
    } else if (hash.startsWith('#pay-periods')) {
        const year = parseInt(urlParams.get('year')) || currentYear;
        renderPayPeriodsPage(year);
    } else if (hash === '#acronyms') {
        renderAcronymsPage();
    } else if (hash === '#disclaimer') {
        renderDisclaimerPage();
    } else {
        renderLandingPage();
    }
}

// --- Page Rendering Functions (Landing, Disclaimer) ---
function renderLandingPage() {
    appContent.innerHTML = `
        <div class="text-center py-10">
            <h2 class="text-4xl font-extrabold mb-4 text-usps-blue">Welcome to mCORE</h2>
            <p class="text-xl mb-8">Your Mail Carrier Operational Resource & Encyclopedia</p>
            <p class="mb-4 max-w-2xl mx-auto">
                mCORE is a free, open-source tool built by a mail carrier, for mail carriers.
                It provides essential resources and and tools to help manage your schedule and understand pay periods,
                all designed to be minimalist, streamlined, and easy to use.
            </p>
            <p class="mb-8 max-w-2xl mx-auto">
                This application is not affiliated with the USPS or any union.
                It respects your privacy with no ads, no cost, and no user data sold.
            </p>
            <!-- Removed the three navigational buttons from landing page -->
            <div class="mt-8">
                <a href="#disclaimer" id="disclaimer-link" class="text-usps-blue underline hover:no-underline font-semibold">Terms & Conditions</a>
            </div>
            <div class="flex justify-center mt-8">
                <img src="/mcore/icons/mcore-logo.png" alt="mCORE Logo" class="h-16" onerror="this.onerror=null; this.src='https://placehold.co/64x64/0d6efd/ffffff?text=M';" />
            </div>
        </div>
    `;
}

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
                <div class="flex justify-center mt-8">
                    <img src="/mcore/icons/mcore-logo.png" alt="mCORE Logo" class="h-16" onerror="this.onerror=null; this.src='https://placehold.co/64x64/0d6efd/ffffff?text=M';" />
                </div>
            </div>
        </div>
    `;
}


// --- Event Listeners and Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initPreferences();
    router();

    document.getElementById('home-link').addEventListener('click', () => { window.location.hash = '#landing'; });
    document.getElementById('calendar-nav-link').addEventListener('click', () => { window.location.hash = '#calendar'; });
    document.getElementById('pay-periods-nav-link').addEventListener('click', () => { window.location.hash = '#pay-periods'; });
    document.getElementById('acronyms-nav-link').addEventListener('click', () => { window.location.hash = '#acronyms'; });

    window.addEventListener('hashchange', router);
    themeToggle.addEventListener('click', toggleTheme);

    appContent.addEventListener('click', (event) => {
        if (event.target.id === 'disclaimer-link') {
            event.preventDefault();
            window.location.hash = '#disclaimer';
        }
    });

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        // Show the install button only on mobile by default, as requested.
        // It's hidden by default in index.html, so we only need to make it block here.
        // The desktop nav structure will implicitly hide it on larger screens.
        installAppButton.style.display = 'block';
        console.log('beforeinstallprompt fired');
    });

    installAppButton.addEventListener('click', async () => {
        installAppButton.style.display = 'none';
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to the install prompt: ${outcome}`);
            deferredPrompt = null;
        }
    });

    window.addEventListener('appinstalled', () => {
        installAppButton.style.display = 'none';
        deferredPrompt = null;
        console.log('PWA was installed');
    });

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/mcore/service-worker.js') // Correct path for GitHub Pages subfolder
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                })
                .catch(err => {
                    console.log('ServiceWorker registration failed: ', err);
                });
        });
    }
});
