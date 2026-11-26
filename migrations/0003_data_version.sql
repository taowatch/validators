-- A counter the collector bumps in every write transaction; the API recomputes when it changes.
CREATE TABLE meta (
    key   text   PRIMARY KEY,
    value bigint NOT NULL
);
INSERT INTO meta (key, value) VALUES ('data_version', 0);
