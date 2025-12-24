# Docker Deployment Guide

This guide explains how to build and deploy the Clutcher CRM application using Docker containers.

## Prerequisites

- Docker installed on your machine
- Docker Compose installed (usually comes with Docker)
- `.env` file configured with your environment variables

## Quick Start

1. **Configure Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

2. **Build and Start Containers**
   ```bash
   docker-compose up --build
   ```

3. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Health checks:
     - Frontend: http://localhost:3000/health
     - Backend: http://localhost:3001/health

## Docker Compose Commands

### Start Services
```bash
docker-compose up -d
```

### Stop Services
```bash
docker-compose down
```

### Rebuild and Start
```bash
docker-compose up --build -d
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Restart Services
```bash
docker-compose restart
```

## Individual Container Management

### Backend

Build:
```bash
cd backend
docker build -t clutcher-backend .
```

Run:
```bash
docker run -p 3001:3001 --env-file ../.env clutcher-backend
```

### Frontend

Build:
```bash
cd frontend
docker build -t clutcher-frontend .
```

Run:
```bash
docker run -p 3000:80 clutcher-frontend
```

## Project Structure

```
.
├── frontend/                 # React application
│   ├── Dockerfile           # Multi-stage build with nginx
│   ├── nginx.conf           # Nginx configuration
│   ├── package.json          # Frontend dependencies
│   └── src/                 # Source code
├── backend/                  # Express API server
│   ├── Dockerfile           # Backend container configuration
│   ├── package.json          # Backend dependencies
│   └── src/                 # Source code
├── docker-compose.yml        # Orchestration configuration
├── .env                     # Environment variables (not in git)
└── .env.example            # Environment template
```

## Container Details

### Backend Container
- **Base Image**: Node.js 20 Alpine
- **Port**: 3001
- **Health Check**: HTTP GET /health
- **Features**:
  - Multi-stage build for optimization
  - Non-root user for security
  - Health monitoring
  - Automatic restart on failure

### Frontend Container
- **Base Image**: Nginx Alpine
- **Port**: 80 (mapped to 3000 on host)
- **Health Check**: HTTP GET /health
- **Features**:
  - Multi-stage build (Node.js build + Nginx serve)
  - Static file caching
  - Gzip compression
  - Security headers
  - API proxy to backend
  - Non-root user for security

## Environment Variables

### Backend (.env)
- `JINA_API_KEY` - Jina AI API key for web scraping
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (production/development)

### Frontend (.env)
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `GEMINI_API_KEY` - Google Gemini API key

## Production Deployment

### Deploying to a Server

1. **Copy Files to Server**
   ```bash
   scp -r . user@your-server:/path/to/deployment
   ```

2. **SSH into Server**
   ```bash
   ssh user@your-server
   cd /path/to/deployment
   ```

3. **Configure Environment**
   ```bash
   cp .env.example .env
   nano .env  # Add your actual values
   ```

4. **Start Services**
   ```bash
   docker-compose up -d
   ```

5. **Setup Reverse Proxy (Optional)**
   If you want to use a domain and HTTPS, setup nginx or Apache as a reverse proxy:

   Example nginx configuration:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

6. **Setup SSL (Recommended)**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

### Deploying to Cloud Platforms

#### AWS (ECS/EKS)
- Push images to ECR (Elastic Container Registry)
- Use ECS/EKS for orchestration
- Configure load balancer

#### Google Cloud (GKE)
- Push images to GCR (Google Container Registry)
- Use GKE for orchestration
- Configure Cloud Load Balancing

#### Azure (AKS)
- Push images to ACR (Azure Container Registry)
- Use AKS for orchestration
- Configure Azure Load Balancer

#### DigitalOcean
- Push images to DigitalOcean Container Registry
- Use App Platform or Kubernetes

#### Heroku
- Heroku supports Docker deployments
- Create `heroku.yml` for container configuration

## Troubleshooting

### Containers Won't Start
```bash
# Check logs
docker-compose logs backend
docker-compose logs frontend

# Check if ports are in use
lsof -i :3000
lsof -i :3001

# Restart containers
docker-compose restart
```

### Backend Can't Connect to Database
- Ensure Supabase credentials in `.env` are correct
- Check network connectivity
- Verify Supabase project is active

### Frontend Can't Reach Backend
- Ensure both containers are on the same Docker network
- Check nginx configuration in frontend container
- Verify backend is healthy

### Out of Memory Issues
```bash
# Increase Docker memory limit in Docker Desktop settings
# Or limit container memory in docker-compose.yml
```

### Build Errors
```bash
# Clear Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache
```

## Monitoring and Maintenance

### Check Container Status
```bash
docker-compose ps
```

### View Resource Usage
```bash
docker stats
```

### Update Application
```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose up --build -d
```

### Backup Data
- Supabase data is stored in the cloud (handled by Supabase)
- For local development, consider using volume mounts

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use strong, unique passwords** and API keys
3. **Keep containers updated** with latest security patches
4. **Use HTTPS** in production
5. **Implement rate limiting** on API endpoints
6. **Regular security audits** of dependencies
7. **Minimize container privileges** (already configured with non-root users)

## Performance Optimization

1. **Enable caching** in nginx (already configured)
2. **Use CDN** for static assets in production
3. **Implement database connection pooling**
4. **Add load balancing** for high traffic scenarios
5. **Monitor container resources** and scale as needed

## Support

For issues or questions:
- Check Docker logs: `docker-compose logs`
- Review health status: `docker-compose ps`
- Verify environment variables in `.env`
