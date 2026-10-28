# TravelMate — Smart Trip Planning System

TravelMate is a full-stack web application designed to simplify travel planning. It helps users explore destinations, create trips, generate personalized itineraries, manage travel expenses, and organize packing checklists in one place.

The project is built using React, TypeScript, Node.js, Express, and MongoDB. It follows a client-server architecture and provides REST APIs for communication between the frontend and backend.

## Live Demo

- **Frontend:** [TravelMate Web App](https://client-anil-add5.vercel.app/)
- **Backend:** [TravelMate API](https://trave-mate.onrender.com/)
- **Health Check:** [Backend Health Endpoint](https://trave-mate.onrender.com/api/health)

> Note: The backend is hosted on Render and the frontend on Vercel. The backend may take some time to respond if the hosting service is waking up.

## Features

### 1. User Authentication
- User registration and login.
- Password hashing using bcrypt.
- JWT-based authentication.
- Protected operations for authenticated users.
- User-specific trip management.

### 2. Destination Exploration
- Browse available travel destinations.
- View destination details and travel information.
- Search and explore destinations using the destination catalog.
- Display destination images using local image assets.

### 3. Trip Management
- Create and manage trips.
- View trip details.
- Associate itinerary activities, expenses, and packing items with individual trips.
- Delete trips with associated-data cleanup.

### 4. Itinerary Planning
- Generate suggested itineraries based on destination and travel preferences.
- Consider interests, travel pace, and daily budget when generating suggestions.
- Use destination-specific experiences and available attraction data.
- Review a draft before explicitly saving it.

### 5. Attractions and Maps
- Retrieve attraction information using OpenStreetMap Overpass where available.
- Use caching and curated fallback data when external attraction data is unavailable.
- Provide map links when location information is available.
- Include attribution for OpenStreetMap data.

### 6. Expense Management
- Add, view, update, and delete trip expenses.
- Associate expenses with the appropriate trip.
- Track expenses against the trip budget.

### 7. Smart Packing Checklist
- Create packing items for individual trips.
- Organize items by category.
- Set item quantities and optional notes.
- Mark items as packed or unpacked.
- Edit and delete items.
- View packing progress.
- Use optional starter suggestions to quickly create common packing items.

### 8. Responsive User Interface
- Responsive layouts for desktop and mobile screens.
- Consistent Premium Explorer visual theme.
- Destination imagery and dedicated authentication screens.
- Loading, empty, and error states for supported operations.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Backend | Node.js, Express, TypeScript |
| Database | MongoDB Atlas |
| ODM | Mongoose |
| Authentication | JSON Web Tokens (JWT), bcrypt |
| API | REST API |
| Maps and attractions | OpenStreetMap, Overpass API |
| Frontend hosting | Vercel |
| Backend hosting | Render |
| Version control | Git and GitHub |

## System Architecture

```text
                   User
                    |
                    v
          React + TypeScript UI
              (Vercel)
                    |
              HTTP / REST API
                    |
                    v
        Node.js + Express Backend
               (Render)
                    |
        +-----------+-----------+
        |           |           |
        v           v           v
 Authentication  Trip APIs   Planning APIs
        |           |           |
        +-----------+-----------+
                    |
                    v
             MongoDB Atlas
```

The frontend sends HTTP requests to the backend. Express routes direct requests to the appropriate controllers, which validate the request, enforce authentication and ownership rules, and interact with MongoDB through Mongoose models.

## Project Structure

The following is a high-level overview of the project. Some filenames may differ depending on the current implementation.

```text
TravelMate-New/
├── client/
│   ├── public/
│   │   └── images/
│   ├── src/
│   │   ├── api/
│   │   │   ├── authApi.ts
│   │   │   ├── destinationApi.ts
│   │   │   └── tripApi.ts
│   │   ├── assets/
│   │   ├── components/
│   │   ├── data/
│   │   ├── pages/
│   │   ├── styles/
│   │   ├── App.tsx
│   │   ├── App.css
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── server/
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── scripts/
│   │   ├── __tests__/
│   │   └── server.ts
│   ├── package.json
│   └── tsconfig.json
│
├── README.md
└── PROJECT_LOG.md
```

## Getting Started

### Prerequisites

Install the following before running the project locally:

- Node.js and npm.
- MongoDB Atlas account or a compatible MongoDB instance.
- Git.
- A code editor such as Visual Studio Code.

### 1. Clone the Repository

```bash
git clone https://github.com/anil-4115/TravelMate.git
cd TravelMate
```

If your GitHub repository uses a different name, replace the repository URL and folder name with the correct values.

### 2. Configure the Backend

Open a terminal in the backend directory:

```bash
cd server
npm install
```

Create a `.env` file inside `server/` using the variable names expected by the backend:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_long_random_secret
JWT_EXPIRES_IN=your_configured_token_expiry
CORS_ORIGIN=http://localhost:5173
WEATHER_API_KEY=your_weather_api_key
```

Replace the example values with your own configuration. Confirm the accepted JWT expiry format in the backend code.

Do not commit real secrets, database credentials, or API keys to GitHub.

Start the backend in development mode:

```bash
npm run dev
```

The backend should start on port `5000`, provided the port is available and the environment configuration is valid.

### 3. Configure the Frontend

Open a second terminal:

```bash
cd client
npm install
```

Create `client/.env.local`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

The frontend API helpers should read `VITE_API_BASE_URL` consistently. Restart the Vite development server after changing environment variables.

Start the frontend:

```bash
npm run dev
```

Open the local URL printed by Vite, usually:

```text
http://localhost:5173
```

## Deployment

### Frontend — Vercel

Deploy the `client` directory as the frontend project.

Configure the production environment variable:

```env
VITE_API_BASE_URL=https://trave-mate.onrender.com/api
```

Redeploy after changing production environment variables because Vite embeds these values during the build.

### Backend — Render

Deploy the `server` directory as a Node.js web service, using the build and start scripts configured in its `package.json`.

Configure the backend environment variables in Render:

- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `PORT` (if required by the service configuration)
- `CORS_ORIGIN`
- `WEATHER_API_KEY` (if the weather integration requires it)

Set `CORS_ORIGIN` to the exact deployed frontend origin:

```text
https://client-anil-add5.vercel.app
```

Do not include `/api` or a trailing slash in the origin. If you change your production domain, update the allowed origin accordingly.

Make sure the MongoDB Atlas network and database-user permissions allow the deployed backend to connect.

## Security Considerations

- Passwords should be stored as hashes rather than plaintext.
- JWT-protected endpoints should verify authentication.
- Trip-related resources should enforce ownership checks.
- Validate incoming IDs and request fields on the backend.
- Keep environment files and credentials out of version control.
- Restrict CORS to trusted frontend origins.
- Avoid exposing secrets through frontend environment variables. Variables prefixed with `VITE_` are visible to browser users.

## Testing and Verification

The project includes backend checks and tests for supported functionality.

Recommended verification steps:

1. Register and log in with a test account.
2. Confirm destinations load from the deployed API.
3. Create a trip and open its details.
4. Generate and save an itinerary.
5. Add and update trip expenses.
6. Add packing items and verify packed progress.
7. Refresh the page and verify persisted data.
8. Verify that one user cannot access another user's protected trip data.
9. Test deletion and associated-data cleanup.
10. Check the interface on desktop and mobile.

Run the scripts defined in each directory's `package.json`. Available scripts can be inspected with:

```bash
npm run
```

Run frontend and backend builds separately and resolve any build errors before deploying.

## Future Enhancements

Potential improvements include:

- Weather-based recommendations and travel alerts.
- Sharing itineraries with other travelers.
- Exporting itineraries to PDF.
- Collaborative trip planning.
- Expense summaries and charts.
- Improved accessibility and automated end-to-end testing.

## Learning Outcomes

This project demonstrates practical application of:

- Full-stack web development.
- React components, hooks, and state management.
- REST API design using Express.
- TypeScript across frontend and backend.
- MongoDB data modeling and Mongoose.
- Authentication and authorization.
- Input validation and error handling.
- Third-party API integration.
- Deployment and environment configuration.
- Responsive UI design.

## Author

**Anil Verma**  
Software Engineering Student

GitHub: [anil-4115](https://github.com/anil-4115)

## License

This project was developed for educational purposes. Add a `LICENSE` file if you intend to distribute it under a specific open-source license.
