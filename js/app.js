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
let letterSchedule = ['', '', '', '', '', ''];
let customColors = {};
let timeTableInterval = null;

const MCORE_LOGO_FALLBACK_PATH = '/mcore/icons/mcore-logo-fallback.png';

// --- Reference Dates & Cycles ---
const T6_CYCLE_REFERENCE_START_DATE = new Date('2025-07-05T00:00:00Z');
const POSTAL_WORK_WEEK_START_DATE = new Date('2024-11-23T00:00:00Z');
const PP_REFERENCE_DATE = new Date('2024-12-14T00:00:00Z');
const PP_REFERENCE_NUMBER = 1;
const PP_REFERENCE_YEAR = 2025;

const T6_CYCLE_MAP = [
    -1, -1, 0, 1, 2, 3, 4,
    4, -1, -1, 0, 1, 2, 3,
    3, -1, 4, -1, 0, 1, 2,
    2, -1, 3, 4, -1, 0, 1,
    1, -1, 2, 3, 4, -1, 0,
    0, -1, 1, 2, 3, 4, -1
];

const CARRIER_COLORS = {
    'none': { name: 'None', class: 'carrier-none', textClass: 'text-calendar-heading-none' },
    'black': { name: 'Black', class: 'carrier-black', textClass: 'text-calendar-heading-black', baseDayOffIndex: 0, defaultColor: { h: 0, s: 0, l: 0 }, defaultTextColor: '#ffffff', defaultDayCellTextColor: '#ffffff' },
    'yellow': { name: 'Yellow', class: 'carrier-yellow', textClass: 'text-calendar-heading-yellow', baseDayOffIndex: 1, defaultColor: { h: 56, s: 100, l: 50 }, defaultTextColor: '#000000', defaultDayCellTextColor: '#000000' },
    'blue': { name: 'Blue', class: 'carrier-blue', textClass: 'text-calendar-heading-blue', baseDayOffIndex: 2, defaultColor: { h: 225, s: 100, l: 56 }, defaultTextColor: '#ffffff', defaultDayCellTextColor: '#ffffff' },
    'green': { name: 'Green', class: 'carrier-green', textClass: 'text-calendar-heading-green', baseDayOffIndex: 3, defaultColor: { h: 120, s: 100, l: 25 }, defaultTextColor: '#ffffff', defaultDayCellTextColor: '#ffffff' },
    'brown': { name: 'Brown', class: 'carrier-brown', textClass: 'text-calendar-heading-brown', baseDayOffIndex: 4, defaultColor: { h: 30, s: 100, l: 24 }, defaultTextColor: '#ffffff', defaultDayCellTextColor: '#ffffff' },
    'red': { name: 'Red', class: 'carrier-red', textClass: 'text-calendar-heading-red', baseDayOffIndex: 5, defaultColor: { h: 0, s: 100, l: 50 }, defaultTextColor: '#ffffff', defaultDayCellTextColor: '#ffffff' },
    'all': { name: 'All', class: 'carrier-sunday', textClass: 'text-calendar-heading-all' }
};

// --- Accordion State Management ---
function getOpenAccordionIds() {
    const openAccordionIds = [];
    document.querySelectorAll('.settings-accordion-toggle.active').forEach(toggle => {
        if (toggle.id) {
            openAccordionIds.push(toggle.id);
        }
    });
    return openAccordionIds;
}

function saveAccordionStateToSession() {
    const openAccordionIds = getOpenAccordionIds();
    if (openAccordionIds.length > 0) {
        sessionStorage.setItem('mcore-open-accordions', JSON.stringify(openAccordionIds));
    }
}

function restoreAccordionState(ids) {
    if (!ids || ids.length === 0) return;
    ids.forEach(id => {
        const toggle = document.getElementById(id);
        if (toggle) {
            toggle.classList.add('active');
            const panel = toggle.nextElementSibling;
            if (panel) {
                panel.classList.add('show');
            }
        }
    });
}

function applyAccordionStateFromSession() {
    const openAccordionIdsJSON = sessionStorage.getItem('mcore-open-accordions');
    if (openAccordionIdsJSON) {
        const openAccordionIds = JSON.parse(openAccordionIdsJSON);
        restoreAccordionState(openAccordionIds);
        sessionStorage.removeItem('mcore-open-accordions');
    }
}


// --- Theme Management ---
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

// --- Color Customization ---
function loadCustomColors() {
    const savedColors = localStorage.getItem('mcore-custom-colors');
    if (savedColors) {
        customColors = JSON.parse(savedColors);
    } else {
        customColors = {};
    }
    updateColorStyles();
}

function saveCustomColors() {
    localStorage.setItem('mcore-custom-colors', JSON.stringify(customColors));
}

function getCarrierColorProp(colorKey, prop) {
    const defaults = CARRIER_COLORS[colorKey];
    const customs = customColors[colorKey];

    if (prop === 'name') {
        return (customs && customs.name) || defaults.name;
    }
    if (prop === 'color') {
        return (customs && customs.color) || defaults.defaultColor;
    }
    if (prop === 'textColor') {
        return (customs && customs.textColor) || defaults.defaultTextColor;
    }
    if (prop === 'dayCellTextColor') {
        return (customs && customs.dayCellTextColor) || defaults.defaultDayCellTextColor;
    }
    return null;
}

function updateColorStyles() {
    for (const key in CARRIER_COLORS) {
        if (CARRIER_COLORS[key].defaultColor) {
            const color = getCarrierColorProp(key, 'color');
            const textColor = getCarrierColorProp(key, 'textColor');
            const dayCellTextColor = getCarrierColorProp(key, 'dayCellTextColor');
            document.documentElement.style.setProperty(`--carrier-${key}-bg`, `hsl(${color.h}, ${color.s}%, ${color.l}%)`);
            document.documentElement.style.setProperty(`--carrier-${key}-text`, textColor);
            document.documentElement.style.setProperty(`--carrier-${key}-day-cell-text`, dayCellTextColor);
        }
    }
}

function resetCustomColors() {
    customColors = {};
    localStorage.removeItem('mcore-custom-colors');
    updateColorStyles();
    const currentHash = window.location.hash;
    router(currentHash); // Re-render the current page
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
    loadCustomColors();
}

