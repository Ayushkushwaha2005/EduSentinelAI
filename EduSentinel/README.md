# EduSentinel AI-Digital Asset Integrity & Content Intelligence System

## AI-Powered Digital Asset Protection and Focus Enforcement System

## Overview

EduSentinel AI is a Chrome extension designed to protect digital environments and improve user focus through intelligent monitoring and adaptive decision-making.

## The system uses a hybrid architecture combining local AI logic, cloud storage, and external APIs to analyze web content, detect misuse patterns, and guide users toward productive behavior.

## Problem Context

Digital platforms generate massive volumes of content that rapidly spread across multiple channels, making it difficult to track authenticity and prevent misuse.

## This creates a visibility gap where content can be misused, redistributed, or consumed in unproductive ways, impacting both digital asset integrity and user productivity.

## Objective

To build a scalable and intelligent solution that can:

- Identify and track content usage patterns
- Detect non-productive or abnormal browsing behavior
- Provide real-time guidance and redirection
- Maintain a balance between security and usability

---

## Key Features

### Real-Time Content Analysis

- Uses pattern-based and behavioral signals to evaluate web pages
- Detects distraction-heavy or non-productive environments
- Provides instant feedback

### Focus Enforcement Mode

- Dynamically blocks distracting content such as feeds and short-form media
- Encourages goal-oriented browsing behavior

### Smart Redirection System

- Redirects users to relevant educational or meaningful content
- Avoids repetitive or scripted loops

### Motivation Layer

- Displays contextual motivation during blocked sessions
- Reinforces productivity

### Hybrid Intelligence Engine

- Combines multiple decision layers for accurate results
- Minimizes false positives

---

## System Architecture (Core Logic Flow)

The system follows a hybrid decision model:

1. **Core AI Engine (Local Decision Layer)**
   - Analyzes content using heuristic and pattern-based logic
   - Makes the primary decision (block / allow / redirect)

2. **Cloud Layer (Firebase Integration)**
   - Stores newly detected patterns and behaviors
   - Helps in improving future detection
   - Maintains learning consistency across sessions

3. **API Layer (Backup Validation)**
   - Uses Google Safe Browsing API as a secondary validation layer
   - Ensures additional reliability in decision-making

This combination ensures both speed (local AI) and reliability (cloud + API).

## Note: Insert your own Google Safe Browsing API key to run the project.
---

## Tech Stack

- JavaScript (Chrome Extension – Manifest V3)
- HTML, CSS
- Firebase (Cloud Storage and Data Sync)
- Google Safe Browsing API (Backup validation)
- Local heuristic and pattern-based AI logic

---

## Installation

1. Download or clone the repository
2. Extract the project folder (if downloaded as ZIP)
3. Open Google Chrome and go to:
   chrome://extensions/
4. Enable "Developer Mode" (top right)
5. Click on "Load Unpacked"
6. Select the project folder
7. The EduSentinel AI extension will be installed and ready to use

---

## How to Run

1. Open any website in your browser
2. The extension automatically starts analyzing the content
3. Based on detection:
   - Safe sites → Allowed
   - Suspicious sites → Warning shown
   - Dangerous sites → Blocked or redirected
4. Enable "Focus Mode" from the extension popup for distraction control

---

## How It Works

1. User opens a website
2. Core AI analyzes content structure and behavior
3. If required, API validation is triggered
4. Decision is made (allow / block / redirect)
5. If new pattern is detected, it is stored in Firebase
6. User is guided toward safer or more productive content

---

## Detection Layers with Examples

The system follows a multi-layered detection approach to ensure both speed and reliability.

### 1. Core AI (Local Detection)

- Performs real-time analysis in the browser using heuristic and pattern-based logic.
- Evaluates URL structure, keywords, and suspicious patterns.

**Example:**
- URL: http://amaz0n-login-secure.com  
- Result: This link seems highly suspicious and may not be what it claims to be.

---

### 2. Google Safe Browsing API (Secondary Validation)

- Checks URLs against Google's known threat database.
- Acts as a trusted external validation layer.

**Example:**
- URL: http://testsafebrowsing.appspot.com/s/phishing.html  
- Result: Google has flagged this website as harmful — do not proceed.

---

### 3. Cloud Intelligence (Firebase Database)

- Stores previously detected malicious URLs.
- Helps in faster detection for repeated or known threats.

**Example:**
- URL: http://testphishing.com  
- Result: Blocked by cloud intelligence

---

## Enforcement & Protection Modules

### White Browsing / Enforcement Mode

- Restricts access to non-educational or distracting websites.
- Prioritizes academic and verified platforms.
- Displays motivational messages on blocked pages.

**Example:**
- Opening Instagram/YouTube (non-educational)  
- Result: Blocked with a focus message.

---

### Password Protection Engine

- Analyzes password strength locally.
- Prevents weak or easily guessable passwords.

**Example:**
- Password: 123456  
- Result: Marked as weak and user is warned.

---

### Cookie Security Manager

- Detects and blocks unnecessary or tracking cookies.
- Allows only essential cookies for safe browsing.

**Example:**
- Website requesting tracking cookies  
- Result: Only necessary cookies allowed, others blocked.

---

## Hackathon Context

This project was developed as part of a hackathon under a team setup.

Team Name: [NUX LEANDER]

Team Members:

* [Ayush Kushwaha]
* [Natasha Pande]
* [Vishal]
* [Aishika]

Team members contributed through discussions, feedback, and presentation support during the hackathon.

---

## Ownership and Contribution

The complete system design, architecture, and implementation were independently developed by:

Ayush Kushwaha

Team members supported in ideation, discussion, and presentation phases.

AI tools were used only for assistance in debugging and refinement.
The final implementation and logic are independently built and owned.

---

## Future Scope

- Advanced machine learning integration
- Cross-device synchronization
- Personalized focus analytics
- Scalable content verification systems

---

## Author

Ayush Kushwaha
BTech CSE (Cybersecurity and Forensics)
UPES Dehradun
