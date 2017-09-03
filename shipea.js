#!/usr/bin/env node
const fs = require('fs'),
      os = require('os'),
      path = require('path'),
      shell = require('shelljs'),
      config = require('./utils/config'),
      { getMainScripts } = require('./utils/gulp'),
      chalk = require('chalk'),
      copyPaste = require('copy-paste')

const cwd = process.cwd()

const dokkuApp = path.basename(cwd) +'-now'

// Entrypoint
if( process.argv[2] === "help" ) {
  require('./utils/help')()
}
else if( process.argv[2] === "logs" ) {
  require('./utils/logs')(process.argv[3] || dokkuApp)
}
else if( process.argv[2] === "destroy" ) {
  require('./utils/destroy')(process.argv[3] || dokkuApp)
}
else if( process.argv[2] === "list" ) {
  require('./utils/list')(path.basename(cwd), config.get().dokkuHost || '')
}
else if( process.argv[2] === "config" ) {
  config.run(() => {
    process.exit()
  })
}
else {
  if( ! config.isValid() ) {
    require('./utils/help')()

    console.log("Tengo un par de preguntas antes de empezar")
    config.run(() => {
      console.log('')
      shipear()
    })
  } else {
    shipear()
  }
}



function shipear() {
  console.log("Shipeando...")

  // Create a basic git config and package.json (if necessary) and add some basic scripts
  if (!fs.existsSync(path.join(cwd, '.git/config'))) {
    shell.exec('git init', {silent: true})
  }
  if (!fs.existsSync(path.join(cwd, '.gitignore'))) {
    let gitIgnore = fs.readFileSync(path.join(__dirname, 'ignores/node_ignore.txt'))
    fs.writeFileSync(path.join(cwd, '.gitignore'), gitIgnore)
    shell.exec('git add .gitignore', {silent:true})
  }

  const packagePath = path.join(cwd, 'package.json')
  if (!fs.existsSync(packagePath)) {
    shell.exec('npm init -y', {silent: true})
    shell.exec('git add package.json', {silent:true})
  }
  const packageInfo = JSON.parse(fs.readFileSync(packagePath))

  // Add a standard Node.JS Dockerfile
  const dockerfilePath = path.join(cwd, 'Dockerfile')
  if (!fs.existsSync(dockerfilePath)) {
    let dockerfile = fs.readFileSync(path.join(__dirname, 'docker/node.dockerfile'))
    fs.writeFileSync(path.join(cwd, 'Dockerfile'), dockerfile)
    let dockerignore = fs.readFileSync(path.join(__dirname, 'docker/node.dockerignore'))
    fs.writeFileSync(path.join(cwd, '.dockerignore'), dockerignore)

    shell.exec('git add Dockerfile .dockerignore', {silent:true})
  }

  // Ensure there's a start script
  if (!packageInfo.scripts || !packageInfo.scripts.start) {
    console.log("⚠️  No tenés un script para "+ chalk.bold("npm start") +"! Voy a adivinar uno en base a tus archivos...")

    packageInfo.scripts = packageInfo.scripts || {}

    let scripts = getMainScripts(cwd)

    packageInfo.scripts.prestart = packageInfo.scripts.prestart ? packageInfo.scripts.prestart : scripts.prestart
    packageInfo.scripts.start = packageInfo.scripts.start ? packageInfo.scripts.start : scripts.start
    packageInfo.scripts.build = packageInfo.scripts.build ? packageInfo.scripts.build : scripts.build
    packageInfo.scripts.dev = packageInfo.scripts.dev ? packageInfo.scripts.dev : scripts.dev


    if( packageInfo.main ) {
      shell.exec('git add '+ packageInfo.main, {silent:true})
    }

    if( packageInfo.scripts.start.startsWith("serve ") ) {
      packageInfo.devDependencies = packageInfo.devDependencies || {}
      if( ! packageInfo.devDependencies.serve ) {
        packageInfo.devDependencies.serve = 'latest'
      }
    }

    fs.writeFileSync(packagePath, JSON.stringify(packageInfo, null, 4))

    shell.exec('git add package.json', {silent:true})

    console.log("Creo que tu npm start puede ser "+ chalk.bold(packageInfo.scripts.start) +"")
    console.log("Registrá un "+ chalk.bgHex('#ff7b00').bold(' npm start ') +" y asegurate de que funcione la próxima")
  }

  let dokkuUrl = 'http://'+ dokkuApp +'.'+ config.get().dokkuHost
  let branchName = shell.exec('git rev-parse --abbrev-ref HEAD', {silent:true}).stdout.trim()

  shell.exec('git add .', {silent:true})
  shell.exec('git commit -a -m "Shipeando!"', {silent:true})

  copyPaste.copy(dokkuUrl)
  console.log('')
  console.log('El sitio va a estar en '+ chalk.bold.underline(dokkuUrl) +' (Copiado a tu portapapeles)')
  console.log('')
  shell.exec('git push dokku@wip.aerolab.co:'+ dokkuApp +' HEAD:refs/heads/master --force')
}