// --- Data Fetching ---
async function fetchAppConfig() {
    if (Object.keys(appConfig).length > 0) return appConfig;
    try {
        // Add a cache-busting query parameter to ensure we always get the latest config
        const response = await fetch(`/mcore/data/app-config.json?t=${new Date().getTime()}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        appConfig = data;
        return data;
    } catch (error) {
        console.error('Could not fetch app config:', error);
        return {};
    }
}

async function fetchEvents() {
    if (allEventsData.length > 0) return allEventsData;
    try {
        const response = await fetch('/mcore/data/events.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
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
        showMisc: true,
        eventImageOpacity: 0.25
    };
    let savedControls = {};
    try {
        const savedControlsRaw = localStorage.getItem('mcore-user-controls');
        if (savedControlsRaw) savedControls = JSON.parse(savedControlsRaw);
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
    if (allAcronymsData.length > 0) return allAcronymsData;
    try {
        const response = await fetch('/mcore/data/acronyms.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        allAcronymsData = data;
        return data;
    } catch (error) {
        console.error('Could not fetch acronyms:', error);
        return [];
    }
}

async function fetchAllResourcesData() {
    if (allResourcesData.length > 0) return allResourcesData;
    try {
        const response = await fetch('/mcore/data/resources.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        allResourcesData = data;
        return data;
    } catch (error) {
        console.error('Could not fetch all resources:', error);
        return [];
    }
}

// --- Date & Calendar Logic ---
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
    if (specialEventsCache[year]) return specialEventsCache[year];
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
            foundEvents.push({ name: event.name, info: event.info, type: event.type, icon: event.icon });
        }
    }
    for (const event of allEventsData) {
        let actualEventDate;
        if (typeof event.day === 'string') {
            const ruleParts = event.day.split('-');
            const nth = ['first', 'second', 'third', 'fourth', 'last'].indexOf(ruleParts[0]);
            const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(ruleParts[1]);
            if (nth !== -1 && dayOfWeek !== -1) {
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
                    tempDate.setDate(tempDate.getDate() + nth * 7);
                    actualEventDate = tempDate;
                }
            }
        } else {
            actualEventDate = new Date(year, event.month - 1, event.day);
        }
        if (actualEventDate) {
            const observedEventDate = (event.type === 'holiday') ? getObservedHolidayDate(actualEventDate) : actualEventDate;
            if (observedEventDate.getDate() === date.getDate() &&
                observedEventDate.getMonth() === date.getMonth() &&
                observedEventDate.getFullYear() === date.getFullYear()) {
                foundEvents.push({ name: event.name, info: event.info || `Information for ${event.name} not available.`, type: event.type, icon: event.icon });
            }
        }
    }
    return foundEvents;
}

function getPostalWorkWeekNumber(date) {
    const targetDateUtcTimestamp = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    const targetDate = new Date(targetDateUtcTimestamp);
    const dayOfWeek = targetDate.getUTCDay();
    if (dayOfWeek !== 6) {
        targetDate.setUTCDate(targetDate.getUTCDate() - (dayOfWeek + 1) % 7);
    }
    const diffTime = targetDate.getTime() - POSTAL_WORK_WEEK_START_DATE.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7) + 1;
}

function getRotatingDayIndex(date, rotationLength) {
    const weekNumber = getPostalWorkWeekNumber(date);
    return (weekNumber - 1) % rotationLength;
}

function getCarrierDayOff(date, carrierColor) {
    if (date.getDay() === 0) return true;
    if (!carrierColor || carrierColor === 'none') return false;
    const carrier = CARRIER_COLORS[carrierColor];
    if (!carrier || typeof carrier.baseDayOffIndex === 'undefined') return false;
    
    const rotatingIndex = getRotatingDayIndex(date, 6);
    const dayOffIndex = (carrier.baseDayOffIndex + rotatingIndex) % 6;

    const actualDayOfWeek = date.getDay();
    const expectedDayOffForDate = dayOffIndex + 1;
    return actualDayOfWeek === expectedDayOffForDate;
}

function getPayDays(year) {
    const payDays = new Set();
    let ppInfoForRef = getPayPeriodInfo(PP_REFERENCE_DATE);
    let currentPayDate = ppInfoForRef.payDate;
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
    t6Routes = savedRoutes ? JSON.parse(savedRoutes) : ['', '', '', '', ''];
}

function saveT6Routes() {
    localStorage.setItem('mcore-t6-routes', JSON.stringify(t6Routes));
}

function getT6RouteForDate(date) {
    if (!t6Routes || t6Routes.length !== 5) return null;
    if (date.getDay() === 0) return null;
    const checkDateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    const diffMillis = checkDateUtc - T6_CYCLE_REFERENCE_START_DATE.getTime();
    const diffDays = Math.floor(diffMillis / (1000 * 60 * 60 * 24));
    const dayInCycle = (diffDays % 42 + 42) % 42;
    const routeIndex = T6_CYCLE_MAP[dayInCycle];
    if (routeIndex !== undefined && routeIndex !== -1) {
        const route = t6Routes[routeIndex];
        return route && route.trim() !== '' ? route : null;
    }
    return null;
}

function loadLetterSchedule() {
    const savedSchedule = localStorage.getItem('mcore-letter-schedule');
    letterSchedule = savedSchedule ? JSON.parse(savedSchedule) : ['', '', '', '', '', ''];
}

function saveLetterSchedule() {
    localStorage.setItem('mcore-letter-schedule', JSON.stringify(letterSchedule));
}

function getLetterForDate(date) {
    if (!letterSchedule || letterSchedule.length !== 6) return null;
    if (date.getUTCDay() === 0) return null; // No letter on Sundays

    let dayOffColorIndex = -1;
    for (const colorKey in CARRIER_COLORS) {
        if (colorKey !== 'all' && colorKey !== 'none') {
            if (getCarrierDayOff(date, colorKey)) {
                dayOffColorIndex = CARRIER_COLORS[colorKey].baseDayOffIndex;
                break;
            }
        }
    }

    if (dayOffColorIndex !== -1) {
        const letter = letterSchedule[dayOffColorIndex];
        return letter && letter.trim() !== '' ? letter : null;
    }
    
    return null;
}


function generateMonthTile(month, year, selectedCarrier) {
    const today = new Date();
    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = getDaysInMonth(month, year);
    const payDaysForYear = getPayDays(year);
    let startDay = firstDayOfMonth.getDay();
    let daysHtml = '';
    for (let i = 0; i < startDay; i++) {
        daysHtml += '<div class="calendar-day other-month"></div>';
    }
    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month, day);
        const formattedDate = new Date(Date.UTC(year, month, day)).toISOString().split('T')[0];
        let dayClasses = ['calendar-day'];
        let paydayHtml = '';
        let t6RouteHtml = '';
        let letterScheduleHtml = '';
        let isOffDay = false;
        let highlightClasses = [];
        let dataAttributes = '';
        let eventInfos = [];
        let dayStyles = '';
        if (currentDate.getDate() === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear()) {
            dayClasses.push('today');
        }
        const isSunday = currentDate.getDay() === 0;
        if (isSunday) {
            isOffDay = true;
            highlightClasses.push('carrier-sunday');
        } else if (selectedCarrier && selectedCarrier !== 'all' && selectedCarrier !== 'none') {
            if (getCarrierDayOff(currentDate, selectedCarrier)) {
                isOffDay = true;
                highlightClasses.push(CARRIER_COLORS[selectedCarrier].class);
            }
        } else if (selectedCarrier === 'all') {
             for (const colorKey in CARRIER_COLORS) {
                if (colorKey !== 'all' && colorKey !== 'none' && getCarrierDayOff(currentDate, colorKey)) {
                    isOffDay = true;
                    highlightClasses.push(CARRIER_COLORS[colorKey].class);
                }
            }
        }

        if (isOffDay) highlightClasses.push('day-off-highlight');
        dayClasses.push(...highlightClasses);
        const events = getEventsForDate(currentDate);
        const visibleEvents = [];
        if (events.length > 0) {
            events.forEach(event => {
                const showEvent = (event.type === 'holiday' && userControls.showHolidays) || 
                                  (event.type === 'daylight-saving' && userControls.showDaylightSaving) || 
                                  (event.type === 'solstice' && userControls.showSolstice) || 
                                  (event.type === 'season' && userControls.showSeasons) ||
                                  (event.type === 'misc' && userControls.showMisc);
                if (showEvent) {
                    visibleEvents.push(event);
                    eventInfos.push({ name: event.name, info: event.info, icon: event.icon });
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

        const scheduleLetter = getLetterForDate(currentDate);
        if (scheduleLetter) {
            letterScheduleHtml = `<span class="schedule-letter">${scheduleLetter}</span>`;
        }

        if (eventInfos.length > 0 || isOffDay || (payDaysForYear.has(formattedDate) && userControls.showPaydays)) {
            dayClasses.push('cursor-pointer');
        } else {
            dayClasses.push('cursor-default');
        }
        daysHtml += `<div class="${dayClasses.join(' ')}" data-date="${currentDate.toISOString().split('T')[0]}" ${dataAttributes} ${dayStyles}>${letterScheduleHtml}<span class="day-number">${day}</span><div class="event-icon-container"></div>${paydayHtml}${t6RouteHtml}</div>`;
    }
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return `<div class="calendar-month-tile card-bg"><div class="calendar-header bg-usps-blue">${monthNames[month]} ${year}<div class="calendar-header-accent-line"></div></div><div class="calendar-day-names">${dayNames.map(name => `<span>${name}</span>`).join('')}</div><div class="calendar-days">${daysHtml}</div></div>`;
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
            contentHtml += `<div class="lightbox-event-item"><img src="/mcore/icons/${event.icon}" alt="${event.name}" class="lightbox-event-icon"><div class="lightbox-event-details"><h4>${event.name}</h4><p>${event.info}</p></div></div>`;
        });
    }
    if (isPayday) {
        contentHtml += `<div class="lightbox-event-item"><img src="/mcore/icons/money-stack250.png" alt="Pay Day" class="lightbox-event-icon"><div class="lightbox-event-details"><h4>Pay Day</h4><p>Your pay should be deposited on or around this date.</p></div></div>`;
    }
    contentHtml += '</div>';
    dynamicContent.innerHTML = contentHtml;
    lightbox.classList.add('active');
}

function closeDayDetailsLightbox() {
    document.getElementById('day-details-lightbox').classList.remove('active');
}

// --- Page Rendering ---
async function renderCalendarPage(year, selectedCarrier = null, options = {}) {
    await fetchEvents();
    await fetchUserControls();
    loadT6Routes();
    loadLetterSchedule();
    const currentCarrierInfo = selectedCarrier ? CARRIER_COLORS[selectedCarrier] : CARRIER_COLORS['all'];
    const headingTextColorClass = currentCarrierInfo.textClass;
    
    appContent.innerHTML = `
        <h2 class="page-title tight-padding ${headingTextColorClass}">Carrier Calendar</h2>
        <div class="calendar-main-nav">
            <button id="prev-year-btn" class="nav-button tight-padding">&laquo;</button>
            <span id="current-year-display" class="current-year-display text-usps-blue">${year}</span>
            <button id="next-year-btn" class="nav-button tight-padding">&raquo;</button>
            <button id="today-calendar-btn" class="nav-button">Today</button>
        </div>

        <div class="settings-accordion">
            <button id="display-options-toggle" class="settings-accordion-toggle">Display Options</button>
            <div id="display-options-panel" class="settings-accordion-panel">
                
                <div class="settings-accordion nested">
                    <button id="color-schedule-toggle" class="settings-accordion-toggle">Color Schedule</button>
                    <div id="color-schedule-panel" class="settings-accordion-panel">
                        <div class="carrier-buttons-grid"></div>
                        <div class="settings-accordion nested">
                            <button id="customize-toggle" class="settings-accordion-toggle">Customize</button>
                            <div id="customize-panel" class="settings-accordion-panel">
                                <p class="info-text">Select a color button above to customize it.</p>
                                <div id="color-customizer-ui" class="color-customizer-ui hidden">
                                    <div class="color-preview-wrapper">
                                        <div id="color-preview-box"></div>
                                        <div class="custom-input-group">
                                            <label for="color-name-input">Name:</label>
                                            <input type="text" id="color-name-input" maxlength="10">
                                        </div>
                                    </div>
                                    <div class="sliders-container">
                                        <div class="slider-group">
                                            <label for="hue-slider">H</label>
                                            <input type="range" id="hue-slider" min="0" max="360" step="1">
                                            <span id="hue-value">0</span>
                                        </div>
                                        <div class="slider-group">
                                            <label for="saturation-slider">S</label>
                                            <input type="range" id="saturation-slider" min="0" max="100" step="1">
                                            <span id="saturation-value">0</span>
                                        </div>
                                        <div class="slider-group">
                                            <label for="lightness-slider">L</label>
                                            <input type="range" id="lightness-slider" min="0" max="100" step="1">
                                            <span id="lightness-value">0</span>
                                        </div>
                                    </div>
                                    <div class="custom-input-group font-color-group">
                                        <label>Button Font:</label>
                                        <div class="font-color-options">
                                            <button data-textcolor="#ffffff" class="font-color-btn light-btn">Light</button>
                                            <button data-textcolor="#000000" class="font-color-btn dark-btn">Dark</button>
                                        </div>
                                    </div>
                                    <div class="custom-input-group font-color-group">
                                        <label>Day Cell Font:</label>
                                        <div class="font-color-options">
                                            <button data-daycelltextcolor="#ffffff" class="font-color-btn day-cell-font-color-btn light-btn">Light</button>
                                            <button data-daycelltextcolor="#000000" class="font-color-btn day-cell-font-color-btn dark-btn">Dark</button>
                                        </div>
                                    </div>
                                </div>
                                <button id="reset-colors-btn" class="nav-button">Reset to Defaults</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="settings-accordion nested">
                    <button id="letter-schedule-toggle" class="settings-accordion-toggle">Letter Schedule</button>
                    <div id="letter-schedule-panel" class="settings-accordion-panel">
                        <p class="info-text">Enter up to 3 characters per field. This will disable the color schedule.</p>
                        <div class="letter-schedule-inputs-wrapper">
                            <div class="letter-schedule-inputs"></div>
                            <button id="clear-letter-schedule-btn" class="nav-button clear-btn">Clear</button>
                        </div>
                    </div>
                </div>

                <div class="settings-accordion nested">
                    <button id="filter-events-toggle" class="settings-accordion-toggle">Filter Calendar Events</button>
                    <div id="filter-events-panel" class="settings-accordion-panel">
                         <div class="user-control-nav-box">
                            <button class="nav-button" data-filter="all">All</button>
                            <button class="nav-button" data-filter="none">None</button>
                            <button class="nav-button ${userControls.showHolidays ? 'selected' : ''}" data-filter="holidays">Holidays</button>
                            <button class="nav-button ${userControls.showSeasons ? 'selected' : ''}" data-filter="seasons">Seasons</button>
                            <button class="nav-button ${userControls.showSolstice ? 'selected' : ''}" data-filter="solstice">Solstices</button>
                            <button class="nav-button ${userControls.showDaylightSaving ? 'selected' : ''}" data-filter="daylightSaving"><span class="full-text">Daylight Savings</span><span class="short-text">DST</span></button>
                            <button class="nav-button ${userControls.showPaydays ? 'selected' : ''}" data-filter="paydays">Pay</button>
                            <button class="nav-button ${userControls.showMisc ? 'selected' : ''}" data-filter="misc">Misc</button>
                        </div>
                        <div class="opacity-slider-container">
                            <label for="event-opacity-slider">Opacity:</label>
                            <input type="range" id="event-opacity-slider" min="0" max="1" step="0.05" value="${userControls.eventImageOpacity || 0.25}">
                            <span id="opacity-value-display">${(userControls.eventImageOpacity || 0.25).toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <div class="settings-accordion nested">
                    <button id="t6-routes-toggle" class="settings-accordion-toggle">T6 Route Rotation</button>
                    <div id="t6-routes-panel" class="settings-accordion-panel">
                         <p class="info-text">Enter your 5 rotating routes. The schedule appears on the calendar in real-time.</p>
                         <div class="t6-route-inputs-wrapper">
                            <div class="t6-route-inputs"></div>
                            <button id="clear-t6-routes-btn" class="nav-button clear-btn">Clear</button>
                         </div>
                    </div>
                </div>

            </div>
        </div>

        <div id="calendar-grid" class="calendar-grid ${selectedCarrier === 'none' ? 'traditional-view' : ''}"></div>
    `;

    const calendarGrid = document.getElementById('calendar-grid');

    function attachDayClickListeners() {
        calendarGrid.querySelectorAll('.calendar-day[data-is-event="true"], .calendar-day[data-is-payday="true"]').forEach(dayCell => {
            dayCell.addEventListener('click', () => openDayDetailsLightbox(dayCell));
        });
    }

    function renderAllMonthTiles() {
        calendarGrid.innerHTML = '';
        for (let i = 0; i < 12; i++) {
            calendarGrid.innerHTML += generateMonthTile(i, year, selectedCarrier);
        }
        attachDayClickListeners();
    }

    function refreshCalendarGridOnly() {
        const activeElement = document.activeElement;
        const isInputActive = activeElement && (
            activeElement.classList.contains('t6-route-input') ||
            activeElement.classList.contains('letter-schedule-input') ||
            activeElement.id === 'color-name-input' ||
            activeElement.closest('.sliders-container') ||
            activeElement.closest('.font-color-options')
        );
    
        // Store more specific info to restore focus accurately
        const activeId = activeElement ? activeElement.id : null;
        const activeClasses = activeElement ? Array.from(activeElement.classList) : [];
        const activeIndex = activeElement?.dataset?.index; // Get the data-index
        const selectionStart = activeElement ? activeElement.selectionStart : 0;
        const selectionEnd = activeElement ? activeElement.selectionEnd : 0;
    
        renderAllMonthTiles();
    
        if (isInputActive) {
            let elementToFocus = null;
            // Build a more specific selector using class and data-index
            const mainClass = activeClasses.find(c => c.includes('-input'));
            if (mainClass && activeIndex !== undefined) {
                elementToFocus = document.querySelector(`.${mainClass}[data-index="${activeIndex}"]`);
            }
            
            // Fallback to ID if the specific selector fails
            if (!elementToFocus && activeId) {
                elementToFocus = document.getElementById(activeId);
            }
    
            if (elementToFocus) {
                elementToFocus.focus();
                // Restore selection range
                if (typeof elementToFocus.setSelectionRange === 'function') {
                    elementToFocus.setSelectionRange(selectionStart, selectionEnd);
                }
            }
        }
    }

    renderAllMonthTiles();

    document.querySelectorAll('.settings-accordion-toggle').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            button.classList.toggle('active');
            const panel = button.nextElementSibling;
            panel.classList.toggle('show');
        });
    });

    const colorSchedulePanel = document.getElementById('color-schedule-panel');
    if (colorSchedulePanel) {
        const carrierButtonsContainer = colorSchedulePanel.querySelector('.carrier-buttons-grid');
        if(carrierButtonsContainer){
            let carrierButtonsHtml = `<button class="carrier-color-button ${CARRIER_COLORS['all'].class} ${selectedCarrier === null || selectedCarrier === 'all' ? 'selected' : ''}" data-carrier-color="all"><span class="button-text">All</span></button>`;
            for (const key in CARRIER_COLORS) {
                if (key !== 'all' && key !== 'none') {
                    const carrier = CARRIER_COLORS[key];
                    const buttonName = getCarrierColorProp(key, 'name');
                    carrierButtonsHtml += `<button class="carrier-color-button ${carrier.class} ${selectedCarrier === key ? 'selected' : ''}" data-carrier-color="${key}"><span class="button-text">${buttonName}</span></button>`;
                }
            }
            carrierButtonsHtml += `<button class="carrier-color-button ${CARRIER_COLORS['none'].class} ${selectedCarrier === 'none' ? 'selected' : ''}" data-carrier-color="none"><span class="button-text">None</span></button>`;
            carrierButtonsContainer.innerHTML = carrierButtonsHtml;
        }
    }
    
    document.getElementById('prev-year-btn').addEventListener('click', () => {
        saveAccordionStateToSession();
        window.location.hash = `#calendar?year=${year - 1}&carrier=${selectedCarrier || ''}`;
    });
    document.getElementById('next-year-btn').addEventListener('click', () => {
        saveAccordionStateToSession();
        window.location.hash = `#calendar?year=${year + 1}&carrier=${selectedCarrier || ''}`;
    });
    document.getElementById('today-calendar-btn').addEventListener('click', () => {
        const actualCurrentYear = new Date().getFullYear();
        if (year !== actualCurrentYear) {
            saveAccordionStateToSession();
            window.location.hash = `#calendar?year=${actualCurrentYear}&carrier=${selectedCarrier || ''}`;
        } else {
            jumpToTodayOnCalendar();
        }
    });

    document.querySelectorAll('.user-control-nav-box .nav-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const openAccordionIds = getOpenAccordionIds();
            const filter = e.currentTarget.dataset.filter;
            const keyMap = { holidays: 'showHolidays', seasons: 'showSeasons', solstice: 'showSolstice', daylightSaving: 'showDaylightSaving', paydays: 'showPaydays', misc: 'showMisc' };
            if (filter === 'all') {
                Object.keys(keyMap).forEach(key => userControls[keyMap[key]] = true);
            } else if (filter === 'none') {
                Object.keys(keyMap).forEach(key => userControls[keyMap[key]] = false);
            } else {
                const key = keyMap[filter];
                if (key) userControls[key] = !userControls[key];
            }
            localStorage.setItem('mcore-user-controls', JSON.stringify(userControls));
            renderCalendarPage(year, selectedCarrier, { openAccordionIds });
        });
    });

    const opacitySlider = document.getElementById('event-opacity-slider');
    const opacityDisplay = document.getElementById('opacity-value-display');
    if (opacitySlider && opacityDisplay) {
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

    // --- Color Customization and Carrier Selection Logic ---
    let selectedColorForCustomization = null;
    const customizerUI = document.getElementById('color-customizer-ui');
    const colorNameInput = document.getElementById('color-name-input');
    const fontColorBtns = document.querySelectorAll('.font-color-btn:not(.day-cell-font-color-btn)');
    const dayCellFontColorBtns = document.querySelectorAll('.day-cell-font-color-btn');
    const colorPreviewBox = document.getElementById('color-preview-box');
    const hueSlider = document.getElementById('hue-slider');
    const saturationSlider = document.getElementById('saturation-slider');
    const lightnessSlider = document.getElementById('lightness-slider');
    const hueValue = document.getElementById('hue-value');
    const saturationValue = document.getElementById('saturation-value');
    const lightnessValue = document.getElementById('lightness-value');
    const resetColorsBtn = document.getElementById('reset-colors-btn');

    document.querySelectorAll('.carrier-color-button').forEach(button => {
        button.addEventListener('click', (event) => {
            const customizeAccordion = document.getElementById('customize-toggle');
            const colorKey = event.currentTarget.dataset.carrierColor;

            if (customizeAccordion.classList.contains('active') && colorKey && colorKey !== 'all' && colorKey !== 'none') {
                event.stopPropagation(); 
                selectedColorForCustomization = colorKey;
                
                document.querySelectorAll('.carrier-color-button.customizing').forEach(b => b.classList.remove('customizing'));
                event.currentTarget.classList.add('customizing');

                const colorData = getCarrierColorProp(colorKey, 'color');
                const nameData = getCarrierColorProp(colorKey, 'name');
                const textColorData = getCarrierColorProp(colorKey, 'textColor');
                const dayCellTextColorData = getCarrierColorProp(colorKey, 'dayCellTextColor');

                customizerUI.classList.remove('hidden');
                colorNameInput.value = nameData;
                
                hueSlider.value = colorData.h;
                saturationSlider.value = colorData.s;
                lightnessSlider.value = colorData.l;

                hueValue.textContent = colorData.h;
                saturationValue.textContent = colorData.s;
                lightnessValue.textContent = colorData.l;

                const colorString = `hsl(${colorData.h}, ${colorData.s}%, ${colorData.l}%)`;
                colorPreviewBox.style.backgroundColor = colorString;

                fontColorBtns.forEach(btn => {
                    btn.classList.toggle('selected', btn.dataset.textcolor === textColorData);
                });
                dayCellFontColorBtns.forEach(btn => {
                    btn.classList.toggle('selected', btn.dataset.daycelltextcolor === dayCellTextColorData);
                });

            } else {
                saveAccordionStateToSession();
                const newCarrier = colorKey || '';
                localStorage.setItem('mcore-selected-carrier', newCarrier);
                window.location.hash = `#calendar?year=${year}&carrier=${newCarrier}`;
            }
        });
    });

    function updateCustomProperty(prop, value) {
        if (!selectedColorForCustomization) return;
        if (!customColors[selectedColorForCustomization]) {
            customColors[selectedColorForCustomization] = {};
        }
        customColors[selectedColorForCustomization][prop] = value;
        saveCustomColors();
    }

    colorNameInput.addEventListener('keyup', () => {
        updateCustomProperty('name', colorNameInput.value);
        const buttonToUpdate = document.querySelector(`.carrier-color-button[data-carrier-color="${selectedColorForCustomization}"] .button-text`);
        if (buttonToUpdate) {
            buttonToUpdate.textContent = colorNameInput.value;
        }
    });

    fontColorBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const newTextColor = btn.dataset.textcolor;
            updateCustomProperty('textColor', newTextColor);
            updateColorStyles();
            fontColorBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            refreshCalendarGridOnly();
        });
    });

    dayCellFontColorBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const newTextColor = btn.dataset.daycelltextcolor;
            updateCustomProperty('dayCellTextColor', newTextColor);
            updateColorStyles();
            dayCellFontColorBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            refreshCalendarGridOnly();
        });
    });

    function handleSliderChange() {
        if (!selectedColorForCustomization) return;

        const h = hueSlider.value;
        const s = saturationSlider.value;
        const l = lightnessSlider.value;

        hueValue.textContent = h;
        saturationValue.textContent = s;
        lightnessValue.textContent = l;

        updateCustomProperty('color', { h: parseInt(h), s: parseInt(s), l: parseInt(l) });
        
        const colorString = `hsl(${h}, ${s}%, ${l}%)`;
        colorPreviewBox.style.backgroundColor = colorString;
        
        updateColorStyles();
        refreshCalendarGridOnly();
    }

    hueSlider.addEventListener('input', handleSliderChange);
    saturationSlider.addEventListener('input', handleSliderChange);
    lightnessSlider.addEventListener('input', handleSliderChange);
    
    resetColorsBtn.addEventListener('click', () => {
        saveAccordionStateToSession();
        resetCustomColors();
    });

    // --- Letter Schedule & T6 Route Input Logic ---
    function setupInputNavigation(selector, dataArray, saveFunction, onUpdate) {
        const inputs = document.querySelectorAll(selector);

        inputs.forEach((input, idx) => {
            // Use 'input' event for live updates as the user types, pastes, etc.
            input.addEventListener('input', (e) => {
                dataArray[idx] = e.target.value.toUpperCase();
                saveFunction();
                onUpdate();
            });

            // Use 'keydown' for special key handling like 'Enter'
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault(); // Prevent form submission
                    if (idx < inputs.length - 1) {
                        inputs[idx + 1].focus(); // Move to next input
                    } else {
                        inputs[idx].blur(); // Or blur the last input
                    }
                }
            });
        });
    }

    const t6InputsContainer = document.querySelector('.t6-route-inputs');
    if (t6InputsContainer) {
        let t6InputHtml = '';
        for (let i = 0; i < 5; i++) {
            t6InputHtml += `<input type="text" inputmode="numeric" pattern="[0-9]*" class="t6-route-input" data-index="${i}" value="${t6Routes[i] || ''}" placeholder="R${i+1}" maxlength="3">`;
        }
        t6InputsContainer.innerHTML = t6InputHtml;
        setupInputNavigation('.t6-route-input', t6Routes, saveT6Routes, refreshCalendarGridOnly);
    }

    const letterInputsContainer = document.querySelector('.letter-schedule-inputs');
    if (letterInputsContainer) {
        let letterInputHtml = '';
        for (let i = 0; i < 6; i++) {
            letterInputHtml += `<input type="text" class="letter-schedule-input" data-index="${i}" value="${letterSchedule[i] || ''}" placeholder="L${i+1}" maxlength="3">`;
        }
        letterInputsContainer.innerHTML = letterInputHtml;

        setupInputNavigation('.letter-schedule-input', letterSchedule, saveLetterSchedule, () => {
            const isUsingLetters = letterSchedule.some(l => l.trim() !== '');
            const wasUsingLetters = selectedCarrier === 'none' && !letterSchedule.every(l => l.trim() === '');
            
            if (isUsingLetters && !wasUsingLetters) {
                saveAccordionStateToSession();
                window.location.hash = `#calendar?year=${year}&carrier=none`;
            } else if (!isUsingLetters && wasUsingLetters) {
                saveAccordionStateToSession();
                const lastCarrier = localStorage.getItem('mcore-selected-carrier') || 'all';
                window.location.hash = `#calendar?year=${year}&carrier=${lastCarrier}`;
            } else {
                refreshCalendarGridOnly();
            }
        });
    }

    const clearLetterScheduleBtn = document.getElementById('clear-letter-schedule-btn');
    if (clearLetterScheduleBtn) {
        clearLetterScheduleBtn.addEventListener('click', () => {
            letterSchedule = ['', '', '', '', '', ''];
            saveLetterSchedule();
            const openAccordionIds = getOpenAccordionIds();
            const lastCarrier = localStorage.getItem('mcore-selected-carrier') || 'all';
            renderCalendarPage(year, lastCarrier, { openAccordionIds });
        });
    }

    const clearT6RoutesBtn = document.getElementById('clear-t6-routes-btn');
    if (clearT6RoutesBtn) {
        clearT6RoutesBtn.addEventListener('click', () => {
            t6Routes = ['', '', '', '', ''];
            saveT6Routes();
            const openAccordionIds = getOpenAccordionIds();
            renderCalendarPage(year, selectedCarrier, { openAccordionIds });
        });
    }


    // Restore accordion state
    if (options.openAccordionIds) {
        restoreAccordionState(options.openAccordionIds);
    } else {
        applyAccordionStateFromSession();
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
    ppEndDate.setUTCDate(ppEndDate.getUTCDate() + 13);
    const payDate = new Date(ppEndDate.getTime());
    payDate.setUTCDate(ppEndDate.getUTCDate() + 7);
    return { payPeriodYear: currentPayPeriodYear, payPeriodNumber: String(currentPayPeriodNumber).padStart(2, '0'), startDate: ppStartDate, endDate: ppEndDate, payDate: payDate };
}

