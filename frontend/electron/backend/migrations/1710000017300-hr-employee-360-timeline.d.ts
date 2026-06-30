import { Kysely } from 'kysely';
import { Database } from '../database.types';
export declare const migration: {
    up: (_db: Kysely<Database>) => Promise<void>;
    down: (_db: Kysely<Database>) => Promise<void>;
};
