[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

<p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
<p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
<a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg"/></a>
<a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
<a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow"></a>
</p>
<!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->
  
## Description

Proyecto DESIMA

## Installation Process
1. Install the environment

* Install Nodejs and Mysql from the internet home pages.
* Then run the following commands to prepare the environment:
* RUN `sudo npm install npm --global`, install npm globally.
* RUN `echo 'export PATH=/usr/local/bin:$PATH' >>~/.bash\_profile`, to make npm available.
* RUN `sudo npm install -g @angular/cli`, to install angular globally (not needed in production or only backend development).
* RUN `sudo npm i -g @nestjs/cli`, to install nestjs globally, needed to run the backend.
* RUN `sudo npm install -g npm-check-updates`, to install npm-check-update globally, this is needed to update all packages dependencies in package.json to a new major version.
* RUN `npm list -g --depth=0`, to look all the global components intalled.
* For example it should look like:

* Version del Node v22.12.0
```bash
    /usr/local/lib
    ├── @angular/cli@19.0.6
    ├── @nestjs/cli@10.4.9
    ├── corepack@0.30.0
    ├── npm-check-updates@17.1.13
    └── npm@10.9.0
```

2. Prepare the environment

* Create a file '.env' in the main dir from the example '.env.example' file.
* In this file you needed to add all the database information:

```bash
NODE_ENV='develop'
PS_SECRET='PS2024_SECRET'
PS_DBHOST='localhost'
PS_DBPORT=3306
PS_DBUSERNAME='root'
PS_DBPASSWORD='password'
PS_DATABASE='desima'
PORT=3000
```

* Create a database in a MySQL Server.
* If the database already exists do:

```mysql
DROP DATABASE `desima`;
CREATE DATABASE desima;
```

3. Install project components

* If its an initial setup for a clean project, go to the project forlder and do:
* RUN `sudo npm install`, to install all the components.

* Otherwise to initialize and update, go to the project folder and do:
* RUN `sudo rm -rf node_modules`, to delete all the modules. 
* *DONT RUN `sudo rm package.json`, don't delete the configuration file, this file is important.
* RUN `sudo ncu -u`, to update dependencies in package.json to latest version.
* RUN `sudo npm install`, to install all the components.

## Commands

```
 nest g s products/services/products --flat
 nest g m products
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod

# Stop Service if its running on background
$ pkill node
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## DB SEED

```bash
# unit tests
# create database / borrar tablas
$ npm run start:dev
# ejecutar el script .sql de los productos

# ejecutar para correr los seeder.
$ npm run db:seed

```

## Database Guides

Data requiered for run:

- User
- roles
- count-parameter