function formatDate(date) {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
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
    for (let i = 0; i < 28; i++) {
        const ppInfo = getPayPeriodInfo(currentDate);
        if (ppInfo.payPeriodYear > year && ppInfo.payPeriodNumber > 2) break;
        const isCurrentPayPeriod = normalizedToday >= ppInfo.startDate && normalizedToday <= ppInfo.endDate;
        const rowClasses = isCurrentPayPeriod ? 'current-pay-period-row' : '';
        tableRowsHtml += `<tr class="${rowClasses}"><td>${ppInfo.payPeriodYear}-${ppInfo.payPeriodNumber}</td><td>${formatDate(ppInfo.startDate)}</td><td>${formatDate(ppInfo.endDate)}</td><td class="pay-date">${formatDate(ppInfo.payDate)}</td></tr>`;
        let nextDate = new Date(currentDate.getTime());
        nextDate.setUTCDate(nextDate.getUTCDate() + 14);
        currentDate = nextDate;
    }
    appContent.innerHTML = `<div class="page-content-wrapper align-center"><h2 class="page-title">Pay Periods</h2><div class="calendar-main-nav"><button id="prev-pp-year-btn" class="nav-button tight-padding">&laquo;</button><span id="current-pp-year-display" class="current-year-display text-usps-blue">${year}</span><button id="next-pp-year-btn" class="nav-button tight-padding">&raquo;</button><button id="today-pay-period-btn" class="nav-button">Today</button></div><div class="table-container"><table class="pay-period-table"><thead><tr><th>Pay Period (YR-PP)</th><th>Pay Period Start</th><th>Pay Period End</th><th>Pay Date</th></tr></thead><tbody>${tableRowsHtml}</tbody></table></div></div>`;
    const prevPPYearBtn = document.getElementById('prev-pp-year-btn');
    const nextPPYearBtn = document.getElementById('next-pp-year-btn');
    const todayPayPeriodBtn = document.getElementById('today-pay-period-btn');
    prevPPYearBtn.addEventListener('click', () => { window.location.hash = `#pay-periods?year=${year - 1}`; });
    nextPPYearBtn.addEventListener('click', () => { window.location.hash = `#pay-periods?year=${year + 1}`; });
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
    appContent.innerHTML = `<div class="page-content-wrapper align-left"><h2 class="page-title">Useful Acronyms</h2><div class="acronym-controls-group"><div class="acronym-search-input-wrapper"> <input type="text" id="acronym-search" placeholder="Search acronyms..." class="text-input search-input"></div><div class="sort-buttons-group"><button id="sort-acronym-asc" class="nav-button">Sort A-Z</button><button id="sort-acronym-desc" class="nav-button">Sort Z-A</button></div></div><div class="table-container"><table class="acronyms-table"><thead><tr><th>Acronym</th><th>Meaning</th></tr></thead><tbody id="acronyms-table-body"></tbody></table></div></div>`;
    const acronymsTableBody = document.getElementById('acronyms-table-body');
    const acronymsSearchInput = document.getElementById('acronym-search');
    const sortAcronymAscBtn = document.getElementById('sort-acronym-asc');
    const sortAcronymDescBtn = document.getElementById('sort-acronym-desc');
    let currentSortOrder = 'asc';
    function renderAcronymsTable() {
        let filteredAcronyms = [...allAcronymsData];
        const searchTerm = acronymsSearchInput.value.toLowerCase();
        if (searchTerm) {
            filteredAcronyms = filteredAcronyms.filter(item => item.acronym.toLowerCase().includes(searchTerm) || item.meaning.toLowerCase().includes(searchTerm));
        }
        const sortedAcronyms = filteredAcronyms.sort((a, b) => currentSortOrder === 'asc' ? a.acronym.localeCompare(b.acronym) : b.acronym.localeCompare(a.acronym));
        acronymsTableBody.innerHTML = sortedAcronyms.map(item => `<tr><td class="font-semibold">${item.acronym}</td><td>${item.meaning}</td></tr>`).join('');
    }
    renderAcronymsTable();
    acronymsSearchInput.addEventListener('keyup', renderAcronymsTable);
    sortAcronymAscBtn.addEventListener('click', () => { currentSortOrder = 'asc'; renderAcronymsTable(); });
    sortAcronymDescBtn.addEventListener('click', () => { currentSortOrder = 'desc'; renderAcronymsTable(); });
}

