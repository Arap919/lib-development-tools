#!/usr/bin/env node

const { spawn } = require('child_process');
const { readFile, access } = require('fs/promises');
const { join } = require('path');
const { constants } = require('fs');

async function waitForFile(filePath, timeout = 15000) {
  const start = Date.now();
  while (true) {
    try {
      await access(filePath, constants.F_OK);
      return;
    } catch {
      if (Date.now() - start > timeout) {
        throw new Error(`Timeout: File ${filePath} not found after ${timeout}ms`);
      }
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}

function runBackgroundProcess(command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    stdio: 'inherit',
    shell: true,
  });

  child.on('error', (err) => {
    console.error(`Ошибка в процессе ${command}:`, err);
  });
}

async function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: true,
    });

    child.on('error', reject);
    child.on('close', (code) => {
      code === 0 ? resolve(code) : reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

async function main() {
  try {
    const rootDir = process.cwd(); // Директория, из которой запускается скрипт
    const args = process.argv.slice(2);
    const consumerProjectPath = args[0];
    const timeout = Number(args[1] ?? 20000);

    if (!consumerProjectPath) {
      throw new Error('Не передан путь до основного проекта в качестве аргумента');
    }

    // Чтение package.json из текущей директории
    const packageJsonRaw = await readFile(join(rootDir, 'package.json'), 'utf-8');
    const { name: libraryName } = JSON.parse(packageJsonRaw);

    const buildDir = join(rootDir, 'dist', libraryName);
    const buildPackageJsonPath = join(buildDir, 'package.json');

    console.log(`📦 Библиотека: ${libraryName}`);
    console.log(`📁 Build dir: ${buildDir}`);

    console.log('🚀 Запуск ng build --watch...');
    runBackgroundProcess('ng', ['build', libraryName, '--watch'], rootDir);

    console.log('⏳ Ожидание появления билдов...');
    await waitForFile(buildPackageJsonPath, timeout);

    const buildPackageJsonRaw = await readFile(buildPackageJsonPath, 'utf-8');
    const { name: buildLibraryName } = JSON.parse(buildPackageJsonRaw);

    console.log('📦 Публикация через yalc...');
    runBackgroundProcess('yalc', ['publish', '--watch'], buildDir);

    console.log('🔗 Добавление в основной проект...');
    await runCommand('yalc', ['add', buildLibraryName], consumerProjectPath);

    console.log('✅ Готово! Пакет опубликован и подключён. Ждём изменений...');
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

main();
