namespace JsStore {
    export namespace Business {
        export class CreateDb {
            constructor(dbVersion, onSuccess: (listOf) => void, onError: (err: IError) => void) {
                var table_created_list = [],
                    db_request = indexedDB.open(active_db._name, dbVersion);

                db_request.onerror = function (event) {
                    if (onError != null) {
                        onError((event as any).target.error);
                    }
                };

                db_request.onsuccess = function (event) {
                    status.ConStatus = Connection_Status.Connected;
                    db_connection = db_request.result;
                    (db_connection as any).onclose = function () {
                        status.ConStatus = Connection_Status.Closed;
                        status.LastError = Error_Type.ConnectionClosed;
                    };

                    db_connection.onversionchange = function (e) {
                        if (e.newVersion === null) { // An attempt is made to delete the db
                            (e.target as any).close(); // Manually close our connection to the db
                        }
                    };

                    db_connection.onerror = function (e) {
                        status.LastError = ("Error occured in connection :" + (e.target as any).result) as any;
                    };

                    db_connection.onabort = function (e) {
                        status.ConStatus = Connection_Status.Closed;
                        status.LastError = Error_Type.ConnectionAborted;
                    };

                    if (onSuccess != null) {
                        onSuccess(table_created_list);
                    }
                    // save dbSchema in keystore
                    KeyStore.set("JsStore_" + active_db._name + "_Schema", active_db);
                };

                db_request.onupgradeneeded = function (event) {
                    var db = (event as any).target.result;
                    active_db._tables.forEach(function (item) {
                        if (item._requireDelete) {
                            // Delete the old datastore.    
                            if (db.objectStoreNames.contains(item._name)) {
                                db.deleteObjectStore(item._name);
                            }
                            createObjectStore(db, item);
                        }
                        else if (item._requireCreation) {
                            createObjectStore(db, item);
                        }
                    });
                };

                var createObjectStore = function (db_connection, item: Table) {
                    try {
                        if (item._primaryKey.length > 0) {
                            var store = db_connection.createObjectStore(item._name, {
                                keyPath: item._primaryKey
                            });
                            item._columns.forEach(function (column: Column) {
                                var options = column._primaryKey ? { unique: true } : { unique: column._unique };
                                options['multiEntry'] = column._multiEntry;
                                store.createIndex(column._name, column._name, options);
                                if (column._autoIncrement) {
                                    KeyStore.set(
                                        "JsStore_" + active_db._name + "_" + item._name + "_" + column._name + "_Value",
                                        0
                                    );
                                }
                            });
                        }
                        else {
                            var store = db_connection.createObjectStore(item._name, {
                                autoIncrement: true
                            });
                            item._columns.forEach(function (column: Column) {
                                var options = { unique: column._unique, multiEntry: column._multiEntry };
                                store.createIndex(column._name, column._name, options);
                                if (column._autoIncrement) {
                                    KeyStore.set(
                                        "JsStore_" + active_db._name + "_" + item._name + "_" + column._name + "_Value",
                                        0
                                    );
                                }
                            });
                        }
                        table_created_list.push(item._name);
                        // setting the table version
                        KeyStore.set("JsStore_" + active_db._name + "_" + item._name + "_Version", item._version);
                    }
                    catch (e) {
                        console.error(e);
                    }
                };
            }
        }
    }
}