async function router() {
    if (timeTableInterval) {
        clearInterval(timeTableInterval);
        timeTableInterval = null;
    }
    const hash = window.location.hash;
    const urlParams = new URLSearchParams(hash.split('?')[1]);
    const currentYear = new Date().getFullYear();

    if (hash.startsWith('#calendar')) {
        const year = parseInt(urlParams.get('year')) || currentYear;
        let carrier = urlParams.get('carrier');

        if (carrier === null) {
            carrier = localStorage.getItem('mcore-selected-carrier') || 'all';
             if (!localStorage.getItem('mcore-calendar-visited')) {
                localStorage.setItem('mcore-calendar-visited', 'true');
            }
        }
        
        renderCalendarPage(year, carrier);
    } else if (hash.startsWith('#resources')) {
        renderResourcesPage();
    } else if (hash.startsWith('#acronyms')) {
        renderAcronymsPage();
    } else if (hash.startsWith('#pay-periods')) {
        const year = parseInt(urlParams.get('year')) || currentYear;
        renderPayPeriodsPage(year);
    } else if (hash.startsWith('#time-table')) {
        renderTimeTablePage();
    } else if (hash === '#disclaimer') {
        renderDisclaimerPage();
    } else {
        renderLandingPage();
    }
}

function renderLandingPage() {
    appContent.innerHTML = `<div class="page-content-wrapper align-center"><h2 class="page-title">Welcome to mCORE</h2><p class="homepage-description"><span class="acronym-highlight">M</span>ail <span class="acronym-highlight">C</span>arrier <span class="acronym-highlight">O</span>perational <span class="acronym-highlight">R</span>esource & <span class="acronym-highlight">E</span>ncyclopedia</p><p class="homepage-info-text">No Ads<br>Always Free<br>Open-source & Safe<br>No Data Collection or Selling Your Info<br>Works great Offline, with Optional Web Links<br></p><div class="button-group"><a href="#disclaimer" id="disclaimer-link" class="button primary-button">Terms & Conditions</a></div><div class="logo-display-area"><img src="/mcore/icons/mcore-logo.png" alt="mCORE Logo" class="mcore-logo-large" onerror="this.onerror=null; this.src='${MCORE_LOGO_FALLBACK_PATH}';" /></div></div>`;
}

