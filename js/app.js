// app.js

const FLASH_ANIMATION_COUNT = 3;
const FLASH_ANIMATION_SINGLE_DURATION_MS = 500;
const FLASH_ANIMATION_TOTAL_DURATION_MS = FLASH_ANIMATION_COUNT * FLASH_ANIMATION_SINGLE_DURATION_MS;

const appContent = document.getElementById('app-content');
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const body = document.body;
const installAppButton = document.getElementById('install-app-button');
const scrollToTopBtn = document.getElementById('scrollToTopBtn');


let deferredPrompt;

let allEventsData = [];
let userControls = {};
let allAcronymsData = [];
let allResourcesData = [];
let appConfig = {};
let specialEventsCache = {};
let t6Routes = [];

const MCORE_LOGO_FALLBACK_PATH = '/mcore/icons/mcore-logo-fallback.png';

// --- Reference Dates & Cycles ---
// All reference dates are set in UTC ('Z') to ensure calculations are consistent across all timezones.

// T6 Carrier Technician Rotation Constants
const T6_CYCLE_REFERENCE_START_DATE = new Date('2025-07-05T00:00:00Z');
const T6_CYCLE_MAP = [
    -1, -1, 0, 1, 2, 3, 4,
    4, -1, -1, 0, 1, 2, 3,
    3, -1, 4, -1, 0, 1, 2,
    2, -1, 3, 4, -1, 0, 1,
    1, -1, 2, 3, 4, -1, 0,
    0, -1, 1, 2, 3, 4, -1
];

// Postal Work Week (for rotating days off)
const POSTAL_WORK_WEEK_START_DATE = new Date('2024-11-23T00:00:00Z');

// Pay Period (PP) Constants
const PP_REFERENCE_DATE = new Date('2024-12-14T00:00:00Z');
const PP_REFERENCE_NUMBER = 1;
const PP_REFERENCE_YEAR = 2025;


const CARRIER_COLORS = {
    'none': { name: 'None', class: 'carrier-none', textClass: 'text-calendar-heading-none' },
    'black': { name: 'Black', class: 'carrier-black', textClass: 'text-calendar-heading-black', baseDayOffIndex: 0 },
    'yellow': { name: 'Yellow', class: 'carrier-yellow', textClass: 'text-calendar-heading-yellow', baseDayOffIndex: 1 },
    'blue': { name: 'Blue', class: 'carrier-blue', textClass: 'text-calendar-heading-blue', baseDayOffIndex: 2 },
    'green': { name: 'Green', class: 'carrier-green', textClass: 'text-calendar-heading-green', baseDayOffIndex: 3 },
    'brown': { name: 'Brown', class: 'carrier-brown', textClass: 'text-calendar-heading-brown', baseDayOffIndex: 4 },
    'red': { name: 'Red', class: 'carrier-red', textClass: 'text-calendar-heading-red', baseDayOffIndex: 5 },
    'all': { name: 'All', class: 'carrier-sunday', textClass: 'text-calendar-heading-all' }
};

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

