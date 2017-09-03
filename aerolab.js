#!/usr/bin/env node
'use strict';
const Config = require('./methods/config'),
      EndpointsHelper = require('./helper/EndpointsHelper'),
      inquirer = require('inquirer'),
      request = require('request'),
      fs = require('fs'),
      Finder = require('fs-finder'),
      path = require('path'),
      shell = require('shelljs')

let CURRENT_ROUTE = shell.pwd().stdout;

let API_ENDPOINT = '';
let USER_MAIL = '';
let PRIVATE_TOKEN = '';
let endpointsHelper;

console.log('Welcome to Aerolove');

let currentFolder = shell.exec(`pwd | grep -o '[^/]*$'`, {silent: true}).stdout;
// Need to remove the last space because it adds a tab or something.
currentFolder = currentFolder.substring(0, currentFolder.length -1);

// PmListHelper.getList();

// user might call `aerolab config` and it would change the config.
let options = process.argv[2];

if (options === 'config') {
  Config.createConfig().then( () => console.log(''));
} else {
  Config.checkAndSetUpConfig().then( () => {
    initializeLocalVariables();
    init();
   }).catch(e => console.log(e));
}

// initializeLocalVariables();
// showUsersPromise().then( () => console.log('done')).catch(e => console.log(e));

function init() {
  let projectTypePromise = getProjectTypePromise();
  projectTypePromise.then( projectType => {
    let groupPromise = insertGroupName();
    groupPromise
      .then( groupData => {
        getAddUsersToGroupPromise(groupData.id)
          .then( s => startRepoCreation(groupData, projectType))
          .catch(e => console.log(e));
      })
      .catch( e => console.log(e));
  }).catch(e => console.log(e));
}


function initializeLocalVariables() {
  let userConfig = Config.readConfigFile();

  API_ENDPOINT = userConfig.api;
  USER_MAIL = userConfig.mail;
  PRIVATE_TOKEN = userConfig.token;

  endpointsHelper = new EndpointsHelper(API_ENDPOINT);
}

function getAddUsersToGroupPromise(groupId) {
  return new Promise( function (resolve, reject) {
    showUsersPromise().then(users => {
      let options = {
        url : EndpointsHelper.appendUrlParamsToUrl(endpointsHelper.API_USERS_ADD, PRIVATE_TOKEN),
        form: {
          usersList: users,
          groupId: groupId
        }
      };
      request.post(options, function (body, response, err) {
        let bodyAsJson = JSON.parse(body);
        if (response.statusCode !== 200) {
          reject(bodyAsJson);
          return;
        }

        resolve(bodyAsJson);
      })
    }).catch(e => reject(e));
  })
}


// Starts the flow for repo creation and set up.
function startRepoCreation(groupData, projectType) {
  inquirer.prompt(askUserForRepoName()).then(function (options) {
    console.log(`Creating repository on GitLab called ${options.repo_name}...`);
    getRepoCreationPromise(groupData.id, options.repo_name)
      .then(repoData => {
        setUpGitFiles(repoData);

        checkOrCreateGitignore(projectType);
        createEditorConfig(projectType);
        console.log('Project set up is ready. Remember to commit and push :)');
        //Have to commit implicitly to be able to create dev branch
        shell.exec('git commit -m "Project Setup by Aerolab done."', {cwd: CURRENT_ROUTE, silent: true});

        console.log('Creating Dev branch');
        shell.exec(`git branch dev`, {cwd: CURRENT_ROUTE, silent: true});

        console.log('Project type is: ' + projectType);
      }).catch(e => console.log(e.error));
  });
}
/**
 *
 * @returns {Promise} with array of user's chosen ids
 */
function showUsersPromise() {
  return new Promise( function (resolve, reject) {
    let options = {
      url : EndpointsHelper.appendUrlParamsToUrl(endpointsHelper.API_USERS_LIST, PRIVATE_TOKEN)
    };
    request.get(options, function (err, resp, body){
      let bodyAsJson = JSON.parse(body);

      if (resp.statusCode !== 200) {
        reject(bodyAsJson);
        return;
      }

      let map = new Map();
      let pmMap = new Map();
      let usersMap = new Map();

      // We want to have pms and regular users separeted want to
      bodyAsJson.filter( user => {
        if (user.email.indexOf('@aerolab.co') >= 0){
          map.set(user.email, user)
        }
      });

      // splitting regular users from pms
      for (const [key, value] of map) {
        if (value.is_pm) {
          pmMap.set(key, value);
        } else {
          // we dont want to add the current user to the list. we want to add it manually and let it be checked
          if (key !== USER_MAIL) {
            usersMap.set(key, value);
          }
        }
      }

      // current user's email should be highlighed by default.
      let myself = {
        name: USER_MAIL,
        checked: true
      };

      let inquire = {
        type: 'checkbox',
        message: 'Pick users to add to the group',
        name: 'users',
        choices: [new inquirer.Separator('------ PMS (police-mans) ------'), ...pmMap.keys(), new inquirer.Separator('------ Team Members ------'), myself, ...usersMap.keys()]
      };
      inquirer.prompt(inquire).then( function (answers) {
        let usersToAdd = [];
        answers.users.filter(answer => usersToAdd.push(map.get(answer).id));
        resolve(usersToAdd);
      });
    });
  })
}

