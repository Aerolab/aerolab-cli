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
else if( process.argv[2] === "restart" ) {
  require('./utils/restart')(process.argv[3] || dokkuApp)
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
else if( process.argv[2] === "cleanup" ) {
  require('./utils/cleanup')()
}
else if( process.argv.length == 2 ) {
  if( ! config.isValid() ) {
    require('./utils/help')()

    console.log("Tengo un par de preguntas antes de empezar")
    config.run(() => {
      console.log('')
      require('./utils/shipear')()
    })
  } else {
    require('./utils/shipear')()
  }
}
else {
  require('./utils/help')(process.argv[2] || null)
}