async function fetchEvents() {
    if (allEventsData.length > 0) {
        return allEventsData;
    }
    try {
        const response = await fetch('/mcore/data/events.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        allEventsData = data;
        return data;
    } catch (error) {
        console.error('Could not fetch events:', error);
        return [];
    }
}

async function fetchUserControls() {
    const defaultControls = {
        showHolidays: true,
        showDaylightSaving: true,
        showSolstice: true,
        showSeasons: true,
        showPaydays: true,
        eventImageOpacity: 0.25
    };

    let savedControls = {};
    try {
        const savedControlsRaw = localStorage.getItem('mcore-user-controls');
        if (savedControlsRaw) {
            savedControls = JSON.parse(savedControlsRaw);
        }
    } catch (e) {
        console.error("Could not parse user controls from localStorage", e);
        savedControls = {}; 
    }

    const finalControls = { ...defaultControls, ...savedControls };
    userControls = finalControls;
    localStorage.setItem('mcore-user-controls', JSON.stringify(finalControls));

    return finalControls;
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

function getSpecialEvents(year) {
    if (specialEventsCache[year]) {
        return specialEventsCache[year];
    }

    const events = [];

    let secondSundayInMarch = 1;
    let sundayCount = 0;
    while(sundayCount < 2){
        const d = new Date(year, 2, secondSundayInMarch);
        if(d.getDay() === 0) sundayCount++;
        if(sundayCount < 2) secondSundayInMarch++;
    }
    const dstStart = new Date(year, 2, secondSundayInMarch);
    events.push({ name: "Daylight Saving Start", date: dstStart, type: 'daylight-saving', icon: 'saving.png', info: "Daylight Saving Time begins." });

    let firstSundayInNovember = 1;
    while (new Date(year, 10, firstSundayInNovember).getDay() !== 0) {
        firstSundayInNovember++;
    }
    const dstEnd = new Date(year, 10, firstSundayInNovember);
    events.push({ name: "Daylight Saving End", date: dstEnd, type: 'daylight-saving', icon: 'saving.png', info: "Daylight Saving Time ends." });

    events.push({ name: "Spring Equinox", date: new Date(year, 2, 20), type: 'season', icon: 'spring.png', info: "The beginning of spring." });
    events.push({ name: "Summer Solstice", date: new Date(year, 5, 21), type: 'solstice', icon: 'summer-sol.png', info: "The longest day of the year." });
    events.push({ name: "Fall Equinox", date: new Date(year, 8, 22), type: 'season', icon: 'fall.png', info: "The beginning of fall." });
    events.push({ name: "Winter Solstice", date: new Date(year, 11, 21), type: 'solstice', icon: 'winter-sol.png', info: "The shortest day of the year." });

    specialEventsCache[year] = events;
    return events;
}


function getEventsForDate(date) {
    const year = date.getFullYear();
    const foundEvents = [];
    const specialEvents = getSpecialEvents(year);

    const checkDate = new Date(date);
    checkDate.setHours(0,0,0,0);

    for (const event of specialEvents) {
        const eventDate = new Date(event.date);
        eventDate.setHours(0,0,0,0);
        if (eventDate.getTime() === checkDate.getTime()) {
            foundEvents.push({
                name: event.name,
                info: event.info,
                type: event.type,
                icon: event.icon
            });
        }
    }

    for (const event of allEventsData) {
        if (event.type !== 'holiday') continue;

        let actualEventDate;
        if (typeof event.day === 'string') {
            const ruleParts = event.day.split('-');
            const nth = ['first', 'second', 'third', 'fourth', 'last'].indexOf(ruleParts[0]) + 1;
            const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(ruleParts[1]);
        
            if (nth > 0 && dayOfWeek !== -1) {
                let tempDate = new Date(year, event.month - 1, 1);
                if (ruleParts[0] === 'last') {
                    tempDate = new Date(year, event.month, 0); 
                    while (tempDate.getDay() !== dayOfWeek) {
                        tempDate.setDate(tempDate.getDate() - 1);
                    }
                    actualEventDate = tempDate;
                } else {
                    while (tempDate.getDay() !== dayOfWeek) {
                        tempDate.setDate(tempDate.getDate() + 1);
                    }
                    tempDate.setDate(tempDate.getDate() + (nth - 1) * 7);
                    actualEventDate = tempDate;
                }
            }
        } else {
            actualEventDate = new Date(year, event.month - 1, event.day);
        }

        if (actualEventDate) {
            const observedEventDate = getObservedHolidayDate(actualEventDate);
            if (observedEventDate.getDate() === date.getDate() &&
                observedEventDate.getMonth() === date.getMonth() &&
                observedEventDate.getFullYear() === date.getFullYear()) {
                foundEvents.push({
                    name: event.name,
                    info: event.info || `Information for ${event.name} not available.`,
                    type: event.type,
                    icon: event.icon
                });
            }
        }
    }
    return foundEvents;
}


function getPostalWorkWeekNumber(date) {
    // Create a date at midnight UTC for the given local date to remove timezone ambiguity
    const targetDateUtcTimestamp = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    const targetDate = new Date(targetDateUtcTimestamp);

    const dayOfWeek = targetDate.getUTCDay();
    if (dayOfWeek !== 6) { // If not a Saturday (6), find the preceding Saturday
        targetDate.setUTCDate(targetDate.getUTCDate() - (dayOfWeek + 1) % 7);
    }
    
    const diffTime = targetDate.getTime() - POSTAL_WORK_WEEK_START_DATE.getTime();
    // Use Math.floor for accuracy to get the number of full days elapsed.
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7) + 1;
}

function getCarrierDayOff(date, carrierColor) {
    if (date.getDay() === 0) {
        return true;
    }
    if (!carrierColor || carrierColor === 'none') {
        return false;
    }

    const carrier = CARRIER_COLORS[carrierColor];
    if (!carrier || typeof carrier.baseDayOffIndex === 'undefined') {
        return false;
    }

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
        if (ppInfo.payDate.getUTCFullYear() === year) {
            payDays.add(ppInfo.payDate.toISOString().split('T')[0]);
        }
        currentPayDate.setUTCDate(currentPayDate.getUTCDate() - 14);
    }

    currentPayDate = ppInfoForRef.payDate;
    while (currentPayDate.getUTCFullYear() <= year + 1) {
        const ppInfo = getPayPeriodInfo(currentPayDate);
        if (ppInfo.payDate.getUTCFullYear() === year) {
            payDays.add(ppInfo.payDate.toISOString().split('T')[0]);
        }
        currentPayDate.setUTCDate(currentPayDate.getUTCDate() + 14);
    }
    return payDays;
}

