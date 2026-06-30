import { Kysely } from 'kysely';
export declare const migration: {
    up: (db: Kysely<unknown>) => Promise<void>;
    down: (db: Kysely<unknown>) => Promise<void>;
};
