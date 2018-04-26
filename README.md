## Migration of containerized Node.js application with a mysql backend


### Prerequisites 

* Install Jenkins
  * Provision the Microsoft Jenkins VM in the Azure Marketplace
  * Install docker on the Jenkins VM
  * Install the the Node.js plugin
  * Azure App Services plugin - Already installed
* Clone repository to dev machine
* Install MySQL Workbench on dev machine
* Install docker on the dev machine
* Run the MySql Docker image on the dev machine


### Phase 1 - On-Prem Setup

* Configure the application to connect to the mysql server on the dev machine
* Run the application on the dev machine
  * Run npm Install
  * Run npm build
  * Run npm start
* Browse to localhost:3000
* Add some entries to the ToDo application
* Excercise some of the functions such as delete and complete


### Phase 2 - Setup Azure Resources

* Visit the Azure Portal 
* Open the Azure Cloud Shell (shell.azure.com)
* Run the commands to create the mysql database
* Create the Azure Container Registry
* Run the commands to create the webapp
  *  Configure the webapp to pull the container from Azure Container Registry
* Create a service priciple for jenkens to perform the deployment


### Phase 3 - Configure Jenkins Build

* Configure github credentials in Jenkins
* Create the build pipeline in Jenkins (Freestyle Project)
  * Add build steps to run command
    * npm install
    * npm run build
 * Add the app service  post deploy task
   * Add include the previously created service principle
 * Start the build
 * Configure the application settings to connect to the database
 * Open the app in the browser
   * App has no data because data has not been migrated yet 

### Phase 4 - Migrate MySQL Database to Azure 

* Open Mysql Workbench
* Create a connection to the local MySQL database
* Create a connection to the Azure Mysql Database
* Run the Migration Wizard
* Open the app in the browser
  * App should now show the migrated data

