const shell = require('shelljs'),
ora = require('ora'),
chalk = require('chalk')

function restart(dokkuApp) {

  let spinner = ora({ text: 'Adding Lets Encrypt to '+ chalk.bold.white(dokkuApp), spinner: 'dots' }).start();
  let logs = shell.exec(
    "ssh -tt dokku@wip.aerolab.co -- certs:add "+ dokkuApp +" /home/dokku/.https/server.crt /home/dokku/.https/server.key ",
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
