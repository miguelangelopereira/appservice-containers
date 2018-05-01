## Migration of containerized Node.js application with a mysql backend


### Prerequisites 

* Install Jenkins
  * Provision the Microsoft Jenkins VM in the Azure Marketplace
  * [Install docker](https://docs.docker.com/install/linux/docker-ce/ubuntu/#install-docker-ce-1) on the Jenkins VM
  * [Install docker-compose](https://docs.docker.com/compose/install/#install-compose) on the Jenkins VM
  * Complete [post-install](https://docs.docker.com/install/linux/linux-postinstall/) linux configuration. You may have to restart the server once this step is complete.
  * Install the the Node.js plugin
    * Go to **Jenkins**->**Manage Jenkins**->**Managed Plugins**.
    * Search for **NodeJS**
    * Select the checkbox and then **intall with restart**.
    * Go to **Jenkins**->**Manage Jenkins**->**Global Tool Configuration**.
    * Scroll down to the NodeJS section and click **Add NodeJS**.
    * Give it a name e.g. *node10* and leave all other options as default, click **Save**.
  * Azure App Services plugin - Already installed
* Clone repository to dev machine
* Install MySQL Workbench on dev machine
* Install docker on the dev machine
* Run the MySql Docker image on the dev machine
  ```
  docker run -p 3306:3306 --name build-mysql -e MYSQL_ROOT_PASSWORD=build-pw -d mysql:5.7
  ```


### Phase 1 - On-Prem Setup

* Configure the application to connect to the mysql server on the dev machine
  * Adjust the `.vscode\launch.json` file and add the following values:
    * MYSQLUSER: root
    * MYSQLPASSWORD: build-pw
    * MYSQLSERVER: localhost
* Run the application on the dev machine
  * Run `npm install`
  * Run `npm run build`
  * Run `npm start`
* Browse to http://localhost:3000
* Add some entries to the ToDo application
* Excercise some of the functions such as delete and complete
* Create a `Dockerfile` in the `app` folder. Copy the contents below in
  ```dockerfile
  FROM node:6-alpine

  ENV APPDIR=/usr/src/app

  RUN apk add --update git && \
      rm -rf /tmp/* /var/cache/apk/*

  COPY package.json /tmp/package.json
  RUN cd /tmp && npm install --production
  RUN mkdir -p "${APPDIR}" && cp -a /tmp/node_modules "${APPDIR}"

  COPY package.json "${APPDIR}"
  COPY lib /usr/src/app/lib
  COPY client/dist /usr/src/app/client/dist

  WORKDIR /usr/src/app
  COPY bin bin

  EXPOSE 3000
  CMD ["npm", "start"]
  ```
* Save and commit / push to Git repository

### Phase 2 - Setup Azure Resources
* Open the Azure Cloud Shell (https://shell.azure.com)
* Run the following commands to create the necessary resources in Azure
  ```cmd
    # Login
    az login

    az account set --subscription "<Subscription Name>"

    az group create --name fta-build-app-rg --location westus

    # Create mysql
    az mysql server create --resource-group fta-build-app-rg --name ftabuilddemomysql --location westus --admin-user myadmin --admin-password Pass@word1 --sku-name GP_Gen4_2 --version 5.7

    # Create container regisry
    az acr create --name ftabuildjenkinsregistry --resource-group fta-build-app-rg --sku Basic --admin-enabled

    # Create web app
    az appservice plan create --is-linux --name fta-build-demo-asp --resource-group fta-build-app-rg

    az webapp create --name ftabuildmysqlapp --resource-group fta-build-app-rg --plan fta-build-demo-asp --runtime "node|8.1"

    az webapp config container set -c ftabuildjenkinsregistry/webapp --resource-group fta-build-app-rg --name ftabuildmysqlapp

    az webapp config appsettings set --resource-group fta-build-app-rg --name ftabuildmysqlapp --settings MYSQLUSER=myadmin@ftabuilddemomysql
    az webapp config appsettings set --resource-group fta-build-app-rg --name ftabuildmysqlapp --settings MYSQLPASSWORD=Pass@word1
    az webapp config appsettings set --resource-group fta-build-app-rg --name ftabuildmysqlapp --settings MYSQLDATABASE=todos
    az webapp config appsettings set --resource-group fta-build-app-rg --name ftabuildmysqlapp --settings MYSQLSERVER=ftabuilddemomysql.mysql.database.azure.com

    # Create Service Principal
    az ad sp create-for-rbac --name jenkins-demo-sp --password Pass@word1
  ```
  * Copy the value from the output of the service principal creation
    ```json
    {
      "appId": "BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBB",
      "displayName": "jenkins-demo-sp",
      "name": "http://jenkins-demo-sp",
      "password": "Pass@word1",
      "tenant": "CCCCCCCC-CCCC-CCCC-CCCCCCCCCCC"
    }
    ```
* Run the command
  ```
  az account list
  ```
  * Copy the value from the output of the account list
  ```json
  {
    "cloudName": "AzureCloud",
    "id": "AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA",
    "isDefault": true,
    "name": "Visual Studio Enterprise",
    "state": "Enabled",
    "tenantId": "CCCCCCCC-CCCC-CCCC-CCCC-CCCCCCCCCCC",
    "user": {
    "name": "raisa@fabrikam.com",
    "type": "user"
  }
  ``` 
* Navigate to the portal, show resources that were created. Configure MySQL firewall
  * Open Mysql from Azure portal
  * Go to **Connection security**
  * Enable **allow azure to azure services**
  * Click **add my IP**
  * Turn off SSL required for this demo
  * Click **Save**  


### Phase 3 - Configure Jenkins Build

* Configure github credentials in Jenkins
  * Go to **Jenkins**->**Manage Jenkins**->**Configure System**. Scroll to the GitHub section.
  * Click **Add GitHub server**
  * Provide a name for the github connection, e.g. your github username.
  * Next to credentials, click **Add** and then **Jenkins**.
  * Change the type to **secret text** and add your Github PAT to the secret value.
  * Click **Add**.
  * Click **Test connection** and it should pass verification.
  
* Create the build pipeline in Jenkins
  * On the Jenkins homepage, click **create new jobs**.
  * Enter a name (`Node Todo`) and choose **Freestyle project**
* In the **General** section, select **Github project** and provide the url to your Github URL: e.g. https://github.com/username/project
* In the **Source Control Management** section, select **Git** and put the full url of your git repository (including the .git path) e.g. https://github.com/username/project.git
  > Note: For practice / dry-runs, could point to a branch instead of master.
* In the **Build triggers** section, check **GitHub hook trigger for GITScm polling**.
* In the **Build environment** section, check **Provide Node & npm bin/ folder to PATH** and select the node configuration created earlier.
* In the **Build** section, click **add build step**.
  * Click **execute shell**
  * In the command section, add the following lines
    ```cmd
    cd app
    npm install
    npm run build
    ```
* In the **Post-Build actions** section, click **add post build action**. Click **Publish an Azure web app**
  * For Azure credentials, click **Add** then **Jenkins**. Change the type to **Azure Service Principal**. From the values saved earlier, fill these in:
    * Subscription ID: AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA
    * Client ID: BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBB
    * Client Secret: (password of serivce principal)
    * Tenant ID: CCCCCCCC-CCCC-CCCC-CCCCCCCCCCC
  * Click **Verify service principal**
  * Click **Add**
  * Change the Azure credentials to the service principal just created
* Configure the app deployment
  * Select the resource group created above
  * Select the app service created above
  * Click **Publish via Docker**
    * Dockerfile path: app/Dockerfile
    * Docker registry URL: ftabuildjenkinsregistry.azurecr.io
    * Registry credentials: click **Add** the **Jenkins**
      * Get the username and password from the container registry in the Azure portal under **Access keys**
      * Click **Add**
      * Change the credentials dropdown to use the ones just added.
* Click **Save**
* Click **Build now**
* Open the app in the browser
  * App has no data because data has not been migrated yet 

### Phase 4 - Migrate MySQL Database to Azure 

* Open Mysql Workbench
* Create a connection to the local MySQL database
* Create a connection to the Azure Mysql Database
* Run the Migration Wizard
* Open the app in the browser
  * App should now show the migrated data