function askUserForRepoName() {
  return {
    type: 'input',
    name: 'repo_name',
    message: 'Insert name of the repository:',
    default: currentFolder
  }
}

function askUserForGroupName() {
  return {
    type: 'input',
    name: 'group_name',
    message: `Insert group's name: `,
    default: `Aerolab`
  }
}

function askForProjectType() {
  return {
    type: 'list',
    name: 'project_type',
    message: `We couldn't guess your project type. Help us:`,
    choices: ['android', 'ios', 'web'],
  }
}

function pickGroup(groupNames) {
  return new Promise(function (resolve, reject) {
    let inquire = {
      type: 'list',
      name: 'group_name',
      message: `Is it any of this groups?`,
      choices: [...groupNames, 'none :('],
    };
    inquirer.prompt(inquire).then( function(pickedOption) {
      resolve(pickedOption.group_name);
    });
  })
}

function setUpGitFiles(newRepoAsJson) {
  if (!isGitInitialized()) {
    console.log('----------------Initializing GIT----------------');
    shell.exec('git init', {cwd: CURRENT_ROUTE, silent: true});
  }

  // We add the ssh origin to the git file.
  console.log('Adding remotes...');
  addRemoteToGit(newRepoAsJson.ssh_url_to_repo);

  if (!isGitFlowInitialized()) {
    // add Aerolab's custom gitflow names to dev & master
    gitFlowInit();
  }

  // add the missing files
  console.log('Adding files to repo');
  shell.exec('git add .', {cwd: CURRENT_ROUTE, silent: true});
  // shell.exec('git push -u origin --all', {cwd: CURRENT_ROUTE, silent: true});
  // shell.exec('git push -u origin master', {cwd: CURRENT_ROUTE, silent: true});
}


/**
 *
 * @returns {Promise} with the project type as string.
 */
function getProjectTypePromise() {
  return new Promise( function (resolve, reject) {
    console.log('Trying to guess the project type');
    let projectType = getProjectType();

    if (!projectType) {
      let askForProjectTypePromise = getAskForProjectTypePromise();
      askForProjectTypePromise.then(type => resolve(type).catch(e => console.log('error')));
    } else {
      resolve(projectType);
    }
  })
}

/*
returns 'android', 'js' or 'ios'.
 */
function getProjectType() {
  if (hasFilesEndingWith('Podfile')) return 'ios';
  if (hasFilesEndingWith('.gradle')) return 'android';
  if (hasFilesEndingWith('.js') || hasFilesEndingWith('.html')) return 'web';
  return null;
}

/*
Read the git file and check for ocurrences of 'gitflow'.
 */
function isGitFlowInitialized() {
  let gitFile = fs.readFileSync(`${CURRENT_ROUTE}/.git/config`, 'utf8');
  return gitFile.indexOf('gitflow') >= 0;
}

function hasRemoteOrigin() {
  let gitFile = fs.readFileSync(`${CURRENT_ROUTE}/.git/config`, 'utf8');
  return gitFile.indexOf('[remote "origin"]') >= 0;
}

// Adds the repo's URL as 'remote' or as 'gitlab', in case remote already exists.
function addRemoteToGit(urlToRepo) {
  let name = hasRemoteOrigin() ? 'gitlab' : 'remote';
  shell.exec(`git remote add ${name} ${urlToRepo}`, {cwd: CURRENT_ROUTE, silent: true});
}

/*
  Extension should be smth like '.js' or '.gradle', etc.
 */
function hasFilesEndingWith(extension) {
  let files = Finder.in(`${CURRENT_ROUTE}`).findFiles(`*${extension}`);
  return (files.length !== 0);
}

// returns true if we have a .git file
function isGitInitialized() {
  let files = fs.readdirSync(CURRENT_ROUTE);
  let filteredArray = files.filter(f => f === '.git');
  return filteredArray.length >= 1;
}

function hasGitIgnore() {
  let files = fs.readdirSync(CURRENT_ROUTE);
  let filteredArray = files.filter(f => f === '.gitignore');
  return filteredArray.length >= 1;
}

/*
  Tries to create the repo in GitLab, this promise might fail
  if a repo with the same name already exists.
 */
