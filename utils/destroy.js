const shell = require('shelljs'),
      ora = require('ora'),
      chalk = require('chalk')

function destroy(dokkuApp) {

  let spinner = ora({ text: 'Te vamos a extrañar '+ chalk.bold.white(dokkuApp) +' 😭', spinner: 'dots' }).start();

  let logs = shell.exec(
    "ssh -tt dokku@wip.aerolab.co -- apps:destroy " + dokkuApp +" --force",
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

module.exports = destroy