function loadT6Routes() {
    const savedRoutes = localStorage.getItem('mcore-t6-routes');
    if (savedRoutes) {
        t6Routes = JSON.parse(savedRoutes);
    } else {
        t6Routes = ['', '', '', '', ''];
    }
}

function saveT6Routes() {
    localStorage.setItem('mcore-t6-routes', JSON.stringify(t6Routes));
}

function getT6RouteForDate(date) {
    if (!t6Routes || t6Routes.length !== 5 || t6Routes.some(r => r === '')) {
        return null;
    }

    if (date.getDay() === 0) {
        return null;
    }

    // Use UTC for the calculation to ensure consistency across timezones
    const checkDateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    
    const diffMillis = checkDateUtc - T6_CYCLE_REFERENCE_START_DATE.getTime();
    // Using Math.floor is the most accurate method for calculating the number of full elapsed days.
    const diffDays = Math.floor(diffMillis / (1000 * 60 * 60 * 24));
    const dayInCycle = (diffDays % 42 + 42) % 42;
    const routeIndex = T6_CYCLE_MAP[dayInCycle];

    if (routeIndex !== undefined && routeIndex !== -1) {
        return t6Routes[routeIndex];
    }

    return null;
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
        const formattedDate = new Date(Date.UTC(year, month, day)).toISOString().split('T')[0];
        let dayClasses = ['calendar-day'];
        let paydayHtml = '';
        let t6RouteHtml = '';
        let isOffDay = false;
        let highlightClasses = [];
        let dataAttributes = '';
        let eventInfos = [];
        let dayStyles = '';

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
                if (colorKey !== 'all' && colorKey !== 'none' && getCarrierDayOff(currentDate, colorKey)) {
                    isOffDay = true;
                    highlightClasses.push(CARRIER_COLORS[colorKey].class);
                }
            }
        }

        if (isOffDay) {
            highlightClasses.push('day-off-highlight');
        }
        dayClasses.push(...highlightClasses);

        const events = getEventsForDate(currentDate);
        const visibleEvents = [];
        if (events.length > 0) {
            events.forEach(event => {
                const showEvent = (event.type === 'holiday' && userControls.showHolidays) ||
                                  (event.type === 'daylight-saving' && userControls.showDaylightSaving) ||
                                  (event.type === 'solstice' && userControls.showSolstice) ||
                                  (event.type === 'season' && userControls.showSeasons);
                if(showEvent) {
                    visibleEvents.push(event);
                    eventInfos.push({name: event.name, info: event.info, icon: event.icon});
                }
            });
        }
        
        if (visibleEvents.length > 0) {
            dayClasses.push('has-event-bg');
            const primaryEvent = visibleEvents[0];
            const imageUrl = `/mcore/icons/${primaryEvent.icon}`;
            dayStyles = `style="--event-bg-image: url('${imageUrl}'); --event-bg-opacity: ${userControls.eventImageOpacity};"`;
        }

        if (eventInfos.length > 0) {
            const jsonString = JSON.stringify(eventInfos);
            const escapedJsonString = jsonString.replace(/'/g, "&#39;").replace(/"/g, "&quot;");
            dataAttributes += `data-is-event="true" data-events-json='${escapedJsonString}'`;
        }

        if (payDaysForYear.has(formattedDate) && userControls.showPaydays) {
            paydayHtml = `<img src="/mcore/icons/money-stack250.png" alt="Pay Day" class="payday-symbol">`;
            dataAttributes += ` data-is-payday="true"`;
        }

        const routeNumber = getT6RouteForDate(currentDate);
        if (routeNumber) {
            t6RouteHtml = `<span class="t6-route-number">${routeNumber}</span>`;
        }


        if (eventInfos.length > 0 || isOffDay || (payDaysForYear.has(formattedDate) && userControls.showPaydays)) {
            dayClasses.push('cursor-pointer');
        } else {
            dayClasses.push('cursor-default');
        }

        daysHtml += `
            <div class="${dayClasses.join(' ')}" data-date="${currentDate.toISOString().split('T')[0]}" ${dataAttributes} ${dayStyles}>
                <span class="day-number">${day}</span>
                <div class="event-icon-container"></div>
                ${paydayHtml}
                ${t6RouteHtml}
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
            }, FLASH_ANIMATION_TOTAL_DURATION_MS);
        }, 200);
    }
}

function openDayDetailsLightbox(dayCell) {
    const lightbox = document.getElementById('day-details-lightbox');
    const dynamicContent = document.getElementById('lightbox-dynamic-content');

    const isEvent = dayCell.dataset.isEvent === 'true';
    const isPayday = dayCell.dataset.isPayday === 'true';
    const date = new Date(dayCell.dataset.date);

    let contentHtml = `<h3 class="lightbox-title">${date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}</h3>`;
    contentHtml += '<div class="lightbox-event-list">';

    if (isEvent) {
        const eventData = JSON.parse(dayCell.dataset.eventsJson.replace(/&quot;/g, '"'));
        eventData.forEach(event => {
            contentHtml += `
                <div class="lightbox-event-item">
                    <img src="/mcore/icons/${event.icon}" alt="${event.name}" class="lightbox-event-icon">
                    <div class="lightbox-event-details">
                        <h4>${event.name}</h4>
                        <p>${event.info}</p>
                    </div>
                </div>
            `;
        });
    }

    if (isPayday) {
        contentHtml += `
            <div class="lightbox-event-item">
                <img src="/mcore/icons/money-stack250.png" alt="Pay Day" class="lightbox-event-icon">
                <div class="lightbox-event-details">
                    <h4>Pay Day</h4>
                    <p>Your pay should be deposited on or around this date.</p>
                </div>
            </div>
        `;
    }
    
    contentHtml += '</div>';

    dynamicContent.innerHTML = contentHtml;
    lightbox.classList.add('active');
}

function closeDayDetailsLightbox() {
    const lightbox = document.getElementById('day-details-lightbox');
    lightbox.classList.remove('active');
}


async function renderCalendarPage(year, selectedCarrier = null) {
    await fetchEvents();
    await fetchUserControls();
    loadT6Routes();

    const currentCarrierInfo = selectedCarrier ? CARRIER_COLORS[selectedCarrier] : CARRIER_COLORS['all'];
    const headingTextColorClass = currentCarrierInfo.textClass;

    let carrierButtonsHtml = `<button class="carrier-color-button ${CARRIER_COLORS['all'].class} ${selectedCarrier === null || selectedCarrier === '' ? 'selected' : ''}" data-carrier-color="">
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

    let t6InputHtml = '';
    for (let i = 0; i < 5; i++) {
        t6InputHtml += `<input type="text" inputmode="numeric" pattern="[0-9]*" class="t6-route-input" data-index="${i}" value="${t6Routes[i] || ''}" placeholder="R${i+1}" maxlength="3">`;
    }

    appContent.innerHTML = `
        <h2 class="page-title tight-padding ${headingTextColorClass}">Carrier Calendar</h2>

        <div class="calendar-main-nav">
            <button id="prev-year-btn" class="nav-button tight-padding">&laquo;</button>
            <span id="current-year-display" class="current-year-display text-usps-blue">${year}</span>
            <button id="next-year-btn" class="nav-button tight-padding">&raquo;</button>
            <button id="today-calendar-btn" class="nav-button">Today</button>
        </div>

        <div class="settings-accordion">
            <button id="settings-accordion-toggle" class="settings-accordion-toggle">Display Options</button>
            <div id="settings-accordion-panel" class="settings-accordion-panel">
                
                <div class="settings-section">
                    <h3 class="settings-section-title">Carrier Color Schedule</h3>
                    <div class="carrier-buttons-grid">
                        ${carrierButtonsHtml}
                    </div>
                </div>

                <div class="settings-section">
                    <h3 class="settings-section-title">Filter Calendar Events</h3>
                    <div class="user-control-nav-box">
                        <button class="nav-button" data-filter="all">All</button>
                        <button class="nav-button" data-filter="none">None</button>
                        <button class="nav-button ${userControls.showHolidays ? 'selected' : ''}" data-filter="holidays">Holidays</button>
                        <button class="nav-button ${userControls.showSeasons ? 'selected' : ''}" data-filter="seasons">Seasons</button>
                        <button class="nav-button ${userControls.showSolstice ? 'selected' : ''}" data-filter="solstice">Solstices</button>
                        <button class="nav-button ${userControls.showDaylightSaving ? 'selected' : ''}" data-filter="daylightSaving">
                            <span class="full-text">Daylight Savings</span>
                            <span class="short-text">DST</span>
                        </button>
                        <button class="nav-button ${userControls.showPaydays ? 'selected' : ''}" data-filter="paydays">Pay</button>
                    </div>
                </div>

                <div class="settings-section">
                    <h3 class="settings-section-title">Event Image Opacity</h3>
                    <div class="opacity-slider-container">
                        <label for="event-opacity-slider">Opacity:</label>
                        <input type="range" id="event-opacity-slider" min="0" max="1" step="0.05" value="${userControls.eventImageOpacity || 0.25}">
                        <span id="opacity-value-display">${(userControls.eventImageOpacity || 0.25).toFixed(2)}</span>
                    </div>
                </div>

                <div class="settings-section">
                    <h3 class="settings-section-title">T6 Route Rotation</h3>
                    <p class="info-text">Enter your 5 rotating routes. The schedule appears once all 5 are filled.</p>
                    <div class="t6-route-inputs">
                        ${t6InputHtml}
                    </div>
                </div>

            </div>
        </div>

        <div id="calendar-grid" class="calendar-grid ${selectedCarrier === 'none' ? 'traditional-view' : ''}"></div>
    `;

    const calendarGrid = document.getElementById('calendar-grid');
    
    function renderAllMonthTiles() {
        calendarGrid.innerHTML = '';
        for (let i = 0; i < 12; i++) {
            calendarGrid.innerHTML += generateMonthTile(i, year, selectedCarrier);
        }
        attachDayClickListeners();
    }

    function attachDayClickListeners() {
        calendarGrid.querySelectorAll('.calendar-day[data-is-event="true"], .calendar-day[data-is-payday="true"]').forEach(dayCell => {
            dayCell.addEventListener('click', () => openDayDetailsLightbox(dayCell));
        });
    }

    renderAllMonthTiles();
    
    const settingsToggle = document.getElementById('settings-accordion-toggle');
    const settingsPanel = document.getElementById('settings-accordion-panel');
    settingsToggle.addEventListener('click', () => {
        settingsToggle.classList.toggle('active');
        settingsPanel.classList.toggle('show');
    });

    const opacitySlider = document.getElementById('event-opacity-slider');
    const opacityDisplay = document.getElementById('opacity-value-display');

    if(opacitySlider && opacityDisplay) {
        opacitySlider.addEventListener('input', (e) => {
            const newOpacity = parseFloat(e.target.value);
            opacityDisplay.textContent = newOpacity.toFixed(2);
            document.querySelectorAll('.calendar-day.has-event-bg').forEach(day => {
                day.style.setProperty('--event-bg-opacity', newOpacity);
            });
        });

        opacitySlider.addEventListener('change', (e) => {
            const newOpacity = parseFloat(e.target.value);
            userControls.eventImageOpacity = newOpacity;
            localStorage.setItem('mcore-user-controls', JSON.stringify(userControls));
        });
    }

    document.querySelectorAll('.t6-route-input').forEach(input => {
        input.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
            const index = parseInt(e.target.dataset.index, 10);
            t6Routes[index] = e.target.value;
            saveT6Routes();
            renderAllMonthTiles();
        });
    });

    document.getElementById('prev-year-btn').addEventListener('click', () => {
        window.location.hash = `#calendar?year=${year - 1}&carrier=${selectedCarrier || ''}`;
    });
    document.getElementById('next-year-btn').addEventListener('click', () => {
        window.location.hash = `#calendar?year=${year + 1}&carrier=${selectedCarrier || ''}`;
    });
    document.getElementById('today-calendar-btn').addEventListener('click', () => {
        const actualCurrentYear = new Date().getFullYear();
        if (year !== actualCurrentYear) {
            window.location.hash = `#calendar?year=${actualCurrentYear}&carrier=${selectedCarrier || ''}`;
        } else {
            jumpToTodayOnCalendar();
        }
    });

    document.querySelectorAll('.carrier-color-button').forEach(button => {
        button.addEventListener('click', (event) => {
            const newCarrier = event.currentTarget.dataset.carrierColor || '';
            localStorage.setItem('mcore-selected-carrier', newCarrier);

            const settingsPanel = document.getElementById('settings-accordion-panel');
            if (settingsPanel && settingsPanel.classList.contains('show')) {
                sessionStorage.setItem('mcore-accordion-open', 'true');
            }

            window.location.hash = `#calendar?year=${year}&carrier=${newCarrier}`;
        });
    });

    document.querySelectorAll('.user-control-nav-box .nav-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const filter = e.currentTarget.dataset.filter;
            const keyMap = {
                'holidays': 'showHolidays',
                'seasons': 'showSeasons',
                'solstice': 'showSolstice',
                'daylightSaving': 'showDaylightSaving',
                'paydays': 'showPaydays'
            };

            if (filter === 'all') {
                Object.keys(keyMap).forEach(key => userControls[keyMap[key]] = true);
            } else if (filter === 'none') {
                Object.keys(keyMap).forEach(key => userControls[keyMap[key]] = false);
            } else {
                const key = keyMap[filter];
                if (key) {
                    userControls[key] = !userControls[key];
                }
            }
            
            localStorage.setItem('mcore-user-controls', JSON.stringify(userControls));
            
            const settingsPanel = document.getElementById('settings-accordion-panel');
            if (settingsPanel && settingsPanel.classList.contains('show')) {
                sessionStorage.setItem('mcore-accordion-open', 'true');
            }

            renderCalendarPage(year, selectedCarrier);
        });
    });

    if (sessionStorage.getItem('mcore-accordion-open') === 'true') {
        if (settingsToggle && settingsPanel) {
            settingsToggle.classList.add('active');
            settingsPanel.classList.add('show');
        }
        sessionStorage.removeItem('mcore-accordion-open');
    }
}


