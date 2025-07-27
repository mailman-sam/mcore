// app.js

const appContent = document.getElementById('app-content');
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const body = document.body;
const installAppButton = document.getElementById('install-app-button');


let deferredPrompt;

let federalHolidaysData = [];
let allAcronymsData = [];
let allResourcesData = [];
let appConfig = {};

const MCORE_LOGO_FALLBACK_PATH = '/mcore/icons/mcore-logo-fallback.png';

const CARRIER_COLORS = {
    'black': { name: 'Black', class: 'carrier-black', textClass: 'text-calendar-heading-black', baseDayOffIndex: 0 },
    'yellow': { name: 'Yellow', class: 'carrier-yellow', textClass: 'text-calendar-heading-yellow', baseDayOffIndex: 1 },
    'blue': { name: 'Blue', class: 'carrier-blue', textClass: 'text-calendar-heading-blue', baseDayOffIndex: 2 },
    'green': { name: 'Green', class: 'carrier-green', textClass: 'text-calendar-heading-green', baseDayOffIndex: 3 },
    'brown': { name: 'Brown', class: 'carrier-brown', textClass: 'text-calendar-heading-brown', baseDayOffIndex: 4 },
    'red': { name: 'Red', class: 'carrier-red', textClass: 'text-calendar-heading-red', baseDayOffIndex: 5 },
    'all': { name: 'All', class: 'carrier-sunday', textClass: 'text-calendar-heading-all' }
};

const PP_REFERENCE_DATE = new Date('2024-12-14T00:00:00');
const PP_REFERENCE_NUMBER = 1;
const PP_REFERENCE_YEAR = 2025;

