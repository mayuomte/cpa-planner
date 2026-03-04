

Preparing for the CPA exam requires managing hundreds of study hours across complex subjects 
This planner was built to solve the "fragmented data" problem by centralizing task management, live study timers, and visual analytics into a single, mobile-responsive interface.

* **TIMER** 
Tracks study duration in a formal `HH:MM:SS` format. 
Starting a new session automatically saves the previous one to prevent data overlap.
* **Shorthand Input** 
Rapid task creation using a `YYMMDD` suffix (e.g., `連結会計 260315`) to automatically set deadlines.
* **Cloud Synchronization:** 
Powered by **Firebase Realtime Database** to allow seamless transitions between PC and mobile devices.
* **Visual Analytics:** 
Integrated **Chart.js** dashboard that visualizes study time distribution across the five core CPA subjects.
* **Trash System:** 
A safety-first "Soft Delete" system to prevent accidental data loss during high-stress study sessions.

## 🛠️ Tech Stack
* **Frontend:** 
Vanilla JavaScript (ES6+), HTML5, CSS3
* **Database:** 
Firebase v12 (Realtime Database)
* **Data Visualization:** 
Chart.js
* **Deployment:** 
GitHub Pages

## 📂 Project Structure
```text
├── index.html      # Main application structure & Firebase config
├── script.js       # Core logic, Firebase listeners, and Chart.js rendering
├── style.css       # Minimalist UI/UX design
└── README.md       # Project documentation
