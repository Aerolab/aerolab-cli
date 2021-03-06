const shell = require('shelljs'),
ora = require('ora'),
chalk = require('chalk')

function restart(dokkuApp) {

  let spinner = ora({ text: 'Restarting '+ chalk.bold.white(dokkuApp), spinner: 'dots' }).start();

  let logs = shell.exec(
    "ssh -tt dokku@wip.aerolab.co -- ps:restart " + dokkuApp,
    { async:true, silent:true },
    function(code, stdout, stderr) {
      // Code 0 is success for ssh
      if( code === 0 ) {
        spinner.succeed()
      } else {
        spinner.fail()
        console.log(stdout)
      }
    })

}

module.exports = restart
