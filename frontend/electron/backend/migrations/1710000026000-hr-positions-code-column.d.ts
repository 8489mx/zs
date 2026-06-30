import { Kysely } from 'kysely';
import { Database } from '../database.types';
export declare const migration: {
    up: (db: Kysely<Database>) => Promise<void>;
};
