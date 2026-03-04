📊 CPA Planner & Study Analytics
A centralized, mobile-responsive dashboard for managing high-volume CPA exam preparation.

Preparing for the CPA exam requires managing hundreds of study hours across complex subjects. This planner was built to solve the "fragmented data" problem by centralizing task management, live study timers, and visual analytics into a single interface.

🚀 Key Features
⚡ Shorthand Task Input
Rapid task creation using a YYMMDD suffix (e.g., 連結会計 260315). The system parses the suffix to automatically set deadlines, reducing friction during study sessions.

⏱️ Precision Study Timer
Tracks duration in a formal HH:MM:SS format. Starting a new session automatically saves the previous entry to prevent data overlap and ensure every minute is accounted for.

📈 Visual Analytics Dashboard
Integrated Chart.js visualizations provide a breakdown of study time distribution across the five core CPA subjects, helping to identify and correct imbalances in your study plan.

☁️ Cloud Synchronization
Powered by Firebase Realtime Database, allowing for seamless, low-latency transitions between desktop and mobile devices.

🛡️ Trash & Safety System
A "Soft Delete" system designed for high-stress environments, ensuring that accidental clicks don't result in the loss of critical study records.

🛠️ Tech Stack
Frontend: Vanilla JavaScript (ES6+), HTML5, CSS3

Database: Firebase v12 (Realtime Database)

Data Visualization: Chart.js

Deployment: GitHub Pages

📂 Project Structure
Plaintext
├── index.html      # Main application structure & Firebase configuration
├── script.js       # Core logic, Firebase listeners, and Chart.js rendering
├── style.css       # Minimalist UI/UX design and responsive layouts
└── README.md       # Project documentation
🛠️ Installation & Setup
Clone the repository:

Bash
git clone https://github.com/mayuomte/cpa-planner.git
Configure Firebase:
Replace the placeholder configuration in index.html with your own Firebase project credentials.

Deploy:
The project is configured for easy deployment via GitHub Pages.
