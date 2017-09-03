const fs = require('fs'),
      os = require('os'),
      path = require('path'),
      shell = require('shelljs'),
      ini = require('ini'),
      inquirer = require('inquirer'),
      chalk = require('chalk'),
      url = require('url')

const aerolabConfigDirectory = path.join(os.homedir(), '.aerolab')
const aerolabConfigPath = path.join(aerolabConfigDirectory, 'config.json')
const gitConfigPath = path.join(os.homedir(), '.gitconfig')


function run(callback) {
  // Read the config file and the git config file to get some defaults
  let config = get()
  let gitConfig = getGitConfig()

  let setupQuestions = []
  setupQuestions.push({
    name: 'name',
    message: 'Tu nombre completo?',
    default: config.name || (gitConfig.user || {}).name || '',
    type: 'input',
    validate: (v) => typeof v === 'string' && v.trim() !== '' && v !== 'null',
    filter: (v) => v.trim()
  })
  setupQuestions.push({
    name: 'email',
    message: 'Tu mail @aerolab.co?',
    default: config.email || (gitConfig.user || {}).email || '',
    type: 'input',
    validate: (v) => typeof v === 'string' && v.trim() !== '' && v !== 'null' && v.includes('@'),
    filter: (v) => v.trim()
  })
  setupQuestions.push({
    name: 'dokkuHost',
    message: 'Cuál es el dominio de Dokku?',
    default: (config || {}).dokkuHost || null,
    type: 'input',
    validate: (v) => typeof v === 'string' && v.trim() !== '' && v !== 'null',
    filter: (v) => {
      // Clean up the dokku domain (no protocol)
      let dokkuHost = url.parse(v)
      return dokkuHost.host || dokkuHost.path
    }
  })

  inquirer.prompt(setupQuestions).then(function (config) {
    // Update the global git config
    gitConfig.user = {name: config.name, email: config.email}
    fs.writeFileSync(gitConfigPath, ini.stringify(gitConfig))

    // Update the Aerolab config
    save(config)

    console.log(chalk.bold(chalk.green("✔") + " Listo!"))

    callback()
  })
}

function save(newConfig) {
  if (!fs.existsSync(aerolabConfigDirectory)) {
    fs.mkdirSync(aerolabConfigDirectory)
  }
  fs.writeFileSync(aerolabConfigPath, JSON.stringify(newConfig, null, 4))
}

function get() {
  if (!fs.existsSync(aerolabConfigPath)) {
    return {}
  }
  try {
    return JSON.parse(fs.readFileSync(aerolabConfigPath, 'utf-8'))
  } catch(e) {
    return {}
  }
}

function getGitConfig() {
  if (fs.existsSync(gitConfigPath)) {
    return ini.parse(fs.readFileSync(gitConfigPath, 'utf-8'))
  } else {
    return null
  }
}

function isValid() {
  let config = get()
  return config.name && config.email && config.dokkuHost
}


module.exports = { run, get, isValid }