function jumpToCurrentPayPeriod() {
    const currentPayPeriodRow = document.querySelector('.pay-period-table .current-pay-period-row');
    if (currentPayPeriodRow) {
        setTimeout(() => {
            currentPayPeriodRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
            currentPayPeriodRow.classList.add('flash-highlight');
            setTimeout(() => {
                currentPayPeriodRow.classList.remove('flash-highlight');
            }, FLASH_ANIMATION_TOTAL_DURATION_MS);
        }, 200);
    }
}

function getPayPeriodInfo(date) {
    // Use UTC for all calculations to avoid timezone issues
    const checkDateUtc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

    const diffTime = checkDateUtc - PP_REFERENCE_DATE.getTime();
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

    const ppStartDate = new Date(PP_REFERENCE_DATE.getTime());
    ppStartDate.setUTCDate(ppStartDate.getUTCDate() + (payPeriodsPassed * 14));

    const ppEndDate = new Date(ppStartDate.getTime());
    ppEndDate.setUTCDate(ppStartDate.getUTCDate() + 13);
    
    const payDate = new Date(ppEndDate.getTime());
    payDate.setUTCDate(ppEndDate.getUTCDate() + 7);

    return {
        payPeriodYear: currentPayPeriodYear,
        payPeriodNumber: String(currentPayPeriodNumber).padStart(2, '0'),
        startDate: ppStartDate,
        endDate: ppEndDate,
        payDate: payDate
    };
}

