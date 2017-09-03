const shell = require('shelljs'),
      ora = require('ora'),
      chalk = require('chalk')

function unslugify(text) {
  let str = text.toLowerCase();
  return str.replace(/\-/g, ' ').replace(/(^([a-zA-Z\p{M}]))|([ -][a-zA-Z\p{M}])/g,
    function(s){
      return s.toUpperCase();
    });
}


function list(dokkuApp, dokkuHost) {

  let spinner = ora({ text: 'Buscando apps', spinner: 'dots' }).start();

  let logs = shell.exec(
    "ssh -tt dokku@wip.aerolab.co -- apps:list",
    { async:true, silent:true },
    function(code, stdout, stderr) {
      // Code 0 is success for ssh
      if( code === 0 ) {
        spinner.succeed()
      } else {
        spinner.fail()
        console.log(stdout)
        return
      }

      console.log(chalk.italic("ProTip: Haciendo Cmd + Click en la URL podés ver la app live \n"))

      let apps = stdout.split("\n").filter((a) => a !== '' && ! a.startsWith('=')).map((a) => a.trim())
      let projects = {}
      let roots = []

      // Group apps into projects based on their name
      apps.map((a) => {
        let segments = a.split('-')
        for( let i=segments.length; i>1; i-- ) {
          segments.pop()
          roots.push(segments.join('-'))
        }
      })
      roots = roots.sort((a, b) => b.length - a.length)

      // Map the apps into projects based on the best match
      roots.map((r) => {
        let similarApps = apps.filter((a) => a.startsWith(r+'-'))
        if( similarApps.length > 1 ) {
          projects[r] = similarApps
          apps = apps.filter((a) => similarApps.indexOf(a) === -1)
        }
      })
      // Add the lone apps as single projects
      apps.map((a) => {
        projects[a] = [a]
      })

      // Show the projects and apps nested
      Object.keys(projects).sort().map((p) => {
        console.log( chalk.bold( unslugify(p) ) )
        projects[p].sort().map((a) => {
          console.log("  "+ a +"  "+ chalk.dim("http://" + a + (dokkuHost ? '.'+ dokkuHost : '')))
        })
      })
    })

}

module.exports = list
