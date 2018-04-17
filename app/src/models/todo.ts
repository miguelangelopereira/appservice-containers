import * as debug from "debug";
import {
    MYSQL_CONFIG,
    MySQLService
} from "../services";
import * as mysql from "mysql";

const d = debug("azure-node-todo:TodoModel");

export const schemaName = "todos";
export const todoTableName = "todo";

/**
 * Model for getting managing todo items
 */
export class TodoModel {
    public db: MySQLService;

    constructor() {
        this.db = MySQLService.getDefault();
    }

    /**
     * Creates the database and table if it doesn't exist
     */
    public async initialize() {
        // This can take a while...
        try {
            await MySQLService.createDatabaseIfNotExists(process.env.MYSQLDATABASE);
        } catch (e) {
            d("Failed to create database, might not be able to connect to database if it doesn't already exist");
            d(e);
        }
        let client = await this.db.getConnection();
        await this.createTableIfNotExists(client);
        client.release();
    }

    /**
     * Adds a todo item with the given text
     */
    public async add(value: string): Promise<ITodoItem> {
        return new Promise<ITodoItem>(async (resolve, reject) => {
            const query =
                `INSERT INTO ${schemaName}.${todoTableName} SET ?`;
            d("Adding item to Todo");
            let client = await this.db.getConnection();
            client.query(query, { text: value }, (err, results, fields) => {
                if (err) {
                    d("Could not add todo item");
                    reject(err.message);
                } else {
                    const itemQuery = `SELECT * FROM ${schemaName}.${todoTableName} WHERE id = LAST_INSERT_ID()`
                    client.query(itemQuery, (itemErr, itemResults, itemFields) => {
                        if (itemErr) {
                            d("Could not retrieve added item");
                            reject(itemErr.message);
                        } else {
                            d("Added item to Todo");
                            resolve(itemResults[0]);
                        }
                    });
                }
            });
        });
    }

    /**
     * Gets a todo item based on the id provided
     */
    public async get(id: number): Promise<ITodoItem> {
        return new Promise<any>(async (resolve, reject) => {
            d("Fetching todo item: %s", id);
            const query =
                `SELECT * FROM ${schemaName}.${todoTableName} where id=?`;
            d("Getting item from todo");
            var client = await this.db.getConnection();
            const results = client.query(query, [id], (err, results, fields) => {
                if (err) {
                    d("Failed to fetch Todo item for id: %s", id);
                    reject(err.message);
                } else if (results && results.length === 0) {
                    d("Could not find item in Todo table");
                    resolve(null);
                } else {
                    d("Found item in Todo table");
                    resolve(results[0]);
                }
            });
        });
    }

    /**
     * Get all todo items
     */
    public getAll(page: number, pageSize: number): Promise<any> {
        return new Promise<any>(async (resolve, reject) => {
            page = page || 1;
            pageSize = pageSize || 100;
            const offset = (page - 1) * pageSize;
            d("Fetching all todo items - offset: %s, limit: %s", offset, pageSize);
            const query =
                `
                SELECT * 
                    FROM ${schemaName}.${todoTableName} 
                    ORDER BY id 
                    LIMIT ${pageSize} 
                    OFFSET ${offset};
                `;
            var client = await this.db.getConnection();
            client.query(query, (err, results, fields) => {
                if (err) {
                    d("Failed to fetch all todo items");
                    reject(err);
                } else {
                    d("Returning todo items");
                    resolve(results);
                }
            });
        });
    }

    /**
     * Toggles done on and off for a given todo item
     */
    public async toggleDone(id: number): Promise<ITodoItem> {
        return new Promise<ITodoItem>(async (resolve, reject) => {
            const query =
                `UPDATE ${schemaName}.${todoTableName} 
                SET done = NOT done, completedAt = now()
                WHERE id = ?`;
            d("Toggling todo item done");
            var client = await this.db.getConnection();
            client.query(query, [id], (err, results, fields) => {
                if (err) {
                    d("Failed to toggle done on id: %s", id);
                    reject(err.message);
                } else {
                    const itemQuery = `SELECT * FROM ${schemaName}.${todoTableName} WHERE id = ?`
                    client.query(itemQuery, [id], (itemErr, itemResults, itemFields) => {
                        if (itemErr) {
                            d("Could not retrieve updated item");
                            reject(itemErr.message);
                        } else {
                            d("Toggled todo item");
                            resolve(itemResults[0]);
                        }
                    });
                }
            });
        });
    }

    /**
     * Removes a todo item based on id
     */
    public async remove(id: number): Promise<ITodoItem> {
        return new Promise<ITodoItem>(async (resolve, reject) => {
            const query =
                `DELETE FROM ${schemaName}.${todoTableName}
                WHERE id = ?`;
            d("Removing Todo item");
            var client = await this.db.getConnection();
            client.query(query, [id], (err, results, fields) => {
                if (err) {
                    d("Failed to delete item with id: %s", id);
                    reject(err.message);
                } else {
                    d("Removed Todo item");
                    const removedItem: ITodoItem = {
                        id: id,
                        text: null,
                        done: null,
                        createdAt: null,
                        completedAt: null
                    };
                    resolve(removedItem);
                }
            });
        });
    }

    private createTableIfNotExists(client: mysql.PoolConnection): Promise<void> {
        d("Creating table");
        const createTable =
            `CREATE TABLE IF NOT EXISTS ${schemaName}.${todoTableName} (
                    id int not NULL AUTO_INCREMENT PRIMARY KEY,
                    text text,
                    done boolean DEFAULT false,
                    createdAt timestamp DEFAULT current_timestamp,
                    completedAt timestamp NULL
                );`;

        return new Promise<void>((resolve, reject) => {
            d("running query: \n%s", createTable);
            client.query(createTable, (err, results, fields) => {
                if (err) {
                    d("Could not initialize Todo model: %s", err.message);
                    reject(err);
                    return;
                } else {
                    d("Succeeded to create table");
                    resolve();
                }
            });
        });
    }
}

export interface ITodoItem {
    id: number;
    text: string;
    done: boolean;
    createdAt: Date;
    completedAt: Date;
}