function formatDate(date) {
    // Display the date in the user's local timezone, but based on the correct UTC date value
    return date.toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
        timeZone: 'UTC'
    });
}

function renderPayPeriodsPage(year) {
    let tableRowsHtml = '';
    const localToday = new Date();
    const normalizedToday = new Date(Date.UTC(localToday.getUTCFullYear(), localToday.getUTCMonth(), localToday.getUTCDate()));

    let initialDateForYear = new Date(Date.UTC(year, 0, 1));
    let ppInfoIter = getPayPeriodInfo(initialDateForYear);

    while (ppInfoIter.startDate.getUTCFullYear() < year) {
        let nextDate = new Date(ppInfoIter.startDate.getTime());
        nextDate.setUTCDate(nextDate.getUTCDate() + 14);
        ppInfoIter = getPayPeriodInfo(nextDate);
    }
    
    let currentDate = ppInfoIter.startDate;

    for (let i = 0; i < 28; i++) { // Render about a year's worth of pay periods
        const ppInfo = getPayPeriodInfo(currentDate);

        if (ppInfo.payPeriodYear > year && ppInfo.payPeriodNumber > 2) {
            break; 
        }

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
        
        let nextDate = new Date(currentDate.getTime());
        nextDate.setUTCDate(nextDate.getUTCDate() + 14);
        currentDate = nextDate;
    }


    appContent.innerHTML = `
        <div class="page-content-wrapper align-center">
            <h2 class="page-title">Pay Periods</h2>
            <div class="calendar-main-nav">
                <button id="prev-pp-year-btn" class="nav-button tight-padding">&laquo;</button>
                <span id="current-pp-year-display" class="current-year-display text-usps-blue">${year}</span>
                <button id="next-pp-year-btn" class="nav-button tight-padding">&raquo;</button>
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
    const todayPayPeriodBtn = document.getElementById('today-pay-period-btn');

    prevPPYearBtn.addEventListener('click', () => {
        window.location.hash = `#pay-periods?year=${year - 1}`;
    });
    nextPPYearBtn.addEventListener('click', () => {
        window.location.hash = `#pay-periods?year=${year + 1}`;
    });

    todayPayPeriodBtn.addEventListener('click', () => {
        const actualCurrentYear = new Date().getFullYear();
        if (year !== actualCurrentYear) {
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

    if (hash.startsWith('#calendar')) {
        const year = parseInt(urlParams.get('year')) || currentYear;
        let carrier = urlParams.get('carrier');

        if (carrier === null) {
            carrier = localStorage.getItem('mcore-selected-carrier') || null;
        }
        
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
				Always Free<br>
				Open-source & Safe<br>
				No Data Collection or Selling Your Info<br>
				Works great Offline, with Optional Web Links<br>

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
            <p class="info-text">This section provides links to publicly available resources for mail carriers. Please note that mCORE is an independent application and is not affiliated with USPS, or any other official entity, NALC, NRLCA, or any other union. Always verify information with official sources.</p>
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

// --- Live Time Clock Functions ---
function getDaySuffix(day) {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
        case 1: return "st";
        case 2: return "nd";
        case 3: return "rd";
        default: return "th";
    }
}

function padZero(num) {
    return num.toString().padStart(2, '0');
}

function updateLiveTime() {
    const now = new Date();
    const liveTimeContainer = document.getElementById('live-time-container');
    if (!liveTimeContainer) return;

    const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
    const monthName = now.toLocaleDateString('en-US', { month: 'long' });
    const dayOfMonth = now.getDate();
    const year = now.getFullYear();
    const dateString = `<span class="live-date">${dayName}, ${monthName} ${dayOfMonth}${getDaySuffix(dayOfMonth)} ${year}</span>`;

    const hours24 = padZero(now.getHours());
    const minutes = padZero(now.getMinutes());
    const seconds = padZero(now.getSeconds());
    const time24String = `${hours24}:${minutes}:${seconds}`;

    const uspsMinutes = Math.floor((now.getMinutes() / 60) * 100);
    const uspsTimeString = `${hours24}:${padZero(uspsMinutes)}:${seconds}`;

    const timeString = `<span class="live-times">${time24String} - USPS: ${uspsTimeString}</span>`;

    liveTimeContainer.innerHTML = `${dateString}${timeString}`;
}


// --- App Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    await fetchAppConfig();
    
    const lightbox = document.getElementById('day-details-lightbox');
    const lightboxCloseBtn = document.getElementById('lightbox-close-btn');
    if (lightboxCloseBtn && lightbox) {
        lightboxCloseBtn.addEventListener('click', closeDayDetailsLightbox);
        lightbox.addEventListener('click', (event) => {
            if (event.target === lightbox) {
                closeDayDetailsLightbox();
            }
        });
    }

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
    updateLiveTime();
    setInterval(updateLiveTime, 1000);

    if (scrollToTopBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                scrollToTopBtn.classList.remove('hidden');
            } else {
                scrollToTopBtn.classList.add('hidden');
            }
        });

        scrollToTopBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

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
            await deferredPrompt.prompt();
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
