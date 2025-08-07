# mCORE - Mail Carrier Operational Resource & Encyclopedia

## Project Overview

mCORE is a minimalist, streamlined, and modern web application designed to be a functional and user-friendly resource for mail carriers. Built by a mail carrier, for all mail carriers, it provides essential tools and information to help manage schedules, understand pay periods, and quickly reference postal acronyms and resources.

This application is completely free, open-source, and committed to user privacy: it collects no user data, serves no ads, and has no affiliation with USPS or any union.

## Key Features

* **Live USPS Time Clock:** A sleek, live-updating display in the header shows the current date, standard 24-hour time (with seconds), and the special USPS 24-hour decimal time, all based on the user's local timezone.
* **Dynamic Calendar:**
    * Generates monthly calendars for various years.
    * Highlights carrier-specific non-service days (Black, Yellow, Blue, Green, Brown, Red) based on rotating schedules.
    * Identifies and provides information on Federal Holidays, seasonal changes, paydays, and other events like the Stamp Out Hunger Food Drive.
* **Time Conversion Table:** An internal tool that displays a detailed breakdown of minutes to hundredths and ordinary time to 24-hour time, with the current hour and minute highlighted in real-time.
* **Pay Period Tracker:** A continuous, scrollable table of pay periods with start dates, end dates, and pay dates clearly marked. The current pay period is always highlighted.
* **Acronyms Database:** A searchable and sortable reference for common USPS acronyms.
* **Resource Hub:** A curated list of safe, direct links to official websites and internal app tools.
* **PWA (Progressive Web App):** Installable on mobile and desktop devices for an app-like experience and robust offline access.
* **Privacy Focused:** The application collects no user data, serves no ads, and is completely free and open-source.

## Technologies Used

* **HTML5:** For semantic structure.
* **CSS3:** Custom styling and responsive design.
* **JavaScript (ES6+):** For all dynamic content generation, routing, and interactive features.
* **JSON:** For storing dynamic data (events, acronyms, resources).
* **Service Worker:** Enables offline capabilities and faster loading.

## Project Structure
```bash
mcore/
├── index.html              # Main application entry point
├── css/
│   └── style.css           # Custom CSS for styling and responsive layouts
├── js/
│   └── app.js              # Core JavaScript logic for dynamic content and interactions
├── data/
│   ├── acronyms.json       # JSON data for USPS acronyms
│   ├── app-config.json     # JSON data for App Version
│   ├── events.json         # JSON data for all calendar events (holidays, seasons, etc.)
│   ├── resources.json      # JSON data for external resource links
│   └── user-control.json   # JSON data for default user filter preferences
├── icons/                  # Contains all PWA icons, UI elements, and event icons
├── favicon.ico             # Standard favicon
├── manifest.json           # Web App Manifest for PWA features
└── service-worker.js       # Service Worker for offline caching
```
## Installation and Setup

### Local Development

To run the project on your local machine, you'll need a simple web server.

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/mailman-sam/mcore.git](https://github.com/mailman-sam/mcore.git)
    ```
2.  **Set Up a Local Server (example using Python):**
    ```bash
    # Navigate into the project directory
    cd mcore
    # For Python 3
    python -m http.server
    ```
3.  **Access in browser:** Open your web browser and navigate to `http://localhost:8000`.

### GitHub Pages Deployment

1.  **Push your code** to a public GitHub repository.
2.  **Configure GitHub Pages:**
    * Go to your repository's **Settings > Pages**.
    * Under "Build and deployment", set the "Source" to **Deploy from a branch**.
    * Select your primary branch (e.g., `main`) and the `/ (root)` folder, then **Save**.
3.  Your app will be live at `https://your-username.github.io/your-repository-name/`.

## Usage

Simply open the `index.html` file in your browser (or navigate to your deployed GitHub Pages URL).

* **Navigation:** Use the links in the header to jump between Calendar, Resources, Acronyms, and Pay Periods.
* **Live Time:** View the live date and time, including the special USPS decimal format, in the header.
* **Theme Toggle:** Click the sun/moon icon in the header to switch between light and dark modes.
* **Calendar:** Use the primary navigation buttons to move between years or jump to the current day. All other display settings are located in the "Display Options" menu.
* **Display Options:**
    * **Carrier Color:** Select a color to see your rotating day off schedule. Choose "None" for a classic bordered view. Your choice is saved for your next visit.
    * **Event Filters:** Toggle visibility for holidays, seasons, paydays, etc. Your preferences are saved.
    * **Event Image Opacity:** Use the slider to adjust the visibility of event background images.
    * **T6 Scheduling:** Enter your five route numbers to see your T6 schedule on the calendar. Your routes are saved locally.
* **Pay Periods:** Use the "Previous Year", "Next Year", "Current Year", and "Today" buttons to browse pay periods by year. The current pay period row will be highlighted.
* **Acronyms:** Use the search bar to filter acronyms by term or meaning. Use the "Sort A-Z" and "Sort Z-A" buttons to reorder the list.
* **Install App:** If your browser supports PWAs, an "Install App" button will appear in the header. Click it to add mCORE to your device's home screen for an app-like experience and offline access.

## Contributing

Contributions are welcome! Please feel free to fork the repository and submit a pull request for any improvements or bug fixes.

## Contact

For any inquiries, please contact: a.mailman.sam@gmail.com


This project adheres to [Semantic Versioning](https://semver.org/).
