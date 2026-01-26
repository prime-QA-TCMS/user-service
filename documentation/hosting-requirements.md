# Hosting Requirements

## Overview

This document outlines infrastructure requirements and installation instructions for hosting the User Service at various scales, covering both managed cloud platforms and self-managed deployments.

---

## Resource Requirements by Scale

### Individual (1 user)
- **CPU:** 1 vCPU / 1 core
- **RAM:** 512MB - 1GB
- **Storage:** 10GB SSD
- **Database:** MongoDB 512MB RAM, 5GB storage
- **Network:** 100GB/month bandwidth
- **Concurrent requests:** ~10/second

### Team (5-10 users)
- **CPU:** 2 vCPU / 2 cores
- **RAM:** 2GB
- **Storage:** 20GB SSD
- **Database:** MongoDB 1GB RAM, 20GB storage
- **Network:** 500GB/month bandwidth
- **Concurrent requests:** ~50/second

### Department (10-100 users)
- **CPU:** 4 vCPU / 4 cores
- **RAM:** 8GB
- **Storage:** 100GB SSD
- **Database:** MongoDB 4GB RAM, 100GB storage, replica set recommended
- **Network:** 2TB/month bandwidth
- **Load balancer:** Required
- **Concurrent requests:** ~200/second

### Enterprise (100+ users)
- **CPU:** 8+ vCPU / 8+ cores (horizontal scaling)
- **RAM:** 16GB+ per instance
- **Storage:** 500GB+ SSD
- **Database:** MongoDB cluster (3-node replica set minimum), 16GB+ RAM, 500GB+ storage
- **Network:** 10TB+/month bandwidth
- **Load balancer:** Required with auto-scaling
- **CDN:** Recommended
- **Concurrent requests:** 1000+/second

---

## Managed Cloud Hosting

### AWS (Amazon Web Services)

#### Individual Scale
**Services:**
- EC2 t3.micro or t4g.micro (1 vCPU, 1GB RAM)
- MongoDB Atlas M0 Free Tier or M2 ($9/month)
- Elastic IP

**Monthly Cost:** ~$10-20

**Installation:**
```bash
# Launch EC2 instance with Ubuntu 22.04 LTS
# Connect via SSH
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Clone and setup application
git clone <your-repo-url> /opt/user-service
cd /opt/user-service
npm install --production

# Create environment file
sudo nano .env
# Add: MONGODB_URI, JWT_SECRET, NODE_ENV=production, PORT=3000

# Install PM2 for process management
sudo npm install -g pm2
pm2 start dist/index.js --name user-service
pm2 startup
pm2 save

# Setup nginx reverse proxy
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/user-service
```

**Nginx config:**
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

```bash
sudo ln -s /etc/nginx/sites-available/user-service /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Setup SSL with Let's Encrypt
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

#### Team Scale
**Services:**
- EC2 t3.small (2 vCPU, 2GB RAM)
- MongoDB Atlas M10 ($60/month)
- Application Load Balancer (optional)

**Monthly Cost:** ~$80-120

#### Department Scale
**Services:**
- EC2 t3.large or c6i.xlarge (4 vCPU, 8GB RAM) x2 instances
- MongoDB Atlas M30 with replica set ($580/month)
- Application Load Balancer
- CloudWatch monitoring
- Route53 DNS

**Monthly Cost:** ~$800-1200

#### Enterprise Scale
**Services:**
- ECS Fargate or EKS (Kubernetes)
- Auto Scaling Groups (8+ vCPU instances)
- MongoDB Atlas M60+ cluster or self-managed on EC2
- Application Load Balancer with Auto Scaling
- CloudFront CDN
- ElastiCache Redis (for session management)
- CloudWatch + X-Ray monitoring
- RDS PostgreSQL for analytics (optional)

**Monthly Cost:** ~$3000+

**EKS Deployment:**
```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: user-service
  template:
    metadata:
      labels:
        app: user-service
    spec:
      containers:
      - name: user-service
        image: your-registry/user-service:latest
        ports:
        - containerPort: 3000
        env:
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: user-service-secrets
              key: mongodb-uri
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: user-service-secrets
              key: jwt-secret
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: user-service
spec:
  selector:
    app: user-service
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

### Azure

#### Individual Scale
**Services:**
- Azure App Service B1 Basic ($13/month)
- Azure Cosmos DB (MongoDB API) or Atlas M0

