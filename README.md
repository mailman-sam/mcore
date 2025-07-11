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
  * **PWA (Progressive Web App):** Installable on mobile and desktop devices for an app-like experience and robust offline access.
  * **Offline Functionality:** The application is designed to work seamlessly offline, allowing access to cached content and functionality even without an internet connection.
  * **Lightweight:** The entire application is designed to be small in size, less than 1MB, ensuring quick loading times and minimal storage usage.
  * **Disclaimer:** Clear terms and conditions outlining the app's independent nature and disclaimer of liability.

## Technologies Used

  * **HTML5:** For semantic structure.
  * **CSS3:** Custom styling and responsive design.
  * **JavaScript (ES6+):** For all dynamic content generation, routing, and interactive features.
  * **JSON:** For storing dynamic data (Federal Holidays, Acronyms, NALC Resources).
  * **Service Worker:** Enables offline capabilities and faster loading.

## Project Structure

```
mcore/
├── index.html            # Main application entry point
├── css/
│   └── style.css         # Custom CSS for styling and responsive layouts
├── js/
│   └── app.js            # Core JavaScript logic for dynamic content and interactions
├── data/
│   ├── acronyms.json     # JSON data for USPS acronyms (sorted alphabetically)
│   ├── app-config.json     # JSON data for App Version
│   ├── holidays.json     # JSON data for US Federal Holidays
│   └── nalc-resources.json   # JSON data for NALC external resource links
├── icons/
│   ├── android-chrome-192x192.png  # PWA icon (192x192)
│   ├── android-chrome-512x512.png  # PWA icon (512x512)
│   ├── apple-touch-icon.png      # Apple touch icon
│   ├── favicon-16x16.png         # Favicon (16x16)
│   ├── favicon-32x32.png         # Favicon (32x32)
│   └── mcore-logo.png          # Main app logo
├── favicon.ico             # Standard favicon
├── manifest.json           # Web App Manifest for PWA features
└── service-worker.js       # Service Worker for offline caching
```

## Installation and Setup

### Local Development Server (Apache2)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/mailman-sam/mcore.git
    ```
2.  **Place the `mcore` folder:** Copy the entire `mcore` directory into your Apache web server's document root (e.g., `/var/www/html/` on Linux, `htdocs/` for XAMPP/WAMP).
3.  **Access in browser:** Open your web browser and navigate to `http://localhost/mcore/` (or your server's IP address if configured differently).

### GitHub Pages Deployment

This project is configured for deployment to GitHub Pages when hosted from a repository that is *not* named after your GitHub username (i.e., it's hosted in a subdirectory like `yourusername.github.io/mcore/`).

1.  **Create a GitHub Repository:** Create a new public repository on GitHub (e.g., `mcore`).
2.  **Push your code:** Push your local `mcore` project files to this new repository.
3.  **Configure GitHub Pages:**
      * Go to your repository on GitHub.
      * Navigate to **Settings \> Pages**.
      * Under "Build and deployment", set "Source" to **Deploy from a branch**.
      * Select your primary branch (e.g., `main` or `master`) and the `/ (root)` folder.
      * Click **Save**.
4.  **Access your app:** Your app should be live at `https://yourusername.github.io/mcore/` within a few minutes.

## Usage

Simply open the `index.html` file in your browser (or navigate to your deployed GitHub Pages URL).

  * **Navigation:** Use the links in the header to jump between Calendar, Resources, Acronyms, and Pay Periods.
  * **Theme Toggle:** Click the circle/dot icon in the header to switch between light and dark modes.
  * **Calendar:** Use the "Previous", "Next", "Current Year", and "Today" buttons to navigate years. Select a carrier color button (or "All") to view specific schedules. Click on a highlighted Federal Holiday to see more information.
  * **Pay Periods:** Use the "Previous Year", "Next Year", "Current Year", and "Today" buttons to browse pay periods by year. The current pay period row will be highlighted.
  * **Acronyms:** Use the search bar to filter acronyms by term or meaning. Use the "Sort A-Z" and "Sort Z-A" buttons to reorder the list.
  * **Install App:** If your browser supports PWAs, an "Install App" button will appear in the header. Click it to add mCORE to your device's home screen for an app-like experience and offline access.

## Contributing

This project is open-source under the MIT License. Contributions are welcome\! If you have suggestions for new features, bug fixes, or improvements, please feel free to fork the repository and submit a pull request.

## Contact

For any inquiries, please contact: a.mailman.sam@gmail.com

This project adheres to [Semantic Versioning](https://semver.org/).

mistakes were made