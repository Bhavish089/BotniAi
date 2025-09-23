# Bytecrafter is a repository for Bytecraft's Developer and Admin

## 🌾 Botni A.I – Smart Farming Assistant for India

Botni A.I is a modular, voice-first, offline-capable mobile app designed to empower Indian farmers with real-time support through AI and local NGOs. Built for Smart India Hackathon 2025, it bridges the gap between rural communities and smart technology.

The site is Mainly bradcasted on https://m17b30.me/

## Frontend (Farmer-Facing App)

| Component           | Technology                        | Purpose                                      |
|---------------------|------------------------------------|----------------------------------------------|
| UI Framework        | Flutter                            | Cross-platform, fast rendering               |
| Offline Storage     | Hive DB or SQLite (Flutter plugin) | Lightweight local caching                    |
| Styling             | Flutter widgets                    | Clean, grid-based UI                         |
| Multilingual        | Flutter Intl                       | Hindi + regional language support            |
| Speech-to-Text      | Vosk (offline)                     | Voice input without internet                 |
| Text-to-Speech      | Android TTS                        | Voice output in local languages              |
| Background Sync     | Flutter background tasks           | Retry sync when online                       |
| Resource Loader     | Text-only JSON blobs               | Lightweight, cacheable training content      |

## Backend (Routing, AI, Admin Portal)

| Component           | Technology                        | Purpose                                      |
|---------------------|------------------------------------|----------------------------------------------|
| API Layer           | FastAPI (Python) or Node.js        | Fast, modular, scalable APIs                 |
| Database            | PostgreSQL + Redis                 | Structured data + fast lookup                |
| Real-Time Comm.     | WebSocket or MQTT                  | Push alerts and updates                      |
| Authentication      | JWT + Role-based access            | Secure access for farmers, NGOs, admins      |
| NLP Engine          | spaCy or Rasa                      | Query classification and routing             |
| File Storage        | Firebase Storage or Amazon S3      | Optional media uploads                       |
| Admin Portal        | React + Tailwind CSS               | Clean UI for monitoring and control          |
| Notifications       | Twilio / WhatsApp API / FCM        | Dispatch alerts to NGOs and admins           |
| Analytics           | Chart.js or D3.js                  | Visualize issue trends and performance       |

 
## Project Highlights

- Voice-first interface for low-tech users
- Offline-first architecture with smart caching
- Real-time routing to AI or NGO responders
- Admin portal for monitoring and control
- Modular updates with minimal app size impact