function applyTheme(theme) {
    body.classList.remove('theme-light', 'theme-dark');
    body.classList.add(`theme-${theme}`);
    if (theme === 'light') {
        themeIcon.src = 'icons/light-mode.png';
        themeIcon.alt = 'Light Mode Icon';
    } else {
        themeIcon.src = 'icons/dark-mode.png';
        themeIcon.alt = 'Dark Mode Icon';
    }
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

async function fetchAppConfig() {
    if (Object.keys(appConfig).length > 0) {
        return appConfig;
    }
    try {
        const response = await fetch('/mcore/data/app-config.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        appConfig = data;
        return data;
    } catch (error) {
        console.error('Could not fetch app config:', error);
        return {};
    }
}

async function fetchHolidays() {
    if (federalHolidaysData.length > 0) {
        return federalHolidaysData;
    }
    try {
        const response = await fetch('/mcore/data/holidays.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        federalHolidaysData = data;
        return data;
    } catch (error) {
        console.error('Could not fetch federal holidays:', error);
        return [];
    }
}

async function fetchAcronymsData() {
    if (allAcronymsData.length > 0) {
        return allAcronymsData;
    }
    try {
        const response = await fetch('/mcore/data/acronyms.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        allAcronymsData = data;
        return data;
    } catch (error) {
        console.error('Could not fetch acronyms:', error);
        return [];
    }
}

async function fetchAllResourcesData() {
    if (allResourcesData.length > 0) {
        return allResourcesData;
    }
    try {
        const response = await fetch('/mcore/data/resources.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        allResourcesData = data;
        return data;
    } catch (error) {
        console.error('Could not fetch all resources:', error);
        return [];
    }
}


function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

function getDaysInMonth(month, year) {
    return new Date(year, month + 1, 0).getDate();
}

function getObservedHolidayDate(holidayDate) {
    let observedDate = new Date(holidayDate);
    if (observedDate.getDay() === 6) {
        observedDate.setDate(observedDate.getDate() - 1);
    } else if (observedDate.getDay() === 0) {
        observedDate.setDate(observedDate.getDate() + 1);
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
            const targetDay = 1;
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
            const targetDay = 4;
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

function getPostalWorkWeekNumber(date) {
    const cycleStart = new Date('2025-01-04T00:00:00');
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
    if (date.getDay() === 0) {
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

function getPayDays(year) {
    const payDays = new Set();
    let currentPayDate = new Date(PP_REFERENCE_DATE);

    let ppInfoForRef = getPayPeriodInfo(PP_REFERENCE_DATE);
    currentPayDate = ppInfoForRef.payDate;

    while (currentPayDate.getFullYear() >= year - 1) {
        const ppInfo = getPayPeriodInfo(currentPayDate);
        if (ppInfo.payDate.getFullYear() === year) {
            payDays.add(ppInfo.payDate.toISOString().split('T')[0]);
        }
        currentPayDate.setDate(currentPayDate.getDate() - 14);
    }

    currentPayDate = ppInfoForRef.payDate;
    while (currentPayDate.getFullYear() <= year + 1) {
        const ppInfo = getPayPeriodInfo(currentPayDate);
        if (ppInfo.payDate.getFullYear() === year) {
            payDays.add(ppInfo.payDate.toISOString().split('T')[0]);
        }
        currentPayDate.setDate(currentPayDate.getDate() + 14);
    }
    return payDays;
}


function generateMonthTile(month, year, selectedCarrier) {
    const today = new Date();
    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = getDaysInMonth(month, year);
    const payDaysForYear = getPayDays(year);

    let startDay = firstDayOfMonth.getDay();
    let firstDayOffset = startDay;

    let daysHtml = '';
    for (let i = 0; i < firstDayOffset; i++) {
        daysHtml += '<div class="calendar-day other-month"></div>';
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month, day);
        const formattedDate = currentDate.toISOString().split('T')[0];
        let dayClasses = ['calendar-day'];
        let holidayHtml = '';
        let paydayHtml = '';
        let isOffDay = false;
        let highlightClasses = [];
        let dataAttributes = '';

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
            holidayHtml = `<img src="/mcore/icons/us.png" alt="Federal Holiday" class="holiday-symbol">`;
            dataAttributes += `data-is-holiday="true" data-holiday-name="${holiday.name}" data-holiday-info="${holiday.info}"`;
        }

        if (payDaysForYear.has(formattedDate)) {
            paydayHtml = `<img src="/mcore/icons/money-stack250.png" alt="Pay Day" class="payday-symbol">`;
            dataAttributes += ` data-is-payday="true"`;
        }


        if (holiday || isOffDay || payDaysForYear.has(formattedDate)) {
            dayClasses.push('cursor-pointer');
        } else {
            dayClasses.push('cursor-default');
        }

        daysHtml += `
            <div class="${dayClasses.join(' ')}" data-date="${formattedDate}" ${dataAttributes}>
                <span class="day-number">${day}</span>
                ${holidayHtml}
                ${paydayHtml}
            </div>
        `;
    }

    const monthNames = ["January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

function jumpToTodayOnCalendar() {
    const todayCell = document.querySelector('.calendar-day.today');
    if (todayCell) {
        setTimeout(() => {
            todayCell.scrollIntoView({ behavior: 'smooth', block: 'center' });
            todayCell.classList.add('flash-highlight-calendar');

            setTimeout(() => {
                todayCell.classList.remove('flash-highlight-calendar');
            }, 1600);
        }, 200);
    }
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

    const calendarGrid = document.getElementById('calendar-grid');
    const prevYearBtn = document.getElementById('prev-year-btn');
    const nextYearBtn = document.getElementById('next-year-btn');
    const currentYearBtn = document.getElementById('current-year-btn');
    const todayCalendarBtn = document.getElementById('today-calendar-btn');

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

    todayCalendarBtn.addEventListener('click', () => {
        const currentDisplayedYear = parseInt(document.getElementById('current-year-display').textContent);
        const actualCurrentYear = new Date().getFullYear();

        if (currentDisplayedYear !== actualCurrentYear) {
            window.location.hash = `#calendar?year=${actualCurrentYear}`;
            setTimeout(jumpToTodayOnCalendar, 200);
        } else {
            jumpToTodayOnCalendar();
        }
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
        lightboxHolidayInfo.innerHTML = info;
        holidayLightbox.classList.add('active');
    }

    function closeHolidayLightbox() {
        lightboxHolidayName.textContent = '';
        lightboxHolidayInfo.innerHTML = '';
        holidayLightbox.classList.remove('active');
    }

    function attachHolidayLightboxListeners() {
        document.querySelectorAll('.calendar-day[data-is-holiday="true"], .calendar-day[data-is-payday="true"]').forEach(dayCell => {
            const oldDayCell = dayCell;
            const newDayCell = oldDayCell.cloneNode(true);
            oldDayCell.parentNode.replaceChild(newDayCell, oldDayCell);
        });

        document.querySelectorAll('.calendar-day[data-is-holiday="true"], .calendar-day[data-is-payday="true"]').forEach(dayCell => {
            dayCell.addEventListener('click', (event) => {
                const isHoliday = dayCell.dataset.isHoliday === 'true';
                const isPayday = dayCell.dataset.isPayday === 'true';

                let name = '';
                let info = '';

                if (isHoliday && isPayday) {
                    const holidayName = dayCell.dataset.holidayName;
                    const holidayInfo = dayCell.dataset.holidayInfo;
                    name = `${holidayName} & Pay Day`;
                    info = `${holidayInfo}<br><br>This date is also a pay day. Your pay should be deposited on or around this date.`;
                } else if (isHoliday) {
                    name = dayCell.dataset.holidayName;
                    info = dayCell.dataset.holidayInfo;
                } else if (isPayday) {
                    name = "Pay Day";
                    info = "This marks a pay day. Your pay should be deposited on or around this date.";
                }

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

function jumpToCurrentPayPeriod() {
    const currentPayPeriodRow = document.querySelector('.pay-period-table .current-pay-period-row');
    if (currentPayPeriodRow) {
        setTimeout(() => {
            currentPayPeriodRow.scrollIntoView({ behavior: 'smooth', block: 'center' });

            currentPayPeriodRow.classList.add('flash-highlight');

            setTimeout(() => {
                currentPayPeriodRow.classList.remove('flash-highlight');
            }, 1600);
        }, 200);
    }
}

function getPayPeriodInfo(date) {
    const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const referenceDateNormalized = new Date(PP_REFERENCE_DATE.getFullYear(), PP_REFERENCE_DATE.getMonth(), PP_REFERENCE_DATE.getDate());

    const diffTime = checkDate.getTime() - referenceDateNormalized.getTime();
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

    const ppStartDate = new Date(referenceDateNormalized);
    ppStartDate.setDate(referenceDateNormalized.getDate() + (payPeriodsPassed * 14));
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
    const normalizedToday = new Date();
    normalizedToday.setHours(0, 0, 0, 0);

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

        if (ppInfo.payPeriodYear === year ||
            (ppInfo.payPeriodYear === year - 1 && ppInfo.endDate.getFullYear() === year) ||
            (ppInfo.payPeriodYear === year + 1 && ppInfo.startDate.getFullYear() === year)) {

            const isCurrentPayPeriod = normalizedToday >= ppInfo.startDate && normalizedToday <= ppInfo.endDate;
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
        currentDate.setDate(currentDate.getDate() + 14);
    }


    appContent.innerHTML = `
        <div class="page-content-wrapper align-center">
            <h2 class="page-title">Pay Periods</h2>
            <div class="pay-period-controls-group">
                <button id="prev-pp-year-btn" class="nav-button">&laquo; Previous</button>
                <span id="current-pp-year-display" class="current-year-display text-usps-blue">${year}</span>
                <button id="next-pp-year-btn" class="nav-button">Next &raquo;</button>
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

    const prevPPYearBtn = document.getElementById('prev-pp-year-btn');
    const nextPPYearBtn = document.getElementById('next-pp-year-btn');
    const currentPPBtn = document.getElementById('current-pp-btn');
    const todayPayPeriodBtn = document.getElementById('today-pay-period-btn');

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

    todayPayPeriodBtn.addEventListener('click', () => {
        const currentDisplayedYear = parseInt(document.getElementById('current-pp-year-display').textContent);
        const actualCurrentYear = new Date().getFullYear();

        if (currentDisplayedYear !== actualCurrentYear) {
            window.location.hash = `#pay-periods?year=${actualCurrentYear}`;
            sessionStorage.setItem('mcore-jump-to-pay-today', 'true');
        } else {
            jumpToCurrentPayPeriod();
        }
    });

    if (sessionStorage.getItem('mcore-jump-to-pay-today') === 'true') {
        sessionStorage.removeItem('mcore-jump-to-pay-today');
        setTimeout(jumpToCurrentPayPeriod, 500);
    }
}

async function renderAcronymsPage() {
    await fetchAcronymsData();

    appContent.innerHTML = `
        <div class="page-content-wrapper align-left">
            <h2 class="page-title">Useful Acronyms</h2>
            <div class="acronym-controls-group">
                <div class="acronym-search-input-wrapper"> <input type="text" id="acronym-search" placeholder="Search acronyms..." class="text-input search-input">
                </div>
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

    const acronymsTableBody = document.getElementById('acronyms-table-body');
    const acronymsSearchInput = document.getElementById('acronym-search');
    const sortAcronymAscBtn = document.getElementById('sort-acronym-asc');
    const sortAcronymDescBtn = document.getElementById('sort-acronym-desc');

    let currentSortOrder = 'asc';

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
        let filteredAcronyms = [...allAcronymsData];
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

    renderAcronymsTable();

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


async function router() {
    const hash = window.location.hash;
    const urlParams = new URLSearchParams(hash.split('?')[1]);
    const currentYear = new Date().getFullYear();

    await fetchHolidays();

    const carrierMatch = hash.match(/^#calendar-([a-z]+)$/);
    if (carrierMatch) {
        const carrierColor = carrierMatch[1];
        if (CARRIER_COLORS[carrierColor]) {
            renderCalendarPage(currentYear, carrierColor);
            return;
        }
    }

    if (hash.startsWith('#calendar')) {
        const year = parseInt(urlParams.get('year')) || currentYear;
        const carrier = urlParams.get('carrier') || null;
        renderCalendarPage(year, carrier);
    } else if (hash.startsWith('#resources')) {
        renderResourcesPage();
    } else if (hash.startsWith('#acronyms')) {
        renderAcronymsPage();
    } else if (hash.startsWith('#pay-periods')) {
        const year = parseInt(urlParams.get('year')) || currentYear;
        renderPayPeriodsPage(year);
    } else if (hash === '#disclaimer') {
        renderDisclaimerPage();
    } else {
        renderLandingPage();
    }
}

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
                <img src="/mcore/icons/mcore-logo.png" alt="mCORE Logo" class="mcore-logo-large" onerror="this.onerror=null; this.src='${MCORE_LOGO_FALLBACK_PATH}';" />
            </div>
        </div>
    `;
}

function renderDisclaimerPage() {
    appContent.innerHTML = `
        <div class="page-content-wrapper align-left">
            <h2 class="page-title">Terms & Conditions / Disclaimer of Responsibility</h2>
            <div class="disclaimer-content-area">
                <p class="info-text"><strong>Important Disclaimer:</strong> This mCORE application is provided for informational and reference purposes only. It is developed independently by a mail carrier, for ALL mail carriers, and is not affiliated with, endorsed by, or sponsored by the United States Postal Service (USPS), any labor union, or any other official entity.</p>
                <p class="info-text">While every effort has been made to ensure the accuracy of the information provided (including, but not limited to, calendar schedules, NALC Resource and federal holidays), this application does not constitute official guidance or legal advice. Postal regulations, labor laws, union contracts, and operational procedures are complex and subject to change.</p>
                <p class="info-text"><strong>Users are solely responsible for verifying all information presented in this application with official USPS sources, union representatives, and/or relevant legal counsel.</strong></p>
                <p class="info-text">The developer(s) of this application disclaim all liability for any errors or omissions in the content provided, or for any actions taken or not taken in reliance on the information contained herein. By using this application, you agree to these terms and understand that you use it at your own risk. The developer(s) shall not be liable for any direct, indirect, incidental, consequential, or punitive damages arising out of your access to, or use of, or inability to use this application.</p>
                <p class="info-text">This application is provided "as is" without warranty of any kind, either express or implied, including, but not limited to, the implied warranties of merchantability, fitness for a particular purpose, or non-infringement.</p>
                <p class="info-text">Thank you for your understanding and continued dedication as a mail carrier.</p>
                <div class="button-group">
                    <a href="#landing" class="button primary-button">Back to Home</a>
                </div>
                <div class="logo-display-area">
                    <img src="/mcore/icons/mcore-logo.png" alt="mCORE Logo" class="mcore-logo-large" onerror="this.onerror=null; this.src='${MCORE_LOGO_FALLBACK_PATH}';" />
                </div>
            </div>
        </div>
    `;
}

function renderResourcesPage() {
    appContent.innerHTML = `
        <div class="page-content-wrapper align-left">
            <h2 class="page-title">Useful Resources</h2>
            <p class="info-text">This section provides links to publicly available resources for mail carriers. Please note that mCORE is an independent application and is not affiliated with USPS, NALC, NRLCA, or any other union. Always verify information with official sources.</p>
            <ul id="resources-list" class="resource-list">
                </ul>
            <div class="button-group">
                <a href="#landing" class="button primary-button">Back to Home</a>
            </div>
        </div>
    `;
    const resourcesList = document.getElementById('resources-list');
    fetchAllResourcesData().then(data => {
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


document.addEventListener('DOMContentLoaded', async () => {
    await fetchAppConfig();

    const currentYearSpan = document.getElementById('current-year');
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }

    const appVersionSpan = document.getElementById('app-version');
    if (appVersionSpan && appConfig.version && appConfig.cacheVersion !== undefined) {
        appVersionSpan.textContent = `${appConfig.version}.${appConfig.cacheVersion}`;
    }

    const contactEmailLink = document.getElementById('contact-email-link');
    if (contactEmailLink) {
        const user = 'a.mailman.sam';
        const domain = 'gmail.com';
        const email = `mailto:${user}@${domain}`;
        contactEmailLink.href = email;
        contactEmailLink.textContent = 'Contact';
    }


    initPreferences();
    router();

    document.getElementById('home-link').addEventListener('click', () => { window.location.hash = '#landing'; });
    document.getElementById('calendar-nav-link').addEventListener('click', () => { window.location.hash = '#calendar'; });
    document.getElementById('resources-nav-link').addEventListener('click', () => { window.location.hash = '#resources'; });
    document.getElementById('acronyms-nav-link').addEventListener('click', () => { window.location.hash = '#acronyms'; });
    document.getElementById('pay-periods-nav-link').addEventListener('click', () => { window.location.hash = '#pay-periods'; });


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
        installAppButton.style.display = 'flex';
    });

    installAppButton.addEventListener('click', async () => {
        installAppButton.style.display = 'none';
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            deferredPrompt = null;
        }
    });

    window.addEventListener('appinstalled', () => {
        installAppButton.style.display = 'none';
        deferredPrompt = null;
    });

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            const swUrl = `/mcore/service-worker.js?v=${appConfig.cacheVersion || '1'}`;
            navigator.serviceWorker.register(swUrl)
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);

                    registration.addEventListener('updatefound', () => {
                        const installingWorker = registration.installing;
                        if (installingWorker) {
                            installingWorker.addEventListener('statechange', () => {
                                if (installingWorker.state === 'installed') {
                                    if (navigator.serviceWorker.controller) {
                                        console.log('New content available! Please refresh to get the latest version.');
                                    } else {
                                        console.log('Content is now available offline!');
                                    }
                                }
                            });
                        }
                    });
                })
                .catch(err => {
                    console.error('ServiceWorker registration failed: ', err);
                });
        });

        navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('New service worker controlling this page. Reloading for fresh content.');
            window.location.reload();
        });
    }
});
