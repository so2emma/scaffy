{
  "name": "${projectName?lower_case}",
  "version": "1.0.0",
  "description": "Scaffolded Express.js backend for ${projectName} with TypeScript and Prisma",
  "main": "dist/index.js",
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev"
  },
  "dependencies": {
    "@prisma/client": "^5.12.1",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^20.12.7",
    "prisma": "^5.12.1",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.4.5"
  }
}
