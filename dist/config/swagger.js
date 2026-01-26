import swaggerJsdoc from 'swagger-jsdoc';
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'User Service API',
            version: '1.0.1',
            description: 'Multi-tenant User Management Service with RBAC and JWT authentication',
            contact: {
                name: 'API Support',
                email: 'support@tcms.local'
            },
            license: {
                name: 'ISC',
                url: 'https://opensource.org/licenses/ISC'
            }
        },
        servers: [
            {
                url: 'http://localhost:8081',
                description: 'Development server'
            },
            {
                url: 'https://api.tcms.local',
                description: 'Production server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'JWT Authorization header using Bearer scheme. Example: "Bearer {token}"'
                }
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        code: { type: 'string', example: 'INTERNAL_ERROR' },
                        message: { type: 'string', example: 'An error occurred' },
                        traceId: { type: 'string', example: 'f07b33a0-dbc8-4695-8fcf-8963cfef9c09' },
                        details: { type: 'object' }
                    }
                },
                User: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string', example: '6977c5e4ea7e71a947e74e92' },
                        email: { type: 'string', format: 'email', example: 'user@example.com' },
                        role: { type: 'string', example: '6977c5e4ea7e71a947e74e93' },
                        tenant: { type: 'string', example: '6977c5e4ea7e71a947e74e78' },
                        isActive: { type: 'boolean', example: true },
                        lastLogin: { type: 'string', format: 'date-time' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                },
                Role: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string', example: '6977c5e4ea7e71a947e74e93' },
                        name: { type: 'string', example: 'admin' },
                        description: { type: 'string', example: 'Administrator role' },
                        permissions: {
                            type: 'array',
                            items: { type: 'string' },
                            example: ['USER.READ', 'USER.CREATE', 'USER.UPDATE']
                        },
                        tenant: { type: 'string', example: '6977c5e4ea7e71a947e74e78' },
                        isDeleted: { type: 'boolean', example: false },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                },
                Tenant: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string', example: '6977c5e4ea7e71a947e74e78' },
                        name: { type: 'string', example: 'Acme Corporation' },
                        domain: { type: 'string', example: 'acme.tcms.local' },
                        isActive: { type: 'boolean', example: true },
                        isDeleted: { type: 'boolean', example: false },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                },
                Permission: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        code: { type: 'string', example: 'USER.CREATE' },
                        description: { type: 'string', example: 'Create users' },
                        category: { type: 'string', example: 'User' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                }
            }
        },
        security: [
            {
                bearerAuth: []
            }
        ],
        tags: [
            { name: 'Authentication', description: 'Authentication and authorization endpoints' },
            { name: 'Users', description: 'User management operations' },
            { name: 'Roles', description: 'Role and permission management' },
            { name: 'Tenants', description: 'Tenant/organization management' },
            { name: 'Health', description: 'Health check and monitoring endpoints' }
        ]
    },
    apis: ['./src/routes/*.ts', './src/controllers/*.ts']
};
export const swaggerSpec = swaggerJsdoc(options);