function getRepoCreationPromise(groupId, repoName) {
  return new Promise( function (resolve, reject) {
    let options = {
      url : EndpointsHelper.appendUrlParamsToUrl(endpointsHelper.API_PROJET_CREATE, PRIVATE_TOKEN),
      form: {
        name: repoName,
        group_id: groupId
      }
    };
    console.log('Creating repo... This might take a while');
    request.post(options, function (err, resp, body) {
      let bodyAsJson = JSON.parse(body);

      if (resp.statusCode !== 200) {
        reject(bodyAsJson);
        return;
      }

      resolve(bodyAsJson);
    })
  });
}

/**
 *
 * @returns {Promise} with the project type as String.
 */
function getAskForProjectTypePromise() {
  return new Promise( function (resolve, reject) {
    inquirer.prompt(askForProjectType()).then(function (answer) {
      let projectType = answer.project_type;
      resolve(projectType);
    });
  })
}

function getGroupCreationPromise(groupName) {
  return new Promise(function (resolve, reject) {
    let options = {
      url : EndpointsHelper.appendUrlParamsToUrl(endpointsHelper.API_GROUP_CREATE, PRIVATE_TOKEN),
      form: {name: groupName}
    };

    request.post(options, function (err, resp, body) {
      let bodyAsJson = JSON.parse(body);
      if (resp.statusCode !== 200) {
        reject(bodyAsJson);
        return;
      }

      resolve(bodyAsJson);
    })
  })
}

// Given a groupName, we check if we can get any similar matches on our repo.
function getCheckForGroupsPromise(groupName) {
  return new Promise(function (resolve, reject) {
    let options = {
      url: EndpointsHelper.appendUrlParamsToUrl(`${endpointsHelper.API_PROJECT_CHECK_GROUP}/${groupName}`, PRIVATE_TOKEN)
    };
    request.get(options, function (err, resp, body) {
      let bodyAsJson = JSON.parse(body);

      if (resp.statusCode !== 200) {
        reject(bodyAsJson);
        return;
      }

      resolve(bodyAsJson);
    })
  })
}


/**
 *
 * @returns {Promise} with the data of the group we need to use to create the new project
 */
function insertGroupName() {
  return new Promise(function (resolve, reject) {
    inquirer.prompt(askUserForGroupName()).then(function (options) {
      let groupName = options.group_name;
      let checkGroupsPromise = getCheckForGroupsPromise(groupName);

      // First we get an array of matching groups.
      checkGroupsPromise.then(matchingGroups => {
        if (matchingGroups.length == 0) {
          // We should create the group because we found no matches.
          console.log(`Creating Group ${groupName}`);
          let groupCreationPromise = getGroupCreationPromise(groupName);
          groupCreationPromise.then( group => resolve(group))
            .catch(e => reject(e));
        } else {
          // We had matching groups. Ask the user to pick a group matching.
          let optionsArray = [];
          matchingGroups.filter(group => optionsArray.push(group.name));

          // handle the group selection.
          let pickGroupPromise = pickGroup(optionsArray);
          pickGroupPromise.then( selectedOption => {
            let groupIndex = optionsArray.indexOf(selectedOption);

            // this means the user didn't pick any of the existing groups.
            if (groupIndex < 0) {
              console.log(`Creating Group ${groupName}`);

              let groupCreationPromise = getGroupCreationPromise(groupName);
              groupCreationPromise.then( group => resolve(group))
                .catch(e => reject(e));
            } else {
              // User picked a group from the list.
              resolve(matchingGroups[groupIndex]);
            }
          });
        }
      }).catch( e => reject(e));
    })
  })
}
/**
 * Creates a gitignore file for the given project type.
 * it accepts `android`, `ios` or `web`
 * @param projectType
 */
function checkOrCreateGitignore(projectType) {
  const gitignoreRoute = (`./ignores/${projectType}_ignore.txt`);
  let fullPath = path.join(__dirname, gitignoreRoute);

  // Copys the given file into .gitignore file.
  if (!hasGitIgnore()) {
    console.log('.gitignore not found, creating new one');
    fs.createReadStream(fullPath).pipe(fs.createWriteStream('.gitignore'));

    console.log('adding .gitignore to repo');
    shell.exec('git add .gitignore', {cwd: CURRENT_ROUTE, silent: true});
  }
}

// Creating the edtirConfig files. Android and ios will share the same config.
function createEditorConfig(projectType) {
  let editorRoute= (`./editorConfigs/android_editor.txt`);
  if (projectType === 'web') { editorRoute = (`./editorConfigs/web_editor.txt`); }

  let fullPath = path.join(__dirname, editorRoute);

  console.log(`Creating .editorconfig file for ${projectType}`);
  fs.createReadStream(fullPath).pipe(fs.createWriteStream('.editorconfig'));

  console.log('adding .editorconfig to repo');
  shell.exec('git add .editorconfig', {cwd: CURRENT_ROUTE, silent: true});
}

