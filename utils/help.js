const chalk = require('chalk')
      log = console.log

function help(attemptedCommand) {

  if( attemptedCommand ) {
    log("")
    log("⚠️   "+ chalk.bgHex('#cc0000').bold.white(` ${attemptedCommand} `) +" no es un comando válido.")
  }

  log("")
  log(chalk.bold("🤔  Qué es shipea?"))
  log("Una CLI que envía tu proyecto a Dokku, solucionando las issues más comunes.")
  log("")
  log("🦄   "+chalk.bgHex('#ff7b00').bold.white(" shipea ")+" para subir tu repo actual a Dokku")
  log("🛠️   "+chalk.bgHex('#ff7b00').bold.white(" shipea list ")+" para ver todas las apps que están en Dokku")
  log("⚠️   "+chalk.bgHex('#ff7b00').bold.white(" shipea logs" + chalk.italic(" [app] "))+" para ver qué rompiste en Dokku")
  log("⚠️   "+chalk.bgHex('#ff7b00').bold.white(" shipea restart" + chalk.italic(" [app] "))+" para restartear un server en Dokku")
  log("💣️   "+chalk.bgHex('#ff7b00').bold.white(" shipea destroy" + chalk.italic(" [app] "))+" para borrar la app en Dokku")
  log("⚙️   "+chalk.bgHex('#ff7b00').bold.white(" shipea config ")+" para configurar tu perfil")
  log("⚙️   "+chalk.bgHex('#ff7b00').bold.white(" shipea cleanup ")+" para limpiar los archivos temporarios")
  log("")
}

module.exports = help