function renderDisclaimerPage() {
    appContent.innerHTML = `<div class="page-content-wrapper align-left"><h2 class="page-title">Terms & Conditions / Disclaimer of Responsibility</h2><div class="disclaimer-content-area"><p class="info-text"><strong>Important Disclaimer:</strong> This mCORE application is provided for informational and reference purposes only. It is developed independently by a mail carrier, for ALL mail carriers, and is not affiliated with, endorsed by, or sponsored by the United States Postal Service (USPS), any labor union, or any other official entity.</p><p class="info-text">While every effort has been made to ensure the accuracy of the information provided (including, but not limited to, calendar schedules, NALC Resource and federal holidays), this application does not constitute official guidance or legal advice. Postal regulations, labor laws, union contracts, and operational procedures are complex and subject to change.</p><p class="info-text"><strong>Users are solely responsible for verifying all information presented in this application with official USPS sources, union representatives, and/or relevant legal counsel.</strong></p><p class="info-text">The developer(s) of this application disclaim all liability for any errors or omissions in the content provided, or for any actions taken or not taken in reliance on the information contained herein. By using this application, you agree to these terms and understand that you use it at your own risk. The developer(s) shall not be liable for any direct, indirect, incidental, consequential, or punitive damages arising out of your access to, or use of, or inability to use this application.</p><p class="info-text">This application is provided "as is" without warranty of any kind, either express or implied, including, but not limited to, the implied warranties of merchantability, fitness for a particular purpose, or non-infringement.</p><p class="info-text">Thank you for your understanding and continued dedication as a mail carrier.</p><div class="button-group"><a href="#landing" class="button primary-button">Back to Home</a></div><div class="logo-display-area"><img src="/mcore/icons/mcore-logo.png" alt="mCORE Logo" class="mcore-logo-large" onerror="this.onerror=null; this.src='${MCORE_LOGO_FALLBACK_PATH}';" /></div></div></div>`;
}

