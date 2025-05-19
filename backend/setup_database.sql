-- Criar o banco de dados se não existir
CREATE DATABASE "AppProject" WITH OWNER = postgres ENCODING = 'UTF8';

-- Conectar ao banco de dados
\c "AppProject";

-- Criar tabelas
CREATE TABLE IF NOT EXISTS "Users" (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  senha VARCHAR(255) NOT NULL,
  telefone VARCHAR(20),
  "dataNascimento" DATE,
  genero VARCHAR(20),
  altura FLOAT,
  peso FLOAT,
  alergias TEXT,
  "condicoesMedicas" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Medications" (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  dosage VARCHAR(100) NOT NULL,
  frequency VARCHAR(50) NOT NULL DEFAULT 'daily',
  "timeOfDay" JSONB NOT NULL,
  "daysOfWeek" JSONB,
  "startDate" TIMESTAMP WITH TIME ZONE NOT NULL,
  "endDate" TIMESTAMP WITH TIME ZONE,
  instructions TEXT,
  color VARCHAR(20) DEFAULT '#4A90E2',
  active BOOLEAN DEFAULT TRUE,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "MedicationLogs" (
  id SERIAL PRIMARY KEY,
  "medicationId" INTEGER NOT NULL REFERENCES "Medications"(id) ON DELETE CASCADE,
  "userId" INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
  "scheduledTime" VARCHAR(50) NOT NULL,
  "takenAt" TIMESTAMP WITH TIME ZONE,
  "missedAt" TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'scheduled',
  notes TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "EmergencyContacts" (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  telefone VARCHAR(20) NOT NULL,
  relacao VARCHAR(100),
  email VARCHAR(255),
  "isPrimary" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_medications_userId ON "Medications"("userId");
CREATE INDEX IF NOT EXISTS idx_medicationlogs_userId ON "MedicationLogs"("userId");
CREATE INDEX IF NOT EXISTS idx_medicationlogs_medicationId ON "MedicationLogs"("medicationId");
CREATE INDEX IF NOT EXISTS idx_emergencycontacts_userId ON "EmergencyContacts"("userId");
