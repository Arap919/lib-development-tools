#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

// Получаем путь к package.json
const packageJsonPath = path.resolve(process.cwd(), 'package.json');

// Проверяем, существует ли package.json
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ Ошибка: Файл package.json не найден в текущем каталоге');
  process.exit(1);
}

// Читаем package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Получаем имя пакета из поля name в package.json
const packageName = packageJson.name;

if (!packageName) {
  console.error('❌ Ошибка: Не найдено имя пакета в package.json');
  process.exit(1);
}

// Путь к директории dist для текущего проекта
const distDir = path.resolve(process.cwd(), 'dist', packageName);

if (!fs.existsSync(distDir)) {
  console.error(`❌ Ошибка: Директория ${distDir} не найдена`);
  process.exit(1);
}

console.log(`📦 Публикация через yalc для проекта ${packageName}`);
console.log(`📁 Путь к директории проекта: ${distDir}`);

async function runCommand(command: string, args: string[], cwd: string) {
  return new Promise((resolve, reject) => {
    const cmd = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: true,
    });

    cmd.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Команда завершилась с кодом ${code}`));
      } else {
        resolve(true);
      }
    });

    cmd.on('error', (err) => {
      reject(new Error(`Ошибка при запуске команды: ${err.message}`));
    });
  });
}

async function main() {
  try {
    console.log('📲 Обновление подключённых проектов...');
    await runCommand('yalc', ['push'], distDir); // Используем путь к dist текущего проекта
    console.log('✅ Проект успешно обновлён через yalc.');
  } catch (error) {
    console.error(`❌ Ошибка при пуше изменений: ${error.message}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('❌ Ошибка:', err);
  process.exit(1);
});
