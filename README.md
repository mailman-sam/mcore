# mCORE - Mail Carrier Operational Resource & Encyclopedia

## Project Overview

mCORE is a minimalist, streamlined, and modern web application designed to be a functional and user-friendly resource for mail carriers. Built by a mail carrier, for all mail carriers, it provides essential tools and information to help manage schedules, understand pay periods, and quickly reference postal acronyms and NALC resources.

This application is completely free, open-source, and committed to user privacy: it collects no user data, serves no ads, and has no affiliation with USPS or any union.

## Key Features

* **Responsive Design:** Optimized for seamless use across desktop, Android, and Apple mobile devices.

* **Theme Toggle:** Switch between light and dark modes for optimal viewing comfort.

* **Dynamic Calendar:**
    * Generates monthly calendars for various years.
    * Highlights carrier-specific non-service days (Black, Yellow, Blue, Green, Brown, Red) based on rotating schedules.
    * Highlights universal Sundays with a distinct color.
    * Identifies and provides information on Federal Holidays via interactive lightboxes.

* **Continuous Pay Periods:** Displays a scrollable table of pay periods, including start dates, end dates, and pay dates, with the current pay period highlighted.

* **Useful Acronyms:** A searchable and sortable table of common USPS acronyms and their meanings, including carrier endorsements and forms.

* **NALC Resources:** Provides direct, safe links to official NALC website pages for contract information, CCA resources, retirement, and more.

* **PWA (Progressive Web App):** Installable on mobile and desktop devices for an app-like experience and offline access.

* **Disclaimer:** Clear terms and conditions outlining the app's independent nature and disclaimer of liability.

## Technologies Used

* **HTML5:** For semantic structure.

* **CSS3:** Custom styling and responsive design.

* **Tailwind CSS (CDN):** Utility-first CSS framework for rapid styling.

* **JavaScript (ES6+):** For all dynamic content generation, routing, and interactive features.

* **JSON:** For storing dynamic data (Federal Holidays, Acronyms, NALC Resources).

* **Service Worker:** Enables offline capabilities and faster loading.

## Project Structure