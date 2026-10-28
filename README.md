# Auto83

Auto83 is a modern web application designed to simplify South African government job applications by automatically completing the official Z83 application form. Instead of entering the same personal information, qualifications, employment history, and references for every application, users create a profile once and generate a completed Z83 form within minutes.

The project is built entirely with HTML, CSS, and JavaScript, making it lightweight, responsive, and easy to deploy on any static web hosting platform.

## Firebase + GitHub Pages setup

The website is hosted statically on GitHub Pages. Firebase Auth and Firestore run from the browser, while the South Africa news feed uses a Firebase Function to keep the FreeNewsApi key server-side.

### Step 1: Create a Firebase project

1. Go to https://console.firebase.google.com
2. Create a new project.
3. Enable Authentication and choose Email/Password sign-in.
4. Optional: enable Firestore Database.

### Step 2: Add your Firebase config

Open `firebase-config.js` and replace the placeholder values with your real Firebase project configuration.

```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### Step 3: Deploy to GitHub Pages

1. Push the project to a GitHub repository.
2. In GitHub, go to Settings > Pages.
3. Set the source to the main branch and root folder.
4. Save.
5. GitHub Pages will provide a live URL.

The root `robots.txt` allows public crawling and points search engines to `sitemap.xml`. The sitemap lists the landing page, Privacy Notice and Terms of Use at `https://kgosis.github.io`; update both files if the site's public URL changes. Account and profile pages are intentionally not listed.

### Step 4: Configure and deploy the news function