**Installation:**
```bash
# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login and create resources
az login
az group create --name user-service-rg --location eastus

# Create App Service
az appservice plan create --name user-service-plan --resource-group user-service-rg --sku B1 --is-linux
az webapp create --resource-group user-service-rg --plan user-service-plan --name my-user-service --runtime "NODE|20-lts"

# Deploy application
cd /path/to/user-service
npm run build
az webapp deployment source config-zip --resource-group user-service-rg --name my-user-service --src dist.zip

# Configure environment variables
az webapp config appsettings set --resource-group user-service-rg --name my-user-service --settings MONGODB_URI="your-uri" JWT_SECRET="your-secret" NODE_ENV="production"
```

#### Team to Enterprise
- Azure App Service Standard/Premium tiers
- Azure Kubernetes Service (AKS) for enterprise
- Azure Cosmos DB or self-managed MongoDB on VMs
- Azure Application Gateway
- Azure Monitor + Application Insights

### Google Cloud Platform (GCP)

#### Individual Scale
**Services:**
- Cloud Run (serverless, auto-scaling)
- MongoDB Atlas M0 or Cloud SQL

**Installation:**
```bash
# Install gcloud CLI
curl https://sdk.cloud.google.com | bash
gcloud init

# Build and deploy to Cloud Run
gcloud builds submit --tag gcr.io/PROJECT_ID/user-service
gcloud run deploy user-service --image gcr.io/PROJECT_ID/user-service --platform managed --region us-central1 --allow-unauthenticated --set-env-vars MONGODB_URI=your-uri,JWT_SECRET=your-secret,NODE_ENV=production
```

#### Enterprise Scale
- Google Kubernetes Engine (GKE)
- Cloud Load Balancing
- Cloud Monitoring
- Cloud SQL or MongoDB Atlas

---

## Self-Managed Hosting

### Linux (Ubuntu/Debian)

#### Prerequisites
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y curl git build-essential
```

#### Install Node.js 20.x
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Should show v20.x
```

#### Install MongoDB (Self-Managed)

**Individual/Team:**
```bash
# Import MongoDB GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg

# Add repository
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install MongoDB
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
sudo systemctl status mongod

# Secure MongoDB
mongosh
use admin
db.createUser({
  user: "adminuser",
  pwd: "strong_password_here",
  roles: [ { role: "userAdminAnyDatabase", db: "admin" }, "readWriteAnyDatabase" ]
})
exit

# Enable authentication
sudo nano /etc/mongod.conf
# Add:
# security:
#   authorization: enabled

sudo systemctl restart mongod
```

**Department/Enterprise (Replica Set):**
```bash
# On each of 3 servers, install MongoDB as above, then:

# Edit /etc/mongod.conf on each server
sudo nano /etc/mongod.conf

# Add/modify:
# replication:
#   replSetName: "rs0"
# net:
#   bindIp: 0.0.0.0
#   port: 27017

sudo systemctl restart mongod

# On primary server only
mongosh --host PRIMARY_IP
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "server1-ip:27017" },
    { _id: 1, host: "server2-ip:27017" },
    { _id: 2, host: "server3-ip:27017" }
  ]
})
```

#### Deploy User Service
```bash
# Create application directory
sudo mkdir -p /opt/user-service
sudo chown $USER:$USER /opt/user-service

# Clone repository
git clone <your-repo-url> /opt/user-service
cd /opt/user-service

# Install dependencies and build
npm install --production
npm run build

# Create environment file
nano .env
```

**.env file:**
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://adminuser:strong_password_here@localhost:27017/user-service?authSource=admin
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRY=1h
REFRESH_TOKEN_EXPIRY=7d
```

#### Setup Process Manager (PM2)
```bash
sudo npm install -g pm2

# Start application
pm2 start dist/index.js --name user-service --instances max --exec-mode cluster

# Setup startup script
pm2 startup systemd
# Run the command it outputs
pm2 save

# Monitor
pm2 monit
pm2 logs user-service
```

#### Setup Nginx Reverse Proxy
```bash
sudo apt install -y nginx

sudo nano /etc/nginx/sites-available/user-service
```

**Basic config:**
```nginx
upstream user_service {
    least_conn;
    server localhost:3000;
}

