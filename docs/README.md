# Banking Buddy - Documentation

## Quick Start

- [Quick Start Guide](QUICK_START.md) - Get started with the project

## Setup & Configuration

- [Database Setup Guide](README-DATABASE-SETUP.md) - Local database setup instructions
- [Database Setup Summary](DATABASE-SETUP-SUMMARY.md) - Database configuration overview
- [Deployment Guide](DEPLOYMENT_GUIDE.md) - Deployment instructions and procedures
- [Redis Caching Guide](REDIS_CACHING_GUIDE.md) - Cache implementation and usage

## Architecture & Design

- [Architecture Diagram](diagrams/) - AWS architecture diagram generated from code
- [Backup and Restore Strategy](BACKUP_AND_RESTORE_STRATEGY.md) - Data backup and recovery procedures
- [API Versioning Policy](API_VERSIONING_POLICY.md) - API versioning standards and guidelines

## Service Specifications

- [Client Service Specification](CLIENT_SERVICE_SPECIFICATION.md) - Client service API and implementation details

## Monitoring & Logging

- [Audit Logging Usage Guide](AUDIT_LOGGING_USAGE_GUIDE.md) - Audit logging implementation and usage
- [Audit Logging Test Results](AUDIT_LOGGING_TEST_RESULTS.md) - Audit logging validation and test outcomes

## Operations & Maintenance

- [Terraform Cost Optimization](terraform-cost-optimization.md) - Infrastructure cost management strategies
- [Cleanup Summary](CLEANUP_SUMMARY.md) - Project cleanup and maintenance notes

## Architecture Diagrams

Generate the AWS architecture diagram:

```bash
cd docs/diagrams
pip install -r requirements.txt
python banking_buddy_architecture.py
```

**Prerequisites**: Python 3.x and Graphviz

## Project Structure

```
docs/
├── README.md                              # This file
├── QUICK_START.md                         # Quick start guide
├── README-DATABASE-SETUP.md               # Database setup
├── DATABASE-SETUP-SUMMARY.md              # Database summary
├── DEPLOYMENT_GUIDE.md                    # Deployment instructions
├── REDIS_CACHING_GUIDE.md                 # Redis caching guide
├── BACKUP_AND_RESTORE_STRATEGY.md         # Backup strategy
├── API_VERSIONING_POLICY.md               # API versioning
├── CLIENT_SERVICE_SPECIFICATION.md        # Client service spec
├── AUDIT_LOGGING_USAGE_GUIDE.md           # Audit logging guide
├── AUDIT_LOGGING_TEST_RESULTS.md          # Audit test results
├── terraform-cost-optimization.md         # Cost optimization
├── CLEANUP_SUMMARY.md                     # Cleanup notes
└── diagrams/                              # Architecture diagrams
    ├── banking_buddy_architecture.py      # Diagram script
    ├── banking_buddy_architecture.png     # Generated diagram
    └── requirements.txt                   # Python dependencies
```
