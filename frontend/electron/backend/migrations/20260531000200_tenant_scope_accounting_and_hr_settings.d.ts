import { type Kysely } from 'kysely';
export declare const migration: {
    up(db: Kysely<unknown>): Promise<void>;
    down(_db: Kysely<unknown>): Promise<void>;
};
