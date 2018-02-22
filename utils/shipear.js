const fs = require('fs'),
      os = require('os'),
      path = require('path'),
      shell = require('shelljs'),
      config = require('./config'),
      { getMainScripts } = require('./gulp'),
      chalk = require('chalk'),
      copyPaste = require('copy-paste'),
      cwd = process.cwd();


async function shipear() {
  console.log("Shipeando...")

  const dokkuApp = path.basename(cwd) +'-now'
  const dokkuUrl = 'http://'+ dokkuApp +'.'+ config.get().dokkuHost

  // To prevent messing up your current repo with unwanted commits, 
  // copy everything (except node_modules and other crap) to another folder,
  // set up a fake git repo and commit and push from there.
  const tempDirectory = config.getTempDirectory(dokkuApp)

  shell.rm('-rf', tempDirectory)
  shell.mkdir('-p', tempDirectory)

  const files = await shell.ls('-A')
  const filesToIgnore = ["node_modules", ".git", ".next", ".vscode", ".idea", ".DS_Store", "build", "dist", "release", ".npm", ".grunt", ".gulp"]
  const filesToCopy = files.filter((f) => {
    return filesToIgnore.indexOf(f) === -1
  })

  // Copy all qualified files to the tempDirectory
  for( let f of filesToCopy ) {
    await shell.cp('-R', path.join(cwd, f), path.join(tempDirectory))
  }

  // Do all the dirty stuff
  shell.config.silent = true
  shell.pushd(tempDirectory)
  shell.config.silent = false
  
  // Git!
  await shell.exec('git init', {silent: true})
  if (!fs.existsSync(path.join(tempDirectory, '.gitignore'))) {
    let gitIgnore = fs.readFileSync(path.join(__dirname, '../ignores/node_ignore.txt'))
    fs.writeFileSync(path.join(tempDirectory, '.gitignore'), gitIgnore)
    await shell.exec('git add .gitignore', {silent:true})
  }

  // Package.json!
  const packagePath = path.join(tempDirectory, 'package.json')
  if (!fs.existsSync(packagePath)) {
    shell.exec('npm init -y', {silent: true})
    shell.exec('git add package.json', {silent:true})
  }
  const packageInfo = JSON.parse(fs.readFileSync(packagePath))

  // Dockerfile for Node.JS
  const dockerfilePath = path.join(tempDirectory, 'Dockerfile')
  if (!fs.existsSync(dockerfilePath)) {
    let dockerfile = fs.readFileSync(path.join(__dirname, '../docker/node.dockerfile'))
    fs.writeFileSync(path.join(tempDirectory, 'Dockerfile'), dockerfile)
    let dockerignore = fs.readFileSync(path.join(__dirname, '../docker/node.dockerignore'))
    fs.writeFileSync(path.join(tempDirectory, '.dockerignore'), dockerignore)

    shell.exec('git add Dockerfile .dockerignore', {silent:true})
  }

  // Ensure there's a start script
  if (!packageInfo.scripts || !packageInfo.scripts.start) {
    console.log("⚠️  No tenés un script para "+ chalk.bold("npm start") +"! Voy a adivinar uno en base a tus archivos...")

    packageInfo.scripts = packageInfo.scripts || {}

    let scripts = getMainScripts(tempDirectory)

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


  // Next.JS doesn't work with the $PORT env. No idea why.
  if( packageInfo.scripts.start === 'next start' ) {
    packageInfo.scripts.start = 'next start -p ${PORT:-4000}'
    fs.writeFileSync(packagePath, JSON.stringify(packageInfo, null, 4))
  }

  shell.exec('git add .', {silent:true})
  shell.exec('git commit -a -m "Shipeando!"', {silent:true})

  copyPaste.copy(dokkuUrl)
  console.log('')
  console.log('El sitio va a estar en '+ chalk.bold.underline(dokkuUrl) +' (Copiado a tu portapapeles)')
  console.log('')
  shell.exec('git push dokku@wip.aerolab.co:'+ dokkuApp +' HEAD:refs/heads/master --force')

  // Go back to the previous dir
  shell.config.silent = true
  shell.popd()
  shell.config.silent = false
}

module.exports = shipear