function renderResourcesPage() {
    appContent.innerHTML = `<div class="page-content-wrapper align-left"><h2 class="page-title">Useful Resources</h2><p class="info-text">This section provides links to publicly available resources and internal app tools for mail carriers. Please note that mCORE is an independent application and is not affiliated with USPS, or any other official entity, NALC, NRLCA, or any other union. Always verify information with official sources.</p><ul id="resources-list" class="resource-list"></ul><div class="button-group"><a href="#landing" class="button primary-button">Back to Home</a></div></div>`;
    const resourcesList = document.getElementById('resources-list');
    fetchAllResourcesData().then(data => {
        if (data && data.length > 0) {
            resourcesList.innerHTML = data.map(item => {
                const isInternal = item.url.startsWith('#');
                return `<li><a href="${item.url}" ${isInternal ? '' : 'target="_blank" rel="noopener noreferrer"'} class="resource-link">${item.title}</a><p class="resource-description">${item.description}</p></li>`;
            }).join('');
        } else {
            resourcesList.innerHTML = '<li>No resources available at this time.</li>';
        }
    });
}

function renderTimeTablePage() {
    const timeData = [
        { min: 0, hun: '00' }, { min: 1, hun: '02' }, { min: 2, hun: '03' }, { min: 3, hun: '05' }, { min: 4, hun: '07' }, { min: 5, hun: '08' }, { min: 6, hun: '10' }, { min: 7, hun: '12' }, { min: 8, hun: '13' }, { min: 9, hun: '15' }, { min: 10, hun: '17' }, { min: 11, hun: '18' }, { min: 12, hun: '20' }, { min: 13, hun: '22' }, { min: 14, hun: '23' },
        { min: 15, hun: '25' }, { min: 16, hun: '27' }, { min: 17, hun: '28' }, { min: 18, hun: '30' }, { min: 19, hun: '32' }, { min: 20, hun: '33' }, { min: 21, hun: '35' }, { min: 22, hun: '37' }, { min: 23, hun: '38' }, { min: 24, hun: '40' }, { min: 25, hun: '42' }, { min: 26, hun: '43' }, { min: 27, hun: '45' }, { min: 28, hun: '47' }, { min: 29, hun: '48' },
        { min: 30, hun: '50' }, { min: 31, hun: '52' }, { min: 32, hun: '53' }, { min: 33, hun: '55' }, { min: 34, hun: '57' }, { min: 35, hun: '58' }, { min: 36, hun: '60' }, { min: 37, hun: '62' }, { min: 38, hun: '63' }, { min: 39, hun: '65' }, { min: 40, hun: '67' }, { min: 41, hun: '68' }, { min: 42, hun: '70' }, { min: 43, hun: '72' }, { min: 44, hun: '73' },
        { min: 45, hun: '75' }, { min: 46, hun: '77' }, { min: 47, hun: '78' }, { min: 48, hun: '80' }, { min: 49, hun: '82' }, { min: 50, hun: '83' }, { min: 51, hun: '85' }, { min: 52, hun: '87' }, { min: 53, hun: '88' }, { min: 54, hun: '90' }, { min: 55, hun: '92' }, { min: 56, hun: '93' }, { min: 57, hun: '95' }, { min: 58, hun: '97' }, { min: 59, hun: '98' }
    ];
    const hourData = [
        { ord: '12 Midnight', mil: '0000', hour: 0 }, { ord: '1:00 AM', mil: '0100', hour: 1 }, { ord: '2:00 AM', mil: '0200', hour: 2 }, { ord: '3:00 AM', mil: '0300', hour: 3 }, { ord: '4:00 AM', mil: '0400', hour: 4 }, { ord: '5:00 AM', mil: '0500', hour: 5 }, { ord: '6:00 AM', mil: '0600', hour: 6 }, { ord: '7:00 AM', mil: '0700', hour: 7 }, { ord: '8:00 AM', mil: '0800', hour: 8 }, { ord: '9:00 AM', mil: '0900', hour: 9 }, { ord: '10:00 AM', mil: '1000', hour: 10 }, { ord: '11:00 AM', mil: '1100', hour: 11 },
        { ord: '12 Noon', mil: '1200', hour: 12 }, { ord: '1:00 PM', mil: '1300', hour: 13 }, { ord: '2:00 PM', mil: '1400', hour: 14 }, { ord: '3:00 PM', mil: '1500', hour: 15 }, { ord: '4:00 PM', mil: '1600', hour: 16 }, { ord: '5:00 PM', mil: '1700', hour: 17 }, { ord: '6:00 PM', mil: '1800', hour: 18 }, { ord: '7:00 PM', mil: '1900', hour: 19 }, { ord: '8:00 PM', mil: '2000', hour: 20 }, { ord: '9:00 PM', mil: '2100', hour: 21 }, { ord: '10:00 PM', mil: '2200', hour: 22 }, { ord: '11:00 PM', mil: '2300', hour: 23 }
    ];

    let minutesTable = '<div class="time-table-section"><h3>Minutes to Hundredths</h3><table class="time-table"><thead><tr><th>Min</th><th>Hun</th><th>Min</th><th>Hun</th><th>Min</th><th>Hun</th><th>Min</th><th>Hun</th></tr></thead><tbody>';
    for (let i = 0; i < 15; i++) {
        minutesTable += `<tr>`;
        for (let j = 0; j < 4; j++) {
            const index = i + (j * 15);
            if (index < 60) {
                minutesTable += `<td data-minute="${timeData[index].min}">${timeData[index].min}</td><td>.${timeData[index].hun}</td>`;
            }
        }
        minutesTable += `</tr>`;
    }
    minutesTable += '</tbody></table></div>';

    let hoursTable = '<div class="time-table-section"><h3>Ordinary Time to 24-Hour Time</h3><table class="time-table"><thead><tr><th>Ordinary</th><th>24-Hour</th><th>Ordinary</th><th>24-Hour</th></tr></thead><tbody>';
    for (let i = 0; i < 12; i++) {
        hoursTable += `<tr><td data-hour="${hourData[i].hour}">${hourData[i].ord}</td><td>${hourData[i].mil}</td><td data-hour="${hourData[i+12].hour}">${hourData[i+12].ord}</td><td>${hourData[i+12].mil}</td></tr>`;
    }
    hoursTable += '</tbody></table></div>';

    appContent.innerHTML = `<div class="page-content-wrapper align-center"><h2 class="page-title">Time Conversion Table</h2><div class="time-table-container">${hoursTable}${minutesTable}</div></div>`;
    
    function updateHighlight() {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        document.querySelectorAll('.time-table .current-time-cell').forEach(el => {
            el.classList.remove('current-time-cell');
        });

        const hourCells = document.querySelectorAll(`.time-table td[data-hour="${currentHour}"]`);
        hourCells.forEach(cell => {
            cell.classList.add('current-time-cell');
            if (cell.nextElementSibling) {
                cell.nextElementSibling.classList.add('current-time-cell');
            }
        });

        const minuteCell = document.querySelector(`.time-table td[data-minute="${currentMinute}"]`);
        if (minuteCell) {
            minuteCell.classList.add('current-time-cell');
            if (minuteCell.nextElementSibling) {
                minuteCell.nextElementSibling.classList.add('current-time-cell');
            }
        }
    }

    updateHighlight();
    timeTableInterval = setInterval(updateHighlight, 1000);
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
            if (event.target === lightbox) closeDayDetailsLightbox();
        });
    }
    const currentYearSpan = document.getElementById('current-year');
    if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();
    const appVersionSpan = document.getElementById('app-version');
    if (appVersionSpan && appConfig.version && typeof appConfig.cacheVersion !== 'undefined') {
        appVersionSpan.textContent = `${appConfig.version}.${appConfig.cacheVersion}`;
    }
    const contactEmailLink = document.getElementById('contact-email-link');
    if (contactEmailLink) {
        const user = 'a.mailman.sam';
        const domain = 'gmail.com';
        contactEmailLink.href = `mailto:${user}@${domain}`;
        contactEmailLink.textContent = 'Contact';
    }
    initPreferences();
    router();
    updateLiveTime();
    setInterval(updateLiveTime, 1000);
    if (scrollToTopBtn) {
        window.addEventListener('scroll', () => {
            window.scrollY > 300 ? scrollToTopBtn.classList.remove('hidden') : scrollToTopBtn.classList.add('hidden');
        });
        scrollToTopBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
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
    
    // --- Service Worker Registration and Update Logic ---
    if ('serviceWorker' in navigator) {
        const swUrl = `/mcore/service-worker.js?v=${appConfig.cacheVersion || '1'}`;

        navigator.serviceWorker.register(swUrl)
            .then(registration => {
                console.log('ServiceWorker registration successful');

                // Check for updates on page load
                registration.update();

                registration.addEventListener('updatefound', () => {
                    const installingWorker = registration.installing;
                    if (installingWorker) {
                        installingWorker.addEventListener('statechange', () => {
                            if (installingWorker.state === 'installed') {
                                // The new worker is installed and waiting.
                                // If there's an active controller, we can assume this is an update.
                                if (navigator.serviceWorker.controller) {
                                    console.log('New content is available and will be used when all tabs for this page are closed.');
                                    // Optionally, prompt the user to reload
                                } else {
                                    console.log('Content is cached for offline use.');
                                }
                            }
                        });
                    }
                });
            })
            .catch(err => {
                console.error('ServiceWorker registration failed: ', err);
            });

        let refreshing;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) return;
            console.log('New service worker has taken control. Reloading page...');
            window.location.reload();
            refreshing = true;
        });
    }
});