1. Install the [Firebase CLI](https://firebase.google.com/docs/cli) and sign in with `firebase login`.
2. Obtain an API key from [FreeNewsApi](https://www.freenewsapi.io/) and set it as a Firebase secret; do not add it to this repository:

   ```sh
   firebase functions:secrets:set FREENEWSAPI_KEY --project auto83-f2836
   ```

3. Deploy the function:

   ```sh
   firebase deploy --only functions:getRsaNews --project auto83-f2836
   ```

The function URL is configured in `news.js`. Its CORS policy currently allows the GitHub Pages origin `https://kgosis.github.io`. If the site uses a different origin, update the allowed origin in `functions/index.js` before deployment. The function retrieves English headlines for `country=za`, fetches the original publisher links, and caches the result briefly to reduce upstream API requests.

Deploying Firebase Functions may require enabling billing for the Firebase project. Review Firebase's current pricing and usage limits before deployment.

### Step 5: Authorization behavior

- Sign up creates a user in Firebase Auth and stores profile information in Firestore.
- Sign in authenticates with Firebase email/password.
- Forgot password sends a Firebase reset email.
- Authentication and profile features work on GitHub Pages through Firebase's browser SDK; the news section requires the deployed Firebase Function.

### Important note

GitHub Pages does not support server-side secrets; the FreeNewsApi key is stored by Firebase Functions instead. Firebase web configuration is public by design, so make sure your Firebase project security rules are correct.

---

# Project Vision

Applying for government vacancies often requires applicants to complete the Z83 form repeatedly. This process is time-consuming and increases the chances of typing errors and inconsistent information.

Auto83 aims to solve this problem by providing a digital platform where applicants can securely maintain their professional profile and automatically populate the Z83 form whenever they need to apply for a position.

The long-term vision is to become the easiest and most reliable Z83 preparation platform for South African job seekers.

---

# Objectives

The primary objectives of Auto83 are:

- Eliminate repetitive data entry for Z83 applications.
- Allow users to create and manage a reusable professional profile.
- Generate accurate Z83 forms from stored information.
- Provide a seamless experience across desktop and mobile devices.
- Operate entirely in the browser using front-end technologies.

---

# Core Features

## Landing Page

A modern, responsive landing page introducing the Auto83 platform and explaining its purpose.

Features include:

- Responsive navigation
- Hero section
- Feature highlights
- Statistics section
- Call-to-action area
- Mobile-friendly layout

## User Profile

Users will be able to store:

- Personal information
- Identity details
- Contact information
- Residential address
- Citizenship details

This information becomes the foundation for every generated Z83 form.

## Qualifications

Applicants can save multiple qualifications, including:

- Institution
- Qualification name
- Field of study
- Completion year
- NQF level (optional)

## Employment History

Users can maintain an unlimited employment history containing:

- Employer
- Position
- Start date
- End date
- Responsibilities

## References

Store professional references including:

- Full name
- Job title
- Organisation
- Phone number
- Email address

## Automatic Z83 Generation

Before generating a Z83, applicants enter the role, department and reference number from the vacancy circular. These details are saved to the profile and added to the generated form.

Using the saved profile, Auto83 will automatically populate every supported section of the official Z83 form and produce a printable PDF.

## Z83 preparation guides and South African headlines

The public landing page includes original checklists and guidance on reading a vacancy advert, organising qualifications and work history, checking referee details, and reviewing a generated form. The guidance is general; each recruiting department's advert and the official form instructions take precedence.

The RSA news section reads public South African article metadata from FreeNewsApi through a Firebase Function, displays publisher-attributed headlines, links readers to the original source, and caches results in the browser. The news feed is optional and does not receive profile details. Headline availability depends on the external service and its rate limits.

See [privacy.html](./privacy.html) and [terms.html](./terms.html) for the site's current privacy notice and terms of use. Adding useful content or legal pages does not guarantee approval by Google AdSense; the site must also meet Google's current publisher and consent requirements.

---

# Technology Stack

| Technology | Purpose |
|------------|---------|
| HTML5 | Structure |
| CSS3 | Styling and responsive design |
| JavaScript (ES6) | Application logic |
| Local Storage | Temporary client-side data |
| Firebase (planned) | Authentication and cloud database |
| jsPDF (planned) | PDF generation |

---

# Folder Structure

```text
Auto83/
│
├── index.html
├── README.md
│
├── css/
│   ├── style.css
│   ├── responsive.css
│   └── animations.css
│
├── js/
│   ├── app.js
│   ├── navigation.js
│   ├── profile.js
│   ├── qualification.js
│   ├── employment.js
│   ├── references.js
│   ├── storage.js
│   └── pdf.js
│
├── pages/
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   ├── profile.html
│   └── preview.html
│
├── assets/
│   ├── images/
│   ├── icons/
│   └── fonts/
│
└── z83/
    └── official-template.pdf
```

---

# Responsive Design

Auto83 is designed using a mobile-first approach.

Supported devices include:

- Mobile phones
- Tablets
- Laptops
- Desktop computers

The layout automatically adjusts navigation, typography, spacing, and content sections to provide a consistent experience across screen sizes.

---

# Planned User Journey

### 1. Visit Auto83

The user lands on the homepage and selects **Get Started**.

### 2. Create an Account

The user registers using their email address and password.

### 3. Complete Their Profile

The platform guides the user through several sections:

- Personal Information
- Contact Details
- Qualifications
- Employment History
- References

### 4. Save Information

All information is securely stored and can be edited at any time.

### 5. Generate Z83

The user selects **Generate Z83**, and the application automatically fills the official form using their saved information.

### 6. Download PDF

A completed Z83 document is generated and downloaded as a print-ready PDF.

---

# Planned Pages

| Page | Description |
|------|-------------|
| Landing | Product introduction |
| Login | User authentication |
| Register | Account creation |
| Dashboard | User overview |
| Profile Wizard | Multi-step profile completion |
| Qualifications | Education management |
| Employment | Work history |
| References | Professional references |
| Preview | Live Z83 preview |
| Settings | Account management |

---

# Design Principles

The interface follows a clean and professional aesthetic inspired by modern SaaS applications.

Design goals include:

- Minimalist layout
- High readability
- Black and grey colour palette
- Smooth animations
- Accessible typography
- Consistent spacing
- Mobile-first responsiveness

---

# Future Features

The following features are planned for future releases:

## Firebase Authentication

- Secure login
- Password reset
- Email verification
- Persistent accounts

## Cloud Database

- Real-time profile syncing
- Multiple devices
- Automatic backups

## Multiple CV Storage

Allow users to maintain different CV versions for different industries.

## Vacancy Tracker

Save government vacancies and generate a Z83 directly from the vacancy page.

## Document Manager

Store supporting documents such as:

- CV
- ID copy
- Qualifications
- Driver's licence
- Certificates

## AI Validation

Validate profile completeness before generating a Z83 by checking for:

- Missing references
- Empty employment periods
- Incomplete qualifications
- Required personal information

---

# Development Status

| Module | Status |
|---------|--------|
| Landing Page | Complete |
| Responsive Layout | Complete |
| Navigation | Complete |
| Profile System | Planned |
| Authentication | Planned |
| Qualifications | Planned |
| Employment History | Planned |
| References | Planned |
| PDF Generation | Planned |
| Firebase Integration | Planned |

---

# Getting Started

Clone the repository:

```bash
git clone https://github.com/yourusername/auto83.git
```

Open the project folder:

```bash
cd auto83
```

Run the project by opening `index.html` in your browser or by using a local development server.

Example using VS Code Live Server:

```text
Right Click → Open with Live Server
```

---

# Target Users

Auto83 is intended for:

- Government job applicants
- Graduate programme applicants
- Internship applicants
- Public service professionals
- Job seekers who frequently complete Z83 forms

---

# License

This project is currently under private development.

The Auto83 name, branding, and source code are reserved by the project owner until an official open-source or commercial license is published.

---

# Author

**Kgosi Sebako**

Diploma in Information Technology graduate focused on building practical software solutions that solve real-world problems for South African job seekers.