server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 10M;

    location / {
        proxy_pass http://user_service;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90s;
    }

    location /health {
        proxy_pass http://user_service/health;
        access_log off;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/user-service /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Setup SSL
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

#### Firewall Configuration
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Linux (CentOS/RHEL)

```bash
# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# Install MongoDB
sudo tee /etc/yum.repos.d/mongodb-org-7.0.repo <<EOF
[mongodb-org-7.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/8/mongodb-org/7.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-7.0.asc
EOF

sudo yum install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# Follow same deployment steps as Ubuntu above
# Use firewall-cmd instead of ufw:
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### Windows Server

#### Prerequisites
- Windows Server 2019 or later
- Administrator access

#### Install Node.js
1. Download from https://nodejs.org/ (LTS version)
2. Run installer with default options
3. Verify: `node --version` in PowerShell

#### Install MongoDB
```powershell
# Download MongoDB Community Server
# Or use Chocolatey:
choco install mongodb

# Create data directory
New-Item -ItemType Directory -Path C:\data\db

# Install as Windows Service
"C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" --install --serviceName MongoDB --serviceDisplayName "MongoDB" --dbpath C:\data\db --logpath C:\data\log\mongodb.log

# Start service
Start-Service MongoDB
Set-Service -Name MongoDB -StartupType Automatic
```

#### Deploy User Service
```powershell
# Create application directory
New-Item -ItemType Directory -Path C:\inetpub\user-service
cd C:\inetpub\user-service

# Clone repository
git clone <your-repo-url> .

# Install dependencies
npm install --production
npm run build

# Create .env file
@"
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://localhost:27017/user-service
JWT_SECRET=your-super-secret-jwt-key
"@ | Out-File -FilePath .env -Encoding utf8
```

#### Install as Windows Service (using node-windows)
```powershell
npm install -g node-windows

# Create service script
@"
const Service = require('node-windows').Service;

const svc = new Service({
  name: 'User Service',
  description: 'User Service API',
  script: 'C:\\inetpub\\user-service\\dist\\index.js',
  nodeOptions: ['--max_old_space_size=2048']
});

svc.on('install', () => svc.start());
svc.install();
"@ | Out-File -FilePath install-service.js -Encoding utf8

node install-service.js
```

#### Setup IIS Reverse Proxy (Alternative)
1. Install IIS with ARR (Application Request Routing)
2. Install URL Rewrite module
3. Create reverse proxy rule to localhost:3000

---

## Docker Deployment (All Platforms)

### Individual/Team

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    container_name: user-service-mongo
    restart: always
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: strongpassword
    volumes:
      - mongo-data:/data/db
    ports:
      - "27017:27017"
    networks:
      - user-service-network

  user-service:
    build: .
    container_name: user-service-app
    restart: always
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      MONGODB_URI: mongodb://admin:strongpassword@mongodb:27017/user-service?authSource=admin
      JWT_SECRET: your-super-secret-jwt-key
    depends_on:
      - mongodb
    networks:
      - user-service-network

volumes:
  mongo-data:

networks:
  user-service-network:
    driver: bridge
```

**Deploy:**
```bash
docker-compose up -d
docker-compose logs -f user-service
```

### Enterprise (Docker Swarm)

**docker-compose.prod.yml:**
```yaml
version: '3.8'

services:
  user-service:
    image: your-registry/user-service:latest
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: '1'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 1G
    environment:
      NODE_ENV: production
      MONGODB_URI: mongodb://admin:pass@mongo1:27017,mongo2:27017,mongo3:27017/user-service?replicaSet=rs0&authSource=admin
      JWT_SECRET: your-secret
    ports:
      - "3000:3000"
    networks:
      - user-service-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  user-service-network:
    driver: overlay
```

**Deploy:**
```bash
docker stack deploy -c docker-compose.prod.yml user-service
docker service ls
docker service scale user-service_user-service=5
```

---

## Monitoring & Maintenance

### All Deployments Should Include:

**Monitoring:**
- Application logs centralization (ELK, Splunk, CloudWatch)
- Metrics collection (Prometheus, DataDog, New Relic)
- Uptime monitoring (UptimeRobot, Pingdom)
- Database monitoring

**Backups:**
- MongoDB automated daily backups
- Configuration backups
- Disaster recovery plan

**Security:**
- SSL/TLS certificates (Let's Encrypt or commercial)
- Firewall rules (only 80/443 public)
- Regular security updates
- Environment variables stored securely (secrets manager)
- Rate limiting enabled
- CORS configured properly

**Performance:**
- Response time monitoring (<200ms target)
- Database query optimization
- Connection pooling configured
- CDN for static assets (if applicable)

---

## Cost Summary

| Scale | AWS | Azure | GCP | Self-Managed (VPS) |
|-------|-----|-------|-----|--------------------|
| Individual | $15-25/mo | $15-30/mo | $10-20/mo | $5-10/mo |
| Team | $80-120/mo | $100-150/mo | $80-120/mo | $20-40/mo |
| Department | $800-1200/mo | $1000-1500/mo | $800-1200/mo | $100-200/mo |
| Enterprise | $3000+/mo | $4000+/mo | $3000+/mo | $500+/mo |

*Self-managed costs are for VPS only; add MongoDB hosting separately if using Atlas*
