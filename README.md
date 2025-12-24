# Clutcher CRM

A modern CRM application built with React and Express, containerized with Docker for easy deployment.

## 🚀 Features

- Lead Management
- Pipeline Tracking
- Customer Outreach
- Analytics Dashboard
- Web Scraping Integration (Jina AI)
- Real-time Data Updates
- Responsive Design

## 📁 Project Structure

```
clutcher/
├── frontend/              # React Frontend Application
│   ├── Dockerfile        # Frontend container config
│   ├── nginx.conf       # Nginx configuration
│   ├── package.json     # Frontend dependencies
│   └── src/             # React source code
│       ├── components/  # React components
│       ├── lib/         # Utilities and API clients
│       ├── App.tsx      # Main app component
│       └── main.tsx     # Entry point
│
├── backend/              # Express Backend API
│   ├── Dockerfile        # Backend container config
│   ├── package.json      # Backend dependencies
│   └── src/             # Backend source code
│       ├── index.ts     # Express server
│       ├── scraper.ts   # Web scraping logic
│       ├── lib/         # Shared libraries
│       └── routes/      # API routes
│
├── docker-compose.yml    # Docker orchestration
├── .env.example         # Environment variables template
├── DOCKER_DEPLOYMENT.md # Docker deployment guide
└── README.md            # This file
```

## 🛠️ Tech Stack

### Frontend
- React 19
- TypeScript
- Vite
- Tailwind CSS
- Recharts (Analytics)
- Supabase (Database)

### Backend
- Express.js
- TypeScript
- Jina AI (Web Scraping)
- CORS enabled

### Infrastructure
- Docker & Docker Compose
- Nginx (Reverse Proxy & Static File Serving)
- Alpine Linux (Lightweight Containers)

## 📋 Prerequisites

- Node.js 20+ (for local development)
- Docker & Docker Compose (for containerized deployment)
- Git

## 🚀 Quick Start

### Option 1: Docker (Recommended for Production)

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd clutcher
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your actual API keys and configuration
   ```

3. **Build and start with Docker**
   ```bash
   docker-compose up --build
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

For detailed Docker deployment instructions, see [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md).

### Option 2: Local Development

1. **Install dependencies**
   ```bash
   # Install frontend dependencies
   cd frontend
   npm install

   # Install backend dependencies
   cd ../backend
   npm install
   ```

2. **Configure environment variables**
   ```bash
   # Copy .env.example to .env in root directory
   cp .env.example .env
   # Edit with your configuration
   ```

3. **Start the backend**
   ```bash
   cd backend
   npm run dev
   ```

4. **Start the frontend (in a new terminal)**
   ```bash
   cd frontend
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3001

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database (Supabase)
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# API Keys
JINA_API_KEY=your_jina_api_key
GEMINI_API_KEY=your_gemini_api_key

# Server
PORT=3001
NODE_ENV=production
```

## 📦 Available Scripts

### Frontend (in `frontend/` directory)
```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build
npm run type-check # TypeScript type checking
```

### Backend (in `backend/` directory)
```bash
npm run dev        # Start development server with hot reload
npm run build      # Build TypeScript to JavaScript
npm start          # Start production server
npm run type-check # TypeScript type checking
```

### Docker (in root directory)
```bash
docker-compose up -d          # Start containers
docker-compose down           # Stop containers
docker-compose logs -f        # View logs
docker-compose restart        # Restart containers
docker-compose up --build     # Rebuild and start
```

## 🌐 API Endpoints

### Backend API (Port 3001)

- `GET /health` - Health check endpoint
- `POST /api/scrape` - Web scraping endpoint
  - Body: `{ query: string, useCache?: boolean }`
- `DELETE /api/cache` - Clear cache endpoint

## 🐳 Docker Architecture

The application uses a two-container architecture:

### Frontend Container
- **Base**: Nginx Alpine
- **Port**: 80 (mapped to 3000)
- **Purpose**: Serve React static files and proxy API requests
- **Features**:
  - Gzip compression
  - Static file caching
  - Security headers
  - SPA routing support

### Backend Container
- **Base**: Node.js 20 Alpine
- **Port**: 3001
- **Purpose**: Handle API requests and web scraping
- **Features**:
  - TypeScript compilation
  - Health monitoring
  - Non-root user for security

### Network
Both containers communicate via a shared Docker network, allowing the frontend to proxy API requests to the backend.

## 🔒 Security

- Non-root users in containers
- Security headers configured in nginx
- Environment variables for sensitive data
- CORS enabled for cross-origin requests
- Health checks for monitoring

## 📊 Development Workflow

1. Make changes to code
2. Test locally with `npm run dev`
3. Build and test with Docker: `docker-compose up --build`
4. Commit changes
5. Deploy to production

## 🚢 Deployment

### Quick Deployment
```bash
# On your server
git clone <your-repo>
cd clutcher
cp .env.example .env
# Edit .env with production values
docker-compose up -d
```

### Cloud Platforms
- **AWS**: ECS/EKS with ECR
- **Google Cloud**: GKE with GCR
- **Azure**: AKS with ACR
- **DigitalOcean**: App Platform
- **Heroku**: Container Registry

For detailed deployment instructions, see [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md).

## 🐛 Troubleshooting

### Containers won't start
```bash
docker-compose logs backend
docker-compose logs frontend
```

### Port conflicts
Ensure ports 3000 and 3001 are not in use:
```bash
lsof -i :3000
lsof -i :3001
```

### Build issues
Clear Docker cache and rebuild:
```bash
docker system prune -a
docker-compose up --build
```

## 📝 License

[Your License Here]

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues and questions:
- Check [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md) for Docker-specific issues
- Review logs: `docker-compose logs -f`
- Verify environment variables in `.env`

## 🔄 Migration from Monolithic Structure

If you're migrating from the old structure:

1. Frontend code is now in `frontend/src/`
2. Backend code is now in `backend/src/`
3. Use Docker Compose for deployment instead of running both servers manually
4. Update environment variables to use `.env` in root directory
5. API calls now go through nginx proxy at `/api/`

## 📚 Documentation

- [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md) - Complete Docker deployment guide
- [DEPLOYMENT.md](DEPLOYMENT.md) - Alternative deployment methods
- API documentation coming soon
