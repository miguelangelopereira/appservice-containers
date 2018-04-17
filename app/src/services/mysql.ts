import * as debug from "debug";
import * as mysql from "mysql";

const d = debug("azure-node-todo:MySQLService");

let service: MySQLService;

export let MYSQL_CONFIG: mysql.ConnectionConfig = {
    user: process.env.MYSQLUSER,
    // tslint:disable-next-line:object-literal-sort-keys
    password: process.env.MYSQLPASSWORD,
    host: process.env.MYSQLSERVER
};

export class MySQLService {
    public static getDefault(): MySQLService {
        if (service) {
            d("Returning default service");
            return service;
        } else {
            d("Creating a new service");
            let config = MYSQL_CONFIG;
            d(`Using config: \n ${JSON.stringify(config, null, " ")}`);
            service = new MySQLService(config);
            return service;
        }
    }

    public static async createDatabaseIfNotExists(newDatabaseName: string): Promise<boolean> {
        d("Creating Database if it doesn't exist");

        const config = Object.assign({}, MYSQL_CONFIG);

        const sql = new MySQLService(config);
        var connection = await sql.getConnection();
        
        connection.on("error", (err) => {
            d("Client error!");
            console.error(err);
        });

        d("Checking to see if database %s exists", newDatabaseName);

        return new Promise<boolean>((resolve, reject) => {
            connection.query(`CREATE DATABASE IF NOT EXISTS ${newDatabaseName};`, (err, results, fields)  => {
                let result = true;
                if (err) {
                    result = false;
                    d("Something went wrong while creating the database");
                }
                connection.release();
                resolve(result);
            });
        });
    }

    public getConnection(): Promise<mysql.PoolConnection> {
        return new Promise((resolve, reject) => {
            this.pool.getConnection((err, conn) => {
                if (err) {
                    reject(err);
                } else if (conn) {
                    resolve(conn);
                }
            });
        });
    }

    public pool: mysql.Pool;

    constructor(config: mysql.ConnectionConfig) {
        d("Creating a new connection pool");
        this.pool = mysql.createPool(config);

        this.pool.on("error", (err) => {
            d("ERROR: Idle client error: %s", err.message);
        });
    }
}