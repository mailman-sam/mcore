# mCORE - Mail Carrier Operational Resource & Encyclopedia

**[Live Demo](https://mailman-sam.github.io/mcore/)**

## Project Overview

mCORE is a minimalist, streamlined, and modern web application designed to be a functional and user-friendly resource for mail carriers. Built by a mail carrier, for all mail carriers, it provides essential tools and information to help manage schedules, understand pay periods, and quickly reference postal acronyms and resources.

This application is completely free, open-source, and committed to user privacy: it collects no user data, serves no ads, and has no affiliation with USPS or any union.

## Key Features

mCORE is packed with features designed to make a mail carrier's job a little easier. Here’s a detailed look at what the application can do.

### Core Features
* **Live USPS Time Clock:** A sleek, live-updating display in the header shows the current date, standard 24-hour time (with seconds), and the special USPS 24-hour decimal time, all based on the user's local timezone.
* **Dynamic Calendar:** A fully interactive calendar that displays carrier-specific schedules, holidays, and other important events.
* **Customizable Rotating Schedules:**
    * **Color Schedule:** Highlights non-service days for all six carrier color codes (Black, Yellow, Blue, Green, Brown, Red).
    * **Letter Schedule:** Input a custom letter-based rotation (e.g., A, B, C) that appears directly on the calendar days.
    * **T6 Route Rotation:** Enter your 5-route T6 string, and the calendar will display which route is scheduled for each day based on the official 42-day cycle.
* **Advanced Color Customization:** Take control of the calendar's appearance by customizing the name, background color (using HSL sliders), and font color for each of the six carrier color codes.
* **Event Highlighting & Filtering:** Automatically displays Federal Holidays, seasonal changes, Daylight Saving Time, paydays, and other events. A responsive control panel allows you to toggle the visibility of different event types and adjust the opacity of event background images.
* **Time Conversion Table:** An internal tool that displays a detailed breakdown of minutes to hundredths and ordinary time to 24-hour time, with the current hour and minute highlighted in real-time.
* **Pay Period Tracker:** A continuous, scrollable table of pay periods with start dates, end dates, and pay dates clearly marked. The current pay period is always highlighted.
* **Acronyms Database:** A searchable and sortable reference for common USPS acronyms.
* **Resource Hub:** A curated list of safe, direct links to official websites and internal app tools.

### Technical & UI Features
* **Responsive Design:** The interface is optimized for a seamless experience on desktops, tablets, and mobile devices.
* **Light & Dark Modes:** Switch between themes for comfortable viewing in any lighting condition.
* **Progressive Web App (PWA):** Installable on your device for an app-like experience and easy access from your home screen.
* **Offline Functionality:** Thanks to a service worker, the app works reliably even without an internet connection.
* **"Scroll to Top" Button:** A convenient button appears when you scroll down the page, allowing you to quickly return to the top.
* **Privacy Focused:** The application collects no user data, serves no ads, and is completely free and open-source.

## Installation and Setup

### Local Development

To run the project on your local machine, you'll need a simple web server. Using a server is necessary for the application's features, like fetching JSON data, to work correctly.

1.  **Clone the Repository:**
    ```bash
    git clone [https://github.com/mailman-sam/mcore.git](https://github.com/mailman-sam/mcore.git)
    ```
2.  **Set Up a Local Server:**
    * **Using Python:** If you have Python installed, navigate to the `mcore` directory in your terminal and run:
        ```bash
        # For Python 3
        python -m http.server
        ```
    * **Using Node.js:** If you have Node.js, you can install a simple server package:
        ```bash
        npm install -g serve
        serve .
        ```
    * **Using Apache:** Place the `mcore` folder in your Apache server's document root (e.g., `/var/www/html/`).
3.  **Access the Application:** Open your browser and navigate to the local address provided by your server (e.g., `http://localhost:8000` or `http://localhost/mcore/`).

### GitHub Pages Deployment

The project is ready for deployment to GitHub Pages.

1.  **Push to GitHub:** Make sure your project is pushed to a public GitHub repository.
2.  **Configure GitHub Pages:**
    * In your repository, go to **Settings > Pages**.
    * Under "Build and deployment," set the "Source" to **Deploy from a branch**.
    * Select your primary branch (e.g., `main`) and the `/ (root)` folder.
    * Click **Save**.
3.  **Your site will be live** at `https://your-username.github.io/your-repository-name/` within a few minutes.

## Usage Guide

mCORE is designed to be intuitive and easy to use. Here’s how to get the most out of its features.

### Navigation

* **Main Menu:** Use the links in the header to switch between the Calendar, Resources, Acronyms, and Pay pages.
* **Theme Toggle:** Click the sun/moon icon in the top-left corner to switch between light and dark modes.

### Calendar Page

* **Year Navigation:** Use the "Previous," "Next," and "Current Year" buttons to navigate through the years. Click "Today" to jump to the current month and highlight the current day.
* **Display Options:** All customization features are located within the "Display Options" accordion menu.
    * **Color Schedule:** Select a color from the grid to see the corresponding rotating non-service days. To customize a color, open the "Customize" accordion, select a color button, and use the controls to change its name, color, and font properties.
    * **Letter Schedule:** Enter your custom schedule in the input fields. This will override the color schedule.
    * **T6 Route Rotation:** Enter your 5 T6 routes to see them displayed on the calendar.
    * **Filter Events:** Use the buttons to show or hide different types of event icons on the calendar. Your preferences are saved automatically.
* **Day Details:** Click on any day with an icon to open a pop-up with detailed information about the events on that day.

### Pay Periods Page

The current pay period is always highlighted. Use the navigation buttons at the top to browse through different years.

### Acronyms Page

* **Search:** Use the search bar to filter the list by acronym or meaning.
* **Sort:** Click the "Sort A-Z" or "Sort Z-A" buttons to reorder the table.

### Installing the App

If your browser supports Progressive Web Apps (PWAs), an "Install App" button will appear in the header. Click it to add mCORE to your home screen for easy access.

## Technical Overview

This document provides a technical overview of the mCORE application, including its file structure and the role of each technology.

### File Structure

The project is organized into a clear and logical structure:

* `index.html`: The single-page entry point for the application.
* `css/style.css`: Contains all the custom styles, including responsive design and theming.
* `js/app.js`: The core of the application. This file handles routing, dynamic content generation, event handling, and all other client-side logic.
* `data/`: This directory holds all the application's data in JSON format, making it easy to update and maintain.
    * `events.json`: Contains data for holidays, seasons, and other calendar events.
    * `acronyms.json`: The list of USPS acronyms.
    * `resources.json`: The list of external resource links.
    * `app-config.json`: Contains versioning and other application-level configuration.
* `service-worker.js`: Implements the caching strategy for offline functionality.
* `manifest.json`: The web app manifest that enables PWA features.

### Core Technologies

* **HTML5, CSS3, JavaScript (ES6+):** The application is built with modern web standards, without relying on any external frameworks or libraries.
* **JSON:** Used as a simple and lightweight format for storing all application data.
* **Service Worker:** The service worker uses a cache-first strategy to ensure the application is always available offline and loads quickly.
* **Local Storage:** User preferences for the theme, carrier selections, custom colors, T6 routes, and letter schedules are saved in the browser's local storage for persistence.

## Contributing

Contributions are welcome and appreciated! Whether you're fixing a bug, adding a new feature, or improving the documentation, your help makes mCORE better for everyone.

### How to Contribute

1.  **Fork the Repository:** Start by forking the main repository to your own GitHub account.
2.  **Create a New Branch:** For each new feature or bug fix, create a new branch in your fork:
    ```bash
    git checkout -b your-feature-name
    ```
3.  **Make Your Changes:** Make your changes to the code, and be sure to test them thoroughly.
4.  **Submit a Pull Request:** Once you're happy with your changes, push your branch to your fork and open a pull request to the main repository. Please provide a clear description of the changes you've made.

### Reporting Bugs

If you find a bug, please open an issue in the repository's "Issues" tab. Be sure to include:
* A clear and descriptive title.
* Steps to reproduce the bug.
* What you expected to happen and what actually happened.
* Screenshots, if helpful.

### Suggesting Features

Have an idea for a new feature? Open an issue and describe your suggestion. We'd love to hear it!

## Contact

For any inquiries, please contact: a.mailman.sam@gmail.com

This project adheres to [Semantic Versioning](https://semver.org/).
